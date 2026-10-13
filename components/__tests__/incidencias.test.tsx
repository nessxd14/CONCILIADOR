import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ResolucionIncidencia } from '@/components/Incidencias';
import { incidenciasFixture } from '@/app/vista-previa/incidencias/fixture';
import { calcularResolucion } from '@/lib/incidencias';

const rpc=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc})}));
vi.mock('next/link',()=>({default:({children,href,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a href={href} {...props}>{children}</a>}));
let root:Root|undefined;
afterEach(async()=>{if(root)await act(()=>root!.unmount());root=undefined;document.body.innerHTML='';vi.resetAllMocks();});
async function mount(element:React.ReactNode){
 (globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(()=>root!.render(element));return host;
}
async function change(host:HTMLElement,id:string,value:string){
 const element=host.querySelector(`#${id}`) as HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
 const proto=element.tagName==='SELECT'?HTMLSelectElement.prototype:element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
 await act(()=>{Object.getOwnPropertyDescriptor(proto,'value')!.set!.call(element,value);element.dispatchEvent(new Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}));});
}
async function click(host:HTMLElement,label:string){const button=Array.from(host.querySelectorAll('button')).find(b=>b.textContent===label)!;expect(button).toBeTruthy();await act(()=>button.click());}
const detalle=incidenciasFixture.detalle;
describe('resolución de incidencias',()=>{
 it('calcula remanente y crédito sin reducir una partida entregada',()=>{
  const data={...detalle,pedido:{...detalle.pedido,estado:'ABIERTO'},partidas:[{...detalle.partidas[0],total:'600',aplicado:'600',entrega:'2026-10-13'},{...detalle.partidas[0],id:32,total:'400',aplicado:'400'}],lineas:[{...detalle.lineas[0],despachada:'6',cancelable:'4'}]};
  const plan=calcularResolucion(data,'REMANENTE_CANCELADO',{41:'4'});
  expect(plan.nuevoTotal.toFixed(2)).toBe('600.00');expect(plan.dinero.toFixed(2)).toBe('400.00');
  expect(()=>calcularResolucion(data,'REMANENTE_CANCELADO',{41:'5'})).toThrow('cantidad');
 });
 it('mantiene el descuento proporcional y distingue reducción de dinero liberado',()=>{
  const data={...detalle,pedido:{...detalle.pedido,estado:'ABIERTO',subtotal:'100',total:'90'},lineas:[{...detalle.lineas[0],cantidad:'10',subtotal:'100',cancelable:'6',despachada:'4'}],partidas:[{...detalle.partidas[0],total:'90',aplicado:'20'}]};
  const plan=calcularResolucion(data,'REMANENTE_CANCELADO',{41:'3'});
  expect(plan.reduccion.toFixed(2)).toBe('27.00');expect(plan.nuevoTotal.toFixed(2)).toBe('63.00');expect(plan.dinero.toFixed(2)).toBe('0.00');
 });
 it('explica la migración ausente sin mostrar una consulta vacía',async()=>{
  rpc.mockResolvedValue({data:null,error:{code:'PGRST202'}});
  const host=await mount(<ResolucionIncidencia pedidoId={21}/>);
  expect(host.textContent).toContain('requiere la actualización de la base');expect(host.textContent).not.toContain('Sin pagos vinculados');
 });
 it('mantiene las acciones deshabilitadas para un rol de consulta',async()=>{
  const host=await mount(<ResolucionIncidencia pedidoId={21} fixture={{...detalle,puede_resolver:false}}/>);
  expect((host.querySelector('#res-opcion') as HTMLSelectElement).closest('fieldset')!.disabled).toBe(true);
  expect(Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Revisar resolución')!.disabled).toBe(true);
  expect(rpc).not.toHaveBeenCalled();
 });
 it('ofrece las tres decisiones con revisión previa y deshabilita escrituras en la vista de ejemplo',async()=>{
  const host=await mount(<ResolucionIncidencia pedidoId={21} fixture={detalle}/>);
  expect(host.querySelectorAll('#res-opcion option').length).toBe(3);
  await change(host,'res-motivo','Pedido cancelado por el cliente');
  await click(host,'Revisar resolución');
  expect(host.textContent).toContain('Revisa antes de confirmar');
  expect(Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Confirmar resolución')!.disabled).toBe(true);
  expect(rpc).not.toHaveBeenCalled();
 });
 it('reintenta con la misma clave y conserva el error del servidor',async()=>{
  let intentos=0;
  rpc.mockImplementation(async(fn:string)=>fn==='obtener_resolucion_pedido'?{data:detalle,error:null}:++intentos===1?{data:null,error:{message:'El turno está cerrado'}}:{data:{operacion_id:'operacion',pedido_id:21,tipo:'CANCELACION_RESUELTA',opcion:'REASIGNACION',dinero_resuelto:'1000.00',total_pedido:'0',reduccion:'1000'},error:null});
  const host=await mount(<ResolucionIncidencia pedidoId={21}/>);
  await change(host,'res-opcion','REASIGNACION');await change(host,'res-destino','32');await change(host,'res-motivo','Aplicar al pedido vigente');
  await click(host,'Revisar resolución');await click(host,'Confirmar resolución');
  expect(host.textContent).toContain('El turno está cerrado');
  await click(host,'Confirmar resolución');
  const calls=rpc.mock.calls.filter(c=>c[0]==='resolver_incidencia_pedido');expect(calls).toHaveLength(2);
  expect(calls[0][1]).toEqual(calls[1][1]);expect(calls[0][1].p_destino).toBe(32);
  expect(calls[0][1].p_motivo).toBe('Aplicar al pedido vigente');expect(calls[0][1]).not.toHaveProperty('p_usuario');
  expect(host.textContent).toContain('Resolución registrada');
 });
 it('no habilita una devolución sin el recibo y la confirmación de realización',async()=>{
  const host=await mount(<ResolucionIncidencia pedidoId={21} fixture={detalle}/>);
  await change(host,'res-opcion','DEVOLUCION');await change(host,'res-turno','61');await change(host,'res-motivo','Solicitud del cliente');
  await click(host,'Revisar resolución');expect(host.textContent).toContain('confirmación de realización y referencia');
  expect(host.textContent).toContain('debe realizarse por el canal del banco');expect(rpc).not.toHaveBeenCalled();
 });
 it('ignora una respuesta tardía del pedido anterior',async()=>{
  let finish!:(value:unknown)=>void;
  rpc.mockReturnValueOnce(new Promise(r=>{finish=r}));
  const host=await mount(<ResolucionIncidencia pedidoId={21}/>);
  rpc.mockResolvedValue({data:{...detalle,pedido:{...detalle.pedido,id:22,numero:'Pedido nuevo'}},error:null});
  await act(()=>root!.render(<ResolucionIncidencia pedidoId={22}/>));
  await act(()=>finish({data:detalle,error:null}));expect(host.textContent).toContain('Pedido nuevo');expect(host.textContent).not.toContain('PED-2026-021');
 });
 it('exige revisar otra vez la recepción después de actualizar los datos del pedido',async()=>{
  rpc.mockResolvedValue({data:{...detalle,pagos:[{...detalle.pagos[0],estado:'PROPUESTO'}]},error:null});
  const host=await mount(<ResolucionIncidencia pedidoId={21}/>);
  const checkbox=host.querySelector('input[type="checkbox"]') as HTMLInputElement;
  await act(()=>checkbox.click());expect(checkbox.checked).toBe(true);
  await click(host,'Actualizar el pedido');
  expect((host.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(false);
 });
});

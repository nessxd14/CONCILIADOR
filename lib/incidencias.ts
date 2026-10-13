import Decimal from 'decimal.js';

export type OpcionResolucion = 'SALDO_FAVOR' | 'REASIGNACION' | 'DEVOLUCION';
export type TipoResolucion = 'CANCELACION_RESUELTA' | 'REMANENTE_CANCELADO';
export interface Incidencia { pedido_id: number; numero: string | null; estado: string; cliente_id: number; cliente: string; importe: string; motivos: string[] }
export interface BandejaIncidencias { items: Incidencia[]; total: number; puede_resolver: boolean }
export interface ResolucionPedido {
 version: string; puede_resolver: boolean; saldo_aplicado?:string;
 pedido: { id: number; numero: string | null; estado: string; cliente_id: number; cliente: string; subtotal: string; total: string; recepcion: string | null };
 partidas: { id: number; documento: string; total: string; estado: string; entrega: string | null; factura: string | null; cuf: string | null; aplicado: string }[];
 lineas: { id: number; descripcion: string; estado: string; cantidad: string; despachada: string; subtotal: string; cancelable: string }[];
 pagos: { id: number; estado: string; medio: string; monto: string; devuelto: string; referencia: string | null; aplicado_origen: string; libre: string; de_caja: boolean }[];
 destinos: { id: number; documento: string; pendiente: string }[];
 turnos: { id: number; caja_id: number; abierta_en: string; efectivo: string }[];
 historial: { id: string; tipo: TipoResolucion; motivo: string; usuario: string; fecha: string; resultado: ResultadoResolucion }[];
}
export interface ResultadoResolucion { operacion_id: string; pedido_id: number; tipo: TipoResolucion; opcion: OpcionResolucion; dinero_resuelto: string; total_pedido: string; reduccion: string }
export const nombresIncidencia: Record<string,string> = { CANCELADO_CON_CARTERA:'Pedido cancelado con cartera activa',RECHAZOS_PENDIENTES:'Rechazos pendientes de resolución',REPARTO_EXCEDIDO:'Pagos superiores al importe de la partida',PROPUESTA_DE_CANCELADO:'Pago por verificar de un pedido cancelado' };
export const opcionesResolucion: Record<OpcionResolucion,string> = { SALDO_FAVOR:'Conservar como saldo a favor',REASIGNACION:'Reasignar a otra partida',DEVOLUCION:'Registrar devolución realizada' };

export function calcularResolucion(data: ResolucionPedido,tipo: TipoResolucion,cantidades: Record<number,string>) {
 if (tipo==='CANCELACION_RESUELTA') return { reduccion:new Decimal(data.pedido.total),nuevoTotal:new Decimal(0),dinero:data.pagos.reduce((n,p)=>n.plus(p.aplicado_origen).plus(p.de_caja?p.libre:0),new Decimal(data.saldo_aplicado??0)),lineas:[] as {linea_id:number;cantidad:string}[] };
 const lineas: {linea_id:number;cantidad:string}[]=[];
 let bruto=new Decimal(0);
 for (const l of data.lineas) {
  const valor=cantidades[l.id]?.trim(); if(!valor || new Decimal(valor).isZero()) continue;
  const q=new Decimal(valor);
  if (!q.isFinite() || q.lt(0) || q.gt(l.cancelable) || q.decimalPlaces()>4) throw new Error(`Revisa la cantidad de ${l.descripcion}.`);
  bruto=bruto.plus(new Decimal(l.subtotal).mul(q).div(l.cantidad).toDecimalPlaces(2));
  lineas.push({linea_id:l.id,cantidad:q.toString()});
 }
 if(!lineas.length) throw new Error('Selecciona una cantidad del remanente.');
 const subtotal=new Decimal(data.pedido.subtotal),total=new Decimal(data.pedido.total);
 const nuevoTotal=total.mul(subtotal.minus(bruto)).div(subtotal).toDecimalPlaces(2);
 if(!nuevoTotal.isFinite() || nuevoTotal.lte(0) || nuevoTotal.gte(total)) throw new Error('Para cancelar el pedido completo usa Cancelar y resolver.');
 const activas=data.partidas.filter(p=>['ABIERTA','PAGADA'].includes(p.estado)&&!p.entrega).sort((a,b)=>a.id-b.id);
 const ajustable=activas.reduce((s,p)=>s.plus(p.total),new Decimal(0)),reduccion=total.minus(nuevoTotal);
 if(ajustable.lt(reduccion))throw new Error('Separa el remanente de las partidas entregadas antes de reducirlo.');
 let asignado=new Decimal(0),dinero=new Decimal(0);
 activas.forEach((p,i)=>{
  const restante=Decimal.max(ajustable.minus(reduccion).minus(asignado),0);
  const nuevo=i===activas.length-1?restante:Decimal.min(new Decimal(p.total).mul(ajustable.minus(reduccion)).div(ajustable).toDecimalPlaces(2),restante);
  asignado=asignado.plus(nuevo); dinero=dinero.plus(Decimal.max(new Decimal(p.aplicado).minus(nuevo),0));
 });
 return {reduccion:total.minus(nuevoTotal),nuevoTotal,dinero,lineas};
}

export function mensajeIncidencias(error: {code?:string;message?:string}|null) {
 return error?.code==='PGRST202' ? 'La resolución de incidencias requiere la actualización de la base. Los cambios están preparados localmente.' : error?.message || 'No pudimos completar la operación. Reintenta.';
}

"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Decimal from 'decimal.js';
import { createClient } from '@/lib/supabase/client';
import { useHermesRefresh } from '@/lib/supabase/use-refresh';
import { formatBs } from '@/lib/money';
import { fechaHistorial } from '@/lib/historial';
import { calcularResolucion, mensajeIncidencias, nombresIncidencia, opcionesResolucion, type BandejaIncidencias, type OpcionResolucion, type ResolucionPedido, type ResultadoResolucion, type TipoResolucion } from '@/lib/incidencias';

export interface IncidenciasFixture { bandeja: BandejaIncidencias; detalle: ResolucionPedido; detalles?:Record<number,ResolucionPedido> }
export function Incidencias({ initialPedidoId, fixture }: {initialPedidoId?:number;fixture?:IncidenciasFixture}) {
 const supabase=useMemo(()=>createClient(),[]);
 const [lista,setLista]=useState<BandejaIncidencias|null>(fixture?.bandeja??null);
 const [consulta,setConsulta]=useState(''),[busqueda,setBusqueda]=useState('');
 const [soloIncidencias,setSoloIncidencias]=useState(true),[pagina,setPagina]=useState(0);
 const [pedido,setPedido]=useState<number|null>(initialPedidoId??null);
 const [loading,setLoading]=useState(!fixture),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false);
 const request=useRef(0);
 async function cargar() {
  if(fixture) return;
  const n=++request.current; setLoading(true); setError(null);
  try {
   const r=await supabase.rpc('obtener_incidencias',{p_busqueda:busqueda,p_offset:pagina*50,p_limite:50,p_solo_incidencias:soloIncidencias});
   if(r.error || !r.data) throw new Error(mensajeIncidencias(r.error));
   if(n===request.current) setLista(r.data as BandejaIncidencias);
  } catch(e) {if(n===request.current) setError(e instanceof Error?e.message:'No pudimos consultar las incidencias.');}
  finally {if(n===request.current) setLoading(false);}
 }
 useEffect(()=>{void cargar();return()=>{request.current++;};/* eslint-disable-next-line react-hooks/exhaustive-deps */},[busqueda,pagina,soloIncidencias]);
 useHermesRefresh(cargar,!fixture&&!busy&&!pedido&&!loading);
 function buscar(e:React.FormEvent) {
  e.preventDefault(); if(!soloIncidencias&&consulta.trim().length<2){setError('Escribe al menos dos caracteres para buscar un pedido.');return;}
  setBusqueda(consulta.trim());setPagina(0); if(consulta.trim()===busqueda&&pagina===0) void cargar();
 }
 return <div className="incidencias-page">
  <header className="page-header"><div><h1 className="page-title">Incidencias</h1><p className="page-sub">Pedidos, pagos y remanentes que requieren una decisión.</p></div><button className="btn btn-secondary" disabled={busy||loading||!!fixture} onClick={()=>void cargar()}>Actualizar</button></header>
  {fixture&&<div className="nota-sincronizando">Vista de ejemplo. Las operaciones reales están deshabilitadas.</div>}
  <div className="incidencias-layout">
   <section className="ledger-panel" aria-label="Bandeja de incidencias">
    <form className="filter-bar" onSubmit={buscar}><label className="search-field"><span className="sr-only">Buscar por cliente o pedido</span><input aria-label="Buscar por cliente o pedido" placeholder="Cliente o número de pedido…" value={consulta} disabled={busy} onChange={e=>setConsulta(e.target.value)}/></label><button className="btn btn-secondary" disabled={busy||!!fixture}>Buscar</button></form>
    <label className="incidencias-filter"><input type="checkbox" checked={soloIncidencias} disabled={busy||!!fixture} onChange={e=>{setSoloIncidencias(e.target.checked);setBusqueda(consulta.trim());setPagina(0);}}/>Solo pedidos con incidencias</label>
    {!soloIncidencias&&<p className="field-hint">Busca un pedido para gestionar una cancelación solicitada por el cliente.</p>}
    {loading?<p role="status" className="empty-state">Consultando incidencias…</p>:error?<div role="alert" className="empty-state"><p>{error}</p><button className="btn btn-secondary" onClick={()=>void cargar()}>Reintentar</button></div>:lista&&<>
     <div className="section-heading incidencias-count"><h2>{soloIncidencias?'Pendientes de resolución':'Pedidos encontrados'}</h2><span>{lista.total} pedidos</span></div>
     {lista.items.length===0?<p className="empty-state">{soloIncidencias?'No hay incidencias en esta consulta.':'No encontramos pedidos con esa búsqueda.'}</p>:<div className="review-list">{lista.items.map(p=><button className={`review-row ${pedido===p.pedido_id?'selected':''}`} type="button" key={p.pedido_id} disabled={busy} aria-pressed={pedido===p.pedido_id} onClick={()=>setPedido(p.pedido_id)}><span><strong>{p.cliente}</strong><small>{p.numero||`Pedido #${p.pedido_id}`} · {p.estado}</small>{p.motivos.map(m=><small key={m}>{nombresIncidencia[m]??m}</small>)}</span><span><strong>{formatBs(p.importe)}</strong><small>Importe del pedido</small></span></button>)}</div>}
     <div className="panel-footer"><button className="btn btn-secondary" disabled={pagina===0||busy||!!fixture} onClick={()=>setPagina(n=>n-1)}>Anterior</button><span>Página {pagina+1}</span><button className="btn btn-secondary" disabled={(pagina+1)*50>=lista.total||busy||!!fixture} onClick={()=>setPagina(n=>n+1)}>Siguiente</button></div>
    </>}
   </section>
   {pedido?<ResolucionIncidencia key={pedido} pedidoId={pedido} fixture={fixture?.detalles?.[pedido]??fixture?.detalle} onBusy={setBusy} onResolved={()=>void cargar()}/>:<aside className="glass-panel empty-state"><h2>Selecciona un pedido</h2><p>Revisa el origen, los pagos y las cantidades antes de elegir cómo resolverlo.</p></aside>}
  </div>
 </div>;
}

export function ResolucionIncidencia({pedidoId,fixture,onBusy,onResolved}:{pedidoId:number;fixture?:ResolucionPedido;onBusy?:(value:boolean)=>void;onResolved?:()=>void}) {
 const supabase=useMemo(()=>createClient(),[]);
 const [data,setData]=useState<ResolucionPedido|null>(fixture??null),[loading,setLoading]=useState(!fixture),[error,setError]=useState<string|null>(null);
 const [tipo,setTipo]=useState<TipoResolucion>('CANCELACION_RESUELTA'),[opcion,setOpcion]=useState<OpcionResolucion>('SALDO_FAVOR');
 const [cantidades,setCantidades]=useState<Record<number,string>>({}),[motivo,setMotivo]=useState('');
 const [destino,setDestino]=useState(''),[turno,setTurno]=useState(''),[medio,setMedio]=useState('EFECTIVO'),[referencia,setReferencia]=useState('');
 const [recepcion,setRecepcion]=useState(false),[devuelto,setDevuelto]=useState(false),[guardando,setGuardando]=useState(false);
 const [revision,setRevision]=useState<{payload:Record<string,unknown>;dinero:string;reduccion:string;nuevoTotal:string}|null>(null);
 const [result,setResult]=useState<ResultadoResolucion|null>(null);
 const request=useRef(0);
 async function cargar() {
  if(fixture)return;const n=++request.current;setLoading(true);setError(null);
  try {const r=await supabase.rpc('obtener_resolucion_pedido',{p_pedido_id:pedidoId});if(r.error||!r.data)throw new Error(mensajeIncidencias(r.error));if(n===request.current){setData(r.data as ResolucionPedido);setRevision(null);setRecepcion(false);setDevuelto(false);}}
  catch(e){if(n===request.current)setError(e instanceof Error?e.message:'No pudimos consultar el pedido.');}
  finally{if(n===request.current)setLoading(false);}
 }
 useEffect(()=>{setData(fixture??null);setResult(null);void cargar();return()=>{request.current++;};/* eslint-disable-next-line react-hooks/exhaustive-deps */},[pedidoId,fixture]);
 if(loading)return <aside className="glass-panel empty-state" role="status">Consultando el pedido…</aside>;
 if(!data)return <aside className="glass-panel empty-state" role="alert"><p>{error}</p><button className="btn btn-secondary" onClick={()=>void cargar()}>Reintentar</button></aside>;
 let plan:ReturnType<typeof calcularResolucion>|null=null;
 try{plan=calcularResolucion(data,tipo,cantidades);}catch{/* Se explica la cantidad al solicitar revisión. */}
 const factura=data.partidas.some(p=>p.factura||p.cuf),entregado=data.lineas.some(l=>new Decimal(l.despachada).gt(0))||data.partidas.some(p=>p.entrega);
 const impedimento=data.pedido.recepcion?'Hay recepción registrada; requiere revisión del documento de origen.':factura?'Hay factura registrada; requiere resolver ese documento antes del ajuste.':tipo==='CANCELACION_RESUELTA'&&entregado?'Hay entrega registrada. Selecciona Cancelar remanente para conservar lo entregado.':tipo==='REMANENTE_CANCELADO'&&data.pedido.estado==='CANCELADO'?'El pedido ya está cancelado. Usa Cancelar y resolver para revisar su cartera.':null;
 function revisar(e:React.FormEvent){
  e.preventDefault();setError(null);setResult(null);
  try{
   if(!data)throw new Error('No hay un pedido disponible.');
   if(impedimento)throw new Error(impedimento);
   if(!data.puede_resolver)throw new Error('Solo administrador o gerente puede resolver esta incidencia.');
   if(!motivo.trim())throw new Error('Escribe el motivo de la resolución.');
   if(new Decimal(data.saldo_aplicado??0).gt(0)&&(tipo==='REMANENTE_CANCELADO'||opcion!=='SALDO_FAVOR'))throw new Error('Primero restaura el saldo aplicado en la cuenta y revisa su fuente antes de modificar su destino.');
   const p=calcularResolucion(data,tipo,cantidades);
   if(opcion!=='SALDO_FAVOR'&&p.dinero.lte(0))throw new Error('No hay dinero liberado para esa opción.');
   if(data.pagos.some(pg=>pg.estado==='PROPUESTO')&&p.dinero.gt(0)&&!recepcion)throw new Error('Confirma que recibiste el dinero de las propuestas.');
   if(opcion==='REASIGNACION'){
    const d=data.destinos.find(d=>d.id===Number(destino));if(!d)throw new Error('Selecciona una partida destino del mismo cliente.');
    if(p.dinero.gt(d.pendiente))throw new Error('El importe supera la deuda disponible del destino.');
   }
   if(opcion==='DEVOLUCION'){
    const s=data.turnos.find(s=>s.id===Number(turno));if(!s)throw new Error('Selecciona un turno de caja abierto.');
    if(!devuelto||!referencia.trim())throw new Error('La devolución requiere confirmación de realización y referencia.');
    if(medio==='EFECTIVO'&&p.dinero.gt(s.efectivo))throw new Error('El turno no tiene efectivo suficiente para la devolución.');
   }
   setRevision({dinero:p.dinero.toFixed(2),reduccion:p.reduccion.toFixed(2),nuevoTotal:p.nuevoTotal.toFixed(2),payload:{p_pedido_id:pedidoId,p_tipo:tipo,p_opcion:opcion,p_motivo:motivo.trim(),p_version:data.version,p_clave:crypto.randomUUID(),p_lineas:p.lineas,p_destino:opcion==='REASIGNACION'?Number(destino):null,p_turno:opcion==='DEVOLUCION'?Number(turno):null,p_medio:opcion==='DEVOLUCION'?medio:null,p_referencia:opcion==='DEVOLUCION'?referencia.trim():null,p_recepcion_verificada:recepcion,p_devolucion_realizada:opcion==='DEVOLUCION'&&devuelto}});
  }catch(e){setError(e instanceof Error?e.message:'Revisa las cantidades y los importes.');}
 }
 async function confirmar(){
  if(!revision||fixture||guardando||!data?.puede_resolver)return;
  setGuardando(true);onBusy?.(true);setError(null);
  try{const r=await supabase.rpc('resolver_incidencia_pedido',revision.payload);if(r.error||!r.data)throw new Error(mensajeIncidencias(r.error));setResult(r.data as ResultadoResolucion);setRevision(null);setMotivo('');setRecepcion(false);setDevuelto(false);setCantidades({});await cargar();onResolved?.();}
  catch(e){setError(e instanceof Error?e.message:'No pudimos completar la resolución.');}
  finally{setGuardando(false);onBusy?.(false);}
 }
 return <aside className="glass-panel resolucion-detail" aria-label="Resolución del pedido">
  <div className="section-heading"><h2>{data.pedido.numero||`Pedido #${pedidoId}`}</h2><span className="badge">{data.pedido.estado}</span></div><h3>{data.pedido.cliente}</h3>
  <p>Importe del pedido: <strong>{formatBs(data.pedido.total)}</strong></p><Link className="btn-link" href={fixture?'/vista-previa/cliente':`/clientes/${data.pedido.cliente_id}`}>Abrir ficha del cliente</Link>
  {!fixture&&<button type="button" className="btn-link" disabled={guardando||!!revision} onClick={()=>void cargar()}>Actualizar el pedido</button>}
  {result&&<div className="banner-success" role="status">Resolución registrada. {opcionesResolucion[result.opcion]}: {formatBs(result.dinero_resuelto)}. Motivo y responsable conservados en el historial.</div>}
  <details className="incidencias-payments" open><summary>Pagos vinculados ({data.pagos.length})</summary>{data.pagos.length?data.pagos.map(p=><p key={p.id}><strong>Pago #{p.id} · {formatBs(p.monto)}</strong><br/>{p.medio} · {p.estado} · {p.referencia||'Sin referencia'}<br/><small>Aplicado al pedido: {formatBs(p.aplicado_origen)} · Libre: {formatBs(p.libre)}{new Decimal(p.devuelto).gt(0)&&<> · Devuelto: {formatBs(p.devuelto)}</>}</small></p>):<p>Sin pagos vinculados para resolver.</p>}</details>
  {!data.puede_resolver&&<p className="field-hint">Tu rol permite consultar. La resolución corresponde a administrador o gerente.</p>}
  {new Decimal(data.saldo_aplicado??0).gt(0)&&<p className="nota-sincronizando">Este pedido usa {formatBs(data.saldo_aplicado!)} de saldo a favor. La cancelación lo restaura en la cuenta; su devolución o nueva aplicación requiere revisar la fuente del crédito.</p>}
  <form onSubmit={revisar}>
   <fieldset disabled={!data.puede_resolver||guardando||!!revision}>
    <div className="field"><label htmlFor="res-tipo">Operación</label><select id="res-tipo" className="select" value={tipo} onChange={e=>setTipo(e.target.value as TipoResolucion)}><option value="CANCELACION_RESUELTA">Cancelar y resolver pedido</option><option value="REMANENTE_CANCELADO">Cancelar remanente no entregado</option></select></div>
    {tipo==='REMANENTE_CANCELADO'&&<div className="resolucion-lines"><p className="field-hint">Indica cantidades en unidades base. Se conservará lo despachado y se aplicará proporcionalmente el descuento general.</p>{data.lineas.map(l=><div className="resolucion-line" key={l.id}><label htmlFor={`res-linea-${l.id}`}><strong>{l.descripcion}</strong><small>Pedido: {l.cantidad} · Despachado: {l.despachada} · Cancelable: {l.cancelable}</small></label><input id={`res-linea-${l.id}`} className="input" type="number" min="0" max={l.cancelable} step="0.0001" disabled={new Decimal(l.cancelable).lte(0)} value={cantidades[l.id]??''} onChange={e=>setCantidades(c=>({...c,[l.id]:e.target.value}))}/></div>)}</div>}
    <div className="field"><label htmlFor="res-opcion">Destino del dinero liberado</label><select id="res-opcion" className="select" value={opcion} onChange={e=>setOpcion(e.target.value as OpcionResolucion)}>{Object.entries(opcionesResolucion).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
    {opcion==='SALDO_FAVOR'&&<p className="field-hint">El dinero recibido se conserva en la cuenta del mismo cliente y queda disponible según sus movimientos.</p>}
    {opcion==='REASIGNACION'&&<div className="field"><label htmlFor="res-destino">Partida destino</label><select id="res-destino" className="select" value={destino} onChange={e=>setDestino(e.target.value)}><option value="">Seleccionar…</option>{data.destinos.map(d=><option key={d.id} value={d.id}>{d.documento} · pendiente {formatBs(d.pendiente)}</option>)}</select>{!data.destinos.length&&<p className="field-hint">No hay otras partidas con deuda disponible de este cliente.</p>}</div>}
    {opcion==='DEVOLUCION'&&<>
     <p className="field-hint">Registra una devolución que ya realizaste. La operación asentará la salida en el turno seleccionado; una transferencia bancaria debe realizarse por el canal del banco.</p>
     <div className="field"><label htmlFor="res-turno">Turno de caja</label><select id="res-turno" className="select" value={turno} onChange={e=>setTurno(e.target.value)}><option value="">Seleccionar…</option>{data.turnos.map(s=><option key={s.id} value={s.id}>Turno #{s.id} · Caja #{s.caja_id} · efectivo {formatBs(s.efectivo)}</option>)}</select></div>
     <div className="field"><label htmlFor="res-medio">Medio de devolución</label><select id="res-medio" className="select" value={medio} onChange={e=>setMedio(e.target.value)}>{['EFECTIVO','TRANSFERENCIA','QR','DEPOSITO','CHEQUE','SIGEP'].map(m=><option key={m}>{m}</option>)}</select></div>
     <div className="field"><label htmlFor="res-referencia">Recibo o referencia de devolución</label><input id="res-referencia" className="input" maxLength={250} value={referencia} onChange={e=>setReferencia(e.target.value)}/></div>
     <label className="verify-check"><input type="checkbox" checked={devuelto} onChange={e=>setDevuelto(e.target.checked)}/>Confirmo que la devolución indicada ya se realizó.</label>
    </>}
    {data.pagos.some(p=>p.estado==='PROPUESTO')&&<label className="verify-check"><input type="checkbox" checked={recepcion} onChange={e=>setRecepcion(e.target.checked)}/>Verifiqué la recepción del dinero de los pagos propuestos.</label>}
    <div className="field"><label htmlFor="res-motivo">Motivo obligatorio</label><textarea id="res-motivo" className="input" maxLength={2000} value={motivo} onChange={e=>setMotivo(e.target.value)}/></div>
   </fieldset>
   {impedimento&&<p className="banner-error" role="status">{impedimento}</p>}
   {plan&&<p className="resolucion-estimate">Importe a resolver: <strong>{formatBs(plan.dinero.toFixed(2))}</strong>{tipo==='REMANENTE_CANCELADO'&&<> · Reducción del pedido: {formatBs(plan.reduccion.toFixed(2))}</>}</p>}
   {error&&<div className="field-error" role="alert"><p>{error}</p><button className="btn-link" type="button" disabled={guardando} onClick={()=>{setRevision(null);void cargar();}}>Actualizar el pedido y revisar nuevamente</button></div>}
   {!revision&&<button className="btn btn-primary" disabled={!data.puede_resolver||!!impedimento||guardando} type="submit">Revisar resolución</button>}
  </form>
  {revision&&<section className="resolucion-confirm" aria-label="Revisión antes de confirmar"><h3>Revisa antes de confirmar</h3><dl><div><dt>Operación</dt><dd>{tipo==='CANCELACION_RESUELTA'?'Cancelar el pedido y su cartera':'Cancelar cantidades del remanente'}</dd></div><div><dt>Dinero</dt><dd>{opcionesResolucion[opcion]} · {formatBs(revision.dinero)}</dd></div><div><dt>Importe que se cancela</dt><dd>{formatBs(revision.reduccion)}</dd></div><div><dt>Importe restante del pedido</dt><dd>{formatBs(revision.nuevoTotal)}</dd></div><div><dt>Motivo</dt><dd>{motivo}</dd></div></dl><p className="field-hint">El servidor comprobará nuevamente cantidades, pagos, saldo y documentos. Todo se registrará junto o se revertirá si algo impide resolverlo.</p><div className="form-actions"><button className="btn btn-secondary" disabled={guardando} onClick={()=>setRevision(null)}>Volver a editar</button><button className="btn btn-primary" disabled={guardando||!!fixture} onClick={()=>void confirmar()}>{guardando?'Registrando…':'Confirmar resolución'}</button></div></section>}
  {data.historial.length>0&&<section className="historial-partida"><h3>Resoluciones anteriores</h3>{data.historial.map(h=><article className="baja-detail" key={h.id}><strong>{h.tipo==='CANCELACION_RESUELTA'?'Cancelación resuelta':'Remanente cancelado'}</strong><p>{h.motivo}</p><small>{h.usuario} · {fechaHistorial(h.fecha)}</small><small>{opcionesResolucion[h.resultado.opcion]} · {formatBs(h.resultado.dinero_resuelto)}</small></article>)}</section>}
 </aside>;
}

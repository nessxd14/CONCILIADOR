"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { VPedidoLineaHermes } from "@/lib/types";
import { cantidadDocumento, etiquetasOrigen, lineasVigentes, type EstadoOrigen, type OrigenExpediente } from "@/lib/expediente-origen";
import { formatBs } from "@/lib/money";
import { ResumenPagoPartida } from "./ResumenPagoPartida";

function Etiqueta({ estado }: { estado: EstadoOrigen }) {
  return <span className={`badge ${estado === "COMPLETO" || estado === "NO_APLICA" ? "badge-aldia" : "badge-pendiente"}`}>{etiquetasOrigen[estado]}</span>;
}
function fecha(value: string | null) {
  return value ? new Date(value.length===10 ? `${value}T12:00:00` : value).toLocaleDateString("es-BO") : "Sin fecha";
}

export function ExpedienteOrigen({ origen, lineas, fechaHermes, clienteNombre, onDocumentoAbierto }: {
  origen: OrigenExpediente; lineas: VPedidoLineaHermes[]; fechaHermes: string | null;
  clienteNombre: string; onDocumentoAbierto: (abierto: boolean)=>void;
}) {
  const [documento, setDocumento] = useState<"cotizacion" | "pedido" | null>(null);
  useEffect(()=>{onDocumentoAbierto(Boolean(documento));},[documento,onDocumentoAbierto]);
  const q=origen.cotizacion;
  const s=origen.salida;
  return <>
    <section className="card expediente-origen" aria-label="Seguimiento desde Seller">
      <div className="expediente-origen-header"><div><p className="origen-eyebrow">Seguimiento del mayorista</p><h2>Documentos y avance del pedido</h2></div><span className="badge">Vinculado a Seller</span></div>
      <div className="origen-documentos">
        <article><div className="origen-card-title"><h3>Cotización</h3><Etiqueta estado={origen.cotizacion_estado} /></div>
          <b>{q?.numero ?? "Sin cotización de origen"}</b>
          <p>{q ? `${fecha(q.fecha)} · ${formatBs(q.total)}` : origen.cotizacion_estado === "NO_APLICA" ? "Este pedido se registró sin cotización." : "El vínculo necesita revisión en Seller."}</p>
          {q && <button type="button" className="btn btn-secondary" onClick={()=>setDocumento("cotizacion")}>Consultar cotización</button>}
        </article>
        <article><div className="origen-card-title"><h3>Pedido</h3><Etiqueta estado={origen.pedido.origen_estado} /></div>
          <b>{origen.pedido.numero}</b><p>{fecha(origen.pedido.creado_en)} · {formatBs(origen.pedido.total)}</p>
          <button type="button" className="btn btn-secondary" onClick={()=>setDocumento("pedido")}>Consultar pedido</button>
        </article>
      </div>
      <div className="origen-salida"><div className="origen-card-title"><h3>Salida de almacén</h3><Etiqueta estado={s.origen_estado} /></div>
        <p>{s.lineas_almacen>0 ? <><b>{s.lineas_despachadas} de {s.lineas_almacen}</b> líneas de stock despachadas{s.lineas_parciales>0 && ` · ${s.lineas_parciales} con despacho parcial`}</> : "Sin salida de stock de almacén."}</p>
        {s.lineas_fuera_almacen>0 && <p className="field-hint">{s.lineas_fuera_almacen} líneas de compra directa o especiales se siguen por separado.</p>}
        <p className="field-hint">La salida de almacén se actualiza con los despachos y sus reversiones. La recepción del cliente se valida por separado.</p>
      </div>
      <div className="origen-recepcion"><b>Recepción del cliente</b>
        <p>{origen.recepcion.fecha ? `Registrada en Seller el ${fecha(origen.recepcion.fecha)}${origen.recepcion.responsable ? ` · ${origen.recepcion.responsable}` : ""}.` : "Seller todavía no registra la recepción del cliente."}</p>
        {!origen.recepcion.fecha && fechaHermes && <p className="field-hint">Hermes tiene una fecha de entrega registrada ({fecha(fechaHermes)}); verifica la recepción antes de dar por completa esta etapa.</p>}
      </div>
      {origen.pago && <ResumenPagoPartida pago={origen.pago} />}
      {s.importes_ausentes>0 && <p className="origen-aviso">Hay {s.importes_ausentes} líneas vigentes con importes sin registrar. Consulta el detalle para revisarlas en Seller.</p>}
    </section>
    {documento && <DocumentoOrigen tipo={documento} origen={origen} lineas={lineas} clienteNombre={clienteNombre} cerrar={()=>setDocumento(null)} />}
  </>;
}

function DocumentoOrigen({ tipo, origen, lineas, clienteNombre, cerrar }: {
  tipo: "cotizacion" | "pedido"; origen: OrigenExpediente; lineas: VPedidoLineaHermes[]; clienteNombre: string; cerrar: ()=>void;
}) {
  const closeRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const handle=(event: KeyboardEvent)=>{
      if(event.key==="Escape") cerrar();
      if(event.key==="Tab") {
        const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>(".documento-origen button"));
        const first=buttons[0], last=buttons[buttons.length-1];
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
        if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    document.addEventListener("keydown",handle);
    return ()=>{document.removeEventListener("keydown",handle);previous?.focus();};
  },[cerrar]);
  const quote=tipo==="cotizacion";
  const encabezado=quote ? origen.cotizacion : origen.pedido;
  const rows=quote ? origen.lineas_cotizacion : lineasVigentes(lineas);
  if(!encabezado) return null;
  return createPortal(<div className="modal-overlay" onClick={cerrar}>
    <section role="dialog" aria-modal="true" aria-labelledby="documento-origen-titulo" className="card documento-origen" onClick={e=>e.stopPropagation()}>
      <div className="origen-documento-header"><div><p className="origen-eyebrow">Hermes · ROARI</p><h2 id="documento-origen-titulo">Consulta de {quote ? "cotización" : "pedido"}</h2><b>{encabezado.numero}</b></div><button type="button" className="btn btn-secondary no-print" ref={closeRef} onClick={cerrar}>Cerrar</button></div>
      <p><b>{clienteNombre}</b></p>
      <p className="field-hint">Datos actuales de Seller · {quote ? fecha(origen.cotizacion?.fecha ?? null) : fecha(origen.pedido.creado_en)}</p>
      <div className="origen-tabla-scroll"><table className="origen-tabla"><thead><tr><th>Descripción</th><th>Cantidad</th><th>Precio unit.</th><th>Desc.</th><th>Subtotal</th></tr></thead><tbody>
        {rows.map(l=><tr key={l.id}><td>{l.descripcion}</td><td>{cantidadDocumento(l)}{Number(cantidadDocumento(l))!==Number(l.cantidad_base) && <small>{l.cantidad_base} unidades base</small>}</td><td>{formatBs(l.precio_unitario)}</td><td>{Number(l.descuento_pct)>0 ? `${l.descuento_pct}%` : "—"}</td><td>{formatBs(l.subtotal)}</td></tr>)}
      </tbody></table></div>
      {rows.length===0 && <p>No hay líneas disponibles para este documento.</p>}
      <p className="origen-total">Total registrado en Seller <b>{formatBs(encabezado.total)}</b></p>
      <p className="field-hint">Esta consulta no sustituye una copia emitida ni una constancia firmada.</p>
      <div className="no-print origen-documento-actions"><button type="button" className="btn btn-orange" onClick={()=>window.print()}>Imprimir consulta</button></div>
    </section>
  </div>,document.body);
}

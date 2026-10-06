"use client";

import { useState } from "react";
import Link from "next/link";
import { CarteraSummary, DashboardHeader } from "./CarteraSummary";
import { formatBs } from "@/lib/money";
import Decimal from "decimal.js";
import type { PagoPropuesto, VCobrosBloqueados, VSaldoCliente } from "@/lib/types";
import { Icon } from "./Icon";

export type DashboardData = {
  saldos: VSaldoCliente[]; bloqueados: VCobrosBloqueados[]; pagos: PagoPropuesto[];
  cargando: boolean; error: string | null; errorSaldos: string | null; errorPagos: string | null;
  puedeConfirmar: boolean; actualizado: string | null;
  vencidas?: { monto: string; clientes: number } | null; errorVencidas?: string | null;
  pedidosPorRevisar?: number | null;
};
export function Dashboard({ data, onRefresh, onConfirm, confirmando = {}, erroresPago = {}, preview = false }: {
  data: DashboardData; onRefresh: () => void; onConfirm: (pago: PagoPropuesto) => void;
  confirmando?: Record<number, boolean>; erroresPago?: Record<number, string>; preview?: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [situacion, setSituacion] = useState("");
  const { saldos, bloqueados, pagos, cargando, error, errorSaldos, errorPagos } = data;
  const totalPagos = pagos.reduce((total, pago) => total.plus(pago.monto), new Decimal(0));
  const clientesConDocumentos = bloqueados.filter(b => b.motivos.includes("FRENADA") || b.motivos.includes("ENTREGADO_SIN_FACTURAR"));
  const hrefCliente = (id: number) => preview ? "/vista-previa/cliente" : `/clientes/${id}`;
  const filtrados = saldos.filter(c => (!situacion || (situacion === "VENCIDA" ? bloqueados.some(b => b.cliente_id === c.cliente_id && b.motivos.includes("VENCIDA")) : c.situacion === situacion)) && c.cliente.toLocaleLowerCase("es").includes(busqueda.toLocaleLowerCase("es").trim()));
  return <div className="dashboard">
    <DashboardHeader title="Mi día financiero" subtitle="Lo que requiere tu atención hoy." cargando={cargando} preview={preview} onRefresh={onRefresh} />
    <CarteraSummary data={data} />
    <div className="dashboard-columns">
      <section className="ledger-panel payment-panel" aria-labelledby="pagos-title">
        <div className="section-heading"><h2 id="pagos-title">Pagos registrados · falta verificar</h2><span className="payment-subtotal">Total registrado <strong>{cargando || errorPagos || !data.puedeConfirmar ? "—" : formatBs(totalPagos.toFixed(2))}</strong></span></div>
        {!data.puedeConfirmar ? <div className="empty-state"><Icon name="lock" /><h3>Verificación a cargo de gerencia</h3><p>Consulta los pagos en la ficha de cada cliente.</p><Link className="btn btn-secondary" href={preview ? "/vista-previa/cliente" : "/clientes"}>Consultar clientes</Link></div>
        : errorPagos ? <div className="empty-state" role="alert"><h3>No pudimos consultar los pagos</h3><p>{errorPagos}</p><button className="btn btn-secondary" onClick={onRefresh}>Reintentar</button></div>
        : cargando ? <div className="loading-state" role="status">Consultando pagos…</div>
        : pagos.length === 0 ? <div className="empty-state"><Icon name="check" /><h3>Todo verificado</h3><p>No hay pagos pendientes de verificación.</p></div>
         : <div className="payment-table-wrap"><table className="payment-table"><caption className="sr-only">Pagos registrados pendientes de verificación</caption><thead><tr><th>Cliente</th><th>Medio</th><th>Importe</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{pagos.slice(0, 6).map(p => <tr key={p.id}>
          <td data-label="Cliente"><Link href={hrefCliente(p.cliente_id)}>{p.cliente}</Link></td><td data-label="Medio">{p.medio}</td><td data-label="Importe" className="money">{formatBs(p.monto)}</td><td data-label="Estado"><span className="badge badge-provisional">Por verificar</span></td>
          <td data-label="Acción"><Link className="btn btn-secondary" href={preview ? "/vista-previa/conciliacion" : `/conciliacion?pago=${p.id}`}>Revisar</Link></td>
        </tr>)}</tbody></table></div>}
        <div className="panel-footer"><span><Icon name="alert" size={17} /> La verificación actualizará el saldo contable.</span>{data.puedeConfirmar && <Link href={preview ? "/vista-previa/conciliacion" : "/conciliacion"}>Ver {pagos.length} pagos<Icon name="arrow" size={16} /></Link>}</div>
      </section>
      <aside className="task-column">
        <section className="task-section"><div className="section-heading"><h2>Prioridades de hoy</h2></div>
          <a href="#cartera-title" className="priority-action" onClick={() => setSituacion("VENCIDA")}><Icon name="clock" size={34} /><span><strong className="money-overdue">{cargando || data.errorVencidas || !data.vencidas ? "—" : data.vencidas.clientes}</strong> {data.vencidas?.clientes === 1 ? "cuenta vencida" : "cuentas vencidas"}<small>{data.vencidas && !data.errorVencidas ? formatBs(data.vencidas.monto) : "Vencimientos no disponibles"}</small></span><Icon name="arrow" size={17} /></a>
          <Link href={preview ? "/vista-previa/cliente" : "/clientes"} className="priority-action"><Icon name="receipt" size={34} /><span><strong className="money-provisional">{cargando || error ? "—" : clientesConDocumentos.length}</strong> clientes con documentos pendientes<small>{error ? "Consulta no disponible" : "Respaldo o facturación por completar"}</small></span><Icon name="arrow" size={17} /></Link>
          <Link href={preview ? "/vista-previa/cliente" : "/pedidos-pendientes"} className="priority-action"><Icon name="box" size={34} /><span><strong className="money-credit">{cargando || data.pedidosPorRevisar == null ? "—" : data.pedidosPorRevisar}</strong> pedidos anteriores por revisar<small>{data.pedidosPorRevisar == null ? "Consulta pendiente · abrir pedidos" : "Pendientes de vincular o completar"}</small></span><Icon name="arrow" size={17} /></Link>
        </section>
        <section className="task-section due-panel"><div className="section-heading"><h2>Vencimientos próximos</h2><Icon name="arrow" size={17} /></div><div className="due-head"><span>Cliente</span><span>Vencimiento</span><span>Importe</span></div><div className="due-unavailable"><Icon name="calendar" size={25} /><p>Consulta de próximos vencimientos pendiente de integrar.</p><Link href={preview ? "/vista-previa/cliente" : "/clientes"}>Consultar partidas de clientes</Link></div></section>
      </aside>
    </div>
      <section className="ledger-panel cartera-panel" aria-labelledby="cartera-title">
        <div className="section-heading"><h2 id="cartera-title">Cartera de clientes</h2><span className="quiet-count">{cargando || errorSaldos ? "—" : `${saldos.length} cuentas`}</span></div>
        <div className="filter-bar"><label className="search-field"><Icon name="search" size={18} /><input aria-label="Buscar cliente" placeholder="Buscar un cliente…" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label>
          <select className="select" aria-label="Filtrar por situación" value={situacion} onChange={e => setSituacion(e.target.value)}><option value="">Todas las cuentas</option><option value="DEUDOR">Con deuda</option><option value="VENCIDA">Con partidas vencidas</option><option value="ACREEDOR">Con saldo a favor</option><option value="AL_DIA">Al día</option></select></div>
        {errorSaldos ? <div className="empty-state" role="alert"><Icon name="alert" /><h3>No pudimos cargar la cartera</h3><p>{errorSaldos}</p><button className="btn btn-secondary" onClick={onRefresh}>Reintentar</button></div> : cargando ? <div className="loading-state" role="status">Consultando saldos…</div> : <>
          <div className="account-table-head"><span>Cliente</span><span>Situación</span><span>Saldo confirmado</span><span /></div>
          {filtrados.slice(0, 8).map(c => <Link className="account-row" key={c.cliente_id} href={hrefCliente(c.cliente_id)}>
            <div className="account-name"><span className="client-avatar">{c.cliente.slice(0, 2).toUpperCase()}</span><div><strong>{c.cliente}</strong><small>{c.categoria.charAt(0) + c.categoria.slice(1).toLowerCase()}</small></div></div>
            <span className={`badge ${c.situacion === "DEUDOR" ? "badge-deudor" : c.situacion === "ACREEDOR" ? "badge-acreedor" : "badge-aldia"}`}>{c.situacion === "DEUDOR" ? "Con deuda" : c.situacion === "ACREEDOR" ? "A favor" : "Al día"}</span>
            <strong className={`account-amount ${c.situacion === "ACREEDOR" ? "money-favor" : ""}`}>{formatBs(c.saldo_confirmado)}</strong><Icon name="arrow" size={17} />
          </Link>)}
          {filtrados.length === 0 && <div className="empty-state"><h3>{saldos.length === 0 ? "La cartera está vacía" : "No encontramos ese cliente"}</h3><p>{saldos.length === 0 ? "Importa clientes desde el POS para comenzar." : "Prueba con otro nombre o cambia el filtro."}</p></div>}
          <div className="panel-footer"><span>{Math.min(filtrados.length, 8)} de {filtrados.length} cuentas{situacion || busqueda ? " filtradas" : ""}</span><Link href={preview ? "/vista-previa/cliente" : "/clientes"}>Ver todos los clientes <Icon name="arrow" size={16} /></Link></div>
        </>}
      </section>
    <div className="data-note"><span className="connection-dot" />{preview ? "Vista de prueba · datos sintéticos" : data.actualizado ? `Última consulta: ${data.actualizado}. Actualización cada 15 segundos y al volver a la ventana.` : "Los saldos se consultan en el libro auxiliar."}</div>
  </div>;
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import { formatBs } from "@/lib/money";
import type { PagoPropuesto, VCobrosBloqueados, VSaldoCliente } from "@/lib/types";
import { Icon } from "./Icon";

export type DashboardData = {
  saldos: VSaldoCliente[]; bloqueados: VCobrosBloqueados[]; pagos: PagoPropuesto[];
  cargando: boolean; error: string | null; errorSaldos: string | null; errorPagos: string | null;
  puedeConfirmar: boolean; actualizado: string | null;
};
export function Dashboard({ data, onRefresh, onConfirm, confirmando = {}, erroresPago = {}, preview = false }: {
  data: DashboardData; onRefresh: () => void; onConfirm: (pago: PagoPropuesto) => void;
  confirmando?: Record<number, boolean>; erroresPago?: Record<number, string>; preview?: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [situacion, setSituacion] = useState("");
  const { saldos, bloqueados, pagos, cargando, error, errorSaldos, errorPagos } = data;
  const hrefCliente = (id: number) => preview ? "/vista-previa/cliente" : `/clientes/${id}`;
  const summary = useMemo(() => saldos.reduce((acc, c) => {
    const saldo = new Decimal(c.saldo_confirmado);
    if (saldo.gt(0)) acc.porCobrar = acc.porCobrar.plus(saldo);
    if (saldo.lt(0)) acc.aFavor = acc.aFavor.plus(saldo.abs());
    acc.enRevision = acc.enRevision.plus(new Decimal(c.monto_en_revision));
    return acc;
  }, { porCobrar: new Decimal(0), aFavor: new Decimal(0), enRevision: new Decimal(0) }), [saldos]);
  const filtrados = saldos.filter(c => (!situacion || c.situacion === situacion) && c.cliente.toLocaleLowerCase("es").includes(busqueda.toLocaleLowerCase("es").trim()));
  const date = new Intl.DateTimeFormat("es-BO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/La_Paz" }).format(new Date());
  return <div className="dashboard">
    <header className="page-header"><div><h1 className="page-title">Mi día</h1><p className="page-sub">Tu cartera, de un vistazo. <span className="header-date">{date}</span></p></div>
      <button className="btn btn-secondary" type="button" disabled={cargando || preview} onClick={onRefresh}><Icon name="refresh" size={17} />{cargando ? "Actualizando…" : "Actualizar"}</button></header>
    <section className="balance-strip" aria-label="Resumen de cartera" aria-busy={cargando}>
      <div className="balance-primary"><span>Saldo pendiente de cobro</span><strong>{cargando ? "—" : errorSaldos ? "No disponible" : formatBs(summary.porCobrar.toFixed(2))}</strong><small>Deuda confirmada de los clientes</small></div>
      <div><span>Pagos por verificar</span><strong className="money-provisional">{cargando || errorSaldos ? "—" : formatBs(summary.enRevision.toFixed(2))}</strong><small>Ya registrados · falta verificar</small></div>
      <div><span>Saldo a favor de clientes</span><strong className="money-favor">{cargando || errorSaldos ? "—" : formatBs(summary.aFavor.toFixed(2))}</strong><small>Crédito disponible en sus cuentas</small></div>
    </section>
    <div className="dashboard-columns">
      <section className="ledger-panel" aria-labelledby="cartera-title">
        <div className="section-heading"><h2 id="cartera-title">Cartera de clientes</h2><span className="quiet-count">{cargando || errorSaldos ? "—" : `${saldos.length} cuentas`}</span></div>
        <div className="filter-bar"><label className="search-field"><Icon name="search" size={18} /><input aria-label="Buscar cliente" placeholder="Buscar un cliente…" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label>
          <select className="select" aria-label="Filtrar por situación" value={situacion} onChange={e => setSituacion(e.target.value)}><option value="">Todas las cuentas</option><option value="DEUDOR">Con deuda</option><option value="ACREEDOR">Con saldo a favor</option><option value="AL_DIA">Al día</option></select></div>
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
      <aside className="task-column">
        <section className="task-section"><div className="section-heading"><h2>Requieren atención</h2><span className="quiet-count">{error || cargando ? "—" : bloqueados.length}</span></div><p className="section-description">Lo que está frenando el cobro.</p>
          {error ? <div role="alert" className="inline-error"><p>No pudimos consultar los cobros bloqueados.</p><button className="btn-link" onClick={onRefresh}>Reintentar</button></div> : cargando ? <p role="status">Consultando pendientes…</p> : bloqueados.length === 0 ? <div className="compact-empty"><Icon name="check" /><p>No hay cobros bloqueados.</p></div> : bloqueados.slice(0, 4).map(b => <Link className="task-row" key={b.cliente_id} href={hrefCliente(b.cliente_id)}><div><strong>{b.cliente}</strong><small>{b.motivos.includes("VENCIDA") ? "Vencido" : b.motivos.includes("ENTREGADO_SIN_FACTURAR") ? "Sin facturar" : "Documentación pendiente"} · {b.dias_maximo} días</small></div><span className="money">{formatBs(b.monto_bloqueado)}</span></Link>)}
          {bloqueados.length > 4 && <details className="more-tasks"><summary>Ver {bloqueados.length - 4} pendientes más</summary>{bloqueados.slice(4).map(b => <Link className="task-row" key={b.cliente_id} href={hrefCliente(b.cliente_id)}><strong>{b.cliente}</strong><span>{formatBs(b.monto_bloqueado)}</span></Link>)}</details>}
        </section>
        {data.puedeConfirmar && <section className="task-section"><div className="section-heading"><h2>Pagos registrados por verificar</h2><Icon name="clock" size={18} /></div><p className="section-description">El pago ya se registró. Verifica su recepción para actualizar el saldo contable.</p>
          {errorPagos ? <div role="alert" className="inline-error"><p>{errorPagos}</p><button className="btn-link" onClick={onRefresh}>Reintentar</button></div> : cargando ? <p role="status">Consultando pagos…</p> : pagos.length === 0 ? <div className="compact-empty"><Icon name="check" /><p>No hay pagos pendientes de verificación.</p></div> : pagos.map(p => <div className="payment-row" key={p.id}><Link href={hrefCliente(p.cliente_id)}><strong>{p.cliente}</strong></Link><div className="payment-meta"><span>{p.medio} · {p.creado_por.replace(/^pos:/, "")}</span><strong>{formatBs(p.monto)}</strong></div>{p.referencia && <small>Ref. {p.referencia}</small>}<button className="btn btn-secondary" disabled={preview || confirmando[p.id]} onClick={() => onConfirm(p)}>{confirmando[p.id] ? "Confirmando…" : "Confirmar pago"}</button>{erroresPago[p.id] && <p className="field-error" role="alert">{erroresPago[p.id]}</p>}</div>)}
        </section>}
        <Link className="document-shortcut" href={preview ? "/vista-previa/cliente" : "/captura"}><Icon name="camera" /><span><strong>Captura de documentos</strong><small>Adjunta evidencia desde tu dispositivo</small></span><Icon name="arrow" size={17} /></Link>
      </aside>
    </div>
    <div className="data-note"><span className="connection-dot" />{preview ? "Vista de prueba · datos sintéticos" : data.actualizado ? `Última consulta: ${data.actualizado}. Actualiza para consultar cambios recientes.` : "Los saldos se consultan en el libro auxiliar."}</div>
  </div>;
}

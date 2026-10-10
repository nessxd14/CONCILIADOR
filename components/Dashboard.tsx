"use client";

import { useState } from "react";
import Link from "next/link";
import { CarteraSummary, DashboardHeader } from "./CarteraSummary";
import { Tabs } from "./Tabs";
import { formatBs } from "@/lib/money";
import { formatFechaHora, type PeriodoActividad } from "@/lib/fechas";
import type { PagoActividad, PedidoActividad } from "@/lib/use-actividad";
import Decimal from "decimal.js";
import type { PagoPropuesto, VCobrosBloqueados, VSaldoCliente } from "@/lib/types";
import { Icon } from "./Icon";

export type ActividadView = {
  pagos: PagoActividad[]; pedidos: PedidoActividad[]; cargando: boolean;
  errorPagos: string | null; errorPedidos: string | null; recargar: () => void;
};

export type DashboardData = {
  saldos: VSaldoCliente[]; bloqueados: VCobrosBloqueados[]; pagos: PagoPropuesto[];
  cargando: boolean; error: string | null; errorSaldos: string | null; errorPagos: string | null;
  puedeConfirmar: boolean; actualizado: string | null;
  vencidas?: { monto: string; clientes: number } | null; errorVencidas?: string | null;
};

const ESTADO_PAGO_INFO: Record<PagoActividad["estado"], { label: string; className: string; mudo?: boolean }> = {
  PROPUESTO: { label: "Por verificar", className: "badge-provisional" },
  CONFIRMADO: { label: "Verificado", className: "badge-aldia" },
  ACREDITADO: { label: "Acreditado", className: "badge-acreedor" },
  RECHAZADO: { label: "Rechazado", className: "badge-deudor", mudo: true },
  ANULADO: { label: "Anulado", className: "badge-deudor", mudo: true },
};

const ESTADO_PARTIDA_INFO: Record<string, { label: string; mudo?: boolean }> = {
  ABIERTA: { label: "Abierta" },
  PAGADA: { label: "Pagada" },
  ANULADA: { label: "Anulada", mudo: true },
  CANCELADA: { label: "Cancelada", mudo: true },
};

const PAGINA_ACTIVIDAD = 50;

function PeriodoSelector({ periodo, onPeriodo, desde, hasta, onDesde, onHasta }: {
  periodo: PeriodoActividad; onPeriodo: (p: PeriodoActividad) => void;
  desde: string; hasta: string; onDesde: (v: string) => void; onHasta: (v: string) => void;
}) {
  return <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
    <select className="select" aria-label="Período" value={periodo} onChange={e => onPeriodo(e.target.value as PeriodoActividad)}>
      <option value="24h">Últimas 24 horas</option>
      <option value="hoy">Hoy</option>
      <option value="7d">Últimos 7 días</option>
      <option value="rango">Rango de fechas</option>
    </select>
    {periodo === "rango" && <>
      <input type="date" className="input" aria-label="Desde" value={desde} onChange={e => onDesde(e.target.value)} />
      <input type="date" className="input" aria-label="Hasta" min={desde} value={hasta} onChange={e => onHasta(e.target.value < desde ? desde : e.target.value)} />
    </>}
  </div>;
}

function FilaPago({ p, preview }: { p: PagoActividad; preview: boolean }) {
  const info = ESTADO_PAGO_INFO[p.estado];
  return <tr style={info.mudo ? { opacity: .55 } : undefined}>
    <td data-label="Fecha y hora">{formatFechaHora(p.creado_en)}</td>
    <td data-label="Cliente"><Link href={preview ? "/vista-previa/cliente" : `/clientes/${p.cliente_id}`}>{p.cliente}</Link></td>
    <td data-label="Medio">{p.medio}</td>
    <td data-label="Importe" className="money">{formatBs(p.monto)}</td>
    <td data-label="Estado"><span className={`badge ${info.className}`}>{info.label}</span></td>
    <td data-label="Acción">{p.estado === "PROPUESTO" && <Link className="btn btn-secondary" href={preview ? "/vista-previa/conciliacion" : `/conciliacion?pago=${p.id}`}>Revisar</Link>}</td>
  </tr>;
}

function FilaPedido({ p, preview }: { p: PedidoActividad; preview: boolean }) {
  const info = ESTADO_PARTIDA_INFO[p.estado] ?? { label: p.estado };
  return <tr style={info.mudo ? { opacity: .55 } : undefined}>
    <td data-label="Fecha y hora">{formatFechaHora(p.creado_en)}</td>
    <td data-label="Cliente"><Link href={preview ? "/vista-previa/cliente" : `/clientes/${p.cliente_id}`}>{p.cliente_nombre}</Link></td>
    <td data-label="Pedido">{p.referencia ?? "—"}</td>
    <td data-label="Partida"><Link href={preview ? "/vista-previa/cliente" : `/clientes/${p.cliente_id}/expediente/${p.id}`}>{p.documento_interno}</Link></td>
    <td data-label="Importe" className="money">{formatBs(p.total)}</td>
    <td data-label="Estado"><span className="badge">{info.label}</span></td>
  </tr>;
}

export function Dashboard({
  data, onRefresh, onConfirm, confirmando = {}, erroresPago = {}, preview = false,
  actividad, periodo, onPeriodoChange, desde, hasta, onDesdeChange, onHastaChange,
}: {
  data: DashboardData; onRefresh: () => void; onConfirm: (pago: PagoPropuesto) => void;
  confirmando?: Record<number, boolean>; erroresPago?: Record<number, string>; preview?: boolean;
  actividad: ActividadView; periodo: PeriodoActividad; onPeriodoChange: (p: PeriodoActividad) => void;
  desde: string; hasta: string; onDesdeChange: (v: string) => void; onHastaChange: (v: string) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [situacion, setSituacion] = useState("");
  const [tab, setTab] = useState<"pagos" | "pedidos">("pagos");
  const [visiblePagos, setVisiblePagos] = useState(PAGINA_ACTIVIDAD);
  const [visiblePedidos, setVisiblePedidos] = useState(PAGINA_ACTIVIDAD);

  const { saldos, bloqueados, pagos, cargando, error, errorSaldos, errorPagos } = data;
  const clientesConDocumentos = bloqueados.filter(b => b.motivos.includes("FRENADA") || b.motivos.includes("ENTREGADO_SIN_FACTURAR"));
  const hrefCliente = (id: number) => preview ? "/vista-previa/cliente" : `/clientes/${id}`;
  const filtrados = saldos.filter(c => (!situacion || (situacion === "VENCIDA" ? bloqueados.some(b => b.cliente_id === c.cliente_id && b.motivos.includes("VENCIDA")) : c.situacion === situacion)) && c.cliente.toLocaleLowerCase("es").includes(busqueda.toLocaleLowerCase("es").trim()));

  const totalPagosPeriodo = actividad.pagos
    .filter(p => p.estado !== "RECHAZADO" && p.estado !== "ANULADO")
    .reduce((total, p) => total.plus(p.monto), new Decimal(0));
  const totalPedidosPeriodo = actividad.pedidos
    .filter(p => p.estado !== "ANULADA")
    .reduce((total, p) => total.plus(p.total), new Decimal(0));

  function cambiarPeriodo(p: PeriodoActividad) {
    onPeriodoChange(p);
    setVisiblePagos(PAGINA_ACTIVIDAD);
    setVisiblePedidos(PAGINA_ACTIVIDAD);
  }
  function cambiarTab(t: "pagos" | "pedidos") {
    setTab(t);
  }

  return <div className="dashboard">
    <DashboardHeader title="Mi día financiero" subtitle="Lo que requiere tu atención hoy." cargando={cargando} preview={preview} onRefresh={onRefresh} />
    <CarteraSummary data={data} />
    <div className="dashboard-columns">
      <section className="ledger-panel payment-panel" aria-labelledby="actividad-title">
        <div className="section-heading">
          <h2 id="actividad-title">Actividad reciente</h2>
          <PeriodoSelector periodo={periodo} onPeriodo={cambiarPeriodo} desde={desde} hasta={hasta} onDesde={onDesdeChange} onHasta={onHastaChange} />
        </div>
        <div style={{ padding: "0 22px" }}>
          <Tabs id="actividad" label="Actividad reciente" value={tab} onChange={cambiarTab} items={[
            { value: "pagos", label: "Pagos", count: actividad.pagos.length },
            { value: "pedidos", label: "Pedidos", count: actividad.pedidos.length },
          ]} />
        </div>
        <div role="tabpanel" id="actividad-panel" aria-labelledby={`actividad-tab-${tab}`}>
          {tab === "pagos" ? (
            !data.puedeConfirmar ? <div className="empty-state"><Icon name="lock" /><h3>Verificación a cargo de gerencia</h3><p>Consulta los pagos en la ficha de cada cliente.</p><Link className="btn btn-secondary" href={preview ? "/vista-previa/cliente" : "/clientes"}>Consultar clientes</Link></div>
            : actividad.errorPagos ? <div className="empty-state" role="alert"><h3>No pudimos consultar los pagos</h3><p>{actividad.errorPagos}</p><button className="btn btn-secondary" onClick={() => actividad.recargar()}>Reintentar</button></div>
            : actividad.cargando && actividad.pagos.length === 0 ? <div className="loading-state" role="status">Consultando pagos…</div>
            : actividad.pagos.length === 0 ? <div className="empty-state"><Icon name="check" /><h3>Sin pagos en este período.</h3></div>
            : <>
              <div className="payment-table-wrap"><table className="payment-table"><caption className="sr-only">Pagos registrados en el período</caption>
                <thead><tr><th>Fecha y hora</th><th>Cliente</th><th>Medio</th><th>Importe</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>{actividad.pagos.slice(0, visiblePagos).map(p => <FilaPago key={p.id} p={p} preview={preview} />)}</tbody>
              </table></div>
              {visiblePagos < actividad.pagos.length && <div style={{ padding: "12px 22px" }}><button type="button" className="btn btn-secondary" onClick={() => setVisiblePagos(v => v + PAGINA_ACTIVIDAD)}>Ver más</button></div>}
              <div className="panel-footer"><span>{actividad.pagos.length} {actividad.pagos.length === 1 ? "pago" : "pagos"} · Total recibido {formatBs(totalPagosPeriodo.toFixed(2))}</span><Link href={preview ? "/vista-previa/conciliacion" : "/conciliacion"}>Ver {pagos.length} pagos por verificar<Icon name="arrow" size={16} /></Link></div>
            </>
          ) : (
            actividad.errorPedidos ? <div className="empty-state" role="alert"><h3>No pudimos consultar los pedidos</h3><p>{actividad.errorPedidos}</p><button className="btn btn-secondary" onClick={() => actividad.recargar()}>Reintentar</button></div>
            : actividad.cargando && actividad.pedidos.length === 0 ? <div className="loading-state" role="status">Consultando pedidos…</div>
            : actividad.pedidos.length === 0 ? <div className="empty-state"><Icon name="box" /><h3>Sin pedidos en este período.</h3></div>
            : <>
              <div className="payment-table-wrap"><table className="payment-table"><caption className="sr-only">Pedidos abiertos en el período</caption>
                <thead><tr><th>Fecha y hora</th><th>Cliente</th><th>Pedido</th><th>Partida</th><th>Importe</th><th>Estado</th></tr></thead>
                <tbody>{actividad.pedidos.slice(0, visiblePedidos).map(p => <FilaPedido key={p.id} p={p} preview={preview} />)}</tbody>
              </table></div>
              {visiblePedidos < actividad.pedidos.length && <div style={{ padding: "12px 22px" }}><button type="button" className="btn btn-secondary" onClick={() => setVisiblePedidos(v => v + PAGINA_ACTIVIDAD)}>Ver más</button></div>}
              <div className="panel-footer"><span>{actividad.pedidos.length} {actividad.pedidos.length === 1 ? "pedido" : "pedidos"} · Total {formatBs(totalPedidosPeriodo.toFixed(2))}</span></div>
            </>
          )}
        </div>
      </section>
      <aside className="task-column">
        <section className="task-section"><div className="section-heading"><h2>Prioridades de hoy</h2></div>
          <a href="#cartera-title" className="priority-action" onClick={() => setSituacion("VENCIDA")}><Icon name="clock" size={34} /><span><strong className="money-overdue">{cargando || data.errorVencidas || !data.vencidas ? "—" : data.vencidas.clientes}</strong> {data.vencidas?.clientes === 1 ? "cuenta vencida" : "cuentas vencidas"}<small>{data.vencidas && !data.errorVencidas ? formatBs(data.vencidas.monto) : "Vencimientos no disponibles"}</small></span><Icon name="arrow" size={17} /></a>
          <Link href={preview ? "/vista-previa/cliente" : "/clientes"} className="priority-action"><Icon name="receipt" size={34} /><span><strong className="money-provisional">{cargando || error ? "—" : clientesConDocumentos.length}</strong> clientes con documentos pendientes<small>{error ? "Consulta no disponible" : "Respaldo o facturación por completar"}</small></span><Icon name="arrow" size={17} /></Link>
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
          {filtrados.length === 0 && <div className="empty-state"><h3>{saldos.length === 0 ? "La cartera está vacía" : "No encontramos ese cliente"}</h3><p>{saldos.length === 0 ? "Los clientes de Seller aparecen aquí automáticamente." : "Prueba con otro nombre o cambia el filtro."}</p></div>}
          <div className="panel-footer"><span>{Math.min(filtrados.length, 8)} de {filtrados.length} cuentas{situacion || busqueda ? " filtradas" : ""}</span><Link href={preview ? "/vista-previa/cliente" : "/clientes"}>Ver todos los clientes <Icon name="arrow" size={16} /></Link></div>
        </>}
      </section>
    <div className="data-note"><span className="connection-dot" />{preview ? "Vista de prueba · datos sintéticos" : data.actualizado ? `Última consulta: ${data.actualizado}. Actualización cada 15 segundos y al volver a la ventana.` : "Los saldos se consultan en el libro auxiliar."}</div>
  </div>;
}

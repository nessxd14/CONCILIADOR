"use client";
import Link from "next/link";
import Decimal from "decimal.js";
import { formatBs } from "@/lib/money";
import { CarteraSummary, DashboardHeader } from "./CarteraSummary";
import type { DashboardData } from "./Dashboard";
import { Icon } from "./Icon";

export function Overview({ data, onRefresh, preview = false }: { data: DashboardData; onRefresh: () => void; preview?: boolean }) {
  const categorias = ["MAYORISTA", "INSTITUCIONAL", "CORPORATIVO"].map(categoria => ({ categoria, total: data.saldos.filter(c => c.categoria === categoria).reduce((suma, c) => suma.plus(Decimal.max(0, c.saldo_confirmado)), new Decimal(0)) }));
  const maximo = Decimal.max(1, ...categorias.map(c => c.total));
  const deudores = data.saldos.filter(c => new Decimal(c.saldo_confirmado).gt(0)).sort((a, b) => new Decimal(b.saldo_confirmado).cmp(a.saldo_confirmado)).slice(0, 5);
  return <div>
    <DashboardHeader title="Visión general" subtitle="La salud de tu cartera, con cifras confirmadas." cargando={data.cargando} preview={preview} onRefresh={onRefresh} />
    <CarteraSummary data={data} />
    <div className="overview-grid">
      <section className="glass-panel chart-panel"><div className="section-heading"><div><h2>Cartera por segmento</h2><p className="section-description">Deuda confirmada. El crédito a favor se muestra por separado.</p></div><Icon name="chart" /></div>
        {data.errorSaldos ? <div className="empty-state" role="alert"><h3>No pudimos cargar la cartera</h3><p>{data.errorSaldos}</p><button className="btn btn-secondary" onClick={onRefresh}>Reintentar</button></div> : data.cargando ? <div className="loading-state" role="status">Consultando cartera…</div> : <div className="segment-chart">{categorias.map(c => <div className="segment-row" key={c.categoria}><div><span>{c.categoria.charAt(0) + c.categoria.slice(1).toLowerCase()}</span><strong>{formatBs(c.total.toFixed(2))}</strong></div><div className="segment-track" aria-hidden="true"><div style={{ width: `${c.total.div(maximo).mul(100).toNumber()}%` }} /></div></div>)}</div>}
        <div className="chart-caption">Los importes corresponden al saldo actual del libro auxiliar, no a ingresos de caja.</div>
      </section>
      <section className="glass-panel coverage-panel"><div className="section-heading"><h2>Salud financiera</h2><span className="badge badge-provisional">Cobertura parcial</span></div><p className="section-description">Hoy conocemos la cartera. Para completar la visión de la empresa faltan estas fuentes.</p>
        {[{ title: "Caja y bancos", sub: "Saldos disponibles y movimientos conciliados", href: "tesoreria", icon: "wallet" as const }, { title: "Cuentas por pagar", sub: "Facturas, vencimientos y pagos a proveedores", href: "proveedores", icon: "box" as const }, { title: "Ingresos y costos", sub: "Ventas, costo de venta y gastos del período", href: "resultados", icon: "chart" as const }].map(item => <Link className="coverage-row" key={item.href} href={preview ? `/vista-previa/${item.href}` : `/${item.href}`}><Icon name={item.icon} /><span><strong>{item.title}</strong><small>{item.sub}</small></span><Icon name="arrow" size={16} /></Link>)}
      </section>
      <section className="ledger-panel"><div className="section-heading"><h2>Mayores saldos por cobrar</h2><Link href={preview ? "/vista-previa/cliente" : "/clientes"}>Ver clientes<Icon name="arrow" size={16} /></Link></div>
        {data.errorSaldos || data.cargando ? <div className="loading-state">{data.cargando ? "Consultando cuentas…" : "Cartera no disponible"}</div> : deudores.length === 0 ? <div className="empty-state"><h3>No hay deuda confirmada</h3><p>Las cuentas no registran saldos pendientes de cobro.</p></div> : deudores.map((c, i) => <Link className="ranking-row" key={c.cliente_id} href={preview ? "/vista-previa/cliente" : `/clientes/${c.cliente_id}`}><span className="quiet-count">{i + 1}</span><span><strong>{c.cliente}</strong><small>{c.categoria}</small></span><strong className="money">{formatBs(c.saldo_confirmado)}</strong><Icon name="arrow" size={16} /></Link>)}
      </section>
      <section className="glass-panel review-shortcut"><Icon name="receipt" size={28} /><h2>Del pago recibido al saldo verificado</h2><p>Los anticipos y pagos se registran en Seller. Hermes reúne la evidencia y actualiza el saldo al verificar.</p><Link className="btn btn-primary" href={preview ? "/vista-previa/conciliacion" : data.puedeConfirmar ? "/conciliacion" : "/clientes"}>{data.puedeConfirmar ? "Revisar pagos" : "Consultar cuentas"}<Icon name="arrow" size={16} /></Link></section>
    </div>
    <div className="data-note"><Icon name="book" size={16} />{preview ? "Vista de prueba · datos sintéticos" : data.actualizado ? `Última consulta: ${data.actualizado} · Actualización cada 15 segundos y al volver a la ventana.` : "Consultando el libro auxiliar de Hermes."}</div>
  </div>;
}

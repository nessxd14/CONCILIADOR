import { formatBs } from "@/lib/money";
import { resumirCartera } from "@/lib/cartera";
import { Icon } from "./Icon";
import type { DashboardData } from "./Dashboard";

export function CarteraSummary({ data }: { data: DashboardData }) {
  const summary = resumirCartera(data.saldos);
  const metric = (valor: string) => data.cargando ? "—" : data.errorSaldos ? "No disponible" : formatBs(valor);
  return <section className="balance-strip" aria-label="Resumen de cartera" aria-busy={data.cargando}>
    <div className="balance-primary"><span>Cartera por cobrar</span><div className="metric-value money-favor"><Icon name="wallet" size={36} /><strong>{metric(summary.porCobrar)}</strong></div><small>Deuda confirmada de clientes</small></div>
    <div><span>Cartera vencida</span><div className="metric-value money-overdue"><Icon name="clock" size={36} /><strong>{data.cargando ? "—" : data.errorVencidas || !data.vencidas ? "No disponible" : formatBs(data.vencidas.monto)}</strong></div><small>{data.vencidas && !data.errorVencidas ? `${data.vencidas.clientes} ${data.vencidas.clientes === 1 ? "cuenta" : "cuentas"} con partidas vencidas` : "Vencimientos del libro auxiliar"}</small></div>
    <div><span>Pagos por verificar</span><div className="metric-value money-provisional"><Icon name="alert" size={36} /><strong>{metric(summary.enRevision)}</strong></div><small>Ya registrados · falta verificar</small></div>
    <div><span>Saldo a favor</span><div className="metric-value money-credit"><Icon name="users" size={36} /><strong>{metric(summary.aFavor)}</strong></div><small>Crédito confirmado de clientes</small></div>
  </section>;
}

export function DashboardHeader({ title, subtitle, cargando = false, preview = false, onRefresh }: { title: string; subtitle: string; cargando?: boolean; preview?: boolean; onRefresh: () => void }) {
  const date = new Intl.DateTimeFormat("es-BO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/La_Paz" }).format(new Date());
  return <header className="page-header"><div><h1 className="page-title">{title}</h1><p className="page-sub">{subtitle}</p></div><div className="header-actions"><span className="header-date"><Icon name="calendar" size={17} />{date}</span><button className="btn btn-secondary" type="button" disabled={cargando || preview} onClick={onRefresh}><Icon name="refresh" size={17} />{cargando ? "Actualizando…" : "Actualizar"}</button></div></header>;
}

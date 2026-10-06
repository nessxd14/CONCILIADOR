import Link from "next/link";
import { Icon, type IconName } from "./Icon";

const modules = {
  tesoreria: { title: "Tesorería", sub: "Disponibilidad y movimiento del dinero de la empresa.", icon: "wallet" as IconName, metrics: ["Disponible en bancos", "Efectivo en caja", "Flujo proyectado"], explanation: "Los turnos de caja existen en Seller. Falta integrar sus cierres con los saldos bancarios y las transferencias entre cuentas para mostrar disponibilidad real.", sources: ["Saldos de apertura por cuenta bancaria y caja", "Cobros, gastos, depósitos y transferencias verificados", "Fechas previstas de cobro y pago para proyectar el flujo"] },
  proveedores: { title: "Proveedores", sub: "Obligaciones, vencimientos y pagos de tus compras.", icon: "box" as IconName, metrics: ["Total por pagar", "Obligaciones vencidas", "Próximos vencimientos"], explanation: "Las cuentas de clientes no representan las obligaciones con proveedores. Esta vista necesita un auxiliar de compras y cuentas por pagar.", sources: ["Proveedores y facturas de compra pendientes", "Plazos, vencimientos y pagos aplicados a cada factura", "Notas de crédito y saldos iniciales de proveedores"] },
  resultados: { title: "Resultados", sub: "Ventas, costos y rentabilidad del período.", icon: "chart" as IconName, metrics: ["Ingresos por ventas", "Margen bruto", "Resultado operativo"], explanation: "Los cobros pueden incluir anticipos y saldos de períodos anteriores. Para calcular resultados necesitamos ventas netas, costo de la mercadería vendida y gastos del mismo período.", sources: ["Ventas netas de devoluciones y anulaciones", "Costo de venta asociado a cada venta", "Gastos operativos y su período contable"] },
};
export type FinancialModule = keyof typeof modules;

export function FinancialCoverage({ module, preview = false }: { module: FinancialModule; preview?: boolean }) {
  const view = modules[module];
  return <div className="financial-coverage">
    <header className="page-header"><div><h1 className="page-title">{view.title}</h1><p className="page-sub">{view.sub}</p></div><span className="badge badge-provisional">Fuente pendiente de integrar</span></header>
    <section className="balance-strip unavailable-metrics" aria-label={`Indicadores de ${view.title}`}>{view.metrics.map(metric => <div key={metric}><span>{metric}</span><strong>—</strong><small>No disponible todavía</small></div>)}</section>
    <div className="coverage-layout"><section className="glass-panel source-empty"><Icon name={view.icon} size={38} /><h2>Completemos la fuente de datos</h2><p>{view.explanation}</p><div className="coverage-requirements"><h3>Datos necesarios</h3>{view.sources.map(source => <div key={source}><Icon name="book" size={18} /><span>{source}</span></div>)}</div></section>
      <aside className="glass-panel coverage-next"><h2>Lo que ya puedes consultar</h2><p>La cartera y los pagos registrados se leen directamente de Hermes, conectado a Seller.</p><Link className="coverage-row" href={preview ? "/vista-previa/resumen" : "/resumen"}><Icon name="chart" /><span><strong>Resumen de cartera</strong><small>Saldos confirmados y crédito de clientes</small></span><Icon name="arrow" size={16} /></Link><Link className="coverage-row" href={preview ? "/vista-previa" : "/dia"}><Icon name="calendar" /><span><strong>Mi día</strong><small>Pagos por verificar y prioridades de cobro</small></span><Icon name="arrow" size={16} /></Link><div className="source-status"><Icon name="alert" size={18} /><span>Los indicadores se habilitarán cuando exista una fuente verificable. Un dato ausente se muestra como «no disponible».</span></div></aside></div>
  </div>;
}

import Decimal from "decimal.js";
import { CATEGORIAS_CONCILIADOR, type CategoriaCliente, type TipoMovimiento, type VMayorAuxiliar } from "./types";

export interface ClienteMayor { id: number; nombre: string; categoria: CategoriaCliente }
export interface FiltroMayor { desde: string; hasta: string; clienteId?: number; categoria?: string }
export interface MovimientoMayor extends VMayorAuxiliar {
  cargo: string; abono: string; saldo_cliente_antes: string; saldo_cliente_despues: string;
  variacion_por_cobrar: string; por_cobrar_despues: string; favor_despues: string;
}
export interface InformeMayor {
  filtro: FiltroMayor;
  filas: MovimientoMayor[];
  resumen: {
    inicial: string; final: string; aumento_deuda: string; reduccion_deuda: string;
    cargos: string; abonos: string; favor_inicial: string; favor_final: string;
    neto_inicial: string; neto_final: string; clientes_con_deuda: number;
  };
}
export const nombresMayor: Record<TipoMovimiento, string> = {
  SALDO_APERTURA: "Saldo de apertura", CARGO: "Cargo", PAGO: "Pago",
  ANTICIPO: "Anticipo", NOTA_CREDITO: "Nota de crédito", AJUSTE: "Ajuste",
};
export function fechaValidaMayor(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function validarFiltroMayor(filtro: FiltroMayor) {
  if (!fechaValidaMayor(filtro.desde) || !fechaValidaMayor(filtro.hasta) || filtro.desde > filtro.hasta)
    throw new Error("Elige un período válido: la fecha inicial debe ser anterior o igual a la final.");
  if (filtro.clienteId !== undefined && (!Number.isSafeInteger(filtro.clienteId) || filtro.clienteId <= 0))
    throw new Error("El cliente seleccionado no es válido.");
  if (filtro.categoria && !(CATEGORIAS_CONCILIADOR as readonly string[]).includes(filtro.categoria))
    throw new Error("La categoría no pertenece a la cartera del Conciliador.");
}

/** Whole-history input, bounded by the reader's maximum ID; never just a table page.
 * Account balances are reconstructed from the signed, posted ledger entries, using
 * the same effective-date/ID order as v_mayor_auxiliar. Pending payments have no entry.
 */
export function construirMayor(movimientos: VMayorAuxiliar[], clientes: ClienteMayor[], filtro: FiltroMayor): InformeMayor {
  validarFiltroMayor(filtro);
  const disponibles = clientes.filter(c => (CATEGORIAS_CONCILIADOR as readonly string[]).includes(c.categoria));
  if (filtro.clienteId && !disponibles.some(c => c.id === filtro.clienteId))
    throw new Error("El cliente no está disponible en la cartera del Conciliador.");
  if (filtro.clienteId && filtro.categoria && !disponibles.some(c => c.id === filtro.clienteId && c.categoria === filtro.categoria))
    throw new Error("El cliente seleccionado no pertenece a esa categoría.");
  const ids = new Set(disponibles.filter(c => (!filtro.clienteId || c.id === filtro.clienteId)
    && (!filtro.categoria || c.categoria === filtro.categoria)).map(c => c.id));
  const source = movimientos.filter(m => ids.has(m.cliente_id) && m.fecha_efectiva <= filtro.hasta)
    .sort((a, b) => a.fecha_efectiva.localeCompare(b.fecha_efectiva) || a.id - b.id);
  const vistos = new Set<number>();
  const saldos = new Map<number, Decimal>();
  let porCobrar = new Decimal(0), favor = new Decimal(0);
  let inicial = new Decimal(0), favorInicial = new Decimal(0), inicioCapturado = false;
  let cargos = new Decimal(0), abonos = new Decimal(0), aumento = new Decimal(0), reduccion = new Decimal(0);
  const filas: MovimientoMayor[] = [];
  for (const m of source) {
    if (!Number.isSafeInteger(m.id) || m.id <= 0 || vistos.has(m.id) || !fechaValidaMayor(m.fecha_efectiva)
      || !Object.prototype.hasOwnProperty.call(nombresMayor, m.tipo)) throw new Error("El mayor contiene movimientos incompletos o duplicados.");
    vistos.add(m.id);
    if ((typeof m.monto !== 'string' && typeof m.monto !== 'number') || String(m.monto).trim() === '')
      throw new Error("Hay un importe contable inválido.");
    let monto: Decimal;
    try { monto = new Decimal(m.monto); } catch { throw new Error("Hay un importe contable inválido."); }
    if (!monto.isFinite() || monto.decimalPlaces() > 2) throw new Error("Hay un importe contable inválido.");
    if (!inicioCapturado && m.fecha_efectiva >= filtro.desde) {
      inicial = porCobrar; favorInicial = favor; inicioCapturado = true;
    }
    const antes = saldos.get(m.cliente_id) ?? new Decimal(0);
    const despues = antes.plus(monto);
    const variacion = Decimal.max(despues, 0).minus(Decimal.max(antes, 0));
    porCobrar = porCobrar.plus(variacion);
    favor = favor.plus(Decimal.max(despues.negated(), 0).minus(Decimal.max(antes.negated(), 0)));
    saldos.set(m.cliente_id, despues);
    if (m.fecha_efectiva < filtro.desde) continue;
    cargos = cargos.plus(Decimal.max(monto, 0));
    abonos = abonos.plus(Decimal.max(monto.negated(), 0));
    aumento = aumento.plus(Decimal.max(variacion, 0));
    reduccion = reduccion.plus(Decimal.max(variacion.negated(), 0));
    filas.push({ ...m, cargo: Decimal.max(monto, 0).toFixed(2), abono: Decimal.max(monto.negated(), 0).toFixed(2),
      saldo_cliente_antes: antes.toFixed(2), saldo_cliente_despues: despues.toFixed(2),
      variacion_por_cobrar: variacion.toFixed(2), por_cobrar_despues: porCobrar.toFixed(2), favor_despues: favor.toFixed(2) });
  }
  if (!inicioCapturado) { inicial = porCobrar; favorInicial = favor; }
  return { filtro, filas, resumen: {
    inicial: inicial.toFixed(2), final: porCobrar.toFixed(2), aumento_deuda: aumento.toFixed(2), reduccion_deuda: reduccion.toFixed(2),
    cargos: cargos.toFixed(2), abonos: abonos.toFixed(2), favor_inicial: favorInicial.toFixed(2), favor_final: favor.toFixed(2),
    neto_inicial: inicial.minus(favorInicial).toFixed(2), neto_final: porCobrar.minus(favor).toFixed(2),
    clientes_con_deuda: Array.from(saldos.values()).filter(s => s.gt(0)).length,
  } };
}

const textoCsv = (value: string) => `"${(/^[\s]*[=+\-@\t\r]/.test(value) ? "'" + value : value).replace(/"/g, '""')}"`;
/** Export every matching movement, independent of the current UI page. */
export function csvMayor(filas: MovimientoMayor[]): string {
  const header = ["ID", "Fecha efectiva", "Cliente", "Documento", "Movimiento", "Cargo", "Abono", "Saldo cliente", "Variación por cobrar", "Por cobrar después", "Saldo a favor después", "Registrado por", "Referencia", "Motivo", "Fecha registro"];
  const rows = filas.map(m => [String(m.id), textoCsv(m.fecha_efectiva), textoCsv(m.cliente), textoCsv(m.documento_interno ?? ""),
    textoCsv(nombresMayor[m.tipo]), m.cargo, m.abono, m.saldo_cliente_despues, m.variacion_por_cobrar, m.por_cobrar_despues,
    m.favor_despues, textoCsv(m.creado_por || "Usuario no registrado"), textoCsv(m.referencia ?? ""), textoCsv(m.motivo ?? ""), textoCsv(m.creado_en)]);
  return '\uFEFF' + [header.map(textoCsv).join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
}

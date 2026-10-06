import Decimal from "decimal.js";
import type { VSaldoCliente } from "./types";

/** La deuda y el crédito se muestran separados: un acreedor no reduce la cartera de otro cliente. */
export function resumirCartera(saldos: VSaldoCliente[]) {
  let porCobrar = new Decimal(0), aFavor = new Decimal(0), enRevision = new Decimal(0), deudores = 0;
  for (const cuenta of saldos) {
    const saldo = new Decimal(cuenta.saldo_confirmado);
    if (saldo.gt(0)) { porCobrar = porCobrar.plus(saldo); deudores++; }
    if (saldo.lt(0)) aFavor = aFavor.plus(saldo.abs());
    enRevision = enRevision.plus(cuenta.monto_en_revision);
  }
  return { porCobrar: porCobrar.toFixed(2), aFavor: aFavor.toFixed(2), enRevision: enRevision.toFixed(2), deudores };
}

export function resumirVencidas(rows: { partida_id: number; cliente_id: number; saldo_partida: string }[]) {
  const partidas = new Set<number>(), clientes = new Set<number>();
  let monto = new Decimal(0);
  for (const row of rows) {
    if (partidas.has(row.partida_id)) continue;
    partidas.add(row.partida_id);
    const saldo = new Decimal(row.saldo_partida);
    if (saldo.gt(0)) { monto = monto.plus(saldo); clientes.add(row.cliente_id); }
  }
  return { monto: monto.toFixed(2), clientes: clientes.size };
}

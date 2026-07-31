import Decimal from "decimal.js";

/**
 * Todo monto que sale de Postgres es `numeric`. Nunca se sanea con
 * parseFloat ni se opera con `number`: se envuelve en Decimal solo para
 * mostrarlo. El saldo en sí siempre viene calculado por la vista.
 */
export function formatBs(valor: string | number): string {
  const d = new Decimal(valor);
  const abs = d.abs().toFixed(2);
  const [entero, decimales] = abs.split(".");
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const signo = d.isNegative() ? "-" : "";
  return `${signo}Bs ${conMiles}.${decimales}`;
}

/** Parsea un monto tipeado por el usuario. Acepta coma de miles y punto decimal. */
export function parseMontoInput(raw: string): Decimal | null {
  const limpio = raw.trim().replace(/,/g, "");
  if (limpio === "" || Number.isNaN(Number(limpio))) return null;
  try {
    return new Decimal(limpio);
  } catch {
    return null;
  }
}

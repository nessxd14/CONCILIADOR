import Decimal from "decimal.js";

type ImportePago = string | number | null;
export type DatosPago = { imputado: ImportePago; pendiente: ImportePago; en_revision: ImportePago };

/** Resumen de lectura. Los importes confirmados siguen viniendo de Hermes. */
export function resumirPago(datos: DatosPago | null | undefined) {
  if (!datos || [datos.imputado, datos.pendiente, datos.en_revision].some(valor => valor == null)) return null;
  const confirmado = new Decimal(datos.imputado!);
  const pendiente = new Decimal(datos.pendiente!);
  const porVerificar = new Decimal(datos.en_revision!);
  if ([confirmado, pendiente, porVerificar].some(valor => !valor.isFinite() || valor.lt(0))) return null;

  const registrado = confirmado.plus(porVerificar);
  // Una propuesta puede cubrir la deuda sin haber modificado el libro contable.
  const sinRegistro = Decimal.max(pendiente.minus(porVerificar), 0);
  const revisarReparto = porVerificar.gt(pendiente);
  const soloVerificar = porVerificar.gt(0) && porVerificar.eq(pendiente);
  const pagado = confirmado.gt(0) && pendiente.eq(0) && porVerificar.eq(0);
  const titulo = porVerificar.gt(0)
    ? revisarReparto ? "Pagos registrados" : soloVerificar ? "Pago registrado" : "Anticipo registrado"
    : pagado ? "Pago confirmado" : confirmado.gt(0) ? "Pago parcial confirmado" : "Sin pago registrado";
  const etiqueta = porVerificar.gt(0)
    ? revisarReparto ? "Revisar reparto" : "Por verificar"
    : pagado ? "Pagado" : confirmado.gt(0) ? "Pago parcial" : "Pendiente";
  const mensaje = porVerificar.gt(0)
    ? revisarReparto ? "Hay pagos registrados por un importe mayor al saldo pendiente. Verifica los pagos y su reparto."
      : soloVerificar ? "El pago ya está registrado. Solo falta verificarlo."
        : "El anticipo ya está registrado y falta verificarlo."
    : pagado ? "El pago está confirmado y aplicado."
      : confirmado.gt(0) ? "El importe confirmado ya se aplicó a esta partida."
        : "El pedido todavía no tiene pagos aplicados o por verificar.";

  return { confirmado, pendiente, porVerificar, registrado, sinRegistro, revisarReparto, soloVerificar, pagado, titulo, etiqueta, mensaje };
}

import { resumirPago, type DatosPago } from "@/lib/pago-estado";
import { formatBs } from "@/lib/money";

export function ResumenPagoPartida({ pago }: { pago: DatosPago }) {
  const resumen = resumirPago(pago);
  return <section className="pago-seguimiento" aria-label="Estado del pago">
    <div className="origen-card-title"><h3>{resumen?.titulo ?? "Estado del pago"}</h3>
      {resumen && <span className={`badge ${resumen.pagado ? "badge-aldia" : resumen.porVerificar.gt(0) ? "badge-ambar" : "badge-pendiente"}`}>{resumen.etiqueta}</span>}
    </div>
    <p className={`pago-mensaje ${resumen?.porVerificar.gt(0) ? "money-provisional" : resumen?.pagado ? "money-favor" : ""}`}>{resumen?.mensaje ?? "No pudimos obtener todos los importes del pago."}</p>
    <div className="origen-pagos">
      <div><span>Registrado en pagos</span><b>{resumen ? formatBs(resumen.registrado.toString()) : "No disponible"}</b></div>
      <div><span>Por verificar</span><b className="money-provisional">{formatBs(pago.en_revision)}</b></div>
      <div><span>Sin pago registrado</span><b>{resumen ? formatBs(resumen.sinRegistro.toString()) : "No disponible"}</b></div>
    </div>
    <p className="field-hint pago-contable">Confirmado y aplicado: {formatBs(pago.imputado)} · Saldo contable: {formatBs(pago.pendiente)}.</p>
    {resumen?.porVerificar.gt(0) && <p className="field-hint">El saldo contable se actualizará al verificar el pago.</p>}
  </section>;
}

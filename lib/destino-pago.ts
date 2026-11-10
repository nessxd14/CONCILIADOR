import Decimal from "decimal.js";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MOTIVOS_ANTICIPO: Record<string, string> = {
  ADELANTO_PEDIDO_FUTURO: "Paga por adelantado un pedido que aún no se crea",
  NO_ES_PARA_PENDIENTES: "El cliente indicó que no es para los pedidos pendientes",
  GARANTIA_RESERVA: "Garantía o reserva acordada con gerencia",
  OTRO: "Otro",
};

export type DestinoPago =
  | { tipo: "anticipo"; pendienteCliente: string }
  | { tipo: "aplicado"; aplicaciones: { referencia: string; monto: string }[] };

/** Consulta a dónde irá el dinero de un pago PROPUESTO. Lanza si alguna lectura falla. */
export async function cargarDestinoPago(
  supabase: Pick<SupabaseClient, "from">,
  pago: { id: number; cliente_id: number; no_imputar: boolean },
): Promise<DestinoPago> {
  if (pago.no_imputar) {
    const { data, error } = await supabase.from("v_partida_estado").select("pendiente").eq("cliente_id", pago.cliente_id).eq("estado", "ABIERTA");
    if (error) throw error;
    const total = (data ?? []).reduce((s, r) => s.plus(r.pendiente ?? 0), new Decimal(0));
    return { tipo: "anticipo", pendienteCliente: total.toFixed(2) };
  }
  const apl = await supabase.from("pago_aplicacion").select("partida_id, monto").eq("pago_id", pago.id).order("partida_id");
  if (apl.error) throw apl.error;
  const filas = apl.data ?? [];
  if (!filas.length) return { tipo: "aplicado", aplicaciones: [] };
  const par = await supabase.from("partida_abierta").select("id, referencia").in("id", filas.map(f => f.partida_id));
  if (par.error) throw par.error;
  const refs = new Map((par.data ?? []).map(p => [p.id, p.referencia as string | null]));
  return { tipo: "aplicado", aplicaciones: filas.map(f => ({ referencia: refs.get(f.partida_id) ?? `Partida #${f.partida_id}`, monto: String(f.monto) })) };
}

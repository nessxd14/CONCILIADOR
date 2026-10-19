import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORIAS_CONCILIADOR, type VMayorAuxiliar } from "./types";
import { construirMayor, validarFiltroMayor, type ClienteMayor, type FiltroMayor } from "./mayor-cartera";

type Pagina<T> = { data: T[] | null; count: number | null; error: { message: string } | null };
/** Exact count prevents a short PostgREST response from looking like a complete ledger.
 * Continue at the number actually received, even if the API cap is below 1,000.
 */
export async function leerMayorCompleto<T>(consultar: (desde: number, hasta: number) => PromiseLike<Pagina<T>>) {
  const filas: T[] = [];
  let esperados: number | null = null;
  do {
    const pagina = await consultar(filas.length, filas.length + 999);
    if (pagina.error || !pagina.data || !Number.isSafeInteger(pagina.count) || pagina.count === null || pagina.count < 0)
      throw new Error("No pudimos leer el historial completo. Los saldos no están disponibles.");
    if (esperados !== null && pagina.count !== esperados)
      throw new Error("La cartera cambió durante la consulta. Vuelve a consultar para obtener un corte completo.");
    esperados = pagina.count;
    if (esperados > 100_000) throw new Error("El historial requiere una consulta agregada para su tamaño actual. Los saldos no están disponibles.");
    if (!pagina.data.length && filas.length < esperados)
      throw new Error("El historial llegó incompleto. Los saldos no están disponibles.");
    filas.push(...pagina.data);
    if (filas.length > esperados) throw new Error("El historial contiene más filas de las esperadas. Vuelve a consultar.");
  } while (filas.length < esperados);
  return filas;
}

/** Uses the caller's session/RLS, never a service key. No new DB grants or writes. */
export async function consultarMayor(supabase: SupabaseClient<any, "public" | "hermes">, filtro: FiltroMayor) {
  validarFiltroMayor(filtro);
  const corte = await supabase.from("v_mayor_auxiliar").select("id").order("id", { ascending: false }).limit(1);
  if (corte.error) throw new Error("No pudimos consultar el mayor de cartera.");
  const maxId = corte.data?.[0]?.id as number | undefined;
  const clientes = await leerMayorCompleto<ClienteMayor>((from, to) => supabase.from("cliente")
    .select("id,nombre,categoria", { count: 'exact' }).in("categoria", [...CATEGORIAS_CONCILIADOR]).order("id").range(from, to));
  let movimientos: VMayorAuxiliar[] = [];
  if (maxId !== undefined) {
    movimientos = await leerMayorCompleto<VMayorAuxiliar>((from, to) => {
      let query = supabase.from("v_mayor_auxiliar")
        .select("id,cliente_id,cliente,tipo,monto,saldo_corrido,partida_id,documento_interno,referencia,motivo,fecha_efectiva,creado_por,creado_en", { count: 'exact' })
        .lte("id", maxId).lte("fecha_efectiva", filtro.hasta).order("id").range(from, to);
      if (filtro.clienteId) query = query.eq("cliente_id", filtro.clienteId);
      return query;
    });
  }
  return { informe: construirMayor(movimientos, clientes, filtro), clientes,
    consultadoEn: new Date().toISOString(), corteId: maxId ?? null };
}

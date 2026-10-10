/**
 * Fecha de hoy en Trinidad (America/La_Paz, UTC−4), formato YYYY-MM-DD.
 * NUNCA usar new Date().toISOString().slice(0,10): después de las 20:00 hora
 * local devuelve mañana, y el plazo de cobro se corre un día.
 */
export const hoyLocal = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());

/** Días transcurridos desde una fecha YYYY-MM-DD hasta hoy, en hora local. */
export const diasDesde = (fechaISO: string): number => {
  const [anio, mes, dia] = hoyLocal().split("-").map(Number);
  const hoyUTC = Date.UTC(anio, mes - 1, dia);
  const desde = new Date(`${fechaISO}T00:00:00Z`).getTime();
  return Math.round((hoyUTC - desde) / 86400000);
};

/** YYYY-MM-DD a dd/mm, para notas cortas donde el año sobra. */
export const formatDiaMes = (fechaISO: string): string => {
  const [, mes, dia] = fechaISO.split("-");
  return `${dia}/${mes}`;
};

/** Suma (o resta, con n negativo) días a una fecha YYYY-MM-DD, en UTC para no arrastrar horario. */
const sumarDiasIso = (fechaISO: string, dias: number): string => {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

export type PeriodoActividad = "24h" | "hoy" | "7d" | "rango";

/**
 * Límites de un período para filtrar actividad reciente, en America/La_Paz
 * (UTC−4 fijo, sin horario de verano). `hasta` es `null` cuando el período no
 * tiene techo superior (incluye lo más reciente); para "Rango de fechas" es
 * el día siguiente al elegido, 00:00, para que el filtro sea exclusivo.
 * "Últimas 24 horas" es una ventana móvil desde el instante exacto, no desde
 * una medianoche local, así que no se construye a partir de hoyLocal().
 */
export function calcularRangoActividad(
  periodo: PeriodoActividad,
  rango?: { desde: string; hasta: string }
): { desde: string; hasta: string | null } {
  if (periodo === "24h") {
    return { desde: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), hasta: null };
  }

  const hoy = hoyLocal();

  if (periodo === "hoy") {
    return { desde: `${hoy}T00:00:00-04:00`, hasta: null };
  }

  if (periodo === "7d") {
    return { desde: `${sumarDiasIso(hoy, -6)}T00:00:00-04:00`, hasta: null };
  }

  const desde = rango?.desde ?? hoy;
  const hasta = rango?.hasta ?? hoy;
  return { desde: `${desde}T00:00:00-04:00`, hasta: `${sumarDiasIso(hasta, 1)}T00:00:00-04:00` };
}

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/La_Paz",
});

/** dd/mm HH:mm en America/La_Paz, para filas de actividad reciente. */
export const formatFechaHora = (iso: string): string => FORMATO_FECHA_HORA.format(new Date(iso));

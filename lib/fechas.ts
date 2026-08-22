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

export interface PartidaBaja {
  id: number;
  documento_interno: string;
  estado: "ANULADA" | "CANCELADA";
  total: string;
  anulada_por: string | null;
  anulada_en: string | null;
  motivo_anulacion: string | null;
}

export interface HistorialPartidaData {
  pedido: { id: number; numero: string | null; estado: string; lineas_rechazadas: number } | null;
  eventos: {
    id: string; accion: string; sistema: string; motivo: string | null;
    usuario: string | null; usuario_id: string | null; fecha: string | null;
    pedido_linea_id: number | null; estado_previo: string | null;
  }[];
}

const acciones: Record<string, string> = {
  ANULADO: "Pedido cancelado", RESTAURADO: "Pedido restaurado",
  LINEA_RECHAZADA: "Línea rechazada", PEDIDO_RECHAZADO: "Pendientes rechazados",
  LINEA_CAMBIADA: "Línea cambiada", LINEA_RETIRADA: "Línea retirada",
  LINEAS_AGREGADAS: "Líneas agregadas", PARTIDA_ANULADA: "Partida anulada",
  CANCELACION_RESUELTA: "Cancelación y pagos resueltos", REMANENTE_CANCELADO: "Remanente cancelado",
};
export function nombreAccion(accion: string) { return acciones[accion] ?? accion.replaceAll("_", " "); }
export function fechaHistorial(fecha: string | null) {
  if (!fecha || Number.isNaN(new Date(fecha).getTime())) return "Fecha no registrada";
  return new Date(fecha).toLocaleString("es-BO", { timeZone: "America/La_Paz", dateStyle: "medium", timeStyle: "short" });
}

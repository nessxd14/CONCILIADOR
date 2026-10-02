import type { VPedidoLineaHermes } from "./types";

export type EstadoOrigen = "COMPLETO" | "PENDIENTE" | "PARCIAL" | "NO_APLICA" | "ANULADO" | "REVISION";
export type ImporteOrigen = string | number | null;
export interface LineaCotizacionOrigen {
  id: number; descripcion: string; cantidad_base: string | number;
  cantidad_presentacion: string | number | null; precio_unitario: ImporteOrigen;
  descuento_pct: string | number | null; subtotal: ImporteOrigen;
}
export interface OrigenExpediente {
  pedido: { id: number; numero: string; estado: string; creado_en: string; creado_por: string | null;
    total: ImporteOrigen; origen_estado: EstadoOrigen };
  cotizacion: { id: number; numero: string; estado: string; fecha: string | null; total: ImporteOrigen;
    aprobado_por: string | null; aprobado_en: string | null } | null;
  cotizacion_estado: EstadoOrigen;
  recepcion: { fecha: string | null; responsable: string | null };
  salida: { origen_estado: EstadoOrigen; lineas_activas: number; lineas_almacen: number;
    lineas_despachadas: number; lineas_parciales: number; lineas_fuera_almacen: number; importes_ausentes: number;
    lineas: { id: number; cantidad_despachada: string | number }[] };
  lineas_cotizacion: LineaCotizacionOrigen[];
  pago: { imputado: ImporteOrigen; pendiente: ImporteOrigen; en_revision: ImporteOrigen } | null;
}
export const etiquetasOrigen: Record<EstadoOrigen,string> = {
  COMPLETO: "Registrado", PENDIENTE: "Pendiente", PARCIAL: "Parcial", NO_APLICA: "No aplica",
  ANULADO: "Anulado", REVISION: "Revisar origen",
};
const inactivas = new Set(["CAMBIADA", "RECHAZADO", "RETIRADA"]);
export function lineasVigentes(lineas: VPedidoLineaHermes[]) {
  return lineas.filter(l => !inactivas.has(l.estado));
}
export function cantidadDocumento(linea: { cantidad_base: string | number; cantidad_presentacion: string | number | null }) {
  return linea.cantidad_presentacion != null && Number(linea.cantidad_presentacion)>0
    ? linea.cantidad_presentacion : linea.cantidad_base;
}
export function resumenHitoOrigen(nombre: string, datos: OrigenExpediente): string {
  if (nombre === "Cotización") return datos.cotizacion
    ? `${datos.cotizacion.numero} · ${datos.cotizacion.estado.toLowerCase()}`
    : datos.cotizacion_estado === "NO_APLICA" ? "Este pedido no tiene cotización de origen."
      : "Revisa la cotización vinculada en Seller.";
  if (nombre === "Pedido") return `${datos.pedido.numero} · registrado en Seller`;
  const s=datos.salida;
  return s.lineas_almacen ? `${s.lineas_despachadas} de ${s.lineas_almacen} líneas de stock despachadas${s.lineas_parciales ? ` · ${s.lineas_parciales} parciales` : ""}.`
    : "Este pedido no requiere una salida de stock de almacén.";
}

/** Lógica pura de "Lo que nos piden" (Compras › demanda de clientes). */
import { hoyLocal } from "./fechas";

export type EstadoIdea = "ABIERTA" | "SEGUIR_MIRANDO" | "TRAER" | "DESCARTADA" | "LLEGO" | "UNIDA";
export type TipoIdea = "NO_LO_TENEMOS" | "SE_ACABO";
export type ViaCompra = "OC" | "EVENTUAL" | "IMPORTACION";
export type CanalDemanda = "TIENDA" | "MAYOR";
export type AccionDemanda = "TRAER" | "SEGUIR_MIRANDO" | "DESCARTAR" | "LLEGO" | "REABRIR";
export type FiltroDemanda = "TODO" | "POR_DECIDIR" | "NO_LO_TENEMOS" | "SE_ACABO";

export interface IdeaDemanda {
  idea_id: number;
  titulo: string;
  producto_id: number | null;
  tipo: TipoIdea;
  veces: number;
  cantidad_aprox: number | null;
  tienda: number;
  mayor: number;
  esperan_aviso: number;
  ultima: string;
  estado: EstadoIdea;
  via: ViaCompra | null;
  motivo: string | null;
  compra_solicitud_id: number | null;
}

export interface AnotacionDemanda {
  demanda_id: number;
  cantidad_aprox: number | null;
  unidad: string | null;
  canal: CanalDemanda;
  descripcion: string | null;
  anotado_por_nombre: string | null;
  anotado_por_rol: string | null;
  anotado_en: string;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  quiere_aviso: boolean;
  avisado_en: string | null;
  foto_path: string | null;
}

export interface SimilarDemanda {
  idea_id: number;
  titulo: string;
  anotaciones: number;
  parecido: number;
}

export const PARECIDO_MINIMO = 0.4;
export const POR_PAGINA = 20;

const VIA_ETIQUETA: Record<ViaCompra, string> = {
  OC: "Traer por OC",
  EVENTUAL: "Compra eventual",
  IMPORTACION: "Próxima importación",
};

export function etiquetaEstado(idea: Pick<IdeaDemanda, "estado" | "via" | "esperan_aviso">): string {
  switch (idea.estado) {
    case "ABIERTA": return "Por decidir";
    case "SEGUIR_MIRANDO": return "Seguir mirando";
    case "TRAER": return idea.via ? VIA_ETIQUETA[idea.via] : "Traer";
    case "DESCARTADA": return "Descartada";
    case "LLEGO": return idea.esperan_aviso > 0 ? `Llegó · avisar a ${idea.esperan_aviso}` : "Llegó";
    case "UNIDA": return "Unida";
  }
}

export const etiquetaTipo = (tipo: TipoIdea): string => (tipo === "SE_ACABO" ? "Se nos acabó" : "No lo tenemos");

export function detalleIdea(idea: Pick<IdeaDemanda, "esperan_aviso" | "tipo">): string {
  if (idea.esperan_aviso > 0) return `${idea.esperan_aviso} ${idea.esperan_aviso === 1 ? "cliente espera" : "clientes esperan"} aviso`;
  return idea.tipo === "SE_ACABO" ? "Producto del catálogo" : "Sin contacto";
}

export function aplicarFiltro(ideas: IdeaDemanda[], filtro: FiltroDemanda): IdeaDemanda[] {
  if (filtro === "TODO") return ideas;
  if (filtro === "POR_DECIDIR") return ideas.filter((i) => i.estado === "ABIERTA");
  return ideas.filter((i) => i.tipo === filtro);
}

export function contarFiltros(ideas: IdeaDemanda[]): Record<FiltroDemanda, number> {
  return {
    TODO: ideas.length,
    POR_DECIDIR: aplicarFiltro(ideas, "POR_DECIDIR").length,
    NO_LO_TENEMOS: aplicarFiltro(ideas, "NO_LO_TENEMOS").length,
    SE_ACABO: aplicarFiltro(ideas, "SE_ACABO").length,
  };
}

/** Ciclo del toggle de canal: todos → tienda → mayor → todos. */
export const siguienteCanal = (canal: CanalDemanda | null): CanalDemanda | null =>
  canal === null ? "TIENDA" : canal === "TIENDA" ? "MAYOR" : null;

const fechaLocal = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(d);
const hora = new Intl.DateTimeFormat("es-BO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/La_Paz" });

/** dd/MM de un instante, en America/La_Paz. */
export function diaMes(iso: string): string {
  const [, m, d] = fechaLocal(new Date(iso)).split("-");
  return `${d}/${m}`;
}

/** "hoy 10:12", "ayer" o dd/MM, en America/La_Paz. `hoy` se inyecta para pruebas. */
export function formatUltimaVez(iso: string, hoy: string = hoyLocal()): string {
  const fecha = new Date(iso);
  const dia = fechaLocal(fecha);
  if (dia === hoy) return `hoy ${hora.format(fecha)}`;
  const [a, m, d] = hoy.split("-").map(Number);
  const ayer = new Date(Date.UTC(a, m - 1, d - 1)).toISOString().slice(0, 10);
  return dia === ayer ? "ayer" : diaMes(iso);
}

/** Total aproximado pedido: la unidad común si todas coinciden; si no, "unidades varias". */
export function resumenUnidades(anotaciones: AnotacionDemanda[]): string {
  const conCantidad = anotaciones.filter((a) => a.cantidad_aprox != null);
  const total = conCantidad.reduce((s, a) => s + Number(a.cantidad_aprox), 0);
  const unidades = new Set(conCantidad.map((a) => (a.unidad ?? "").trim().toLowerCase()));
  if (unidades.size === 1 && conCantidad[0].unidad?.trim()) return `unas ${total} ${conCantidad[0].unidad.trim()}`;
  return `unas ${total} unidades varias`;
}

/** Link manual de WhatsApp. Solo se antepone 591 a números locales de 8 dígitos. */
export function enlaceWhatsApp(telefono: string, nombre: string, titulo: string): string | null {
  const digitos = telefono.replace(/\D/g, "");
  if (!digitos) return null;
  const numero = digitos.length === 8 ? `591${digitos}` : digitos;
  const texto = `Hola ${nombre}, te avisamos de Comercial ROARI: ya llegó ${titulo}.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export const porAvisar = (anotaciones: AnotacionDemanda[]): AnotacionDemanda[] =>
  anotaciones.filter((a) => a.quiere_aviso && !a.avisado_en);

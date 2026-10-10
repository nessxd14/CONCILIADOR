import Decimal from "decimal.js";
import type { VClienteCartera } from "./types";

export type SituacionFiltro =
  | "todos"
  | "deudores"
  | "al_dia"
  | "saldo_favor"
  | "vencidas"
  | "pagos_por_verificar"
  | "credito_sin_aplicar"
  | "deuda_sin_partida"
  | "plazo_sin_iniciar"
  | "inactivos";

export const SITUACION_FILTROS: { value: SituacionFiltro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "deudores", label: "Deudores" },
  { value: "al_dia", label: "Al día" },
  { value: "saldo_favor", label: "Saldo a favor" },
  { value: "vencidas", label: "Con partidas vencidas" },
  { value: "pagos_por_verificar", label: "Con pagos por verificar" },
  { value: "credito_sin_aplicar", label: "Crédito sin aplicar" },
  { value: "deuda_sin_partida", label: "Deuda sin partida" },
  { value: "plazo_sin_iniciar", label: "Plazo sin iniciar" },
  { value: "inactivos", label: "Inactivos" },
];

export type OrdenClientes =
  | "nombre_asc"
  | "nombre_desc"
  | "saldo_desc"
  | "saldo_asc"
  | "vencido_desc"
  | "proximo_vencimiento_asc"
  | "ultimo_movimiento_desc"
  | "ultimo_pago_desc";

export const ORDEN_OPCIONES: { value: OrdenClientes; label: string }[] = [
  { value: "nombre_asc", label: "Nombre A–Z" },
  { value: "nombre_desc", label: "Nombre Z–A" },
  { value: "saldo_desc", label: "Saldo: mayor a menor" },
  { value: "saldo_asc", label: "Saldo: menor a mayor" },
  { value: "vencido_desc", label: "Vencido: mayor a menor" },
  { value: "proximo_vencimiento_asc", label: "Próximo vencimiento" },
  { value: "ultimo_movimiento_desc", label: "Último movimiento" },
  { value: "ultimo_pago_desc", label: "Último pago" },
];

/** Cumple la condición de cada opción de situación. Todas, salvo "Inactivos", exigen activo === true. */
function cumpleSituacion(c: VClienteCartera, situacion: SituacionFiltro): boolean {
  if (situacion === "inactivos") return c.activo === false;
  if (!c.activo) return false;
  switch (situacion) {
    case "todos":
      return true;
    case "deudores":
      return new Decimal(c.saldo_confirmado).gt(0);
    case "al_dia":
      return new Decimal(c.saldo_confirmado).eq(0);
    case "saldo_favor":
      return new Decimal(c.saldo_confirmado).lt(0);
    case "vencidas":
      return c.partidas_vencidas > 0;
    case "pagos_por_verificar":
      return c.pagos_por_verificar > 0;
    case "credito_sin_aplicar":
      return c.partidas_abiertas > 0 && new Decimal(c.saldo_sin_partida).lt(0);
    case "deuda_sin_partida":
      return new Decimal(c.saldo_sin_partida).gt(0);
    case "plazo_sin_iniciar":
      return c.partidas_sin_fecha > 0;
    default:
      return true;
  }
}

/** NFD + strip de marcas de combinación: "José" y "jose" coinciden. */
function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("es");
}

export function filtrarClientes(
  clientes: VClienteCartera[],
  situacion: SituacionFiltro,
  busqueda: string
): VClienteCartera[] {
  const q = normalizarTexto(busqueda.trim());
  return clientes.filter((c) => {
    if (!cumpleSituacion(c, situacion)) return false;
    if (q && !normalizarTexto(c.cliente).includes(q)) return false;
    return true;
  });
}

/** Cuenta cuántos clientes cumplirían cada opción de situación, sin aplicar la búsqueda ni la situación actual. */
export function contarPorSituacion(clientes: VClienteCartera[]): Record<SituacionFiltro, number> {
  const conteos: Record<SituacionFiltro, number> = {
    todos: 0,
    deudores: 0,
    al_dia: 0,
    saldo_favor: 0,
    vencidas: 0,
    pagos_por_verificar: 0,
    credito_sin_aplicar: 0,
    deuda_sin_partida: 0,
    plazo_sin_iniciar: 0,
    inactivos: 0,
  };
  for (const situacion of Object.keys(conteos) as SituacionFiltro[]) {
    conteos[situacion] = clientes.filter((c) => cumpleSituacion(c, situacion)).length;
  }
  return conteos;
}

function compararNombreSolo(a: VClienteCartera, b: VClienteCartera): number {
  return a.cliente.localeCompare(b.cliente, "es", { sensitivity: "base" });
}

/** Tie-break genérico: nombre y luego cliente_id, siempre en el mismo sentido sin importar la columna u orden elegido. */
function compararNombre(a: VClienteCartera, b: VClienteCartera): number {
  return compararNombreSolo(a, b) || (a.cliente_id - b.cliente_id);
}

/** null siempre al final, sea ascendente o descendente la comparación de los valores presentes. */
function compararConNulls<T>(a: T | null, b: T | null, comparar: (a: T, b: T) => number): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return comparar(a, b);
}

function compararDecimal(a: string, b: string): number {
  return new Decimal(a).comparedTo(new Decimal(b));
}

function compararFecha(a: string, b: string): number {
  return Date.parse(a) - Date.parse(b);
}

const COMPARADORES: Record<OrdenClientes, (a: VClienteCartera, b: VClienteCartera) => number> = {
  nombre_asc: (a, b) => compararNombre(a, b),
  // El sentido se invierte solo para el nombre: el desempate por cliente_id
  // queda siempre ascendente, para que el orden sea estable entre refrescos.
  nombre_desc: (a, b) => -compararNombreSolo(a, b) || (a.cliente_id - b.cliente_id),
  saldo_desc: (a, b) => -compararDecimal(a.saldo_confirmado, b.saldo_confirmado) || compararNombre(a, b),
  saldo_asc: (a, b) => compararDecimal(a.saldo_confirmado, b.saldo_confirmado) || compararNombre(a, b),
  vencido_desc: (a, b) => -compararDecimal(a.monto_vencido, b.monto_vencido) || compararNombre(a, b),
  proximo_vencimiento_asc: (a, b) =>
    compararConNulls(a.proximo_vencimiento, b.proximo_vencimiento, compararFecha) || compararNombre(a, b),
  ultimo_movimiento_desc: (a, b) =>
    compararConNulls(a.ultimo_movimiento_en, b.ultimo_movimiento_en, (x, y) => -compararFecha(x, y)) ||
    compararNombre(a, b),
  ultimo_pago_desc: (a, b) =>
    compararConNulls(a.ultimo_pago_en, b.ultimo_pago_en, (x, y) => -compararFecha(x, y)) || compararNombre(a, b),
};

/** Siempre cae a nombre y luego cliente_id: el orden queda estable entre refrescos. */
export function ordenarClientes(clientes: VClienteCartera[], orden: OrdenClientes): VClienteCartera[] {
  return [...clientes].sort(COMPARADORES[orden] ?? COMPARADORES.nombre_asc);
}

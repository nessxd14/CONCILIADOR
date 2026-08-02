export type CategoriaCliente = "RETAIL" | "MAYORISTA" | "INSTITUCIONAL" | "CORPORATIVO";
export type SectorCliente = "PUBLICO" | "PRIVADO";
export type InicioComputo = "ENTREGA" | "FACTURA" | "CONTADO";
export type Situacion = "DEUDOR" | "AL_DIA" | "ACREEDOR";
export type TipoMovimiento =
  | "SALDO_APERTURA"
  | "CARGO"
  | "PAGO"
  | "ANTICIPO"
  | "NOTA_CREDITO"
  | "AJUSTE";

export interface Cliente {
  id: number;
  nombre: string;
  nit: string | null;
  categoria: CategoriaCliente;
  activo: boolean;
  sincronizado_en: string;
  importado_en: string | null;
}

export interface ClienteCredito {
  cliente_id: number;
  sector: SectorCliente;
  limite_credito: string | null;
  plazo_dias: number;
  inicio_computo: InicioComputo;
  actualizado_en: string;
  actualizado_por: string;
}

export interface VSaldoCliente {
  cliente_id: number;
  cliente: string;
  categoria: CategoriaCliente;
  saldo_confirmado: string;
  monto_en_revision: string;
  saldo_provisional: string;
  limite_credito: string | null;
  sector: SectorCliente;
  situacion: Situacion;
}

export interface VCobrosBloqueados {
  cliente_id: number;
  cliente: string;
  categoria: CategoriaCliente;
  partidas_bloqueadas: number;
  monto_bloqueado: string;
  dias_maximo: number;
}

export interface VMayorAuxiliar {
  id: number;
  cliente_id: number;
  cliente: string;
  tipo: TipoMovimiento;
  monto: string;
  saldo_corrido: string;
  partida_id: number | null;
  documento_interno: string | null;
  referencia: string | null;
  motivo: string | null;
  fecha_efectiva: string;
  creado_por: string;
  creado_en: string;
}

export type EstadoPartida = "ABIERTA" | "CANCELADA" | "ANULADA";
export type EstadoHito = "PENDIENTE" | "COMPLETO";
export type EstadoDocumento = "PENDIENTE" | "SUBIDO" | "APROBADO" | "RECHAZADO";
export type TipoDocumento = "HABILITANTE" | "ANEXO";

export interface PartidaAbierta {
  id: number;
  cliente_id: number;
  cliente_nombre: string;
  cliente_categoria: CategoriaCliente;
  pedido_id: number | null;
  venta_id: number | null;
  documento_interno: string;
  cuf: string | null;
  total: string;
  inicio_computo: InicioComputo;
  plazo_dias: number;
  fecha_entrega: string | null;
  fecha_factura: string | null;
  estado: EstadoPartida;
  documentado: boolean;
  referencia: string | null;
  creado_por: string;
  creado_en: string;
  anulada_en: string | null;
  anulada_por: string | null;
  motivo_anulacion: string | null;
}

export interface Hito {
  id: number;
  partida_abierta_id: number;
  hito_plantilla_id: number | null;
  orden: number;
  nombre: string;
  estado: EstadoHito;
  completado_en: string | null;
  completado_por: string | null;
  habilitantes_pendientes: number;
}

export interface Documento {
  id: number;
  hito_id: number;
  documento_plantilla_id: number | null;
  etiqueta: string;
  tipo: TipoDocumento;
  estado: EstadoDocumento;
  storage_path: string | null;
  subido_por: string | null;
  subido_en: string | null;
  revisado_por: string | null;
  revisado_en: string | null;
  notas: string | null;
}

export type MedioPago = "EFECTIVO" | "QR" | "DEPOSITO" | "TRANSFERENCIA" | "SIGEP" | "CHEQUE";

export interface PagoPropuesto {
  id: number;
  cliente_id: number;
  cliente: string;
  monto: string;
  medio: MedioPago;
  referencia: string | null;
  creado_por: string;
  creado_en: string;
}

export interface ClienteCation {
  id: number;
  nombre: string;
  razon_social: string | null;
  tipo_precio: string;
  documento: string | null;
  ciudad: string | null;
  activo: boolean;
  creado_en: string;
}

export interface ClienteCationPendiente extends ClienteCation {
  categoria_sugerida: CategoriaCliente | null;
}

const TIPO_PRECIO_A_CATEGORIA: Record<string, CategoriaCliente> = {
  retail: "RETAIL",
  mayorista: "MAYORISTA",
  corporativo: "CORPORATIVO",
  institucion: "INSTITUCIONAL",
};

/** Cation no tiene un valor libre: si no matchea un tipo_precio conocido, no hay categoría válida para asignar. */
export function categoriaDesdeTipoPrecio(tipoPrecio: string): CategoriaCliente | null {
  return TIPO_PRECIO_A_CATEGORIA[tipoPrecio.trim().toLowerCase()] ?? null;
}

/** sector_cliente no existe en Cation: default por regla de negocio, editable después a mano. */
export function sectorDesdeCategoria(categoria: CategoriaCliente): SectorCliente {
  return categoria === "INSTITUCIONAL" ? "PUBLICO" : "PRIVADO";
}

export const DEFAULTS_CREDITO_POR_CATEGORIA: Record<
  CategoriaCliente,
  { inicio_computo: InicioComputo; plazo_dias: number }
> = {
  RETAIL: { inicio_computo: "CONTADO", plazo_dias: 0 },
  MAYORISTA: { inicio_computo: "ENTREGA", plazo_dias: 30 },
  INSTITUCIONAL: { inicio_computo: "FACTURA", plazo_dias: 30 },
  CORPORATIVO: { inicio_computo: "FACTURA", plazo_dias: 30 },
};

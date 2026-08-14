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

export type MotivoBloqueo = "VENCIDA" | "ENTREGADO_SIN_FACTURAR" | "FRENADA";
export type AccionFrenada = "COBRAR" | "FACTURAR" | "FALTA_DOCUMENTO" | "LISTO_PARA_COMPLETAR";
export type DiasConcepto = "vencido" | "sin facturar" | "parado";

export interface VCobrosBloqueados {
  cliente_id: number;
  cliente: string;
  categoria: CategoriaCliente;
  partidas_bloqueadas: number;
  monto_bloqueado: string;
  dias_maximo: number;
  /** Valores de MotivoBloqueo separados por coma, uno por cada motivo presente entre las partidas del cliente. */
  motivos: string;
}

export interface VFrentePartida {
  partida_id: number;
  cliente_id: number;
  cliente: string;
  categoria: CategoriaCliente;
  documento_interno: string;
  pedido_id: number | null;
  hito_id: number | null;
  frente_orden: number | null;
  frente: string | null;
  frente_desde: string | null;
  dias_parado: number | null;
  habilitantes_faltantes: number;
  habilitantes_detalle: string | null;
}

export interface VPartidasFrenadas {
  partida_id: number;
  cliente_id: number;
  cliente: string;
  categoria: CategoriaCliente;
  documento_interno: string;
  pedido_id: number | null;
  frente: string | null;
  dias_parado: number | null;
  habilitantes_faltantes: number;
  habilitantes_detalle: string | null;
  saldo_partida: string;
  estado_reloj: string;
  fecha_vencimiento: string | null;
  motivo: MotivoBloqueo;
  dias: number;
  accion: AccionFrenada;
  dias_concepto: DiasConcepto;
}

export type MotivoPedidoPendiente =
  | "SIN_CLIENTE"
  | "CLIENTE_SIN_CUENTA"
  | "ABRE"
  | "SIN_TOTAL"
  | "SIN_FICHA_CREDITO"
  | "CATEGORIA_NO_ELEGIBLE"
  | "ESTADO_NO_ELEGIBLE"
  | "YA_TIENE_PARTIDA";

export interface VPedidoCationPendiente {
  pedido_id: number;
  pos_cliente_id: number | null;
  hermes_cliente_id: number | null;
  cliente: string | null;
  categoria: CategoriaCliente | null;
  estado: string;
  total: string | null;
  referencia: string | null;
  creado_en: string;
  motivo: MotivoPedidoPendiente;
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

export type EstadoPartida = "ABIERTA" | "CANCELADA" | "ANULADA" | "PAGADA";
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

export interface VPartidaEstado {
  partida_id: number;
  cliente_id: number;
  pedido_id: number | null;
  referencia: string | null;
  documento_interno: string;
  estado: EstadoPartida;
  total: string;
  creado_en: string;
  fecha_entrega: string | null;
  plazo_dias: number;
  imputado: string;
  pendiente: string;
  en_revision: string;
  hitos_obligatorios: number;
  hitos_cumplidos: number;
  proximo_hito: string | null;
  dias_abierta: number;
}

/** Brief T7 Tarea 1: pagos con saldo a favor sin imputar — v_anticipo_cliente ya
 * filtra por estado CONFIRMADO/ACREDITADO y saldo_favor > 0. */
export interface VAnticipoCliente {
  pago_id: number;
  cliente_id: number;
  monto: string;
  imputado: string;
  saldo_favor: string;
  no_imputar: boolean;
  medio: MedioPago;
  estado: string;
  referencia: string | null;
  fecha_recepcion: string;
  fecha_acreditacion: string | null;
  confirmado_en: string | null;
  evidencia_id: number | null;
  comprobante_path: string | null;
  comprobante_nombre: string | null;
  tiene_comprobante: boolean;
}

export interface Evidencia {
  id: number;
  storage_path: string;
  nombre_original: string;
  mime_type: string;
  tamano_bytes: number;
  hash_sha256: string | null;
  subido_por: string | null;
  subido_en: string;
  notas: string | null;
}

/** Brief T7 Tarea 3: cation_pedido es una foreign table hacia Cation — solo lectura,
 * nunca se escribe desde acá. */
export interface CationPedido {
  id: number;
  cliente_id: number | null;
  categoria: string;
  estado: string;
  referencia: string | null;
  total: string | null;
  creado_en: string;
  numero: string;
  cotizacion_origen_id: number | null;
}

export interface VCotizacionHermes {
  id: number;
  numero: string;
  cliente_id: number | null;
  referencia: string | null;
  asunto: string | null;
  estado: string;
  subtotal: string | null;
  descuento_general: string | null;
  total: string | null;
  fecha: string | null;
  vigencia_hasta: string | null;
  creado_en: string;
  aprobado_por: string | null;
  aprobado_en: string | null;
}

export interface VPedidoLineaHermes {
  id: number;
  pedido_id: number;
  producto_id: number | null;
  descripcion: string | null;
  es_personalizado: boolean;
  cantidad_base: string;
  cantidad_presentacion: string | null;
  cantidad_despachada: string | null;
  estado: string;
  precio_unitario: string;
  descuento_pct: string;
  subtotal: string;
  nota: string | null;
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

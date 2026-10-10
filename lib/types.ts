import type { EstadoOrigen, OrigenExpediente } from "./expediente-origen";
export type CategoriaCliente = "RETAIL" | "MAYORISTA" | "INSTITUCIONAL" | "CORPORATIVO";
export const CATEGORIAS_CONCILIADOR = ["MAYORISTA", "INSTITUCIONAL", "CORPORATIVO"] as const;
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

export interface VClienteCartera {
  cliente_id: number;
  cliente: string;
  nit: string | null;
  categoria: CategoriaCliente;
  activo: boolean;
  sector: SectorCliente;
  limite_credito: string | null;
  plazo_dias: number | null;
  inicio_computo: InicioComputo | null;
  saldo_confirmado: string;
  monto_en_revision: string;
  saldo_provisional: string;
  situacion: Situacion;
  partidas_abiertas: number;
  pendiente_partidas: string;
  saldo_sin_partida: string;
  partidas_vencidas: number;
  monto_vencido: string;
  dias_vencido_max: number | null;
  proximo_vencimiento: string | null;
  partidas_sin_fecha: number;
  monto_sin_fecha: string;
  pagos_por_verificar: number;
  ultimo_pago_en: string | null;
  ultimo_movimiento_en: string | null;
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
  parent_partida_id: number | null;
  partida_raiz_id: number;
  entrega_numero: number;
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
  origen_sistema?: "SELLER" | "ALMACEN" | null;
  origen_estado?: EstadoOrigen | null;
  origen_datos?: OrigenExpediente;
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
export type EstadoPago = "PROPUESTO" | "CONFIRMADO" | "ACREDITADO" | "RECHAZADO" | "ANULADO";

export interface VAnticipoCliente {
  pago_id: number;
  cliente_id: number;
  monto: string;
  imputado: string;
  saldo_favor: string;
  no_imputar: boolean;
  medio: MedioPago;
  estado: EstadoPago;
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
  subido_por: string;
  subido_en: string;
  notas: string | null;
}

export interface VCotizacionHermes {
  id: number;
  numero: string;
  cliente_id: number | null;
  referencia: string | null;
  asunto: string | null;
  estado: string;
  subtotal: string;
  descuento_general: string;
  total: string;
  fecha: string;
  vigencia_hasta: string | null;
  creado_en: string;
  aprobado_por: string | null;
  aprobado_en: string | null;
}

export interface VPedidoLineaHermes {
  id: number;
  pedido_id: number;
  producto_id: number | null;
  descripcion: string;
  es_personalizado: boolean;
  cantidad_base: string | number;
  cantidad_presentacion: string | number | null;
  cantidad_despachada: string | number | null;
  estado: string;
  precio_unitario: string | number | null;
  descuento_pct: string;
  subtotal: string | number | null;
  nota: string | null;
}

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

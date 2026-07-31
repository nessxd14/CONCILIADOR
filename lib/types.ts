export type CategoriaCliente = "RETAIL" | "MAYORISTA" | "MUNICIPAL" | "CORPORATIVO";
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

export const DEFAULTS_CREDITO_POR_CATEGORIA: Record<
  CategoriaCliente,
  { inicio_computo: InicioComputo; plazo_dias: number }
> = {
  RETAIL: { inicio_computo: "CONTADO", plazo_dias: 0 },
  MAYORISTA: { inicio_computo: "ENTREGA", plazo_dias: 30 },
  MUNICIPAL: { inicio_computo: "FACTURA", plazo_dias: 30 },
  CORPORATIVO: { inicio_computo: "FACTURA", plazo_dias: 30 },
};

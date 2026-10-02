import type { DashboardData } from "@/components/Dashboard";
import type { Cliente, ClienteCredito, VSaldoCliente, VMayorAuxiliar, VPartidaEstado, VAnticipoCliente, VPartidasFrenadas } from "@/lib/types";

// Synthetic fixtures: never sourced from a customer's financial records.
export const clientes: VSaldoCliente[] = [
  [1, "Comercial Altiplano", "MAYORISTA", "28450.00", "1500.00", "DEUDOR"],
  [2, "Distribuidora del Sur", "CORPORATIVO", "12800.50", "0", "DEUDOR"],
  [3, "Instituto Nueva Esperanza", "INSTITUCIONAL", "6400.00", "800.00", "DEUDOR"],
  [4, "Papelería Central", "RETAIL", "-2200.00", "0", "ACREEDOR"],
  [5, "Corporación Horizonte", "CORPORATIVO", "18500.00", "0", "DEUDOR"],
  [6, "Librería San Miguel", "MAYORISTA", "0.00", "0", "AL_DIA"],
  [7, "Colegio Los Olivos", "INSTITUCIONAL", "9750.00", "300.00", "DEUDOR"],
  [8, "Suministros del Norte", "MAYORISTA", "-1350.00", "0", "ACREEDOR"],
].map(([id, name, category, balance, review, status]) => ({ cliente_id: Number(id), cliente: String(name), categoria: category as VSaldoCliente["categoria"], saldo_confirmado: String(balance), saldo_provisional: String(balance), monto_en_revision: String(review), limite_credito: "50000", sector: "PRIVADO", situacion: status as VSaldoCliente["situacion"] }));

export const dashboardFixture: DashboardData = {
  saldos: clientes, cargando: false, error: null, errorSaldos: null, errorPagos: null, puedeConfirmar: true, actualizado: null,
  bloqueados: [
    { cliente_id: 1, cliente: "Comercial Altiplano", categoria: "MAYORISTA", partidas_bloqueadas: 2, monto_bloqueado: "6400", dias_maximo: 12, motivos: "VENCIDA" },
    { cliente_id: 3, cliente: "Instituto Nueva Esperanza", categoria: "INSTITUCIONAL", partidas_bloqueadas: 1, monto_bloqueado: "3200", dias_maximo: 5, motivos: "ENTREGADO_SIN_FACTURAR" },
  ],
  pagos: [{ id: 1, cliente_id: 1, cliente: "Comercial Altiplano", monto: "1500", medio: "TRANSFERENCIA", referencia: "Ejemplo 001", creado_por: "pos:administracion", creado_en: "2026-10-01T12:00:00Z" }],
};

export type ClientFixture = {
  cliente: Cliente; credito: ClienteCredito; saldo: VSaldoCliente;
  movimientos: VMayorAuxiliar[]; partidas: VPartidaEstado[]; anticipos: VAnticipoCliente[]; frenadas: VPartidasFrenadas[];
};
export const clientFixture: ClientFixture = {
  cliente: { id: 1, nombre: "Comercial Altiplano", nit: "Ejemplo · sin NIT real", categoria: "MAYORISTA", activo: true, sincronizado_en: "2026-10-01", importado_en: "2026-08-01" },
  credito: { cliente_id: 1, sector: "PRIVADO", limite_credito: "50000", plazo_dias: 30, inicio_computo: "ENTREGA", actualizado_en: "2026-10-01", actualizado_por: "ejemplo" },
  saldo: { ...clientes[0], saldo_provisional: "26950.00" },
  movimientos: [
    { id: 1, cliente_id: 1, cliente: "Comercial Altiplano", tipo: "SALDO_APERTURA", monto: "24000", saldo_corrido: "24000", partida_id: null, documento_interno: null, referencia: null, motivo: "Saldo inicial", fecha_efectiva: "2026-08-01", creado_por: "ejemplo", creado_en: "2026-08-01" },
    { id: 2, cliente_id: 1, cliente: "Comercial Altiplano", tipo: "CARGO", monto: "8900", saldo_corrido: "32900", partida_id: 1, documento_interno: "PED-001", referencia: null, motivo: "Pedido de suministros", fecha_efectiva: "2026-09-02", creado_por: "ejemplo", creado_en: "2026-09-02" },
    { id: 3, cliente_id: 1, cliente: "Comercial Altiplano", tipo: "PAGO", monto: "-4450", saldo_corrido: "28450", partida_id: 1, documento_interno: "PED-001", referencia: "Ejemplo 002", motivo: "Transferencia confirmada", fecha_efectiva: "2026-09-12", creado_por: "ejemplo", creado_en: "2026-09-12" },
  ],
  partidas: [
    { partida_id: 1, cliente_id: 1, pedido_id: 1, referencia: "Pedido de suministros", documento_interno: "PED-001", estado: "ABIERTA", total: "8900", creado_en: "2026-09-02", fecha_entrega: "2026-09-04", plazo_dias: 30, imputado: "4450", pendiente: "4450", en_revision: "1500", hitos_obligatorios: 4, hitos_cumplidos: 2, proximo_hito: "Factura", dias_abierta: 29 },
    { partida_id: 2, cliente_id: 1, pedido_id: 2, referencia: "Material de oficina", documento_interno: "PED-002", estado: "PAGADA", total: "3200", creado_en: "2026-08-15", fecha_entrega: "2026-08-20", plazo_dias: 30, imputado: "3200", pendiente: "0", en_revision: "0", hitos_obligatorios: 4, hitos_cumplidos: 4, proximo_hito: null, dias_abierta: 15 },
  ],
  anticipos: [{ pago_id: 3, cliente_id: 1, monto: "3000", imputado: "1000", saldo_favor: "2000", no_imputar: false, medio: "TRANSFERENCIA", estado: "CONFIRMADO", referencia: "Ejemplo de anticipo", fecha_recepcion: "2026-09-10", fecha_acreditacion: "2026-09-10", confirmado_en: "2026-09-10", evidencia_id: null, comprobante_path: null, comprobante_nombre: null, tiene_comprobante: false }],
  frenadas: [{ partida_id: 1, cliente_id: 1, cliente: "Comercial Altiplano", categoria: "MAYORISTA", documento_interno: "PED-001", pedido_id: 1, frente: "Facturación", dias_parado: 5, habilitantes_faltantes: 1, habilitantes_detalle: "Factura", saldo_partida: "4450", estado_reloj: "EN_ESPERA", fecha_vencimiento: null, motivo: "ENTREGADO_SIN_FACTURAR", dias: 5, accion: "FACTURAR", dias_concepto: "sin facturar" }],
};

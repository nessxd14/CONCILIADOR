import type { VMayorAuxiliar } from "@/lib/types";
import type { ClienteMayor } from "@/lib/mayor-cartera";

export const clientesMayorEjemplo: ClienteMayor[] = [
  { id: 1, nombre: 'Distribuidora Norte · ejemplo', categoria: 'MAYORISTA' },
  { id: 2, nombre: 'Institución Central · ejemplo', categoria: 'INSTITUCIONAL' },
  { id: 3, nombre: 'Comercial del Sur · ejemplo', categoria: 'CORPORATIVO' },
];
function fila(id: number, clienteId: number, tipo: VMayorAuxiliar['tipo'], monto: string, dia: string, motivo: string): VMayorAuxiliar {
  return { id, cliente_id: clienteId, cliente: clientesMayorEjemplo.find(c => c.id === clienteId)!.nombre,
    tipo, monto, saldo_corrido: '0.00', fecha_efectiva: dia, creado_en: `${dia}T15:00:00Z`, creado_por: 'Operadora de ejemplo',
    partida_id: id + 100, documento_interno: `PART-EJ-${id}`, referencia: `EJ-${id}`, motivo };
}
export const movimientosMayorEjemplo: VMayorAuxiliar[] = [
  fila(1, 1, 'SALDO_APERTURA', '12000.00', '2026-09-30', 'Deuda anterior al período.'),
  fila(2, 2, 'SALDO_APERTURA', '8000.00', '2026-09-30', 'Cuenta pendiente del período anterior.'),
  fila(3, 3, 'ANTICIPO', '-2000.00', '2026-09-30', 'Anticipo disponible, separado de la deuda de otros clientes.'),
  fila(4, 1, 'CARGO', '4500.00', '2026-10-01', 'Apertura de una nueva partida.'),
  fila(5, 1, 'PAGO', '-6000.00', '2026-10-02', 'Pago verificado y aplicado a la cuenta.'),
  fila(6, 2, 'PAGO', '-8000.00', '2026-10-03', 'La cuenta queda saldada y conserva todo su historial.'),
  fila(7, 3, 'CARGO', '3500.00', '2026-10-04', 'Bs 2.000 cubiertos por el anticipo; solo Bs 1.500 aumentan la deuda.'),
  fila(8, 1, 'NOTA_CREDITO', '-1500.00', '2026-10-05', 'Reducción del remanente cancelado. No es una devolución bancaria.'),
  fila(9, 3, 'PAGO', '-2000.00', '2026-10-06', 'Cubre Bs 1.500 de deuda y genera Bs 500 de saldo a favor.'),
  fila(10, 1, 'AJUSTE', '500.00', '2026-10-07', 'Corrección autorizada de la cuenta.'),
];

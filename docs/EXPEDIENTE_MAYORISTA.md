# Expediente mayorista desde Seller y almacén

La primera etapa deriva Cotización, Pedido y Salida de almacén del origen para partidas raíz MAYORISTA abiertas con pedido. Las categorías institucional/corporativa, expedientes cerrados y partidas hijas conservan su alcance anterior.

| Etapa | Criterio |
|---|---|
| Cotización | Vínculo con el mismo cliente, aprobada o convertida. Sin origen: No aplica. Vínculo inválido: revisión. |
| Pedido | Vigente, con cliente, importe positivo y líneas activas. |
| Salida de almacén | Despachos menos reversiones completas/parciales; contador de línea como respaldo histórico cuando no hay eventos. |

Las líneas sustituidas, rechazadas o retiradas se muestran como historial. Compras directas y especiales se distinguen del stock; no demuestran recepción del cliente.

Los documentos estándar de pedido y salida se tratan como anexos opcionales. Los requisitos habilitantes adicionales conservan su revisión; no se eliminan globalmente los controles documentales. La procedencia automática se protege en el backend y no puede sobrescribirse desde la interfaz.

## Consulta

La interfaz muestra cotización/pedido con cliente, cantidades comerciales, importes disponibles y total de Seller. Se puede imprimir la consulta, pero no constituye una copia inmutable de un documento emitido. Los importes ausentes siguen visibles como Sin registrar.

Una fecha heredada de entrega y el despacho de almacén se distinguen de la recepción explícita del cliente. El expediente conserva sus fechas originales; no las reemplaza por la fecha de consulta.

## Pago registrado y verificación

- Si las propuestas asignadas cubren exactamente el saldo: **Pago registrado — solo falta verificarlo**.
- Si el adelanto es parcial: importe registrado, importe por verificar y cantidad sin pago registrado separados.
- Si las propuestas superan la deuda: **Revisar reparto**.
- Confirmado/aplicado y saldo contable siguen visibles. Los importes desconocidos no se convierten en cero.

Esta presentación no confirma pagos, modifica aplicaciones ni completa el hito Pago en la base. La automatización persistente desde confirmaciones válidas y el enlace de la recepción física siguen pendientes.

## Implementación

- `lib/expediente-origen.ts` y `components/ExpedienteOrigen.tsx`: consulta del origen y documentos.
- `lib/pago-estado.ts` y `components/ResumenPagoPartida.tsx`: resumen de lectura con Decimal.
- `app/(app)/clientes/[id]/expediente/[partidaId]/page.tsx`: expediente, documentos y actualización sin interrumpir formularios/modales.
- `components/ClientDetail.tsx`: saldo contable, provisional y pagos por verificar.

Las pruebas de frontend cubren cantidades comerciales, separación de historial, pagos totales/parciales por verificar, reparto excedido, importes desconocidos y conservación del saldo contable. Las pruebas aisladas del backend de Seller cubren eventos, reversiones, acceso y protección del origen.

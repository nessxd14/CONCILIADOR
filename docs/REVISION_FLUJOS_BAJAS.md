# Revisión de flujos de bajas

13 de octubre de 2026. Base de Hermes: `707776f`; validación de código y PostgreSQL aislado, con datos sintéticos. La migración se aplicó posteriormente al proyecto remoto con autorización del usuario. Las nuevas RPC están disponibles y se verificaron sus permisos; sigue pendiente un recorrido con sesión real.

## Resultado local

| Flujo | Resultado verificado |
|---|---|
| Cancelar pedido sin pagos ni entrega | Seller y las partidas se cancelan conjuntamente, con nota de crédito, motivo, nombre e ID del usuario |
| Repetir cancelación | Conserva la baja y evita duplicar créditos/eventos |
| Baja manual de partida sin pedido | Exige permiso y motivo; revierte el cargo y conserva la identidad de sesión |
| Baja vinculada a pedido o venta vigente | Solicita resolver la operación de origen; no cancela solo la deuda |
| Rechazo individual/masivo en almacén | Motivo y autor registrados; no produce automáticamente una baja ni una entrega |
| Entrega parcial o reversión incompleta | Bloquea cancelación; conserva cantidades y deuda para revisión |
| Despacho totalmente revertido | No lo considera una entrega vigente; siguen aplicándose las comprobaciones de recepción, factura y pagos |
| Propuesta o pago confirmado aplicado | Bloquea baja para resolver el destino del dinero |
| Nuevo cobro después de cancelar | Bloquea la inserción y conserva los totales de caja |
| Reintentar un cobro existente | Devuelve su movimiento original, incluso en un caso histórico cancelado; no duplica dinero |
| Propuesta histórica de pedido cancelado | Bloquea confirmación/acreditación; mantiene el pago propuesto sin abonar una deuda inválida |
| Baja de raíz con hijas | Se realiza completa o se revierte completa si una hija no permite la baja |
| Partida pagada con documentos pendientes | Conserva su gestión documental; las fechas siguen la regla existente de partidas abiertas |
| Expediente anulado/cancelado | Hitos y documentos quedan para consulta; la base también impide modificaciones directas |
| Restaurar pedido con deuda ya anulada | Bloquea la reapertura automática y pide revisión o un nuevo pedido |
| Alterar autor/motivo o borrar evento | Bloquea la modificación del historial de bajas y rechazos |
| Falta la migración | Las interfaces explican que la operación no está habilitada, sin usar silenciosamente la RPC antigua |

## Correcciones de esta revisión

Se reprodujeron y corrigieron tres huecos: caja aceptaba cobros después de cancelar; las RPC documentales podían modificar expedientes anulados; y una propuesta histórica podía confirmarse sobre una partida abierta cuyo pedido ya estaba cancelado. Las validaciones se añadieron a la base, además de adaptar los controles de Hermes al estado del origen.

## Evidencia y pendientes

Pasaron las 108 pruebas de Hermes, 595 pruebas de Seller (7 omitidas), seis pruebas de rechazo de Almacén, la suite completa de integración financiera aislada y las tres compilaciones. Seller y Almacén se actualizaron a `bcf37b2` y `39ebe43` antes de la validación final. Las pruebas cubren transacciones, errores, permisos y conservación de saldos; PGlite no sustituye una prueba de concurrencia de múltiples conexiones ni un entorno Supabase con todos sus servicios.

Tras la activación autorizada, las seis nuevas RPC se comprobaron por API y rechazaron llamadas sin sesión; una comprobación SQL adicional verificó la misma regla bajo el rol `authenticated` sin identidad. La instalación conservó los agregados de la cartera y no anuló partidas reales. Véase `ACTIVACION_BAJAS.md`.

Siguen pendientes los recorridos con sesiones de Seller, Almacén y Hermes, así como confirmar pago contra cancelar y rechazar contra despachar en un entorno de pruebas. Los casos históricos reales, las devoluciones, la reasignación de pagos y la reapertura de deuda necesitan resolución específica; esta implementación no decide esas operaciones automáticamente.

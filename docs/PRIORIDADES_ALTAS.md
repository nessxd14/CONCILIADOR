# Prioridades altas: incidencias y resolución comercial/financiera

Desarrollo solicitado el 13 de octubre de 2026. El usuario pidió elegir en cada caso entre saldo a favor, reasignación y devolución. La migración se activó el 17 de octubre (America/La_Paz) tras autorizar explícitamente completar los cuatro puntos de la entrega integrada.

## Operaciones

- Bandeja de incidencias con pedido, cliente, motivo, importe y enlace al expediente. Incluye cancelaciones históricas con cartera activa, rechazos pendientes de resolución y repartos superiores al importe de la partida. La búsqueda permite abrir otro pedido del mismo sistema para gestionar una cancelación solicitada.
- Cancelar y resolver el pedido: valida que no haya entrega vigente, recepción o factura que requiera otro proceso; coordina todas sus partidas y pagos. El usuario elige saldo a favor, reasignación a una partida vigente del mismo cliente o registro de devolución realizada.
- Cancelar el remanente de líneas: admite una cantidad explícita que no supere lo pendiente real después de reversiones. Conserva lo despachado y registra las cantidades anteriores y nuevas. La reducción aplica el descuento general proporcionalmente y se refleja en las partidas mediante créditos vinculados.

## Dinero e historial

El pago y cobro original no se borran. Las aplicaciones anteriores se conservan en un registro de resolución inmutable, y los cambios de clasificación usan movimientos compensatorios. Una propuesta requiere que gerencia confirme que se recibió el dinero. La devolución requiere confirmación de que ya se realizó, referencia y turno abierto; se registra una salida de caja y la compensación contable. La aplicación no ejecuta una transferencia bancaria.

El importe a resolver se calcula nuevamente en servidor. El saldo consumido en otra operación no vuelve a estar disponible. La reasignación se limita al mismo cliente y a una partida con deuda vigente sin excederla. Una devolución parcial reduce el importe disponible del pago, sin cambiar el importe original.

Todas las acciones requieren admin/gerente con acceso a Hermes, motivo e identidad de sesión. La consulta contempla los demás roles autorizados de Hermes. Las operaciones son atómicas, comparan la versión revisada por el usuario y usan claves de idempotencia; un reintento no repite créditos ni salidas de dinero. La bandeja pagina en servidor y no presenta un subtotal como si fuera el conjunto completo.

Las partidas que tienen entrega registrada conservan su importe durante un ajuste parcial; la reducción se distribuye entre las restantes. Si no existe una separación suficiente del remanente, la operación solicita revisar esa separación. Las reducciones de deuda quedan excluidas de las fuentes de saldo utilizables, para no duplicar el anticipo liberado. Las devoluciones conservan el pago recibido y registran cuánto se devolvió; el crédito se consume una sola vez.

Si el pedido se pagó con saldo a favor existente, su cancelación restaura ese uso en la cuenta. Esa fuente puede incluir apertura o ajustes sin pago identificable; la devolución o reasignación de ese crédito exige una revisión separada. Los ajustes parciales con saldo aplicado se bloquean hasta resolver dicho uso. La interfaz muestra esta condición antes de confirmar.

La recepción física/devolución de productos y las facturas emitidas siguen sus controles específicos. Este flujo cancela cantidades no entregadas; no inventa entradas de inventario ni corrige una factura fiscal.

## Validación prevista

Pasaron las pruebas de PostgreSQL aislado de la suite financiera completa. Incluyen cancelación con saldo, propuesta verificada y reasignación, devolución completa/parcial, rechazo sin recepción verificada, turno cerrado o sin efectivo, hijo con raíz entregada, descuento proporcional, restauración del saldo aplicado, bloqueo de factura/entrega, conservación de saldos y fuentes, rollback, idempotencia y permisos.

Pasaron 117 pruebas de Hermes, incluidas nueve nuevas de incidencias: revisión previa, tres elecciones, escrituras deshabilitadas en preview, rol de consulta, error del servidor, misma clave al reintentar, respuesta tardía, cálculos de remanente/descuento y revisión obligatoria de la recepción al actualizar datos. Se compilaron Hermes, Seller y Almacén. Se verificó la pantalla con ejemplos a 1440 × 1000 y 390 × 844: saldo, devolución y remanente parcial navegables, sin errores de navegador ni desbordamiento horizontal.

Vista previa: `http://127.0.0.1:3024/vista-previa/incidencias`, en una copia aislada de desarrollo; datos sintéticos y confirmación real deshabilitada. Ruta real: `/incidencias`; admite `?pedido=<id>` para revisar directamente un pedido.

Migración instalada en el proyecto compartido `zxoxougwgstrarwymlvd`: `20261018000223_hermes_incidencias_resolucion.sql`. La bandeja y sus acciones están habilitadas con sus permisos. No se ejecutaron devoluciones, cancelaciones o ajustes sobre registros reales durante la instalación. El archivo local se alineó con la versión asignada por Supabase.

La entrega integrada también pasó la suite financiera en PostgreSQL 17 nativo con perfiles sintéticos y conexiones independientes: doble liquidación, cancelación frente a liquidación y reintento de resolución. Se verificó la lectura de la bandeja remota con rol SQL authenticated y un gerente activo. No se hicieron operaciones financieras de prueba sobre clientes reales. Ver `CIERRE_COBROS_COMISIONES.md`.

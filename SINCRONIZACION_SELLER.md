# Clientes y pedidos automáticos desde Seller

Aplicado a la base compartida Cation el 3 de octubre de 2026. Seller local se actualizó hasta `origin/main` en `7f78b4f` antes de implementar este ajuste. Las mejoras de Caja y VTD de esa versión se conservan.

## Flujo

1. Al guardar un cliente activo en Seller, se crea o actualiza su cuenta del conciliador si `tipo_precio` es `mayorista`, `institucion` o `corporativo`.
2. El vínculo usa `pos_cliente_id`. No depende de que el ID interno de Hermes coincida con el de Seller. Se conserva la ficha de crédito ya configurada; solo las cuentas nuevas reciben los valores iniciales habituales.
3. Al terminar la transacción que guarda un pedido, se comprueba su cliente, estado e importe definitivo. Los pedidos ABIERTO o COMPLETADO con importe positivo abren su partida automáticamente, con el mismo criterio contable que la importación anterior: apertura de partida y cargo por el total.
4. El cliente y su crédito quedan vinculados antes de abrir la partida. Reintentos y finalización del pedido reutilizan esa partida. Un pedido sin cliente o sin precio se vincula cuando se completan esos datos.
5. Clientes, Mi día, ficha y expediente consultan los cambios cada 15 segundos mientras la pestaña esté visible. Los formularios del expediente, notas sin guardar y cargas de archivos suspenden la actualización. La ficha conserva la consulta de movimientos paginados hasta que se actualice manualmente.

La categoría se toma del cliente de Seller, no del canal de venta del pedido. Un pedido MAYOR a nombre de un cliente retail queda fuera. No se importan retail a través del evento de cliente ni del evento de pedido; tampoco aparecen en los listados e importaciones del conciliador. Las cuentas retail anteriores se conservan como historial, sin borrarlas.

Los pedidos cancelados y los importes incompletos no abren partidas. Modificar un pedido que ya tiene partidas no reescribe sus importes contables ni anula movimientos anteriores: siguen aplicando los procedimientos existentes para ajustes y anulaciones.

## Cobros y compatibilidad

Seller actualizado utiliza `public.registrar_cobro_cation`. Los cobros de las tres categorías mantienen el registro atómico en caja y el pago PROPUESTO en Hermes. La verificación del pago continúa siendo una acción autorizada posterior. Un cobro retail se registra solo en Seller y devuelve expresamente `excluidoRetail: true`; no crea una cuenta ni un pago en Hermes.

Se conserva `public.registrar_cobro_hermes` con su contrato anterior para las versiones de Seller que continúen abiertas. Los reintentos de cobros existentes siguen funcionando. Esa compatibilidad conserva el comportamiento anterior de cobros retail de clientes antiguos hasta actualizar su frontend; la exclusión de clientes y pedidos por eventos ya está activa para todos.

Las funciones de eventos y el núcleo de cobros son privados. La nueva RPC exige un operador activo admin, gerente o cajero, valida la caja abierta, conserva una clave de idempotencia y revierte la operación completa ante errores. `anon` no puede ejecutarla. El aviso de Supabase por una [RPC SECURITY DEFINER disponible a usuarios autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) es esperado y está cubierto por esos controles; los ayudantes internos no son ejecutables por authenticated.

## Instalación y estado anterior

Migraciones de Seller: `supabase/migrations/20261003213326_hermes_clientes_pedidos_automaticos.sql` y `20261003214031_hermes_vistas_sincronizacion_invocador.sql`. Los archivos se generaron con la CLI y se alinearon con las versiones registradas por Supabase. La segunda conserva `security_invoker=true` en las vistas de pendientes y evita que el listado necesite ejecutar una función de clasificación privada. La revisión final no incorpora avisos nuevos por vistas SECURITY DEFINER.

La instalación no abrió partidas de pedidos anteriores ni creó movimientos financieros. Se comprobaron los conteos de clientes, partidas, pagos y movimientos, así como la suma contable, antes y después. El respaldo de definiciones y esa comprobación permanecen en `.sync-backup.local` en Seller, excluido de Git.

Al verificar la instalación había cero clientes activos elegibles sin vínculo, cero retail pendientes de importar y un pedido anterior con motivo ABRE: PED-2026-00612 (697), creado antes de activar el evento. La pantalla «Pedidos pendientes» conserva la recuperación de pedidos anteriores como acción explícita. Los nuevos pedidos ya no requieren esa recuperación.

## Validación

- PostgreSQL aislado con PGlite: las tres categorías, creación por cajero, cliente antes que pedido, ID coincidente con cuenta manual, cabecera incompleta, total definitivo y descuento de la RPC real `crear_pedido`, cancelación dentro de la transacción, errores con rollback, idempotencia, preservación del crédito y exclusión retail.
- Se mantienen las pruebas de pagos, entregas, comprobantes, procedencia mayorista y permisos privados.
- Se prueba la consulta cada 15 segundos, la suspensión en pestaña oculta, la pausa al deshabilitar la actualización, la ausencia de consultas simultáneas y el reintento después de un error.
- Compilaciones de Seller y Conciliador, pruebas y lint de Seller satisfactorios.

La base ya tiene la automatización. Los cambios de interfaz están en las carpetas locales; requieren publicar los respectivos frontends para verse en sus URLs remotas.

## Nota — 2026-10-09

Las pantallas «Pedidos pendientes» y «Revisar clientes pendientes», y la acción manual de recuperación de pedidos anteriores, se retiraron del Conciliador: la sincronización automática descrita arriba ya cubre ese flujo (0 clientes y 0 pedidos pendientes desde el 3 de octubre). El resto de este documento describe la base compartida tal como quedó aplicada y sigue vigente.

# Bajas e historial — implementación local

13 de octubre de 2026. Cambios preparados en los tres repositorios. La migración se aplicó al proyecto Supabase compartido con autorización del usuario y quedó registrada como `20261013155427_hermes_bajas_trazabilidad`. Las interfaces se publican en ramas para revisión; aplicar la base no despliega sus interfaces.

La copia de Hermes se actualizó de `9093087` al main actual `707776f` (PR #26 del 9 de octubre). Los cambios locales de bajas se respaldaron y reaplicaron sin conflictos. Se conservan los filtros y orden de Clientes, las pestañas de actividad de Mi día y la retirada de las pantallas de sincronización manual. La integración se valida nuevamente sobre esta base.

## Hermes

- Ficha del cliente → Partidas → **Bajas e historial**, accesible incluso cuando no quedan partidas abiertas o pagadas. Consulta anuladas/canceladas paginando la tabla existente y muestra motivo, usuario, fecha e importe original.
- Cuenta corriente muestra el autor; la búsqueda de movimientos también lo incluye.
- Expediente muestra la baja y un historial de Seller/Almacén/Hermes para todas las categorías y partidas hijas. Advierte si el pedido está cancelado y la partida permanece abierta/pagada.
- Los controles de edición del expediente se ocultan en partidas dadas de baja. Las partidas pagadas conservan su gestión documental.
- La anulación manual llama a la nueva RPC `anular_partida_auditada`; si falta la actualización del backend, falla explícitamente sin utilizar la operación antigua.
- Preview sintética: `/vista-previa/historial`, únicamente en desarrollo con `HERMES_UI_PREVIEW=1`. La ficha de ejemplo también contiene una baja.

## Seller y base compartida

Migración aplicada y fuente versionada: `D:\Proyectos\pos-cation\supabase\migrations\20261013155427_hermes_bajas_trazabilidad.sql`. El archivo se alineó con la versión asignada por Supabase al aplicar la migración.

- Autor tomado del perfil activo de la sesión, con nombre e ID estable. Los argumentos de autor heredados no determinan la identidad.
- Motivo obligatorio en anulaciones y rechazos. Los nuevos eventos identifican el sistema y, para rechazo individual, la línea.
- Los eventos de cancelación, restauración y rechazo se crean mediante sus operaciones autorizadas. Sus motivos y responsables se conservan; una corrección debe quedar como una nueva operación.
- Cancelación coordinada de pedido y partidas: revierte cargos sin duplicarlos y restaura usos de saldo a favor, conservando el motivo. Se ejecuta de forma atómica.
- Bloquea cancelación/baja con pagos propuestos o confirmados, cobros de caja, entregas, facturas o ajustes previos que requieren revisión. La función no decide una devolución ni reasigna dinero automáticamente.
- Impide registrar cobros nuevos sobre un pedido cancelado, incluyendo inserciones de caja que no pasen por la interfaz. Los reintentos de cobros ya registrados conservan su resultado y no crean dinero adicional.
- Las propuestas históricas relacionadas con pedidos cancelados no pueden confirmarse ni acreditarse mientras siga sin resolverse su destino. Una confirmación bloqueada revierte también los repartos/abonos que hubiese intentado generar la operación.
- Las partidas de pedidos vigentes se cancelan desde Seller. La baja manual de Hermes queda para partidas sin pedido o revisión de pedidos ya cancelados, bajo las mismas comprobaciones.
- La restauración no reactiva deuda dada de baja: se bloquea ese caso y explica la necesidad de revisión o de un nuevo pedido. La restauración de pedidos sin baja contable mantiene su flujo.
- Rechazar todas las líneas deja ABIERTO para resolución, sin inferir entrega. La sincronización de fechas exige evidencia de despacho y no avanza con líneas rechazadas pendientes de resolución.
- Una operación que termina con entregas y rechazos conserva su estado operativo, pero no genera una fecha de entrega completa ni se marca falsamente como sincronizada. Los reintentos distinguen entrega ya registrada de entrega no verificable.
- Las comprobaciones de despacho consideran sus reversiones. Un despacho totalmente revertido no cuenta como entrega vigente; una reversión parcial sigue bloqueando la cancelación mientras queden cantidades por resolver.
- Seller usa las RPC nuevas `anular_pedido_con_cartera` y `restaurar_pedido_con_cartera`. La ausencia de la migración bloquea estas acciones con un mensaje, sin volver a la implementación antigua.
- Un UPDATE directo a CANCELADO no puede dejar partidas activas o saldo aplicado detrás.
- El expediente dado de baja se conserva para consulta en la base: no permite completar hitos, revisar/subir documentos ni eliminarlos. El mismo control protege expedientes cuyo pedido de origen fue cancelado, aunque una partida histórica aún aparezca abierta.
- La baja manual comprueba también la venta de origen, la recepción del pedido y la disponibilidad de sus vínculos. Una venta vigente o un origen que no se puede validar requieren revisión.
- Se conserva la deuda original cuando solo hay un rechazo operativo: todavía debe resolverse comercialmente la sustitución o reducción del pedido.

## Almacén

`src/PedidosApp.jsx` exige motivo no vacío en los tres controles de rechazo. La migración también lo exige en servidor y evita rechazar líneas con cantidades ya despachadas. Los cambios de líneas existentes se conservan; los rechazos no generan automáticamente notas de crédito.

Almacén usa las RPC nuevas `rechazar_pedido_auditado` y `rechazar_linea_pedido_auditada`, que obtienen el responsable desde la sesión. Si aún falta la migración, explica que la operación no está habilitada y no vuelve a la RPC antigua. Los botones excluyen también las líneas cambiadas o retiradas del conjunto de pendientes rechazables.

## Comprobación local

- Suite de integración financiera de Seller en PostgreSQL aislado (PGlite), con fixtures sintéticas: incluye baja simple, motivo y autor, permisos reales de rol, idempotencia, propuesta, pago confirmado, entrega parcial, rechazo total/individual, no inferir entrega, raíz/hija, tres categorías, saldo a favor y rollback de crédito al fallar una baja.
- El test aislado sustituye únicamente la función de snapshots `guardar_version_pedido` y reproduce los predicados de rol de almacén para completar su esquema reducido. No demuestra el ciclo de snapshots de producción.
- Hermes actualizado a `707776f`: 108 pruebas en 18 archivos, incluida disponibilidad del historial, registros antiguos incompletos, ficha sin partidas activas, respuestas tardías de otro expediente, comunicación del origen cancelado a sus controles y las pruebas de filtros/actividad de la versión actual. Compilación completada después de revisar los flujos.
- Almacén: seis pruebas de uso de la operación auditada, ausencia de migración y conservación de errores de permisos/entrega. Seller: cuatro pruebas de presentación del historial.
- La suite SQL verifica también eventos conservados, inserción directa rechazada, uso desde una sesión `authenticated`, reversiones totales/parciales y sincronización de pedidos con entrega y rechazo.
- La revisión adicional reprodujo tres fallos con pruebas que inicialmente fallaron: nuevo cobro posterior a la cancelación, edición documental/hitos de una baja y confirmación de una propuesta histórica de pedido cancelado. Después de corregirlos, toda la suite financiera volvió a pasar. Incluye además gestión documental de partidas pagadas y rollback completo cuando una partida hija impide la cancelación conjunta.
- Verificación final sobre el main actualizado: Hermes `707776f`, Seller `bcf37b2` y Almacén `39ebe43`. Pasaron las 108 pruebas de Hermes, 595 pruebas de Seller (7 omitidas), seis pruebas de rechazo auditado de Almacén y la suite financiera aislada. Compilaciones de las tres aplicaciones completadas.
- Revisión del preview y navegación de la ficha a 1440 × 1000 y 390 × 844, sin desbordamiento horizontal ni errores de navegador.

## Límites y siguiente publicación

La migración no modifica partidas históricas. Los casos detectados en el diagnóstico siguen pendientes de revisión individual. Los autores antiguos se muestran tal como estaban registrados; no se inventan identidades faltantes.

No hay interfaz nueva para devolver dinero, resolver pagos propuestos, emitir devoluciones por entregas parciales ni reabrir deuda anulada. Esos casos se bloquean con una explicación y requieren un flujo financiero separado.

PGlite valida transacciones y restricciones, pero no reproduce concurrencia entre varias conexiones ni todos los roles/triggers de un proyecto Supabase completo. Sigue pendiente el recorrido con las tres aplicaciones y sesiones reales, incluyendo confirmar pago contra cancelar, rechazo contra despacho y restauración.

Durante el desarrollo se intentó `supabase db advisors --local --type security`; no pudo conectar porque no hay un servidor Supabase local disponible. Las pruebas financieras se ejecutaron en PGlite. Después de autorizar la activación se verificaron también en el proyecto remoto las firmas, permisos y disponibilidad por API de las seis nuevas RPC, además del rechazo de sesiones vacías. Estas comprobaciones no operaron partidas reales.

El backend ya está habilitado. Los conteos de movimientos y partidas anuladas, y el saldo agregado de la cuenta corriente, permanecieron iguales tras instalarlo. La revisión de seguridad no añadió errores ni accesos anónimos nuevos; las advertencias de funciones `SECURITY DEFINER` autenticadas se documentan en `ACTIVACION_BAJAS.md`. La publicación de las interfaces debe seguir esta activación del backend. La vista previa local sigue usando exclusivamente datos sintéticos.

# Bajas de partidas y novedades de Seller/Almacén

Diagnóstico: 12 de octubre de 2026. Se revisaron el código local de Hermes, Seller y Almacén, las funciones/triggers vigentes del proyecto Supabase configurado por Hermes y conteos agregados. Todas las consultas remotas fueron de lectura. No se ejecutaron anulaciones ni se modificó lógica o datos.

## Conclusión

El flujo ya tiene piezas reutilizables, pero está incompleto entre operación comercial, almacén y cartera. Mostrar una cancelación no basta para revertir su deuda; rechazar una línea tampoco equivale necesariamente a cancelar el pedido completo. La mejora debe conservar ambos estados y vincular sus eventos, autores y efectos contables.

## Hallazgos confirmados

### 1. Hermes permite anular con motivo, pero oculta parte de la trazabilidad

La pantalla de expediente llama a `hermes.anular_partida` con motivo obligatorio y el correo de la sesión. La función vigente:

- Admite partidas ABIERTA.
- Exige motivo y bloquea pagos CONFIRMADO/ACREDITADO aplicados.
- Bloquea saldo a favor aplicado y remite a Seller para su reversión conjunta.
- Guarda estado ANULADA, fecha, usuario y motivo.
- Genera un movimiento NOTA_CREDITO por el total negativo; no borra la partida.

Sin embargo, `components/ClientDetail.tsx` consulta solamente ABIERTA/PAGADA. No hay una pestaña de anuladas. La tabla de movimientos muestra motivo/referencia pero no `creado_por`; la pantalla de expediente no presenta `anulada_por`, `anulada_en` y `motivo_anulacion` como bloque de baja.

Hay además dos diferencias entre interfaz y backend: el botón se ofrece a admin/gerente, pero la RPC exige gerente en una sesión normal; y el autor de la anulación se toma literalmente de `p_usuario`, enviado por el cliente. Conviene obtener la identidad de la sesión en servidor, como ya hace `confirmar_pago`, y guardar también un ID estable.

### 2. Cancelar en Seller no cubre todas las partidas de Hermes

`public.anular_pedido` exige motivo, cambia el pedido a CANCELADO y después inserta ANULADO en `public.pedido_evento`, con motivo, usuario y estado anterior.

El trigger `hermes.revertir_saldo_pedido` solo actúa si hay un uso vigente de saldo a favor en `public.saldo_cliente_uso`. Sin ese uso retorna sin anular partidas. La sincronización general `hermes.sincronizar_pedido_pos` ignora CANCELADO.

Cuando sí actúa la reversión de saldo, usa un motivo genérico, «Pedido anulado; saldo aplicado restaurado», y el UUID de la sesión. No propaga el motivo comercial exacto.

Detalle importante para implementar: el trigger de cambio de estado se ejecuta antes del INSERT del evento de cancelación. Leer «el último motivo» desde ese trigger puede recuperar un evento anterior. Se necesita una operación coordinada con contexto explícito o procesamiento del evento correspondiente; no una búsqueda ambigua del último registro.

### 3. Almacén ya registra rechazos, pero no existe un historial común en Hermes

`rechazar_pedido_linea` guarda el motivo en `pedido_linea.nota`, usuario/fecha de modificación y un evento LINEA_RECHAZADA. `rechazar_pedido` afecta las líneas pendientes y registra PEDIDO_RECHAZADO. Ambos aceptan motivo opcional y usuario recibido por parámetro.

Hermes consulta estado/origen y detalle de líneas, pero las RPC de consulta revisadas no devuelven la bitácora `pedido_evento`. Existe conexión parcial: el resumen de origen mayorista reconoce CANCELADO y excluye líneas RECHAZADO/CAMBIADA/RETIRADA. Ese resumen no transporta la historia de quién rechazó o canceló y por qué. Su consulta se limita a partidas raíz MAYORISTA; las categorías corporativa/institucional y las partidas hijas necesitan cobertura propia.

### 4. COMPLETADO no demuestra entrega

`recalcular_estado_pedido` marca COMPLETADO cuando todas las líneas están en estados terminales, incluidos RECHAZADO, CAMBIADA y RETIRADA. También genera una fecha para sincronización de despacho en pedidos no TIENDA. El flujo de sincronización puede trasladar esa fecha a `fecha_entrega` de una partida abierta.

Por tanto, un pedido totalmente rechazado puede terminar como COMPLETADO sin entrega. El resumen nuevo de origen calcula despachos con eventos, pero el mecanismo heredado de fechas mantiene esa ambigüedad. Al corregir bajas hay que revisar ambos caminos para no iniciar vencimientos por una mera finalización operativa.

### 5. Pagos pendientes y restauración requieren tratamiento explícito

La anulación manual de Hermes comprueba pagos confirmados/acreditados, pero no bloquea expresamente aplicaciones PROPUESTO. La confirmación posterior exige una partida ABIERTA: una propuesta ligada a una anulada puede quedar pendiente de resolver/repartir.

Seller permite restaurar pedidos. La sincronización comprueba si existe cualquier partida para el pedido y no crea otra aunque la existente esté ANULADA. Restaurar el estado comercial no constituye una restauración contable completa. Además, la clave `anulacion-partida-{id}` admite una sola anulación por esa identidad; un diseño con ciclos de restauración debe conservar idempotencia por operación y compensaciones explícitas.

## Alcance observado en datos actuales

Conteos de lectura al momento de la revisión, no una auditoría de saldos:

| Situación | Resultado |
|---|---:|
| Pedidos cancelados con partidas ABIERTA/PAGADA | 4 |
| Partidas de esos pedidos aún ABIERTA | 2 |
| Partidas de esos pedidos PAGADA, con pagos confirmados/acreditados aplicados | 2 |
| Pedidos vinculados a Hermes COMPLETADO con todas las líneas RECHAZADO y sin despacho según estados/contadores de líneas | 3 |
| Partidas ANULADA | 15 |
| Anuladas sin motivo o sin usuario almacenado | 0 |
| Propuestas aplicadas a partidas ANULADA/CANCELADA | 0 |

Los conteos de despacho no sustituyen revisar eventos y reversiones por pedido. Las dos partidas abiertas no tienen aplicaciones confirmadas ni propuestas; eso todavía no prueba por sí solo que sean aptas para una baja automática: falta revisar entregas, ajustes, documentos y relaciones. Las dos pagadas exigen resolver el destino del dinero antes de cualquier corrección.

## Flujo recomendado

| Hecho | Presentación en Hermes | Efecto propuesto |
|---|---|---|
| Rechazo de una línea | Novedad de almacén con línea, motivo, autor y fecha | No anular toda la deuda. Resolver sustitución, reducción o cancelación comercial del remanente |
| Rechazo de todas las líneas pendientes | «Rechazado en almacén / pendiente de resolución» | No tratarlo como entrega ni como cancelación contable automática |
| Cancelación definitiva en Seller sin entregas ni movimientos financieros que resolver | Partida anulada visible en historial | Reversión coordinada de cargos, una sola vez, con referencia al evento original |
| Cancelación con pago propuesto | Incidencia financiera pendiente | Bloquear la baja definitiva o resolver expresamente la propuesta y su reparto, conservando el cobro de caja |
| Cancelación con pagos confirmados o saldo aplicado | Resolución financiera visible | Definir y registrar reasignación, saldo a favor o devolución; no borrar el dinero recibido |
| Rechazo/cancelación con entrega parcial | Mostrar lo entregado y el remanente separado | Ajustar solo la parte cancelada; conservar la deuda válida y tramitar devolución si corresponde |
| Baja manual de Hermes vinculada a pedido vigente | Advertencia y vínculo al origen | Preferir resolución desde Seller; reservar correcciones contables excepcionales a permisos y motivos específicos |
| Restauración en Seller | Evento nuevo y estado financiero explícito | Crear compensaciones/reapertura según reglas definidas; no reactivar deuda silenciosamente |

En todos los casos, el historial debería exponer: acción, sistema de origen, entidad afectada, estado anterior/nuevo, motivo, usuario autenticado, fecha/hora y efecto económico. El autor comercial original y el usuario que resuelve en Hermes deben ser distintos campos cuando intervienen personas diferentes.

## Implementación propuesta por etapas

1. **Visibilidad y trazabilidad.** Añadir anuladas/canceladas e historial al cliente y expediente; mostrar motivo/autor/fecha en movimientos; exponer eventos de Seller/Almacén mediante consulta autorizada con cobertura para todas las categorías y partidas hijas. No ampliar CRUD general.
2. **Reglas comunes.** Exigir motivo también en rechazos de Almacén, derivar autor de la sesión, alinear permisos y definir rechazo operativo, cancelación comercial, baja contable y restauración.
3. **Coordinación transaccional.** Integrar la cancelación definitiva con Hermes, respetando pagos, saldo a favor, entregas parciales, bloqueos e idempotencia. Corregir la interpretación de COMPLETADO para fechas de entrega.
4. **Revisión histórica.** Preparar una lista de diferencias con su efecto propuesto. Corregir casos históricos mediante operaciones trazables, después de revisar su situación individual; no aplicar un barrido indiscriminado por estado.

Pruebas necesarias antes de activar cambios contables: cancelación sin pagos; con propuesta; con pago confirmado; con saldo a favor; rechazo parcial/total; entrega parcial; partidas raíz/hijas; restauración; repetición de eventos; concurrencia entre confirmar pago y anular; permisos y autor no suplantable. Estas pruebas no se ejecutaron en este diagnóstico porque no se implementaron cambios.

## Referencias locales

- Hermes: `components/ClientDetail.tsx`, `app/(app)/clientes/[id]/expediente/[partidaId]/page.tsx`, `components/ExpedienteOrigen.tsx`, `lib/roles.ts`.
- Almacén: `src/PedidosApp.jsx`, `src/lib/operaciones.js`.
- Seller: `src/infrastructure/supabase/OrderRepository.supabase.ts`; migraciones `20261003213326_hermes_clientes_pedidos_automaticos.sql`, `20261004005854_saldo_favor_ventas_pedidos.sql` y `20261001220328_hermes_origen_mayorista.sql`.
- Para las funciones descritas se contrastó su definición vigente en la base; las migraciones locales son referencias de implementación, no una garantía independiente del despliegue.

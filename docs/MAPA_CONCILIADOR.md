# Mapa del conciliador / Hermes

Revisión actualizada: 13 de octubre de 2026, sobre `707776f` (main de GitHub, cambio del 9 de octubre). El mapeo inicial se había realizado sobre `9093087`; esta revisión incorpora los cambios de la PR #26.

## Alcance

Hermes es el auxiliar de cuentas por cobrar de Cation. Este repositorio contiene su interfaz Next.js y endpoints de documentos; depende de tablas, vistas y funciones de Supabase para las operaciones de negocio. Este mapa describe código y documentación locales: no certifica el estado desplegado ni valida datos reales.

Tecnologías declaradas: Next.js 16.2.12, React 19.2.4, TypeScript, Supabase y Decimal.js. La carpeta del proyecto es `D:\Proyectos\conciliador`; el paquete se llama `hermes-app`.

## Pantallas y puntos de entrada

Las rutas operativas están en `app/(app)`.

| Ruta | Función | Implementación principal |
|---|---|---|
| `/` | Redirige a Mi día | `app/page.tsx` |
| `/login` | Acceso | `app/login/page.tsx` |
| `/resumen` | Visión general de cartera | `components/Overview.tsx`, `lib/use-cartera.ts` |
| `/mayor` | Mayor global: evolución de deuda, crédito separado y movimientos por período | `components/MayorCartera.tsx`, `lib/consultar-mayor.ts`, `lib/mayor-cartera.ts` |
| `/dia` | Cartera, prioridades y actividad reciente de pagos/pedidos con selector de período | `components/Dashboard.tsx`, `components/CarteraSummary.tsx`, `lib/use-actividad.ts` |
| `/clientes` | Listado de cuentas con búsqueda, filtros y orden persistidos en la URL | `app/(app)/clientes/page.tsx`, `lib/clientes-filtros.ts` |
| `/clientes/nuevo` | Alta de cliente y condiciones de crédito | `app/(app)/clientes/nuevo/page.tsx` |
| `/clientes/[id]` | Cuenta corriente, partidas, anticipos y pendientes | `components/ClientDetail.tsx` |
| `/clientes/[id]/editar` | Condiciones de crédito | `app/(app)/clientes/[id]/editar/page.tsx` |
| `/clientes/[id]/expediente/[partidaId]` | Hitos, documentos, origen, fechas, anulación y división de partidas | `app/(app)/clientes/[id]/expediente/[partidaId]/page.tsx` |
| `/conciliacion` | Revisión y verificación de pagos registrados | `components/PaymentReview.tsx`, `lib/use-cartera.ts` |
| `/captura` | Captura y envío de documentos, con cola de reintentos | `app/(app)/captura/page.tsx`, `lib/captura/` |
| `/apertura`, `/apertura/[id]` | Carga de saldos iniciales; acceso de administrador | `app/(app)/apertura/` |
| `/tesoreria`, `/proveedores`, `/resultados` | Pantallas con fuentes pendientes de integrar | `components/FinancialCoverage.tsx` |
| `/vista-previa` y subrutas | Vistas con datos sintéticos | `app/vista-previa/`; solo desarrollo con `HERMES_UI_PREVIEW=1` |

Anticipos es una pestaña de la ficha del cliente, no un módulo operativo con ruta independiente.

La versión actual retiró `/clientes/importar` y `/pedidos-pendientes`, junto con sus destinos e indicadores de navegación. La sincronización de clientes y pedidos se mantiene en el backend; ya no se presenta como una tarea manual en esas pantallas.

## Flujos principales

### Cartera y cuenta corriente

`useCartera` consulta `v_saldo_cliente`, `v_cobros_bloqueados`, `v_partidas_frenadas` y, para roles autorizados, pagos `PROPUESTO`. Alimenta Visión general, Mi día y Verificación de pagos.

`useActividad` realiza consultas independientes de pagos y partidas recientes para las pestañas de Mi día. Permite últimas 24 horas, hoy, siete días y rango de fechas; cambiar el período no vuelve a consultar toda la cartera. La ventana de 24 horas avanza en cada consulta.

La cartera principal filtra MAYORISTA, INSTITUCIONAL y CORPORATIVO. El modelo también contempla RETAIL. La ficha reúne crédito, movimientos, partidas, anticipos y pendientes. Las notas de crédito se registran mediante `registrar_nota_credito`.

La deuda y el saldo a favor de clientes se resumen por separado. Los importes usan Decimal.js y los saldos contables proceden de vistas/RPC.

### Registro y verificación de pagos

Según el contrato de integración documentado, el POS registra el cobro mediante `public.registrar_cobro_hermes`, que crea la propuesta de pago junto con el movimiento de caja. Hermes consulta la propuesta y permite a administrador o gerente verificarla mediante `confirmar_pago`.

La ruta `/conciliacion` implementa esa verificación. El contraste con movimientos bancarios figura expresamente como pendiente de integrar.

`lib/pago-estado.ts` y `components/ResumenPagoPartida.tsx` distinguen pago registrado completo, adelanto parcial y reparto excedido. La presentación no completa por sí misma el hito Pago.

Los comprobantes pasan por `app/api/pagos/[id]/comprobante/route.ts`, con sesión y RPC `asociar_comprobante_pago`.

### Expedientes

Una partida reúne hitos y documentos. La pantalla permite revisar documentos, completar hitos, registrar fechas, anular o dividir partidas mediante RPC.

`obtener_origen_expediente` y `obtener_detalle_pedido_cation` recuperan el origen comercial. `lib/expediente-origen.ts` y `components/ExpedienteOrigen.tsx` lo presentan. El despacho de almacén se distingue de la recepción física del cliente.

RPC de edición relevantes: `revisar_documento`, `completar_hito`, `subir_documento`, `registrar_fechas_partida`, `anular_partida` y `partir_partida`.

### Captura e ingesta

`lib/captura/db.ts`, `comprimir.ts` y `queue.ts` gestionan almacenamiento local de páginas, compresión, cola y reintentos. Los archivos se envían al bucket `documentos-expediente`.

La API heredada de agentes está en `app/api/expediente/`: `upload-url`, `ingesta`, `resolver`, `bandeja` y `partida/[id]`. `lib/api/agente.ts` autentica por secreto de agente y usa un cliente privilegiado de servidor. Su funcionamiento desplegado no se verificó en este mapeo.

## Arquitectura y permisos

- `app/(app)/layout.tsx`: valida sesión, obtiene rol y monta la navegación.
- `components/Sidebar.tsx`: destinos, cuenta activa y cierre de sesión.
- `proxy.ts` y `lib/supabase/middleware.ts`: tratamiento de sesión en rutas de interfaz y restricción de vista previa. El matcher excluye `/api`; los endpoints requieren controles propios.
- `lib/supabase/session.ts`: valida usuario y consulta `rol_actual()`. Si falla la consulta de rol no concede acceso por un claim alternativo.
- `lib/roles.ts`: permisos de interfaz. Verificar pagos y gestionar evidencia corresponde a admin/gerente; registrar fechas contempla también supervisor/comercial.
- `lib/supabase/client.ts`, `server.ts`, `service.ts`, `config.ts`: clientes y selección de esquema.
- `lib/types.ts`: entidades, estados, categorías y valores iniciales de crédito.
- `lib/money.ts`, `fechas.ts`, `cartera.ts`, `paginate.ts`: cálculos de presentación, fechas, resúmenes y paginación.

La integración documentada comparte proyecto Supabase y autenticación: POS/almacén en `public`, Hermes en `hermes`. `NEXT_PUBLIC_SUPABASE_SCHEMA` selecciona el esquema; si falta, el código usa `public`. No se inspeccionaron valores privados de `.env.local`.

Las reglas definitivas dependen del backend y sus permisos/RLS, además de los controles de interfaz. Las migraciones de integración se encuentran fuera de este repositorio: se localizaron archivos `hermes_*` en `D:\Proyectos\pos-cation\supabase\migrations`.

## Diseño y actualización

`app/layout.tsx` importa, en orden, `globals.css`, `anticipos.css`, `despacho.css` y `redesign.css`. Este orden importa al modificar estilos. `DESIGN.md` describe el diseño oscuro, la tipografía Manrope y la adaptación móvil; `PRODUCT.md` describe el alcance del producto.

El código actual de `lib/supabase/use-refresh.ts` consulta al recuperar foco, al volver a estar visible y cada 15 segundos mientras la página está visible. Los consumidores pueden suspenderlo durante edición u operaciones. El README describe actualización por foco y botón y no refleja ese temporizador. No se trata de una suscripción Realtime.

## Dónde aplicar futuros cambios

| Cambio solicitado | Archivos o capa a revisar primero |
|---|---|
| Navegación o apariencia general | `Sidebar.tsx`, `app/layout.tsx`, hojas CSS |
| Indicadores y resúmenes de cartera | `Dashboard.tsx`, `Overview.tsx`, `CarteraSummary.tsx`, `use-cartera.ts`, `cartera.ts` |
| Búsqueda, filtros y orden de Clientes | Página de clientes y `lib/clientes-filtros.ts` |
| Actividad y períodos de Mi día | `Dashboard.tsx`, `lib/use-actividad.ts`, `lib/fechas.ts` |
| Cuenta corriente y anticipos | `ClientDetail.tsx`, vistas contables |
| Revisión de pagos | `PaymentReview.tsx`, `use-cartera.ts`, RPC del backend |
| Crédito y vencimientos | Páginas de clientes, `types.ts`, RPC y vistas de crédito |
| Expediente y seguimiento de entregas | Página del expediente, `ExpedienteOrigen.tsx`, `expediente-origen.ts`, RPC de origen |
| Captura y adjuntos | Página de captura, `lib/captura/`, `uploads.ts`, API de comprobantes |
| Reglas de saldo, reparto o sincronización con POS | Backend y migraciones del POS; evaluar ambos repositorios |
| Tesorería, proveedores o resultados | Definir/integrar fuentes y sustituir las pantallas de `FinancialCoverage.tsx` |

## Validación disponible y límites

Hay pruebas Vitest en `lib/__tests__`, `components/__tests__`, `lib/captura/__tests__` y la ruta API de comprobantes. Los comandos declarados son `npm test` y `npm run build`.

Este trabajo fue un mapeo estático: no se ejecutaron pruebas, no se recorrieron pantallas con sesión real y no se consultó ni modificó la base remota. Solo se añadió este documento; no se alteró el comportamiento de la aplicación.

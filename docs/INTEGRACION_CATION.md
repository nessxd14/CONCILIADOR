# Integración de Hermes con Cation

Hermes y el POS utilizan un proyecto Supabase común: POS/almacén en `public`, cartera en `hermes`, con la misma autenticación. Este repositorio contiene el frontend de Hermes. El código del POS, las migraciones del backend y sus pruebas aisladas se mantienen en Seller.

## Operaciones del backend

- `public.registrar_cobro_hermes`: movimiento de caja, propuesta de pago, referencia, reparto e intención de anticipo en una misma transacción idempotente.
- `public.consultar_hermes_pos`: consulta de saldo, crédito y reparto con la sesión del POS.
- `hermes.confirmar_pago`: confirmación autorizada con bloqueos y validación del saldo vigente; los excedentes válidos se conservan como saldo a favor.
- `hermes.asociar_comprobante_pago`: asociación limitada de evidencia existente, sin permisos generales de edición del pago.
- `hermes.obtener_origen_expediente`: consulta limitada del origen mayorista, con validación del acceso del usuario.

Registrar en caja crea una propuesta. Administrador o gerente verifican antes de actualizar la contabilidad; no se confirma dinero automáticamente desde esta interfaz. El anticipo marcado como no imputable conserva esa intención.

Los cambios de pedidos/clientes se procesan por eventos de la misma base. La actualización visual mediante foco y botón Actualizar no equivale a Realtime. La retirada del cron de replicación antiguo pertenece al despliegue del POS; no implica eliminar trabajos independientes de notificaciones o banca.

## Dependencias del frontend

La conexión exige el esquema seleccionado, sus tablas/vistas, las RPC del dominio y el bucket privado `documentos-expediente`. Las vistas mantienen `security_invoker` y las tablas tienen RLS. Los permisos de interfaz se obtienen de `rol_actual()` con sesión validada.

La actualización del frontend no aplica SQL automáticamente ni cambia permisos de Supabase. Las migraciones siguientes se prepararon en `supabase/migrations` del checkout de Seller y se registraron en Cation durante la integración:

| Cambio | Nombre de migración registrado |
|---|---|
| Cobros conjuntos e idempotentes | `hermes_transacciones_unificadas` |
| Comprobantes y fechas de entrega | `hermes_comprobantes_autorizados_y_fecha_entrega` |
| Identidad del operador | `hermes_identidad_del_operador` |
| Identidad sin acceso general al esquema Auth | `hermes_identidad_sin_acceso_auth` |
| Procedencia del expediente mayorista | `hermes_origen_mayorista` |

Las versiones de archivo local y del historial remoto deben alinearse antes de automatizar una publicación de migraciones. No repetir la aplicación a producción basándose solo en un nombre de archivo diferente.

## Estado de publicación y límites

Al preparar esta actualización, el backend ya estaba aplicado en Cation; los cambios del POS seguían en su checkout local, pendientes de publicación coordinada. No se verificaron las variables reales de Vercel durante esa integración.

Antes de desplegar, configurar URL, clave publicable y esquema del mismo proyecto; comprobar acceso autenticado, bucket y RPC requeridas. Revisar Seller y su programación antigua junto con este frontend. La recuperación histórica y los respaldos con datos reales permanecen privados.

La recepción física del cliente, el ciclo completo de acreditación/rechazo bancario, la automatización persistente del hito Pago y los endpoints heredados de agentes aún tienen trabajo pendiente. Las pruebas de interfaz no sustituyen la validación de esos ciclos.

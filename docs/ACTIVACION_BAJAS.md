# Habilitación de bajas con historial

13 de octubre de 2026. Migración aplicada al proyecto Supabase compartido, tras la autorización explícita del usuario. No se anularon partidas reales durante la instalación o sus comprobaciones.

## Causa y resolución

La aplicación local usa el esquema `hermes` del proyecto `zxoxougwgstrarwymlvd`. La configuración era correcta, pero faltaban `hermes.anular_partida_auditada(bigint,text)` y `hermes.obtener_historial_partida(bigint)`, junto con las operaciones nuevas de Seller y Almacén. Esto producía el aviso «La baja con historial aún no está habilitada».

Se aplicó exclusivamente `hermes_bajas_trazabilidad`, registrada por Supabase con versión `20261013155427`. La fuente versionada está en Seller: `supabase/migrations/20261013155427_hermes_bajas_trazabilidad.sql`. El archivo local se alineó con ese registro después de la aplicación.

La migración exige motivo, obtiene nombre e ID del perfil activo de la sesión, coordina pedido y cartera, y conserva el historial. Bloquea las operaciones con pagos, entrega, factura o ajustes que requieren resolución previa. No corrige automáticamente partidas históricas ni decide devoluciones o reasignaciones de dinero.

## Verificación del backend

- Las seis nuevas RPC existen con sus firmas esperadas: baja e historial de Hermes, cancelación y restauración de Seller, y rechazo individual/masivo de Almacén.
- `authenticated` puede ejecutarlas; `anon` no. Los helpers internos de autor y baja no tienen permiso de ejecución para ninguno de esos roles.
- Las seis rutas se comprobaron mediante la API REST con la clave pública, sin sesión y con IDs inválidos. Respondieron `401/42501`, no `PGRST202`: el esquema de la API reconoce las funciones y rechaza el acceso sin sesión.
- Una transacción SQL bajo `authenticated` y sin identidad verificó que las seis funciones también rechazan una sesión vacía. Se revirtió la transacción.
- Los conteos de movimientos y partidas anuladas y el saldo agregado permanecieron iguales antes y después de instalar la migración. No se registraron bajas de prueba en datos reales.

## Compatibilidad y seguridad

La migración anterior, `20261013143239_fix_cierre_revision_cobro_vtd_pedidos`, mantiene sus siete funciones: ninguna se redefine en este cambio. Seller y Almacén se actualizaron al main actual antes de integrar el trabajo. Esto conserva las correcciones recientes de cobro y despacho VTD.

Los asesores de seguridad se consultaron antes y después. Los errores preexistentes de vistas no aumentaron y las advertencias de `search_path` bajaron de 63 a 61. No aparecieron nuevas funciones ejecutables por `anon`.

Aparecieron tres avisos de [funciones SECURITY DEFINER ejecutables por usuarios autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable): `hermes.obtener_historial_partida`, `public.rechazar_pedido` y `public.rechazar_pedido_linea`. La exposición es intencional: el historial comprueba acceso a Hermes y las operaciones de rechazo validan perfil activo y rol antes de operar. Se necesita esa ejecución controlada para consultar/actualizar el expediente de ambos sistemas. Los helpers privados siguen revocados.

## Código y límites de comprobación

Pasaron 108 pruebas de Hermes, 595 de Seller (7 omitidas), seis de rechazos auditados de Almacén, la suite financiera aislada y las compilaciones de las tres aplicaciones. La suite cubre motivo/identidad, saldos, permisos, idempotencia, rollback, entregas/reversiones y expedientes archivados.

No se realizó un recorrido remoto con una sesión real ni una prueba de concurrencia entre conexiones. Esos recorridos siguen pendientes en un entorno de pruebas. La activación de la base habilita la aplicación local, pero no publica por sí misma las interfaces de producción.

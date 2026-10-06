# Integración del dashboard oscuro de Hermes

Implementación iniciada el 5 de octubre de 2026, en la rama `codex/hermes-dark-glass`. Esta versión se entrega mediante una rama de revisión y un PR en borrador; no representa aprobación para producción.

El usuario eligió las vistas oscuras con glassmorphism y pidió integrarlas con prioridad en la consulta rápida de saldos y movimientos. Impeccable dirige la revisión visual y la documentación; las guías de Emil Kowalski orientan la interacción y la accesibilidad. Los importes de las imágenes de referencia son ejemplos, no registros de la empresa.

## Alcance funcional

| Vista | Fuente y comportamiento |
| --- | --- |
| Visión general `/resumen` | Cartera confirmada, pagos en revisión y crédito a favor. Distribución por categoría y mayores deudores a partir del libro auxiliar existente. |
| Mi día `/dia` | Consulta de cartera, vencida y pagos registrados por verificar. Tabla de cobros, prioridades, búsqueda de cuentas y enlaces a revisión y documentos. Los próximos vencimientos declaran su fuente pendiente. |
| Ficha `/clientes/[id]` | Conserva cuenta corriente, partidas, anticipos, mayor, condiciones crediticias y acciones existentes. En móvil la consulta de movimientos precede a las condiciones. |
| Verificación de pagos `/conciliacion` | Selección de pago registrado, consulta de importe, medio, referencia, registrador y respaldo disponible. Confirmación mediante el RPC existente y solo con permisos de gerente/admin. La conciliación con el banco se declara pendiente de integración. |
| Tesorería `/tesoreria` | Vista de cobertura pendiente: no muestra caja o bancos ficticios. Requiere integrar movimientos y saldos para ofrecer liquidez y proyección. |
| Proveedores `/proveedores` | Vista de cobertura pendiente: requiere obligaciones, vencimientos y pagos de proveedores. |
| Resultados `/resultados` | Vista de cobertura pendiente: requiere ingresos, costos y gastos completos para calcular resultados. |
| Operación existente | Expedientes, pedidos, captura documental, apertura y formularios comparten el tema; conservan sus flujos y permisos. |

No se cambió el esquema de Supabase, no se añadieron cronjobs y no se modificó Seller. Hermes conserva la base compartida y las reglas contables existentes.

## Reglas de importes y actualización

- La cartera por cobrar suma únicamente saldos confirmados positivos. El saldo a favor suma por separado los negativos; el crédito de un cliente no reduce la deuda de otro.
- `PROPUESTO` se presenta como pago registrado/recibido pendiente de verificar. La confirmación contable utiliza `confirmar_pago`; un fallo no muestra éxito.
- La cartera vencida suma saldos positivos de partidas con motivo `VENCIDA`, deduplicados por partida. No representa una previsión futura ni un saldo bancario.
- Las lecturas paginan de mil en mil. Un fallo de una página invalida el total correspondiente en lugar de presentar un subtotal como completo.
- El refresco de consulta sigue siendo cada 15 segundos y al recuperar foco. Se suspende durante la comprobación explícita de un pago y durante su confirmación.
- Un dato desconocido se muestra como no disponible. No se sustituye por cero.

## Revisión local

El servidor de desarrollo puede iniciarse con `HERMES_UI_PREVIEW=1` y `npm run dev -- --hostname 127.0.0.1 --port 3001`. La entrada real es `/login`. Las rutas `/vista-previa` y `/vista-previa/resumen`, `/cliente`, `/conciliacion`, `/tesoreria`, `/proveedores`, `/resultados` muestran fixtures identificadas y tienen escrituras deshabilitadas. La vista previa está bloqueada fuera del modo de desarrollo, incluso si se define la variable.

Las pruebas de importes, paginación y revisión de pagos están incluidas en `npm run test`. `npm run build` verifica compilación, TypeScript y rutas. La evidencia visual local no se incluye en Git.

## Límites de validación

La comprobación visual utiliza datos sintéticos. Antes de desplegar en producción se debe recorrer con una sesión del POS una ficha y un expediente reales, comprobar la disponibilidad de las vistas de cartera/vencimientos y revisar un comprobante. No se confirmó ningún pago real durante esta integración. Las nuevas vistas de cobertura no sustituyen las integraciones financieras pendientes.

La revisión visual contra las imágenes elegidas y su disposición final se registran por separado. La compilación correcta no acredita por sí sola fidelidad visual.

## Estado al 6 de octubre de 2026

La compilación final de producción pasó, incluida TypeScript y la generación de rutas. Las pruebas funcionales del lote previo pasaron: 63 pruebas en 13 archivos. El último lote solo ajusta CSS y elimina un rótulo redundante de Anticipos.

Las capturas finales se comprobaron al ancho normal (viewport 1280 × 720, contenido 1270px), en escritorio de 1440px, móvil de 390px y en el ancho de referencia de 1586px. Tras renovar la sesión de la herramienta se pudo verificar el último ajuste tipográfico en móvil y escritorio. No hubo desbordamiento horizontal en las vistas capturadas. Los importes principales de ejemplo se muestran en una línea en los anchos comprobados; los controles y el movimiento contable siguen siendo elementos del DOM.

La comparación final válida contra Mi día dio 0.6693, disposición `drift`; no acredita coincidencia visual ni un gate aprobado. Una captura intermedia obtenida durante la carga se excluyó de la evidencia de reproducción. Las cantidades, los mensajes de fuentes pendientes y la barra que identifica datos sintéticos se preservaron durante la comparación.

El pase independiente de correcciones resolvió la legibilidad, el login y el rótulo de Anticipos. Su disposición sigue siendo `fix` por las fases y el checkpoint humano abiertos; ese pase no constituye una aprobación de todas las rutas o roles.

Quedan pendientes el recorrido autenticado y el checkpoint humano de plan y activos de Impeccable. El estado de fases permanece abierto; no se declara aprobación visual ni coincidencia de píxeles. El 6 de octubre el usuario autorizó subir esta versión a GitHub como revisión. Esta entrega no incluye la fusión con `main` ni un despliegue a producción.

# Product
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Usuarios de administración, gerencia, comercial, caja y almacén con permisos diferenciados. Trabajan con cobros, pedidos y documentación por cliente.

## Product Purpose
Hermes es el libro auxiliar de cuentas por cobrar de ROARI/Cation. Permite consultar rápidamente saldos y movimientos, revisar pagos y resolver documentos que frenan el cobro. La visión general reúne la cartera y su revisión; las vistas de tesorería, proveedores y resultados expresan su cobertura pendiente hasta disponer de fuentes completas.

## Capabilities and Constraints
Next.js y Supabase. Hermes y Seller/Cation ya comparten la misma base y autenticación: POS/almacén en `public`, cartera en `hermes`. Se preservan RPC, autorización, RLS y trazabilidad. Dinero con Decimal.js; partidas, anticipos, mayor auxiliar, expediente e ingesta/captura documental siguen sus flujos existentes.

La cartera confirmada por cobrar y el saldo a favor se suman por separado, sin compensar crédito entre clientes. `PROPUESTO` es un pago recibido/registrado pendiente de verificar. Solo gerente/admin verifican mediante el RPC existente; la conciliación bancaria requiere una fuente adicional. Los saldos confirmado y provisional conservan etiquetas distintas. Una fuente ausente o una consulta fallida se muestran como no disponibles, no como cero.

El rediseño se integra localmente. No publica producción, no modifica el esquema o permisos, no añade cronjobs y no cambia Seller. La consulta de próximos vencimientos permanece pendiente de integrar. Caja, bancos, obligaciones de proveedores, ingresos, costos y gastos no se inventan para completar las vistas financieras.

## Brand Commitments
Nombre Hermes y marca angular. El usuario eligió la segunda imagen oscura y las vistas posteriores con glassmorphism, y pidió integrar todas las vistas con prioridad en la consulta rápida de saldos y movimientos. El nuevo mundo usa carbón teal, cristal translúcido, luces difusas ámbar y menta, Manrope Variable y naranja de acción. La dirección y su procedencia manual se registran en `.impeccable/dark-glass-direction.md`; el sistema implementado se registra en `DESIGN.md`.

## Evidence on Hand
Código de CONCILIADOR, documentación de la base compartida con Cation y conceptos oscuros elegidos por el usuario. Los conceptos contienen datos ficticios. La revisión local utiliza fixtures identificadas, con escrituras deshabilitadas en una vista previa limitada a desarrollo y protegida por variable de entorno.

Al 6 de octubre de 2026, la evidencia verificada incluye seis vistas móviles —Visión general, Mi día, ficha, Anticipos, pagos y login— a 390 × 844px, con ancho de cliente 380px, excepto login 390px, sin desbordamiento horizontal. Incluye cinco vistas de escritorio a 1440 × 1000px, con ancho de cliente 1430px, y Mi día frente a la referencia a 1586 × 992px, con ancho de cliente 1576px y captura 1576 × 985px. La comparación válida de Mi día registra 0.6693, clasificado como `drift`; no acredita una coincidencia visual aprobada. Las comparaciones sobre pantallas de carga se excluyen de la evidencia final.

No hay un recorrido autenticado con registros reales durante esta comprobación. Los gates de Impeccable y el checkpoint humano de plan/activos siguen pendientes. Las pruebas y la compilación no acreditan por sí solas aprobación visual final ni publicación.

## Product Principles
Priorizar la consulta rápida de saldos y movimientos. Distinguir recepción registrada, verificación contable y conciliación bancaria. Distinguir dato desconocido de saldo cero. Conservar controles contables, permisos y trazabilidad. Permitir operar desde escritorio, tablet y móvil.

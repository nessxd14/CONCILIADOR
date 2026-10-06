# Hermes · integración del diseño aprobado

Petición: integrar todas las vistas elegidas; tema oscuro y glassmorphism solicitados explícitamente por el usuario. Referencias: output/hermes-vistas-oscuras-2026-10-05, en MonitorCaja. Las imágenes son conceptos con datos ficticios.

Modo Operate: consulta rápida de saldos y movimientos. Primera vista: sidebar persistente, título claro, cuatro indicadores, pagos recibidos por verificar a la izquierda y prioridades de cobro a la derecha. Cartera buscable debajo. Fondo carbón con luces difusas ámbar y menta; paneles de cristal, bordes finos, radios 14px, Manrope ya instalada. Accento naranja para acción, menta para confirmado, ámbar para verificar, azul para crédito. Paneles, indicadores y brillo pedidos por el usuario prevalecen sobre las prohibiciones genéricas del craft-floor.

Interacción: seleccionar un pago revela su detalle; verificar exige reconocimiento explícito del importe y recepción. Sin animación de carga de páginas ni cifras. Feedback de pulsación 120ms; navegación y teclado inmediatos; reduce-motion y mobile respetados.

Datos reales prevalecen sobre las cantidades ficticias del comp. No sumar crédito contra deuda de otros clientes. PROPUESTO se muestra recibido/registrado, no confirmado. No inventar flujo, caja, bancos, rentabilidad o proveedores: fuentes ausentes muestran cobertura pendiente. No modificar schema, permisos, cronjobs ni Seller; no confirmar pagos durante QA. Preview usa fixtures identificadas y no permite escritura.

## THESIS
Consulta rápida de saldos y movimientos antes de decidir el siguiente paso de cobro.

## STORY
Seller registra la recepción del pago; Hermes permite verificarlo. Registrado, verificado y conciliado con banco son estados distintos. La cartera confirmada y el crédito no se compensan entre clientes.

## FORM
Procedencia: dirección fijada por el usuario a partir de las imágenes de este chat, seleccionando el segundo tema oscuro y las vistas posteriores. No procede de un FORM seed ni de una tirada de la skill. No se inventan ese registro ni una aprobación del plan de producción. La tabla de pagos, las tres prioridades, los próximos vencimientos, la ficha con columnas Cargo/Abono y el login en dos columnas se reconstruyen desde esas referencias.

## OWN-WORLD
Carbón/teal oscuro, luces difusas ámbar y menta en public/visual/hermes-ground.png, cristal translúcido, bordes luminosos, marca angular Hermes, Manrope instalada y cifras tabulares. El prompt exacto del fondo creado con image_gen está embebido en el PNG. Texto y controles siguen en el DOM.

## FIRST VIEWPORT
Navegación persistente, Mi día financiero con subtítulo cian, cuatro indicadores con iconos semánticos grandes, tabla de pagos con total registrado y acciones naranjas, tres prioridades y bloque de próximos vencimientos. La consulta futura no se inventa: el bloque declara su integración pendiente. La cartera buscable continúa debajo. En móvil se apilan los bloques y la selección de pago dirige el foco al detalle.

## Evidencia de reproducción
Primera revisión independiente: rebuild. Reconstrucción local aplicada sobre sus ocho hallazgos. La compilación y las pruebas no equivalen a aprobación visual. El checkpoint humano de plan/activos sigue pendiente; las capturas de fixture no validan una sesión autenticada. No se sustituyen los datos reales por los importes del concepto para subir una puntuación de píxeles.

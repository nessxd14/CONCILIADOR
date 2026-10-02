---
version: 1
slug: "app-app-dia-page-tsx"
primary_target: "app/(app)/dia/page.tsx"
related_targets: ["app/(app)/clientes/[id]/page.tsx"]
---

# Mi día y ficha del cliente

Mode: Operate. Priority confirmed by user: consulta rápida de saldos y movimientos. Build path confirmed by user: functional code directly.

## Direction contract
THESIS: Un registro de cartera que permite pasar del saldo general al movimiento concreto de un cliente con una sola navegación; el saldo conserva su contexto contable.
OWN-WORLD: Registro de tesorería con superficies blancas y piedra, carbón para navegación, naranja profundo para acciones y estado activo. Tipografía sans clara, cifras tabulares y líneas suaves en los registros. Sin ilustraciones decorativas.
STORY: Consultar la cartera, localizar al cliente, leer su saldo y rastrear movimientos; las incidencias y pagos conservan su lugar y sus acciones existentes.
FIRST VIEWPORT: Navegación persistente, título y actualizar; franja de saldos con etiquetas arriba; listado de clientes dominante, tareas pendientes en columna secundaria. En ficha, cabecera del cliente, tres saldos y pestañas con Cuenta corriente como entrada.
FORM: Registro de tesorería, candidato 6 del conjunto de siete direcciones derivadas del trabajo administrativo; seed fd5ce4e5. Se conserva la identidad Hermes, con una composición nueva enfocada en consulta.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Interaction
Cambios de pestaña inmediatos con teclado estándar; feedback de pulsación de 120ms y estados de foco visibles. Movimiento reducido elimina transiciones. Mobile mantiene navegación y reorganiza registros verticalmente. La vista de pruebas usa datos sintéticos y no permite escrituras.

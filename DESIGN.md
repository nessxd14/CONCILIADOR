---
name: "Hermes"
description: "Cuentas por cobrar sobre cristal oscuro, con saldos y movimientos al alcance."
colors:
  orange: "#ff9d57"
  orange-dark: "#ffb77e"
  action: "#ffa965"
  action-hover: "#ffbd84"
  action-ink: "#1b261c"
  acreedor: "#60e4c0"
  acreedor-bg: "#133e33"
  credit: "#8ac9ff"
  info-bg: "#1a3745"
  provisional: "#ffd17a"
  provisional-bg: "#473920"
  alerta: "#ffa2a2"
  alerta-bg: "#422b2b"
  deudor-bg: "#4b3226"
  aldia: "#8fd9be"
  aldia-bg: "#163b32"
  charcoal: "#edf4f1"
  muted: "#adbfba"
  line: "#ccddd840"
  contrast-line: "#9bac9f80"
  contrast-muted: "#cbdad3"
  surface-0: "#0d1918"
  surface-1: "#20302f"
  surface-2: "#1b2a29"
  white: "#1c2c29"
  glass: "rgb(51 69 66 / 43%)"
  glass-solid: "#1c2c29"
  input-bg: "rgb(8 22 19 / 46%)"
  panel-border: "#bbd2c97a"
  control-border: "#a4b8ac40"
  secondary-bg: "#ffffff07"
  secondary-hover: "#e699491a"
  nav-active-text: "#fff2e6"
  cyan-context: "#a3ddea"
typography:
  display:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, calc(4.8vw - 36px), 2.5rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.03em"
  headline:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 3vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.035em"
  title:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1rem, 1.5vw, 1.4rem)"
    fontWeight: 650
    lineHeight: 1.5
    letterSpacing: "-.02em"
  title-client:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-.02em"
  body:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: ".875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: ".8125rem"
    fontWeight: 600
    lineHeight: 1.5
  table-body:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  action:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: ".8125rem"
    fontWeight: 600
    lineHeight: 1.5
  navigation:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: ".875rem"
    fontWeight: 500
    lineHeight: 1.5
  caption:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: ".75rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  counter: "4px"
  tag: "5px"
  control: "8px"
  notice: "10px"
  warning: "12px"
  panel: "14px"
spacing:
  "4": "4px"
  "8": "8px"
  "10": "10px"
  "12": "12px"
  "14": "14px"
  "16": "16px"
  "18": "18px"
  "20": "20px"
  "22": "22px"
  "24": "24px"
  "32": "32px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-secondary:
    backgroundColor: "{colors.secondary-bg}"
    textColor: "{colors.orange-dark}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.secondary-hover}"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.orange-dark}"
    typography: "{typography.action}"
    padding: "0"
  search-field:
    backgroundColor: "{colors.input-bg}"
    textColor: "{colors.charcoal}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "45px"
  navigation-item:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal}"
    typography: "{typography.navigation}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  navigation-item-active:
    textColor: "{colors.nav-active-text}"
    padding: "10px 12px 10px 9px"
  status-deudor:
    backgroundColor: "{colors.deudor-bg}"
    textColor: "{colors.orange-dark}"
    rounded: "{rounded.tag}"
    padding: "4px 8px"
  status-acreedor:
    backgroundColor: "{colors.acreedor-bg}"
    textColor: "{colors.acreedor}"
    rounded: "{rounded.tag}"
    padding: "4px 8px"
  status-aldia:
    backgroundColor: "{colors.aldia-bg}"
    textColor: "{colors.aldia}"
    rounded: "{rounded.tag}"
    padding: "4px 8px"
  status-provisional:
    backgroundColor: "#f2bc4f1c"
    textColor: "{colors.provisional}"
    rounded: "{rounded.tag}"
    padding: "4px 8px"
  card:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.panel}"
    padding: "22px"
  glass-panel:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.panel}"
    padding: "24px"
  balance-strip:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.panel}"
    padding: "24px 4px"
  balance-strip-cell:
    padding: "0 18px"
  balance-strip-cell-wide:
    padding: "0 16px"
  balance-strip-cell-mobile:
    padding: "0 12px"
  account-row:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal}"
    padding: "16px 22px"
  tabs:
    backgroundColor: "#ffffff05"
    textColor: "{colors.muted}"
    rounded: "{rounded.notice}"
    padding: "0 16px"
  tabs-selected:
    textColor: "{colors.orange-dark}"
  movement-table:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.panel}"
---

# Design System: Hermes

## Overview

**Creative North Star: "Cristal financiero Hermes"**

Hermes presenta la cuenta por cobrar sobre cristal oscuro: una base carbón con matiz teal, luz difusa ámbar y menta, bordes luminosos y naranja para actuar. La identidad angular de Hermes y la tipografía Manrope sostienen una interfaz financiera directa. El vidrio es un material del mundo elegido, mientras el saldo, su estado y el movimiento que lo explica conservan la prioridad de lectura.

La densidad combina cifras destacadas con registros compactos y espacios entre grupos. Cada importe mantiene su etiqueta; registrado, verificado y conciliado con banco son estados distintos. En tamaños pequeños los bloques se apilan y las tablas de consulta conservan sus relaciones mediante pares de etiqueta y valor. El fondo es una imagen atmosférica: el texto, las tablas y los controles permanecen en el DOM.

**Key Characteristics:**

- Cristal translúcido sobre carbón teal con luz difusa ámbar y menta.
- Bordes finos luminosos y resplandor suave que delimitan grupos de información.
- Marca angular Hermes, Manrope Variable y cifras tabulares.
- Naranja de acción, menta de confirmado, ámbar de revisión y azul de crédito.
- Lectura financiera con estados escritos y adaptación vertical en móvil.

Este documento registra, al 6 de octubre de 2026, la reconstrucción local iniciada el día 5. Sustituye la dirección clara y plana anterior por el nuevo mundo que el usuario eligió en la segunda imagen oscura y en las vistas posteriores. La procedencia manual está en `.impeccable/dark-glass-direction.md`; no existe un FORM seed de esta elección. La cascada normativa es `globals.css`, `anticipos.css`, `despacho.css` y finalmente `redesign.css`, con su bloque final de reconstrucción. Las referencias están en `MonitorCaja/output/hermes-vistas-oscuras-2026-10-05` y las capturas locales en `MonitorCaja/output/hermes-integracion-2026-10-05`. Documentar el código no acredita aprobación visual final, aprobación humana del plan ni un recorrido autenticado.

La sesión de revisión actual volvió a aplicar cambios de viewport. La evidencia verificada del 6 de octubre incluye seis vistas móviles —Visión general, Mi día, ficha, Anticipos, pagos y login— a (390 × 844px): ancho de cliente (380px), excepto login (390px), sin desbordamiento horizontal en esas vistas. Incluye cinco vistas de escritorio a (1440 × 1000px, ancho de cliente 1430px), con cifras comprobadas a (33.12px, altura 39.75px) en una línea, y Mi día frente a la referencia a (1586 × 992px, ancho de cliente 1576px, captura 1576 × 985px). Sus cuatro importes mantienen (40px, altura 48px), sin partirse. La evidencia anterior a (1280 × 720px, ancho de cliente 1270px) sigue identificada por su lote.

La comparación válida de Mi día registra `overall: 0.6693` y `verdict: drift` en `.impeccable/review/finish-verified-summary.json`; no representa una coincidencia de píxeles aprobada. Las comparaciones de pantallas de carga se excluyen de la evidencia final. El alcance se limita a los estados y vistas capturados y no cierra los gates de Impeccable ni la validación autenticada.

## Colors

El carbón teal contiene la luz cálida de las acciones y los tonos fríos de lectura. Los valores del frontmatter son normativos; los nombres siguientes explican su uso.

### Primary

- **Naranja Hermes** (`orange`): marca, caret, foco de búsqueda, subrayado de pestañas y detalles operativos.
- **Naranja legible** (`orange-dark`): enlaces, acción secundaria y contorno general de teclado.
- **Naranja de acción** (`action`, `action-hover`, `action-ink`): botón primario con tinta oscura; el hover sube el tono de la superficie.
- **Velo de acción** (`secondary-bg`, `secondary-hover`): botón secundario con borde naranja; el fondo cambia suavemente en hover.

### Secondary

- **Menta confirmada** (`acreedor`, `acreedor-bg`): importes confirmados destacados, abonos, pagos verificados y crédito individual en la cuenta.
- **Azul de crédito** (`credit`): saldo a favor agregado, crédito y enlaces al expediente; también es la tinta informativa heredada.
- **Ámbar de revisión** (`provisional`, `provisional-bg`): recepción registrada que falta verificar, estados y avisos de cobertura pendiente.
- **Coral de incidencia** (`alerta`, `alerta-bg`): errores y estados vencidos o pendientes acompañados de su descripción.
- **Terracota de deuda** (`deudor-bg`) y **menta de equilibrio** (`aldia`, `aldia-bg`): etiquetas compactas de situación de una cuenta.
- **Cian de contexto** (`cyan-context`): subtítulo financiero y mensaje de próximos vencimientos aún no integrado.
- **Azul de aviso** (`info-bg`): fondo informativo de despacho en sincronización.

### Neutral

- **Carbón de fondo** (`surface-0`): página y alternativa sin imagen.
- **Cristal principal** (`glass`): superficies translúcidas; **cristal sólido** (`glass-solid`, `white`): fallback opaco, modal y superficies heredadas. `white` conserva su nombre de variable histórico, pero ahora representa una superficie oscura.
- **Capas de apoyo** (`surface-1`, `surface-2`, `input-bg`): campos deshabilitados, etiquetas neutras y entrada de datos.
- **Texto de registro** (`charcoal`) y **contexto** (`muted`): tinta clara principal y metadatos. `charcoal` conserva el nombre histórico de la variable, pero ahora representa texto claro.
- **Línea de registro** (`line`), **borde de cristal** (`panel-border`) y **borde de control** (`control-border`): divisores, contenedores y campos. `contrast-line` y `contrast-muted` refuerzan bordes y contexto al pedir mayor contraste.
- **Texto activo cálido** (`nav-active-text`): selección de navegación sobre su velo naranja.

**The Semantic Color Rule.** Cada cifra conserva una etiqueta contable y cada estado conserva texto. El naranja señala acción o selección; menta, ámbar y azul ayudan a distinguir confirmado, por verificar y crédito sin reemplazar su explicación.

## Typography

**Display Font:** Manrope Variable, con Segoe UI y la pila sans del frontmatter como fallback.

**Body Font:** la misma familia, servida localmente por `@fontsource-variable/manrope`.

**Character:** una sans clara con pesos variables y títulos compactos. Las cifras usan números tabulares; el volumen y el contexto reciben jerarquía sin una segunda voz tipográfica.

### Hierarchy

- **Display** (`display`): importes dentro de la franja de indicadores. La fórmula fluida conserva el máximo (2.5rem) en escritorio amplio y se adapta antes de alcanzarlo. A (1300px) usa `clamp(1.375rem, 1.875vw, 1.6875rem)`; a (760px) queda en (1.25rem). El importe del detalle de pago usa (2rem, peso 650).
- **Headline** (`headline`): título de página. A (760px) usa (1.75rem); el nombre del cliente conserva su variante (25px) en ese ancho.
- **Title** (`title`): encabezados de panel. `title-client` describe los encabezados interiores de ficha; las condiciones de crédito usan (1.125rem).
- **Body** (`body`): contenido y campos. **Table body** (`table-body`): datos de las tablas de pagos y movimientos en escritorio; sus encabezados y el medio de pago usan (0.875rem), al igual que sus celdas móviles. Los textos de cobertura aumentan el interlineado hasta (1.7), con máximo (65ch).
- **Label / Action** (`label`, `action`): campos y controles. **Navigation** (`navigation`): destinos de sidebar, con peso 500. El estilo final de navegación se aplica también al menú móvil.
- **Caption** (`caption`): ayuda, descripción de indicadores y referencias. Las etiquetas de estado usan (0.6875rem, peso 600, line-height 1.4).

El login tiene una expresión propia del mismo sistema: marca grande, titular fluido y formulario amplio. Su bloque narrativo se centra verticalmente; el titular usa `clamp(2.5rem, 3.7vw, 3.65rem)`, peso (750), interlineado (1.15) y no impone un máximo por caracteres. El formulario usa `clamp(1.75rem, 2.6vw, 2.6rem)` con interlineado (1.2). Son variantes de esa superficie, no sustitutos para todos los encabezados.

**The Aligned Figures Rule.** Los importes usan cifras tabulares y conservan Cargo, Abono y Saldo corrido como columnas distintas. Al pasar a móvil, cada cifra mantiene la etiqueta de su columna.

## Layout

La shell de escritorio usa sidebar (220px), contenido flexible y separación (16px), con padding exterior (8px). La sidebar es sticky, empieza a (8px) y ocupa `calc(100dvh - 16px)`. El contenido tiene máximo (1680px), ancho completo y padding (16px 18px 32px 24px). Los encabezados envuelven título y acciones cuando lo necesitan.

La composición de consulta combina columnas flexibles con panel auxiliar: Mi día usa proporción (1.85fr / 1fr), mínimo auxiliar (300px) y separación (16px); ficha usa (1.8fr / 1fr), mínimo auxiliar (290px) y separación (18px). Resumen, cobertura y revisión conservan proporciones propias dentro del mismo patrón. Los indicadores forman cuatro columnas; en ficha son tres. Sus divisores separan cantidades dentro de una sola superficie.

A (1300px), Mi día reduce el mínimo auxiliar a (260px) y compacta su tabla y cifras. A (1200px), resumen y cobertura mantienen dos columnas con auxiliar de mínimo (260px); revisión permanece en dos hasta (1000px). A (1000px), el contenido principal pasa a una columna, las tareas y el lateral de ficha pueden formar dos y los indicadores se reparten en dos. El login pasa a una columna, oculta la narrativa y muestra la marca dentro del formulario.

A (760px), la sidebar se vuelve cabecera opaca, sin borde redondeado ni blur. Un botón Menú abre destinos en dos columnas; Escape lo cierra. El contenido usa padding (24px 16px 32px). Tareas y lateral de ficha se apilan; cuenta corriente precede a condiciones de crédito. Las tablas de pagos y movimientos conservan la semántica de tabla y muestran etiquetas con `data-label`; el resto de tablas operativas puede desplazarse horizontalmente.

El espaciado usa los pasos reales del frontmatter, sin imponer una retícula nueva. Panel genérico de vidrio: (24px), móvil (20px). Tarjeta heredada: (22px). Encabezados, filtros, filas y pies distribuyen el padding dentro del registro. Los movimientos usan celdas (16px 14px), con fila móvil (17px) y celdas (4px 0); la tabla de pagos usa celdas (17px 10px), reducidas a (15px 7px) a (1300px). Las células de la franja usan padding lateral (18px) por defecto, (16px) desde (1301px) y (12px) en móvil; la reducción amplia deja espacio a las cifras grandes. Icono e importe de indicador se separan (10px), móvil (7px).

## Elevation & Depth

El mundo combina transparencia, desenfoque, borde y resplandor. El fondo `/visual/hermes-ground.png` aporta luz atmosférica; los paneles revelan esa luz sin incorporar texto o controles a la imagen. La imagen generada es opaca (1586 × 992px, 1,505,611 bytes); el prompt exacto está embebido en el PNG. La petición de generación no constituye una medida del archivo entregado.

### Shadow Vocabulary

- **Cristal de registro:** `inset 0 1px 1px #e2ede957, inset 0 0 24px #ffffff06, 0 0 14px #f6a36218`; aplicado a tarjetas, tablas, registros, tareas, franja y login antes de su variante.
- **Cristal de navegación:** `inset 0 1px 1px #e2ede975, inset 0 0 20px #fcb27510, 0 0 12px #ffa65a25`; refuerza el borde del panel persistente.
- **Selección cálida:** `inset 0 0 0 1px #ffaa6766, inset 0 0 17px #ff9f4233, 0 0 8px #ff9d571f`; acompaña el gradiente y borde izquierdo del destino activo.
- **Cristal de acceso:** `inset 0 1px 2px #ffcf8fc2, inset 0 0 30px #ff9b4321, 0 0 26px #ff9e5724`; variante luminosa del formulario de login.

Paneles de vidrio, registros, franja, tareas y login usan blur (12px); sidebar conserva (16px). Las tarjetas y la tabla de movimientos reciben cristal y resplandor sin añadir un blur propio. El modal usa fondo sólido con backdrop (`#06120ec4`).

**The Readable Glass Rule.** El vidrio conserva texto claro, borde visible y fondo oscuro. Con transparencia reducida o mayor contraste se retira la imagen, los paneles de consulta y la sidebar pasan a cristal sólido y se elimina su blur. No se reemplaza esa preferencia por una versión translúcida nueva.

`prefers-contrast: more` además cambia el contexto a `contrast-muted`, los divisores a `contrast-line` y hace que los bordes de panel y sidebar usen esa línea reforzada. Sin soporte de `backdrop-filter`, sidebar, paneles de vidrio, registros, franja y login usan cristal sólido. En impresión, el fondo pasa a blanco y la tinta general pasa a oscura; no se acredita una revisión de impresión completa.

## Shapes

Los grupos usan esquinas suaves de panel; controles y estados son más compactos. Los radios normativos son `panel`, `warning`, `notice`, `control`, `tag` y `counter`; los bordes de contenedor y campo son de (1px). Las barras de distribución y crédito usan radio (3px). El avatar de usuario es circular; el de cliente es cuadrado suavizado.

La marca Hermes es SVG angular de relleno, con lienzo (32 × 32), sin una baldosa naranja detrás. En sidebar ocupa (34 × 36px); en la narrativa de login aumenta a (78 × 86px). Los iconos operativos son SVG de trazo redondeado (stroke 1.7, lienzo 24 × 24); la navegación usa (21px) y los indicadores usan (36px), reducidos a (28px) y (24px) según ancho. Los controles solo de icono tienen etiqueta accesible.

## Components

### Buttons

Acciones visibles con texto concreto y feedback breve.

- **Primary:** naranja de acción con tinta oscura, radio `control`, borde cálido (`#ffd09780`), padding (10px 16px) y altura mínima (44px). Hover de puntero fino usa `action-hover`.
- **Secondary:** velo transparente, texto naranja y borde (`#ffab6766`); hover usa `secondary-hover` y borde (`#ffb77e88`).
- **Link:** sin superficie ni padding, texto `orange-dark`. La altura (36px) del selector `.btn-link` no sustituye el tamaño de los controles que también usan `.btn`.
- **Focus / press:** contorno (3px, offset 4px) en `orange-dark`; pulsación a escala (.97) durante (120ms) con `cubic-bezier(0.23, 1, 0.32, 1)`. Disabled usa opacidad (.6). Movimiento reducido elimina transformaciones y reduce animaciones y transiciones a (.01ms).
- **Login:** botón con gradiente `#ffa650` → `#ed7834`, texto (`#1a241a`), altura mínima (58px) y tamaño (1.125rem); esta variante pertenece al formulario de acceso.

### Chips

Estados escritos, con color al servicio de la lectura.

- **Shape:** radio `tag`, padding (4px 8px) y tipografía de estado compacta.
- **Account:** Con deuda, A favor y Al día usan sus fondos tonales.
- **Review:** Por verificar usa velo ámbar y borde (`#e7b95550`); dentro de la tabla de Mi día cambia a fondo `provisional`, tinta (`#242a1c`) y borde (`#ffdb94`). A (1300px) esa etiqueta compacta usa (0.625rem, padding 4px 5px).
- **Counters:** radio `counter` y cifras tabulares. Las etiquetas de estado son información, no controles de filtro.

### Cards / Containers

Cristal delimitado para contener un grupo, sin fragmentar cada cifra.

- **Surface:** `glass`, radio `panel`, borde `panel-border` y resplandor de registro. Las variantes sólidas y el blur se describen en Elevation & Depth.
- **Padding:** tarjeta (22px), panel de vidrio (24px), móvil (20px); tareas usan (18px 16px) en el bloque final.
- **State:** filas interactivas aclaran suavemente su superficie en hover. La fila seleccionada de revisión usa fondo (`#ff9d5721`) y contorno interior (`#ffad72ba`).
- **Feedback:** carga, fallo, vacío, consulta sin coincidencias y fuente pendiente tienen mensajes distintos dentro del panel. Una fuente pendiente puede conservar la estructura de la vista sin fabricar un saldo.

### Inputs / Fields

Entrada oscura y foco nítido.

- **Style:** fondo `input-bg`, borde `control-border`, radio `control`, altura mínima (44px), padding horizontal (12px) y texto de body.
- **Search:** icono (18px), gap (9px), input interior (43px); foco de contenedor (2px, offset 2px) en `orange`. El buscador de movimientos tiene máximo (480px).
- **Disabled / error:** campo deshabilitado sobre `surface-1`, tinta `muted`; error coral acompañado de texto. Select usa opciones sobre cristal sólido.
- **Login:** campo de mínimo (54px), fondo (`#ffffff05`) y borde (`#c9d8d19c`).

### Navigation

Destinos con icono de trazo y selección cálida sobre cristal.

- **Default:** texto de registro, peso 500, radio `control`, mínimo (50px), gap (11px), padding (10px 12px).
- **Active:** gradiente `#ef8a394d` → `#b46a2938`, texto `nav-active-text`, borde izquierdo (`3px solid #ffa34f`) y resplandor de selección; padding izquierdo (9px) compensa el borde.
- **Mobile:** cabecera opaca y menú expandible en dos columnas. La selección conserva texto, icono y `aria-current`; el botón comunica `aria-expanded`.
- **Tabs:** superficie sutil, radio `notice`, scroll horizontal y padding de grupo (0 16px); cada destino usa (15px 16px), móvil (15px 12px). Selección por subrayado naranja (2px), texto naranja y peso 600. Flechas, Home y End cambian selección y foco inmediatamente; paneles inactivos usan `hidden`.

### Registro de pagos y cuenta corriente

La firma financiera es un importe que conserva origen, estado y explicación.

- **Indicators:** una superficie compartida; cuatro cantidades en cartera y tres en ficha. El icono grande forma pareja con el importe, debajo permanecen etiqueta y contexto. Crédito y deuda se muestran por separado.
- **Payments:** tabla con Cliente, Medio, Importe, Estado y Acción; el total es registrado, pendiente de verificar y usa (1.25rem). La acción Revisar es un control naranja compacto de mínimo (36px), padding (7px 12px). En móvil la etiqueta ocupa (70px) y el valor la columna flexible.
- **Priorities:** filas interiores con icono (34px), cifra (1.625rem), frase y contexto. Su estructura puede mostrar una consulta pendiente sin convertirla en cero.
- **Movements:** Fecha, Movimiento, Cargo, Abono y Saldo corrido; cifras a la derecha. En móvil, etiqueta de (100px) y columna flexible. La búsqueda usa los movimientos cargados; el botón de anteriores conserva la paginación.
- **Review detail:** selección de un pago abre origen, comprobante y secuencia de estados. En móvil/tablet el foco pasa al detalle. El reconocimiento explícito precede al botón Verificar; loading y error conservan su texto y no anticipan éxito.

## Do's and Don'ts

### Do:

- **Do** conservar el cristal oscuro, los bordes luminosos y la marca angular del mundo elegido.
- **Do** mantener cada saldo con su etiqueta y los estados registrado, verificado y conciliado diferenciados.
- **Do** usar Manrope Variable, cifras tabulares y columnas Cargo, Abono y Saldo corrido.
- **Do** mantener foco visible, texto de estado y la adaptación móvil de tablas a etiqueta y valor.
- **Do** respetar las variantes opacas de transparencia reducida y mayor contraste.
- **Do** dejar el texto y los controles en el DOM sobre el fondo atmosférico.

### Don't:

- **Don't** reemplazar una fuente pendiente o un saldo desconocido por cero o por importes del concepto visual.
- **Don't** presentar un pago registrado por verificar como confirmado o conciliado con banco.
- **Don't** compensar el crédito de un cliente contra la deuda de otro.
- **Don't** extender la variante luminosa del login a todos los controles y registros.
- **Don't** introducir animaciones de cifras o de carga de páginas en la consulta financiera.
- **Don't** heredar rótulos residuales en mayúsculas como una nueva escala tipográfica.

Deriva registrada, no canonizada: los rótulos de Partidas y seguimiento en ClientDetail, y `origen-eyebrow` en las vistas heredadas, mantienen mayúsculas compactas; el rótulo redundante de Anticipos fue retirado. Los rótulos restantes no se incorporan a la escala ni a las muestras. La aprobación humana de plan/activos y la validación con sesión autenticada siguen pendientes; este documento registra el código local y no convierte esos pendientes en una aprobación visual final.

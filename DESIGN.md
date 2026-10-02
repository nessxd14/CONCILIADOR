---
name: "Hermes"
description: "Registro de tesorería para consultar saldos y movimientos de cuentas por cobrar."
colors:
  orange: "#c45121"
  orange-dark: "#a53f16"
  focus: "#ba542a"
  acreedor: "#27704d"
  acreedor-bg: "#eaf5ed"
  provisional: "#855f14"
  provisional-bg: "#fff5df"
  alerta: "#ac3737"
  alerta-bg: "#fbeeed"
  info: "#3a7396"
  info-bg: "#e9f1f6"
  deudor: "#a54420"
  deudor-bg: "#fcefE8"
  aldia: "#54705d"
  aldia-bg: "#edf2ee"
  charcoal: "#242827"
  muted: "#656c68"
  line: "#e0e5e1"
  surface-0: "#f6f7f4"
  surface-1: "#eef1ed"
  surface-2: "#f3f5f1"
  white: "#fff"
  control-border: "#d1d9d2"
  nav-text: "#c3cbc5"
  nav-active: "#3b4240"
  nav-hover: "#39403b"
  nav-accent: "#f29b6e"
typography:
  display:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(24px, 2.5vw, 36px)"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-.035em"
  headline:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(26px, 3vw, 34px)"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-.035em"
  title:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
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
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.5
  action:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  navigation:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
  caption:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  counter: "4px"
  tag: "5px"
  control: "8px"
  notice: "10px"
  panel: "14px"
spacing:
  "4": "4px"
  "8": "8px"
  "10": "10px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "22": "22px"
  "24": "24px"
  "32": "32px"
components:
  button-primary:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.white}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.orange-dark}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.charcoal}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.orange-dark}"
    typography: "{typography.action}"
    padding: "0"
  search-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.charcoal}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "45px"
  navigation-item:
    backgroundColor: "transparent"
    textColor: "{colors.nav-text}"
    typography: "{typography.navigation}"
    rounded: "{rounded.control}"
    padding: "12px"
  navigation-item-active:
    backgroundColor: "{colors.nav-active}"
    textColor: "{colors.white}"
  status-deudor:
    backgroundColor: "{colors.deudor-bg}"
    textColor: "{colors.deudor}"
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
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.panel}"
    padding: "22px"
  account-row:
    backgroundColor: "{colors.white}"
    textColor: "{colors.charcoal}"
    padding: "16px 22px"
  tabs:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    padding: "14px 0"
  tabs-selected:
    textColor: "{colors.orange-dark}"
  movement-table:
    backgroundColor: "{colors.white}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.panel}"
---

# Design System: Hermes

## Overview

**Creative North Star: "Registro de tesorería"**

Hermes presenta las cuentas por cobrar como un registro de tesorería: superficies blancas y piedra, navegación de carbón y naranja profundo para actuar. La voz es sobria y directa. Los saldos, sus etiquetas y el movimiento que los explica reciben prioridad visual; el color acompaña el significado contable.

La densidad permite recorrer nombres, cifras y estados con rapidez, con aire entre grupos y reglas suaves dentro de cada registro. Manrope Variable aporta una sans clara; las cifras tabulares mantienen columnas estables. El mundo elegido prescinde de ilustraciones decorativas y utiliza iconos de trazo para identificar acciones.

**Key Characteristics:**
- Superficies planas de blanco y piedra con bordes suaves.
- Navegación de carbón y acciones de naranja profundo.
- Cifras tabulares con etiquetas y contexto contable visibles.
- Registros que se reorganizan verticalmente en móvil.

Este documento describe la implementación local de Mi día y la ficha del cliente. La fuente normativa es la cascada de `app/globals.css`, `app/anticipos.css`, `app/despacho.css` y, al final, `app/redesign.css`, junto con Dashboard, ClientDetail, Sidebar y Tabs. Las cuatro capturas finales de escritorio y móvil en `.impeccable/review/` corroboran su aplicación. La fuente se sirve localmente mediante `@fontsource-variable/manrope` (5.3.0); su archivo de licencia declara SIL Open Font License 1.1.

## Colors

La paleta combina piedra ligeramente verdosa y carbón con un naranja profundo; los colores de estado mantienen una función semántica. Los valores exactos viven en el frontmatter; estos nombres explican su aplicación.

### Primary

- **Naranja de acción** (`orange`): fondo de confirmar y otras acciones primarias; también caret y foco del buscador.
- **Naranja profundo** (`orange-dark`): hover de acción primaria, enlaces de acción y texto de pestaña seleccionada.
- **Naranja de foco** (`focus`): contorno de teclado de los controles generales.
- **Naranja sobre carbón** (`nav-accent`): icono del destino activo en la navegación oscura.

### Secondary

- **Verde de crédito** (`acreedor`, `acreedor-bg`): saldo a favor, importes negativos y estados de pago o crédito.
- **Ámbar de revisión** (`provisional`, `provisional-bg`): importes provisionales y pagos aún en revisión.
- **Rojo de incidencia** (`alerta`, `alerta-bg`): errores y estados pendientes o vencidos.
- **Azul informativo** (`info`, `info-bg`): la nota heredada de despacho en sincronización; conserva su carácter informativo.
- **Terracota de deuda** (`deudor`, `deudor-bg`): etiqueta de cuenta con deuda, sin competir con la acción principal.
- **Verde gris de equilibrio** (`aldia`, `aldia-bg`): etiqueta de cuenta al día.

### Neutral

- **Carbón** (`charcoal`): texto principal y fondo de la navegación.
- **Piedra de página** (`surface-0`): fondo general; **piedra de apoyo** (`surface-1`, `surface-2`): documentos, campos deshabilitados y etiquetas neutras.
- **Blanco de registro** (`white`): tarjetas, paneles y campos.
- **Gris de contexto** (`muted`): descripciones, etiquetas de columnas y metadatos.
- **Línea de registro** (`line`): divisores y contenedores; **borde de control** (`control-border`): inputs, select y botón secundario.
- **Texto de navegación** (`nav-text`), **selección de carbón** (`nav-active`) y **carbón de hover** (`nav-hover`): estados legibles dentro de la barra lateral.

**The Semantic Color Rule.** El naranja identifica acción y selección; verde, ámbar y rojo acompañan estados contables explícitos. Cada estado conserva su texto para que el color no sea el único indicador.

## Typography

**Display Font:** Manrope Variable, con Segoe UI y la pila sans del frontmatter como fallback.
**Body Font:** la misma familia; no hay una segunda voz de display ni fuente monoespaciada.

**Character:** una sans de lectura directa, con pesos variables para jerarquía y cifras tabulares para lectura contable. Los títulos usan un ajuste de tracking compacto; las etiquetas operativas mantienen caja natural.

### Hierarchy

- **Display** (`display`): saldo principal fluido; la ficha usa una variante fija (30px) y el móvil mantiene el saldo principal (32px).
- **Headline** (`headline`): título de página fluido; el nombre del cliente baja a (25px) en móvil.
- **Title** (`title`): encabezados de registro; tareas usan una variante compacta (15px). **Title client** (`title-client`): encabezados del panel de la ficha.
- **Body** (`body`): texto general y campos. Las descripciones de ficha y filas de movimientos usan (13px); el contexto auxiliar usa (12px).
- **Label** (`label`): etiquetas de formulario. **Action** (`action`): botones y enlaces operativos. **Navigation** (`navigation`): destinos de la barra.
- **Caption** (`caption`): categorías, notas de fila y detalles menores. Las etiquetas de estado usan (11px, peso 600, line-height 1.4).

**The Aligned Figures Rule.** Los importes usan cifras tabulares; en registros de escritorio se alinean a la derecha y conservan su etiqueta al reorganizarse en móvil.

## Layout

La estructura de escritorio combina una barra lateral persistente (236px, altura 100dvh) con contenido flexible, sin ancho mínimo de página. El contenido se centra dentro de un máximo (1680px), con padding vertical (34px arriba, 30px abajo) y lateral fluido (`clamp(20px, 3.2vw, 52px)`). El encabezado puede envolver título y acciones.

El registro principal y el trabajo auxiliar forman dos columnas (`minmax(0, 1fr)` y 300px), separadas por (24px). La franja de saldos usa tres columnas (`1.3fr 1fr 1fr`), líneas horizontales y divisores entre cantidades. Las filas de cuentas alinean nombre, estado e importe; las tablas de movimientos conservan fecha, concepto, monto y saldo corrido.

En el punto de adaptación (1200px), la barra baja a (210px), el contenido usa padding (28px 24px), el registro queda en una columna y los bloques auxiliares ocupan dos columnas. En el punto de adaptación (760px), la barra pasa arriba con destinos horizontales desplazables; el contenido usa padding (26px 18px). El saldo principal ocupa una fila completa y los dos saldos secundarios se reparten la siguiente. Las tareas forman una sola columna. Las cuentas se recomponen en nombre a la izquierda y monto/estado a la derecha. Los movimientos se convierten en pares de etiqueta y valor manteniendo la tabla semántica; otras tablas heredadas mantienen desplazamiento horizontal.

El espaciado reutilizado está registrado por su medida real. No hay una retícula estricta de múltiplos de ocho: (20px), (22px) y (24px) conviven en contenedores y separación de grupos. Los paneles de movimientos usan celdas (18px 20px) y filas móviles con padding (17px).

## Elevation & Depth

El sistema es plano y no define sombras. El blanco de los registros contrasta con la piedra de página; bordes suaves y líneas dividen conjuntos sin elevar cada elemento. El modal usa el mismo contenedor blanco y un backdrop (`rgb(25 34 29 / 45%)`) para separar la tarea.

**The Flat Ledger Rule.** Los registros descansan sobre superficies planas. La jerarquía se construye con tono, borde y espacio; no con sombras de tarjetas.

## Shapes

Los contenedores tienen una curva suave de panel; los controles usan una curva más pequeña y los estados una esquina compacta. Los radios normativos son `panel`, `control`, `notice`, `tag` y `counter`. Los bordes de panel y control son sólidos (1px). Los avatares de cliente son cuadrados suavizados; el avatar de usuario y los indicadores puntuales son círculos. Los iconos son SVG de trazo redondeado (stroke 1.7, lienzo 24 × 24), usados como apoyo a texto o con una etiqueta accesible en controles solo de icono.

## Components

### Buttons

Acciones compactas y explícitas, con texto antes que adorno.

- **Shape:** radio `control`, altura mínima (42px) y padding `button-primary`/`button-secondary`; las acciones de cabecera móviles usan (40px) y confirmar pago en columna usa (36px).
- **Primary:** naranja de acción y texto blanco; hover de puntero fino usa naranja profundo.
- **Secondary:** blanco, texto carbón y borde de control; hover usa fondo (`#f1f5ef`) y borde (`#aab7ac`).
- **Link:** texto naranja profundo sobre fondo transparente, sin padding adicional.
- **Focus / press:** foco general (3px, offset 4px); la pulsación de botones con superficie escala a (.97) durante (120ms) con `--ease-out`. El estado disabled usa opacidad (.55). Movimiento reducido elimina la transformación y reduce transiciones a (.01ms).

### Chips

Estados de lectura, sin simular un control.

- **Style:** radio `tag`, padding (4px 8px), tipografía compacta y fondo tonal según el estado; la cuenta con deuda, a favor o al día conserva el texto.
- **State:** las etiquetas no son filtros seleccionables. Los contadores de navegación y pestaña usan radio `counter` y cifras tabulares.

### Cards / Containers

Registros delimitados y planos.

- **Corner Style:** radio `panel`; fondo blanco y borde `line` (1px).
- **Internal Padding:** tarjeta base (22px); tareas (22px 20px 12px). Los paneles de registro distribuyen su padding entre encabezado, filtros, filas y pie.
- **State:** la tarjeta enlazada de la ficha cambia a fondo (`#fafcf8`) y borde (`#b7c7b8`) en hover de puntero fino. No usa sombra.

### Inputs / Fields

Campos blancos con borde claro y feedback de foco explícito.

- **Style:** borde de control, radio `control`, tipografía de body, altura mínima (44px) y padding horizontal (12px).
- **Search:** icono de búsqueda de (18px), input interior de altura (43px) y separación (9px); el campo de movimientos tiene máximo (480px).
- **Focus:** la búsqueda usa contorno naranja de (2px, offset 2px) en `focus-within`; los campos generales conservan el foco visible de teclado.
- **Error / Disabled:** errores en rojo con texto (13px); campos deshabilitados sobre piedra de apoyo y texto muted. La pista no disponible conserva una frase o raya.

### Navigation

Una base de carbón con destinos legibles y selección tonal.

- **Default:** texto `nav-text`, icono de (19px), radio `control`, padding (12px), altura mínima (45px).
- **Hover / active:** hover tonal y texto blanco; el destino activo usa `nav-active`, texto blanco e icono `nav-accent`.
- **Mobile:** destinos de una sola línea, tamaño (12px), altura mínima (44px) y scroll horizontal. Las pestañas de ficha también conservan scroll horizontal; selección por subrayado naranja (2px), texto naranja profundo y peso 600.
- **Keyboard:** las pestañas responden a flechas, Home y End; selección inmediata y foco del destino seleccionado. Los paneles inactivos usan `hidden`.

### Registro de cuentas y movimientos

La firma del mundo es una cifra que mantiene su explicación al cambiar el ancho.

- **Cuentas:** filas enlazadas de altura mínima (77px), separación de columnas (14px), nombre en peso 600 y estado escrito; hover de fila sobre (`#f8faf6`).
- **Movimientos:** encabezados en (12px, peso 500), contenido en (13px), fecha atenuada e importes tabulares a la derecha. En móvil, cada celda conserva su etiqueta mediante `data-label`, con columna de etiqueta (100px).
- **Feedback:** cargas, fallos, resultados vacíos y búsquedas sin coincidencias se expresan con texto dentro de su registro. El buscador de movimiento acepta el nombre visible, fecha, referencia y los demás datos cargados; no sugiere una búsqueda global de datos aún no consultados.

## Do's and Don'ts

### Do:

- **Do** mantener las etiquetas y la explicación junto a los saldos confirmado y provisional.
- **Do** usar Manrope Variable y cifras tabulares para importes y contadores.
- **Do** conservar el foco visible y los textos de estado además del color.
- **Do** adaptar las filas a pares de etiqueta y valor en móvil.
- **Do** usar las superficies, radios y estados registrados en los tokens.

### Don't:

- **Don't** introducir ilustraciones decorativas en el registro de tesorería.
- **Don't** sustituir un saldo no disponible por una cifra cero.
- **Don't** convertir toda cifra o contenedor en un acento naranja.
- **Don't** añadir sombras de tarjeta a los registros planos.
- **Don't** heredar los rótulos residuales en mayúsculas como una nueva escala tipográfica.

Deriva registrada, no canonizada: ClientDetail conserva rótulos heredados en mayúsculas para Partidas/Anticipos y «Frenando el cobro» (11px, peso 700, tracking .03em). No se incluyen en la escala ni en los componentes de referencia porque contradicen la terminación elegida; documentar no los repara ni los convierte en regla para nuevas superficies.

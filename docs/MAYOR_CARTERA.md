# Mayor de cartera del Conciliador

Actualizado el 19 de octubre de 2026 (America/La_Paz).

El usuario eligio un libro auxiliar global del Conciliador cuyo foco es la evolucion
del saldo a cobrar, con todos los movimientos de la cuenta. La cobertura corresponde
a la cartera existente: MAYORISTA, INSTITUCIONAL y CORPORATIVO. Las ventas directas
de Caja/Seller no forman parte de esta vista.

## Implementacion local

- `/mayor`, enlazado como **Mayor de cartera**, consulta con la sesion validada del
  usuario y conserva RLS. No usa una clave privilegiada ni amplia permisos.
- `v_mayor_auxiliar` aporta los movimientos ya contabilizados de `movimiento_cuenta`.
  La lectura toma un ID maximo y las fechas efectivas hasta el cierre solicitado;
  recupera el historial anterior para calcular el saldo inicial correctamente.
- Cada pagina se contrasta con un conteo exacto; una lectura truncada, fallida o cuyo
  conteo cambia se presenta como no disponible, sin mostrar saldos parciales.
- La agregacion se hace en el servidor Next.js con Decimal.js sobre el historial
  completo seleccionado. No se requieren migraciones ni escrituras en la base.
- Para historiales superiores a 100.000 movimientos se bloquea este lector y se
  solicita una consulta agregada en Postgres antes de presentar cifras.
- `/vista-previa/mayor` usa ejemplos sinteticos y requiere modo desarrollo con
  `HERMES_UI_PREVIEW=1`. La ruta se bloquea fuera de ese modo.

## Que muestra

Cuatro cifras explican la deuda: saldo inicial por cobrar, aumento de deuda,
disminucion de deuda y saldo final por cobrar. La igualdad es:

`inicial + aumento - disminucion = final`

Por separado muestra el saldo a favor inicial/final y los cargos/abonos contables.
Una fila incluye fecha efectiva, cliente, documento, tipo, cargo, abono, saldo del
cliente y saldo por cobrar de toda la seleccion despues del movimiento. Su detalle
incluye autor registrado, fecha de registro, referencia, motivo, saldo anterior/nuevo
y enlaces a la cuenta y al expediente. No se presenta al autor del movimiento como
el cobrador original cuando esa identidad no figura en la fuente.

Filtros del saldo: periodo por fecha efectiva, cliente y categoria. Busqueda y filtro
por tipo solo acotan las filas visibles; los saldos mantienen el conjunto del periodo
y clientes seleccionados, para no fabricar saldos al esconder movimientos.

La tabla pagina de 50 en 50 y la exportacion CSV incluye todos los movimientos que
coinciden con esos filtros de lista. Los saldos exportados siguen siendo los del mayor
completo de esa seleccion, incluyendo filas ocultas por busqueda/tipo. El CSV escapa
comillas/separadores y protege los textos que pueden interpretarse como formulas.

## Reglas financieras

1. El saldo a cobrar es la suma de las deudas positivas de cada cliente; el credito
   de otro cliente no lo reduce. Si uno debe 1.000 y otro tiene 300 a favor, el reporte
   mantiene 1.000 por cobrar y 300 a favor, con saldo neto 700.
2. Un cargo puede consumir credito previo sin aumentar la deuda. Un abono puede
   liquidar una deuda y generar credito. Por eso el total de cargos/abonos puede
   diferir del aumento/disminucion de lo que falta cobrar.
3. Aperturas, regularizaciones, notas de credito y ajustes SI pertenecen a este libro
   cuando tienen movimientos contables. No son necesariamente entradas de dinero.
4. Los pagos por verificar no reducen el saldo confirmado hasta contabilizarse.
5. Los clientes con saldo cero conservan sus movimientos y pueden consultarse.
6. No se combinan ni duplican los movimientos de Caja y los pagos de Hermes: el mayor
   utiliza exclusivamente los movimientos contables del Conciliador.
7. Los movimientos se ordenan por fecha efectiva e ID, igual que la vista de origen.
   El saldo inicial incluye todo el historial anterior al inicio del filtro.
8. No se inventan motivos, autores, roles o fechas historicas faltantes.

## Verificacion

Las pruebas cubren deuda/credito separados, cargo contra anticipo, cliente saldado,
periodo sin actividad, regularizaciones, categorias, limites de fechas, orden estable,
centavos exactos, exportacion completa y segura, paginacion incompleta y cambiante,
acceso sin sesion y errores sin saldos ficticios. La revision visual local utiliza
datos sinteticos identificados.

Se contrastaron los saldos calculados con agregados independientes de PostgreSQL,
sin cambios en los registros. En el navegador se verificaron detalle, filtro por
tipo, cuenta saldada, periodo sin movimientos y descarga CSV.

La copia real de la base y Storage sigue pendiente. Esta entrega no aplica SQL ni
modifica registros, cobros, partidas o saldos existentes. No se ha publicado esta
pantalla en produccion como parte de este desarrollo local.

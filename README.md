# Hermes

Libro auxiliar de cuentas por cobrar con Next.js, React y Supabase. La interfaz prioriza la consulta de saldos y movimientos, el seguimiento de expedientes y la verificación de pagos registrados en el POS.

## Desarrollo local

```bash
npm ci
```

Copiar `.env.example` a `.env.local` y configurar el proyecto y la clave publicable correspondiente:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave-publicable>
NEXT_PUBLIC_SUPABASE_SCHEMA=hermes
```

```bash
npm run dev
```

En Cation, el POS y almacén usan `public` y Hermes usa `hermes`, con autenticación compartida. El esquema debe estar expuesto por la Data API y contar con los permisos, RLS y funciones de dominio del backend. Si se omite la variable de esquema se mantiene `public` por compatibilidad; otros valores se rechazan.

El acceso se valida con la sesión autenticada y `rol_actual()`. En Cation, la función comprueba el perfil activo y su habilitación para Hermes. Una consulta fallida no concede acceso por un rol alternativo del navegador.

## Funciones

- **Mi día:** búsqueda y filtro de cartera, deuda y saldos a favor separados, pagos por verificar y tareas pendientes.
- **Ficha del cliente:** movimientos, partidas, anticipos y pendientes en pestañas, con búsqueda de movimientos.
- **Expediente mayorista:** consulta de cotización/pedido, despacho de almacén y distinción entre despacho y recepción del cliente.
- **Pagos:** un pago registrado por el POS se presenta como pendiente de verificación; los adelantos parciales conservan el importe que falta registrar.
- **Comprobantes:** vinculación mediante una RPC limitada, usando la sesión de administrador o gerente.
- **Actualización:** consulta al volver a la ventana o mediante Actualizar. No hay suscripción Realtime ni temporizador de replicación en estas pantallas.

La navegación es adaptable, con foco visible y pestañas operables mediante teclado. `DESIGN.md` y `PRODUCT.md` describen las decisiones de diseño y el alcance del producto.

## Reglas contables

- Las vistas/RPC proporcionan los saldos contables. Los cálculos de presentación usan `decimal.js`.
- Registrar un pago y verificarlo son etapas distintas. Una propuesta no confirma acreditación bancaria ni modifica el saldo contable.
- El saldo provisional conserva su etiqueta y se distingue del confirmado.
- Los importes ausentes se muestran como **Sin registrar**; no se convierten en cero.
- Las anulaciones conservan motivo e historial.

## Validación

```bash
npm test
npm run build
```

Las pruebas cubren sesiones/roles, fechas, importes nulos, consulta de cartera, interacción por teclado, comprobantes y presentación de pagos totales/parciales por verificar. Los datos de las vistas de prueba son sintéticos.

Las rutas `/vista-previa` y `/vista-previa/cliente` solo están disponibles en desarrollo con `HERMES_UI_PREVIEW=1`; no permiten escrituras y devuelven 404 en producción.

## Integración y publicación

El backend de Cation y el POS son dependencias externas a este frontend. Consultar [la integración](docs/INTEGRACION_CATION.md) y [el alcance del expediente mayorista](docs/EXPEDIENTE_MAYORISTA.md) antes de publicar.

No subir `.env.local`, claves privilegiadas, snapshots financieros ni capturas con datos reales. La ingesta heredada de agentes puede requerir `SUPABASE_SERVICE_ROLE_KEY`, exclusivamente en servidor, y operaciones/permisos específicos que siguen pendientes de revisar. La gestión normal de comprobantes utiliza la sesión y una RPC limitada, no CRUD general con esa clave.

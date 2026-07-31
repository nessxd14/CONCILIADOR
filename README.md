# Hermes

Libro auxiliar de cuentas por cobrar. Next.js (App Router) + Supabase.

## Desarrollo

```bash
npm install
npm run dev
```

Requiere `.env.local` (no versionado) con:

```
NEXT_PUBLIC_SUPABASE_URL=https://vlthlcbcgvsrwxqazvne.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key del proyecto>
```

## Reglas del dominio (ver brief)

- El saldo nunca se calcula en el cliente: siempre sale de `v_saldo_cliente`
  o `v_mayor_auxiliar`.
- No hay inserts directos a `movimiento_cuenta`; los movimientos se crean
  por funciones RPC (`cargar_saldo_apertura`).
- Los montos se manejan con `decimal.js` (`lib/money.ts`), nunca con
  `parseFloat` ni aritmética de `number`.
- Nada se borra. Anular es un estado con motivo obligatorio.

## Pendiente (fuera de v0)

- RLS por rol (hoy es un único permiso "authenticated" sin distinguir
  admin/gerente/etc. — la app filtra por rol en la UI, no en la base).
- Sincronización del espejo de clientes desde el POS.
- Pagos, conciliación, evidencia, expediente documental.

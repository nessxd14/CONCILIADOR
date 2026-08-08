export type Rol =
  | "admin"
  | "gerente"
  | "supervisor"
  | "comercial"
  | "caja"
  | "almacen"
  | "auditor";

const ROLES_VALIDOS: Rol[] = ["admin", "gerente", "supervisor", "comercial", "caja", "almacen", "auditor"];

/**
 * El rol se lee de app_metadata, NO de user_metadata: user_metadata es escribible
 * por el propio usuario vía supabase.auth.updateUser({ data: { rol: ... } }), y
 * confirmar_pago / cargar_saldo_apertura / registrar_nota_credito deciden permisos
 * con este mismo claim del lado de la base. app_metadata solo lo escribe service_role.
 * No volver a user_metadata por ningún motivo.
 */
export function rolDeUsuario(user: { app_metadata?: Record<string, unknown> } | null): Rol | null {
  const rol = user?.app_metadata?.rol;
  return typeof rol === "string" && ROLES_VALIDOS.includes(rol as Rol) ? (rol as Rol) : null;
}

/** Mismo criterio que registrar_fechas_partida en la base: caja, almacen y auditor no pueden. */
export function puedeRegistrarFechas(rol: Rol | null): boolean {
  return rol !== null && ["gerente", "admin", "supervisor", "comercial"].includes(rol);
}

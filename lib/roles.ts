export type Rol =
  | "admin"
  | "gerente"
  | "supervisor"
  | "comercial"
  | "caja"
  | "almacen"
  | "auditor";

export function rolDeUsuario(user: { user_metadata?: Record<string, unknown> } | null): Rol | null {
  const rol = user?.user_metadata?.rol;
  return typeof rol === "string" ? (rol as Rol) : null;
}

/** Mismo criterio que registrar_fechas_partida en la base: caja, almacen y auditor no pueden. */
export function puedeRegistrarFechas(rol: Rol | null): boolean {
  return rol !== null && ["gerente", "admin", "supervisor", "comercial"].includes(rol);
}

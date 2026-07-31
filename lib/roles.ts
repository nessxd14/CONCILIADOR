export type Rol =
  | "admin"
  | "gerente"
  | "supervisor"
  | "comercial"
  | "caja"
  | "almacen"
  | "auditor";

export function rolDeUsuario(user: { user_metadata?: Record<string, unknown> } | null): Rol | null {
  const rol = user?.user_metadata?.role;
  return typeof rol === "string" ? (rol as Rol) : null;
}

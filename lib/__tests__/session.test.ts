import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSesionHermes } from "../supabase/session";
import { databaseOptions } from "../supabase/config";
import { puedeConfirmarPagos, rolDesdeBase } from "../roles";

function session({ user = { id: "user", app_metadata: { rol: "admin" } } as object | null, role = null as unknown, authError = null as unknown, rpcError = null as unknown } = {}) {
  const rpc = vi.fn().mockResolvedValue({ data: role, error: rpcError });
  const client = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: authError }) }, rpc };
  return { client: client as unknown as SupabaseClient, rpc };
}
afterEach(() => vi.unstubAllEnvs());

describe("acceso a la cartera unificada", () => {
  it("permite un administrador autorizado en la base aunque no tenga el claim antiguo", async () => {
    const { client, rpc } = session({ user: { id: "admin", app_metadata: {} }, role: "admin" });
    const result = await obtenerSesionHermes(client);
    expect(result.data.rol).toBe("admin");
    expect(rpc).toHaveBeenCalledWith("rol_actual");
  });
  it("no concede permisos por un claim de administrador cuando la base niega el acceso", async () => {
    const { client } = session({ role: "" });
    expect((await obtenerSesionHermes(client)).data.rol).toBeNull();
  });
  it("no vuelve al claim del JWT cuando falla la consulta del rol", async () => {
    const failure = { message: "Invalid schema: hermes" };
    const { client } = session({ role: "admin", rpcError: failure });
    const result = await obtenerSesionHermes(client);
    expect(result.data.rol).toBeNull();
    expect(result.error).toEqual(failure);
  });
  it("no consulta permisos sin un usuario verificado", async () => {
    const { client, rpc } = session({ user: null });
    expect((await obtenerSesionHermes(client)).data.user).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("descarta al usuario cuando su verificación falla", async () => {
    const { client, rpc } = session({ authError: { message: "Token inválido" } });
    expect((await obtenerSesionHermes(client)).data.user).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each(["admin", "gerente"])("muestra la tarea de confirmar al rol %s", role => {
    expect(puedeConfirmarPagos(rolDesdeBase(role))).toBe(true);
  });
  it.each(["cajero", "supervisor", "auditor", "desconocido", null])("no permite confirmar al rol %s", role => {
    expect(puedeConfirmarPagos(rolDesdeBase(role))).toBe(false);
  });
  it("selecciona explícitamente hermes para Cation", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_SCHEMA", "hermes");
    expect(databaseOptions()).toEqual({ db: { schema: "hermes" } });
  });
  it("mantiene el esquema public para la transición con la base antigua", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_SCHEMA", undefined);
    expect(databaseOptions()).toEqual({ db: { schema: "public" } });
  });
  it("impide cambiar silenciosamente de esquema ante una configuración inválida", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_SCHEMA", "hremes");
    expect(databaseOptions).toThrow("NEXT_PUBLIC_SUPABASE_SCHEMA");
  });
});

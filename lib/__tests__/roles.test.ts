import { describe, expect, it } from "vitest";
import { rolDeUsuario } from "../roles";

describe("rolDeUsuario", () => {
  it("lee un rol válido desde app_metadata", () => {
    expect(rolDeUsuario({ app_metadata: { rol: "gerente" } })).toBe("gerente");
  });

  it("ignora un rol puesto en user_metadata", () => {
    expect(
      rolDeUsuario({
        app_metadata: {},
        user_metadata: { rol: "admin" },
      } as { app_metadata?: Record<string, unknown> })
    ).toBeNull();
  });

  it("devuelve null para un rol desconocido", () => {
    expect(rolDeUsuario({ app_metadata: { rol: "superadmin" } })).toBeNull();
  });

  it("devuelve null cuando el usuario es null", () => {
    expect(rolDeUsuario(null)).toBeNull();
  });
});

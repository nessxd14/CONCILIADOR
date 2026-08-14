import { describe, expect, it } from "vitest";
import { puedeGestionarDocumentos, rolDeUsuario } from "../roles";

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

describe("puedeGestionarDocumentos", () => {
  it("admin y gerente pueden", () => {
    expect(puedeGestionarDocumentos("admin")).toBe(true);
    expect(puedeGestionarDocumentos("gerente")).toBe(true);
  });

  it("ningún otro rol puede", () => {
    expect(puedeGestionarDocumentos("supervisor")).toBe(false);
    expect(puedeGestionarDocumentos("comercial")).toBe(false);
    expect(puedeGestionarDocumentos("caja")).toBe(false);
    expect(puedeGestionarDocumentos("almacen")).toBe(false);
    expect(puedeGestionarDocumentos("auditor")).toBe(false);
    expect(puedeGestionarDocumentos(null)).toBe(false);
  });
});

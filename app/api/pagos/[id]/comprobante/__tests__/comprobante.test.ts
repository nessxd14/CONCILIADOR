import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ rpc: mocks.rpc })) }));
vi.mock("@/lib/supabase/session", () => ({ obtenerSesionHermes: mocks.session }));
import { POST, DELETE } from "../route";
const params = { params: Promise.resolve({ id: "10" }) };
const request = (id: unknown = 20) => new Request("http://localhost/api/pagos/10/comprobante", { method: "POST", body: JSON.stringify({ evidencia_id: id }) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ data: { user: { id: "admin" }, rol: "admin" }, error: null });
  mocks.rpc.mockResolvedValue({ data: { id: 10, evidencia_id: 20 }, error: null });
});
describe("comprobantes con la sesión del usuario", () => {
  it("vincula mediante la operación limitada", async () => {
    const result = await POST(request(), params);
    expect(result.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("asociar_comprobante_pago", { p_pago_id: 10, p_evidencia_id: 20 });
  });
  it("desvincula mediante la misma operación", async () => {
    expect((await DELETE(request(), params)).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("asociar_comprobante_pago", { p_pago_id: 10, p_evidencia_id: null });
  });
  it("rechaza a un cajero antes de modificar datos", async () => {
    mocks.session.mockResolvedValue({ data: { user: { id: "caja" }, rol: "cajero" }, error: null });
    expect((await POST(request(), params)).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rechaza una solicitud sin sesión", async () => {
    mocks.session.mockResolvedValue({ data: { user: null, rol: null }, error: null });
    expect((await POST(request(), params)).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(["20", 0, -1, 2.5])("rechaza el identificador inválido %s", async id => {
    expect((await POST(request(id), params)).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([["P0002", 404], ["42501", 403], ["22023", 400]])("conserva el error de base %s", async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code, message: "No autorizado o no disponible" } });
    expect((await POST(request(), params)).status).toBe(status);
  });
});

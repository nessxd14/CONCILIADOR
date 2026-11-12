import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import DemandaPage from "../demanda/page";

const rpc = vi.hoisted(() => vi.fn());
const schema = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ schema, auth: { signOut: vi.fn() }, storage: { from: vi.fn() } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

let root: Root | undefined;
afterEach(async () => { if (root) await act(() => root!.unmount()); root = undefined; document.body.innerHTML = ""; vi.resetAllMocks(); });

async function mount() {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  schema.mockReturnValue({ rpc });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => { root!.render(<DemandaPage />); });
  await act(async () => {});
  return host;
}
const boton = (host: HTMLElement, texto: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent === texto)!;

const idea = { idea_id: 7, titulo: "Cinta doble faz", producto_id: null, tipo: "NO_LO_TENEMOS", veces: 4, cantidad_aprox: 30, tienda: 1, mayor: 3,
  esperan_aviso: 0, ultima: "2026-11-10T14:00:00Z", estado: "ABIERTA", via: null, motivo: null, compra_solicitud_id: null };

function backend() {
  rpc.mockImplementation(async (fn: string) => {
    if (fn === "app_es_comprador") return { data: true, error: null };
    if (fn === "demanda_resumen") return { data: [idea], error: null };
    if (fn === "demanda_anotaciones") return { data: [], error: null };
    if (fn === "demanda_similares") return { data: [{ idea_id: 9, titulo: "Cinta bifaz", anotaciones: 2, parecido: 0.8 }, { idea_id: 10, titulo: "Otra", anotaciones: 1, parecido: 0.2 }], error: null };
    return { data: {}, error: null };
  });
}

describe("página Lo que nos piden", () => {
  it("sin acceso muestra el aviso y no hace otras llamadas", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const host = await mount();
    expect(host.textContent).toContain("Solo Rony y Ness ven la demanda de clientes.");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("app_es_comprador");
    expect(schema).toHaveBeenCalledWith("public");
  });

  it("bloquea Descartar sin motivo", async () => {
    backend();
    const host = await mount();
    await act(async () => boton(host, "Descartar con motivo").click());
    await act(async () => boton(host, "Confirmar descarte").click());
    expect(host.querySelector('[role="alert"]')!.textContent).toContain("motivo");
    expect(rpc.mock.calls.some(([fn]) => fn === "demanda_decidir")).toBe(false);
  });

  it("Unir usa el parecido como origen y la idea seleccionada como destino; oculta los poco parecidos", async () => {
    backend();
    const host = await mount();
    expect(host.textContent).toContain("Se parece a «Cinta bifaz» (2 anotaciones)");
    expect(host.textContent).not.toContain("Otra");
    await act(async () => boton(host, "Unir").click());
    expect(rpc).toHaveBeenCalledWith("demanda_unir", { p_origen: 9, p_destino: 7 });
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";

// URL simulada: router.replace confirma el cambio recién después de LATENCIA ms,
// como una navegación del App Router que espera la respuesta del servidor.
const LATENCIA = 300;
let query = "";
const oyentes = new Set<() => void>();
const cache = { q: "", params: new URLSearchParams("") };
const replace = vi.fn((url: string) => {
  const q = url.split("?")[1] ?? "";
  setTimeout(() => { query = q; oyentes.forEach(f => f()); }, LATENCIA);
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => {
    const q = useSyncExternalStore(cb => { oyentes.add(cb); return () => oyentes.delete(cb); }, () => query, () => query);
    if (cache.q !== q) { cache.q = q; cache.params = new URLSearchParams(q); }
    return cache.params;
  },
}));
vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/lib/supabase/use-refresh", () => ({ useHermesRefresh: () => {} }));
vi.mock("@/lib/supabase/client", () => {
  const b: Record<string, unknown> = {};
  for (const m of ["from", "select", "in", "order", "range"]) b[m] = () => b;
  b.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(ok);
  return { createClient: () => b };
});

import ClientesPage from "@/app/(app)/clientes/page";

function escribir(input: HTMLInputElement, texto: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, texto);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("buscador de Clientes", () => {
  beforeEach(() => { vi.useFakeTimers(); query = ""; replace.mockClear(); (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true; });
  afterEach(() => { vi.useRealTimers(); });

  it("no pierde lo tecleado mientras la URL todavía se está actualizando", async () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => { root.render(<ClientesPage />); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    const input = el.querySelector<HTMLInputElement>('input[aria-label="Buscar cliente"]')!;

    await act(async () => { escribir(input, "mar"); });
    await act(async () => { await vi.advanceTimersByTimeAsync(260); });   // vence el debounce: sale replace(q=mar)
    expect(replace).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });   // la navegación sigue en curso
    await act(async () => { escribir(input, "maria"); });                  // el usuario sigue escribiendo
    expect(input.value).toBe("maria");
    await act(async () => { await vi.advanceTimersByTimeAsync(220); });   // la URL confirma q=mar
    expect(input.value).toBe("maria");
  });
});

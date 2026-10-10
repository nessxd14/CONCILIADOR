import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { useActividad } from "../use-actividad";

const gteLog: string[] = [];

function chain() {
  const c = {
    select: () => c,
    gte: (_col: string, valor: string) => {
      gteLog.push(valor);
      return c;
    },
    lt: () => c,
    is: () => c,
    or: () => c,
    order: () => c,
    range: async () => ({ data: [], error: null }),
    in: async () => ({ data: [], error: null }),
  };
  return c;
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: () => chain() }),
}));

let root: Root | undefined;
afterEach(async () => {
  if (root) {
    await act(() => root!.unmount());
    root = undefined;
  }
  document.body.innerHTML = "";
  vi.useRealTimers();
  gteLog.length = 0;
});

function Harness() {
  useActividad("24h", undefined, { puedeConfirmar: true, saldos: [] });
  return null;
}

describe("useActividad — ventana móvil de 'Últimas 24 horas'", () => {
  it("el límite inferior avanza entre dos refrescos, no queda fijo en el primer cálculo", async () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));

    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);

    await act(() => root!.render(<Harness />));
    expect(gteLog.length).toBeGreaterThan(0);
    const primero = gteLog[gteLog.length - 1];
    expect(primero).toBe(new Date("2026-10-08T12:00:00Z").toISOString());

    // Avanza 2 horas de reloj y deja correr el refresco periódico de
    // useHermesRefresh (cada 15s) — no se cambia el período ni se vuelve a
    // montar el componente. El intervalo venía contando desde el montaje,
    // así que dispara 15s después del nuevo "ahora", no exactamente en él.
    vi.setSystemTime(new Date("2026-10-09T14:00:00Z"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    const segundo = gteLog[gteLog.length - 1];
    const esperado = new Date("2026-10-08T14:00:15Z").toISOString();
    expect(segundo).toBe(esperado);
    // La diferencia real es ~2 horas, no 0: el límite se recalculó de nuevo.
    expect(new Date(segundo).getTime() - new Date(primero).getTime()).toBeGreaterThan(1.9 * 60 * 60 * 1000);
  });
});

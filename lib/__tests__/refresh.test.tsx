import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHermesRefresh } from "@/lib/supabase/use-refresh";

let root: Root;
let visibility = "visible";
function Screen({ refresh, enabled = true }: { refresh: () => Promise<void>; enabled?: boolean }) {
  useHermesRefresh(refresh, enabled);
  return null;
}
beforeEach(() => {
  vi.useFakeTimers();
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility as DocumentVisibilityState);
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(() => root.unmount());
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("actualización automática de Hermes", () => {
  it("consulta cada 15 segundos y suspende las consultas cuando la pestaña está oculta", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    await act(() => root.render(<Screen refresh={refresh} />));
    expect(refresh).not.toHaveBeenCalled(); // La página ya hizo su carga inicial.
    await act(() => vi.advanceTimersByTimeAsync(15_000));
    expect(refresh).toHaveBeenCalledTimes(1);
    visibility = "hidden";
    await act(() => vi.advanceTimersByTimeAsync(45_000));
    expect(refresh).toHaveBeenCalledTimes(1);
    visibility = "visible";
    await act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(refresh).toHaveBeenCalledTimes(2);
  });
  it("no superpone una consulta lenta con el temporizador o los eventos de foco", async () => {
    let finish!: () => void;
    const refresh = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    await act(() => root.render(<Screen refresh={refresh} />));
    await act(() => window.dispatchEvent(new Event("focus")));
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await act(() => window.dispatchEvent(new Event("focus")));
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(() => finish());
    await act(() => vi.advanceTimersByTimeAsync(15_000));
    expect(refresh).toHaveBeenCalledTimes(2);
    await act(() => finish());
  });
  it("respeta la pausa durante formularios y usa el callback actual al reanudar", async () => {
    const oldRefresh = vi.fn().mockResolvedValue(undefined);
    const newRefresh = vi.fn().mockResolvedValue(undefined);
    await act(() => root.render(<Screen refresh={oldRefresh} enabled={false} />));
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await act(() => window.dispatchEvent(new Event("focus")));
    expect(oldRefresh).not.toHaveBeenCalled();
    await act(() => root.render(<Screen refresh={newRefresh} />));
    await act(() => vi.advanceTimersByTimeAsync(15_000));
    expect(newRefresh).toHaveBeenCalledTimes(1);
    expect(oldRefresh).not.toHaveBeenCalled();
  });
  it("permite reintentar una consulta fallida", async () => {
    const refresh = vi.fn().mockRejectedValueOnce(new Error("Sin conexión")).mockResolvedValue(undefined);
    await act(() => root.render(<Screen refresh={refresh} />));
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});

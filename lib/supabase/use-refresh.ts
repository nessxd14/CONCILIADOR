"use client";

import { useEffect, useRef } from "react";

/** Consulta mientras la pantalla está visible y al volver a ella. La carga inicial pertenece a la página. */
export function useHermesRefresh(refresh: () => Promise<void>, enabled = true, intervalMs = 15_000) {
  const latest = useRef(refresh);
  latest.current = refresh;
  useEffect(() => {
    if (!enabled) return;
    let pending = false;
    let active = true;
    const run = async () => {
      if (!active || pending || document.visibilityState !== "visible") return;
      pending = true;
      try { await latest.current(); }
      catch { /* La página presenta sus errores; el siguiente evento permite reintentar. */ }
      finally { pending = false; }
    };
    const onFocus = () => { void run(); };
    const onVisible = () => { if (document.visibilityState === "visible") void run(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(onFocus, intervalMs);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs]);
}

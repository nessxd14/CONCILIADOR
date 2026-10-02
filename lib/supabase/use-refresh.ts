"use client";

import { useEffect, useRef } from "react";

/** Refresca al regresar a la pantalla, sin temporizadores ni suscripciones. */
export function useHermesRefresh(refresh: () => Promise<void>, enabled = true) {
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
      finally { pending = false; }
    };
    const onFocus = () => { void run(); };
    const onVisible = () => { if (document.visibilityState === "visible") void run(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);
}

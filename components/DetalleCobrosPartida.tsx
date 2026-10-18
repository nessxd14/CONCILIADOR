"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHermesRefresh } from "@/lib/supabase/use-refresh";
import { leerDetalleCobro, type DetalleCobro } from "@/lib/detalle-cobro";
import { DetalleCobroContenido } from "./DetalleCobroContenido";

export function DetalleCobrosPartida({ partidaId, fixture }: { partidaId: number; fixture?: DetalleCobro }) {
  const supabase = useMemo(() => createClient(), []);
  const [result, setResult] = useState<{ id: number; data: DetalleCobro | null; error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const cancelRequests = useCallback(() => { generation.current++; }, []);
  const cargar = useCallback(async (cursor: number | null = null) => {
    if (fixture) return;
    const request = ++generation.current;
    setBusy(true);
    try {
      const response = await supabase.rpc("obtener_detalle_cobro_partida", { p_partida_id: partidaId, p_antes_id: cursor, p_limite: 50 });
      if (response.error) throw new Error(response.error.code === "PGRST202" ? "El detalle de cobros todavía está pendiente de activar en la base." : "No se pudo consultar el detalle de cobros. Revisa tu acceso y reintenta.");
      const data = leerDetalleCobro(response.data);
      if (request !== generation.current) return;
      setResult(previous => ({ id: partidaId, error: "", data: cursor != null && previous?.id === partidaId && previous.data ? { ...data, historial: [...previous.data.historial, ...data.historial.filter(e => !previous.data!.historial.some(old => old.id === e.id))] } : data }));
    } catch (error) {
      if (request === generation.current) setResult(previous => ({ id: partidaId, data: previous?.id === partidaId ? previous.data : null, error: error instanceof Error ? error.message : "No se pudo consultar el detalle" }));
    } finally { if (request === generation.current) setBusy(false); }
  }, [fixture, partidaId, supabase]);
  useEffect(() => { if (!fixture) void cargar(); return cancelRequests; }, [fixture, cargar, cancelRequests]);
  useHermesRefresh(() => cargar(), !fixture && !busy);
  const current = fixture ? { data: fixture, error: "" } : result?.id === partidaId ? result : null;
  return <section className="cobro-traza" aria-label="Detalle de partidas y responsables de cobros">
    <header><h2>Partidas y responsables de cobros</h2><button type="button" disabled={busy || !!fixture} onClick={() => void cargar()}>Actualizar detalle</button></header>
    {!current ? <p role="status">Consultando partidas e historial…</p> : <>
      {current.error && <p role="alert">{current.error}</p>}
      {current.data && <DetalleCobroContenido data={current.data} cargandoMas={busy} onMas={() => void cargar(current.data!.siguiente)} />}
    </>}
  </section>;
}

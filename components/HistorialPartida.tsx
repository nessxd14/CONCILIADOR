"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHermesRefresh } from "@/lib/supabase/use-refresh";
import { fechaHistorial, nombreAccion, type HistorialPartidaData } from "@/lib/historial";

export function HistorialEventos({ data, estadoPartida }: { data: HistorialPartidaData; estadoPartida: string }) {
  const cancelado = data.pedido?.estado === "CANCELADO";
  return <>
    {data.pedido && <p>{data.pedido.numero || `Pedido #${data.pedido.id}`} · {cancelado ? "Cancelado en Seller" : data.pedido.estado === "COMPLETADO" ? "Operación completada en Seller" : "Abierto en Seller"}</p>}
    {cancelado && ["ABIERTA", "PAGADA"].includes(estadoPartida) && <div className="banner-error" role="status">Pedido cancelado con partida {estadoPartida === "PAGADA" ? "pagada" : "abierta"}. Requiere revisión financiera; consulta los pagos y movimientos antes de resolver la baja.</div>}
    {!!data.pedido?.lineas_rechazadas && <div className="nota-sincronizando">{data.pedido.lineas_rechazadas} línea(s) rechazada(s) en almacén. El rechazo no acredita una entrega ni anula automáticamente la deuda.</div>}
    {data.eventos.length === 0 ? <p>No hay eventos registrados para este expediente.</p> : <ol className="historial-eventos">{data.eventos.map(e => <li key={e.id}>
      <div className="section-heading"><strong>{nombreAccion(e.accion)}</strong><span className="badge">{e.sistema === "ALMACEN" ? "Almacén" : e.sistema === "SELLER" ? "Seller" : e.sistema === "HERMES" ? "Hermes" : "Origen no registrado"}</span></div>
      <p>{e.motivo?.trim() || "Motivo no registrado"}</p>
      <small>{e.usuario?.trim() || "Usuario no registrado"} · {fechaHistorial(e.fecha)}</small>
      {e.pedido_linea_id != null && <small>Línea #{e.pedido_linea_id}</small>}
      {e.estado_previo && <small>Estado anterior: {e.estado_previo}</small>}
    </li>)}</ol>}
  </>;
}

export function HistorialPartida({ partidaId, estadoPartida, fixture, onOrigenCancelado }: { partidaId: number; estadoPartida: string; fixture?: HistorialPartidaData; onOrigenCancelado?: (cancelado: boolean) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<HistorialPartidaData | null>(fixture ?? null);
  const [loading, setLoading] = useState(!fixture);
  const [error, setError] = useState(false);
  const request = useRef(0);
  useEffect(() => { onOrigenCancelado?.(data?.pedido?.estado === "CANCELADO"); }, [data, onOrigenCancelado]);
  async function cargar() {
    const current = ++request.current;
    try {
      const result = await supabase.rpc("obtener_historial_partida", { p_partida_id: partidaId });
      if (result.error || !result.data) throw result.error;
      if (current === request.current) { setData(result.data as HistorialPartidaData); setError(false); }
    } catch { if (current === request.current) setError(true); }
    finally { if (current === request.current) setLoading(false); }
  }
  useEffect(() => {
    setData(fixture ?? null); setError(false); setLoading(!fixture);
    if (!fixture) void cargar();
    return () => { request.current++; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [partidaId, estadoPartida, fixture]);
  useHermesRefresh(cargar, !fixture && !loading);
  return <section className="card historial-partida" aria-label="Historial del expediente"><h2>Historial y novedades</h2>
    {loading ? <p role="status">Consultando historial…</p> : error ? <div role="alert">El historial no está disponible. <button className="btn-link" onClick={() => void cargar()}>Reintentar</button><p className="field-hint">La consulta requiere que esté habilitada la integración de historial.</p></div> : data && <HistorialEventos data={data} estadoPartida={estadoPartida} />}
  </section>;
}

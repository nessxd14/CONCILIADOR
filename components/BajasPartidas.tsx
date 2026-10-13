"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useHermesRefresh } from "@/lib/supabase/use-refresh";
import { leerPaginas } from "@/lib/paginate";
import { formatBs } from "@/lib/money";
import { fechaHistorial, type PartidaBaja } from "@/lib/historial";

export function DetalleBaja({ partida }: { partida: Pick<PartidaBaja, "estado" | "anulada_por" | "anulada_en" | "motivo_anulacion"> }) {
  return <div className="baja-detail">
    <strong>{partida.estado === "ANULADA" ? "Partida anulada" : "Partida cancelada"}</strong>
    <p>{partida.motivo_anulacion?.trim() || "Motivo no registrado"}</p>
    <small>{partida.anulada_por?.trim() || "Usuario no registrado"} · {fechaHistorial(partida.anulada_en)}</small>
  </div>;
}

export function BajasPartidas({ clienteId, fixture }: { clienteId: number; fixture?: PartidaBaja[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<PartidaBaja[]>(fixture ?? []);
  const [loading, setLoading] = useState(!fixture);
  const [error, setError] = useState(false);
  const request = useRef(0);
  async function cargar() {
    const current = ++request.current;
    try {
      const result = await leerPaginas<PartidaBaja>((from, to) => supabase.from("partida_abierta")
        .select("id, documento_interno, estado, total, anulada_por, anulada_en, motivo_anulacion")
        .eq("cliente_id", clienteId).in("estado", ["ANULADA", "CANCELADA"])
        .order("id", { ascending: false }).range(from, to));
      if (result.error) throw result.error;
      if (current === request.current) { setRows(result.data ?? []); setError(false); }
    } catch { if (current === request.current) setError(true); }
    finally { if (current === request.current) setLoading(false); }
  }
  useEffect(() => {
    setRows(fixture ?? []); setError(false); setLoading(!fixture);
    if (!fixture) void cargar();
    return () => { request.current++; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [clienteId, fixture]);
  useHermesRefresh(cargar, !fixture && !loading);
  if (loading) return <p role="status">Consultando bajas…</p>;
  if (error) return <div role="alert">No pudimos consultar las bajas. <button className="btn-link" onClick={() => void cargar()}>Reintentar</button></div>;
  return <div className="bajas-list"><p className="field-hint">Las bajas se conservan para consulta. No representan deuda pendiente ni pagos recibidos.</p>
    {rows.length === 0 ? <p>No hay partidas dadas de baja.</p> : rows.map(p => <article className="card" key={p.id}>
      <div className="section-heading"><strong>{p.documento_interno}</strong><span>Importe original: {formatBs(p.total)}</span></div>
      <DetalleBaja partida={p} />
      {!fixture && <Link className="btn-link" href={`/clientes/${clienteId}/expediente/${p.id}`}>Ver expediente e historial</Link>}
    </article>)}
  </div>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatBs } from "@/lib/money";
import { rolDeUsuario } from "@/lib/roles";
import type { Documento, Hito, PartidaAbierta } from "@/lib/types";

type HitoConPendientes = Hito & { habilitantes_pendientes: number };
type EstadoAccion = { cargando: boolean; error: string | null };

export default function ExpedientePage() {
  const params = useParams();
  const partidaId = Number(params.partidaId);
  const clienteId = Number(params.id);
  const supabase = useMemo(() => createClient(), []);

  const [partida, setPartida] = useState<PartidaAbierta | null>(null);
  const [hitos, setHitos] = useState<HitoConPendientes[]>([]);
  const [documentosPorHito, setDocumentosPorHito] = useState<Record<number, Documento[]>>({});
  const [esGerente, setEsGerente] = useState(false);
  const [usuario, setUsuario] = useState("desconocido");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acciones, setAcciones] = useState<Record<string, EstadoAccion>>({});
  const [notas, setNotas] = useState<Record<number, string>>({});

  async function cargar() {
    setCargando(true);
    setError(null);

    const [{ data: userData }, partidaRes, hitosRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("partida_abierta").select("*").eq("id", partidaId).single(),
      supabase.from("hito").select("*").eq("partida_abierta_id", partidaId).order("orden"),
    ]);

    if (partidaRes.error) {
      setError(partidaRes.error.message);
      setCargando(false);
      return;
    }

    setUsuario(userData.user?.email ?? "desconocido");
    setEsGerente(rolDeUsuario(userData.user) === "gerente");
    setPartida(partidaRes.data as PartidaAbierta);

    const hitosData = (hitosRes.data ?? []) as Hito[];
    const hitoIds = hitosData.map((h) => h.id);

    const docsRes = hitoIds.length
      ? await supabase.from("documento").select("*").in("hito_id", hitoIds).order("id")
      : { data: [] as Documento[], error: null };

    if (docsRes.error) {
      setError(docsRes.error.message);
      setCargando(false);
      return;
    }

    const docs = (docsRes.data ?? []) as Documento[];
    const porHito: Record<number, Documento[]> = {};
    for (const d of docs) {
      (porHito[d.hito_id] ??= []).push(d);
    }

    const hitosConPendientes: HitoConPendientes[] = hitosData.map((h) => ({
      ...h,
      habilitantes_pendientes: (porHito[h.id] ?? []).filter(
        (d) => d.tipo === "HABILITANTE" && d.estado !== "APROBADO"
      ).length,
    }));

    setHitos(hitosConPendientes);
    setDocumentosPorHito(porHito);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, partidaId]);

  const hitoBloqueado = hitos.find((h) => h.habilitantes_pendientes > 0);
  const docBloqueante = hitoBloqueado
    ? (documentosPorHito[hitoBloqueado.id] ?? []).find(
        (d) => d.tipo === "HABILITANTE" && d.estado !== "APROBADO"
      )
    : null;

  function setAccion(key: string, estado: EstadoAccion) {
    setAcciones((prev) => ({ ...prev, [key]: estado }));
  }

  async function revisar(doc: Documento, aprobado: boolean) {
    const key = `doc-${doc.id}`;
    setAccion(key, { cargando: true, error: null });

    const { error } = await supabase.rpc("revisar_documento", {
      p_documento_id: doc.id,
      p_aprobado: aprobado,
      p_usuario: usuario,
      p_notas: notas[doc.id]?.trim() || null,
    });

    if (error) {
      setAccion(key, { cargando: false, error: error.message });
      return;
    }

    setAccion(key, { cargando: false, error: null });
    await cargar();
  }

  async function completar(hito: HitoConPendientes) {
    const key = `hito-${hito.id}`;
    setAccion(key, { cargando: true, error: null });

    const { error } = await supabase.rpc("completar_hito", {
      p_hito_id: hito.id,
      p_usuario: usuario,
    });

    if (error) {
      setAccion(key, { cargando: false, error: error.message });
      return;
    }

    setAccion(key, { cargando: false, error: null });
    await cargar();
  }

  async function verDocumento(doc: Documento) {
    if (!doc.storage_path) return;
    const { data, error } = await supabase.storage
      .from("documentos-expediente")
      .createSignedUrl(doc.storage_path, 60);

    if (error || !data) {
      setAccion(`doc-${doc.id}`, { cargando: false, error: error?.message ?? "No se pudo generar el enlace." });
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (cargando) return <div>Cargando…</div>;
  if (error) return <div className="field-error">{error}</div>;
  if (!partida) return <div>Partida no encontrada.</div>;

  return (
    <div>
      <Link href={`/clientes/${clienteId}`} className="btn-link">
        ← Ficha del cliente
      </Link>
      <div className="page-title" style={{ marginTop: 8 }}>
        Expediente — {partida.documento_interno}
      </div>
      <div className="page-sub">
        {partida.cliente_nombre} · {formatBs(partida.total)} · entrega {partida.fecha_entrega ?? "—"}
      </div>

      {hitoBloqueado && docBloqueante && (
        <a href={`#hito-${hitoBloqueado.id}`} className="banner-alerta" style={{ marginBottom: 16, textDecoration: "none", color: "inherit" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--alerta)" }}>Esto frena el cobro</div>
            <div style={{ fontSize: 12.5, marginTop: 2 }}>
              Falta {docBloqueante.estado === "RECHAZADO" ? "resolver" : "aprobar"}: <b>{docBloqueante.etiqueta}</b> ({hitoBloqueado.nombre})
            </div>
          </div>
        </a>
      )}

      <div className="timeline">
        {hitos.map((h) => {
          const docs = documentosPorHito[h.id] ?? [];
          const accionHito = acciones[`hito-${h.id}`];
          const puedeCompletar = esGerente && h.estado === "PENDIENTE" && h.habilitantes_pendientes === 0;

          return (
            <div key={h.id} id={`hito-${h.id}`} className="timeline-hito">
              <span className={`timeline-dot ${h.estado === "COMPLETO" ? "completo" : ""}`} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <b style={{ fontSize: 13.5 }}>{h.nombre}</b>
                  <span className={h.estado === "COMPLETO" ? "badge badge-aldia" : "badge badge-pendiente"} style={{ marginLeft: 8 }}>
                    {h.estado}
                  </span>
                </div>
                {puedeCompletar && (
                  <button type="button" className="btn btn-orange" disabled={accionHito?.cargando} onClick={() => completar(h)}>
                    {accionHito?.cargando ? "Completando…" : "Marcar completo"}
                  </button>
                )}
              </div>
              {accionHito?.error && <div className="field-error" style={{ marginTop: 6 }}>{accionHito.error}</div>}

              {docs.map((d) => {
                const accionDoc = acciones[`doc-${d.id}`];
                return (
                  <div key={d.id}>
                    <div className="doc-card">
                      <div>
                        <span className={`estado-dot ${d.estado}`} />
                        <span style={{ fontSize: 12.5 }}>{d.etiqueta}</span>
                        <span className="badge" style={{ marginLeft: 8 }}>{d.tipo}</span>
                        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>{d.estado}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {d.storage_path && (
                          <button type="button" className="btn btn-secondary" onClick={() => verDocumento(d)}>
                            Ver
                          </button>
                        )}
                        {esGerente && d.estado === "SUBIDO" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={accionDoc?.cargando}
                              onClick={() => revisar(d, true)}
                            >
                              Aprobar
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ borderColor: "var(--alerta)", color: "var(--alerta)" }}
                              disabled={accionDoc?.cargando}
                              onClick={() => revisar(d, false)}
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {esGerente && d.estado === "SUBIDO" && (
                      <input
                        className="input"
                        placeholder="Notas (opcional, para aprobar o rechazar)"
                        style={{ marginTop: 6, height: 32, fontSize: 12 }}
                        value={notas[d.id] ?? ""}
                        onChange={(e) => setNotas((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      />
                    )}
                    {d.notas && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Nota: {d.notas}</div>}
                    {accionDoc?.error && <div className="field-error" style={{ marginTop: 4 }}>{accionDoc.error}</div>}
                  </div>
                );
              })}
            </div>
          );
        })}
        {hitos.length === 0 && <div style={{ color: "var(--muted)" }}>Este expediente no tiene hitos.</div>}
      </div>
    </div>
  );
}

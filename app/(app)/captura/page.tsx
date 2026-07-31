"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatBs } from "@/lib/money";
import { leerCola, reintentar, subirOEncolar, type ItemCola } from "@/lib/captura/queue";
import type { Documento, PartidaAbierta } from "@/lib/types";

type Paso = "home" | "captura" | "pedido" | "tipo" | "confirmar" | "enviando" | "exito";

export default function CapturaPage() {
  const supabase = useMemo(() => createClient(), []);

  const [paso, setPaso] = useState<Paso>("home");
  const [usuario, setUsuario] = useState("desconocido");
  const [cola, setCola] = useState<ItemCola[]>([]);
  const [reintentando, setReintentando] = useState<Record<string, string | null>>({});

  const [fotos, setFotos] = useState<(File | null)[]>([null, null, null]);

  const [partidas, setPartidas] = useState<PartidaAbierta[]>([]);
  const [partidasConPendientes, setPartidasConPendientes] = useState<Set<number>>(new Set());
  const [busquedaPedido, setBusquedaPedido] = useState("");
  const [cargandoPedidos, setCargandoPedidos] = useState(false);

  const [partidaSel, setPartidaSel] = useState<PartidaAbierta | null>(null);
  const [pendientesDelPedido, setPendientesDelPedido] = useState<Documento[]>([]);
  const [cargandoTipos, setCargandoTipos] = useState(false);
  const [documentoSel, setDocumentoSel] = useState<Documento | null>(null);

  const [confirmado, setConfirmado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [avisoEnvio, setAvisoEnvio] = useState<string | null>(null);

  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function refrescarCola() {
    setCola(leerCola());
  }

  useEffect(() => {
    refrescarCola();
    supabase.auth.getUser().then(({ data }) => setUsuario(data.user?.email ?? "desconocido"));
  }, [supabase]);

  async function cargarPedidos() {
    setCargandoPedidos(true);
    const [{ data: partidasData, error: errPartidas }, { data: hitosData }] = await Promise.all([
      supabase.from("partida_abierta").select("*").eq("estado", "ABIERTA").order("fecha_entrega"),
      supabase.from("hito").select("id, partida_abierta_id"),
    ]);

    if (errPartidas || !partidasData) {
      setCargandoPedidos(false);
      return;
    }

    const hitoAPartida = new Map((hitosData ?? []).map((h) => [h.id as number, h.partida_abierta_id as number]));
    const hitoIds = (hitosData ?? []).map((h) => h.id as number);

    const { data: docsPendientes } = hitoIds.length
      ? await supabase.from("documento").select("hito_id").in("hito_id", hitoIds).in("estado", ["PENDIENTE", "RECHAZADO"])
      : { data: [] as { hito_id: number }[] };

    const conPendientes = new Set(
      (docsPendientes ?? []).map((d) => hitoAPartida.get(d.hito_id)).filter((id): id is number => id != null)
    );

    setPartidas(partidasData as PartidaAbierta[]);
    setPartidasConPendientes(conPendientes);
    setCargandoPedidos(false);
  }

  async function seleccionarPedido(p: PartidaAbierta) {
    setPartidaSel(p);
    setCargandoTipos(true);
    setPaso("tipo");

    const { data: hitosData } = await supabase.from("hito").select("id").eq("partida_abierta_id", p.id);
    const hitoIds = (hitosData ?? []).map((h) => h.id as number);

    const { data: docsData } = hitoIds.length
      ? await supabase.from("documento").select("*").in("hito_id", hitoIds).in("estado", ["PENDIENTE", "RECHAZADO"]).order("id")
      : { data: [] as Documento[] };

    setPendientesDelPedido((docsData ?? []) as Documento[]);
    setCargandoTipos(false);
  }

  function irACapturar() {
    setFotos([null, null, null]);
    setPartidaSel(null);
    setDocumentoSel(null);
    setConfirmado(false);
    setErrorEnvio(null);
    setAvisoEnvio(null);
    setPaso("captura");
  }

  function irAPedido() {
    cargarPedidos();
    setPaso("pedido");
  }

  const filtrados = useMemo(() => {
    const q = busquedaPedido.trim().toLowerCase();
    const lista = q
      ? partidas.filter(
          (p) => p.documento_interno.toLowerCase().includes(q) || p.cliente_nombre.toLowerCase().includes(q)
        )
      : partidas;
    return [...lista].sort((a, b) => {
      const aPend = partidasConPendientes.has(a.id) ? 0 : 1;
      const bPend = partidasConPendientes.has(b.id) ? 0 : 1;
      return aPend - bPend;
    });
  }, [partidas, busquedaPedido, partidasConPendientes]);

  const paginasCapturadas = fotos.filter((f): f is File => f !== null);

  async function enviar() {
    if (!documentoSel || !partidaSel || paginasCapturadas.length === 0) return;
    setPaso("enviando");
    setErrorEnvio(null);

    const resultado = await subirOEncolar({
      documentoId: documentoSel.id,
      documentoEtiqueta: documentoSel.etiqueta,
      partidaId: partidaSel.id,
      partidaDocumentoInterno: partidaSel.documento_interno,
      usuario,
      paginas: paginasCapturadas,
    });

    refrescarCola();

    if (resultado.ok) {
      setPaso("exito");
    } else {
      setAvisoEnvio(
        `No se pudo subir ahora (${resultado.error}). Quedó guardado en la cola de abajo — probá "Reintentar" cuando vuelva la conexión, la foto no se pierde.`
      );
      setPaso("home");
    }
  }

  async function handleReintentar(item: ItemCola) {
    setReintentando((prev) => ({ ...prev, [item.id]: null }));
    const resultado = await reintentar(item);
    refrescarCola();
    if (!resultado.ok) {
      setReintentando((prev) => ({ ...prev, [item.id]: resultado.error }));
    } else {
      setReintentando((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  }

  return (
    <div className="captura-shell">
      <div className="mobile-topbar">
        <Link href="/dia" className="btn-link">
          ← Salir
        </Link>
      </div>

      {paso === "home" && (
        <div>
          <div className="page-title">Captura de documentos</div>
          <div className="page-sub">Fotografiá y subí los habilitantes pendientes de cada pedido.</div>

          {avisoEnvio && (
            <div className="banner-warn" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12.5 }}>{avisoEnvio}</div>
            </div>
          )}

          <button type="button" className="btn btn-orange btn-lg" onClick={irACapturar} style={{ marginBottom: 24 }}>
            Capturar documento
          </button>

          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: 700, marginBottom: 8 }}>
            Cola de subidas ({cola.length})
          </div>

          {cola.length === 0 && <div style={{ color: "var(--muted)", fontSize: 12.5 }}>Nada pendiente de subir.</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cola.map((item) => (
              <div key={item.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <b style={{ fontSize: 13 }}>{item.documentoEtiqueta}</b>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      Pedido {item.partidaDocumentoInterno} · {item.paginas} página{item.paginas === 1 ? "" : "s"}
                    </div>
                  </div>
                  <span className={item.estado === "failed" ? "badge badge-pendiente" : "badge"}>
                    {item.estado === "failed" ? "failed" : "queued"}
                  </span>
                </div>
                {(item.error || reintentando[item.id]) && (
                  <div className="field-error" style={{ marginTop: 6 }}>
                    {reintentando[item.id] ?? item.error}
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: 10, width: "100%", justifyContent: "center" }}
                  onClick={() => handleReintentar(item)}
                >
                  Reintentar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {paso === "captura" && (
        <div>
          <button type="button" className="btn-link" onClick={() => setPaso("home")}>
            ← Cancelar
          </button>
          <div className="page-title" style={{ marginTop: 8 }}>
            Fotografiar documento
          </div>
          <div className="page-sub">Hasta 3 páginas. Al menos una es obligatoria.</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <input
                  ref={inputRefs[i]}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setFotos((prev) => {
                      const next = [...prev];
                      next[i] = file;
                      return next;
                    });
                  }}
                />
                <button
                  type="button"
                  className="card"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onClick={() => inputRefs[i].current?.click()}
                >
                  <span style={{ fontSize: 13 }}>Página {i + 1}{i === 0 ? "" : " (opcional)"}</span>
                  <span style={{ fontSize: 12, color: fotos[i] ? "var(--acreedor)" : "var(--muted)" }}>
                    {fotos[i] ? `✓ ${fotos[i]?.name}` : "Tocar para fotografiar"}
                  </span>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-orange btn-lg"
            style={{ marginTop: 24 }}
            disabled={paginasCapturadas.length === 0}
            onClick={irAPedido}
          >
            Continuar ({paginasCapturadas.length} foto{paginasCapturadas.length === 1 ? "" : "s"})
          </button>
        </div>
      )}

      {paso === "pedido" && (
        <div>
          <button type="button" className="btn-link" onClick={() => setPaso("captura")}>
            ← Volver
          </button>
          <div className="page-title" style={{ marginTop: 8 }}>
            Elegir pedido
          </div>

          <input
            className="input"
            placeholder="Buscar por documento o cliente…"
            value={busquedaPedido}
            onChange={(e) => setBusquedaPedido(e.target.value)}
            autoFocus
            style={{ marginBottom: 14 }}
          />

          {cargandoPedidos && <div>Cargando…</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtrados.map((p) => (
              <button
                key={p.id}
                type="button"
                className="card"
                style={{ textAlign: "left", cursor: "pointer" }}
                onClick={() => seleccionarPedido(p)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b style={{ fontSize: 13 }}>{p.documento_interno}</b>
                  {partidasConPendientes.has(p.id) && <span className="badge badge-pendiente">Pendiente</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {p.cliente_nombre} · {formatBs(p.total)}
                </div>
              </button>
            ))}
            {!cargandoPedidos && filtrados.length === 0 && (
              <div style={{ color: "var(--muted)", fontSize: 12.5 }}>No hay pedidos que coincidan.</div>
            )}
          </div>
        </div>
      )}

      {paso === "tipo" && (
        <div>
          <button type="button" className="btn-link" onClick={() => setPaso("pedido")}>
            ← Volver
          </button>
          <div className="page-title" style={{ marginTop: 8 }}>
            Tipo de documento
          </div>
          <div className="page-sub">
            {partidaSel?.documento_interno} · {partidaSel?.cliente_nombre}
          </div>

          {cargandoTipos && <div>Cargando…</div>}

          {!cargandoTipos && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendientesDelPedido.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="card"
                  style={{ textAlign: "left", cursor: "pointer" }}
                  onClick={() => {
                    setDocumentoSel(d);
                    setPaso("confirmar");
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b style={{ fontSize: 13 }}>{d.etiqueta}</b>
                    <span className="badge">{d.tipo}</span>
                  </div>
                  {d.estado === "RECHAZADO" && (
                    <div style={{ fontSize: 11, color: "var(--alerta)", marginTop: 2 }}>
                      Rechazado antes{d.notas ? `: ${d.notas}` : ""} — volver a subir
                    </div>
                  )}
                </button>
              ))}
              {pendientesDelPedido.length === 0 && (
                <div style={{ color: "var(--muted)", fontSize: 12.5 }}>
                  Este pedido no tiene documentos pendientes de subir.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {(paso === "confirmar" || paso === "enviando") && documentoSel && partidaSel && (
        <div>
          <button type="button" className="btn-link" onClick={() => setPaso("tipo")} disabled={paso === "enviando"}>
            ← Volver
          </button>
          <div className="page-title" style={{ marginTop: 8 }}>
            Confirmar y enviar
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <span style={{ color: "var(--muted)" }}>Pedido: </span>
                <b>{partidaSel.documento_interno}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>Cliente: </span>
                {partidaSel.cliente_nombre}
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>Documento: </span>
                <b>{documentoSel.etiqueta}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>Páginas: </span>
                {paginasCapturadas.length}
              </div>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 20 }}>
            <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />
            Las fotos son legibles y corresponden a este documento.
          </label>

          {errorEnvio && <div className="field-error" style={{ marginBottom: 14 }}>{errorEnvio}</div>}

          <button
            type="button"
            className="btn btn-orange btn-lg"
            disabled={!confirmado || paso === "enviando"}
            onClick={enviar}
          >
            {paso === "enviando" ? "Enviando…" : "Enviar"}
          </button>
        </div>
      )}

      {paso === "exito" && (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Documento subido</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 16 }}>
            {documentoSel?.etiqueta} · pedido {partidaSel?.documento_interno}
          </div>
          <button type="button" className="btn btn-orange btn-lg" onClick={() => setPaso("home")}>
            Listo
          </button>
        </div>
      )}
    </div>
  );
}

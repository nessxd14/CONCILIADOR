"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatBs } from "@/lib/money";
import { rolDeUsuario, puedeRegistrarFechas } from "@/lib/roles";
import type { Documento, Hito, PartidaAbierta } from "@/lib/types";

type HitoConPendientes = Hito & { habilitantes_pendientes: number };
type EstadoAccion = { cargando: boolean; error: string | null };

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function sumarDias(fechaISO: string, dias: number): string {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function diasTranscurridosDesde(fechaISO: string): number {
  const hoy = new Date();
  const hoyUTC = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  const desde = new Date(`${fechaISO}T00:00:00Z`).getTime();
  return Math.round((hoyUTC - desde) / 86400000);
}

function calcularVencimiento(partida: PartidaAbierta): string | null {
  if (partida.inicio_computo === "CONTADO") return null;
  const base = partida.inicio_computo === "ENTREGA" ? partida.fecha_entrega : partida.fecha_factura;
  if (!base) return null;
  return sumarDias(base, partida.plazo_dias);
}

function textoBase(inicio: PartidaAbierta["inicio_computo"]): string {
  return inicio === "ENTREGA" ? "entrega" : "factura";
}

export default function ExpedientePage() {
  const params = useParams();
  const router = useRouter();
  const partidaId = Number(params.partidaId);
  const clienteId = Number(params.id);
  const supabase = useMemo(() => createClient(), []);

  const [partida, setPartida] = useState<PartidaAbierta | null>(null);
  const [hitos, setHitos] = useState<HitoConPendientes[]>([]);
  const [documentosPorHito, setDocumentosPorHito] = useState<Record<number, Documento[]>>({});
  const [esGerente, setEsGerente] = useState(false);
  const [puedeFechas, setPuedeFechas] = useState(false);
  const [usuario, setUsuario] = useState("desconocido");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acciones, setAcciones] = useState<Record<string, EstadoAccion>>({});
  const [notas, setNotas] = useState<Record<number, string>>({});

  const [mostrarFormEntrega, setMostrarFormEntrega] = useState(false);
  const [fechaEntregaInput, setFechaEntregaInput] = useState(hoyISO());
  const [mostrarFormFactura, setMostrarFormFactura] = useState(false);
  const [fechaFacturaInput, setFechaFacturaInput] = useState(hoyISO());
  const [cufInput, setCufInput] = useState("");

  const [modalAnularAbierto, setModalAnularAbierto] = useState(false);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [guardandoAnular, setGuardandoAnular] = useState(false);
  const [errorAnular, setErrorAnular] = useState<string | null>(null);

  const [modalPartirAbierto, setModalPartirAbierto] = useState(false);
  const [montoPartir, setMontoPartir] = useState("");
  const [guardandoPartir, setGuardandoPartir] = useState(false);
  const [errorPartir, setErrorPartir] = useState<string | null>(null);

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
    const rol = rolDeUsuario(userData.user);
    setEsGerente(rol === "gerente");
    setPuedeFechas(puedeRegistrarFechas(rol));
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

  async function registrarFechas(entrega: string | null, factura: string | null, cuf: string | null) {
    setAccion("fechas", { cargando: true, error: null });

    const { error } = await supabase.rpc("registrar_fechas_partida", {
      p_partida_id: partidaId,
      p_fecha_entrega: entrega,
      p_fecha_factura: factura,
      p_cuf: cuf,
      p_usuario: usuario,
    });

    if (error) {
      setAccion("fechas", { cargando: false, error: error.message });
      return;
    }

    setAccion("fechas", { cargando: false, error: null });
    setMostrarFormEntrega(false);
    setMostrarFormFactura(false);
    setCufInput("");
    await cargar();
  }

  function cerrarModalAnular() {
    setModalAnularAbierto(false);
    setMotivoAnular("");
    setErrorAnular(null);
  }

  async function confirmarAnular(e: React.FormEvent) {
    e.preventDefault();
    setGuardandoAnular(true);
    setErrorAnular(null);

    const { error } = await supabase.rpc("anular_partida", {
      p_partida_id: partidaId,
      p_motivo: motivoAnular.trim(),
      p_usuario: usuario,
    });

    if (error) {
      setErrorAnular(error.message);
      setGuardandoAnular(false);
      return;
    }

    router.push(`/clientes/${clienteId}`);
  }

  function cerrarModalPartir() {
    setModalPartirAbierto(false);
    setMontoPartir("");
    setErrorPartir(null);
  }

  async function confirmarPartir(e: React.FormEvent) {
    e.preventDefault();
    setGuardandoPartir(true);
    setErrorPartir(null);

    const { data, error } = await supabase.rpc("partir_partida", {
      p_partida_id: partidaId,
      p_monto: montoPartir,
      p_usuario: usuario,
    });

    if (error) {
      setErrorPartir(error.message);
      setGuardandoPartir(false);
      return;
    }

    router.push(`/clientes/${clienteId}/expediente/${data}`);
  }

  if (cargando) return <div>Cargando…</div>;
  if (error) return <div className="field-error">{error}</div>;
  if (!partida) return <div>Partida no encontrada.</div>;

  const vencimiento = calcularVencimiento(partida);
  const vencida = Boolean(vencimiento && vencimiento < hoyISO());
  const accionFechas = acciones["fechas"];

  return (
    <div>
      <Link href={`/clientes/${clienteId}`} className="btn-link">
        ← Ficha del cliente
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 8 }}>
        <div>
          <div className="page-title" style={{ marginBottom: 0 }}>
            Expediente — {partida.documento_interno}
          </div>
          <div className="page-sub">
            {partida.cliente_nombre} · {formatBs(partida.total)}
          </div>
        </div>
        {esGerente && (
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalPartirAbierto(true)}>
              Partir partida
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ borderColor: "var(--alerta)", color: "var(--alerta)" }}
              onClick={() => setModalAnularAbierto(true)}
            >
              Anular partida
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ margin: "16px 0" }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          Fechas de la partida
        </div>

        {!partida.fecha_entrega && (
          <div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: mostrarFormEntrega ? 10 : 0 }}>
              Todavía no se registró la entrega.
            </div>
            {puedeFechas && !mostrarFormEntrega && (
              <button
                type="button"
                className="btn btn-orange"
                style={{ marginTop: 10 }}
                onClick={() => {
                  setFechaEntregaInput(hoyISO());
                  setMostrarFormEntrega(true);
                }}
              >
                Registrar entrega
              </button>
            )}
            {mostrarFormEntrega && (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="date"
                  className="input"
                  style={{ maxWidth: 180 }}
                  value={fechaEntregaInput}
                  onChange={(e) => setFechaEntregaInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-orange"
                  disabled={accionFechas?.cargando}
                  onClick={() => registrarFechas(fechaEntregaInput, null, null)}
                >
                  {accionFechas?.cargando ? "Guardando…" : "Guardar entrega"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setMostrarFormEntrega(false)}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {partida.fecha_entrega && !partida.fecha_factura && (
          <div>
            <div style={{ fontSize: 13, marginBottom: 10 }}>
              Entregada el <b>{partida.fecha_entrega}</b> · hace {diasTranscurridosDesde(partida.fecha_entrega)}{" "}
              {diasTranscurridosDesde(partida.fecha_entrega) === 1 ? "día" : "días"}
            </div>
            {puedeFechas && !mostrarFormFactura && (
              <button
                type="button"
                className="btn btn-orange"
                onClick={() => {
                  setFechaFacturaInput(hoyISO());
                  setMostrarFormFactura(true);
                }}
              >
                Registrar factura
              </button>
            )}
            {mostrarFormFactura && (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="date"
                  className="input"
                  style={{ maxWidth: 180 }}
                  value={fechaFacturaInput}
                  onChange={(e) => setFechaFacturaInput(e.target.value)}
                />
                <input
                  type="text"
                  className="input"
                  style={{ maxWidth: 200 }}
                  placeholder="CUF (opcional)"
                  value={cufInput}
                  onChange={(e) => setCufInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-orange"
                  disabled={accionFechas?.cargando}
                  onClick={() => registrarFechas(null, fechaFacturaInput, cufInput.trim() || null)}
                >
                  {accionFechas?.cargando ? "Guardando…" : "Guardar factura"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setMostrarFormFactura(false)}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {partida.fecha_entrega && partida.fecha_factura && (
          <div style={{ fontSize: 13 }}>
            <div>
              Entregada el <b>{partida.fecha_entrega}</b> · Facturada el <b>{partida.fecha_factura}</b>
              {partida.cuf && (
                <>
                  {" "}
                  · CUF <b>{partida.cuf}</b>
                </>
              )}
            </div>
            <div style={{ marginTop: 6 }}>
              {vencimiento ? (
                <>
                  Vence el <b>{vencimiento}</b> — {partida.plazo_dias} días después de la {textoBase(partida.inicio_computo)}
                  {vencida && (
                    <span className="badge badge-vencida" style={{ marginLeft: 8 }}>
                      Vencida
                    </span>
                  )}
                </>
              ) : (
                "Sin fecha de vencimiento (contado)."
              )}
            </div>
          </div>
        )}

        {!puedeFechas && !(partida.fecha_entrega && partida.fecha_factura) && (
          <div className="field-hint" style={{ marginTop: 8 }}>
            Tu rol no puede registrar fechas de la partida.
          </div>
        )}

        {accionFechas?.error && (
          <div className="field-error" style={{ marginTop: 8 }}>
            {accionFechas.error}
          </div>
        )}
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

      {modalAnularAbierto && (
        <div className="modal-overlay" onClick={cerrarModalAnular}>
          <form className="card modal-card" onClick={(e) => e.stopPropagation()} onSubmit={confirmarAnular}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Anular partida</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>
              No se borra nada: se genera una nota de crédito por {formatBs(partida.total)} en la cuenta de {partida.cliente_nombre}.
              Se niega si la partida tiene pagos aplicados.
            </div>

            <div className="field">
              <label htmlFor="motivoAnular">Motivo (obligatorio)</label>
              <textarea
                id="motivoAnular"
                className="textarea"
                rows={3}
                value={motivoAnular}
                onChange={(e) => setMotivoAnular(e.target.value)}
                required
              />
            </div>

            {errorAnular && <div className="field-error" style={{ marginBottom: 14 }}>{errorAnular}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={cerrarModalAnular} disabled={guardandoAnular}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-orange" disabled={guardandoAnular || !motivoAnular.trim()}>
                {guardandoAnular ? "Anulando…" : "Confirmar anulación"}
              </button>
            </div>
          </form>
        </div>
      )}

      {modalPartirAbierto && (
        <div className="modal-overlay" onClick={cerrarModalPartir}>
          <form className="card modal-card" onClick={(e) => e.stopPropagation()} onSubmit={confirmarPartir}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Partir partida</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>
              Se crea una partida nueva por el monto indicado con su propio expediente, y esta ({partida.documento_interno}) queda
              con el resto. El saldo del cliente no cambia: el traspaso se hace con una nota de crédito sobre esta partida y un
              cargo sobre la nueva.
            </div>

            <div className="field">
              <label htmlFor="montoPartir">Monto a separar (Bs)</label>
              <input
                id="montoPartir"
                type="number"
                min="0.01"
                step="0.01"
                className="input"
                value={montoPartir}
                onChange={(e) => setMontoPartir(e.target.value)}
                autoFocus
                required
              />
              <div className="field-hint">Total actual: {formatBs(partida.total)}. Tiene que ser mayor que 0 y menor que el total.</div>
            </div>

            {errorPartir && <div className="field-error" style={{ marginBottom: 14 }}>{errorPartir}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={cerrarModalPartir} disabled={guardandoPartir}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-orange" disabled={guardandoPartir || !montoPartir}>
                {guardandoPartir ? "Partiendo…" : "Confirmar partición"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

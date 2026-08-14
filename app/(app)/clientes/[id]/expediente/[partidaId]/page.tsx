"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatBs } from "@/lib/money";
import { rolDeUsuario, puedeRegistrarFechas, puedeGestionarDocumentos } from "@/lib/roles";
import { diasDesde, hoyLocal } from "@/lib/fechas";
import { SubidaEvidencia } from "@/components/SubidaEvidencia";
import type { CationPedido, Documento, Hito, PartidaAbierta, VCotizacionHermes, VPedidoLineaHermes } from "@/lib/types";

type HitoConPendientes = Hito & { habilitantes_pendientes: number };
type EstadoAccion = { cargando: boolean; error: string | null };

function sumarDias(fechaISO: string, dias: number): string {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
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

/**
 * partir_partida devuelve un bigint escalar, pero PostgREST no siempre lo
 * entrega tal cual (puede llegar envuelto en fila u objeto según el cliente):
 * normalizar acá evita que la URL de navegación salga "[object Object]".
 */
function idDesdeRpc(data: unknown): number | null {
  if (typeof data === "number" && Number.isFinite(data)) return data;
  if (typeof data === "string" && /^-?\d+$/.test(data)) return Number(data);
  if (Array.isArray(data)) return data.length > 0 ? idDesdeRpc(data[0]) : null;
  if (data && typeof data === "object") {
    const valores = Object.values(data as Record<string, unknown>);
    return valores.length === 1 ? idDesdeRpc(valores[0]) : null;
  }
  return null;
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
  // Brief T7 Tarea 2: carga/borrado de documentos es solo admin/gerente.
  const [puedeDocs, setPuedeDocs] = useState(false);
  const [puedeFechas, setPuedeFechas] = useState(false);
  const [usuario, setUsuario] = useState("desconocido");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorHitos, setErrorHitos] = useState<string | null>(null);
  const [acciones, setAcciones] = useState<Record<string, EstadoAccion>>({});
  const [notas, setNotas] = useState<Record<number, string>>({});

  // Brief T7 Tarea 3: origen y detalle del pedido — estrictamente de solo lectura, foreign
  // tables hacia Cation. Solo se piden acá (detalle de UNA partida), nunca en la grilla.
  const [cotizacionOrigen, setCotizacionOrigen] = useState<VCotizacionHermes | null>(null);
  const [lineasPedido, setLineasPedido] = useState<VPedidoLineaHermes[]>([]);
  const [errorDetallePedido, setErrorDetallePedido] = useState<string | null>(null);

  const [mostrarFormEntrega, setMostrarFormEntrega] = useState(false);
  const [fechaEntregaInput, setFechaEntregaInput] = useState(hoyLocal());
  const [mostrarFormFactura, setMostrarFormFactura] = useState(false);
  const [fechaFacturaInput, setFechaFacturaInput] = useState(hoyLocal());
  const [cufInput, setCufInput] = useState("");

  const [modalAnularAbierto, setModalAnularAbierto] = useState(false);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [guardandoAnular, setGuardandoAnular] = useState(false);
  const [errorAnular, setErrorAnular] = useState<string | null>(null);

  const [modalPartirAbierto, setModalPartirAbierto] = useState(false);
  const [montoPartir, setMontoPartir] = useState("");
  const [guardandoPartir, setGuardandoPartir] = useState(false);
  const [errorPartir, setErrorPartir] = useState<string | null>(null);

  /**
   * Brief T7 Tarea 3: cotización de origen y líneas del pedido — separado de `cargar()`
   * porque necesita `partida.pedido_id`, que recién se conoce después de leer la partida.
   * Nota de rendimiento del brief: cada consulta acá viaja por red hasta Cation (foreign
   * table) — por eso esto vive en el detalle de UNA partida, nunca en la grilla.
   */
  async function cargarDetallePedido(pedidoId: number | null) {
    setErrorDetallePedido(null);
    if (pedidoId == null) {
      setCotizacionOrigen(null);
      setLineasPedido([]);
      return;
    }

    const [pedidoRes, lineasRes] = await Promise.all([
      supabase.from("cation_pedido").select("*").eq("id", pedidoId).maybeSingle(),
      supabase.from("v_pedido_linea_hermes").select("*").eq("pedido_id", pedidoId).order("id"),
    ]);

    if (pedidoRes.error || lineasRes.error) {
      setErrorDetallePedido((pedidoRes.error ?? lineasRes.error)?.message ?? "No se pudo cargar el detalle del pedido");
      setCotizacionOrigen(null);
      setLineasPedido([]);
      return;
    }

    setLineasPedido((lineasRes.data ?? []) as VPedidoLineaHermes[]);

    const cationPedido = pedidoRes.data as CationPedido | null;
    if (!cationPedido?.cotizacion_origen_id) {
      // La mayoría de los pedidos viejos no tienen origen y los internos nunca lo van a
      // tener — no mostrar la sección, no es un error.
      setCotizacionOrigen(null);
      return;
    }

    const cotizacionRes = await supabase
      .from("v_cotizacion_hermes")
      .select("*")
      .eq("id", cationPedido.cotizacion_origen_id)
      .maybeSingle();

    if (cotizacionRes.error) {
      setErrorDetallePedido(cotizacionRes.error.message);
      setCotizacionOrigen(null);
      return;
    }

    setCotizacionOrigen((cotizacionRes.data ?? null) as VCotizacionHermes | null);
  }

  async function cargar() {
    setCargando(true);
    setError(null);
    setErrorHitos(null);

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
    setPuedeDocs(puedeGestionarDocumentos(rol));
    setPuedeFechas(puedeRegistrarFechas(rol));
    const partidaData = partidaRes.data as PartidaAbierta;
    setPartida(partidaData);
    void cargarDetallePedido(partidaData.pedido_id);

    if (hitosRes.error) {
      setErrorHitos(hitosRes.error.message);
      setHitos([]);
      setDocumentosPorHito({});
      setCargando(false);
      return;
    }

    const hitosData = (hitosRes.data ?? []) as Hito[];
    const hitoIds = hitosData.map((h) => h.id);

    const docsRes = hitoIds.length
      ? await supabase.from("documento").select("*").in("hito_id", hitoIds).order("id")
      : { data: [] as Documento[], error: null };

    if (docsRes.error) {
      setErrorHitos(docsRes.error.message);
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
    // Preparado para múltiples páginas: hoy documento.storage_path es una
    // sola columna, así que la "lista" tiene como mucho un elemento y se
    // muestra siempre la primera. Cuando la base sume una tabla/columna de
    // páginas, alimentar storagePaths desde ahí sin tocar el resto.
    const storagePaths = doc.storage_path ? [doc.storage_path] : [];
    const primera = storagePaths[0];
    if (!primera) return;

    // La pestaña se abre ANTES del await: si se abre después, el navegador
    // ya perdió el gesto del usuario y bloquea el popup. Se redirige recién
    // cuando la signed URL está lista.
    const ventana = window.open("", "_blank");

    const { data, error } = await supabase.storage.from("documentos-expediente").createSignedUrl(primera, 60);

    if (error || !data) {
      ventana?.close();
      setAccion(`doc-${doc.id}`, { cargando: false, error: error?.message ?? "No se pudo generar el enlace." });
      return;
    }

    if (ventana) {
      ventana.location.href = data.signedUrl;
    } else {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
  }

  /** Brief T7 Tarea 2: borrado solo admin/gerente, con confirmación acá (el botón que lo
   * dispara ya está gateado por puedeDocs, pero la confirmación es la última barrera antes
   * de un borrado irreversible). */
  async function borrarDocumento(doc: Documento) {
    if (!confirm(`¿Borrar el archivo de "${doc.etiqueta}"? No se puede deshacer.`)) return;
    const key = `doc-${doc.id}`;
    setAccion(key, { cargando: true, error: null });
    const res = await fetch("/api/evidencia/eliminar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entidad: "documento", entidadId: doc.id }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setAccion(key, { cargando: false, error: data?.error ?? "No se pudo borrar el archivo" });
      return;
    }
    setAccion(key, { cargando: false, error: null });
    await cargar();
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

    const nuevaId = idDesdeRpc(data);
    if (nuevaId == null) {
      setErrorPartir("La partición se realizó, pero no se pudo determinar el id de la partida nueva.");
      setGuardandoPartir(false);
      return;
    }

    router.push(`/clientes/${clienteId}/expediente/${nuevaId}`);
  }

  if (cargando) return <div>Cargando…</div>;
  if (error) return <div className="field-error">{error}</div>;
  if (!partida) return <div>Partida no encontrada.</div>;

  const vencimiento = calcularVencimiento(partida);
  const vencida = Boolean(vencimiento && vencimiento < hoyLocal());
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
                  setFechaEntregaInput(hoyLocal());
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
            {mostrarFormEntrega && fechaEntregaInput > hoyLocal() && (
              <div className="banner-warn" style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12.5 }}>Estás registrando una entrega con fecha futura.</div>
              </div>
            )}
          </div>
        )}

        {partida.fecha_entrega && !partida.fecha_factura && (
          <div>
            <div style={{ fontSize: 13, marginBottom: 10 }}>
              Entregada el <b>{partida.fecha_entrega}</b> · hace {diasDesde(partida.fecha_entrega)}{" "}
              {diasDesde(partida.fecha_entrega) === 1 ? "día" : "días"}
            </div>
            {puedeFechas && !mostrarFormFactura && (
              <button
                type="button"
                className="btn btn-orange"
                onClick={() => {
                  setFechaFacturaInput(hoyLocal());
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

      {errorDetallePedido && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="field-error">No se pudo cargar el detalle del pedido ({errorDetallePedido}).</div>
        </div>
      )}

      {/* Brief T7 Tarea 3: estrictamente de solo lectura — Hermes nunca escribe sobre
          pedidos ni cotizaciones, así que acá no hay ningún botón de edición. */}
      {cotizacionOrigen && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: 700, marginBottom: 8 }}>
            Cotización de origen
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{cotizacionOrigen.numero}</span>
            <span className="money" style={{ fontSize: 15, fontWeight: 800 }}>{cotizacionOrigen.total ? formatBs(cotizacionOrigen.total) : "—"}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            {cotizacionOrigen.fecha ?? "sin fecha"} · aprobada por {cotizacionOrigen.aprobado_por ?? "—"}
          </div>
        </div>
      )}

      {lineasPedido.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: 700, marginBottom: 8 }}>
            Líneas del pedido
          </div>
          <div className="table">
            <div className="table-head" style={{ gridTemplateColumns: "2fr 90px 1fr 80px 1fr" }}>
              <div>Descripción</div>
              <div>Cantidad</div>
              <div>P/U</div>
              <div>Desc.</div>
              <div>Subtotal</div>
            </div>
            {lineasPedido.map((l) => {
              const cantidadBase = Number(l.cantidad_base);
              const despachada = l.cantidad_despachada != null ? Number(l.cantidad_despachada) : null;
              // Es lo que el almacén todavía debe: despachado menor a lo pedido.
              const pendienteDespacho = despachada != null && despachada < cantidadBase;
              return (
                <div
                  key={l.id}
                  className={`table-row ${pendienteDespacho ? "detalle-pedido-linea-pendiente" : ""}`}
                  style={{ gridTemplateColumns: "2fr 90px 1fr 80px 1fr" }}
                >
                  <div>
                    <span style={{ fontSize: 12.5 }}>{l.descripcion ?? "—"}</span>
                    {pendienteDespacho && (
                      <div style={{ fontSize: 11, color: "var(--provisional)" }}>
                        ⚠️ despachado {l.cantidad_despachada} de {l.cantidad_base}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 12.5 }}>{l.cantidad_presentacion ?? l.cantidad_base}</span>
                  <span style={{ fontSize: 12.5 }}>{formatBs(l.precio_unitario)}</span>
                  <span style={{ fontSize: 12.5 }}>{Number(l.descuento_pct) > 0 ? `${l.descuento_pct}%` : "—"}</span>
                  <span className="money" style={{ fontSize: 12.5 }}>{formatBs(l.subtotal)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                        {d.storage_path && puedeDocs && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ borderColor: "var(--alerta)", color: "var(--alerta)" }}
                            disabled={accionDoc?.cargando}
                            onClick={() => borrarDocumento(d)}
                          >
                            Borrar archivo
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
                    {!d.storage_path && puedeDocs && (
                      <div style={{ marginTop: 6 }}>
                        <SubidaEvidencia entidad="documento" entidadId={d.id} label="Subir documento" onSubido={cargar} />
                      </div>
                    )}
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
        {errorHitos && (
          <div className="card">
            <div className="field-error" style={{ marginBottom: 10 }}>
              No se pudieron cargar los hitos ({errorHitos}).
            </div>
            <button type="button" className="btn btn-secondary" onClick={cargar}>
              Reintentar
            </button>
          </div>
        )}
        {!errorHitos && hitos.length === 0 && (
          <div style={{ color: "var(--muted)" }}>Este expediente no tiene hitos.</div>
        )}
      </div>

      {modalAnularAbierto && (
        <div className="modal-overlay" onClick={guardandoAnular ? undefined : cerrarModalAnular}>
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
        <div className="modal-overlay" onClick={guardandoPartir ? undefined : cerrarModalPartir}>
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

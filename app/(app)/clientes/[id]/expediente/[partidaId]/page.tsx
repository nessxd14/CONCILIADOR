"use client";

import { obtenerSesionHermes } from "@/lib/supabase/session";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatBs } from "@/lib/money";
import { resumirPago } from "@/lib/pago-estado";
import { ExpedienteOrigen } from "@/components/ExpedienteOrigen";
import { cantidadDocumento, etiquetasOrigen, lineasVigentes, resumenHitoOrigen, type OrigenExpediente } from "@/lib/expediente-origen";
import { useHermesRefresh } from "@/lib/supabase/use-refresh";
import { puedeRegistrarFechas, puedeGestionarEvidencia, puedeConfirmarPagos } from "@/lib/roles";
import { subirEvidencia, validarArchivo } from "@/lib/uploads";
import { diasDesde, hoyLocal, formatDiaMes } from "@/lib/fechas";
import type { Documento, Hito, PartidaAbierta, VCotizacionHermes, VPedidoLineaHermes } from "@/lib/types";

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
  const [puedeFechas, setPuedeFechas] = useState(false);
  const [puedeSubirArchivo, setPuedeSubirArchivo] = useState(false);
  const [usuario, setUsuario] = useState("desconocido");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorHitos, setErrorHitos] = useState<string | null>(null);
  const [acciones, setAcciones] = useState<Record<string, EstadoAccion>>({});
  const [notas, setNotas] = useState<Record<number, string>>({});

  const [subiendoDocumento, setSubiendoDocumento] = useState<Record<number, boolean>>({});
  const [errorSubidaDocumento, setErrorSubidaDocumento] = useState<Record<number, string | null>>({});

  const [despacho, setDespacho] = useState<{ despachado_en: string; despachado_sincronizando: boolean } | null>(null);

  const [hermanas, setHermanas] = useState<{ id: number; entrega_numero: number; documento_interno: string }[]>([]);

  const [origen, setOrigen] = useState<OrigenExpediente | null>(null);
  const [errorOrigen, setErrorOrigen] = useState<string | null>(null);
  const [modalOrigenAbierto, setModalOrigenAbierto] = useState(false);
  const [cotizacion, setCotizacion] = useState<VCotizacionHermes | null>(null);
  const [lineasPedido, setLineasPedido] = useState<VPedidoLineaHermes[]>([]);
  const [cargandoDetallePedido, setCargandoDetallePedido] = useState(false);
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

  async function cargar() {
    // Al volver a la ventana conservamos el expediente visible durante la consulta.
    if (!partida || partida.id !== partidaId) setCargando(true);
    setError(null);
    setErrorHitos(null);

    const [{ data: userData, error: errorSesion }, partidaRes, hitosRes, frenteRes, origenRes] = await Promise.all([
      obtenerSesionHermes(supabase),
      supabase.from("partida_abierta").select("*").eq("id", partidaId).single(),
      supabase.from("hito").select("*").eq("partida_abierta_id", partidaId).order("orden"),
      // Nota informativa de "despachado, sincronizando" — nada que ver con
      // v_partidas_frenadas ni con la bandeja de Telegram.
      supabase
        .from("v_frente_partida")
        .select("despachado_en, despachado_sincronizando")
        .eq("partida_id", partidaId)
        .maybeSingle(),
      supabase.rpc("obtener_origen_expediente", { p_partida_id: partidaId }),
    ]);

      if (errorSesion) { setError("No se pudo validar el acceso a Hermes. Reintenta la consulta."); setCargando(false); return; }

    if (partidaRes.error) {
      setError(partidaRes.error.message);
      setCargando(false);
      return;
    }

    setUsuario(userData.user?.email ?? "desconocido");
    const rol = userData.rol;
    setEsGerente(puedeConfirmarPagos(rol));
    setPuedeFechas(puedeRegistrarFechas(rol));
    setPuedeSubirArchivo(puedeGestionarEvidencia(rol));
    setPartida(partidaRes.data as PartidaAbierta);
    setOrigen((origenRes.data ?? null) as OrigenExpediente | null);
    setErrorOrigen(partidaRes.data.cliente_categoria === "MAYORISTA" ? origenRes.error?.message ?? null : null);
    setDespacho(
      frenteRes.data?.despachado_sincronizando && frenteRes.data.despachado_en
        ? { despachado_en: frenteRes.data.despachado_en, despachado_sincronizando: true }
        : null
    );

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
    await cargarDetallePedido(partidaRes.data.pedido_id);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, partidaId]);

  useHermesRefresh(cargar, !cargando && !modalOrigenAbierto && !mostrarFormEntrega && !mostrarFormFactura
    && !modalAnularAbierto && !modalPartirAbierto && !Object.values(subiendoDocumento).some(Boolean)
    && !Object.values(notas).some(n => n.trim().length > 0));

  async function cargarDetallePedido(pedidoId: number | null) {
    if (pedidoId == null) { setLineasPedido([]); setCotizacion(null); return; }
    setCargandoDetallePedido(true);
    setErrorDetallePedido(null);
    const { data, error } = await supabase.rpc("obtener_detalle_pedido_cation", { p_pedido_id: pedidoId });
    if (error) {
      setErrorDetallePedido(error.message); setLineasPedido([]); setCotizacion(null);
    } else {
      const detalle = data as { lineas: VPedidoLineaHermes[]; cotizacion: VCotizacionHermes | null } | null;
      setLineasPedido(detalle?.lineas ?? []); setCotizacion(detalle?.cotizacion ?? null);
    }
    setCargandoDetallePedido(false);
  }

  // Navegación entre entregas hermanas (raíz + hijas del mismo pedido).
  useEffect(() => {
    async function cargarHermanas(partidaRaizId: number) {
      const { data } = await supabase
        .from("partida_abierta")
        .select("id, entrega_numero, documento_interno")
        .eq("partida_raiz_id", partidaRaizId)
        .order("entrega_numero");
      setHermanas((data ?? []) as { id: number; entrega_numero: number; documento_interno: string }[]);
    }

    if (partida?.partida_raiz_id != null) {
      cargarHermanas(partida.partida_raiz_id);
    } else {
      setHermanas([]);
    }
  }, [supabase, partida?.partida_raiz_id]);

  const lineasActivas = lineasVigentes(lineasPedido);
  const lineasHistoricas = lineasPedido.filter(l => !lineasActivas.includes(l));

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

  /**
   * Segundo camino de carga, además del de los agentes de Telegram: acá el
   * archivo lo sube un admin/gerente a mano desde el Conciliador. evidencia
   * guarda la metadata rica (nombre, mime, tamaño) aunque documento no tenga
   * una columna que la referencie — subir_documento sigue siendo la única
   * fuente de verdad sobre estado/storage_path del documento.
   */
  async function subirDocumento(doc: Documento, file: File) {
    const errorValidacion = validarArchivo(file);
    if (errorValidacion) {
      setErrorSubidaDocumento((prev) => ({ ...prev, [doc.id]: errorValidacion }));
      return;
    }

    setSubiendoDocumento((prev) => ({ ...prev, [doc.id]: true }));
    setErrorSubidaDocumento((prev) => ({ ...prev, [doc.id]: null }));

    const subida = await subirEvidencia(supabase, `expediente/${doc.id}`, file, usuario);
    if (subida.error || !subida.data) {
      setErrorSubidaDocumento((prev) => ({ ...prev, [doc.id]: subida.error ?? "No se pudo subir el archivo." }));
      setSubiendoDocumento((prev) => ({ ...prev, [doc.id]: false }));
      return;
    }

    const { error } = await supabase.rpc("subir_documento", {
      p_documento_id: doc.id,
      p_storage_path: subida.data.storagePath,
      p_usuario: usuario,
    });

    if (error) {
      setErrorSubidaDocumento((prev) => ({ ...prev, [doc.id]: error.message }));
      setSubiendoDocumento((prev) => ({ ...prev, [doc.id]: false }));
      return;
    }

    setSubiendoDocumento((prev) => ({ ...prev, [doc.id]: false }));
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
  const estadoPago = resumirPago(origen?.pago);

  return (
    <div>
      <div className="expediente-navegacion">
        <Link href={`/clientes/${clienteId}`} className="btn-link">← Ficha del cliente</Link>
        <button type="button" className="btn btn-secondary" onClick={cargar}>Actualizar</button>
      </div>

      {hermanas.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {hermanas.map((h) => (
            <Link
              key={h.id}
              href={`/clientes/${clienteId}/expediente/${h.id}`}
              className={h.id === partidaId ? "btn btn-secondary" : "btn-link"}
            >
              Entrega {h.entrega_numero}
            </Link>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
        <div>
          <div className="page-title" style={{ marginBottom: 0 }}>
            Expediente — {partida.documento_interno}
          </div>
          <div className="page-sub">
            {partida.cliente_nombre} · {formatBs(partida.total)}
          </div>
          {despacho && (
            <div className="nota-sincronizando">
              Despachado el {formatDiaMes(despacho.despachado_en)} — sincronizando con el sistema
            </div>
          )}
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
                  // Sugerencia, no candado: si Cation ya despachó y todavía
                  // no llegó el sync, se precarga esa fecha real en vez de
                  // hoy — la persona la puede cambiar igual.
                  setFechaEntregaInput(despacho?.despachado_en ?? hoyLocal());
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
              {origen && !origen.recepcion.fecha ? "Fecha de entrega registrada" : "Entregada"} el <b>{partida.fecha_entrega}</b> · hace {diasDesde(partida.fecha_entrega)}{" "}
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
              {origen && !origen.recepcion.fecha ? "Fecha de entrega registrada" : "Entregada"} el <b>{partida.fecha_entrega}</b> · Facturada el <b>{partida.fecha_factura}</b>
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

      {origen && <ExpedienteOrigen origen={origen} lineas={lineasPedido} fechaHermes={partida.fecha_entrega} clienteNombre={partida.cliente_nombre} onDocumentoAbierto={setModalOrigenAbierto} />}
      {errorOrigen && <div className="field-error" style={{ marginBottom: 16 }}>No se pudo consultar el seguimiento de Seller ({errorOrigen}). Usa Actualizar para reintentar.</div>}

      {errorDetallePedido && (
        <div className="field-error" style={{ marginBottom: 16 }}>
          No se pudo cargar el detalle del pedido en Cation ({errorDetallePedido}).
        </div>
      )}

      {/* La mayoría de los pedidos viejos no tienen origen y los internos
          nunca lo van a tener: si no hay cotización, no se muestra la sección. */}
      {!origen && cotizacion && (
        <div className="card" style={{ margin: "16px 0" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: 700, marginBottom: 10 }}>
            Cotización de origen
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{cotizacion.numero}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
            {cotizacion.fecha} · {formatBs(cotizacion.total)}
            {cotizacion.aprobado_por && <> · aprobada por {cotizacion.aprobado_por}</>}
          </div>
        </div>
      )}

      {lineasPedido.length > 0 && (
        <details className="card" style={{ margin: "16px 0" }} open={!origen}>
          <summary style={{ fontSize: 13, fontWeight: 650, cursor: "pointer", marginBottom: 10 }}>Productos del pedido · {lineasActivas.length} líneas vigentes</summary>
          <div className="table">
            <div className="table-head" style={{ gridTemplateColumns: "2fr 80px 1fr 80px 1fr" }}>
              <div>Descripción</div>
              <div>Cant.</div>
              <div>Precio unit.</div>
              <div>Desc.</div>
              <div>Subtotal</div>
            </div>
            {lineasActivas.map((l) => {
              const cantidadDespachada = origen?.salida.lineas.find(d => d.id === l.id)?.cantidad_despachada ?? l.cantidad_despachada;
              const fueraAlmacen = ["COMPRADO_DIRECTO", "ESPECIAL"].includes(l.estado);
              const despachoPendiente = !fueraAlmacen && Number(cantidadDespachada) < Number(l.cantidad_base);
              return (
                <div key={l.id} className="table-row" style={{ gridTemplateColumns: "2fr 80px 1fr 80px 1fr" }}>
                  <span style={{ fontSize: 12.5 }}>
                    {l.descripcion}
                    {fueraAlmacen && <span className="field-hint"> · {l.estado === "COMPRADO_DIRECTO" ? "Compra directa" : "Especial"}</span>}
                    {despachoPendiente && (
                      <span className="linea-despacho-pendiente" style={{ marginLeft: 6, fontSize: 11 }}>
                        · despacho pendiente ({cantidadDespachada}/{l.cantidad_base})
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 12 }} title={`${l.cantidad_base} unidades base`}>{cantidadDocumento(l)}</span>
                  <span style={{ fontSize: 12 }}>{formatBs(l.precio_unitario)}</span>
                  <span style={{ fontSize: 12 }}>{Number(l.descuento_pct) > 0 ? `${l.descuento_pct}%` : "—"}</span>
                  <span className="money" style={{ fontSize: 12 }}>{formatBs(l.subtotal)}</span>
                </div>
              );
            })}
          </div>
          {lineasHistoricas.length > 0 && <details className="origen-historial"><summary>Ver {lineasHistoricas.length} líneas sustituidas, retiradas o rechazadas</summary>{lineasHistoricas.map(l => <p key={l.id}>{l.descripcion} · {l.estado.toLowerCase()}</p>)}</details>}
        </details>
      )}

      {cargandoDetallePedido && lineasPedido.length === 0 && !errorDetallePedido && (
        <div style={{ color: "var(--muted)", marginBottom: 16, fontSize: 12.5 }}>Cargando detalle del pedido…</div>
      )}

      {hitoBloqueado && docBloqueante && (
        <a href={`#hito-${hitoBloqueado.id}`} className="banner-alerta" style={{ marginBottom: 16, textDecoration: "none", color: "inherit" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--alerta)" }}>{estadoPago?.registrado.gt(0) ? "Documentación pendiente del expediente" : "Esto frena el cobro"}</div>
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
          const pagoRegistrado = h.nombre === "Pago" && estadoPago?.registrado.gt(0) ? estadoPago : null;
          const puedeCompletar = !h.origen_sistema && esGerente && h.estado === "PENDIENTE" && h.habilitantes_pendientes === 0;

          return (
            <div key={h.id} id={`hito-${h.id}`} className="timeline-hito">
              <span className={`timeline-dot ${pagoRegistrado ? pagoRegistrado.pagado ? "completo" : "registrado" : h.estado === "COMPLETO" ? "completo" : ""}`} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <b style={{ fontSize: 13.5 }}>{h.nombre}</b>
                  <span className={pagoRegistrado ? pagoRegistrado.pagado ? "badge badge-aldia" : "badge badge-ambar" : h.estado === "COMPLETO" ? "badge badge-aldia" : "badge badge-pendiente"} style={{ marginLeft: 8 }}>
                    {pagoRegistrado ? pagoRegistrado.etiqueta : h.origen_estado ? h.estado === "PENDIENTE" && ["COMPLETO", "NO_APLICA"].includes(h.origen_estado) ? "Respaldo pendiente" : etiquetasOrigen[h.origen_estado] : h.estado}
                  </span>
                </div>
                {puedeCompletar && (
                  <button type="button" className="btn btn-orange" disabled={accionHito?.cargando} onClick={() => completar(h)}>
                    {accionHito?.cargando ? "Completando…" : "Marcar completo"}
                  </button>
                )}
              </div>
              {pagoRegistrado && <p className="origen-hito"><strong>{pagoRegistrado.titulo}</strong> · {pagoRegistrado.mensaje}<br />Respaldo documental: {h.estado === "COMPLETO" ? "completo" : "pendiente"}.</p>}
              {h.origen_sistema && h.origen_datos && <p className="origen-hito"><strong>{h.origen_sistema === "SELLER" ? "Desde Seller" : "Desde almacén"}</strong> · {resumenHitoOrigen(h.nombre, h.origen_datos)}</p>}
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
                        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>{h.origen_sistema && d.tipo === "ANEXO" && d.estado === "PENDIENTE" ? "Sin adjunto (opcional)" : d.estado}</span>
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
                    {puedeSubirArchivo && (d.estado === "PENDIENTE" || d.estado === "RECHAZADO") && (
                      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="file"
                          aria-label={`Adjuntar ${d.etiqueta}${h.origen_sistema && d.tipo === "ANEXO" ? " (opcional)" : ""}`}
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="subida-input"
                          disabled={subiendoDocumento[d.id]}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) subirDocumento(d, file);
                          }}
                        />
                        {subiendoDocumento[d.id] && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Subiendo…</span>}
                      </div>
                    )}
                    {errorSubidaDocumento[d.id] && (
                      <div className="subida-error">{errorSubidaDocumento[d.id]}</div>
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

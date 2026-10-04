"use client";

import { obtenerSesionHermes } from "@/lib/supabase/session";
import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Decimal from "decimal.js";
import { createClient } from "@/lib/supabase/client";
import { useHermesRefresh } from "@/lib/supabase/use-refresh";
import { formatBs } from "@/lib/money";
import { resumirPago } from "@/lib/pago-estado";
import { puedeGestionarEvidencia, type Rol } from "@/lib/roles";
import { subirEvidencia, abrirArchivo, validarArchivo } from "@/lib/uploads";
import { Tabs } from "@/components/Tabs";
import { Icon } from "@/components/Icon";
import type { ClientFixture } from "@/app/vista-previa/preview-data";
import { formatDiaMes } from "@/lib/fechas";
import type {
  Cliente,
  ClienteCredito,
  VAnticipoCliente,
  VMayorAuxiliar,
  VPartidaEstado,
  VPartidasFrenadas,
  VSaldoCliente,
} from "@/lib/types";

const MOTIVO_INFO: Record<string, { label: string; className: string }> = {
  VENCIDA: { label: "Vencido", className: "badge-vencida" },
  ENTREGADO_SIN_FACTURAR: { label: "Sin facturar", className: "badge-ambar" },
  FRENADA: { label: "Frenado", className: "badge-ambar" },
};

const ACCION_INFO: Record<VPartidasFrenadas["accion"], { texto: string; boton: string }> = {
  COBRAR: { texto: "Vencido, cobrar", boton: "Ver expediente" },
  FACTURAR: { texto: "Falta facturar", boton: "Registrar factura" },
  FALTA_DOCUMENTO: { texto: "Falta:", boton: "Ver expediente" },
  LISTO_PARA_COMPLETAR: { texto: "Listo para avanzar", boton: "Completar hito" },
};

// v_mayor_auxiliar.saldo_corrido es una window function sobre el cliente
// completo (verificado: PARTITION BY cliente_id, sin LIMIT dentro de la
// vista), así que paginar el resultado no lo rompe — Postgres calcula el
// acumulado sobre todas las filas del cliente antes de recortar la página.
const PAGINA_MOVIMIENTOS = 200;

export function ClientDetail({ fixture }: { fixture?: ClientFixture }) {
  const params = useParams();
  const clienteId = fixture?.cliente.id ?? Number(params.id);
  const supabase = useMemo(() => createClient(), []);

  const [busquedaMovimiento, setBusquedaMovimiento] = useState("");
  const [panel, setPanel] = useState<"CUENTA" | "PARTIDAS" | "ANTICIPOS" | "PENDIENTES">("CUENTA");
  const [erroresSecciones, setErroresSecciones] = useState<string[]>([]);
  const modalRef = useRef<HTMLDialogElement>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [credito, setCredito] = useState<ClienteCredito | null>(null);
  const [saldo, setSaldo] = useState<VSaldoCliente | null>(null);
  const [movimientos, setMovimientos] = useState<VMayorAuxiliar[]>([]);
  const [offsetMovimientos, setOffsetMovimientos] = useState(0);
  const [hayMasMovimientos, setHayMasMovimientos] = useState(false);
  const [cargandoMasMovimientos, setCargandoMasMovimientos] = useState(false);
  const [errorMovimientos, setErrorMovimientos] = useState<string | null>(null);
  const [tieneApertura, setTieneApertura] = useState(false);
  const [partidasEstado, setPartidasEstado] = useState<VPartidaEstado[]>([]);
  const [anticipos, setAnticipos] = useState<VAnticipoCliente[]>([]);
  const [tabPartidas, setTabPartidas] = useState<"ABIERTA" | "PAGADA" | "ANTICIPO">("ABIERTA");
  const [partidasFrenadas, setPartidasFrenadas] = useState<VPartidasFrenadas[]>([]);
  const [hitoPorPartida, setHitoPorPartida] = useState<Record<number, number>>({});
  const [despachoPorPartida, setDespachoPorPartida] = useState<
    Record<number, { despachado_en: string; despachado_sincronizando: boolean }>
  >({});
  const [cadenaPorPartida, setCadenaPorPartida] = useState<
    Record<number, { partida_raiz_id: number; entrega_numero: number }>
  >({});
  const [entregasPorRaiz, setEntregasPorRaiz] = useState<Record<number, number>>({});
  const [rol, setRol] = useState<Rol | null>(null);
  const [usuario, setUsuario] = useState("desconocido");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subiendoComprobante, setSubiendoComprobante] = useState<Record<number, boolean>>({});
  const [errorComprobante, setErrorComprobante] = useState<Record<number, string | null>>({});

  const esAdmin = rol === "admin";
  const puedeSubir = puedeGestionarEvidencia(rol);

  const [modalNCAbierto, setModalNCAbierto] = useState(false);
  const [montoNC, setMontoNC] = useState("");
  const [motivoNC, setMotivoNC] = useState("");
  const [guardandoNC, setGuardandoNC] = useState(false);
  const [errorNC, setErrorNC] = useState<string | null>(null);

  useHermesRefresh(() => cargar(true), !fixture && !cargando && !modalNCAbierto
    && !cargandoMasMovimientos && offsetMovimientos <= PAGINA_MOVIMIENTOS
    && !Object.values(subiendoComprobante).some(Boolean));

  async function cargar(enSegundoPlano = false) {
      if (!enSegundoPlano) setCargando(true);
      setError(null);
      setErrorMovimientos(null);
      setErroresSecciones([]);

      const [
        { data: userData, error: errorSesion },
        clienteRes,
        creditoRes,
        saldoRes,
        aperturaRes,
        movRes,
        partidasEstadoRes,
        frenadasRes,
        anticiposRes,
        cadenaRes,
      ] = await Promise.all([
        obtenerSesionHermes(supabase),
        supabase.from("cliente").select("*").eq("id", clienteId).single(),
        supabase.from("cliente_credito").select("*").eq("cliente_id", clienteId).maybeSingle(),
        supabase.from("v_saldo_cliente").select("*").eq("cliente_id", clienteId).maybeSingle(),
        // Chequeo aparte, no derivado de los movimientos paginados: la apertura
        // suele ser el movimiento más viejo y podría quedar fuera de "los
        // últimos 200" que se muestran por defecto.
        supabase
          .from("movimiento_cuenta")
          .select("id", { count: "exact", head: true })
          .eq("cliente_id", clienteId)
          .eq("tipo", "SALDO_APERTURA"),
        supabase
          .from("v_mayor_auxiliar")
          .select("*")
          .eq("cliente_id", clienteId)
          .order("fecha_efectiva", { ascending: false })
          .order("id", { ascending: false })
          .range(0, PAGINA_MOVIMIENTOS - 1),
        // Ordenadas por antigüedad (más vieja primero): es también el orden
        // en que calcular_imputacion_fifo va a imputar los pagos.
        supabase
          .from("v_partida_estado")
          .select("*")
          .eq("cliente_id", clienteId)
          .in("estado", ["ABIERTA", "PAGADA"])
          .order("creado_en", { ascending: true }),
        supabase
          .from("v_partidas_frenadas")
          .select("*")
          .eq("cliente_id", clienteId)
          .order("dias", { ascending: false }),
        supabase
          .from("v_anticipo_cliente")
          .select("*")
          .eq("cliente_id", clienteId)
          .order("fecha_recepcion", { ascending: true }),
        // Cadena de entregas (raíz + hijas): se trae de partida_abierta
        // directo, sin filtrar por estado, porque el conteo de "N entregas"
        // en la raíz tiene que reflejar el pedido completo, aunque alguna
        // hija ya esté PAGADA y otra siga ABIERTA.
        supabase.from("partida_abierta").select("id, partida_raiz_id, entrega_numero").eq("cliente_id", clienteId),
      ]);

      if (errorSesion) { setError("No se pudo validar el acceso a Hermes. Reintenta la consulta."); setCargando(false); return; }

      if (clienteRes.error) {
        setError(clienteRes.error.message);
        setCargando(false);
        return;
      }

      const errores = [
        ["Saldo", saldoRes.error], ["Crédito", creditoRes.error], ["Apertura", aperturaRes.error],
        ["Partidas", partidasEstadoRes.error], ["Pendientes", frenadasRes.error], ["Anticipos", anticiposRes.error],
        ["Entregas", cadenaRes.error],
      ].filter(([, error]) => error).map(([section]) => `${section}: no se pudo consultar.`);
      setErroresSecciones(errores);
      setRol(userData.rol);
      setUsuario(userData.user?.email ?? "desconocido");
      setCliente(clienteRes.data as Cliente);
      setCredito((creditoRes.data ?? null) as ClienteCredito | null);
      setSaldo((saldoRes.data ?? null) as VSaldoCliente | null);
      setTieneApertura((aperturaRes.count ?? 0) > 0);

      if (movRes.error) {
        setErrorMovimientos(movRes.error.message);
        setMovimientos([]);
        setHayMasMovimientos(false);
        setOffsetMovimientos(0);
      } else {
        const pagina = (movRes.data ?? []) as VMayorAuxiliar[];
        setMovimientos([...pagina].reverse());
        setOffsetMovimientos(pagina.length);
        setHayMasMovimientos(pagina.length === PAGINA_MOVIMIENTOS);
      }

      setPartidasEstado((partidasEstadoRes.data ?? []) as VPartidaEstado[]);
      setAnticipos((anticiposRes.data ?? []) as VAnticipoCliente[]);

      const cadenaRows = (cadenaRes.data ?? []) as {
        id: number;
        partida_raiz_id: number;
        entrega_numero: number;
      }[];
      setCadenaPorPartida(
        Object.fromEntries(
          cadenaRows.map((r) => [r.id, { partida_raiz_id: r.partida_raiz_id, entrega_numero: r.entrega_numero }])
        )
      );
      const conteoPorRaiz: Record<number, number> = {};
      for (const r of cadenaRows) {
        conteoPorRaiz[r.partida_raiz_id] = (conteoPorRaiz[r.partida_raiz_id] ?? 0) + 1;
      }
      setEntregasPorRaiz(conteoPorRaiz);

      const frenadas = (frenadasRes.data ?? []) as VPartidasFrenadas[];
      setPartidasFrenadas(frenadas);

      const listoPartidaIds = frenadas
        .filter((f) => f.accion === "LISTO_PARA_COMPLETAR")
        .map((f) => f.partida_id);

      // Se trae para TODAS las partidas abiertas (no solo las LISTO_PARA_COMPLETAR):
      // el aviso de "despachado, sincronizando" puede aplicar a cualquiera con
      // inicio_computo = 'ENTREGA', que la vista ya filtra sola.
      const idsAbiertas = ((partidasEstadoRes.data ?? []) as VPartidaEstado[])
        .filter((p) => p.estado === "ABIERTA")
        .map((p) => p.partida_id);

      if (idsAbiertas.length > 0) {
        const { data: frenteData } = await supabase
          .from("v_frente_partida")
          .select("partida_id, hito_id, despachado_en, despachado_sincronizando")
          .in("partida_id", idsAbiertas);

        setHitoPorPartida(
          Object.fromEntries(
            (frenteData ?? [])
              .filter((f) => f.hito_id != null && listoPartidaIds.includes(f.partida_id as number))
              .map((f) => [f.partida_id as number, f.hito_id as number])
          )
        );
        setDespachoPorPartida(
          Object.fromEntries(
            (frenteData ?? [])
              .filter((f) => f.despachado_sincronizando && f.despachado_en != null)
              .map((f) => [
                f.partida_id as number,
                { despachado_en: f.despachado_en as string, despachado_sincronizando: true },
              ])
          )
        );
      } else {
        setHitoPorPartida({});
        setDespachoPorPartida({});
      }

      setCargando(false);
  }

  useEffect(() => {
    if (fixture) {
      setCliente(fixture.cliente); setCredito(fixture.credito); setSaldo(fixture.saldo);
      setMovimientos(fixture.movimientos); setPartidasEstado(fixture.partidas); setAnticipos(fixture.anticipos);
      setPartidasFrenadas(fixture.frenadas); setTieneApertura(true); setRol("auditor"); setCargando(false);
      return;
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, clienteId, fixture]);

  useEffect(() => {
    if (modalNCAbierto && modalRef.current && !modalRef.current.open) modalRef.current.showModal();
  }, [modalNCAbierto]);

  async function cargarMasMovimientos() {
    setCargandoMasMovimientos(true);
    setErrorMovimientos(null);

    const { data, error } = await supabase
      .from("v_mayor_auxiliar")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("fecha_efectiva", { ascending: false })
      .order("id", { ascending: false })
      .range(offsetMovimientos, offsetMovimientos + PAGINA_MOVIMIENTOS - 1);

    if (error) {
      setErrorMovimientos(error.message);
      setCargandoMasMovimientos(false);
      return;
    }

    const pagina = (data ?? []) as VMayorAuxiliar[];
    setMovimientos((prev) => [...[...pagina].reverse(), ...prev]);
    setOffsetMovimientos((prev) => prev + pagina.length);
    setHayMasMovimientos(pagina.length === PAGINA_MOVIMIENTOS);
    setCargandoMasMovimientos(false);
  }

  if (cargando) return <div className="loading-state" role="status">Consultando la cuenta del cliente…</div>;
  if (error) return <div className="empty-state" role="alert"><h2>No pudimos cargar la ficha</h2><p>{error}</p><button className="btn btn-secondary" onClick={() => void cargar()}>Reintentar</button></div>;
  if (!cliente) return <div>Cliente no encontrado.</div>;

  const nombresMovimiento: Record<string, string> = { SALDO_APERTURA: "Saldo de apertura", CARGO: "Cargo", PAGO: "Pago", ANTICIPO: "Anticipo", NOTA_CREDITO: "Nota de crédito", AJUSTE: "Ajuste" };
  const normalizarBusqueda = (value: string) => value.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const movimientosFiltrados = movimientos.filter(m => normalizarBusqueda([m.tipo, nombresMovimiento[m.tipo], m.fecha_efectiva, m.documento_interno, m.referencia, m.motivo, m.monto].filter(Boolean).join(" ")).includes(normalizarBusqueda(busquedaMovimiento.trim())));
  const partidasAbiertasList = partidasEstado.filter((p) => p.estado === "ABIERTA");
  const partidasPagadasList = partidasEstado.filter((p) => p.estado === "PAGADA");
  const partidasMostradas = tabPartidas === "ABIERTA" ? partidasAbiertasList : partidasPagadasList;

  // Solo el trámite sin iniciar de la partida de mayor monto es accionable:
  // si aparece en todas las filas deja de significar algo.
  const montoMaximoAbierta = partidasAbiertasList.reduce(
    (max, p) => Decimal.max(max, p.total),
    new Decimal(0)
  );
  const totalImputado = partidasEstado.reduce((acc, p) => acc.plus(p.imputado), new Decimal(0));
  const tramiteCompletoCount = partidasAbiertasList.filter(
    (p) => p.hitos_obligatorios > 0 && p.hitos_cumplidos === p.hitos_obligatorios
  ).length;
  const hayPagosPorVerificar = Boolean(saldo && new Decimal(saldo.monto_en_revision).gt(0));

  // Agrupa por partida_raiz_id preservando el orden relativo de cada grupo
  // (la lista ya viene ordenada por antigüedad) y ordena cada grupo por
  // entrega_numero — la raíz (1) primero, hijas después.
  function agruparPorRaiz(
    lista: VPartidaEstado[]
  ): (VPartidaEstado & { entregaNumero: number; esHija: boolean; totalEntregas: number })[] {
    const grupos = new Map<number, VPartidaEstado[]>();
    const ordenGrupos: number[] = [];

    for (const p of lista) {
      const raizId = cadenaPorPartida[p.partida_id]?.partida_raiz_id ?? p.partida_id;
      if (!grupos.has(raizId)) {
        grupos.set(raizId, []);
        ordenGrupos.push(raizId);
      }
      grupos.get(raizId)!.push(p);
    }

    const resultado: (VPartidaEstado & { entregaNumero: number; esHija: boolean; totalEntregas: number })[] = [];
    for (const raizId of ordenGrupos) {
      const items = grupos.get(raizId)!;
      items.sort(
        (a, b) =>
          (cadenaPorPartida[a.partida_id]?.entrega_numero ?? 1) -
          (cadenaPorPartida[b.partida_id]?.entrega_numero ?? 1)
      );
      for (const p of items) {
        const entregaNumero = cadenaPorPartida[p.partida_id]?.entrega_numero ?? 1;
        resultado.push({
          ...p,
          entregaNumero,
          esHija: entregaNumero > 1,
          totalEntregas: entregasPorRaiz[raizId] ?? 1,
        });
      }
    }
    return resultado;
  }

  function trabaDe(p: VPartidaEstado): string | null {
    if (p.hitos_cumplidos === 0 && montoMaximoAbierta.gt(0) && new Decimal(p.total).eq(montoMaximoAbierta)) {
      return "trámite sin iniciar";
    }
    if (p.dias_abierta > p.plazo_dias) {
      return `abierta hace ${p.dias_abierta} días`;
    }
    return null;
  }

  function cerrarModalNC() {
    setModalNCAbierto(false);
    setMontoNC("");
    setMotivoNC("");
    setErrorNC(null);
  }

  async function confirmarNC(e: React.FormEvent) {
    e.preventDefault();
    setGuardandoNC(true);
    setErrorNC(null);

    const { error } = await supabase.rpc("registrar_nota_credito", {
      p_cliente_id: clienteId,
      p_monto: montoNC,
      p_motivo: motivoNC,
    });

    if (error) {
      setErrorNC(error.message);
      setGuardandoNC(false);
      return;
    }

    setGuardandoNC(false);
    cerrarModalNC();
    await cargar();
  }

  async function subirComprobante(pagoId: number, file: File) {
    const errorValidacion = validarArchivo(file);
    if (errorValidacion) {
      setErrorComprobante((prev) => ({ ...prev, [pagoId]: errorValidacion }));
      return;
    }

    setSubiendoComprobante((prev) => ({ ...prev, [pagoId]: true }));
    setErrorComprobante((prev) => ({ ...prev, [pagoId]: null }));

    const subida = await subirEvidencia(supabase, `anticipos/${pagoId}`, file, usuario);
    if (subida.error || !subida.data) {
      setErrorComprobante((prev) => ({ ...prev, [pagoId]: subida.error ?? "No se pudo subir el archivo." }));
      setSubiendoComprobante((prev) => ({ ...prev, [pagoId]: false }));
      return;
    }

    // El endpoint usa la sesión y una RPC limitada para vincular el comprobante.
    // desde el navegador.
    let respuesta: Response;
    try {
      respuesta = await fetch(`/api/pagos/${pagoId}/comprobante`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidencia_id: subida.data.evidenciaId }),
      });
    } catch {
      setErrorComprobante((prev) => ({
        ...prev,
        [pagoId]: "El archivo se subió pero no se pudo asociar al pago (sin conexión con el servidor).",
      }));
      setSubiendoComprobante((prev) => ({ ...prev, [pagoId]: false }));
      return;
    }

    if (!respuesta.ok) {
      const body = await respuesta.json().catch(() => ({}));
      setErrorComprobante((prev) => ({
        ...prev,
        [pagoId]: body.error ?? "El archivo se subió pero no se pudo asociar al pago.",
      }));
      setSubiendoComprobante((prev) => ({ ...prev, [pagoId]: false }));
      return;
    }

    setSubiendoComprobante((prev) => ({ ...prev, [pagoId]: false }));
    await cargar();
  }

  async function abrirComprobante(path: string) {
    // La pestaña se abre ANTES del await para no perder el gesto del usuario
    // (mismo patrón que verDocumento en el expediente).
    const ventana = window.open("", "_blank");
    const url = await abrirArchivo(supabase, path);
    if (!url) {
      ventana?.close();
      return;
    }
    if (ventana) {
      ventana.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="client-detail">
      <Link href={fixture ? "/vista-previa" : "/clientes"} className="breadcrumb"><Icon name="back" size={16} />Clientes</Link>
      <header className="page-header">
        <div className="client-heading"><span className="client-avatar">{cliente.nombre.slice(0, 2).toUpperCase()}</span><div>
          <h1 className="page-title">{cliente.nombre}</h1>
          <p className="page-sub">{cliente.categoria.charAt(0) + cliente.categoria.slice(1).toLowerCase()} · NIT {cliente.nit ?? "sin registrar"} · {credito?.sector === "PUBLICO" ? "Sector público" : credito ? "Sector privado" : "Sin ficha de crédito"}</p>
        </div></div>
        {!fixture && <div className="header-actions"><Link href={`/clientes/${cliente.id}/editar`} className="btn btn-secondary">Editar ficha</Link>
          {esAdmin && <button type="button" className="btn btn-secondary" onClick={() => setModalNCAbierto(true)}>Nota de crédito</button>}
          {esAdmin && !tieneApertura && <Link href={`/apertura/${cliente.id}`} className="btn btn-orange">Cargar apertura</Link>}
        </div>}
      </header>
      {erroresSecciones.length > 0 && <div className="banner-alerta" role="alert"><div><strong>Hay información que no pudimos consultar</strong><p>{erroresSecciones.join(" ")}</p><button className="btn-link" onClick={() => void cargar()}>Reintentar</button></div></div>}
      {!tieneApertura && !erroresSecciones.some(e => e.startsWith("Apertura:")) && <div className="banner-warn"><Icon name="alert" /><span>Este cliente no tiene saldo de apertura. La cuenta puede no reflejar toda su deuda.</span></div>}
      {hayPagosPorVerificar && <div className="pago-aviso"><Icon name="clock" /><div><strong>Pagos registrados · por verificar</strong><p>Los pagos ya están registrados. Su verificación actualizará el saldo contable de la cuenta.</p></div></div>}
      <section className="balance-strip client-summary" aria-label="Saldos del cliente">
        <div className="balance-primary"><span>Saldo contable</span><strong className="summary-value">{saldo ? formatBs(saldo.saldo_confirmado) : "No disponible"}</strong><small>{hayPagosPorVerificar ? "Pendiente de actualizar al verificar los pagos" : saldo?.situacion === "ACREEDOR" ? "Saldo a favor del cliente" : saldo?.situacion === "DEUDOR" ? "Deuda registrada en la cuenta" : saldo ? "Cuenta al día" : "No se pudo obtener el saldo"}</small></div>
        <div><span>Saldo tras verificar pagos</span><strong className="money-provisional">{saldo ? formatBs(saldo.saldo_provisional) : "—"}</strong><small>Provisional · sujeto a verificación</small></div>
        <div><span>Pagos por verificar</span><strong className="money-provisional">{saldo ? formatBs(saldo.monto_en_revision) : "—"}</strong><small>{erroresSecciones.some(e => e.startsWith("Partidas:")) ? "Partidas no disponibles" : `${partidasAbiertasList.length} ${partidasAbiertasList.length === 1 ? "partida abierta" : "partidas abiertas"}`}</small></div>
      </section>
      <div className="credit-facts"><span>Límite de crédito<strong>{credito?.limite_credito ? formatBs(credito.limite_credito) : "Sin registrar"}</strong></span><span>Plazo<strong>{credito ? `${credito.plazo_dias} días` : "—"}</strong></span><span>Inicio del plazo<strong>{credito?.inicio_computo === "FACTURA" ? "Factura" : credito?.inicio_computo === "ENTREGA" ? "Entrega" : credito ? "Contado" : "—"}</strong></span></div>
      <Tabs id="cliente" label="Detalle del cliente" value={panel} onChange={next => { setPanel(next); if (next === "ANTICIPOS") setTabPartidas("ANTICIPO"); if (next === "PARTIDAS") setTabPartidas("ABIERTA"); }} items={[
        { value: "CUENTA", label: "Cuenta corriente" }, { value: "PARTIDAS", label: "Partidas", count: erroresSecciones.some(e => e.startsWith("Partidas:")) ? undefined : partidasEstado.length },
        { value: "ANTICIPOS", label: "Anticipos", count: erroresSecciones.some(e => e.startsWith("Anticipos:")) ? undefined : anticipos.length }, { value: "PENDIENTES", label: "Pendientes", count: erroresSecciones.some(e => e.startsWith("Pendientes:")) ? undefined : partidasFrenadas.length },
      ]} />
      <section id="cliente-panel" role="tabpanel" aria-labelledby={`cliente-tab-${panel}`} tabIndex={0}>
      <div hidden={panel !== "PARTIDAS" && panel !== "ANTICIPOS"}>
      <div className="client-panel-heading"><div><h2>{panel === "ANTICIPOS" ? "Anticipos y comprobantes" : "Partidas del cliente"}</h2><p>{panel === "ANTICIPOS" ? "Anticipos confirmados que todavía tienen saldo disponible." : "Consulta el estado de cada pedido y abre su expediente."}</p></div></div>
      {panel === "ANTICIPOS" && saldo?.situacion === "ACREEDOR" && <div className="card" style={{ marginBottom: 12 }}><strong className="money-favor">El cliente tiene saldo a favor confirmado.</strong><p>El saldo de apertura y las notas de crédito figuran en Cuenta corriente. En Seller puedes aplicar el saldo disponible a una compra o a un pedido; aquí se actualizarán la cuenta y el pendiente del pedido.</p></div>}
      {partidasEstado.length === 0 && anticipos.length === 0 && <div className="empty-state"><h3>Sin registros todavía</h3><p>Las partidas y anticipos aparecerán aquí cuando se registren.</p></div>}
      {(partidasEstado.length > 0 || anticipos.length > 0) && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: 700 }}>
              {panel === "ANTICIPOS" ? "Saldos a favor del cliente" : `Partidas · ${formatBs(totalImputado.toString())} imputado · ${tramiteCompletoCount}/${partidasAbiertasList.length} con trámite completo`}
            </div>
            <div hidden={panel === "ANTICIPOS"} style={panel === "ANTICIPOS" ? { display: "none" } : { display: "flex", gap: 6 }}>
              <button
                type="button"
                className={tabPartidas === "ABIERTA" ? "btn btn-secondary" : "btn-link"}
                onClick={() => setTabPartidas("ABIERTA")}
              >
                Abiertas ({partidasAbiertasList.length})
              </button>
              <button
                type="button"
                className={tabPartidas === "PAGADA" ? "btn btn-secondary" : "btn-link"}
                onClick={() => setTabPartidas("PAGADA")}
              >
                Pagadas ({partidasPagadasList.length})
              </button>

            </div>
          </div>

          {tabPartidas === "ANTICIPO" ? (
            <>
              {anticipos.length === 0 && (
                <div className="card" style={{ color: "var(--muted)" }}>Sin anticipos.</div>
              )}
              {anticipos.map((a) => {
                const saldoFavor = new Decimal(a.saldo_favor);
                const monto = new Decimal(a.monto);
                const imputado = new Decimal(a.imputado);
                const subiendo = subiendoComprobante[a.pago_id];
                const errorArchivo = errorComprobante[a.pago_id];

                return (
                  <div key={a.pago_id} className="card" style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="money-favor" style={{ fontSize: 17 }}>
                          {formatBs(saldoFavor.toString())} a favor
                        </span>
                        {a.no_imputar && <span className="badge badge-no-imputar">No imputar</span>}
                      </div>
                      {a.tiene_comprobante && a.comprobante_path ? (
                        <button
                          type="button"
                          className="adjunto-clip"
                          onClick={() => abrirComprobante(a.comprobante_path!)}
                        >
                          {a.comprobante_nombre ?? "Comprobante"}
                        </button>
                      ) : puedeSubir ? (
                        <div>
                          <span className="aviso-ambar-chip" style={{ marginRight: 8 }}>Sin comprobante</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            className="subida-input"
                            disabled={subiendo}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) subirComprobante(a.pago_id, file);
                            }}
                          />
                          {subiendo && <span style={{ fontSize: 11.5, color: "var(--muted)", marginLeft: 6 }}>Subiendo…</span>}
                        </div>
                      ) : (
                        <span className="aviso-ambar-chip">Sin comprobante</span>
                      )}
                    </div>
                    {errorArchivo && <div className="subida-error">{errorArchivo}</div>}
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                      Original {formatBs(monto.toString())}
                      {imputado.gt(0) && <> · {formatBs(imputado.toString())} ya aplicado</>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {a.medio} · recibido {a.fecha_recepcion}
                      {a.referencia && <> · {a.referencia}</>}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              {partidasMostradas.length === 0 && (
                <div className="card" style={{ color: "var(--muted)" }}>
                  {tabPartidas === "ABIERTA" ? "Sin partidas abiertas." : "Sin partidas pagadas todavía."}
                </div>
              )}

              {agruparPorRaiz(partidasMostradas).map((p) => {
            const pendiente = new Decimal(p.pendiente);
            const pagada = p.estado === "PAGADA" || pendiente.lte(0);
            const enRevision = new Decimal(p.en_revision);
            const estadoPago = resumirPago(p);
            const traba = tabPartidas === "ABIERTA" ? trabaDe(p) : null;
            const despacho = tabPartidas === "ABIERTA" ? despachoPorPartida[p.partida_id] : undefined;
            // documento_interno ya trae el sufijo "· Entrega N" armado desde
            // la base para las hijas; la raíz sigue mostrando su referencia
            // como siempre, para que el caso sin hijas quede idéntico.
            const titulo = p.esHija ? p.documento_interno : (p.referencia ?? p.documento_interno);

            return (
              <Link
                key={p.partida_id}
                href={`/clientes/${clienteId}/expediente/${p.partida_id}`}
                className="card"
                style={{
                  display: "block",
                  marginBottom: 8,
                  marginLeft: p.esHija ? 24 : 0,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{titulo}</span>
                    {p.estado === "PAGADA" && <span className="badge badge-pagada">Pagada</span>}
                    {!p.esHija && p.totalEntregas > 1 && (
                      <span className="badge">{p.totalEntregas} entregas</span>
                    )}
                  </div>
                  <span className="money" style={{ fontSize: 15, fontWeight: 800 }}>
                    {formatBs(p.total)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6, fontSize: 12 }}>
                  <span className={pagada ? "money-acreedor" : ""}>
                    {pagada ? "Pagada" : estadoPago?.porVerificar.gt(0) ? estadoPago.mensaje : `Falta registrar ${formatBs(pendiente.toString())}`}
                  </span>
                  <span style={{ color: "var(--muted)" }}>
                    Trámite {p.hitos_cumplidos}/{p.hitos_obligatorios}
                    {p.proximo_hito ? estadoPago?.porVerificar.gt(0) && p.proximo_hito === "Pago" ? " · verificación del pago pendiente" : ` · falta ${p.proximo_hito}` : ""}
                  </span>
                  {traba && (
                    <span style={{ color: "var(--alerta)" }}>{traba}</span>
                  )}
                </div>
                {enRevision.gt(0) && (
                  <div style={{ fontSize: 11.5, color: "var(--provisional)", marginTop: 4 }}>
                    Pago registrado: {estadoPago ? formatBs(estadoPago.registrado.toString()) : "No disponible"} · Por verificar: {formatBs(enRevision.toString())}
                    {estadoPago && estadoPago.sinRegistro.gt(0) && <> · Sin pago registrado: {formatBs(estadoPago.sinRegistro.toString())}</>}
                  </div>
                )}
                {despacho && (
                  <div className="nota-sincronizando">
                    Despachado el {formatDiaMes(despacho.despachado_en)} — sincronizando con el sistema
                  </div>
                )}
              </Link>
            );
          })}
            </>
          )}
        </div>
      )}

      </div>
      <div hidden={panel !== "PENDIENTES"}>
      <div className="client-panel-heading"><div><h2>Pendientes del expediente</h2><p>Documentos, facturas y vencimientos que requieren atención.</p></div></div>
      {partidasFrenadas.length === 0 && <div className="empty-state"><h3>Sin pendientes del expediente</h3><p>No hay bloqueos registrados para este cliente.</p></div>}
      {partidasFrenadas.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: 700, marginBottom: 8 }}>
            Documentación y seguimiento
          </div>
          <div className="table">
            <div className="table-head" style={{ gridTemplateColumns: "1.3fr 1fr 90px 2fr auto" }}>
              <div>Partida</div>
              <div>Frente</div>
              <div>Días</div>
              <div>Estado</div>
              <div></div>
            </div>
            {partidasFrenadas.map((p) => {
              const info = MOTIVO_INFO[p.motivo];
              const accionInfo = ACCION_INFO[p.accion];
              const hitoId = hitoPorPartida[p.partida_id];
              const href = `/clientes/${clienteId}/expediente/${p.partida_id}${hitoId ? `#hito-${hitoId}` : ""}`;
              return (
                <div key={p.partida_id} className="table-row" style={{ gridTemplateColumns: "1.3fr 1fr 90px 2fr auto" }}>
                  <div>
                    <span style={{ fontSize: 12.5 }}>{p.documento_interno}</span>
                    <div className="money" style={{ fontSize: 12 }}>{formatBs(p.saldo_partida)}</div>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{p.frente ?? "—"}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {p.dias} {p.dias === 1 ? "día" : "días"} {p.dias_concepto}
                  </span>
                  <div>
                    {info && (
                      <span className={`badge ${info.className}`} style={{ marginRight: 8 }}>
                        {info.label}
                      </span>
                    )}
                    <span style={{ fontSize: 12 }}>
                      {accionInfo.texto}
                      {p.accion === "FALTA_DOCUMENTO" && <> {p.habilitantes_detalle ?? "—"}</>}
                    </span>
                  </div>
                  <Link href={href} className="btn btn-secondary">
                    {accionInfo.boton}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      </div>
      <div hidden={panel !== "CUENTA"}>
      <div className="client-panel-heading"><div><h2>Movimientos de cuenta</h2><p>Cargos, pagos y ajustes, en orden cronológico.</p></div><span className="quiet-count">{movimientos.length} movimientos cargados</span></div>
      {errorMovimientos && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="field-error" style={{ marginBottom: 10 }}>
            No se pudieron cargar los movimientos ({errorMovimientos}).
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void cargar()}>
            Reintentar
          </button>
        </div>
      )}

      {hayMasMovimientos && !errorMovimientos && (
        <div style={{ marginBottom: 10 }}>
          <button type="button" className="btn btn-secondary" disabled={cargandoMasMovimientos} onClick={cargarMasMovimientos}>
            {cargandoMasMovimientos ? "Cargando…" : "Cargar movimientos anteriores"}
          </button>
        </div>
      )}

      <label className="search-field movement-search"><Icon name="search" size={18} /><input aria-label="Buscar movimientos" placeholder="Buscar por movimiento, fecha o referencia…" value={busquedaMovimiento} onChange={e => setBusquedaMovimiento(e.target.value)} /></label>
      <div className="movement-table-wrapper">
        <table className="movement-table"><caption className="sr-only">Cuenta corriente de {cliente.nombre}</caption>
          <thead><tr><th scope="col">Fecha</th><th scope="col">Movimiento</th><th scope="col">Monto</th><th scope="col">Saldo corrido</th></tr></thead>
          <tbody>{movimientosFiltrados.map(m => <tr key={m.id}>
            <td data-label="Fecha">{m.fecha_efectiva}</td>
            <td data-label="Movimiento"><strong>{nombresMovimiento[m.tipo] ?? m.tipo}</strong>{m.documento_interno && <span className="movement-ref">{m.documento_interno}</span>}{(m.motivo || m.referencia) && <small>{m.motivo ?? m.referencia}</small>}</td>
            <td data-label="Monto" className={new Decimal(m.monto).lt(0) ? "money-acreedor" : "money"}>{formatBs(m.monto)}</td>
            <td data-label="Saldo corrido" className={new Decimal(m.saldo_corrido).lt(0) ? "money-acreedor" : "money"}>{formatBs(m.saldo_corrido)}</td>
          </tr>)}</tbody>
        </table>
        {movimientosFiltrados.length === 0 && <div className="empty-state"><h3>{errorMovimientos ? "Movimientos no disponibles" : movimientos.length ? "Sin coincidencias" : "Sin movimientos todavía"}</h3><p>{errorMovimientos ? "Reintenta la consulta para ver esta cuenta." : movimientos.length ? "Prueba con otra fecha o referencia. La búsqueda usa los movimientos cargados." : "Aquí aparecerán los cargos, pagos y ajustes de la cuenta."}</p></div>}
      </div>

      </div>
      </section>
      {modalNCAbierto && (
        <dialog ref={modalRef} className="modal-overlay" aria-labelledby="nota-credito-title" onCancel={(event) => { if (guardandoNC) event.preventDefault(); else cerrarModalNC(); }}>
          <form className="card modal-card" onClick={(e) => e.stopPropagation()} onSubmit={confirmarNC}>
            <h2 id="nota-credito-title" style={{ fontSize: 20, marginBottom: 20 }}>Registrar nota de crédito</h2>

            <div className="field">
              <label htmlFor="montoNC">Monto (Bs)</label>
              <input
                id="montoNC"
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={montoNC}
                onChange={(e) => setMontoNC(e.target.value)}
                autoFocus
                required
              />
              <div className="field-hint">A favor del cliente. No hace falta poner el signo, la base lo resuelve.</div>
            </div>

            <div className="field">
              <label htmlFor="motivoNC">Motivo</label>
              <textarea
                id="motivoNC"
                className="textarea"
                rows={3}
                value={motivoNC}
                onChange={(e) => setMotivoNC(e.target.value)}
                required
              />
            </div>

            {errorNC && <div className="field-error" style={{ marginBottom: 14 }}>{errorNC}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={cerrarModalNC} disabled={guardandoNC}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-orange" disabled={guardandoNC}>
                {guardandoNC ? "Guardando…" : "Confirmar"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}

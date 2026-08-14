"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Decimal from "decimal.js";
import { createClient } from "@/lib/supabase/client";
import { formatBs } from "@/lib/money";
import { rolDeUsuario } from "@/lib/roles";
import type {
  Cliente,
  ClienteCredito,
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

export default function FichaClientePage() {
  const params = useParams();
  const clienteId = Number(params.id);
  const supabase = useMemo(() => createClient(), []);

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
  const [tabPartidas, setTabPartidas] = useState<"ABIERTA" | "PAGADA">("ABIERTA");
  const [partidasFrenadas, setPartidasFrenadas] = useState<VPartidasFrenadas[]>([]);
  const [hitoPorPartida, setHitoPorPartida] = useState<Record<number, number>>({});
  const [esAdmin, setEsAdmin] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalNCAbierto, setModalNCAbierto] = useState(false);
  const [montoNC, setMontoNC] = useState("");
  const [motivoNC, setMotivoNC] = useState("");
  const [guardandoNC, setGuardandoNC] = useState(false);
  const [errorNC, setErrorNC] = useState<string | null>(null);

  async function cargar() {
      setCargando(true);
      setError(null);
      setErrorMovimientos(null);

      const [
        { data: userData },
        clienteRes,
        creditoRes,
        saldoRes,
        aperturaRes,
        movRes,
        partidasEstadoRes,
        frenadasRes,
      ] = await Promise.all([
        supabase.auth.getUser(),
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
      ]);

      if (clienteRes.error) {
        setError(clienteRes.error.message);
        setCargando(false);
        return;
      }

      setEsAdmin(rolDeUsuario(userData.user) === "admin");
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

      const frenadas = (frenadasRes.data ?? []) as VPartidasFrenadas[];
      setPartidasFrenadas(frenadas);

      const listoPartidaIds = frenadas
        .filter((f) => f.accion === "LISTO_PARA_COMPLETAR")
        .map((f) => f.partida_id);
      if (listoPartidaIds.length > 0) {
        const { data: frenteData } = await supabase
          .from("v_frente_partida")
          .select("partida_id, hito_id")
          .in("partida_id", listoPartidaIds);
        setHitoPorPartida(
          Object.fromEntries(
            (frenteData ?? [])
              .filter((f) => f.hito_id != null)
              .map((f) => [f.partida_id as number, f.hito_id as number])
          )
        );
      } else {
        setHitoPorPartida({});
      }

      setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, clienteId]);

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

  if (cargando) return <div>Cargando…</div>;
  if (error) return <div className="field-error">{error}</div>;
  if (!cliente) return <div>Cliente no encontrado.</div>;

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

  return (
    <div>
      <Link href="/clientes" className="btn-link">
        ← Clientes
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="page-title" style={{ marginBottom: 0 }}>
              {cliente.nombre}
            </div>
            <span className="badge">{cliente.categoria}</span>
          </div>
          <div className="page-sub">
            NIT {cliente.nit ?? "sin registrar"} · Sector {credito?.sector ?? "—"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href={`/clientes/${cliente.id}/editar`} className="btn btn-secondary">
            Editar
          </Link>
          {esAdmin && !tieneApertura && (
            <Link href={`/apertura/${cliente.id}`} className="btn btn-orange">
              Cargar saldo de apertura
            </Link>
          )}
        </div>
      </div>

      {!tieneApertura && (
        <div className="banner-warn" style={{ margin: "16px 0" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            Este cliente todavía no tiene saldo de apertura cargado. Sus movimientos no reflejan la deuda real hasta que se cargue.
          </div>
        </div>
      )}

      {esAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={() => setModalNCAbierto(true)}>
            Registrar nota de crédito
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 14, margin: "16px 0 20px" }}>
        <div className="card" style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: 700 }}>
            Saldo confirmado (contable)
          </div>
          <div
            style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}
            className={saldo && Number(saldo.saldo_confirmado) < 0 ? "money-acreedor" : ""}
          >
            {saldo ? formatBs(saldo.saldo_confirmado) : "—"}
          </div>
          <div style={{ fontSize: 11, color: "#a9a7a0", marginTop: 3 }}>
            {saldo && Number(saldo.saldo_confirmado) < 0 ? "A favor del cliente" : "Deuda registrada contablemente"}
          </div>
        </div>
        <div className="card" style={{ flex: 1, borderStyle: "dashed", borderColor: "#d8b76a" }}>
          <div style={{ fontSize: 11, color: "var(--provisional)", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: 700 }}>
            Saldo provisional (con pagos sin revisar)
          </div>
          <div className="money-provisional" style={{ fontSize: 24, marginTop: 4 }}>
            {saldo ? formatBs(saldo.saldo_provisional) : "—"}
          </div>
          <div style={{ fontSize: 11, color: "#a9a7a0", marginTop: 3 }}>
            {saldo && new Decimal(saldo.saldo_confirmado).eq(new Decimal(saldo.saldo_provisional))
              ? "Igual al confirmado"
              : "Incluye pagos sin revisar"}
          </div>
        </div>
      </div>

      {partidasEstado.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: 700 }}>
              Partidas · {formatBs(totalImputado.toString())} imputado · {tramiteCompletoCount}/{partidasAbiertasList.length} con trámite completo
            </div>
            <div style={{ display: "flex", gap: 6 }}>
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

          {partidasMostradas.length === 0 && (
            <div className="card" style={{ color: "var(--muted)" }}>
              {tabPartidas === "ABIERTA" ? "Sin partidas abiertas." : "Sin partidas pagadas todavía."}
            </div>
          )}

          {partidasMostradas.map((p) => {
            const pendiente = new Decimal(p.pendiente);
            const pagada = p.estado === "PAGADA" || pendiente.lte(0);
            const enRevision = new Decimal(p.en_revision);
            const traba = tabPartidas === "ABIERTA" ? trabaDe(p) : null;

            return (
              <Link
                key={p.partida_id}
                href={`/clientes/${clienteId}/expediente/${p.partida_id}`}
                className="card"
                style={{ display: "block", marginBottom: 8, textDecoration: "none", color: "inherit" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{p.referencia ?? p.documento_interno}</span>
                    {p.estado === "PAGADA" && <span className="badge badge-pagada">Pagada</span>}
                  </div>
                  <span className="money" style={{ fontSize: 15, fontWeight: 800 }}>
                    {formatBs(p.total)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6, fontSize: 12 }}>
                  <span className={pagada ? "money-acreedor" : ""}>
                    💰 {pagada ? "Pagada" : `falta ${formatBs(pendiente.toString())}`}
                  </span>
                  <span style={{ color: "var(--muted)" }}>
                    📄 {p.hitos_cumplidos}/{p.hitos_obligatorios}
                    {p.proximo_hito ? ` · falta ${p.proximo_hito}` : ""}
                  </span>
                  {traba && (
                    <span style={{ color: "var(--alerta)" }}>⚠️ {traba}</span>
                  )}
                </div>
                {enRevision.gt(0) && (
                  <div style={{ fontSize: 11.5, color: "var(--provisional)", marginTop: 4 }}>
                    + {formatBs(enRevision.toString())} en revisión
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {partidasFrenadas.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: 700, marginBottom: 8 }}>
            Frenando el cobro
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

      {errorMovimientos && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="field-error" style={{ marginBottom: 10 }}>
            No se pudieron cargar los movimientos ({errorMovimientos}).
          </div>
          <button type="button" className="btn btn-secondary" onClick={cargar}>
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

      <div className="table">
        <div className="table-head" style={{ gridTemplateColumns: "90px 2fr 1fr 1fr" }}>
          <div>Fecha</div>
          <div>Movimiento</div>
          <div>Monto</div>
          <div>Saldo corrido</div>
        </div>
        {movimientos.map((m) => (
          <div key={m.id} className="table-row" style={{ gridTemplateColumns: "90px 2fr 1fr 1fr" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{m.fecha_efectiva}</span>
            <div>
              <span style={{ fontSize: 12.5 }}>{m.tipo}</span>
              {m.documento_interno && (
                <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>{m.documento_interno}</span>
              )}
              {m.motivo && <div style={{ fontSize: 11, color: "var(--muted)" }}>{m.motivo}</div>}
            </div>
            <span className={Number(m.monto) < 0 ? "money-acreedor" : ""}>{formatBs(m.monto)}</span>
            <span className={Number(m.saldo_corrido) < 0 ? "money-acreedor" : "money"}>
              {formatBs(m.saldo_corrido)}
            </span>
          </div>
        ))}
        {movimientos.length === 0 && (
          <div className="table-row" style={{ gridTemplateColumns: "1fr" }}>
            <span style={{ color: "var(--muted)" }}>Sin movimientos todavía.</span>
          </div>
        )}
      </div>

      {modalNCAbierto && (
        <div className="modal-overlay" onClick={guardandoNC ? undefined : cerrarModalNC}>
          <form className="card modal-card" onClick={(e) => e.stopPropagation()} onSubmit={confirmarNC}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Registrar nota de crédito</div>

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
        </div>
      )}
    </div>
  );
}

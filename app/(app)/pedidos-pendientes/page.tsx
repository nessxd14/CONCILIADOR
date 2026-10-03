"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useHermesRefresh } from "@/lib/supabase/use-refresh";
import { formatBs } from "@/lib/money";
import type { MotivoPedidoPendiente, VPedidoCationPendiente } from "@/lib/types";

type ResultadoSync = { abiertas: number; omitidas: number; con_error: number };

const MOTIVOS_ORDEN: { motivo: MotivoPedidoPendiente; label: string }[] = [
  { motivo: "SIN_CLIENTE", label: "Sin cliente asignado en el POS" },
  { motivo: "CLIENTE_SIN_CUENTA", label: "Cliente no importado en Hermes" },
  { motivo: "ABRE", label: "Pedido anterior pendiente de vincular" },
  { motivo: "SIN_TOTAL", label: "Sin total" },
  { motivo: "SIN_FICHA_CREDITO", label: "Sin ficha de crédito" },
  { motivo: "CATEGORIA_NO_ELEGIBLE", label: "Categoría no elegible" },
  { motivo: "ESTADO_NO_ELEGIBLE", label: "Estado no elegible" },
  { motivo: "YA_TIENE_PARTIDA", label: "Ya procesado" },
];

const MOTIVOS_ACCIONABLES: MotivoPedidoPendiente[] = ["ABRE", "CLIENTE_SIN_CUENTA", "SIN_FICHA_CREDITO"];

const DETALLE_LIMITE = 200;

export default function PedidosPendientesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [detalle, setDetalle] = useState<VPedidoCationPendiente[]>([]);
  const [totalAccionables, setTotalAccionables] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSync, setResultadoSync] = useState<ResultadoSync | null>(null);
  const [errorSync, setErrorSync] = useState<string | null>(null);

  useHermesRefresh(() => cargar(true), !sincronizando && !cargando);
  async function cargar(enSegundoPlano = false) {
    if (!enSegundoPlano) setCargando(true);
    setError(null);

    // PostgREST corta cualquier select en 1000 filas: contar en el navegador
    // sobre un .select("motivo") sin filtro se congela ahí. Un count:'exact'
    // por motivo, con head:true (no baja filas), da el número real de cada
    // uno sin ese techo. Ocho consultas livianas en vez de una vista de
    // conteos agregada del lado del servidor — queda pendiente pedirle esa
    // vista a Ness si el número de motivos crece.
    const conteoPorMotivo = await Promise.all(
      MOTIVOS_ORDEN.map(({ motivo }) =>
        supabase
          .from("v_pedidos_cation_pendientes")
          .select("motivo", { count: "exact", head: true })
          .eq("motivo", motivo)
      )
    );

    const errConteo = conteoPorMotivo.find((r) => r.error)?.error;
    if (errConteo) {
      setError(errConteo.message);
      setCargando(false);
      return;
    }

    const conteosPorMotivo: Record<string, number> = {};
    MOTIVOS_ORDEN.forEach(({ motivo }, i) => {
      conteosPorMotivo[motivo] = conteoPorMotivo[i].count ?? 0;
    });
    setConteos(conteosPorMotivo);

    const detalleRes = await supabase
      .from("v_pedidos_cation_pendientes")
      .select("*", { count: "exact" })
      .in("motivo", MOTIVOS_ACCIONABLES)
      .order("creado_en", { ascending: true })
      .range(0, DETALLE_LIMITE - 1);

    if (detalleRes.error) {
      setError(detalleRes.error.message);
      setCargando(false);
      return;
    }

    setDetalle(detalleRes.data as VPedidoCationPendiente[]);
    setTotalAccionables(detalleRes.count ?? detalleRes.data?.length ?? 0);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function sincronizar() {
    setSincronizando(true);
    setErrorSync(null);
    setResultadoSync(null);

    const { data, error: errSync } = await supabase.rpc("sincronizar_pedidos_cation");

    if (errSync) {
      setErrorSync(errSync.message);
      setSincronizando(false);
      return;
    }

    setResultadoSync((data as ResultadoSync[])[0] ?? null);
    setSincronizando(false);
    await cargar();
  }

  return (
    <div>
      <Link href="/clientes" className="btn-link">
        ← Clientes
      </Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 8 }}>
        <div>
          <div className="page-title">Pedidos pendientes</div>
          <div className="page-sub">Estado de vinculación de los pedidos mayoristas, institucionales y corporativos.</div>
        </div>
        <button type="button" className="btn btn-secondary" disabled={sincronizando} onClick={sincronizar}>
          {sincronizando ? "Vinculando…" : "Recuperar pedidos anteriores"}
        </button>
      </div>

      <div className="field-hint" style={{ margin: "8px 0 16px" }}>
        Los pedidos nuevos llegan automáticamente con su cliente vinculado primero. La pantalla se actualiza cada 15 segundos; el botón recupera pedidos anteriores pendientes.
      </div>

      {errorSync && <div className="field-error" style={{ marginBottom: 16 }}>{errorSync}</div>}

      {resultadoSync && (
        <div className="banner-warn" style={{ marginBottom: 16, alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {`${resultadoSync.abiertas} abiertas · ${resultadoSync.omitidas} omitidas`}
          </div>
          {resultadoSync.con_error > 0 && (
            <div style={{ fontSize: 12.5, marginTop: 4 }}>
              {`${resultadoSync.con_error} pedidos tuvieron un error al procesarse. Los detalles quedaron en los logs del servidor, no acá.`}
            </div>
          )}
        </div>
      )}

      {error && <div className="field-error">{error}</div>}
      {cargando && <div>Cargando…</div>}

      {!cargando && (
        <>
          <div className="table" style={{ marginBottom: 24 }}>
            <div className="table-head" style={{ gridTemplateColumns: "2fr auto" }}>
              <div>Motivo</div>
              <div>Cantidad</div>
            </div>
            {MOTIVOS_ORDEN.map(({ motivo, label }) => (
              <div key={motivo} className="table-row" style={{ gridTemplateColumns: "2fr auto" }}>
                <div>
                  <span style={{ fontSize: 12.5 }}>{label}</span>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{motivo}</div>
                </div>
                <span className="badge" style={{ fontSize: 13 }}>{conteos[motivo] ?? 0}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: 700, marginBottom: 8 }}>
            Detalle — requieren acción
          </div>
          {totalAccionables > DETALLE_LIMITE && (
            <div className="field-hint" style={{ marginBottom: 8 }}>
              Mostrando los primeros {DETALLE_LIMITE} de {totalAccionables}.
            </div>
          )}
          <div className="table">
            <div className="table-head" style={{ gridTemplateColumns: "1fr 1.5fr 1fr 1fr 1fr" }}>
              <div>Pedido</div>
              <div>Cliente</div>
              <div>Motivo</div>
              <div>Total</div>
              <div>Creado</div>
            </div>
            {detalle.map((p) => (
              <div key={p.pedido_id} className="table-row" style={{ gridTemplateColumns: "1fr 1.5fr 1fr 1fr 1fr" }}>
                <span style={{ fontSize: 12.5 }}>#{p.pedido_id}</span>
                <span style={{ fontSize: 12.5 }}>
                  {p.cliente ?? `POS #${p.pos_cliente_id ?? "—"}`}
                </span>
                <span className="badge">{p.motivo}</span>
                <span style={{ fontSize: 12.5 }}>{p.total ? formatBs(p.total) : "—"}</span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  {new Date(p.creado_en).toLocaleDateString("es-BO")}
                </span>
              </div>
            ))}
            {detalle.length === 0 && (
              <div className="table-row" style={{ gridTemplateColumns: "1fr" }}>
                <span style={{ color: "var(--muted)" }}>No hay pedidos que requieran acción.</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

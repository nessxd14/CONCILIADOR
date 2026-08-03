"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import { createClient } from "@/lib/supabase/client";
import { formatBs } from "@/lib/money";
import { rolDeUsuario } from "@/lib/roles";
import type { PagoPropuesto, VCobrosBloqueados } from "@/lib/types";

function creadorSinPrefijo(creadoPor: string): string {
  return creadoPor.startsWith("pos:") ? creadoPor.slice(4) : creadoPor;
}

const MOTIVO_INFO: Record<string, { label: string; className: string }> = {
  VENCIDA: { label: "Vencido", className: "badge-vencida" },
  ENTREGADO_SIN_FACTURAR: { label: "Sin facturar", className: "badge-ambar" },
  FRENADA: { label: "Frenado", className: "badge-ambar" },
};

export default function MiDiaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [bloqueados, setBloqueados] = useState<VCobrosBloqueados[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [esGerente, setEsGerente] = useState(false);
  const [usuario, setUsuario] = useState("desconocido");
  const [pagos, setPagos] = useState<PagoPropuesto[]>([]);
  const [erroresPago, setErroresPago] = useState<Record<number, string>>({});
  const [confirmando, setConfirmando] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError(null);

      const [{ data: userData }, bloqueadosRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("v_cobros_bloqueados").select("*").order("dias_maximo", { ascending: false }),
      ]);

      if (bloqueadosRes.error) {
        setError(bloqueadosRes.error.message);
        setCargando(false);
        return;
      }

      setUsuario(userData.user?.email ?? "desconocido");
      const gerente = rolDeUsuario(userData.user) === "gerente";
      setEsGerente(gerente);
      setBloqueados(bloqueadosRes.data as VCobrosBloqueados[]);

      if (gerente) {
        const { data: pagosData, error: errPagos } = await supabase
          .from("pago")
          .select("id, cliente_id, monto, medio, referencia, creado_por, creado_en")
          .eq("estado", "PROPUESTO")
          .order("creado_en", { ascending: true });

        if (!errPagos && pagosData && pagosData.length > 0) {
          const clienteIds = [...new Set(pagosData.map((p) => p.cliente_id as number))];
          const { data: clientesData } = await supabase.from("cliente").select("id, nombre").in("id", clienteIds);
          const nombrePorId = new Map((clientesData ?? []).map((c) => [c.id as number, c.nombre as string]));

          setPagos(
            pagosData.map((p) => ({
              id: p.id,
              cliente_id: p.cliente_id,
              cliente: nombrePorId.get(p.cliente_id as number) ?? "—",
              monto: p.monto,
              medio: p.medio,
              referencia: p.referencia,
              creado_por: p.creado_por,
              creado_en: p.creado_en,
            })) as PagoPropuesto[]
          );
        }
      }

      setCargando(false);
    }
    cargar();
  }, [supabase]);

  async function confirmarPago(pago: PagoPropuesto) {
    setConfirmando((prev) => ({ ...prev, [pago.id]: true }));
    setErroresPago((prev) => {
      const next = { ...prev };
      delete next[pago.id];
      return next;
    });

    const { error } = await supabase.rpc("confirmar_pago", {
      p_pago_id: pago.id,
      p_usuario: usuario,
    });

    if (error) {
      setErroresPago((prev) => ({ ...prev, [pago.id]: error.message }));
      setConfirmando((prev) => ({ ...prev, [pago.id]: false }));
      return;
    }

    setPagos((prev) => prev.filter((p) => p.id !== pago.id));
    setConfirmando((prev) => ({ ...prev, [pago.id]: false }));
  }

  const totalBloqueado = bloqueados
    .reduce((acc, b) => acc.plus(new Decimal(b.monto_bloqueado)), new Decimal(0))
    .toFixed(2);

  return (
    <div>
      <div className="page-title">Mi día</div>
      <div className="page-sub">
        {cargando
          ? "Cargando…"
          : bloqueados.length === 0
          ? "Nada frenando el cobro por ahora."
          : `${bloqueados.length} ${bloqueados.length === 1 ? "cosa" : "cosas"} frenando ${formatBs(totalBloqueado)}`}
      </div>

      {error && <div className="field-error" style={{ marginTop: 16 }}>{error}</div>}
      {cargando && <div style={{ marginTop: 16 }}>Cargando…</div>}

      {!cargando && esGerente && pagos.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: 700, marginBottom: 8 }}>
            Pagos por confirmar ({pagos.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pagos.map((p) => (
              <div key={p.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <b style={{ fontSize: 13.5 }}>{p.cliente}</b>
                      <span className="badge">{p.medio}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>
                      Cobrado por {creadorSinPrefijo(p.creado_por)} · {new Date(p.creado_en).toLocaleString("es-BO")}
                      {p.referencia && ` · ref. ${p.referencia}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="money" style={{ fontSize: 16 }}>{formatBs(p.monto)}</span>
                    <button
                      type="button"
                      className="btn btn-orange"
                      disabled={confirmando[p.id]}
                      onClick={() => confirmarPago(p)}
                    >
                      {confirmando[p.id] ? "Confirmando…" : "Confirmar"}
                    </button>
                  </div>
                </div>
                {erroresPago[p.id] && <div className="field-error" style={{ marginTop: 8 }}>{erroresPago[p.id]}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!cargando && !error && bloqueados.length === 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          Nada frenando el cobro por ahora.
        </div>
      )}

      {!cargando && bloqueados.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {bloqueados.map((b) => (
            <Link
              key={b.cliente_id}
              href={`/clientes/${b.cliente_id}`}
              className="card"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none" }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <b style={{ fontSize: 14 }}>{b.cliente}</b>
                  <span className="badge">{b.categoria}</span>
                  {b.motivos.split(",").map((m) => {
                    const info = MOTIVO_INFO[m];
                    return info ? (
                      <span key={m} className={`badge ${info.className}`}>
                        {info.label}
                      </span>
                    ) : null;
                  })}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  {b.partidas_bloqueadas} {b.partidas_bloqueadas === 1 ? "partida" : "partidas"} · hace{" "}
                  {b.dias_maximo} {b.dias_maximo === 1 ? "día" : "días"}
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{formatBs(b.monto_bloqueado)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

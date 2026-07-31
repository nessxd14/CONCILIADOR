"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import { createClient } from "@/lib/supabase/client";
import { formatBs } from "@/lib/money";
import type { VCobrosBloqueados } from "@/lib/types";

export default function MiDiaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [bloqueados, setBloqueados] = useState<VCobrosBloqueados[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError(null);

      const { data, error } = await supabase
        .from("v_cobros_bloqueados")
        .select("*")
        .order("monto_bloqueado", { ascending: false });

      if (error) {
        setError(error.message);
        setCargando(false);
        return;
      }

      setBloqueados(data as VCobrosBloqueados[]);
      setCargando(false);
    }
    cargar();
  }, [supabase]);

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
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <b style={{ fontSize: 14 }}>{b.cliente}</b>
                  <span className="badge">{b.categoria}</span>
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

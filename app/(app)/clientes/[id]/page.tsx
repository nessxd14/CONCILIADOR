"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatBs } from "@/lib/money";
import { rolDeUsuario } from "@/lib/roles";
import type { Cliente, ClienteCredito, PartidaAbierta, VMayorAuxiliar, VSaldoCliente } from "@/lib/types";

export default function FichaClientePage() {
  const params = useParams();
  const clienteId = Number(params.id);
  const supabase = useMemo(() => createClient(), []);

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [credito, setCredito] = useState<ClienteCredito | null>(null);
  const [saldo, setSaldo] = useState<VSaldoCliente | null>(null);
  const [movimientos, setMovimientos] = useState<VMayorAuxiliar[]>([]);
  const [partidasAbiertas, setPartidasAbiertas] = useState<PartidaAbierta[]>([]);
  const [esAdmin, setEsAdmin] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError(null);

      const [
        { data: userData },
        clienteRes,
        creditoRes,
        saldoRes,
        movRes,
        partidasRes,
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("cliente").select("*").eq("id", clienteId).single(),
        supabase.from("cliente_credito").select("*").eq("cliente_id", clienteId).single(),
        supabase.from("v_saldo_cliente").select("*").eq("cliente_id", clienteId).single(),
        supabase
          .from("v_mayor_auxiliar")
          .select("*")
          .eq("cliente_id", clienteId)
          .order("fecha_efectiva", { ascending: true })
          .order("id", { ascending: true }),
        supabase
          .from("partida_abierta")
          .select("*")
          .eq("cliente_id", clienteId)
          .eq("estado", "ABIERTA")
          .order("fecha_entrega", { ascending: true }),
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
      setMovimientos((movRes.data ?? []) as VMayorAuxiliar[]);
      setPartidasAbiertas((partidasRes.data ?? []) as PartidaAbierta[]);
      setCargando(false);
    }
    cargar();
  }, [supabase, clienteId]);

  if (cargando) return <div>Cargando…</div>;
  if (error) return <div className="field-error">{error}</div>;
  if (!cliente) return <div>Cliente no encontrado.</div>;

  const tieneApertura = movimientos.some((m) => m.tipo === "SALDO_APERTURA");

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
            {saldo && saldo.saldo_confirmado === saldo.saldo_provisional
              ? "Igual al confirmado"
              : "Incluye pagos sin revisar"}
          </div>
        </div>
      </div>

      {partidasAbiertas.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: 700, marginBottom: 8 }}>
            Partidas abiertas — expediente
          </div>
          <div className="table">
            <div className="table-head" style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
              <div>Documento</div>
              <div>Entrega</div>
              <div>Total</div>
              <div></div>
            </div>
            {partidasAbiertas.map((p) => (
              <div key={p.id} className="table-row" style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
                <span style={{ fontSize: 12.5 }}>{p.documento_interno}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{p.fecha_entrega ?? "—"}</span>
                <span className="money">{formatBs(p.total)}</span>
                <Link href={`/clientes/${clienteId}/expediente/${p.id}`} className="btn btn-secondary">
                  Ver expediente
                </Link>
              </div>
            ))}
          </div>
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
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatBs, parseMontoInput } from "@/lib/money";
import { rolDeUsuario } from "@/lib/roles";
import type { Cliente } from "@/lib/types";

type Paso = "cargando" | "sin_permiso" | "ya_cargada" | "formulario" | "confirmar" | "enviando";

export default function CargarAperturaPage() {
  const params = useParams();
  const router = useRouter();
  const clienteId = Number(params.id);
  const supabase = useMemo(() => createClient(), []);

  const [paso, setPaso] = useState<Paso>("cargando");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [fechaCorte, setFechaCorte] = useState("");
  const [emailAdmin, setEmailAdmin] = useState("desconocido");
  const [montoTexto, setMontoTexto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      const [{ data: userData }, clienteRes, parametroRes, movRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("cliente").select("*").eq("id", clienteId).single(),
        supabase.from("parametro").select("valor").eq("clave", "fecha_corte_apertura").single(),
        supabase
          .from("movimiento_cuenta")
          .select("id")
          .eq("cliente_id", clienteId)
          .eq("tipo", "SALDO_APERTURA")
          .maybeSingle(),
      ]);

      if (rolDeUsuario(userData.user) !== "admin") {
        setPaso("sin_permiso");
        return;
      }

      if (clienteRes.error || !clienteRes.data) {
        setError("Cliente no encontrado.");
        setPaso("formulario");
        return;
      }

      setEmailAdmin(userData.user?.email ?? "desconocido");
      setCliente(clienteRes.data as Cliente);
      setFechaCorte(parametroRes.data?.valor ?? "");

      if (movRes.data) {
        setPaso("ya_cargada");
        return;
      }

      setPaso("formulario");
    }
    cargar();
  }, [supabase, clienteId]);

  const monto = parseMontoInput(montoTexto);

  function irAConfirmar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!monto) {
      setError("Ingresá un monto válido. Puede ser negativo (saldo a favor).");
      return;
    }
    if (!motivo.trim()) {
      setError("El motivo es obligatorio.");
      return;
    }
    setPaso("confirmar");
  }

  async function confirmar() {
    if (!monto) return;
    setPaso("enviando");
    setError(null);

    const { error: errRpc } = await supabase.rpc("cargar_saldo_apertura", {
      p_cliente_id: clienteId,
      p_saldo: monto.toFixed(2),
      p_admin: emailAdmin,
      p_motivo: motivo.trim(),
    });

    if (errRpc) {
      if (errRpc.code === "23505") {
        setError(
          "Este cliente ya tiene un saldo de apertura cargado. Un cliente no puede tener dos: si el monto está mal, se corrige con un AJUSTE, no con otra apertura."
        );
      } else {
        setError(errRpc.message);
      }
      setPaso("confirmar");
      return;
    }

    router.push("/apertura");
  }

  if (paso === "cargando") return <div>Cargando…</div>;

  if (paso === "sin_permiso") {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        Solo el rol <b>admin</b> puede cargar saldos de apertura.
      </div>
    );
  }

  if (paso === "ya_cargada") {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <b>{cliente?.nombre}</b> ya tiene un saldo de apertura cargado.
        <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
          <Link href={`/clientes/${clienteId}`} className="btn btn-secondary">
            Ver ficha
          </Link>
          <Link href="/apertura" className="btn btn-primary">
            Siguiente pendiente →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <Link href={`/clientes/${clienteId}`} className="btn-link">
        ← Ficha del cliente
      </Link>
      <div className="page-title" style={{ marginTop: 8 }}>
        Cargar saldo de apertura
      </div>
      <div className="page-sub">
        {cliente?.nombre} · corte al {fechaCorte || "—"}
      </div>

      {paso === "formulario" && (
        <form onSubmit={irAConfirmar} className="card">
          <div className="field">
            <label htmlFor="monto">Saldo al corte (Bs)</label>
            <input
              id="monto"
              className="input"
              value={montoTexto}
              onChange={(e) => setMontoTexto(e.target.value)}
              placeholder="48200.00"
              autoFocus
              required
            />
            <div className="field-hint">Puede ser negativo: significa que el cliente pagó por adelantado (saldo a favor).</div>
          </div>
          <div className="field">
            <label htmlFor="motivo">Motivo / referencia (obligatorio)</label>
            <textarea
              id="motivo"
              className="textarea"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
            />
          </div>
          {error && <div className="field-error" style={{ marginBottom: 14 }}>{error}</div>}
          <button type="submit" className="btn btn-orange">
            Continuar
          </button>
        </form>
      )}

      {(paso === "confirmar" || paso === "enviando") && monto && (
        <div className="card">
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
            Confirmar carga
          </div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <span style={{ color: "var(--muted)" }}>Cliente: </span>
              <b>{cliente?.nombre}</b>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Monto: </span>
              <span className={monto.isNegative() ? "money-acreedor" : "money"} style={{ fontSize: 18 }}>
                {formatBs(monto.toFixed(2))}
              </span>
              {monto.isNegative() && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--acreedor)" }}>(a favor del cliente)</span>}
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Fecha de corte: </span>
              <b>{fechaCorte}</b>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Motivo: </span>
              {motivo}
            </div>
          </div>

          {error && <div className="field-error" style={{ marginTop: 14 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setPaso("formulario")} disabled={paso === "enviando"}>
              Volver
            </button>
            <button type="button" className="btn btn-orange" onClick={confirmar} disabled={paso === "enviando"}>
              {paso === "enviando" ? "Cargando…" : "Confirmar carga"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

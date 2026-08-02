"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { rolDeUsuario } from "@/lib/roles";
import type { CategoriaCliente, Cliente, ClienteCredito, SectorCliente } from "@/lib/types";

export default function EditarClientePage() {
  const params = useParams();
  const router = useRouter();
  const clienteId = Number(params.id);
  const supabase = useMemo(() => createClient(), []);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [esGerente, setEsGerente] = useState(false);

  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");
  const [categoria, setCategoria] = useState<CategoriaCliente>("MAYORISTA");
  const [sector, setSector] = useState<SectorCliente>("PRIVADO");
  const [limiteCredito, setLimiteCredito] = useState("");
  const [sinLimite, setSinLimite] = useState(true);
  const [plazoDias, setPlazoDias] = useState(0);
  const [motivo, setMotivo] = useState("");

  const [original, setOriginal] = useState<{ limite: string | null; plazo: number } | null>(null);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      const [{ data: userData }, clienteRes, creditoRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("cliente").select("*").eq("id", clienteId).single(),
        supabase.from("cliente_credito").select("*").eq("cliente_id", clienteId).single(),
      ]);

      if (clienteRes.error) {
        setError(clienteRes.error.message);
        setCargando(false);
        return;
      }

      setEsGerente(rolDeUsuario(userData.user) === "gerente");

      const cliente = clienteRes.data as Cliente;
      const credito = creditoRes.data as ClienteCredito | null;

      setNombre(cliente.nombre);
      setNit(cliente.nit ?? "");
      setCategoria(cliente.categoria);
      setSector(credito?.sector ?? "PRIVADO");
      setLimiteCredito(credito?.limite_credito ?? "");
      setSinLimite(credito?.limite_credito == null);
      setPlazoDias(credito?.plazo_dias ?? 0);
      setOriginal({ limite: credito?.limite_credito ?? null, plazo: credito?.plazo_dias ?? 0 });

      setCargando(false);
    }
    cargar();
  }, [supabase, clienteId]);

  const limiteCambio =
    esGerente && original && (sinLimite ? original.limite !== null : original.limite !== limiteCredito);
  const plazoCambio = esGerente && original && original.plazo !== plazoDias;
  const requiereMotivo = Boolean(limiteCambio || plazoCambio);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (requiereMotivo && !motivo.trim()) {
      setError("El cambio de límite de crédito o plazo requiere un motivo.");
      return;
    }

    setGuardando(true);

    const nuevoLimite = sinLimite ? null : limiteCredito;

    const { error: errCredito } = await supabase.rpc("actualizar_credito_cliente", {
      p_cliente_id: clienteId,
      p_sector: sector,
      p_limite_credito: nuevoLimite,
      p_plazo_dias: plazoDias,
      p_motivo: motivo.trim() || null,
    });

    if (errCredito) {
      setError(errCredito.message);
      setGuardando(false);
      return;
    }

    router.push(`/clientes/${clienteId}`);
  }

  if (cargando) return <div>Cargando…</div>;

  return (
    <div style={{ maxWidth: 480 }}>
      <Link href={`/clientes/${clienteId}`} className="btn-link">
        ← Ficha del cliente
      </Link>
      <div className="page-title" style={{ marginTop: 8 }}>
        Editar cliente
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" className="input" value={nombre} disabled readOnly />
        </div>
        <div className="field">
          <label htmlFor="nit">NIT</label>
          <input id="nit" className="input" value={nit} disabled readOnly />
        </div>
        <div className="field">
          <label htmlFor="categoria">Categoría</label>
          <input id="categoria" className="input" value={categoria} disabled readOnly />
        </div>
        <div className="field-hint" style={{ marginTop: -8, marginBottom: 14 }}>
          Nombre, NIT y categoría se sincronizan desde Cation. Para corregirlos, editá el cliente en el POS.
        </div>
        <div className="field">
          <label htmlFor="sector">Sector</label>
          <select id="sector" className="select" value={sector} onChange={(e) => setSector(e.target.value as SectorCliente)}>
            <option value="PRIVADO">PRIVADO</option>
            <option value="PUBLICO">PUBLICO</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="plazo">Plazo (días)</label>
          <input
            id="plazo"
            type="number"
            min={0}
            className="input"
            value={plazoDias}
            onChange={(e) => setPlazoDias(Number(e.target.value))}
            disabled={!esGerente}
          />
          {!esGerente && <div className="field-hint">Solo el rol gerente puede modificar el plazo.</div>}
        </div>

        <div className="field">
          <label htmlFor="limite">Límite de crédito</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              id="limite"
              type="text"
              className="input"
              value={sinLimite ? "" : limiteCredito}
              onChange={(e) => setLimiteCredito(e.target.value)}
              disabled={!esGerente || sinLimite}
              placeholder={sinLimite ? "Sin límite" : "0.00"}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", fontSize: 12 }}>
              <input
                type="checkbox"
                checked={sinLimite}
                disabled={!esGerente}
                onChange={(e) => setSinLimite(e.target.checked)}
              />
              Sin límite
            </label>
          </div>
          <div className="field-hint">
            NULL es una decisión explícita ("sin límite"), no un dato faltante.
            {!esGerente && " Solo el rol gerente puede modificarlo."}
          </div>
        </div>

        {requiereMotivo && (
          <div className="field">
            <label htmlFor="motivo">Motivo del cambio (obligatorio)</label>
            <textarea
              id="motivo"
              className="textarea"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
        )}

        {error && <div className="field-error" style={{ marginBottom: 14 }}>{error}</div>}

        <button type="submit" className="btn btn-orange" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}

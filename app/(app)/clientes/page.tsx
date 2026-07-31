"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatBs } from "@/lib/money";
import type { CategoriaCliente, VSaldoCliente } from "@/lib/types";

const CATEGORIAS: CategoriaCliente[] = ["RETAIL", "MAYORISTA", "INSTITUCIONAL", "CORPORATIVO"];

function badgeSituacion(situacion: VSaldoCliente["situacion"]) {
  if (situacion === "DEUDOR") return "badge badge-deudor";
  if (situacion === "ACREEDOR") return "badge badge-acreedor";
  return "badge badge-aldia";
}

export default function ClientesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [clientes, setClientes] = useState<VSaldoCliente[]>([]);
  const [conApertura, setConApertura] = useState<Set<number>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<CategoriaCliente | "">("");

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError(null);

      const [saldos, aperturas] = await Promise.all([
        supabase.from("v_saldo_cliente").select("*").order("cliente"),
        supabase.from("movimiento_cuenta").select("cliente_id").eq("tipo", "SALDO_APERTURA"),
      ]);

      if (saldos.error) {
        setError(saldos.error.message);
        setCargando(false);
        return;
      }

      setClientes(saldos.data as VSaldoCliente[]);
      setConApertura(new Set((aperturas.data ?? []).map((r) => r.cliente_id as number)));
      setCargando(false);
    }
    cargar();
  }, [supabase]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return clientes.filter((c) => {
      if (categoria && c.categoria !== categoria) return false;
      if (q && !c.cliente.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [clientes, busqueda, categoria]);

  const pendientes = clientes.length - conApertura.size;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="page-title">Clientes</div>
          <div className="page-sub">Una cuenta corriente viva por cliente.</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/clientes/importar" className="btn btn-secondary">
            Importar desde POS
          </Link>
          <Link href="/clientes/nuevo" className="btn btn-primary">
            + Nuevo cliente
          </Link>
        </div>
      </div>

      {!cargando && clientes.length > 0 && (
        <div
          className="banner-warn"
          style={{ marginBottom: 16, alignItems: "center" }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {pendientes === 0
              ? "Todos los clientes tienen saldo de apertura cargado."
              : `Faltan ${pendientes} de ${clientes.length} clientes por cargar su saldo de apertura.`}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, margin: "16px 0" }}>
        <input
          className="input"
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          autoFocus
          style={{ maxWidth: 320 }}
        />
        <select
          className="select"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaCliente | "")}
          style={{ maxWidth: 200 }}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="field-error">{error}</div>}
      {cargando && <div>Cargando…</div>}

      {!cargando && (
        <div className="table">
          <div className="table-head" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto" }}>
            <div>Cliente</div>
            <div>Categoría</div>
            <div>Saldo confirmado</div>
            <div>Situación</div>
            <div>Apertura</div>
            <div></div>
          </div>
          {filtrados.map((c) => (
            <div
              key={c.cliente_id}
              className="table-row"
              style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto" }}
            >
              <b style={{ fontSize: 13 }}>{c.cliente}</b>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{c.categoria}</span>
              <span
                className={
                  Number(c.saldo_confirmado) < 0 ? "money-acreedor" : "money"
                }
              >
                {formatBs(c.saldo_confirmado)}
              </span>
              <span className={badgeSituacion(c.situacion)}>{c.situacion}</span>
              <span className={conApertura.has(c.cliente_id) ? "badge badge-aldia" : "badge badge-pendiente"}>
                {conApertura.has(c.cliente_id) ? "Cargada" : "Pendiente"}
              </span>
              <Link href={`/clientes/${c.cliente_id}`} className="btn btn-secondary">
                Ver ficha
              </Link>
            </div>
          ))}
          {filtrados.length === 0 && (
            <div className="table-row" style={{ gridTemplateColumns: "1fr" }}>
              <span style={{ color: "var(--muted)" }}>No hay clientes que coincidan.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

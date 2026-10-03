"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useHermesRefresh } from "@/lib/supabase/use-refresh";
import { formatBs } from "@/lib/money";
import { CATEGORIAS_CONCILIADOR, type CategoriaCliente, type VSaldoCliente } from "@/lib/types";


const CATEGORIAS = CATEGORIAS_CONCILIADOR;

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
  const [errorAperturas, setErrorAperturas] = useState<string | null>(null);

  useHermesRefresh(() => cargar(true), !cargando);
  async function cargar(enSegundoPlano = false) {
    if (!enSegundoPlano) setCargando(true);
    setError(null);
    setErrorAperturas(null);

    const [saldos, aperturas] = await Promise.all([
      supabase.from("v_saldo_cliente").select("*").in("categoria", [...CATEGORIAS]).order("cliente"),
      supabase.from("movimiento_cuenta").select("cliente_id").eq("tipo", "SALDO_APERTURA"),
    ]);

    if (saldos.error) {
      setError(saldos.error.message);
      setCargando(false);
      return;
    }

    setClientes(saldos.data as VSaldoCliente[]);

    if (aperturas.error) {
      setErrorAperturas(aperturas.error.message);
      setConApertura(new Set());
    } else {
      setConApertura(new Set((aperturas.data ?? []).map((r) => r.cliente_id as number)));
    }

    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);


  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return clientes.filter((c) => {
      if (categoria && c.categoria !== categoria) return false;
      if (q && !c.cliente.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [clientes, busqueda, categoria]);

  const pendientes = clientes.filter(c => !conApertura.has(c.cliente_id)).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Clientes</h1>
          <div className="page-sub">Clientes y pedidos de Seller se sincronizan automáticamente. La lista se actualiza cada 15 segundos.</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-secondary" disabled={cargando} onClick={() => void cargar()}>
            {cargando ? "Actualizando…" : "Actualizar"}
          </button>
          <Link href="/clientes/importar" className="btn btn-secondary">
            Revisar clientes pendientes
          </Link>
          <Link href="/pedidos-pendientes" className="btn btn-secondary">
            Pedidos pendientes
          </Link>
          <Link href="/clientes/nuevo" className="btn btn-primary">
            + Nuevo cliente
          </Link>
        </div>
      </div>



      {!cargando && errorAperturas && (
        <div className="field-error" style={{ marginBottom: 16 }}>
          No se pudo cargar el estado de apertura de los clientes ({errorAperturas}).
        </div>
      )}

      {!cargando && !errorAperturas && clientes.length > 0 && (
        <div
          className="banner-warn"
          style={{ marginBottom: 16, alignItems: "center" }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {pendientes === 0
              ? "Todos los clientes tienen saldo de apertura cargado."
              : `${pendientes} clientes sin saldo inicial declarado. Cárgalo solo si tenían un saldo previo al conciliador.`}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, margin: "16px 0" }}>
        <input
          className="input"
          placeholder="Buscar por nombre…"
          aria-label="Buscar cliente por nombre"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <select
          className="select"
          aria-label="Categoría del cliente"
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
          <div className="table-head" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr auto" }}>
            <div>Cliente</div>
            <div>Categoría</div>
            <div>Saldo confirmado</div>
            <div>Saldo provisional</div>
            <div>Situación</div>
            <div>Apertura</div>
            <div></div>
          </div>
          {filtrados.map((c) => (
            <div
              key={c.cliente_id}
              className="table-row"
              style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr auto" }}
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
              <span className="money-provisional">{formatBs(c.saldo_provisional)}</span>
              <span className={badgeSituacion(c.situacion)}>{c.situacion}</span>
              {errorAperturas ? (
                <span className="badge">—</span>
              ) : (
                <span className={conApertura.has(c.cliente_id) ? "badge badge-aldia" : "badge badge-pendiente"}>
                  {conApertura.has(c.cliente_id) ? "Cargada" : "Sin saldo inicial"}
                </span>
              )}
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

"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useHermesRefresh } from "@/lib/supabase/use-refresh";
import { leerPaginas } from "@/lib/paginate";
import { formatBs } from "@/lib/money";
import { CATEGORIAS_CONCILIADOR, type CategoriaCliente, type VClienteCartera } from "@/lib/types";
import {
  filtrarClientes,
  ordenarClientes,
  contarPorSituacion,
  SITUACION_FILTROS,
  ORDEN_OPCIONES,
  type SituacionFiltro,
  type OrdenClientes,
} from "@/lib/clientes-filtros";
import { Icon } from "@/components/Icon";

const CATEGORIAS = CATEGORIAS_CONCILIADOR;
const SITUACIONES_VALIDAS = new Set(SITUACION_FILTROS.map((s) => s.value));
const ORDENES_VALIDOS = new Set(ORDEN_OPCIONES.map((o) => o.value));

function badgeSituacion(situacion: VClienteCartera["situacion"]) {
  if (situacion === "DEUDOR") return "badge badge-deudor";
  if (situacion === "ACREEDOR") return "badge badge-acreedor";
  return "badge badge-aldia";
}

function labelSituacion(situacion: VClienteCartera["situacion"]) {
  if (situacion === "DEUDOR") return "Con deuda";
  if (situacion === "ACREEDOR") return "A favor";
  return "Al día";
}

function parseSituacion(valor: string | null): SituacionFiltro {
  return valor && SITUACIONES_VALIDAS.has(valor as SituacionFiltro) ? (valor as SituacionFiltro) : "todos";
}

function parseOrden(valor: string | null): OrdenClientes {
  return valor && ORDENES_VALIDOS.has(valor as OrdenClientes) ? (valor as OrdenClientes) : "nombre_asc";
}

function parseCategoria(valor: string | null): CategoriaCliente | "" {
  return valor && (CATEGORIAS as readonly string[]).includes(valor) ? (valor as CategoriaCliente) : "";
}

export default function ClientesPage() {
  return (
    <Suspense>
      <ClientesPageInterna />
    </Suspense>
  );
}

function ClientesPageInterna() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useSearchParams();

  const [clientes, setClientes] = useState<VClienteCartera[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categoria = parseCategoria(params.get("categoria"));
  const situacion = parseSituacion(params.get("situacion"));
  const orden = parseOrden(params.get("orden"));

  // Texto en estado local: escribir nunca espera al router.replace. Se
  // sincroniza a la URL con debounce (abajo) y desde la URL cuando cambia
  // por fuera (recarga, atrás/adelante del navegador).
  const [textoBusqueda, setTextoBusqueda] = useState(() => params.get("q") ?? "");
  const paramsRef = useRef(params);
  paramsRef.current = params;
  // Último valor de "q" que nosotros mismos escribimos en la URL. El
  // router.replace del debounce puede tardar en confirmarse; si para
  // entonces el usuario ya tecleó algo más nuevo, esa confirmación no debe
  // pisarlo. Solo tratamos un cambio de "q" como externo (recarga, atrás/
  // adelante) cuando no coincide con lo que nosotros mismos enviamos.
  const ultimoQueryEnviado = useRef(params.get("q") ?? "");

  useEffect(() => {
    const actual = params.get("q") ?? "";
    if (actual === ultimoQueryEnviado.current) return;
    ultimoQueryEnviado.current = actual;
    setTextoBusqueda(actual);
  }, [params]);

  useEffect(() => {
    const espera = setTimeout(() => {
      const actual = paramsRef.current.get("q") ?? "";
      if (actual === textoBusqueda) return;
      ultimoQueryEnviado.current = textoBusqueda;
      const next = new URLSearchParams(paramsRef.current.toString());
      if (textoBusqueda) next.set("q", textoBusqueda);
      else next.delete("q");
      router.replace(`/clientes?${next.toString()}`);
    }, 250);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textoBusqueda]);

  function actualizarQuery(cambios: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) next.set(clave, valor);
      else next.delete(clave);
    }
    router.replace(`/clientes?${next.toString()}`);
  }

  useHermesRefresh(() => cargar(true), !cargando);
  async function cargar(enSegundoPlano = false) {
    if (!enSegundoPlano) setCargando(true);
    setError(null);

    const res = await leerPaginas<VClienteCartera>((from, to) =>
      supabase
        .from("v_cliente_cartera")
        .select("*")
        .in("categoria", [...CATEGORIAS])
        .order("cliente")
        .order("cliente_id")
        .range(from, to)
    );

    if (res.error) {
      setError(res.error.message);
      setCargando(false);
      return;
    }

    setClientes(res.data ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const porCategoria = useMemo(
    () => (categoria ? clientes.filter((c) => c.categoria === categoria) : clientes),
    [clientes, categoria]
  );
  const conteos = useMemo(() => contarPorSituacion(porCategoria), [porCategoria]);
  const filtrados = useMemo(
    () => ordenarClientes(filtrarClientes(porCategoria, situacion, textoBusqueda), orden),
    [porCategoria, situacion, textoBusqueda, orden]
  );
  const totalBase = (situacion === "inactivos" ? conteos.inactivos : conteos.todos) || 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <div className="page-sub">Clientes y pedidos de Seller se sincronizan automáticamente. La lista se actualiza cada 15 segundos.</div>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-secondary" disabled={cargando} onClick={() => void cargar()}>
            {cargando ? "Actualizando…" : "Actualizar"}
          </button>
          <Link href="/clientes/nuevo" className="btn btn-primary">
            Nuevo cliente
          </Link>
        </div>
      </div>

      <div className="filter-bar">
        <label className="search-field">
          <Icon name="search" size={18} />
          <input
            aria-label="Buscar cliente"
            placeholder="Buscar un cliente…"
            value={textoBusqueda}
            onChange={(e) => setTextoBusqueda(e.target.value)}
          />
        </label>
        <select
          className="select"
          aria-label="Categoría del cliente"
          value={categoria}
          onChange={(e) => actualizarQuery({ categoria: e.target.value })}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="select"
          aria-label="Filtrar clientes"
          value={situacion}
          onChange={(e) => actualizarQuery({ situacion: e.target.value })}
        >
          {SITUACION_FILTROS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label} ({conteos[s.value]})
            </option>
          ))}
        </select>
        <select
          className="select"
          aria-label="Ordenar clientes"
          value={orden}
          onChange={(e) => actualizarQuery({ orden: e.target.value })}
        >
          {ORDEN_OPCIONES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="empty-state" role="alert">
          <Icon name="alert" />
          <h3>No pudimos cargar la cartera</h3>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={() => void cargar()}>
            Reintentar
          </button>
        </div>
      )}
      {!error && cargando && <div className="loading-state" role="status">Consultando clientes…</div>}

      {!error && !cargando && (
        <div className="table">
          <div className="table-head" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr auto" }}>
            <div>Cliente</div>
            <div>Categoría</div>
            <div>Saldo confirmado</div>
            <div>Pendiente en partidas</div>
            <div>Vencido</div>
            <div>Próx. vencimiento</div>
            <div>Situación</div>
            <div></div>
          </div>
          {filtrados.map((c) => {
            const vencido = Number(c.monto_vencido) > 0;
            return (
              <div key={c.cliente_id} className="table-row" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr auto" }}>
                <b style={{ fontSize: 13 }}>{c.cliente}</b>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{c.categoria}</span>
                <span className={Number(c.saldo_confirmado) < 0 ? "money-acreedor" : "money"}>
                  {formatBs(c.saldo_confirmado)}
                </span>
                <span className="money">{formatBs(c.pendiente_partidas)}</span>
                <span className={vencido ? "money-overdue" : undefined}>
                  {vencido ? formatBs(c.monto_vencido) : "—"}
                </span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  {c.proximo_vencimiento
                    ? (() => {
                        const [anio, mes, dia] = c.proximo_vencimiento.split("-");
                        return `${dia}/${mes}/${anio}`;
                      })()
                    : c.partidas_sin_fecha > 0
                      ? "Plazo sin iniciar"
                      : "—"}
                </span>
                <span className={badgeSituacion(c.situacion)}>{labelSituacion(c.situacion)}</span>
                <Link href={`/clientes/${c.cliente_id}`} className="btn btn-secondary">
                  Ver ficha
                </Link>
              </div>
            );
          })}
          {filtrados.length === 0 && (
            <div className="table-row" style={{ gridTemplateColumns: "1fr" }}>
              <span style={{ color: "var(--muted)" }}>No hay clientes que coincidan.</span>
            </div>
          )}
        </div>
      )}

      {!error && !cargando && (
        <div className="panel-footer">
          <span>
            {filtrados.length} de {totalBase} clientes
          </span>
        </div>
      )}
    </div>
  );
}

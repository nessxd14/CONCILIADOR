"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULTS_CREDITO_POR_CATEGORIA,
  sectorDesdeCategoria,
  type ClienteCationPendiente,
} from "@/lib/types";

type EstadoFila = { cargando: boolean; error: string | null };

export default function ImportarClientesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [pendientes, setPendientes] = useState<ClienteCationPendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFilas, setEstadoFilas] = useState<Record<number, EstadoFila>>({});
  const [avisos, setAvisos] = useState<string[]>([]);

  async function cargar() {
    setCargando(true);
    setError(null);

    const { data, error: errCation } = await supabase
      .from("v_clientes_cation_pendientes")
      .select("*")
      .order("nombre");

    if (errCation) {
      setError(errCation.message);
      setCargando(false);
      return;
    }

    setPendientes(data as ClienteCationPendiente[]);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return pendientes;
    return pendientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.razon_social ?? "").toLowerCase().includes(q)
    );
  }, [pendientes, busqueda]);

  async function importar(cliente: ClienteCationPendiente) {
    const categoria = cliente.categoria_sugerida;
    if (!categoria) {
      setEstadoFilas((prev) => ({
        ...prev,
        [cliente.id]: {
          cargando: false,
          error: `tipo_precio "${cliente.tipo_precio}" no tiene categoría equivalente en Hermes.`,
        },
      }));
      return;
    }

    setEstadoFilas((prev) => ({ ...prev, [cliente.id]: { cargando: true, error: null } }));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: errCliente } = await supabase.from("cliente").insert({
      id: cliente.id,
      pos_cliente_id: cliente.id,
      nombre: cliente.nombre,
      nit: cliente.documento,
      categoria,
      activo: true,
      importado_en: new Date().toISOString(),
    });

    if (errCliente) {
      setEstadoFilas((prev) => ({
        ...prev,
        [cliente.id]: { cargando: false, error: errCliente.message },
      }));
      return;
    }

    const sector = sectorDesdeCategoria(categoria);
    const defaults = DEFAULTS_CREDITO_POR_CATEGORIA[categoria];

    const { error: errCredito } = await supabase.from("cliente_credito").insert({
      cliente_id: cliente.id,
      sector,
      inicio_computo: defaults.inicio_computo,
      plazo_dias: defaults.plazo_dias,
      actualizado_por: user?.email ?? "desconocido",
    });

    // El cliente ya se creó: se saca de pendientes en cualquier caso (regla 5),
    // pero si cliente_credito falló (p. ej. rol comercial, sin permiso de
    // INSERT ahí) hay que avisar en vez de dejarlo pasar en silencio.
    setPendientes((prev) => prev.filter((c) => c.id !== cliente.id));
    setEstadoFilas((prev) => {
      const next = { ...prev };
      delete next[cliente.id];
      return next;
    });
    router.refresh();

    if (errCredito) {
      setAvisos((prev) => [
        ...prev,
        `${cliente.nombre}: se importó, pero no se pudo crear su ficha de crédito (${errCredito.message}). Necesita que un admin o gerente la complete.`,
      ]);
    } else {
      setAvisos((prev) => [...prev, `${cliente.nombre}: importado correctamente.`]);
    }
  }

  return (
    <div>
      <Link href="/clientes" className="btn-link">
        ← Clientes
      </Link>
      <div className="page-title" style={{ marginTop: 8 }}>
        Importar desde POS
      </div>
      <div className="page-sub">
        Clientes activos de Cation que todavía no tienen cuenta corriente en Hermes.
      </div>

      {avisos.length > 0 && (
        <div className="card" style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {avisos.map((a, i) => (
            <div key={i} style={{ fontSize: 13 }}>
              {a}
            </div>
          ))}
        </div>
      )}

      <div style={{ margin: "16px 0" }}>
        <input
          className="input"
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          autoFocus
          style={{ maxWidth: 320 }}
        />
      </div>

      {error && <div className="field-error">{error}</div>}
      {cargando && <div>Cargando…</div>}

      {!cargando && (
        <div className="table">
          <div className="table-head" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto" }}>
            <div>Cliente</div>
            <div>Tipo de precio</div>
            <div>Categoría</div>
            <div>Documento</div>
            <div>Ciudad</div>
            <div></div>
          </div>
          {filtrados.map((c) => {
            const fila = estadoFilas[c.id];
            const sinCategoria = !c.categoria_sugerida;
            return (
              <div key={c.id}>
                <div className="table-row" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto" }}>
                  <div>
                    <b style={{ fontSize: 13 }}>{c.nombre}</b>
                    {c.razon_social && (
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.razon_social}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{c.tipo_precio}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{c.categoria_sugerida ?? "—"}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{c.documento || "—"}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{c.ciudad || "—"}</span>
                  <button
                    type="button"
                    className="btn btn-orange"
                    disabled={fila?.cargando || sinCategoria}
                    onClick={() => importar(c)}
                  >
                    {fila?.cargando ? "Importando…" : "Importar"}
                  </button>
                </div>
                {sinCategoria && !fila?.error && (
                  <div className="field-error" style={{ padding: "0 16px 10px" }}>
                    {`tipo_precio "${c.tipo_precio}" no tiene categoría equivalente en Hermes.`}
                  </div>
                )}
                {fila?.error && (
                  <div className="field-error" style={{ padding: "0 16px 10px" }}>
                    {fila.error}
                  </div>
                )}
              </div>
            );
          })}
          {filtrados.length === 0 && (
            <div className="table-row" style={{ gridTemplateColumns: "1fr" }}>
              <span style={{ color: "var(--muted)" }}>
                {pendientes.length === 0
                  ? "No hay clientes de Cation pendientes de importar."
                  : "No hay clientes que coincidan con la búsqueda."}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

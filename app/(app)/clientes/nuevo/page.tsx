"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULTS_CREDITO_POR_CATEGORIA,
  type CategoriaCliente,
  type SectorCliente,
} from "@/lib/types";

export default function NuevoClientePage() {
  const router = useRouter();
  const supabase = createClient();

  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");
  const [categoria, setCategoria] = useState<CategoriaCliente>("MAYORISTA");
  const [sector, setSector] = useState<SectorCliente>("PRIVADO");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setGuardando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Clientes creados directo en Hermes usan ids desde 900000 (ver
    // comentario en cliente.id): se importan del POS conservando su id
    // original, así que este rango no puede chocar con una importación.
    const { data: ultimo, error: errUltimo } = await supabase
      .from("cliente")
      .select("id")
      .gte("id", 900000)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errUltimo) {
      setError(errUltimo.message);
      setGuardando(false);
      return;
    }

    const nuevoId = ultimo ? Number(ultimo.id) + 1 : 900000;

    const { error: errCliente } = await supabase.from("cliente").insert({
      id: nuevoId,
      nombre: nombre.trim(),
      nit: nit.trim() || null,
      categoria,
    });

    if (errCliente) {
      setError(errCliente.message);
      setGuardando(false);
      return;
    }

    const defaults = DEFAULTS_CREDITO_POR_CATEGORIA[categoria];

    const { error: errCredito } = await supabase.from("cliente_credito").insert({
      cliente_id: nuevoId,
      sector,
      inicio_computo: defaults.inicio_computo,
      plazo_dias: defaults.plazo_dias,
      actualizado_por: user?.email ?? "desconocido",
    });

    if (errCredito) {
      setError(errCredito.message);
      setGuardando(false);
      return;
    }

    router.push(`/clientes/${nuevoId}`);
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <Link href="/clientes" className="btn-link">
        ← Clientes
      </Link>
      <div className="page-title" style={{ marginTop: 8 }}>
        Nuevo cliente
      </div>
      <div className="page-sub">
        Al crear se genera también su ficha de crédito con los valores por
        defecto de la categoría.
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="field">
          <label htmlFor="nit">NIT</label>
          <input id="nit" className="input" value={nit} onChange={(e) => setNit(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="categoria">Categoría</label>
          <select
            id="categoria"
            className="select"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaCliente)}
          >
            <option value="RETAIL">RETAIL</option>
            <option value="MAYORISTA">MAYORISTA</option>
            <option value="MUNICIPAL">MUNICIPAL</option>
            <option value="CORPORATIVO">CORPORATIVO</option>
          </select>
          <div className="field-hint">
            Define el plazo por defecto: {DEFAULTS_CREDITO_POR_CATEGORIA[categoria].inicio_computo} ·{" "}
            {DEFAULTS_CREDITO_POR_CATEGORIA[categoria].plazo_dias} días
          </div>
        </div>
        <div className="field">
          <label htmlFor="sector">Sector</label>
          <select
            id="sector"
            className="select"
            value={sector}
            onChange={(e) => setSector(e.target.value as SectorCliente)}
          >
            <option value="PRIVADO">PRIVADO</option>
            <option value="PUBLICO">PUBLICO</option>
          </select>
        </div>

        {error && <div className="field-error" style={{ marginBottom: 14 }}>{error}</div>}

        <button type="submit" className="btn btn-orange" disabled={guardando}>
          {guardando ? "Guardando…" : "Crear cliente"}
        </button>
      </form>
    </div>
  );
}

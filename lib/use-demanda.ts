"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AccionDemanda, AnotacionDemanda, CanalDemanda, IdeaDemanda, SimilarDemanda, ViaCompra } from "./demanda";

/** Las funciones de Compras viven en `public`; el cliente usa `hermes` por defecto. */
const pub = () => createClient().schema("public");
const mensaje = (e: { message?: string } | null | undefined) => e?.message || "No se pudo completar la operación.";

export function useDemanda() {
  const [acceso, setAcceso] = useState<"verificando" | "si" | "no">("verificando");
  const [canal, setCanal] = useState<CanalDemanda | null>(null);
  const [ideas, setIdeas] = useState<IdeaDemanda[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    pub().rpc("app_es_comprador").then(({ data, error }) => {
      if (vivo) setAcceso(!error && data === true ? "si" : "no");
    }, () => { if (vivo) setAcceso("no"); });
    return () => { vivo = false; };
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data, error } = await pub().rpc("demanda_resumen", { p_dias: 30, p_filtro: "TODO", p_canal: canal });
      if (error) throw error;
      setIdeas((data ?? []) as IdeaDemanda[]); setError(null);
    } catch (e) { setError(mensaje(e as { message?: string })); }
    finally { setCargando(false); }
  }, [canal]);

  useEffect(() => { if (acceso === "si") void cargar(); }, [acceso, cargar]);

  return { acceso, canal, setCanal, ideas, cargando, error, cargar };
}

export async function leerAnotaciones(ideaId: number): Promise<{ anotaciones: AnotacionDemanda[]; similares: SimilarDemanda[] }> {
  const [a, s] = await Promise.all([
    pub().rpc("demanda_anotaciones", { p_idea_id: ideaId }),
    pub().rpc("demanda_similares", { p_idea_id: ideaId }),
  ]);
  if (a.error) throw new Error(mensaje(a.error));
  if (s.error) throw new Error(mensaje(s.error));
  return { anotaciones: (a.data ?? []) as AnotacionDemanda[], similares: (s.data ?? []) as SimilarDemanda[] };
}

export async function decidir(ideaId: number, accion: AccionDemanda, via?: ViaCompra, motivo?: string) {
  const { error } = await pub().rpc("demanda_decidir", { p_idea_id: ideaId, p_accion: accion, p_via: via ?? null, p_motivo: motivo ?? null });
  if (error) throw new Error(mensaje(error));
}

export async function unir(origen: number, destino: number) {
  const { error } = await pub().rpc("demanda_unir", { p_origen: origen, p_destino: destino });
  if (error) throw new Error(mensaje(error));
}

export async function marcarAvisados(ids: number[]) {
  const { error } = await pub().rpc("demanda_avisado", { p_demanda_ids: ids });
  if (error) throw new Error(mensaje(error));
}

export async function urlFoto(path: string): Promise<string> {
  const { data, error } = await createClient().storage.from("demanda_fotos").createSignedUrl(path, 600);
  if (error || !data) throw new Error(mensaje(error));
  return data.signedUrl;
}

import { createServiceClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Agente = "OPENCLAW" | "HERMES_AGENT";

/**
 * El agente se resuelve desde el secreto, nunca desde el body: un JSON que
 * traiga un campo "agente" se ignora. Es lo que hace que documento.origen
 * sea confiable y no una declaración del propio cliente.
 */
export function agenteDesdeSecreto(secreto: string | null): Agente | null {
  if (!secreto) return null;
  if (process.env.OPENCLAW_INGEST_SECRET && secreto === process.env.OPENCLAW_INGEST_SECRET) return "OPENCLAW";
  if (process.env.HERMES_AGENT_INGEST_SECRET && secreto === process.env.HERMES_AGENT_INGEST_SECRET) return "HERMES_AGENT";
  return null;
}

export function metodoNoPermitido() {
  return Response.json({ error: "Método no permitido" }, { status: 405 });
}

/**
 * Autenticación + guard de configuración comunes a todos los endpoints de
 * agentes. Devuelve el agente y un cliente service_role listos para usar, o
 * una Response de error (401/500) lista para retornar tal cual.
 */
export function autenticarAgente(
  request: Request
): { ok: true; agente: Agente; supabase: SupabaseClient } | { ok: false; response: Response } {
  const secreto = request.headers.get("x-agente-secret");
  const agente = agenteDesdeSecreto(secreto);
  if (!agente) {
    return { ok: false, response: Response.json({ error: "No autorizado" }, { status: 401 }) };
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return {
      ok: false,
      response: Response.json({ error: "Hermes no está configurado en el servidor" }, { status: 500 }),
    };
  }

  return { ok: true, agente, supabase };
}

export function esStringNoVacio(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function esObjetoPlano(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function esEnteroPositivo(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

export function esConfianzaValida(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
}

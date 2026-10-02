import { obtenerSesionHermes } from "@/lib/supabase/session";
import { createClient as createServerSessionClient } from "@/lib/supabase/server";
import { puedeGestionarEvidencia } from "@/lib/roles";

export const runtime = "nodejs";

/** La sesión del usuario llama una RPC que valida el rol y modifica solo el vínculo del comprobante. */
async function autenticarGerenteOAdmin() {
  const supabaseSesion = await createServerSessionClient();
  const {
    data: { user, rol },
    error: errorSesion,
  } = await obtenerSesionHermes(supabaseSesion);

  if (!user) {
    return { ok: false as const, response: Response.json({ error: "No autenticado" }, { status: 401 }) };
  }

  if (errorSesion) {
    return { ok: false as const, response: Response.json({ error: "No se pudo validar el acceso a Hermes" }, { status: 503 }) };
  }
  if (!puedeGestionarEvidencia(rol)) {
    return {
      ok: false as const,
      response: Response.json({ error: "Tu rol no puede gestionar comprobantes" }, { status: 403 }),
    };
  }

  return { ok: true as const, supabase: supabaseSesion };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await autenticarGerenteOAdmin();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { id: idRaw } = await params;
  const pagoId = Number(idRaw);
  if (!Number.isInteger(pagoId) || pagoId <= 0) {
    return Response.json({ error: "id debe ser un entero positivo" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON válido" }, { status: 400 });
  }

  const evidenciaId = (body as Record<string, unknown>)?.evidencia_id;
  if (typeof evidenciaId !== "number" || !Number.isInteger(evidenciaId) || evidenciaId <= 0) {
    return Response.json({ error: "evidencia_id debe ser un entero positivo" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("asociar_comprobante_pago", { p_pago_id: pagoId, p_evidencia_id: evidenciaId });

  if (error) {
    return Response.json({ error: error.message }, { status: error.code === "P0002" ? 404 : error.code === "42501" ? 403 : 400 });
  }
  if (!data) {
    return Response.json({ error: `Pago ${pagoId} no existe` }, { status: 404 });
  }

  return Response.json({ ok: true, pago: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await autenticarGerenteOAdmin();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { id: idRaw } = await params;
  const pagoId = Number(idRaw);
  if (!Number.isInteger(pagoId) || pagoId <= 0) {
    return Response.json({ error: "id debe ser un entero positivo" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("asociar_comprobante_pago", { p_pago_id: pagoId, p_evidencia_id: null });

  if (error) {
    return Response.json({ error: error.message }, { status: error.code === "P0002" ? 404 : error.code === "42501" ? 403 : 400 });
  }
  if (!data) {
    return Response.json({ error: `Pago ${pagoId} no existe` }, { status: 404 });
  }

  return Response.json({ ok: true, pago: data });
}

function metodoNoPermitido() {
  return Response.json({ error: "Método no permitido" }, { status: 405 });
}

export async function GET() {
  return metodoNoPermitido();
}

export async function PUT() {
  return metodoNoPermitido();
}

export async function PATCH() {
  return metodoNoPermitido();
}

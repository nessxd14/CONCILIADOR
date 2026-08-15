import { createClient as createServerSessionClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rolDeUsuario, puedeGestionarEvidencia } from "@/lib/roles";

// El cliente de service_role no debe correr en edge.
export const runtime = "nodejs";

/**
 * pago no tiene política RLS de UPDATE (solo lectura): asociar un comprobante
 * requiere este endpoint con service_role, autenticado por la sesión propia
 * del usuario (no por secreto compartido, a diferencia de /api/expediente/*).
 * El rol se valida acá server-side desde app_metadata, nunca se confía en lo
 * que mande el body.
 */
async function autenticarGerenteOAdmin() {
  const supabaseSesion = await createServerSessionClient();
  const {
    data: { user },
  } = await supabaseSesion.auth.getUser();

  if (!user) {
    return { ok: false as const, response: Response.json({ error: "No autenticado" }, { status: 401 }) };
  }

  const rol = rolDeUsuario(user);
  if (!puedeGestionarEvidencia(rol)) {
    return {
      ok: false as const,
      response: Response.json({ error: "Tu rol no puede gestionar comprobantes" }, { status: 403 }),
    };
  }

  const supabaseServicio = createServiceClient();
  if (!supabaseServicio) {
    return {
      ok: false as const,
      response: Response.json({ error: "Hermes no está configurado en el servidor" }, { status: 500 }),
    };
  }

  return { ok: true as const, supabase: supabaseServicio, usuario: user.email ?? "desconocido" };
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

  const { data, error } = await supabase
    .from("pago")
    .update({ evidencia_id: evidenciaId })
    .eq("id", pagoId)
    .select("id, evidencia_id")
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
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

  const { data, error } = await supabase
    .from("pago")
    .update({ evidencia_id: null })
    .eq("id", pagoId)
    .select("id, evidencia_id")
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
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

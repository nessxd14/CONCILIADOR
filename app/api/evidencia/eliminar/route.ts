import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rolDeUsuario, puedeGestionarDocumentos } from "@/lib/roles";

// El cliente de service_role no debe correr en edge.
export const runtime = "nodejs";

function metodoNoPermitido() {
  return Response.json({ error: "Método no permitido" }, { status: 405 });
}

/**
 * Brief T7 Tarea 2: borrado de un comprobante/documento, solo admin/gerente — mismo
 * criterio que la política de storage `borrado_documentos`. `pago.evidencia_id` tiene
 * ON DELETE SET NULL hacia `evidencia`, así que borrar la fila de evidencia ya lo
 * desvincula solo; `documento` no tiene esa FK (solo copia storage_path como texto), así
 * que ahí se busca la evidencia por storage_path y se limpia el documento a mano.
 */
export async function POST(request: Request) {
  const supabaseUser = await createClient();
  const { data: userData } = await supabaseUser.auth.getUser();
  const rol = rolDeUsuario(userData.user ?? null);
  if (!puedeGestionarDocumentos(rol)) {
    return Response.json({ error: "Tu rol no puede borrar documentos" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON válido" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json({ error: "El cuerpo debe ser un objeto JSON" }, { status: 400 });
  }

  const { entidad, entidadId } = body as Record<string, unknown>;
  if (entidad !== "pago" && entidad !== "documento") {
    return Response.json({ error: 'entidad debe ser "pago" o "documento"' }, { status: 400 });
  }
  if (typeof entidadId !== "number" || !Number.isInteger(entidadId) || entidadId <= 0) {
    return Response.json({ error: "entidadId inválido" }, { status: 400 });
  }

  const service = createServiceClient();
  if (!service) {
    return Response.json({ error: "Hermes no está configurado en el servidor" }, { status: 500 });
  }

  if (entidad === "pago") {
    const { data: pago, error: pagoError } = await service.from("pago").select("id, evidencia_id").eq("id", entidadId).maybeSingle();
    if (pagoError) return Response.json({ error: pagoError.message }, { status: 500 });
    if (!pago?.evidencia_id) return Response.json({ error: "Este pago no tiene comprobante" }, { status: 404 });

    const { data: evidencia, error: evidenciaError } = await service
      .from("evidencia")
      .select("storage_path")
      .eq("id", pago.evidencia_id)
      .maybeSingle();
    if (evidenciaError) return Response.json({ error: evidenciaError.message }, { status: 500 });

    if (evidencia?.storage_path) {
      const { error: storageError } = await service.storage.from("documentos-expediente").remove([evidencia.storage_path]);
      if (storageError) return Response.json({ error: `No se pudo borrar el archivo del storage: ${storageError.message}` }, { status: 500 });
    }

    const { error: deleteError } = await service.from("evidencia").delete().eq("id", pago.evidencia_id);
    if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });

    return Response.json({ ok: true });
  }

  const { data: documento, error: documentoError } = await service
    .from("documento")
    .select("id, storage_path")
    .eq("id", entidadId)
    .maybeSingle();
  if (documentoError) return Response.json({ error: documentoError.message }, { status: 500 });
  if (!documento?.storage_path) return Response.json({ error: "Este documento no tiene archivo" }, { status: 404 });

  const { error: storageError } = await service.storage.from("documentos-expediente").remove([documento.storage_path]);
  if (storageError) return Response.json({ error: `No se pudo borrar el archivo del storage: ${storageError.message}` }, { status: 500 });

  const { data: evidencia } = await service.from("evidencia").select("id").eq("storage_path", documento.storage_path).maybeSingle();
  if (evidencia) await service.from("evidencia").delete().eq("id", evidencia.id);

  const { error: updateError } = await service
    .from("documento")
    .update({ storage_path: null, subido_por: null, subido_en: null, estado: "PENDIENTE" })
    .eq("id", entidadId);
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  return Response.json({ ok: true });
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
export async function DELETE() {
  return metodoNoPermitido();
}

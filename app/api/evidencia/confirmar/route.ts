import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rolDeUsuario, puedeGestionarDocumentos } from "@/lib/roles";

// El cliente de service_role no debe correr en edge.
export const runtime = "nodejs";

const MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024;

function metodoNoPermitido() {
  return Response.json({ error: "Método no permitido" }, { status: 405 });
}

/**
 * Brief T7 Tarea 2: segundo camino de carga de documentos (el primero es la ingesta de
 * agentes de Telegram, vía app/api/expediente/ingesta). Este es solo para admin/gerente
 * desde el Conciliador — el archivo ya se subió al storage desde el navegador (la política
 * del bucket lo permite para cualquier authenticated con rol), y acá se confirma esa subida
 * contra el storage de verdad, se crea la fila en `evidencia`, y se vincula a `pago` o
 * `documento`. Ninguna de las tres escrituras es opcional: si cualquiera falla, no queda
 * nada a medias (mismo modo de falla que ya pasó con el bucket `conteos` en Cation — éxito
 * falso con RLS sin bucket real).
 */
export async function POST(request: Request) {
  const supabaseUser = await createClient();
  const { data: userData } = await supabaseUser.auth.getUser();
  const rol = rolDeUsuario(userData.user ?? null);
  if (!puedeGestionarDocumentos(rol)) {
    return Response.json({ error: "Tu rol no puede cargar documentos" }, { status: 403 });
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

  const { entidad, entidadId, storagePath, nombreOriginal, mimeType, tamanoBytes } = body as Record<string, unknown>;

  if (entidad !== "pago" && entidad !== "documento") {
    return Response.json({ error: 'entidad debe ser "pago" o "documento"' }, { status: 400 });
  }
  if (typeof entidadId !== "number" || !Number.isInteger(entidadId) || entidadId <= 0) {
    return Response.json({ error: "entidadId inválido" }, { status: 400 });
  }
  if (typeof storagePath !== "string" || !storagePath.trim()) {
    return Response.json({ error: "storagePath inválido" }, { status: 400 });
  }
  if (typeof nombreOriginal !== "string" || !nombreOriginal.trim()) {
    return Response.json({ error: "nombreOriginal inválido" }, { status: 400 });
  }
  if (typeof mimeType !== "string" || !MIME_PERMITIDOS.includes(mimeType)) {
    return Response.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
  }
  if (typeof tamanoBytes !== "number" || !Number.isFinite(tamanoBytes) || tamanoBytes <= 0 || tamanoBytes > TAMANO_MAXIMO_BYTES) {
    return Response.json({ error: "El archivo supera los 20 MB" }, { status: 400 });
  }

  const service = createServiceClient();
  if (!service) {
    return Response.json({ error: "Hermes no está configurado en el servidor" }, { status: 500 });
  }

  // Confirmar contra el storage real antes de escribir nada en la base — nunca confiar
  // en que el navegador dice que la subida salió bien.
  const { error: storageError } = await service.storage.from("documentos-expediente").createSignedUrl(storagePath, 30);
  if (storageError) {
    return Response.json({ error: `No se pudo confirmar la subida en el storage: ${storageError.message}` }, { status: 502 });
  }

  const actor = userData.user?.email ?? userData.user?.id ?? "desconocido";

  const { data: evidencia, error: evidenciaError } = await service
    .from("evidencia")
    .insert({
      storage_path: storagePath,
      nombre_original: nombreOriginal,
      mime_type: mimeType,
      tamano_bytes: Math.round(tamanoBytes),
      subido_por: actor,
    })
    .select()
    .single();

  if (evidenciaError || !evidencia) {
    return Response.json({ error: evidenciaError?.message ?? "No se pudo registrar el archivo" }, { status: 500 });
  }

  const vinculacion =
    entidad === "pago"
      ? await service.from("pago").update({ evidencia_id: evidencia.id }).eq("id", entidadId)
      : await service
          .from("documento")
          .update({ storage_path: storagePath, subido_por: actor, subido_en: new Date().toISOString(), estado: "SUBIDO" })
          .eq("id", entidadId);

  if (vinculacion.error) {
    // No dejar una fila de evidencia huérfana, apuntando a nada.
    await service.from("evidencia").delete().eq("id", evidencia.id);
    return Response.json({ error: `No se pudo asociar el archivo: ${vinculacion.error.message}` }, { status: 500 });
  }

  return Response.json({ ok: true, evidenciaId: evidencia.id });
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

import { autenticarAgente, metodoNoPermitido } from "@/lib/api/agente";

// El cliente de service_role no debe correr en edge.
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = autenticarAgente(request);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "id debe ser un entero positivo" }, { status: 400 });
  }

  const [
    { data: partida, error: errPartida },
    { data: hitos, error: errHitos },
    { data: documentos, error: errDocumentos },
    { data: frente, error: errFrente },
  ] = await Promise.all([
    supabase.from("partida_abierta").select("*").eq("id", id).maybeSingle(),
    supabase.from("hito").select("*").eq("partida_abierta_id", id).order("orden"),
    supabase.from("documento").select("*, hito!inner(partida_abierta_id)").eq("hito.partida_abierta_id", id),
    supabase.from("v_frente_partida").select("*").eq("partida_id", id).maybeSingle(),
  ]);

  if (errPartida) {
    return Response.json({ error: errPartida.message }, { status: 400 });
  }
  if (!partida) {
    return Response.json({ error: "Partida no encontrada" }, { status: 404 });
  }
  if (errHitos) {
    return Response.json({ error: errHitos.message }, { status: 400 });
  }
  if (errDocumentos) {
    return Response.json({ error: errDocumentos.message }, { status: 400 });
  }
  if (errFrente) {
    return Response.json({ error: errFrente.message }, { status: 400 });
  }

  // El embed "hito" es un artefacto del filtro por partida_abierta_id vía
  // join; no forma parte de la forma final del documento y se descarta acá.
  const documentosPorHito = new Map<number, Record<string, unknown>[]>();
  for (const doc of (documentos ?? []) as Record<string, unknown>[]) {
    const { hito: _hito, ...resto } = doc;
    const hitoId = resto.hito_id as number;
    const lista = documentosPorHito.get(hitoId) ?? [];
    lista.push(resto);
    documentosPorHito.set(hitoId, lista);
  }

  const hitosConDocumentos = (hitos ?? []).map((h) => ({
    ...h,
    documentos: documentosPorHito.get(h.id as number) ?? [],
  }));

  return Response.json({ ok: true, partida, frente: frente ?? null, hitos: hitosConDocumentos });
}

export async function POST() {
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

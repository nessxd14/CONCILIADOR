import { autenticarAgente, esObjetoPlano, esStringNoVacio, metodoNoPermitido } from "@/lib/api/agente";

// El cliente de service_role no debe correr en edge.
export const runtime = "nodejs";

interface Candidato {
  partida_id: number;
  documento_interno: string;
  cliente: string;
  categoria: string;
  pedido_id: number | null;
  coincidencia: string;
  hito_id: number;
  hito: string;
  documento_id: number;
  etiqueta: string;
  tipo: "HABILITANTE" | "ANEXO";
  estado: string;
}

export async function POST(request: Request) {
  const auth = autenticarAgente(request);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON válido" }, { status: 400 });
  }

  if (!esObjetoPlano(body)) {
    return Response.json({ error: "El cuerpo debe ser un objeto JSON" }, { status: 400 });
  }

  const { etapa, referencia } = body;

  if (!esStringNoVacio(etapa)) {
    return Response.json({ error: "etapa es obligatoria" }, { status: 400 });
  }
  if (!esStringNoVacio(referencia)) {
    return Response.json({ error: "referencia es obligatoria" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("resolver_documento", {
    p_etapa: etapa,
    p_referencia: referencia,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  const candidatos = (data ?? []) as Candidato[];
  const partidasDistintas = new Set(candidatos.map((c) => c.partida_id)).size;
  const habilitantes = candidatos.filter((c) => c.tipo === "HABILITANTE");
  const inequivoco = partidasDistintas === 1 && habilitantes.length === 1;

  return Response.json({ ok: true, candidatos, inequivoco });
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

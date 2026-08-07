import {
  autenticarAgente,
  esConfianzaValida,
  esEnteroPositivo,
  esObjetoPlano,
  esStringNoVacio,
  metodoNoPermitido,
} from "@/lib/api/agente";

// El cliente de service_role no debe correr en edge.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = autenticarAgente(request);
  if (!auth.ok) return auth.response;
  const { agente, supabase } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON válido" }, { status: 400 });
  }

  if (!esObjetoPlano(body)) {
    return Response.json({ error: "El cuerpo debe ser un objeto JSON" }, { status: 400 });
  }

  const {
    modo,
    storage_path: storagePath,
    idempotencia_clave: idempotenciaClave,
    confianza,
    extraccion,
    documento_id: documentoId,
    partida_sugerida_id: partidaSugeridaId,
    documento_sugerido_id: documentoSugeridoId,
  } = body;

  if (modo !== "dirigido" && modo !== "ciego") {
    return Response.json({ error: 'modo debe ser "dirigido" o "ciego"' }, { status: 400 });
  }
  if (!esStringNoVacio(storagePath)) {
    return Response.json({ error: "storage_path es obligatorio" }, { status: 400 });
  }
  if (!esStringNoVacio(idempotenciaClave)) {
    return Response.json({ error: "idempotencia_clave es obligatorio" }, { status: 400 });
  }
  if (modo === "dirigido" && !esEnteroPositivo(documentoId)) {
    return Response.json(
      { error: "documento_id es obligatorio y debe ser un entero positivo en modo dirigido" },
      { status: 400 }
    );
  }
  if (confianza !== undefined && confianza !== null && !esConfianzaValida(confianza)) {
    return Response.json({ error: "confianza debe ser un número entre 0 y 1" }, { status: 400 });
  }
  if (extraccion !== undefined && extraccion !== null && !esObjetoPlano(extraccion)) {
    return Response.json({ error: "extraccion debe ser un objeto" }, { status: 400 });
  }

  const confianzaValor = confianza ?? null;
  const extraccionValor = extraccion ?? null;

  if (modo === "dirigido") {
    const { error } = await supabase.rpc("ingesta_dirigida", {
      p_documento_id: documentoId,
      p_storage_path: storagePath,
      p_agente: agente,
      p_extraccion: extraccionValor,
      p_confianza: confianzaValor,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ ok: true, modo: "dirigido", documento_id: documentoId, estado: "SUBIDO" });
  }

  const { data, error } = await supabase.rpc("ingesta_ciega", {
    p_agente: agente,
    p_storage_path: storagePath,
    p_idempotencia_clave: idempotenciaClave,
    p_extraccion: extraccionValor,
    p_confianza: confianzaValor,
    p_partida_sugerida_id: partidaSugeridaId ?? null,
    p_documento_sugerido_id: documentoSugeridoId ?? null,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ ok: true, modo: "ciego", ingesta_id: data, estado: "PENDIENTE" });
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

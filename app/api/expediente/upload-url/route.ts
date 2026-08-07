import { autenticarAgente, esObjetoPlano, metodoNoPermitido } from "@/lib/api/agente";

// El cliente de service_role no debe correr en edge.
export const runtime = "nodejs";

const EXTENSIONES_PERMITIDAS = ["jpg", "jpeg", "png", "webp", "pdf"];

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

  const { extension } = body;

  if (typeof extension !== "string" || !EXTENSIONES_PERMITIDAS.includes(extension.toLowerCase())) {
    return Response.json(
      { error: `extension debe ser una de: ${EXTENSIONES_PERMITIDAS.join(", ")}` },
      { status: 400 }
    );
  }

  // El servidor genera la ruta, no el agente: si pudiera elegirla, podría
  // pisar el archivo de otro documento con solo adivinar el nombre. Cae bajo
  // ingesta/YYYY-MM-DD/ a propósito — todo lo que entra por acá es modo
  // ciego hasta que /ingesta lo asocie, y la fecha hace trivial auditar qué
  // subió cada agente y cuándo con un listado del bucket.
  const ruta = `ingesta/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension.toLowerCase()}`;

  const { data, error } = await supabase.storage.from("documentos-expediente").createSignedUploadUrl(ruta);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, storage_path: data.path, signed_url: data.signedUrl, token: data.token });
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

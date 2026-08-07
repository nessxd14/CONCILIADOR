import { autenticarAgente, metodoNoPermitido } from "@/lib/api/agente";

// El cliente de service_role no debe correr en edge.
export const runtime = "nodejs";

const MOTIVOS_VALIDOS = ["VENCIDA", "ENTREGADO_SIN_FACTURAR", "FRENADA"];

export async function GET(request: Request) {
  const auth = autenticarAgente(request);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const motivo = searchParams.get("motivo");
  const clienteIdRaw = searchParams.get("cliente_id");

  if (motivo !== null && !MOTIVOS_VALIDOS.includes(motivo)) {
    return Response.json(
      { error: `motivo debe ser uno de: ${MOTIVOS_VALIDOS.join(", ")}` },
      { status: 400 }
    );
  }

  let clienteId: number | null = null;
  if (clienteIdRaw !== null) {
    clienteId = Number(clienteIdRaw);
    if (!Number.isInteger(clienteId) || clienteId <= 0) {
      return Response.json({ error: "cliente_id debe ser un entero positivo" }, { status: 400 });
    }
  }

  let clientesQuery = supabase.from("v_cobros_bloqueados").select("*");
  if (clienteId !== null) clientesQuery = clientesQuery.eq("cliente_id", clienteId);

  let partidasQuery = supabase.from("v_partidas_frenadas").select("*");
  if (clienteId !== null) partidasQuery = partidasQuery.eq("cliente_id", clienteId);
  if (motivo !== null) partidasQuery = partidasQuery.eq("motivo", motivo);

  const [{ data: clientes, error: errClientes }, { data: partidas, error: errPartidas }] = await Promise.all([
    clientesQuery,
    partidasQuery,
  ]);

  if (errClientes) {
    return Response.json({ error: errClientes.message }, { status: 400 });
  }
  if (errPartidas) {
    return Response.json({ error: errPartidas.message }, { status: 400 });
  }

  return Response.json({ ok: true, clientes, partidas });
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

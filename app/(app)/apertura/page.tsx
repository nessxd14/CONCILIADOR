import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rolDeUsuario } from "@/lib/roles";

export default async function AperturaIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (rolDeUsuario(user) !== "admin") {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        Solo el rol <b>admin</b> puede cargar saldos de apertura.
      </div>
    );
  }

  const [{ data: clientes }, { data: aperturas }] = await Promise.all([
    supabase.from("cliente").select("id").order("nombre"),
    supabase.from("movimiento_cuenta").select("cliente_id").eq("tipo", "SALDO_APERTURA"),
  ]);

  const conApertura = new Set((aperturas ?? []).map((r) => r.cliente_id as number));
  const siguiente = (clientes ?? []).find((c) => !conApertura.has(c.id as number));

  if (!siguiente) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <b>Todos los clientes tienen su saldo de apertura cargado.</b>
        <div style={{ marginTop: 8 }}>
          <a href="/clientes" className="btn-link">
            Ir a la lista de clientes →
          </a>
        </div>
      </div>
    );
  }

  redirect(`/apertura/${siguiente.id}`);
}

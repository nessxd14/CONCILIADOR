import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rolDeUsuario } from "@/lib/roles";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const rol = rolDeUsuario(user);

  const [{ count: pendientesImportar }, { count: pedidosAccionables }] = await Promise.all([
    supabase.from("v_clientes_cation_pendientes").select("*", { count: "exact", head: true }),
    supabase
      .from("v_pedidos_cation_pendientes")
      .select("*", { count: "exact", head: true })
      .in("motivo", ["ABRE", "CLIENTE_SIN_CUENTA", "SIN_FICHA_CREDITO"]),
  ]);

  return (
    <div className="shell">
      <Sidebar
        email={user.email ?? ""}
        rol={rol}
        pendientesImportar={pendientesImportar ?? 0}
        pedidosAccionables={pedidosAccionables ?? 0}
      />
      <div className="content">{children}</div>
    </div>
  );
}

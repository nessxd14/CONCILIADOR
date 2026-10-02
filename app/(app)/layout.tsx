import { obtenerSesionHermes } from "@/lib/supabase/session";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccessNotice } from "@/components/AccessNotice";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user, rol },
    error: errorSesion,
  } = await obtenerSesionHermes(supabase);

  if (!user) {
    redirect("/login");
  }


  if (errorSesion || !rol) {
    return <AccessNotice message={errorSesion
      ? "No pudimos validar tu acceso a Hermes. Intenta nuevamente."
      : "Tu cuenta no tiene acceso a Hermes. Solicita la habilitación al administrador."} />;
  }

  const [{ count: pendientesImportar }, { count: pedidosAccionables }] = await Promise.all([
    supabase.from("v_clientes_cation_pendientes").select("*", { count: "exact", head: true }),
    supabase
      .from("v_pedidos_cation_pendientes")
      .select("*", { count: "exact", head: true })
      .in("motivo", ["ABRE", "CLIENTE_SIN_CUENTA", "SIN_FICHA_CREDITO"]),
  ]);

  return (
    <div className="shell"><a className="skip-link" href="#contenido">Ir al contenido</a>
      <Sidebar
        email={user.email ?? ""}
        rol={rol}
        pendientesImportar={pendientesImportar ?? 0}
        pedidosAccionables={pedidosAccionables ?? 0}
      />
      <main id="contenido" className="content">{children}</main>
    </div>
  );
}

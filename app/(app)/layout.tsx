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

  return (
    <div className="shell">
      <Sidebar email={user.email ?? ""} rol={rol} />
      <div className="content">{children}</div>
    </div>
  );
}

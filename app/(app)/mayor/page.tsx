import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesionHermes } from "@/lib/supabase/session";
import { AccessNotice } from "@/components/AccessNotice";
import { MayorCartera } from "@/components/MayorCartera";
import { FiltrosMayor } from "@/components/FiltrosMayor";
import { consultarMayor } from "@/lib/consultar-mayor";
import { hoyLocal } from "@/lib/fechas";
import type { ClienteMayor, FiltroMayor } from "@/lib/mayor-cartera";
import "./mayor.css";

export const dynamic = "force-dynamic";
export default async function MayorPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const { data: { user, rol }, error: errorSesion } = await obtenerSesionHermes(supabase);
  if (!user) redirect('/login');
  if (errorSesion || !rol) return <AccessNotice message="No pudimos validar tu acceso al mayor de cartera." />;
  const params = await searchParams;
  const texto = (key: string) => typeof params[key] === 'string' ? params[key] as string : '';
  const hoy = hoyLocal();
  const filtro: FiltroMayor = { desde: texto('desde') || `${hoy.slice(0, 7)}-01`, hasta: texto('hasta') || hoy,
    clienteId: texto('cliente') ? Number(texto('cliente')) : undefined, categoria: texto('categoria') || undefined };
  let resultado: Awaited<ReturnType<typeof consultarMayor>> | null = null;
  let error: string | null = null;
  let clientes: ClienteMayor[] = [];
  try { resultado = await consultarMayor(supabase, filtro); clientes = resultado.clientes; }
  catch (e) { error = e instanceof Error ? e.message : 'No pudimos consultar el mayor de cartera.'; }
  return <div className="mayor-page"><header className="mayor-heading"><div><span className="eyebrow">Cuentas por cobrar</span><h1>Mayor de cartera</h1><p>Cómo cambia la deuda: cargos, pagos, anticipos, notas de crédito y ajustes.</p></div></header>
    <FiltrosMayor filtro={filtro} clientes={clientes} />
    {error && <section className="glass-panel empty-state" role="alert"><h2>Mayor no disponible</h2><p>{error}</p><p>No se muestran saldos parciales. Revisa el período y vuelve a consultar.</p></section>}
    {resultado && <MayorCartera key={JSON.stringify(filtro)} informe={resultado.informe} consultadoEn={resultado.consultadoEn} />}
  </div>;
}

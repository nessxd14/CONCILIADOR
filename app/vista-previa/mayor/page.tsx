import { notFound } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { MayorCartera } from '@/components/MayorCartera';
import { FiltrosMayor } from '@/components/FiltrosMayor';
import { construirMayor, type FiltroMayor } from '@/lib/mayor-cartera';
import { clientesMayorEjemplo, movimientosMayorEjemplo } from './fixture';
import '@/app/(app)/mayor/mayor.css';

export const dynamic = 'force-dynamic';
export default async function MayorPreview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV !== 'development' || process.env.HERMES_UI_PREVIEW !== '1') notFound();
  const params = await searchParams;
  const texto = (key: string) => typeof params[key] === 'string' ? params[key] as string : '';
  const filtro: FiltroMayor = { desde: texto('desde') || '2026-10-01', hasta: texto('hasta') || '2026-10-19',
    clienteId: texto('cliente') ? Number(texto('cliente')) : undefined, categoria: texto('categoria') || undefined };
  let informe: ReturnType<typeof construirMayor> | null = null, error: string | null = null;
  try { informe = construirMayor(movimientosMayorEjemplo, clientesMayorEjemplo, filtro); }
  catch (e) { error = e instanceof Error ? e.message : 'No pudimos preparar el ejemplo.'; }
  return <div className="preview-layout"><div className="preview-banner">Vista de prueba · datos sintéticos · consulta sin operaciones financieras</div><div className="shell"><Sidebar email="gerencia@ejemplo.local" rol="gerente" preview /><main className="content"><div className="mayor-page"><header className="mayor-heading"><span className="eyebrow">Cuentas por cobrar</span><h1>Mayor de cartera</h1><p>Ejemplo de cómo cada movimiento cambia lo pendiente por cobrar.</p></header><FiltrosMayor filtro={filtro} clientes={clientesMayorEjemplo} action="/vista-previa/mayor" />{error && <section className="glass-panel empty-state" role="alert"><h2>Mayor no disponible</h2><p>{error}</p></section>}{informe && <MayorCartera key={JSON.stringify(filtro)} informe={informe} consultadoEn="2026-10-19T14:00:00Z" preview />}</div></main></div></div>;
}

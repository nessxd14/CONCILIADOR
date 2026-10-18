import { notFound } from 'next/navigation';
import { Incidencias } from '@/components/Incidencias';
import { Sidebar } from '@/components/Sidebar';
import { incidenciasFixture } from './fixture';
export default function Page(){
 if(process.env.NODE_ENV!=='development'||process.env.HERMES_UI_PREVIEW!=='1')notFound();
 return <div className="preview-layout"><div className="preview-banner">Vista de prueba · datos sintéticos · acciones de escritura deshabilitadas</div><div className="shell"><Sidebar email="gerencia@ejemplo.local" rol="gerente" preview/><main className="content"><Incidencias initialPedidoId={21} fixture={incidenciasFixture}/></main></div></div>;
}

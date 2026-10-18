import { notFound } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { DetalleCobrosPartida } from '@/components/DetalleCobrosPartida'
import { detalleEjemplo } from '@/components/__tests__/detalleCobro.fixture'

export const dynamic = 'force-dynamic'
export default function CobrosPreview() {
  if (process.env.NODE_ENV !== 'development' || process.env.HERMES_UI_PREVIEW !== '1') notFound()
  return <div className="preview-layout">
    <div className="preview-banner">Vista de prueba · datos sintéticos · acciones de escritura deshabilitadas</div>
    <div className="shell"><Sidebar email="gerencia@ejemplo.local" rol="gerente" preview /><main className="content">
      <h1>Partidas y responsables de cobros</h1>
      <p>Pedido de ejemplo PED-2026-00701 · expediente compartido con Seller.</p>
      <DetalleCobrosPartida partidaId={1701} fixture={{ ...detalleEjemplo, partida_enfocada: 1701 }} />
    </main></div>
  </div>
}

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DetalleCobroContenido } from '@/components/DetalleCobroContenido'
import { leerDetalleCobro } from '@/lib/detalle-cobro'
import { detalleEjemplo } from './detalleCobro.fixture'

describe('detalle compartido de cobros en Conciliador', () => {
  it('presenta las partidas y los responsables del mismo contrato de Seller', () => {
    const html = renderToStaticMarkup(<DetalleCobroContenido data={leerDetalleCobro(detalleEjemplo)} />)
    expect(html).toContain('2 de 2 partidas saldadas')
    expect(html).toContain('PA-2026-00701-E2')
    expect(html).toContain('María López')
    expect(html).toContain('Ana Rojas')
    expect(html).toContain('Luis Herrera')
    expect(html).toContain('Responsable del turno')
    expect(html).toContain('Partida saldada')
  })
  it('conserva como desconocida la fecha histórica y distingue el rol actual', () => {
    const data = structuredClone(detalleEjemplo)
    data.partidas[0].saldada_en = null; data.partidas[0].fecha_saldado_fuente = 'NO_REGISTRADA'
    data.pagos[0].cobrado_por = { ...data.pagos[0].cobrado_por, rol: null, rol_actual: 'gerente', historico: true }
    const html = renderToStaticMarkup(<DetalleCobroContenido data={data} />)
    expect(html).toContain('Fecha de saldado no registrada')
    expect(html).toContain('Rol actual: Gerente · rol histórico no registrado')
  })
  it('un pedido cancelado mantiene visible la resolución pendiente aunque sus partidas estén pagadas', () => {
    const data = structuredClone(detalleEjemplo)
    data.pedido!.estado = 'CANCELADO'
    const html = renderToStaticMarkup(<DetalleCobroContenido data={data} />)
    expect(html).toContain('Pedido cancelado con partidas vigentes')
    expect(html).not.toContain('cobro-traza-resumen saldado')
  })
  it('mantiene la revisión cuando las partidas pagadas no cubren el importe del pedido', () => {
    const data = structuredClone(detalleEjemplo)
    data.pedido!.total = 2000
    const html = renderToStaticMarkup(<DetalleCobroContenido data={data} />)
    expect(html).toContain('El total de las partidas vigentes no coincide')
    expect(html).not.toContain('cobro-traza-resumen saldado')
  })
})

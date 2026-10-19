import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { MayorCartera } from '../MayorCartera';
import { construirMayor } from '@/lib/mayor-cartera';
import { clientesMayorEjemplo as clientes, movimientosMayorEjemplo as movimientos } from '@/app/vista-previa/mayor/fixture';
vi.mock('next/link', () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
const informe = construirMayor(movimientos, clientes, { desde: '2026-10-01', hasta: '2026-10-19' });
let root: Root | undefined;
afterEach(async () => { if (root) await act(() => root!.unmount()); root = undefined; document.body.innerHTML = ''; vi.restoreAllMocks(); });
async function mount(source = informe) {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(() => root!.render(<MayorCartera informe={source} consultadoEn="2026-10-19T14:00:00Z" />));
  return host;
}
describe('mayor de cartera', () => {
  it('expone deuda y crédito separados, sin presentar abonos como cobros nuevos', () => {
    const html = renderToStaticMarkup(<MayorCartera informe={informe} consultadoEn="2026-10-19T14:00:00Z" />);
    expect(html).toContain('Saldo final por cobrar');
    expect(html).toContain('Bs 9,500.00'); expect(html).toContain('Bs 500.00');
    expect(html).toContain('regularizaciones'); expect(html).toContain('por verificar todavía no cambian');
    expect(html).toContain('Institución Central');
  });
  it('abre el responsable, motivo y enlaces al cliente/expediente', async () => {
    const host = await mount();
    await act(() => (host.querySelector('[aria-label="Detalle del movimiento 7"]') as HTMLButtonElement).click());
    expect(host.textContent).toContain('Operadora de ejemplo');
    expect(host.textContent).toContain('cubiertos por el anticipo');
    expect(host.querySelector('a[href="/clientes/3/expediente/107"]')).not.toBeNull();
  });
  it('filtra la lista manteniendo el saldo total del período', async () => {
    const host = await mount();
    const select = host.querySelector('select')!;
    await act(() => { select.value = 'PAGO'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(host.textContent).toContain('3 de 7 movimientos');
    expect(host.querySelector('.mayor-summary')?.textContent).toContain('Bs 9,500.00');
    expect(host.textContent).toContain('los saldos conservan todos los movimientos');
  });
  it('pagina sin recortar los importes del resumen', async () => {
    const source = construirMayor(Array.from({ length: 65 }, (_, i) => ({ ...movimientos[0], id: i + 1, fecha_efectiva: '2026-10-01', monto: '1.00' })), clientes, informe.filtro);
    const host = await mount(source);
    expect(host.textContent).toContain('1–50 de 65');
    await act(() => Array.from(host.querySelectorAll('button')).find(b => b.textContent === 'Siguiente')!.click());
    expect(host.textContent).toContain('51–65 de 65');
    expect(host.querySelector('.mayor-summary')?.textContent).toContain('Bs 65.00');
  });
  it('conserva el saldo previo cuando el período no tiene actividad', () => {
    const empty = construirMayor(movimientos, clientes, { desde: '2026-10-20', hasta: '2026-10-21' });
    const html = renderToStaticMarkup(<MayorCartera informe={empty} consultadoEn="2026-10-19T14:00:00Z" />);
    expect(html).toContain('Sin movimientos en este período');
    expect(html).toContain('Bs 9,500.00'); expect(html).toContain('deuda previa');
  });
});

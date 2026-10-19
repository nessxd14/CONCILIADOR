import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { construirMayor } from '@/lib/mayor-cartera';
const mocks = vi.hoisted(() => ({ session: vi.fn(), consultar: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(async () => ({ sessionClient: true })) }));
vi.mock('@/lib/supabase/session', () => ({ obtenerSesionHermes: mocks.session }));
vi.mock('@/lib/consultar-mayor', () => ({ consultarMayor: mocks.consultar }));
vi.mock('next/navigation', () => ({ redirect: vi.fn(() => { throw new Error('REDIRECT_LOGIN'); }), useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
import Page from '../page';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ data: { user: { id: 'user' }, rol: 'gerente' }, error: null });
  mocks.consultar.mockResolvedValue({ informe: construirMayor([], [], { desde: '2026-10-01', hasta: '2026-10-19' }), clientes: [], consultadoEn: '2026-10-19T14:00:00Z' });
});
describe('acceso al mayor de cartera', () => {
  it('no consulta datos sin una sesión autenticada', async () => {
    mocks.session.mockResolvedValue({ data: { user: null, rol: null }, error: null });
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('REDIRECT_LOGIN');
    expect(mocks.consultar).not.toHaveBeenCalled();
  });
  it('no consulta datos cuando no se puede validar el acceso a Hermes', async () => {
    mocks.session.mockResolvedValue({ data: { user: { id: 'user' }, rol: null }, error: { message: 'offline' } });
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('No pudimos validar tu acceso');
    expect(mocks.consultar).not.toHaveBeenCalled();
  });
  it('consulta con el cliente de sesión y los filtros explícitos', async () => {
    await Page({ searchParams: Promise.resolve({ desde: '2026-10-01', hasta: '2026-10-19', cliente: '12', categoria: 'MAYORISTA' }) });
    expect(mocks.consultar).toHaveBeenCalledWith({ sessionClient: true }, { desde: '2026-10-01', hasta: '2026-10-19', clienteId: 12, categoria: 'MAYORISTA' });
  });
  it('presenta una consulta fallida como no disponible, sin saldo cero ficticio', async () => {
    mocks.consultar.mockRejectedValue(new Error('No pudimos leer el historial completo.'));
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('Mayor no disponible');
    expect(html).not.toContain('Saldo final por cobrar');
    expect(html).not.toContain('Bs 0.00');
  });
});

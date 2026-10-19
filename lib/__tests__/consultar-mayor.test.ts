import { describe, expect, it, vi } from 'vitest';
import { leerMayorCompleto } from '../consultar-mayor';

describe('lectura completa del mayor con permisos de la sesión', () => {
  it('continúa si el límite de la API es menor de 1000', async () => {
    const source = Array.from({ length: 1205 }, (_, id) => ({ id }));
    const fetchPage = vi.fn(async (from: number, to: number) => ({ data: source.slice(from, Math.min(from + 400, to + 1)), count: source.length, error: null }));
    const result = await leerMayorCompleto(fetchPage);
    expect(result).toHaveLength(1205);
    expect(fetchPage.mock.calls.map(call => call[0])).toEqual([0, 400, 800, 1200]);
  });
  it('distingue un mayor vacío de una consulta fallida', async () => {
    expect(await leerMayorCompleto(async () => ({ data: [], count: 0, error: null }))).toEqual([]);
    await expect(leerMayorCompleto(async () => ({ data: null, count: null, error: { message: 'No autorizado' } }))).rejects.toThrow('no están disponibles');
  });
  it('rechaza una respuesta truncada y no devuelve el primer subtotal', async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({ data: [{ id: 1 }], count: 2, error: null })
      .mockResolvedValueOnce({ data: [], count: 2, error: null });
    await expect(leerMayorCompleto(fetchPage)).rejects.toThrow('incompleto');
  });
  it('rechaza un cambio de conjunto durante la paginación', async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({ data: [{ id: 1 }], count: 2, error: null })
      .mockResolvedValueOnce({ data: [{ id: 2 }], count: 3, error: null });
    await expect(leerMayorCompleto(fetchPage)).rejects.toThrow('cambió');
  });
  it('exige un conteo exacto y limita la lectura antes de presentar cifras', async () => {
    await expect(leerMayorCompleto(async () => ({ data: [{ id: 1 }], count: null, error: null }))).rejects.toThrow('completo');
    await expect(leerMayorCompleto(async () => ({ data: [], count: 100001, error: null }))).rejects.toThrow('tamaño');
  });
});

import { describe, expect, it } from 'vitest';
import { construirMayor, csvMayor, validarFiltroMayor } from '../mayor-cartera';
import { clientesMayorEjemplo as clientes, movimientosMayorEjemplo as movimientos } from '@/app/vista-previa/mayor/fixture';

const filtro = { desde: '2026-10-01', hasta: '2026-10-19' };
describe('mayor global de cuentas por cobrar', () => {
  it('reconcilia la deuda, el crédito y el saldo neto sin compensar clientes diferentes', () => {
    const informe = construirMayor(movimientos, clientes, filtro);
    expect(informe.resumen).toEqual({ inicial: '20000.00', final: '9500.00', aumento_deuda: '6500.00', reduccion_deuda: '17000.00',
      cargos: '8500.00', abonos: '17500.00', favor_inicial: '2000.00', favor_final: '500.00',
      neto_inicial: '18000.00', neto_final: '9000.00', clientes_con_deuda: 1 });
    expect(informe.filas.map(f => f.por_cobrar_despues)).toEqual(['24500.00', '18500.00', '10500.00', '12000.00', '10500.00', '9000.00', '9500.00']);
  });
  it('solo aumenta la deuda por la parte del cargo que no cubre el anticipo', () => {
    const fila = construirMayor(movimientos, clientes, filtro).filas.find(f => f.id === 7)!;
    expect(fila.cargo).toBe('3500.00');
    expect(fila.variacion_por_cobrar).toBe('1500.00');
    expect(fila.saldo_cliente_antes).toBe('-2000.00');
    expect(fila.favor_despues).toBe('0.00');
  });
  it('conserva los movimientos de un cliente que quedó en cero', () => {
    const informe = construirMayor(movimientos, clientes, { ...filtro, clienteId: 2 });
    expect(informe.resumen.inicial).toBe('8000.00');
    expect(informe.resumen.final).toBe('0.00');
    expect(informe.filas).toHaveLength(1);
    expect(informe.filas[0].abono).toBe('8000.00');
  });
  it('incluye el saldo anterior aunque no haya movimientos en el período', () => {
    const informe = construirMayor(movimientos, clientes, { desde: '2026-10-20', hasta: '2026-10-21' });
    expect(informe.filas).toHaveLength(0);
    expect(informe.resumen.inicial).toBe('9500.00');
    expect(informe.resumen.final).toBe('9500.00');
    expect(informe.resumen.favor_inicial).toBe('500.00');
    expect(informe.resumen.aumento_deuda).toBe('0.00');
  });
  it('incluye ajustes y regularizaciones contables, y no incorpora caja/retail', () => {
    const nuevos = [...movimientos, { ...movimientos[0], id: 50, tipo: 'PAGO' as const, monto: '-100.00',
      fecha_efectiva: '2026-10-08', motivo: 'Regularización histórica' },
    { ...movimientos[0], id: 51, cliente_id: 4, monto: '999999.00', fecha_efectiva: '2026-10-08' }];
    const informe = construirMayor(nuevos, [...clientes, { id: 4, nombre: 'Retail', categoria: 'RETAIL' }], filtro);
    expect(informe.resumen.final).toBe('9400.00');
    expect(informe.filas.some(m => m.motivo === 'Regularización histórica')).toBe(true);
    expect(informe.filas.some(m => m.cliente_id === 4)).toBe(false);
  });
  it('ordena por fecha efectiva y luego ID, e ignora fechas posteriores al cierre', () => {
    const source = [
      { ...movimientos[0], id: 12, fecha_efectiva: '2026-10-02', monto: '-20.00', tipo: 'PAGO' as const },
      { ...movimientos[0], id: 11, fecha_efectiva: '2026-10-02', monto: '100.00' },
      { ...movimientos[0], id: 13, fecha_efectiva: '2026-10-20', monto: '900.00' },
    ];
    const informe = construirMayor(source, clientes, filtro);
    expect(informe.filas.map(m => m.id)).toEqual([11, 12]);
    expect(informe.resumen.final).toBe('80.00');
  });
  it('calcula con centavos exactos y exporta todos los movimientos, no solo una página', () => {
    const source = Array.from({ length: 1205 }, (_, i) => ({ ...movimientos[0], id: i + 1, fecha_efectiva: '2026-10-01', monto: '0.01' }));
    const informe = construirMayor(source, clientes, filtro);
    expect(informe.resumen.final).toBe('12.05');
    expect(csvMayor(informe.filas).split('\r\n')).toHaveLength(1206);
  });
  it('protege textos de fórmulas CSV y escapa separadores y comillas', () => {
    const informe = construirMayor([{ ...movimientos[0], fecha_efectiva: '2026-10-01', cliente: '=2+2', referencia: 'Ref;"A"', creado_por: '@usuario' }], clientes, filtro);
    const csv = csvMayor(informe.filas);
    expect(csv).toContain('"\'=2+2"');
    expect(csv).toContain('"Ref;""A"""');
    expect(csv).toContain('"\'@usuario"');
  });
  it('rechaza datos duplicados o importes inválidos, en lugar de mostrar un saldo parcial', () => {
    expect(() => construirMayor([movimientos[0], movimientos[0]], clientes, filtro)).toThrow('duplicados');
    for (const monto of ['', 'NaN', 'Infinity', '0.001'])
      expect(() => construirMayor([{ ...movimientos[0], monto }], clientes, filtro)).toThrow('inválido');
  });
  it('valida fechas reales, categorías y pertenencia del cliente', () => {
    for (const desde of ['2026-02-30', '2026-11-01', 'ayer'])
      expect(() => validarFiltroMayor({ ...filtro, desde })).toThrow('período');
    expect(() => construirMayor(movimientos, clientes, { ...filtro, clienteId: 2, categoria: 'MAYORISTA' })).toThrow('categoría');
    expect(() => construirMayor(movimientos, clientes, { ...filtro, clienteId: 999 })).toThrow('disponible');
    expect(() => validarFiltroMayor({ ...filtro, categoria: 'RETAIL' })).toThrow('categoría');
  });
});

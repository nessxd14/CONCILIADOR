import { describe, expect, it } from "vitest";
import { filtrarClientes, ordenarClientes, contarPorSituacion, type SituacionFiltro } from "../clientes-filtros";
import type { VClienteCartera } from "../types";

function cliente(overrides: Partial<VClienteCartera> & { cliente_id: number; cliente: string }): VClienteCartera {
  return {
    nit: null,
    categoria: "MAYORISTA",
    activo: true,
    sector: "PRIVADO",
    limite_credito: null,
    plazo_dias: 30,
    inicio_computo: "ENTREGA",
    saldo_confirmado: "0",
    monto_en_revision: "0",
    saldo_provisional: "0",
    situacion: "AL_DIA",
    partidas_abiertas: 0,
    pendiente_partidas: "0",
    saldo_sin_partida: "0",
    partidas_vencidas: 0,
    monto_vencido: "0",
    dias_vencido_max: null,
    proximo_vencimiento: null,
    partidas_sin_fecha: 0,
    monto_sin_fecha: "0",
    pagos_por_verificar: 0,
    ultimo_pago_en: null,
    ultimo_movimiento_en: null,
    ...overrides,
  };
}

describe("filtrarClientes", () => {
  const deudor = cliente({ cliente_id: 1, cliente: "Deudor SA", saldo_confirmado: "500" });
  const alDia = cliente({ cliente_id: 2, cliente: "Al Dia SA", saldo_confirmado: "0" });
  const favor = cliente({ cliente_id: 3, cliente: "Favor SA", saldo_confirmado: "-200" });
  const vencida = cliente({ cliente_id: 4, cliente: "Vencida SA", partidas_vencidas: 1 });
  const porVerificar = cliente({ cliente_id: 5, cliente: "Por Verificar SA", pagos_por_verificar: 2 });
  const creditoSinAplicar = cliente({
    cliente_id: 6,
    cliente: "Credito Sin Aplicar SA",
    partidas_abiertas: 1,
    saldo_sin_partida: "-50",
  });
  const deudaSinPartida = cliente({ cliente_id: 7, cliente: "Deuda Sin Partida SA", saldo_sin_partida: "80" });
  const plazoSinIniciar = cliente({ cliente_id: 8, cliente: "Plazo Sin Iniciar SA", partidas_sin_fecha: 1 });
  const inactivo = cliente({ cliente_id: 9, cliente: "Inactivo SA", activo: false, saldo_confirmado: "900" });

  const todos = [deudor, alDia, favor, vencida, porVerificar, creditoSinAplicar, deudaSinPartida, plazoSinIniciar, inactivo];

  it.each<[SituacionFiltro, VClienteCartera[]]>([
    ["todos", [deudor, alDia, favor, vencida, porVerificar, creditoSinAplicar, deudaSinPartida, plazoSinIniciar]],
    ["deudores", [deudor]],
    // al_dia solo exige saldo_confirmado === 0: los demás fixtures lo cumplen
    // también de forma incidental (su saldo no es parte de lo que prueban),
    // y es correcto que aparezcan — los filtros son independientes entre sí.
    ["al_dia", [alDia, vencida, porVerificar, creditoSinAplicar, deudaSinPartida, plazoSinIniciar]],
    ["saldo_favor", [favor]],
    ["vencidas", [vencida]],
    ["pagos_por_verificar", [porVerificar]],
    ["credito_sin_aplicar", [creditoSinAplicar]],
    ["deuda_sin_partida", [deudaSinPartida]],
    ["plazo_sin_iniciar", [plazoSinIniciar]],
    ["inactivos", [inactivo]],
  ])("filtra por %s", (situacion, esperado) => {
    expect(filtrarClientes(todos, situacion, "")).toEqual(esperado);
  });

  it("oculta clientes inactivos en todas las opciones salvo Inactivos", () => {
    for (const situacion of ["todos", "deudores", "al_dia", "saldo_favor"] as SituacionFiltro[]) {
      expect(filtrarClientes(todos, situacion, "")).not.toContainEqual(inactivo);
    }
  });

  it("busca sin distinguir mayúsculas ni acentos", () => {
    const jose = cliente({ cliente_id: 10, cliente: "José Pérez" });
    expect(filtrarClientes([jose], "todos", "jose perez")).toEqual([jose]);
    expect(filtrarClientes([jose], "todos", "JOSÉ")).toEqual([jose]);
    expect(filtrarClientes([jose], "todos", "pe")).toEqual([jose]);
  });

  it("combina situación y búsqueda", () => {
    expect(filtrarClientes(todos, "deudores", "deudor")).toEqual([deudor]);
    expect(filtrarClientes(todos, "deudores", "favor")).toEqual([]);
  });
});

describe("contarPorSituacion", () => {
  it("cuenta cada opción independientemente de la búsqueda", () => {
    const rows = [
      cliente({ cliente_id: 1, cliente: "A", saldo_confirmado: "100" }),
      cliente({ cliente_id: 2, cliente: "B", saldo_confirmado: "100" }),
      cliente({ cliente_id: 3, cliente: "C", activo: false }),
    ];
    const conteos = contarPorSituacion(rows);
    expect(conteos.todos).toBe(2);
    expect(conteos.deudores).toBe(2);
    expect(conteos.inactivos).toBe(1);
    expect(conteos.al_dia).toBe(0);
  });
});

describe("ordenarClientes", () => {
  it("ordena por nombre A-Z con localeCompare es, insensible a mayúsculas", () => {
    const a = cliente({ cliente_id: 1, cliente: "ácaro" });
    const b = cliente({ cliente_id: 2, cliente: "Banana" });
    const c = cliente({ cliente_id: 3, cliente: "banana" });
    expect(ordenarClientes([c, a, b], "nombre_asc").map((x) => x.cliente_id)).toEqual([1, 2, 3]);
    expect(ordenarClientes([c, a, b], "nombre_desc").map((x) => x.cliente_id)).toEqual([2, 3, 1]);
  });

  it("desempata por cliente_id cuando el nombre es igual, de forma estable", () => {
    const a = cliente({ cliente_id: 5, cliente: "Mismo Nombre" });
    const b = cliente({ cliente_id: 2, cliente: "Mismo Nombre" });
    expect(ordenarClientes([a, b], "nombre_asc").map((x) => x.cliente_id)).toEqual([2, 5]);
  });

  it("compara el saldo como Decimal: \"1000.00\" queda por encima de \"999.99\"", () => {
    const mil = cliente({ cliente_id: 1, cliente: "Mil", saldo_confirmado: "1000.00" });
    const casiMil = cliente({ cliente_id: 2, cliente: "Casi mil", saldo_confirmado: "999.99" });
    expect(ordenarClientes([casiMil, mil], "saldo_desc").map((x) => x.cliente_id)).toEqual([1, 2]);
    expect(ordenarClientes([mil, casiMil], "saldo_asc").map((x) => x.cliente_id)).toEqual([2, 1]);
  });

  it("ordena vencido mayor a menor", () => {
    const bajo = cliente({ cliente_id: 1, cliente: "Bajo", monto_vencido: "10" });
    const alto = cliente({ cliente_id: 2, cliente: "Alto", monto_vencido: "1000.00" });
    const medio = cliente({ cliente_id: 3, cliente: "Medio", monto_vencido: "999.99" });
    expect(ordenarClientes([bajo, alto, medio], "vencido_desc").map((x) => x.cliente_id)).toEqual([2, 3, 1]);
  });

  it("ordena próximo vencimiento ascendente con nulos al final", () => {
    const sinFecha = cliente({ cliente_id: 1, cliente: "Sin fecha", proximo_vencimiento: null });
    const lejos = cliente({ cliente_id: 2, cliente: "Lejos", proximo_vencimiento: "2026-12-01" });
    const cerca = cliente({ cliente_id: 3, cliente: "Cerca", proximo_vencimiento: "2026-10-15" });
    expect(
      ordenarClientes([sinFecha, lejos, cerca], "proximo_vencimiento_asc").map((x) => x.cliente_id)
    ).toEqual([3, 2, 1]);
  });

  it("ordena último movimiento descendente con nulos al final", () => {
    const sinMov = cliente({ cliente_id: 1, cliente: "Sin mov", ultimo_movimiento_en: null });
    const viejo = cliente({ cliente_id: 2, cliente: "Viejo", ultimo_movimiento_en: "2026-09-01T10:00:00Z" });
    const reciente = cliente({ cliente_id: 3, cliente: "Reciente", ultimo_movimiento_en: "2026-10-08T10:00:00Z" });
    expect(
      ordenarClientes([sinMov, viejo, reciente], "ultimo_movimiento_desc").map((x) => x.cliente_id)
    ).toEqual([3, 2, 1]);
  });

  it("ordena último pago descendente con nulos al final", () => {
    const sinPago = cliente({ cliente_id: 1, cliente: "Sin pago", ultimo_pago_en: null });
    const viejo = cliente({ cliente_id: 2, cliente: "Viejo", ultimo_pago_en: "2026-09-01T10:00:00Z" });
    const reciente = cliente({ cliente_id: 3, cliente: "Reciente", ultimo_pago_en: "2026-10-08T10:00:00Z" });
    expect(ordenarClientes([sinPago, viejo, reciente], "ultimo_pago_desc").map((x) => x.cliente_id)).toEqual([
      3, 2, 1,
    ]);
  });

  it("desempata por nombre y luego cliente_id cuando el criterio numérico es igual", () => {
    const b = cliente({ cliente_id: 2, cliente: "Beta", saldo_confirmado: "100" });
    const a1 = cliente({ cliente_id: 3, cliente: "Alfa", saldo_confirmado: "100" });
    const a2 = cliente({ cliente_id: 1, cliente: "Alfa", saldo_confirmado: "100" });
    expect(ordenarClientes([b, a1, a2], "saldo_desc").map((x) => x.cliente_id)).toEqual([1, 3, 2]);
  });
});

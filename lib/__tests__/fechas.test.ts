import { afterEach, describe, expect, it, vi } from "vitest";
import { calcularRangoActividad, hoyLocal } from "../fechas";

describe("hoyLocal", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("no se adelanta un día después de las 20:00 hora local", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T23:30:00Z")); // 19:30 en Trinidad
    expect(hoyLocal()).toBe("2026-08-08");
  });

  it("sigue siendo el día anterior pasada la medianoche UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T01:30:00Z")); // 21:30 del 8 en Trinidad
    expect(hoyLocal()).toBe("2026-08-08");
  });
});

describe("calcularRangoActividad", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("últimas 24 horas: ventana móvil desde el instante exacto, sin tope superior", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T15:00:00Z"));
    expect(calcularRangoActividad("24h")).toEqual({
      desde: new Date("2026-10-08T15:00:00Z").toISOString(),
      hasta: null,
    });
  });

  it("hoy: medianoche en La Paz, sin tope superior", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T15:00:00Z")); // 11:00 en La Paz
    expect(calcularRangoActividad("hoy")).toEqual({ desde: "2026-10-09T00:00:00-04:00", hasta: null });
  });

  it("últimos 7 días: hoy menos 6 días, medianoche en La Paz, sin tope superior", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T15:00:00Z"));
    expect(calcularRangoActividad("7d")).toEqual({ desde: "2026-10-03T00:00:00-04:00", hasta: null });
  });

  it("rango de fechas: hasta es el día siguiente al elegido, medianoche en La Paz", () => {
    expect(calcularRangoActividad("rango", { desde: "2026-10-01", hasta: "2026-10-05" })).toEqual({
      desde: "2026-10-01T00:00:00-04:00",
      hasta: "2026-10-06T00:00:00-04:00",
    });
  });

  it("rango de fechas sin elegir nada todavía: usa hoy como desde y hasta", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T15:00:00Z"));
    expect(calcularRangoActividad("rango")).toEqual({
      desde: "2026-10-09T00:00:00-04:00",
      hasta: "2026-10-10T00:00:00-04:00",
    });
  });

  it("a las 21:00 en La Paz (ya es mañana en UTC), hoy y 7 días usan la fecha de La Paz, no la de UTC", () => {
    vi.useFakeTimers();
    // 21:00 del 9 de octubre en La Paz = 01:00 del 10 de octubre en UTC.
    vi.setSystemTime(new Date("2026-10-10T01:00:00Z"));
    expect(hoyLocal()).toBe("2026-10-09");
    expect(calcularRangoActividad("hoy")).toEqual({ desde: "2026-10-09T00:00:00-04:00", hasta: null });
    expect(calcularRangoActividad("7d")).toEqual({ desde: "2026-10-03T00:00:00-04:00", hasta: null });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { hoyLocal } from "../fechas";

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

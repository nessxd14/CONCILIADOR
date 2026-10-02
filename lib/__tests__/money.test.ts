import { describe, expect, it } from "vitest";
import { formatBs } from "../money";

describe("importes en expedientes", () => {
  it.each([null, undefined])("permite mostrar un importe ausente (%s) sin convertirlo en cero", valor => {
    expect(formatBs(valor)).toBe("Sin registrar");
  });
  it("distingue un importe cero de un dato ausente", () => {
    expect(formatBs(0)).toBe("Bs 0.00");
    expect(formatBs("0.00")).toBe("Bs 0.00");
  });
  it("conserva el signo y los decimales de importes registrados", () => {
    expect(formatBs("-1234.56")).toBe("-Bs 1,234.56");
    expect(formatBs("9007199254740993.01")).toBe("Bs 9,007,199,254,740,993.01");
  });
  it("no presenta un valor corrupto como si fuese un importe ausente", () => {
    expect(() => formatBs("importe inválido")).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { resumirPago } from "../pago-estado";

describe("pagos registrados y saldo confirmado", () => {
  it("reconoce la cobertura total pendiente de verificar sin dar el pago por confirmado", () => {
    const datos = { imputado: "0", pendiente: "1779.35", en_revision: "1779.35", referencia: null };
    const resumen = resumirPago(datos)!;
    expect(resumen.soloVerificar).toBe(true);
    expect(resumen.sinRegistro.toFixed(2)).toBe("0.00");
    expect(resumen.confirmado.toFixed(2)).toBe("0.00");
    expect(resumen.pendiente.toFixed(2)).toBe("1779.35");
    expect(resumen.pagado).toBe(false);
    expect(datos.pendiente).toBe("1779.35");
  });
  it("descuenta solo los registros asignados y conserva los centavos en un pago parcial", () => {
    const resumen = resumirPago({ imputado: "100.10", pendiente: "899.25", en_revision: "300.35" })!;
    expect(resumen.registrado.toFixed(2)).toBe("400.45");
    expect(resumen.sinRegistro.toFixed(2)).toBe("598.90");
    expect(resumen.soloVerificar).toBe(false);
    expect(resumen.pagado).toBe(false);
  });
  it("pide revisar el reparto cuando las propuestas superan la deuda, en lugar de darla por resuelta", () => {
    const resumen = resumirPago({ imputado: "0", pendiente: "100", en_revision: "200" })!;
    expect(resumen.revisarReparto).toBe(true);
    expect(resumen.soloVerificar).toBe(false);
    expect(resumen.pagado).toBe(false);
  });
  it("reserva pagado para una partida sin saldo ni propuestas pendientes", () => {
    expect(resumirPago({ imputado: "100", pendiente: "0", en_revision: "0" })?.pagado).toBe(true);
    expect(resumirPago({ imputado: "0", pendiente: "0", en_revision: "0" })?.pagado).toBe(false);
    expect(resumirPago({ imputado: "0", pendiente: "100", en_revision: "0" })?.sinRegistro.toString()).toBe("100");
  });
  it("no presenta un saldo desconocido como cero", () => {
    expect(resumirPago({ imputado: "0", pendiente: null, en_revision: "100" })).toBeNull();
    expect(resumirPago(null)).toBeNull();
  });
});

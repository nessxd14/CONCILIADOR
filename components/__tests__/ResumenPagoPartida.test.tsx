import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ResumenPagoPartida } from "@/components/ResumenPagoPartida";

describe("presentación del pago registrado", () => {
  it("muestra el pago completo por verificar y conserva el saldo contable visible", () => {
    const html = renderToStaticMarkup(<ResumenPagoPartida pago={{ imputado: "0", pendiente: "1779.35", en_revision: "1779.35" }} />);
    expect(html).toContain("Pago registrado");
    expect(html).toContain("Solo falta verificarlo");
    expect(html).toContain("Sin pago registrado</span><b>Bs 0.00");
    expect(html).toContain("Saldo contable: Bs 1,779.35");
    expect(html).not.toContain(">Pagado</span>");
  });
  it("un anticipo parcial no oculta el importe que aún falta registrar", () => {
    const html = renderToStaticMarkup(<ResumenPagoPartida pago={{ imputado: "100.10", pendiente: "899.25", en_revision: "300.35" }} />);
    expect(html).toContain("Anticipo registrado");
    expect(html).toContain("Sin pago registrado</span><b>Bs 598.90");
    expect(html).not.toContain("Solo falta verificarlo");
  });
});

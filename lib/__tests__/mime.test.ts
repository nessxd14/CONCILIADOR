import { describe, expect, it } from "vitest";
import { mimeDesdeNombre } from "../mime";

describe("mimeDesdeNombre", () => {
  it("resuelve las cuatro extensiones aceptadas", () => {
    expect(mimeDesdeNombre("comprobante.jpg")).toBe("image/jpeg");
    expect(mimeDesdeNombre("comprobante.jpeg")).toBe("image/jpeg");
    expect(mimeDesdeNombre("comprobante.png")).toBe("image/png");
    expect(mimeDesdeNombre("comprobante.webp")).toBe("image/webp");
    expect(mimeDesdeNombre("comprobante.pdf")).toBe("application/pdf");
  });

  it("no distingue mayúsculas en la extensión", () => {
    expect(mimeDesdeNombre("COMPROBANTE.PDF")).toBe("application/pdf");
  });

  it("devuelve null para extensión desconocida o nombre vacío", () => {
    expect(mimeDesdeNombre("comprobante.docx")).toBeNull();
    expect(mimeDesdeNombre(null)).toBeNull();
    expect(mimeDesdeNombre(undefined)).toBeNull();
    expect(mimeDesdeNombre("")).toBeNull();
  });

  it("funciona también con un storage_path completo", () => {
    expect(mimeDesdeNombre("anticipos/22/uuid-cosa.pdf")).toBe("application/pdf");
  });
});

import { describe, expect, it } from "vitest";
import { validarArchivo, TAMANO_MAXIMO_BYTES } from "../SubidaEvidencia";

describe("validarArchivo", () => {
  it("acepta JPEG, PNG, WebP y PDF dentro del límite", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "application/pdf"]) {
      expect(validarArchivo({ type, size: 1024 })).toBeNull();
    }
  });

  it("rechaza un tipo no permitido, como .docx", () => {
    expect(validarArchivo({ type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1024 })).toContain(
      "JPEG, PNG, WebP o PDF"
    );
  });

  it("rechaza un archivo de más de 20 MB", () => {
    expect(validarArchivo({ type: "application/pdf", size: 30 * 1024 * 1024 })).toContain("20 MB");
  });

  it("acepta justo en el límite de 20 MB", () => {
    expect(validarArchivo({ type: "application/pdf", size: TAMANO_MAXIMO_BYTES })).toBeNull();
  });
});

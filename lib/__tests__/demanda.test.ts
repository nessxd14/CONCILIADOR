import { describe, expect, it } from "vitest";
import {
  aplicarFiltro, contarFiltros, detalleIdea, enlaceWhatsApp, etiquetaEstado, formatUltimaVez, resumenUnidades, siguienteCanal,
  type AnotacionDemanda, type IdeaDemanda,
} from "@/lib/demanda";

const idea = (p: Partial<IdeaDemanda>): IdeaDemanda => ({
  idea_id: 1, titulo: "Cinta", producto_id: null, tipo: "NO_LO_TENEMOS", veces: 1, cantidad_aprox: null, tienda: 1, mayor: 0,
  esperan_aviso: 0, ultima: "2026-11-10T14:00:00Z", estado: "ABIERTA", via: null, motivo: null, compra_solicitud_id: null, ...p,
});

describe("demanda", () => {
  it("etiqueta todos los estados, con y sin avisos pendientes", () => {
    expect(etiquetaEstado(idea({ estado: "ABIERTA" }))).toBe("Por decidir");
    expect(etiquetaEstado(idea({ estado: "SEGUIR_MIRANDO" }))).toBe("Seguir mirando");
    expect(etiquetaEstado(idea({ estado: "TRAER", via: "OC" }))).toBe("Traer por OC");
    expect(etiquetaEstado(idea({ estado: "TRAER", via: "EVENTUAL" }))).toBe("Compra eventual");
    expect(etiquetaEstado(idea({ estado: "TRAER", via: "IMPORTACION" }))).toBe("Próxima importación");
    expect(etiquetaEstado(idea({ estado: "DESCARTADA" }))).toBe("Descartada");
    expect(etiquetaEstado(idea({ estado: "LLEGO", esperan_aviso: 3 }))).toBe("Llegó · avisar a 3");
    expect(etiquetaEstado(idea({ estado: "LLEGO" }))).toBe("Llegó");
  });

  it("cuenta chips y filtra en el cliente", () => {
    const ideas = [
      idea({ idea_id: 1 }),
      idea({ idea_id: 2, tipo: "SE_ACABO" }),
      idea({ idea_id: 3, tipo: "SE_ACABO", estado: "TRAER", via: "OC" }),
    ];
    expect(contarFiltros(ideas)).toEqual({ TODO: 3, POR_DECIDIR: 2, NO_LO_TENEMOS: 1, SE_ACABO: 2 });
    expect(aplicarFiltro(ideas, "SE_ACABO").map((i) => i.idea_id)).toEqual([2, 3]);
    expect(aplicarFiltro(ideas, "POR_DECIDIR").map((i) => i.idea_id)).toEqual([1, 2]);
  });

  it("describe la línea de detalle y cicla el canal", () => {
    expect(detalleIdea({ esperan_aviso: 2, tipo: "NO_LO_TENEMOS" })).toBe("2 clientes esperan aviso");
    expect(detalleIdea({ esperan_aviso: 0, tipo: "SE_ACABO" })).toBe("Producto del catálogo");
    expect(detalleIdea({ esperan_aviso: 0, tipo: "NO_LO_TENEMOS" })).toBe("Sin contacto");
    expect(siguienteCanal(null)).toBe("TIENDA");
    expect(siguienteCanal("TIENDA")).toBe("MAYOR");
    expect(siguienteCanal("MAYOR")).toBeNull();
  });

  it("arma el enlace de WhatsApp: solo agrega 591 a números locales de 8 dígitos", () => {
    const local = enlaceWhatsApp("7123-4567", "Ana", "Cinta")!;
    expect(local.startsWith("https://wa.me/59171234567?text=")).toBe(true);
    expect(decodeURIComponent(local.split("text=")[1])).toBe("Hola Ana, te avisamos de Comercial ROARI: ya llegó Cinta.");
    expect(enlaceWhatsApp("+591 71234567", "Ana", "X")!.startsWith("https://wa.me/59171234567?")).toBe(true);
    expect(enlaceWhatsApp("sin numero", "Ana", "X")).toBeNull();
  });

  it("formatea la última vez en hora de La Paz", () => {
    expect(formatUltimaVez("2026-11-11T14:12:00Z", "2026-11-11")).toBe("hoy 10:12");
    expect(formatUltimaVez("2026-11-10T14:12:00Z", "2026-11-11")).toBe("ayer");
    expect(formatUltimaVez("2026-11-02T14:12:00Z", "2026-11-11")).toBe("02/11");
  });

  it("resume unidades: una sola unidad o 'unidades varias'", () => {
    const nota = (cantidad: number, unidad: string): AnotacionDemanda => ({
      demanda_id: 1, cantidad_aprox: cantidad, unidad, canal: "TIENDA", descripcion: null, anotado_por_nombre: null, anotado_por_rol: null,
      anotado_en: "2026-11-10T14:00:00Z", contacto_nombre: null, contacto_telefono: null, quiere_aviso: false, avisado_en: null, foto_path: null,
    });
    expect(resumenUnidades([nota(10, "cajas"), nota(5, "Cajas")])).toBe("unas 15 cajas");
    expect(resumenUnidades([nota(10, "cajas"), nota(5, "docenas")])).toBe("unas 15 unidades varias");
  });
});

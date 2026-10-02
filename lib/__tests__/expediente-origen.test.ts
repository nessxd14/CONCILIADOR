import { describe, expect, it } from "vitest";
import { cantidadDocumento, lineasVigentes, resumenHitoOrigen, type OrigenExpediente } from "../expediente-origen";
import type { VPedidoLineaHermes } from "../types";
describe("procedencia de un expediente",()=>{
  it("mantiene compras directas y aparta sustituciones, retiros y rechazos",()=>{
    const estados=["POR_DESPACHAR","DESPACHADA","COMPRADO_DIRECTO","CAMBIADA","RETIRADA","RECHAZADO"];
    const lineas=estados.map((estado,id)=>({id,estado}) as VPedidoLineaHermes);
    expect(lineasVigentes(lineas).map(l=>l.estado)).toEqual(estados.slice(0,3));
  });
  it("muestra la cantidad comercial de una presentación sin multiplicarla por unidades base",()=>{
    expect(cantidadDocumento({cantidad_base:"1000",cantidad_presentacion:"2"})).toBe("2");
    expect(cantidadDocumento({cantidad_base:5,cantidad_presentacion:null})).toBe(5);
    expect(cantidadDocumento({cantidad_base:5,cantidad_presentacion:0})).toBe(5);
  });
  it("no presenta un vínculo de cotización inválido como no aplicable",()=>{
    const origen={cotizacion:null,cotizacion_estado:"REVISION"} as OrigenExpediente;
    expect(resumenHitoOrigen("Cotización",origen)).toContain("Revisa");
    expect(resumenHitoOrigen("Cotización",{...origen,cotizacion_estado:"NO_APLICA"})).toContain("no tiene cotización");
  });
});

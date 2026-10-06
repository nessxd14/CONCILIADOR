import { describe, expect, it } from "vitest";
import { resumirCartera, resumirVencidas } from "../cartera";
import { leerPaginas } from "../paginate";
import { clientes } from "@/app/vista-previa/preview-data";

describe("Resumen financiero de cartera", () => {
  it("mantiene la deuda y el crédito separados y no descuenta pagos sin verificar", () => {
    const rows = [
      { ...clientes[0], saldo_confirmado: "100.10", monto_en_revision: "40.05" },
      { ...clientes[0], saldo_confirmado: "0.20", monto_en_revision: "0.10" },
      { ...clientes[0], saldo_confirmado: "-75.00", monto_en_revision: "0" },
    ];
    expect(resumirCartera(rows)).toEqual({ porCobrar: "100.30", aFavor: "75.00", enRevision: "40.15", deudores: 2 });
  });
  it("lee más de mil registros y no presenta resultados parciales si falla otra página", async () => {
    const rows = Array.from({ length: 1005 }, (_, id) => ({ id }));
    const all = await leerPaginas(async (from, to) => ({ data: rows.slice(from, to + 1), error: null }));
    expect(all.data).toHaveLength(1005);
    const failed = await leerPaginas(async (from, to) => from ? { data: null, error: { message: "Sin conexión" } } : { data: rows.slice(from, to + 1), error: null });
    expect(failed.data).toBeNull();
    expect(failed.error?.message).toBe("Sin conexión");
  });
  it("no duplica el saldo vencido si una partida tiene más de un frente detenido", () => {
    expect(resumirVencidas([
      { partida_id: 1, cliente_id: 1, saldo_partida: "40.15" },
      { partida_id: 1, cliente_id: 1, saldo_partida: "40.15" },
      { partida_id: 2, cliente_id: 1, saldo_partida: "10.05" },
      { partida_id: 3, cliente_id: 2, saldo_partida: "0" },
    ])).toEqual({ monto: "50.20", clientes: 1 });
  });
});

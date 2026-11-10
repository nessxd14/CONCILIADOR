import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentReview } from "../PaymentReview";
import { dashboardFixture } from "@/app/vista-previa/preview-data";

vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
const tablas = vi.hoisted(() => ({ respuestas: {} as Record<string, { data: unknown; error: unknown }> }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from: (t: string) => {
  const r = () => Promise.resolve(tablas.respuestas[t] ?? { data: [], error: null });
  const q: Record<string, unknown> = { maybeSingle: () => Promise.resolve({ data: null, error: null }), then: (a: (v: unknown) => unknown, b?: (e: unknown) => unknown) => r().then(a, b) };
  for (const m of ["select", "eq", "in", "order"]) q[m] = () => q;
  return q;
} }) }));
let root: Root | undefined;
afterEach(async () => { if (root) { await act(() => root!.unmount()); root = undefined; } document.body.innerHTML = ""; });

describe("Verificación de pagos", () => {
  it("exige reconocer la recepción y no verifica por el mero hecho de seleccionar un pago", async () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    const confirm = vi.fn().mockResolvedValue(false);
    await act(() => root!.render(<PaymentReview data={dashboardFixture} onRefresh={() => {}} onConfirm={confirm} initialId={1} />));
    const button = () => document.querySelector<HTMLButtonElement>(".verify-button")!;
    expect(button().disabled).toBe(true);
    await act(() => button().click());
    expect(confirm).not.toHaveBeenCalled();
    await act(() => document.querySelector<HTMLInputElement>(".verify-check input")!.click());
    expect(button().disabled).toBe(false);
    await act(() => button().click());
    expect(confirm).toHaveBeenCalledExactlyOnceWith(dashboardFixture.pagos[0]);
    expect(document.body.textContent).not.toContain("El saldo contable se actualizó");
  });
  it("no ofrece verificación a un rol de consulta y la vista de prueba no permite escrituras", () => {
    const noRole = renderToStaticMarkup(<PaymentReview data={{ ...dashboardFixture, puedeConfirmar: false }} onRefresh={() => {}} onConfirm={async () => true} />);
    expect(noRole).toContain("Acceso de gerencia");
    expect(noRole).not.toContain("verify-button");
    const preview = renderToStaticMarkup(<PaymentReview data={dashboardFixture} onRefresh={() => {}} onConfirm={async () => true} initialId={1} preview />);
    expect(preview).toMatch(/class="btn btn-primary verify-button" disabled/);
  });
  async function montar(pago: object, respuestas: typeof tablas.respuestas) {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    tablas.respuestas = respuestas;
    const data = { ...dashboardFixture, pagos: [{ ...dashboardFixture.pagos[0], ...pago }] };
    const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    await act(() => root!.render(<PaymentReview data={data} onRefresh={() => {}} onConfirm={async () => true} initialId={1} />));
  }
  it("marca el anticipo con su motivo y avisa si el cliente tiene pedidos pendientes", async () => {
    await montar({ no_imputar: true, anticipo_motivo: "GARANTIA_RESERVA", anticipo_detalle: "Acordado con gerencia" }, { v_partida_estado: { data: [{ pendiente: "100.50" }, { pendiente: "50" }], error: null } });
    const t = document.body.textContent!;
    expect(t).toContain("Garantía o reserva acordada con gerencia");
    expect(t).toContain("Acordado con gerencia");
    expect(t).toMatch(/Este cliente tiene pedidos pendientes por .*150[.,]50/);
    expect(document.querySelectorAll(".review-row .badge-no-imputar")).toHaveLength(1);
    expect(document.querySelector<HTMLButtonElement>(".verify-button")).not.toBeNull();
  });
  it("anticipo sin motivo, y lista a qué pedidos se aplica un pago normal", async () => {
    await montar({ no_imputar: true }, { v_partida_estado: { data: [], error: null } });
    expect(document.body.textContent).toContain("Sin motivo registrado");
    expect(document.body.textContent).not.toContain("pedidos pendientes por");
    await act(() => root!.unmount()); document.body.innerHTML = "";
    await montar({ no_imputar: false }, { pago_aplicacion: { data: [{ partida_id: 9, monto: "3620" }], error: null }, partida_abierta: { data: [{ id: 9, referencia: "PED-2026-00802" }], error: null } });
    expect(document.body.textContent).toMatch(/PED-2026-00802 · .*3[.,]620[.,]00/);
    await act(() => root!.unmount()); document.body.innerHTML = "";
    await montar({ no_imputar: false }, {});
    expect(document.body.textContent).toContain("Se repartirá por antigüedad al confirmar");
  });
  it("si falla la lectura del destino avisa y deja confirmar", async () => {
    await montar({ no_imputar: false }, { pago_aplicacion: { data: null, error: { message: "denied" } } });
    expect(document.body.textContent).toContain("No se pudo consultar el destino");
    await act(() => document.querySelector<HTMLInputElement>(".verify-check input")!.click());
    expect(document.querySelector<HTMLButtonElement>(".verify-button")!.disabled).toBe(false);
  });
});

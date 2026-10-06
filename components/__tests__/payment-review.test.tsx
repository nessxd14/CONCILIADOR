import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentReview } from "../PaymentReview";
import { dashboardFixture } from "@/app/vista-previa/preview-data";

vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) }) }));
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
});

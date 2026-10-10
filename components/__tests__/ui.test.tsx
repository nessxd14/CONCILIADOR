import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Dashboard, type ActividadView } from "@/components/Dashboard";
import { Tabs } from "@/components/Tabs";
import { dashboardFixture, actividadFixture } from "@/app/vista-previa/preview-data";

vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
let root: Root | undefined;
afterEach(async () => { if (root) { await act(() => root!.unmount()); root = undefined; } document.body.innerHTML = ""; });

const actividadVacia: ActividadView = { pagos: [], pedidos: [], cargando: false, errorPagos: null, errorPedidos: null, recargar: () => {} };
const propsActividad = { actividad: actividadVacia, periodo: "24h" as const, onPeriodoChange: () => {}, desde: "2026-10-09", hasta: "2026-10-09", onDesdeChange: () => {}, onHastaChange: () => {} };

describe("consulta de cartera", () => {
  it("muestra deuda y saldos a favor por separado, sin compensar clientes", () => {
    const html = renderToStaticMarkup(<Dashboard data={dashboardFixture} onRefresh={() => {}} onConfirm={() => {}} {...propsActividad} actividad={{ ...actividadVacia, pagos: actividadFixture.pagos, pedidos: actividadFixture.pedidos }} />);
    expect(html).toContain("Bs 75,900.50");
    expect(html).toContain("Bs 3,550.00");
  });
  it("no presenta saldo cero ni cartera vacía cuando la consulta falla", () => {
    const html = renderToStaticMarkup(<Dashboard data={{ ...dashboardFixture, saldos: [], errorSaldos: "Sin conexión" }} onRefresh={() => {}} onConfirm={() => {}} {...propsActividad} />);
    expect(html).toContain("No disponible");
    expect(html).toContain("No pudimos cargar la cartera");
    expect(html).not.toContain("Bs 0.00");
    expect(html).not.toContain("La cartera está vacía");
  });
  it("permite cambiar pestañas con las flechas y mantiene el foco en la seleccionada", async () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    const changed = vi.fn();
    await act(() => root!.render(<Tabs id="test" label="Cuenta" value="CUENTA" onChange={changed} items={[{ value: "CUENTA", label: "Cuenta corriente" }, { value: "PARTIDAS", label: "Partidas" }]} />));
    const first = document.getElementById("test-tab-CUENTA")!; first.focus();
    await act(() => first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(changed).toHaveBeenCalledWith("PARTIDAS");
    expect(document.activeElement?.id).toBe("test-tab-PARTIDAS");
  });
});

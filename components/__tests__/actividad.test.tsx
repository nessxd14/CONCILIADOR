import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Dashboard, type ActividadView } from "@/components/Dashboard";
import { dashboardFixture, actividadFixture } from "@/app/vista-previa/preview-data";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

let root: Root | undefined;
afterEach(async () => {
  if (root) {
    await act(() => root!.unmount());
    root = undefined;
  }
  document.body.innerHTML = "";
});

const propsBase = {
  data: dashboardFixture,
  onRefresh: () => {},
  onConfirm: () => {},
  periodo: "24h" as const,
  onPeriodoChange: () => {},
  desde: "2026-10-09",
  hasta: "2026-10-09",
  onDesdeChange: () => {},
  onHastaChange: () => {},
};

const actividadConDatos: ActividadView = {
  pagos: actividadFixture.pagos,
  pedidos: actividadFixture.pedidos,
  cargando: false,
  errorPagos: null,
  errorPedidos: null,
  recargar: () => {},
};

describe("Actividad reciente", () => {
  it("muestra las dos pestañas con su conteo", () => {
    const html = renderToStaticMarkup(<Dashboard {...propsBase} actividad={actividadConDatos} />);
    expect(html).toContain("Pagos");
    expect(html).toContain("Pedidos");
    // 5 pagos y 3 pedidos en el fixture.
    expect(html).toMatch(/Pagos[\s\S]*?<span class="tab-count">5<\/span>/);
    expect(html).toMatch(/Pedidos[\s\S]*?<span class="tab-count">3<\/span>/);
  });

  it("cambia de pestaña al hacer click y muestra el contenido de pedidos", async () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(() => root!.render(<Dashboard {...propsBase} actividad={actividadConDatos} />));

    expect(host.textContent).toContain("Comercial Altiplano");
    expect(host.querySelector("#actividad-panel")?.getAttribute("aria-labelledby")).toBe("actividad-tab-pagos");

    const tabPedidos = host.querySelector("#actividad-tab-pedidos") as HTMLButtonElement;
    await act(() => tabPedidos.click());

    expect(host.querySelector("#actividad-panel")?.getAttribute("aria-labelledby")).toBe("actividad-tab-pedidos");
    expect(host.textContent).toContain("PART-A-00301");
  });

  it('muestra el link "Revisar" solo en los pagos PROPUESTO', () => {
    const html = renderToStaticMarkup(<Dashboard {...propsBase} actividad={actividadConDatos} />);
    // El fixture tiene un solo pago PROPUESTO (id 4).
    const enlaces = html.match(/href="\/conciliacion\?pago=\d+"/g) ?? [];
    expect(enlaces).toEqual(["href=\"/conciliacion?pago=4\""]);
  });

  it("el total de pagos excluye RECHAZADO y ANULADO", () => {
    const html = renderToStaticMarkup(<Dashboard {...propsBase} actividad={actividadConDatos} />);
    // 600 (PROPUESTO) + 300 (CONFIRMADO) + 800 (ACREDITADO) = 1700; se excluyen 900 (RECHAZADO) y 1200 (ANULADO).
    expect(html).toContain("Total recibido Bs 1,700.00");
  });

  it("el total de pedidos excluye ANULADA", async () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(() => root!.render(<Dashboard {...propsBase} actividad={actividadConDatos} />));
    const tabPedidos = host.querySelector("#actividad-tab-pedidos") as HTMLButtonElement;
    await act(() => tabPedidos.click());
    // 4200.00 (ABIERTA) + 1800.00 (PAGADA) = 6000.00; se excluye 950.00 (ANULADA).
    expect(host.textContent).toContain("Total Bs 6,000.00");
  });

  it("cuando puedeConfirmar es false, la pestaña Pagos muestra el estado de acceso y no hay consulta de pago", () => {
    const html = renderToStaticMarkup(
      <Dashboard {...propsBase} data={{ ...dashboardFixture, puedeConfirmar: false }} actividad={actividadConDatos} />
    );
    expect(html).toContain("Verificación a cargo de gerencia");
    expect(html).not.toContain("Total recibido");
  });

  it('el link "Ver N pagos por verificar" aparece aunque el período no tenga pagos', () => {
    const html = renderToStaticMarkup(
      <Dashboard {...propsBase} actividad={{ ...actividadConDatos, pagos: [], pedidos: [] }} />
    );
    expect(html).toContain("Sin pagos en este período.");
    // dashboardFixture.pagos tiene 4 pagos PROPUESTO (de useCartera, sin recortar por período).
    expect(html).toContain("Ver 4 pagos por verificar");
  });

  it("avisa de los pagos por verificar anteriores al período elegido", () => {
    const html = renderToStaticMarkup(<Dashboard {...propsBase} actividad={actividadConDatos} />);
    // Solo el pago id 4 (PROPUESTO) está en el período; los otros 3 de
    // dashboardFixture.pagos (ids 1-3) quedan fuera, aunque compartan id con
    // filas de actividadFixture.pagos en otro estado.
    expect(html).toContain("3 pagos por verificar anteriores a este período");
  });

  it("no avisa de pagos anteriores cuando todos los PROPUESTO ya están en el período", () => {
    const html = renderToStaticMarkup(
      <Dashboard
        {...propsBase}
        data={{ ...dashboardFixture, pagos: [{ id: 4, cliente_id: 1, cliente: "Comercial Altiplano", monto: "600", medio: "EFECTIVO", referencia: null, creado_por: "pos:cajero", creado_en: "2026-10-09T18:00:00Z" }] }}
        actividad={actividadConDatos}
      />
    );
    expect(html).not.toContain("anteriores a este período");
  });
});

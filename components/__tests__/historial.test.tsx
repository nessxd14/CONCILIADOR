import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { HistorialEventos, HistorialPartida } from "@/components/HistorialPartida";
import { DetalleBaja } from "@/components/BajasPartidas";
import { ClientDetail } from "@/components/ClientDetail";
import { clientFixture } from "@/app/vista-previa/preview-data";
import type { HistorialPartidaData } from "@/lib/historial";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "1" }) }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
let root: Root | undefined;
afterEach(async () => { if (root) await act(() => root!.unmount()); root = undefined; document.body.innerHTML = ""; vi.clearAllMocks(); });
async function mount(element: React.ReactNode) {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(() => root!.render(element)); return host;
}
const data: HistorialPartidaData = { pedido: { id: 1, numero: "PED-1", estado: "CANCELADO", lineas_rechazadas: 1 }, eventos: [{ id: "1", accion: "LINEA_RECHAZADA", sistema: "ALMACEN", motivo: "Sin stock", usuario: "Operador de ejemplo", usuario_id: null, fecha: "2026-10-12T14:00:00Z", pedido_linea_id: 2, estado_previo: null }] };

describe("bajas y trazabilidad", () => {
  it("expone una discrepancia comercial sin presentar una partida pagada como anulada", () => {
    const html = renderToStaticMarkup(<HistorialEventos data={data} estadoPartida="PAGADA" />);
    expect(html).toContain("Pedido cancelado con partida pagada");
    expect(html).toContain("no acredita una entrega ni anula automáticamente la deuda");
    expect(html).toContain("Operador de ejemplo"); expect(html).toContain("Sin stock");
    expect(html).not.toContain("Partida anulada");
  });
  it("no inventa autor, motivo o fecha en registros históricos incompletos", () => {
    const html = renderToStaticMarkup(<DetalleBaja partida={{ estado: "ANULADA", motivo_anulacion: null, anulada_por: null, anulada_en: null }} />);
    expect(html).toContain("Motivo no registrado"); expect(html).toContain("Usuario no registrado"); expect(html).toContain("Fecha no registrada");
  });
  it("permite consultar bajas aunque ya no existan partidas activas ni anticipos", async () => {
    const host = await mount(<ClientDetail fixture={{ ...clientFixture, partidas: [], anticipos: [] }} />);
    await act(() => (host.querySelector("#cliente-tab-PARTIDAS") as HTMLButtonElement).click());
    const button = Array.from(host.querySelectorAll("button")).find(b => b.textContent === "Bajas e historial")!;
    await act(() => button.click());
    expect(host.textContent).toContain("El cliente canceló el pedido antes del despacho.");
    expect(host.textContent).toContain("María · Gerencia");
    expect(host.querySelector(".bajas-list")?.textContent).not.toContain("Pagada");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("muestra consulta no disponible cuando falta la RPC, sin afirmar historial vacío", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    const host = await mount(<HistorialPartida partidaId={1} estadoPartida="ABIERTA" />);
    expect(host.textContent).toContain("El historial no está disponible");
    expect(host.textContent).not.toContain("No hay eventos");
  });
  it("informa a los controles del expediente cuando el pedido de origen está cancelado", async () => {
    rpc.mockResolvedValue({ data, error: null });
    const changed = vi.fn();
    await mount(<HistorialPartida partidaId={1} estadoPartida="ABIERTA" onOrigenCancelado={changed} />);
    expect(changed).toHaveBeenLastCalledWith(true);
  });
  it("ignora la respuesta de otro expediente al cambiar de partida", async () => {
    let resolveOld!: (value: unknown) => void;
    rpc.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    const host = await mount(<HistorialPartida partidaId={1} estadoPartida="ABIERTA" />);
    rpc.mockResolvedValue({ data: { pedido: null, eventos: [] }, error: null });
    await act(() => root!.render(<HistorialPartida partidaId={2} estadoPartida="ABIERTA" />));
    await act(() => resolveOld({ data, error: null }));
    expect(host.textContent).toContain("No hay eventos"); expect(host.textContent).not.toContain("Operador de ejemplo");
  });
});

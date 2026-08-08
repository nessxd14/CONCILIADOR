import { beforeEach, describe, expect, it, vi } from "vitest";

const { uploadMock, rpcMock, guardarPaginasMock, leerPaginasMock, borrarPaginasMock } = vi.hoisted(() => ({
  uploadMock: vi.fn(),
  rpcMock: vi.fn(),
  guardarPaginasMock: vi.fn(),
  leerPaginasMock: vi.fn(),
  borrarPaginasMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({ upload: uploadMock }),
    },
    rpc: rpcMock,
  }),
}));

vi.mock("@/lib/captura/db", () => ({
  guardarPaginas: guardarPaginasMock,
  leerPaginas: leerPaginasMock,
  borrarPaginas: borrarPaginasMock,
}));

import { encolar, leerCola, reintentar, subirOEncolar } from "@/lib/captura/queue";

const blob = (tipo = "image/jpeg") => new Blob(["x"], { type: tipo });

const DATOS_BASE = {
  documentoId: 5,
  documentoEtiqueta: "Factura",
  partidaId: 10,
  partidaDocumentoInterno: "PART-1",
  usuario: "usuario@hermes.local",
};

beforeEach(() => {
  window.localStorage.clear();
  uploadMock.mockReset();
  rpcMock.mockReset();
  guardarPaginasMock.mockReset();
  leerPaginasMock.mockReset();
  borrarPaginasMock.mockReset();
});

describe("subirOEncolar / reintentar", () => {
  it("éxito total: sube todas las páginas y llama subir_documento una vez", async () => {
    uploadMock.mockResolvedValue({ data: { path: "x" }, error: null });
    rpcMock.mockResolvedValue({ error: null });

    const resultado = await subirOEncolar({ ...DATOS_BASE, paginas: [blob(), blob()] });

    expect(resultado.ok).toBe(true);
    expect(uploadMock).toHaveBeenCalledTimes(2);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(guardarPaginasMock).not.toHaveBeenCalled();
    expect(leerCola()).toHaveLength(0);
  });

  it("fallo en la página 2: el reintento sube solo la página 2, no re-sube la 1", async () => {
    uploadMock
      .mockResolvedValueOnce({ data: { path: "10/5-1.jpg" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "red caída" } });

    const resultado = await subirOEncolar({ ...DATOS_BASE, paginas: [blob(), blob()] });

    if (resultado.ok) throw new Error("se esperaba que fallara");
    expect(resultado.error).toBe("red caída");

    const cola = leerCola();
    expect(cola).toHaveLength(1);
    expect(cola[0].storagePaths?.[0]).toBeTruthy();
    // JSON.stringify no tiene `undefined`: al pasar por localStorage vuelve
    // como null, y la cola lo trata igual (chequeos por truthy).
    expect(cola[0].storagePaths?.[1]).toBeFalsy();

    uploadMock.mockReset();
    uploadMock.mockResolvedValueOnce({ data: { path: "10/5-2.jpg" }, error: null });
    rpcMock.mockResolvedValue({ error: null });
    leerPaginasMock.mockResolvedValueOnce([blob(), blob()]);

    const reintento = await reintentar(cola[0]);

    expect(reintento.ok).toBe(true);
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(leerCola()).toHaveLength(0);
  });

  it("fallo de la RPC con todas las páginas subidas: el reintento no re-sube nada", async () => {
    const item = await encolar(
      {
        ...DATOS_BASE,
        paginas: 2,
        storagePaths: ["10/5-1.jpg", "10/5-2.jpg"],
        error: "la RPC falló antes",
      },
      [blob(), blob()]
    );

    leerPaginasMock.mockResolvedValueOnce([blob(), blob()]);
    rpcMock.mockResolvedValue({ error: { message: "todavía falla" } });

    const reintento = await reintentar(item);

    expect(reintento.ok).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledTimes(1);

    const cola = leerCola();
    expect(cola).toHaveLength(1);
    expect(cola[0].storagePaths).toEqual(["10/5-1.jpg", "10/5-2.jpg"]);
  });

  it("migra un ítem viejo con storagePath (string) a storagePaths (array)", () => {
    const itemViejo = {
      id: "viejo-1",
      documentoId: 5,
      documentoEtiqueta: "Factura",
      partidaId: 10,
      partidaDocumentoInterno: "PART-1",
      paginas: 3,
      estado: "failed",
      error: "algo falló",
      storagePath: "10/5-999.jpg",
      usuario: "usuario@hermes.local",
      creadoEn: new Date().toISOString(),
    };
    window.localStorage.setItem("hermes:cola-captura", JSON.stringify([itemViejo]));

    const cola = leerCola();

    expect(cola).toHaveLength(1);
    expect(cola[0].storagePaths).toEqual(["10/5-999.jpg", undefined, undefined]);
    expect((cola[0] as unknown as { storagePath?: string }).storagePath).toBeUndefined();
  });
});

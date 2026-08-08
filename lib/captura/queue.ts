import { createClient } from "@/lib/supabase/client";
import { borrarPaginas, guardarPaginas, leerPaginas } from "./db";

const CLAVE_COLA = "hermes:cola-captura";

export interface ItemCola {
  id: string;
  documentoId: number;
  documentoEtiqueta: string;
  partidaId: number;
  partidaDocumentoInterno: string;
  paginas: number;
  estado: "queued" | "failed";
  error?: string;
  /** Una entrada por página; undefined = todavía no subida. */
  storagePaths?: (string | undefined)[];
  usuario: string;
  creadoEn: string;
}

/** Formato viejo, previo a storagePaths: una sola ruta para "la subida ya arrancó". */
type ItemColaViejo = Omit<ItemCola, "storagePaths"> & { storagePath?: string };

function migrarItem(item: ItemColaViejo): ItemCola {
  if ("storagePaths" in item && (item as ItemCola).storagePaths) {
    return item as ItemCola;
  }
  const { storagePath, ...resto } = item;
  const storagePaths = new Array<string | undefined>(item.paginas).fill(undefined);
  if (storagePath) storagePaths[0] = storagePath;
  return { ...resto, storagePaths };
}

export function leerCola(): ItemCola[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLAVE_COLA);
    if (!raw) return [];
    const crudos = JSON.parse(raw) as ItemColaViejo[];
    const items = crudos.map(migrarItem);
    if (crudos.some((it) => !("storagePaths" in it) || !it.storagePaths)) {
      guardarCola(items);
    }
    return items;
  } catch {
    return [];
  }
}

function guardarCola(items: ItemCola[]) {
  window.localStorage.setItem(CLAVE_COLA, JSON.stringify(items));
}

function actualizarItem(id: string, cambios: Partial<ItemCola>) {
  const items = leerCola().map((it) => (it.id === id ? { ...it, ...cambios } : it));
  guardarCola(items);
}

export async function encolar(
  datos: Omit<ItemCola, "id" | "estado" | "creadoEn">,
  paginas: Blob[]
): Promise<ItemCola> {
  const id = crypto.randomUUID();
  const item: ItemCola = {
    ...datos,
    id,
    estado: "queued",
    creadoEn: new Date().toISOString(),
  };
  await guardarPaginas(id, paginas);
  guardarCola([...leerCola(), item]);
  return item;
}

async function quitarDeCola(id: string, paginas: number) {
  guardarCola(leerCola().filter((it) => it.id !== id));
  await borrarPaginas(id, paginas);
}

const EXTENSION_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
  "application/pdf": "pdf",
};

function extensionDeBlob(blob: Blob): string {
  return EXTENSION_POR_MIME[blob.type] ?? "jpg";
}

/**
 * Sube un documento a Storage (las páginas que todavía no tengan ruta) y
 * recién cuando TODAS las páginas tienen ruta llama a subir_documento. Si
 * una página ya se había subido en un intento anterior (storagePaths[i] ya
 * seteado), no se vuelve a subir — solo se completan las que faltan.
 */
async function intentarSubida(
  rutasExistentes: (string | undefined)[] | undefined,
  partidaId: number,
  documentoId: number,
  paginas: Blob[],
  usuario: string
): Promise<{ ok: true } | { ok: false; error: string; storagePaths: (string | undefined)[] }> {
  const supabase = createClient();
  const rutas = [...(rutasExistentes ?? new Array<string | undefined>(paginas.length).fill(undefined))];
  const timestamp = Date.now();

  for (let i = 0; i < paginas.length; i++) {
    if (rutas[i]) continue;

    const ext = extensionDeBlob(paginas[i]);
    const path =
      paginas.length === 1
        ? `${partidaId}/${documentoId}-${timestamp}.${ext}`
        : `${partidaId}/${documentoId}-${timestamp}-${i + 1}.${ext}`;

    const { error: errSubida } = await supabase.storage
      .from("documentos-expediente")
      .upload(path, paginas[i], { contentType: paginas[i].type || "image/jpeg" });

    if (errSubida) {
      return { ok: false, error: errSubida.message, storagePaths: rutas };
    }
    rutas[i] = path;
  }

  if (rutas.some((r) => !r)) {
    return { ok: false, error: "Faltan páginas por subir.", storagePaths: rutas };
  }

  // documento.storage_path es una sola ruta: con varias páginas, todas se
  // suben (nada se pierde) pero la que queda como referencia canónica en la
  // fila de documento es la de la primera página.
  const { error: errRpc } = await supabase.rpc("subir_documento", {
    p_documento_id: documentoId,
    p_storage_path: rutas[0] as string,
    p_usuario: usuario,
  });

  if (errRpc) {
    return { ok: false, error: errRpc.message, storagePaths: rutas };
  }

  return { ok: true };
}

/** Usado tanto en el envío inicial (paso 5) como en "Reintentar" desde Home. */
export async function subirOEncolar(datos: {
  documentoId: number;
  documentoEtiqueta: string;
  partidaId: number;
  partidaDocumentoInterno: string;
  usuario: string;
  paginas: Blob[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const resultado = await intentarSubida(
    undefined,
    datos.partidaId,
    datos.documentoId,
    datos.paginas,
    datos.usuario
  );

  if (resultado.ok) return { ok: true };

  await encolar(
    {
      documentoId: datos.documentoId,
      documentoEtiqueta: datos.documentoEtiqueta,
      partidaId: datos.partidaId,
      partidaDocumentoInterno: datos.partidaDocumentoInterno,
      paginas: datos.paginas.length,
      usuario: datos.usuario,
      storagePaths: resultado.storagePaths,
      error: resultado.error,
    },
    datos.paginas
  );

  return { ok: false, error: resultado.error };
}

export async function reintentar(item: ItemCola): Promise<{ ok: true } | { ok: false; error: string }> {
  let paginas: Blob[];
  try {
    paginas = await leerPaginas(item.id, item.paginas);
  } catch (e) {
    const error = e instanceof Error ? e.message : "No se pudieron leer las páginas guardadas.";
    actualizarItem(item.id, { estado: "failed", error });
    return { ok: false, error };
  }

  const resultado = await intentarSubida(item.storagePaths, item.partidaId, item.documentoId, paginas, item.usuario);

  if (resultado.ok) {
    await quitarDeCola(item.id, item.paginas);
    return { ok: true };
  }

  actualizarItem(item.id, { estado: "failed", error: resultado.error, storagePaths: resultado.storagePaths });
  return { ok: false, error: resultado.error };
}

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
  storagePath?: string;
  usuario: string;
  creadoEn: string;
}

export function leerCola(): ItemCola[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLAVE_COLA);
    return raw ? (JSON.parse(raw) as ItemCola[]) : [];
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

/**
 * Sube un documento a Storage (si todavía no se subió) y recién con esa
 * ruta ya confirmada llama subir_documento. Si el archivo ya se había
 * subido en un intento anterior (storagePath ya seteado), no lo vuelve a
 * subir — solo reintenta la llamada a la RPC con la misma ruta.
 */
async function intentarSubida(
  storagePathExistente: string | undefined,
  partidaId: number,
  documentoId: number,
  paginas: Blob[],
  usuario: string
): Promise<{ ok: true } | { ok: false; error: string; storagePath?: string }> {
  const supabase = createClient();

  let storagePath = storagePathExistente;

  if (!storagePath) {
    // documento.storage_path es una sola ruta: con varias páginas, todas
    // se suben (nada se pierde) pero la que queda como referencia
    // canónica en la fila de documento es la de la primera página.
    const timestamp = Date.now();
    for (let i = 0; i < paginas.length; i++) {
      const path =
        paginas.length === 1
          ? `${partidaId}/${documentoId}-${timestamp}.jpg`
          : `${partidaId}/${documentoId}-${timestamp}-${i + 1}.jpg`;
      const { error: errSubida } = await supabase.storage
        .from("documentos-expediente")
        .upload(path, paginas[i], { contentType: paginas[i].type || "image/jpeg" });

      if (errSubida) {
        return { ok: false, error: errSubida.message, storagePath };
      }
      if (i === 0) storagePath = path;
    }
  }

  const { error: errRpc } = await supabase.rpc("subir_documento", {
    p_documento_id: documentoId,
    p_storage_path: storagePath,
    p_usuario: usuario,
  });

  if (errRpc) {
    return { ok: false, error: errRpc.message, storagePath };
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
      storagePath: resultado.storagePath,
      error: resultado.error,
    },
    datos.paginas
  );

  return { ok: false, error: resultado.error };
}

export async function reintentar(item: ItemCola): Promise<{ ok: true } | { ok: false; error: string }> {
  const paginas = await leerPaginas(item.id, item.paginas);

  const resultado = await intentarSubida(
    item.storagePath,
    item.partidaId,
    item.documentoId,
    paginas,
    item.usuario
  );

  if (resultado.ok) {
    await quitarDeCola(item.id, item.paginas);
    return { ok: true };
  }

  actualizarItem(item.id, { estado: "failed", error: resultado.error, storagePath: resultado.storagePath });
  return { ok: false, error: resultado.error };
}

import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET_DOCUMENTOS = "documentos-expediente";
export const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024;

const MIME_A_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export const MIME_PERMITIDOS = Object.keys(MIME_A_EXTENSION);

/** Mismas reglas que el bucket documentos-expediente en Storage: se valida antes de subir, no después. */
export function validarArchivo(file: File): string | null {
  if (!MIME_A_EXTENSION[file.type]) {
    return "Solo se aceptan archivos JPEG, PNG, WebP o PDF.";
  }
  if (file.size > TAMANO_MAXIMO_BYTES) {
    return `El archivo pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB. El máximo es 20 MB.`;
  }
  return null;
}

function extensionDe(file: File): string {
  return MIME_A_EXTENSION[file.type] ?? "bin";
}

export interface ResultadoSubida {
  storagePath: string;
  evidenciaId: number;
}

/**
 * Sube el archivo a Storage y recién con la subida confirmada crea la fila
 * en evidencia. Nunca al revés: una fila de evidencia sin archivo real detrás
 * sería peor que no tener nada. Si cualquiera de los dos pasos falla, no hay
 * éxito parcial que reportar: se propaga el error tal cual.
 */
export async function subirEvidencia(
  supabase: SupabaseClient,
  prefijo: string,
  file: File,
  subidoPor: string
): Promise<{ data: ResultadoSubida | null; error: string | null }> {
  const errorValidacion = validarArchivo(file);
  if (errorValidacion) return { data: null, error: errorValidacion };

  const path = `${prefijo}/${crypto.randomUUID()}.${extensionDe(file)}`;

  const subida = await supabase.storage.from(BUCKET_DOCUMENTOS).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (subida.error) {
    return { data: null, error: `No se pudo subir el archivo: ${subida.error.message}` };
  }

  const evidenciaRes = await supabase
    .from("evidencia")
    .insert({
      storage_path: path,
      nombre_original: file.name,
      mime_type: file.type,
      tamano_bytes: file.size,
      subido_por: subidoPor,
    })
    .select("id")
    .single();

  if (evidenciaRes.error || !evidenciaRes.data) {
    // El archivo ya quedó en Storage pero sin fila en evidencia: se informa
    // tal cual en vez de fingir éxito, para que alguien lo revise a mano.
    return {
      data: null,
      error: `El archivo se subió pero no se pudo registrar en evidencia: ${
        evidenciaRes.error?.message ?? "sin fila devuelta"
      }`,
    };
  }

  return { data: { storagePath: path, evidenciaId: evidenciaRes.data.id as number }, error: null };
}

export async function abrirArchivo(supabase: SupabaseClient, storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET_DOCUMENTOS).createSignedUrl(storagePath, 60);
  if (error || !data) return null;
  return data.signedUrl;
}

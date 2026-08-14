/**
 * Brief T7: algunas vistas (v_anticipo_cliente) no traen mime_type, solo el nombre
 * original y el storage_path — ambos con la extensión real, así que alcanza para decidir
 * si VisorEvidencia muestra una imagen o un PDF.
 */
const MIME_POR_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export function mimeDesdeNombre(nombre: string | null | undefined): string | null {
  if (!nombre) return null;
  const extension = nombre.split(".").pop()?.toLowerCase();
  return extension ? (MIME_POR_EXTENSION[extension] ?? null) : null;
}

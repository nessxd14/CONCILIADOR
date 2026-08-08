const LADO_MAYOR_MAX = 1600;
const CALIDAD_JPEG = 0.8;

/**
 * Comprime una foto a JPEG con el lado mayor limitado a 1600px, calidad 0.8.
 * Si el navegador no puede decodificarla (p. ej. HEIC de iPhone sin soporte)
 * se devuelve el archivo original tal cual: nunca se pierde la foto por
 * intentar optimizarla.
 */
export async function comprimirImagen(archivo: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(archivo);
    const ladoMayor = Math.max(bitmap.width, bitmap.height);
    const escala = ladoMayor > LADO_MAYOR_MAX ? LADO_MAYOR_MAX / ladoMayor : 1;
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return archivo;

    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", CALIDAD_JPEG));
    if (!blob) return archivo;

    const nombre = archivo.name.replace(/\.[^./]+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return archivo;
  }
}

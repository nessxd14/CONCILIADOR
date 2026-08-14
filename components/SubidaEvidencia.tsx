"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const EXTENSION_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
export const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024;

/** Puro, para poder testearlo sin DOM ni red — la regla es la misma que ya acepta el
 * bucket documentos-expediente (Brief T7): validar ANTES de subir, no después. */
export function validarArchivo(file: { type: string; size: number }): string | null {
  if (!MIME_PERMITIDOS.includes(file.type)) return "Solo se aceptan JPEG, PNG, WebP o PDF.";
  if (file.size > TAMANO_MAXIMO_BYTES) return "El archivo supera los 20 MB.";
  return null;
}

/**
 * Brief T7 Tarea 2: botón de carga manual de comprobantes de anticipo y documentos de
 * expediente — solo se renderiza para admin/gerente (el padre decide eso, acá no se vuelve
 * a chequear rol del lado cliente porque el servidor ya lo hace en /api/evidencia/confirmar,
 * que es quien de verdad manda). Sube directo del navegador al bucket (la política ya lo
 * permite para cualquier authenticated con rol) y confirma con el servidor — nunca se
 * reporta éxito antes de esa confirmación.
 */
export function SubidaEvidencia({
  entidad,
  entidadId,
  label,
  onSubido,
}: {
  entidad: "pago" | "documento";
  entidadId: number;
  label: string;
  onSubido: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarArchivo(file: File) {
    setError(null);
    const problema = validarArchivo(file);
    if (problema) {
      setError(problema);
      return;
    }

    setSubiendo(true);

    const extension = EXTENSION_POR_MIME[file.type];
    const prefijo = entidad === "pago" ? "anticipos" : "expediente";
    const path = `${prefijo}/${entidadId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("documentos-expediente")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      setError(`No se pudo subir el archivo: ${uploadError.message}`);
      setSubiendo(false);
      return;
    }

    try {
      const res = await fetch("/api/evidencia/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entidad,
          entidadId,
          storagePath: path,
          nombreOriginal: file.name,
          mimeType: file.type,
          tamanoBytes: file.size,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // El archivo quedó en el storage sin fila de evidencia que lo referencie — no rompe
        // nada, pero no vale la pena dejarlo ocupando espacio si de todos modos hay que
        // reintentar.
        await supabase.storage.from("documentos-expediente").remove([path]);
        setError(data?.error ?? "No se pudo confirmar la subida");
        setSubiendo(false);
        return;
      }
    } catch (err) {
      await supabase.storage.from("documentos-expediente").remove([path]);
      setError(err instanceof Error ? err.message : "No se pudo confirmar la subida");
      setSubiendo(false);
      return;
    }

    setSubiendo(false);
    onSubido();
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void manejarArchivo(file);
        }}
      />
      <button type="button" className="btn btn-secondary" disabled={subiendo} onClick={() => inputRef.current?.click()}>
        {subiendo ? "Subiendo…" : label}
      </button>
      {error && <div className="field-error" style={{ marginTop: 6 }}>{error}</div>}
    </div>
  );
}

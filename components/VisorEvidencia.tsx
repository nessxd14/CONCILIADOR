"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Brief T7 Tarea 1/2: el clip que abre el comprobante/documento ya subido. Vista previa
 * embebida para imágenes y PDF (visor, no una pestaña nueva) — el bucket es privado, así
 * que todo pasa por signed URL, nunca una URL pública.
 */
export function VisorEvidencia({
  storagePath,
  mimeType,
  nombre,
  puedeBorrar,
  onBorrado,
  onError,
}: {
  storagePath: string;
  mimeType: string | null;
  nombre: string | null;
  puedeBorrar: boolean;
  onBorrado?: () => void;
  onError?: (mensaje: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [abierto, setAbierto] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);

  async function abrir() {
    setAbierto(true);
    setCargando(true);
    setError(null);
    const { data, error: signedError } = await supabase.storage.from("documentos-expediente").createSignedUrl(storagePath, 120);
    if (signedError || !data) {
      setError(signedError?.message ?? "No se pudo generar el enlace.");
      setCargando(false);
      return;
    }
    setSignedUrl(data.signedUrl);
    setCargando(false);
  }

  function cerrar() {
    setAbierto(false);
    setSignedUrl(null);
    setError(null);
  }

  async function borrar() {
    if (!confirm(`¿Borrar ${nombre ?? "este archivo"}? No se puede deshacer.`)) return;
    setBorrando(true);
    // El padre pasa la entidad/id en onBorrado — VisorEvidencia solo confirma el gesto.
    try {
      await onBorrado?.();
      cerrar();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "No se pudo borrar el archivo");
    } finally {
      setBorrando(false);
    }
  }

  const esImagen = mimeType?.startsWith("image/");
  const esPdf = mimeType === "application/pdf";

  return (
    <>
      <button type="button" className="btn-link" onClick={abrir} title={nombre ?? "Ver comprobante"}>
        📎 {nombre ?? "Ver archivo"}
      </button>
      {abierto && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="card modal-card" style={{ maxWidth: 720, width: "90vw" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{nombre ?? "Archivo"}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {puedeBorrar && onBorrado && (
                  <button type="button" className="btn btn-secondary" style={{ borderColor: "var(--alerta)", color: "var(--alerta)" }} disabled={borrando} onClick={borrar}>
                    {borrando ? "Borrando…" : "Borrar"}
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={cerrar}>
                  Cerrar
                </button>
              </div>
            </div>
            {cargando && <div>Cargando…</div>}
            {error && <div className="field-error">{error}</div>}
            {signedUrl && esImagen && (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL temporal, no vale la pena el pipeline de next/image para esto
              <img src={signedUrl} alt={nombre ?? "Comprobante"} style={{ maxWidth: "100%", maxHeight: "70vh", display: "block", margin: "0 auto" }} />
            )}
            {signedUrl && esPdf && <iframe src={signedUrl} title={nombre ?? "Documento"} style={{ width: "100%", height: "70vh", border: 0 }} />}
            {signedUrl && !esImagen && !esPdf && (
              <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                Abrir archivo
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}

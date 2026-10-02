"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AccessNotice({ message }: { message: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function salir() {
    setBusy(true); setError(null);
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      router.replace("/login"); router.refresh();
    } catch { setError("No se pudo cerrar la sesión. Reintenta."); }
    finally { setBusy(false); }
  }
  return <main className="content"><div className="card" role="alert">
    <h1 className="page-title">Acceso a Hermes</h1><p>{message}</p>
    {error && <p className="field-error">{error}</p>}
    <button className="btn btn-secondary" disabled={busy} onClick={salir}>{busy ? "Cerrando sesión…" : "Volver al inicio de sesión"}</button>
  </div></main>;
}

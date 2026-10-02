"use client";

// No prerenderizar como estática: el cliente de Supabase se crea recién
// al enviar el formulario (ver handleSubmit), nunca durante el render del
// componente, así el build no depende de que las env vars existan en ese
// momento. force-dynamic queda como refuerzo explícito de la ruta.
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { obtenerSesionHermes } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }

    const sesion = await obtenerSesionHermes(supabase);
    if (sesion.error || !sesion.data.rol) {
      await supabase.auth.signOut();
      setError(sesion.error ? "No se pudo validar tu acceso a Hermes. Reintenta." : "Tu cuenta no tiene acceso a Hermes. Solicita la habilitación al administrador.");
      return;
    }

    router.push("/dia");
    router.refresh();
    } catch { setError("No se pudo conectar. Reintenta."); } finally { setCargando(false); }
  }

  return (
    <div className="login-shell">
      <aside className="login-story"><div className="sidebar-brand"><span className="sidebar-mark">H</span><span><span className="sidebar-title">Hermes<span className="brand-dot">.</span></span><span className="sidebar-sub">Cuentas por cobrar</span></span></div><h1>Claridad en cada cuenta.</h1><p>Saldos, movimientos y documentos. Todo el detalle que necesitas para dar el siguiente paso.</p><footer>Libro auxiliar · ROARI / Cation</footer></aside>
      <div className="login-card">
        <div className="sidebar-brand" style={{ padding: "0 0 24px" }}>
          <div className="sidebar-mark">H</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Hermes</div>
            <div style={{ color: "var(--muted)", fontSize: 11 }}>
              Libro auxiliar de cuentas por cobrar
            </div>
          </div>
        </div>

<h2>Bienvenido a Hermes</h2><p className="login-intro">Ingresa para consultar tu cartera.</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="field-error" style={{ marginBottom: 14 }}>{error}</div>}
          <button type="submit" className="btn btn-orange" style={{ width: "100%", justifyContent: "center" }} disabled={cargando}>
            {cargando ? "Entrando…" : "Iniciar sesión"}<Icon name="arrow" size={17} />
          </button>
        </form><p className="login-footnote">Acceso con tu cuenta de Hermes.</p>
      </div>
    </div>
  );
}

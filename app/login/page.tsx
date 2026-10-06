"use client";

// No prerenderizar como estática: el cliente de Supabase se crea recién
// al enviar el formulario (ver handleSubmit), nunca durante el render del
// componente, así el build no depende de que las env vars existan en ese
// momento. force-dynamic queda como refuerzo explícito de la ruta.
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { HermesMark } from "@/components/HermesMark";
import { obtenerSesionHermes } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
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
      <aside className="login-story"><div className="sidebar-brand"><span className="sidebar-mark"><HermesMark /></span><span className="sidebar-title">Hermes.</span></div><h1>Claridad para decidir.</h1><p>Cartera, pagos y movimientos en una sola visión.</p><div className="login-pillars"><span><Icon name="wallet" size={32} />Cartera</span><span><Icon name="chart" size={32} />Cuentas</span><span><Icon name="lock" size={32} />Control</span></div><footer>Libro auxiliar · ROARI / Cation</footer></aside>
      <div className="login-card">
        <div className="sidebar-brand login-mobile-brand" style={{ padding: "0 0 24px" }}>
          <div className="sidebar-mark"><HermesMark /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Hermes</div>
            <div style={{ color: "var(--muted)", fontSize: 11 }}>
              Libro auxiliar de cuentas por cobrar
            </div>
          </div>
        </div>

<h1>Bienvenido a Hermes</h1><p className="login-intro">Ingresa con tu cuenta de Cation</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
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
              type={mostrarPassword ? "text" : "password"}
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="button" className="btn-link password-toggle" aria-pressed={mostrarPassword} onClick={() => setMostrarPassword(!mostrarPassword)}>{mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</button>
          {error && <div role="alert" className="field-error" style={{ marginBottom: 14 }}>{error}</div>}
          <button type="submit" className="btn btn-orange" style={{ width: "100%", justifyContent: "center" }} disabled={cargando}>
            {cargando ? "Entrando…" : "Iniciar sesión"}<Icon name="arrow" size={17} />
          </button>
        </form><p className="login-footnote">Usa tu cuenta del POS · Seller / Cation</p>
      </div>
    </div>
  );
}

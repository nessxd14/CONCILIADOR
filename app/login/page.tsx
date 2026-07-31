"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setCargando(false);

    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }

    router.push("/clientes");
    router.refresh();
  }

  return (
    <div className="login-shell">
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
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="field-error" style={{ marginBottom: 14 }}>{error}</div>}
          <button type="submit" className="btn btn-orange" style={{ width: "100%", justifyContent: "center" }} disabled={cargando}>
            {cargando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

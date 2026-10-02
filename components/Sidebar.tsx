"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon, type IconName } from "./Icon";

export function Sidebar({ email, rol, pendientesImportar = 0, pedidosAccionables = 0, preview = false }: {
  email: string; rol: string | null; pendientesImportar?: number; pedidosAccionables?: number; preview?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items: { href: string; label: string; icon: IconName; badge?: number }[] = [
    { href: "/dia", label: "Mi día", icon: "home" },
    { href: "/clientes", label: "Clientes", icon: "users", badge: pendientesImportar || undefined },
    { href: "/pedidos-pendientes", label: "Pedidos pendientes", icon: "folder", badge: pedidosAccionables || undefined },
    { href: "/captura", label: "Captura de documentos", icon: "camera" },
    ...(rol === "admin" ? [{ href: "/apertura", label: "Saldos de apertura", icon: "book" as const }] : []),
  ];
  async function cerrarSesion() {
    setCerrando(true); setError(null);
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      router.push("/login"); router.refresh();
    } catch { setError("No se pudo cerrar la sesión. Reintenta."); setCerrando(false); }
  }
  return <aside className="sidebar" aria-label="Navegación principal">
    <Link href={preview ? "/vista-previa" : "/dia"} className="sidebar-brand" aria-label="Hermes, inicio">
      <span className="sidebar-mark">H</span><span><span className="sidebar-title">Hermes<span className="brand-dot">.</span></span><span className="sidebar-sub">Cuentas por cobrar</span></span>
    </Link>
    <nav>{items.map(item => {
      const active = preview ? (pathname.endsWith("/cliente") ? item.href === "/clientes" : item.href === "/dia") : pathname.startsWith(item.href);
      return <Link key={item.href} href={preview ? (item.href === "/dia" ? "/vista-previa" : "/vista-previa/cliente") : item.href}
        className={`nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
        <Icon name={item.icon} size={19} /><span>{item.label}</span>{item.badge && <span className="nav-badge">{item.badge}</span>}
      </Link>;
    })}</nav>
    <div className="sidebar-note"><span className="connection-dot" />{preview ? "Datos de ejemplo" : "Libro auxiliar · ROARI"}<p>El detalle de cada cuenta, en un solo lugar.</p></div>
    <div className="sidebar-footer">
      <span className="user-avatar">{email.slice(0, 1).toUpperCase()}</span><div className="user-info"><strong>{email.split("@")[0]}</strong><span>{rol ?? "Sin rol asignado"}</span></div>
      {!preview && <button type="button" className="icon-button" aria-label="Cerrar sesión" title="Cerrar sesión" disabled={cerrando} onClick={cerrarSesion}><Icon name="logout" size={18} /></button>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  </aside>;
}

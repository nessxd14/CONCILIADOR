"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon, type IconName } from "./Icon";
import { HermesMark } from "./HermesMark";

export function Sidebar({ email, rol, pendientesImportar = 0, pedidosAccionables = 0, preview = false }: {
  email: string; rol: string | null; pendientesImportar?: number; pedidosAccionables?: number; preview?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const items: { href: string; label: string; icon: IconName; badge?: number }[] = [
    { href: "/resumen", label: "Visión general", icon: "chart" },
    { href: "/dia", label: "Mi día", icon: "calendar" },
    { href: "/tesoreria", label: "Tesorería", icon: "wallet" },
    { href: "/clientes", label: "Clientes", icon: "users", badge: pendientesImportar || undefined },
    { href: "/proveedores", label: "Proveedores", icon: "box" },
    { href: "/resultados", label: "Resultados", icon: "chart" },
    { href: "/conciliacion", label: "Conciliación", icon: "receipt" },
    { href: "/pedidos-pendientes", label: "Pedidos", icon: "folder", badge: pedidosAccionables || undefined },
    { href: "/captura", label: "Documentos", icon: "camera" },
    ...(rol === "admin" || preview ? [{ href: "/apertura", label: "Apertura", icon: "book" as const }] : []),
  ];
  async function cerrarSesion() {
    setCerrando(true); setError(null);
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      router.push("/login"); router.refresh();
    } catch { setError("No se pudo cerrar la sesión. Reintenta."); setCerrando(false); }
  }
  return <aside className={`sidebar ${menuAbierto ? "menu-open" : ""}`} aria-label="Navegación principal" onKeyDown={e => { if (e.key === "Escape") setMenuAbierto(false); }}>
    <Link href={preview ? "/vista-previa/resumen" : "/resumen"} className="sidebar-brand" aria-label="Hermes, inicio">
      <span className="sidebar-mark"><HermesMark /></span><span><span className="sidebar-title">Hermes<span className="brand-dot">.</span></span><span className="sidebar-sub">Cuentas por cobrar</span></span>
    </Link>
    <button className="mobile-menu icon-button" type="button" aria-expanded={menuAbierto} aria-controls="hermes-nav" onClick={() => setMenuAbierto(!menuAbierto)}><Icon name="menu" /><span>{menuAbierto ? "Cerrar menú" : "Menú"}</span></button>
    <nav id="hermes-nav">{items.map(item => {
      const previewHref = item.href === "/dia" ? "/vista-previa" : item.href === "/clientes" ? "/vista-previa/cliente" : `/vista-previa${item.href}`;
      const active = preview ? pathname === previewHref : pathname.startsWith(item.href);
      const link = <Link key={item.href} href={preview ? previewHref : item.href} onClick={() => setMenuAbierto(false)}
        className={`nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
        <Icon name={item.icon} size={19} /><span>{item.label}</span>{item.badge && <span className="nav-badge">{item.badge}</span>}
      </Link>;
      return item.href === "/pedidos-pendientes" ? <div key="operacion" className="nav-operation"><span className="nav-section-label">Operación</span>{link}</div> : link;
    })}</nav>
    <div className="sidebar-note"><span className="connection-dot" />{preview ? "Datos de ejemplo" : "Hermes · Seller / Cation"}<p>Saldos y pagos, en un solo lugar.</p></div>
    <div className="sidebar-footer">
      <span className="user-avatar">{email.slice(0, 1).toUpperCase()}</span><div className="user-info"><strong>{email.split("@")[0]}</strong><span>{rol ?? "Sin rol asignado"}</span></div>
      {!preview && <button type="button" className="icon-button" aria-label="Cerrar sesión" title="Cerrar sesión" disabled={cerrando} onClick={cerrarSesion}><Icon name="logout" size={18} /></button>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  </aside>;
}

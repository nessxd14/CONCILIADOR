"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function Sidebar({
  email,
  rol,
  pendientesImportar = 0,
  pedidosAccionables = 0,
}: {
  email: string;
  rol: string | null;
  pendientesImportar?: number;
  pedidosAccionables?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const items = [
    { href: "/dia", label: "Mi día" },
    { href: "/clientes", label: "Clientes", badge: pendientesImportar > 0 ? pendientesImportar : undefined },
    {
      href: "/pedidos-pendientes",
      label: "Pedidos pendientes",
      badge: pedidosAccionables > 0 ? pedidosAccionables : undefined,
    },
    ...(rol === "admin" ? [{ href: "/apertura", label: "Cargar aperturas" }] : []),
    { href: "/captura", label: "Captura (móvil)" },
  ];

  async function cerrarSesion() {
    setCerrandoSesion(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-mark">H</div>
        <div>
          <div className="sidebar-title">Hermes</div>
          <div className="sidebar-sub">Libro auxiliar</div>
        </div>
      </div>

      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item ${pathname.startsWith(item.href) ? "active" : ""}`}
          style={{ justifyContent: "space-between" }}
        >
          <span>{item.label}</span>
          {item.badge !== undefined && <span className="badge badge-pendiente">{item.badge}</span>}
        </Link>
      ))}

      <div className="sidebar-footer">
        {email}
        <br />
        {rol ? (
          rol
        ) : (
          <span style={{ color: "var(--alerta)", fontWeight: 700 }}>
            Sin rol asignado — pedí que te lo configuren
          </span>
        )}
        <button
          type="button"
          className="btn-link"
          style={{ display: "block", marginTop: 10, color: "#c9c7c0" }}
          disabled={cerrandoSesion}
          onClick={cerrarSesion}
        >
          {cerrandoSesion ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ email, rol }: { email: string; rol: string | null }) {
  const pathname = usePathname();

  const items = [
    { href: "/dia", label: "Mi día" },
    { href: "/clientes", label: "Clientes" },
    ...(rol === "admin" ? [{ href: "/apertura", label: "Cargar aperturas" }] : []),
  ];

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
        >
          {item.label}
        </Link>
      ))}

      <div className="sidebar-footer">
        {email}
        <br />
        {rol ?? "sin rol asignado"}
      </div>
    </div>
  );
}

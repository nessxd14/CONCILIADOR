import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hermes",
  description: "Libro auxiliar de cuentas por cobrar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-BO">
      <body>{children}</body>
    </html>
  );
}

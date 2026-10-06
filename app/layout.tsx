import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./anticipos.css";
import "./despacho.css";
import "./redesign.css";

export const metadata: Metadata = {
  title: "Hermes",
  description: "Cartera, pagos y salud financiera",
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

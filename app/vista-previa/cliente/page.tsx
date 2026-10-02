import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Preview } from "../Preview";
export const dynamic = "force-dynamic";
export default function PreviewClientPage() {
  if (process.env.NODE_ENV !== "development" || process.env.HERMES_UI_PREVIEW !== "1") notFound();
  return <Suspense fallback={<p>Cargando vista de prueba…</p>}><Preview client /></Suspense>;
}

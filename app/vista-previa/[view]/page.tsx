import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Preview } from "../Preview";
export default async function Page({ params }: { params: Promise<{ view: string }> }) {
  if (process.env.NODE_ENV !== "development" || process.env.HERMES_UI_PREVIEW !== "1") notFound();
  const { view } = await params;
  if (["captura", "apertura"].includes(view)) redirect(`/${view}`);
  if (!["resumen", "conciliacion", "tesoreria", "proveedores", "resultados"].includes(view)) notFound();
  return <Suspense><Preview view={view} /></Suspense>;
}

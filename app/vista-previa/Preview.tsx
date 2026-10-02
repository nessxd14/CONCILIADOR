"use client";
import { Dashboard } from "@/components/Dashboard";
import { ClientDetail } from "@/components/ClientDetail";
import { Sidebar } from "@/components/Sidebar";
import { dashboardFixture, clientFixture } from "./preview-data";
import { useSearchParams } from "next/navigation";

export function Preview({ client = false }: { client?: boolean }) {
  const params = useSearchParams();
  const state = params.get("estado");
  const data = state === "vacio" ? { ...dashboardFixture, saldos: [], bloqueados: [], pagos: [] } : state === "error" ? { ...dashboardFixture, saldos: [], bloqueados: [], pagos: [], errorSaldos: "No se pudo conectar. Reintenta.", error: "Sin conexión", errorPagos: "No se pudo consultar los pagos." } : state === "cargando" ? { ...dashboardFixture, cargando: true } : dashboardFixture;
  return <div className="preview-layout"><div className="preview-banner">Vista de prueba · datos sintéticos · acciones de escritura deshabilitadas</div><div className="shell"><Sidebar email="administracion@ejemplo.local" rol="auditor" preview /><main className="content">{client ? <ClientDetail fixture={clientFixture} /> : <Dashboard data={data} onRefresh={() => {}} onConfirm={() => {}} preview />}</main></div></div>;
}

"use client";
import { Dashboard } from "@/components/Dashboard";
import { ClientDetail } from "@/components/ClientDetail";
import { Sidebar } from "@/components/Sidebar";
import { Overview } from "@/components/Overview";
import { PaymentReview } from "@/components/PaymentReview";
import { FinancialCoverage, type FinancialModule } from "@/components/FinancialCoverage";
import { dashboardFixture, clientFixture } from "./preview-data";
import { useSearchParams } from "next/navigation";

export function Preview({ client = false, view = "dia" }: { client?: boolean; view?: string }) {
  const params = useSearchParams();
  const state = params.get("estado");
  const data = state === "vacio" ? { ...dashboardFixture, saldos: [], bloqueados: [], pagos: [], vencidas: { monto: "0.00", clientes: 0 }, pedidosPorRevisar: 0 } : state === "error" ? { ...dashboardFixture, saldos: [], bloqueados: [], pagos: [], vencidas: null, pedidosPorRevisar: null, errorVencidas: "No se pudo consultar vencimientos.", errorSaldos: "No se pudo conectar. Reintenta.", error: "Sin conexión", errorPagos: "No se pudo consultar los pagos." } : state === "cargando" ? { ...dashboardFixture, cargando: true } : dashboardFixture;
  const content = client ? <ClientDetail fixture={clientFixture} /> : view === "resumen" ? <Overview data={data} onRefresh={() => {}} preview /> : view === "conciliacion" ? <PaymentReview data={data} onRefresh={() => {}} onConfirm={async () => false} preview /> : ["tesoreria", "proveedores", "resultados"].includes(view) ? <FinancialCoverage module={view as FinancialModule} preview /> : <Dashboard data={data} onRefresh={() => {}} onConfirm={() => {}} preview />;
  return <div className="preview-layout"><div className="preview-banner">Vista de prueba · datos sintéticos · acciones de escritura deshabilitadas</div><div className="shell"><Sidebar email="administracion@ejemplo.local" rol="auditor" preview /><main className="content">{content}</main></div></div>;
}

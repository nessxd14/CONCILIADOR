"use client";
import { useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { ClientDetail } from "@/components/ClientDetail";
import { Sidebar } from "@/components/Sidebar";
import { Overview } from "@/components/Overview";
import { PaymentReview } from "@/components/PaymentReview";
import { FinancialCoverage, type FinancialModule } from "@/components/FinancialCoverage";
import { dashboardFixture, clientFixture, actividadFixture } from "./preview-data";
import { useSearchParams } from "next/navigation";
import { hoyLocal, type PeriodoActividad } from "@/lib/fechas";

export function Preview({ client = false, view = "dia" }: { client?: boolean; view?: string }) {
  const params = useSearchParams();
  const state = params.get("estado");
  // El período no filtra datos de verdad en la vista de prueba: la
  // actividad sintética es estática, no toca la red.
  const [periodo, setPeriodo] = useState<PeriodoActividad>("24h");
  const [desde, setDesde] = useState(hoyLocal());
  const [hasta, setHasta] = useState(hoyLocal());
  const data = state === "vacio" ? { ...dashboardFixture, saldos: [], bloqueados: [], pagos: [], vencidas: { monto: "0.00", clientes: 0 } } : state === "error" ? { ...dashboardFixture, saldos: [], bloqueados: [], pagos: [], vencidas: null, errorVencidas: "No se pudo consultar vencimientos.", errorSaldos: "No se pudo conectar. Reintenta.", error: "Sin conexión", errorPagos: "No se pudo consultar los pagos." } : state === "cargando" ? { ...dashboardFixture, cargando: true } : dashboardFixture;
  const actividad = { ...actividadFixture, cargando: false, errorPagos: null, errorPedidos: null, recargar: () => {} };
  const content = client ? <ClientDetail fixture={clientFixture} /> : view === "resumen" ? <Overview data={data} onRefresh={() => {}} preview /> : view === "conciliacion" ? <PaymentReview data={data} onRefresh={() => {}} onConfirm={async () => false} preview /> : ["tesoreria", "proveedores", "resultados"].includes(view) ? <FinancialCoverage module={view as FinancialModule} preview /> : <Dashboard data={data} onRefresh={() => {}} onConfirm={() => {}} preview
      actividad={actividad} periodo={periodo} onPeriodoChange={setPeriodo} desde={desde} hasta={hasta} onDesdeChange={setDesde} onHastaChange={setHasta} />;
  return <div className="preview-layout"><div className="preview-banner">Vista de prueba · datos sintéticos · acciones de escritura deshabilitadas</div><div className="shell"><Sidebar email="administracion@ejemplo.local" rol="auditor" preview /><main className="content">{content}</main></div></div>;
}

"use client";
import { Dashboard } from "@/components/Dashboard";
import { useCartera } from "@/lib/use-cartera";
export default function MiDiaPage() {
  const { data, cargar, confirmarPago } = useCartera();
  return <Dashboard data={data} onRefresh={cargar} onConfirm={confirmarPago} />;
}

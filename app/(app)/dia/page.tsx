"use client";
import { useMemo, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { useCartera } from "@/lib/use-cartera";
import { useActividad } from "@/lib/use-actividad";
import { hoyLocal, type PeriodoActividad } from "@/lib/fechas";

export default function MiDiaPage() {
  const { data, cargar, confirmarPago } = useCartera();
  const [periodo, setPeriodo] = useState<PeriodoActividad>("24h");
  const [desde, setDesde] = useState(hoyLocal());
  const [hasta, setHasta] = useState(hoyLocal());

  const rangoPersonalizado = useMemo(() => ({ desde, hasta }), [desde, hasta]);
  const contexto = useMemo(
    () => ({ puedeConfirmar: data.puedeConfirmar, saldos: data.saldos.map((s) => ({ cliente_id: s.cliente_id, cliente: s.cliente })) }),
    [data.puedeConfirmar, data.saldos]
  );
  const actividad = useActividad(periodo, rangoPersonalizado, contexto);

  return (
    <Dashboard
      data={data}
      onRefresh={cargar}
      onConfirm={confirmarPago}
      actividad={actividad}
      periodo={periodo}
      onPeriodoChange={setPeriodo}
      desde={desde}
      hasta={hasta}
      onDesdeChange={setDesde}
      onHastaChange={setHasta}
    />
  );
}

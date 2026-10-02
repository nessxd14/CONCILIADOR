"use client";
import { obtenerSesionHermes } from "@/lib/supabase/session";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHermesRefresh } from "@/lib/supabase/use-refresh";
import { Dashboard, type DashboardData } from "@/components/Dashboard";
import { puedeConfirmarPagos } from "@/lib/roles";
import type { PagoPropuesto, VSaldoCliente } from "@/lib/types";

export default function MiDiaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<DashboardData>({ saldos: [], bloqueados: [], pagos: [], cargando: true, error: null, errorSaldos: null, errorPagos: null, puedeConfirmar: false, actualizado: null });
  const [usuario, setUsuario] = useState("desconocido");
  const [confirmando, setConfirmando] = useState<Record<number, boolean>>({});
  const [erroresPago, setErroresPago] = useState<Record<number, string>>({});

  async function leerSaldos() {
    const rows: VSaldoCliente[] = [];
    for (let offset = 0; ; offset += 1000) {
      const res = await supabase.from("v_saldo_cliente").select("*").order("cliente").order("cliente_id").range(offset, offset + 999);
      if (res.error) return { data: null, error: res.error };
      rows.push(...(res.data ?? []) as VSaldoCliente[]);
      if ((res.data?.length ?? 0) < 1000) return { data: rows, error: null };
    }
  }
  useHermesRefresh(cargar);
  async function cargar() {
    setData(prev => ({ ...prev, cargando: true, error: null, errorSaldos: null, errorPagos: null }));
    try {
      const [userRes, saldosRes, bloqueadosRes] = await Promise.all([
        obtenerSesionHermes(supabase), leerSaldos(),
        supabase.from("v_cobros_bloqueados").select("*").order("dias_maximo", { ascending: false }),
      ]);
      if (userRes.error) throw new Error(userRes.error.message);
      const gerente = puedeConfirmarPagos(userRes.data.rol);
      setUsuario(userRes.data.user?.email ?? "desconocido");
      let pagos: PagoPropuesto[] = [];
      let errorPagos: string | null = null;
      if (gerente) {
        const res = await supabase.from("pago").select("id, cliente_id, monto, medio, referencia, creado_por, creado_en").eq("estado", "PROPUESTO").order("creado_en", { ascending: true });
        if (res.error) errorPagos = res.error.message;
        else if (res.data?.length) {
          const namesRes = await supabase.from("cliente").select("id, nombre").in("id", [...new Set(res.data.map(p => p.cliente_id))]);
          const names = new Map((namesRes.data ?? []).map(c => [c.id, c.nombre]));
          pagos = res.data.map(p => ({ ...p, cliente: names.get(p.cliente_id) ?? `Cliente #${p.cliente_id}` })) as PagoPropuesto[];
        }
      }
      setData({ saldos: saldosRes.data ?? [], bloqueados: bloqueadosRes.data ?? [], pagos, puedeConfirmar: gerente, cargando: false,
        error: bloqueadosRes.error?.message ?? null, errorSaldos: saldosRes.error?.message ?? null, errorPagos,
        actualizado: new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", timeZone: "America/La_Paz" }) });
    } catch {
      setData(prev => ({ ...prev, cargando: false, saldos: [], bloqueados: [], pagos: [], error: "No se pudo conectar. Reintenta la consulta.", errorSaldos: "No se pudo conectar. Reintenta la consulta.", errorPagos: "No se pudo conectar. Reintenta la consulta.", actualizado: null }));
    }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supabase]);
  async function confirmarPago(pago: PagoPropuesto) {
    setConfirmando(prev => ({ ...prev, [pago.id]: true }));
    setErroresPago(prev => ({ ...prev, [pago.id]: "" }));
    try {
      const { error } = await supabase.rpc("confirmar_pago", { p_pago_id: pago.id, p_usuario: usuario });
      if (error) throw error;
      await cargar();
    } catch (error) { setErroresPago(prev => ({ ...prev, [pago.id]: error instanceof Error ? error.message : "No se pudo confirmar el pago. Reintenta." })); }
    finally { setConfirmando(prev => ({ ...prev, [pago.id]: false })); }
  }
  return <Dashboard data={data} onRefresh={cargar} onConfirm={confirmarPago} confirmando={confirmando} erroresPago={erroresPago} />;
}

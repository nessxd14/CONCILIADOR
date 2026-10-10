"use client";
import { obtenerSesionHermes } from "@/lib/supabase/session";
import { useEffect, useMemo, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHermesRefresh } from "@/lib/supabase/use-refresh";
import { type DashboardData } from "@/components/Dashboard";
import { puedeConfirmarPagos } from "@/lib/roles";
import { CATEGORIAS_CONCILIADOR, type PagoPropuesto, type VSaldoCliente, type VCobrosBloqueados } from "@/lib/types";
import { leerPaginas } from "./paginate";
import { resumirVencidas } from "./cartera";

export function useCartera(revisionEnCurso = false) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<DashboardData>({ saldos: [], bloqueados: [], pagos: [], cargando: true, error: null, errorSaldos: null, errorPagos: null, puedeConfirmar: false, actualizado: null });
  const [usuario, setUsuario] = useState("desconocido");
  const [confirmando, setConfirmando] = useState<Record<number, boolean>>({});
  const [erroresPago, setErroresPago] = useState<Record<number, string>>({});

  const lecturaActual = useRef<Promise<void> | null>(null);

  async function leerSaldos() {
    const rows: VSaldoCliente[] = [];
    for (let offset = 0; ; offset += 1000) {
      const res = await supabase.from("v_saldo_cliente").select("*").in("categoria", [...CATEGORIAS_CONCILIADOR]).order("cliente").order("cliente_id").range(offset, offset + 999);
      if (res.error) return { data: null, error: res.error };
      rows.push(...(res.data ?? []) as VSaldoCliente[]);
      if ((res.data?.length ?? 0) < 1000) return { data: rows, error: null };
    }
  }
  useHermesRefresh(() => cargar(true), !revisionEnCurso && !Object.values(confirmando).some(Boolean));
  function cargar(enSegundoPlano = false): Promise<void> {
    if (lecturaActual.current) return enSegundoPlano ? lecturaActual.current : lecturaActual.current.then(() => cargar(false));
    const consulta = consultar(enSegundoPlano);
    lecturaActual.current = consulta;
    void consulta.finally(() => { if (lecturaActual.current === consulta) lecturaActual.current = null; });
    return consulta;
  }
  async function consultar(enSegundoPlano: boolean) {
    setData(prev => ({ ...prev, cargando: enSegundoPlano ? prev.cargando : true, error: null, errorSaldos: null, errorPagos: null }));
    try {
      const [userRes, saldosRes, bloqueadosRes, vencidasRes] = await Promise.all([
        obtenerSesionHermes(supabase), leerSaldos(),
        leerPaginas<VCobrosBloqueados>(fromToBloqueados),
        leerPaginas<{ partida_id: number; cliente_id: number; saldo_partida: string }>((from, to) => supabase.from("v_partidas_frenadas").select("partida_id, cliente_id, saldo_partida").eq("motivo", "VENCIDA").order("partida_id").range(from, to)),
      ]);
      if (userRes.error) throw new Error(userRes.error.message);
      const gerente = puedeConfirmarPagos(userRes.data.rol);
      setUsuario(userRes.data.user?.email ?? "desconocido");
      let pagos: PagoPropuesto[] = [];
      let errorPagos: string | null = null;
      if (gerente) {
        const res = await leerPaginas<Omit<PagoPropuesto, "cliente">>((from, to) => supabase.from("pago").select("id, cliente_id, monto, medio, referencia, creado_por, creado_en").eq("estado", "PROPUESTO").order("creado_en", { ascending: true }).order("id").range(from, to));
        if (res.error) errorPagos = res.error.message;
        else if (res.data?.length) {
          const names = new Map(saldosRes.data?.map(c => [c.cliente_id, c.cliente]) ?? []);
          pagos = res.data.map(p => ({ ...p, cliente: names.get(p.cliente_id) ?? `Cliente #${p.cliente_id}` })) as PagoPropuesto[];
        }
      }
      setData({ saldos: saldosRes.data ?? [], bloqueados: bloqueadosRes.data ?? [], pagos, puedeConfirmar: gerente, cargando: false,
        error: bloqueadosRes.error?.message ?? null, errorSaldos: saldosRes.error?.message ?? null, errorPagos,
        vencidas: vencidasRes.error ? null : resumirVencidas(vencidasRes.data ?? []), errorVencidas: vencidasRes.error?.message ?? null,
        actualizado: new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", timeZone: "America/La_Paz" }) });
    } catch {
      setData(prev => ({ ...prev, cargando: false, saldos: [], bloqueados: [], pagos: [], vencidas: null, errorVencidas: "No se pudo consultar vencimientos.", error: "No se pudo conectar. Reintenta la consulta.", errorSaldos: "No se pudo conectar. Reintenta la consulta.", errorPagos: "No se pudo conectar. Reintenta la consulta.", actualizado: null }));
    }
  }
  function fromToBloqueados(from: number, to: number) {
    return supabase.from("v_cobros_bloqueados").select("*").order("dias_maximo", { ascending: false }).order("cliente_id").range(from, to);
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supabase]);
  async function confirmarPago(pago: PagoPropuesto) {
    setConfirmando(prev => ({ ...prev, [pago.id]: true }));
    setErroresPago(prev => ({ ...prev, [pago.id]: "" }));
    try {
      const { error } = await supabase.rpc("confirmar_pago", { p_pago_id: pago.id, p_usuario: usuario });
      if (error) throw error;
      await cargar();
      return true;
    } catch (error) { setErroresPago(prev => ({ ...prev, [pago.id]: error instanceof Error ? error.message : "No se pudo confirmar el pago. Reintenta." })); return false; }
    finally { setConfirmando(prev => ({ ...prev, [pago.id]: false })); }
  }
  return { data, cargar, confirmarPago, confirmando, erroresPago };
}

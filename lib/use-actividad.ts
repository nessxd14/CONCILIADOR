"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHermesRefresh } from "@/lib/supabase/use-refresh";
import { calcularRangoActividad, type PeriodoActividad } from "./fechas";
import { leerPaginas } from "./paginate";
import type { CategoriaCliente, EstadoPago, EstadoPartida, MedioPago } from "./types";

export interface RangoPersonalizado {
  desde: string;
  hasta: string;
}

export interface PagoActividad {
  id: number;
  cliente_id: number;
  cliente: string;
  monto: string;
  medio: MedioPago;
  estado: EstadoPago;
  referencia: string | null;
  creado_por: string;
  creado_en: string;
  confirmado_en: string | null;
}

export interface PedidoActividad {
  id: number;
  cliente_id: number;
  cliente_nombre: string;
  cliente_categoria: CategoriaCliente;
  pedido_id: number | null;
  referencia: string | null;
  documento_interno: string;
  total: string;
  estado: EstadoPartida;
  creado_en: string;
  fecha_entrega: string | null;
}

export interface ContextoActividad {
  /** Mismo gate de "Mi día": solo gerente/admin ven y consultan pagos. */
  puedeConfirmar: boolean;
  /** Mapa de nombres ya cargado por useCartera; retail queda afuera de ahí a propósito. */
  saldos: { cliente_id: number; cliente: string }[];
}

type FilaPago = Omit<PagoActividad, "cliente">;

/**
 * Pagos y pedidos recientes para el panel "Actividad reciente" de Mi día.
 * Consultas propias, no las de useCartera: el período se elige acá y no
 * debe disparar la consulta de saldos.
 *
 * "Últimas 24 horas" es una ventana móvil: el límite inferior se recalcula
 * en cada consulta (acá, vía rangoActual()), no una sola vez al elegir el
 * período. Si se calculara en un useMemo en el componente que llama a este
 * hook, el límite quedaría fijo en el momento en que se eligió "24h" y
 * nunca avanzaría entre refrescos.
 */
export function useActividad(
  periodo: PeriodoActividad,
  rangoPersonalizado: RangoPersonalizado | undefined,
  contexto: ContextoActividad
) {
  const supabase = useMemo(() => createClient(), []);
  const [pagos, setPagos] = useState<PagoActividad[]>([]);
  const [pedidos, setPedidos] = useState<PedidoActividad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorPagos, setErrorPagos] = useState<string | null>(null);
  const [errorPedidos, setErrorPedidos] = useState<string | null>(null);

  const contextoRef = useRef(contexto);
  contextoRef.current = contexto;
  // Leídos de un ref (no de una variable cerrada por la consulta) para que
  // cada ejecución de consultar() recalcule el rango con la hora actual, sin
  // que cambiarlos dispare el efecto por sí solos salvo cuando sí deben.
  const periodoRef = useRef(periodo);
  periodoRef.current = periodo;
  const rangoPersonalizadoRef = useRef(rangoPersonalizado);
  rangoPersonalizadoRef.current = rangoPersonalizado;
  const lecturaActual = useRef<Promise<void> | null>(null);

  function recargar(enSegundoPlano = false): Promise<void> {
    if (lecturaActual.current) {
      return enSegundoPlano ? lecturaActual.current : lecturaActual.current.then(() => recargar(false));
    }
    const consulta = consultar(enSegundoPlano);
    lecturaActual.current = consulta;
    void consulta.finally(() => {
      if (lecturaActual.current === consulta) lecturaActual.current = null;
    });
    return consulta;
  }

  function rangoActual() {
    return calcularRangoActividad(
      periodoRef.current,
      periodoRef.current === "rango" ? rangoPersonalizadoRef.current : undefined
    );
  }

  async function consultarPedidos() {
    const rango = rangoActual();
    const res = await leerPaginas<PedidoActividad>((from, to) => {
      let q = supabase
        .from("partida_abierta")
        .select("id, cliente_id, cliente_nombre, cliente_categoria, pedido_id, referencia, documento_interno, total, estado, creado_en, fecha_entrega")
        .gte("creado_en", rango.desde)
        .is("parent_partida_id", null)
        .order("creado_en", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
      if (rango.hasta) q = q.lt("creado_en", rango.hasta);
      return q;
    });
    if (res.error) {
      setErrorPedidos(res.error.message);
      setPedidos([]);
    } else {
      setErrorPedidos(null);
      setPedidos(res.data ?? []);
    }
  }

  async function consultarPagos() {
    const { puedeConfirmar, saldos } = contextoRef.current;
    if (!puedeConfirmar) {
      setErrorPagos(null);
      setPagos([]);
      return;
    }

    const rango = rangoActual();
    const res = await leerPaginas<FilaPago>((from, to) => {
      // Excluye la regularización masiva del 2026-10-07: no fueron cobros reales.
      let q = supabase
        .from("pago")
        .select("id, cliente_id, monto, medio, estado, referencia, creado_por, creado_en, confirmado_en")
        .gte("creado_en", rango.desde)
        .or("idempotencia_clave.is.null,idempotencia_clave.not.like.regularizacion-*")
        .order("creado_en", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
      if (rango.hasta) q = q.lt("creado_en", rango.hasta);
      return q;
    });

    if (res.error) {
      setErrorPagos(res.error.message);
      setPagos([]);
      return;
    }

    const filas = res.data ?? [];
    const porId = new Map(saldos.map((s) => [s.cliente_id, s.cliente]));
    const faltantes = [...new Set(filas.map((p) => p.cliente_id).filter((id) => !porId.has(id)))];

    let nombresFaltantes = new Map<number, string>();
    if (faltantes.length > 0) {
      const { data } = await supabase.from("cliente").select("id, nombre").in("id", faltantes);
      nombresFaltantes = new Map((data ?? []).map((c) => [c.id as number, c.nombre as string]));
    }

    setErrorPagos(null);
    setPagos(
      filas.map((p) => ({
        ...p,
        cliente: porId.get(p.cliente_id) ?? nombresFaltantes.get(p.cliente_id) ?? `Cliente #${p.cliente_id}`,
      }))
    );
  }

  async function consultar(enSegundoPlano: boolean) {
    if (!enSegundoPlano) setCargando(true);
    await Promise.all([consultarPedidos(), consultarPagos()]);
    setCargando(false);
  }

  useHermesRefresh(() => recargar(true));
  useEffect(() => {
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, periodo, rangoPersonalizado?.desde, rangoPersonalizado?.hasta, contexto.puedeConfirmar]);

  return { pagos, pedidos, cargando, errorPagos, errorPedidos, recargar: () => recargar() };
}

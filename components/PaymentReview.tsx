"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { formatBs } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { abrirArchivo } from "@/lib/uploads";
import type { PagoPropuesto } from "@/lib/types";
import type { DashboardData } from "./Dashboard";
import { DashboardHeader } from "./CarteraSummary";
import { Icon } from "./Icon";
import Decimal from "decimal.js";

export function PaymentReview({ data, onRefresh, onConfirm, confirmando = {}, erroresPago = {}, preview = false, initialId, onEditing }: {
  data: DashboardData; onRefresh: () => void; onConfirm: (pago: PagoPropuesto) => Promise<boolean>;
  confirmando?: Record<number, boolean>; erroresPago?: Record<number, string>; preview?: boolean; initialId?: number; onEditing?: (editing: boolean) => void;
}) {
  const detailRef = useRef<HTMLElement>(null);
  const [id, setId] = useState<number | null>(initialId ?? null);
  const [busqueda, setBusqueda] = useState("");
  const [medio, setMedio] = useState("");
  const [revisado, setRevisado] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [evidencia, setEvidencia] = useState<{ path: string; nombre: string } | null>(null);
  const [cargandoEvidencia, setCargandoEvidencia] = useState(false);
  const [errorEvidencia, setErrorEvidencia] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState(false);
  const filtrados = useMemo(() => data.pagos.filter(p => (!medio || p.medio === medio) && `${p.cliente} ${p.referencia ?? ""}`.toLocaleLowerCase("es").includes(busqueda.trim().toLocaleLowerCase("es"))), [data.pagos, medio, busqueda]);
  const selected = data.pagos.find(p => p.id === id);
  useEffect(() => { if (id != null && window.matchMedia?.("(max-width: 1000px)").matches) detailRef.current?.focus(); }, [id]);
  useEffect(() => { onEditing?.(revisado); return () => onEditing?.(false); }, [revisado, onEditing]);
  useEffect(() => {
    setRevisado(false); setEvidencia(null); setErrorEvidencia(null); setCargandoEvidencia(false);
    if (!selected || preview) return;
    let active = true;
    setCargandoEvidencia(true);
    const supabase = createClient();
    void supabase.from("v_anticipo_cliente").select("comprobante_path, comprobante_nombre").eq("pago_id", selected.id).maybeSingle().then(({ data: comprobante, error }) => {
      if (!active) return;
      if (error) setErrorEvidencia("No pudimos consultar el comprobante. Revisa la ficha del cliente.");
      else if (comprobante?.comprobante_path) setEvidencia({ path: comprobante.comprobante_path, nombre: comprobante.comprobante_nombre ?? "Comprobante" });
      setCargandoEvidencia(false);
    });
    return () => { active = false; };
  }, [selected?.id, selected?.monto, selected?.referencia, preview]);

  async function abrirComprobante() {
    if (!evidencia || preview) return;
    const ventana = window.open("about:blank", "_blank");
    if (ventana) ventana.opener = null;
    setAbriendo(true); setErrorEvidencia(null);
    try {
      const url = await abrirArchivo(createClient(), evidencia.path);
      if (!url) throw new Error("No pudimos abrir el comprobante. Reintenta desde la ficha del cliente.");
      if (ventana) ventana.location.href = url;
      else { setErrorEvidencia("Tu navegador bloqueó la apertura. Permite ventanas emergentes para Hermes y reintenta."); }
    } catch (err) { ventana?.close(); setErrorEvidencia(err instanceof Error ? err.message : "No pudimos abrir el comprobante."); }
    finally { setAbriendo(false); }
  }

  async function confirmar() {
    if (!selected || !revisado || preview || confirmando[selected.id]) return;
    if (await onConfirm(selected)) { setSuccess(`Pago de ${selected.cliente} verificado. El saldo contable se actualizó.`); setRevisado(false); setId(null); }
  }

  return <div className="payment-review">
    <DashboardHeader title="Verificación de pagos" subtitle="Pagos registrados en Seller, pendientes de verificación." cargando={data.cargando} preview={preview} onRefresh={onRefresh} />
    {data.puedeConfirmar && <section className="balance-strip unavailable-metrics" aria-label="Estado de verificación"><div><span>Por verificar</span><div className="metric-value money-provisional"><Icon name="alert" size={32} /><strong>{data.cargando || data.errorPagos ? "—" : formatBs(data.pagos.reduce((sum, p) => sum.plus(p.monto), new Decimal(0)).toFixed(2))}</strong></div><small>{data.errorPagos ? "Consulta no disponible" : `${data.pagos.length} pagos registrados`}</small></div><div><span>Verificados</span><div className="metric-value money-favor"><Icon name="wallet" size={32} /><strong>En cada cuenta</strong></div><small>Consulta los movimientos de la ficha</small></div><div><span>Conciliación bancaria</span><div className="metric-value money-overdue"><Icon name="clock" size={32} /><strong>Pendiente de integrar</strong></div><small>Falta contrastar movimientos bancarios</small></div></section>}
    <div className="bank-integration-note"><Icon name="clock" size={20} /><span><strong>Conciliación bancaria pendiente de integrar.</strong> Verificar un pago actualiza la cuenta del cliente; contrastar el movimiento bancario requiere una fuente adicional.</span></div>
    {success && <div className="banner-success" role="status"><Icon name="check" />{success}</div>}
    {!data.puedeConfirmar ? <section className="glass-panel empty-state"><Icon name="lock" /><h3>Acceso de gerencia</h3><p>Tu rol puede consultar las cuentas. La verificación de pagos corresponde al gerente o administrador.</p><Link className="btn btn-secondary" href="/clientes">Consultar clientes</Link></section>
    : <div className="review-layout"><section className="ledger-panel"><div className="section-heading"><h2>Pagos por verificar</h2><span className="quiet-count">{data.errorPagos || data.cargando ? "—" : `${data.pagos.length} registrados`}</span></div>
      <div className="filter-bar"><label className="search-field"><Icon name="search" size={18} /><input aria-label="Buscar pago por cliente o referencia" placeholder="Cliente o referencia…" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label><select className="select" aria-label="Filtrar por medio de pago" value={medio} onChange={e => setMedio(e.target.value)}><option value="">Todos los medios</option>{Array.from(new Set(data.pagos.map(p => p.medio))).sort().map(m => <option key={m}>{m}</option>)}</select></div>
      {data.errorPagos ? <div className="empty-state" role="alert"><h3>No pudimos consultar los pagos</h3><p>{data.errorPagos}</p><button className="btn btn-secondary" onClick={onRefresh}>Reintentar</button></div> : data.cargando ? <div className="loading-state" role="status">Consultando pagos…</div> : filtrados.length === 0 ? <div className="empty-state"><Icon name="check" /><h3>{data.pagos.length ? "No encontramos ese pago" : "Todo verificado"}</h3><p>{data.pagos.length ? "Prueba con otro cliente, referencia o medio." : "No hay pagos pendientes de verificación."}</p></div> : <div className="review-list">{filtrados.map(p => <button type="button" className={`review-row ${selected?.id === p.id ? "selected" : ""}`} key={p.id} aria-pressed={selected?.id === p.id} disabled={Boolean(selected && confirmando[selected.id])} onClick={() => { setId(p.id); setRevisado(false); setSuccess(null); }}><span><strong>{p.cliente}</strong><small>{p.medio} · {p.referencia ?? "Sin referencia"}</small></span><span><strong className="money-provisional">{formatBs(p.monto)}</strong><small>Por verificar</small></span><Icon name="arrow" size={16} /></button>)}</div>}
      <div className="panel-footer"><span>La recepción está registrada; falta validar el pago.</span></div>
    </section>
    <aside ref={detailRef} tabIndex={-1} className="glass-panel review-detail" aria-label="Detalle del pago seleccionado">
      {!selected ? <div className="empty-state"><Icon name="receipt" size={32} /><h3>Selecciona un pago</h3><p>Consulta su origen, referencia y comprobante antes de verificarlo.</p></div> : <>
        <div className="section-heading"><h2>Detalle del pago</h2><span className="badge badge-provisional">Por verificar</span></div><h3>{selected.cliente}</h3><div className="review-amount">{formatBs(selected.monto)}</div>
        <ol className="payment-progress"><li><Icon name="check" />Registrado</li><li><Icon name="clock" />Verificación pendiente</li><li><Icon name="lock" />Conciliación bancaria pendiente</li></ol><dl className="payment-facts"><div><dt>Medio</dt><dd>{selected.medio}</dd></div><div><dt>Referencia</dt><dd>{selected.referencia ?? "Sin referencia"}</dd></div><div><dt>Registrado por</dt><dd>{selected.creado_por.replace(/^pos:/, "")}</dd></div><div><dt>Fecha de registro</dt><dd>{new Date(selected.creado_en).toLocaleString("es-BO", { timeZone: "America/La_Paz" })}</dd></div></dl>
        <div className="receipt-state"><Icon name="receipt" size={21} /><div><strong>Comprobante</strong><p>{cargandoEvidencia ? "Consultando respaldo…" : evidencia ? evidencia.nombre : preview ? "Comprobante de ejemplo · acciones deshabilitadas" : "Sin comprobante disponible en Hermes. Revisa el respaldo en la ficha o en Seller."}</p>{evidencia && <button className="btn btn-secondary" disabled={abriendo} onClick={abrirComprobante}>{abriendo ? "Abriendo…" : "Abrir comprobante"}</button>}</div></div>
        {errorEvidencia && <p className="field-error" role="alert">{errorEvidencia}</p>}
        <Link className="btn btn-secondary" href={preview ? "/vista-previa/cliente" : `/clientes/${selected.cliente_id}`}>Abrir ficha del cliente<Icon name="arrow" size={16} /></Link>
        <label className="verify-check"><input type="checkbox" checked={revisado} disabled={preview || confirmando[selected.id] || cargandoEvidencia} onChange={e => setRevisado(e.target.checked)} /><span>Verifiqué la recepción del pago y que el importe corresponde a esta cuenta.</span></label>
        <button type="button" className="btn btn-primary verify-button" disabled={preview || !revisado || confirmando[selected.id]} onClick={() => void confirmar()}><Icon name="check" size={17} />{confirmando[selected.id] ? "Verificando…" : "Verificar pago"}</button><p className="field-hint">Esta acción actualizará el saldo contable del cliente.</p>
        {erroresPago[selected.id] && <p className="field-error" role="alert">{erroresPago[selected.id]}</p>}
      </>}
    </aside></div>}
  </div>;
}

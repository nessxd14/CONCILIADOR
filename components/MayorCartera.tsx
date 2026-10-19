"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icon";
import { formatBs } from "@/lib/money";
import { csvMayor, nombresMayor, type InformeMayor } from "@/lib/mayor-cartera";
import type { TipoMovimiento } from "@/lib/types";

const fecha = (value: string) => value.split('-').reverse().join('/');
export function MayorCartera({ informe, consultadoEn, preview = false }: { informe: InformeMayor; consultadoEn: string; preview?: boolean }) {
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");
  const [pagina, setPagina] = useState(0);
  const [abierto, setAbierto] = useState<number | null>(null);
  const { resumen: r, filas } = informe;
  const filtradas = useMemo(() => filas.filter(m => (!tipo || m.tipo === tipo)
    && [m.cliente, m.documento_interno, m.referencia, m.motivo, m.creado_por, nombresMayor[m.tipo]]
      .filter(Boolean).join(' ').toLocaleLowerCase('es').includes(busqueda.trim().toLocaleLowerCase('es'))), [filas, tipo, busqueda]);
  const paginaActual = Math.min(pagina, Math.max(0, Math.ceil(filtradas.length / 50) - 1));
  const visibles = filtradas.slice(paginaActual * 50, (paginaActual + 1) * 50);
  function exportar() {
    const url = URL.createObjectURL(new Blob([csvMayor(filtradas)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `mayor-cartera-${informe.filtro.desde}-${informe.filtro.hasta}.csv`;
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <>
    <section className="mayor-summary" aria-label="Evolución del saldo por cobrar">
      {[
        { label: 'Saldo inicial por cobrar', value: r.inicial, note: `Antes del ${fecha(informe.filtro.desde)}`, tone: '' },
        { label: 'Aumentó la deuda', value: r.aumento_deuda, note: 'Cargos que generan deuda pendiente', tone: 'money-overdue' },
        { label: 'Disminuyó la deuda', value: r.reduccion_deuda, note: 'Pagos, créditos y otros abonos', tone: 'money-favor' },
        { label: 'Saldo final por cobrar', value: r.final, note: `${r.clientes_con_deuda} ${r.clientes_con_deuda === 1 ? 'cliente' : 'clientes'} con deuda al cierre`, tone: '' },
      ].map(c => <article className="glass-panel mayor-metric" key={c.label}><span>{c.label}</span><strong className={c.tone}>{formatBs(c.value)}</strong><small>{c.note}</small></article>)}
    </section>
    <section className="glass-panel mayor-bridge" aria-label="Saldos y movimientos contables">
      <div><span>Saldo a favor de clientes</span><strong>{formatBs(r.favor_inicial)} <span aria-label="pasa a">→</span> {formatBs(r.favor_final)}</strong><small>Se conserva separado de lo pendiente por cobrar.</small></div>
      <div><span>Movimientos del período</span><strong>{formatBs(r.cargos)} en cargos · {formatBs(r.abonos)} en abonos</strong><small>Incluyen aperturas, anticipos, regularizaciones y ajustes.</small></div>
      <p>Inicial por cobrar + aumento de deuda − disminución de deuda = final por cobrar. Un abono que genera saldo a favor solo reduce la deuda que existía.</p>
    </section>
    <section className="ledger-panel mayor-ledger">
      <div className="section-heading"><div><h2>Movimientos de la cartera</h2><p>Ordenados por fecha efectiva. Abre una fila para revisar su motivo y responsable.</p></div><button className="btn btn-secondary" type="button" disabled={!filtradas.length} onClick={exportar}><Icon name="book" size={16} />Exportar CSV</button></div>
      <div className="filter-bar"><label className="search-field"><Icon name="search" size={18} /><input aria-label="Buscar en movimientos" placeholder="Cliente, documento, referencia o usuario…" value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(0); }} /></label><select className="select" aria-label="Tipo de movimiento" value={tipo} onChange={e => { setTipo(e.target.value); setPagina(0); }}><option value="">Todos los movimientos</option>{Object.entries(nombresMayor).map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></div>
      <p className="mayor-filter-note">{filtradas.length} de {filas.length} movimientos. Buscar o filtrar por tipo cambia la lista; los saldos conservan todos los movimientos del período y los clientes seleccionados.</p>
      {!filtradas.length ? <div className="empty-state"><Icon name="book" size={30} /><h3>{filas.length ? 'Sin coincidencias' : 'Sin movimientos en este período'}</h3><p>{filas.length ? 'Prueba otro texto o tipo de movimiento.' : 'El saldo inicial y final conserva la deuda previa, aunque no haya movimientos nuevos.'}</p></div> : <div className="mayor-table-scroll"><table className="table mayor-table"><thead><tr><th>Fecha / movimiento</th><th>Cliente / documento</th><th className="numeric">Cargo</th><th className="numeric">Abono</th><th className="numeric">Saldo del cliente</th><th className="numeric">Por cobrar de la selección</th><th><span className="sr-only">Detalle</span></th></tr></thead><tbody>{visibles.map(m => <Fragment key={m.id}>
        <tr><td><span>{fecha(m.fecha_efectiva)}</span><small>{nombresMayor[m.tipo as TipoMovimiento]}</small></td><td><strong>{m.cliente}</strong><small>{m.documento_interno ?? 'Sin partida asociada'}</small></td><td className="numeric">{m.cargo === '0.00' ? '—' : formatBs(m.cargo)}</td><td className="numeric money-favor">{m.abono === '0.00' ? '—' : formatBs(m.abono)}</td><td className="numeric">{formatBs(m.saldo_cliente_despues)}{m.saldo_cliente_despues.startsWith('-') && <small>A favor</small>}</td><td className="numeric"><strong>{formatBs(m.por_cobrar_despues)}</strong></td><td><button type="button" className="icon-button" aria-label={`Detalle del movimiento ${m.id}`} aria-expanded={abierto === m.id} aria-controls={`mayor-detalle-${m.id}`} onClick={() => setAbierto(abierto === m.id ? null : m.id)}><Icon name={abierto === m.id ? 'back' : 'arrow'} size={17} /></button></td></tr>
        {abierto === m.id && <tr id={`mayor-detalle-${m.id}`} className="mayor-detail-row"><td colSpan={7}><div className="mayor-detail"><dl><div><dt>Movimiento</dt><dd>#{m.id} · {nombresMayor[m.tipo]}</dd></div><div><dt>Registrado por</dt><dd>{m.creado_por || 'Usuario no registrado'}</dd></div><div><dt>Registro</dt><dd>{m.creado_en ? new Date(m.creado_en).toLocaleString('es-BO', { timeZone: 'America/La_Paz' }) : 'Fecha no registrada'}</dd></div><div><dt>Referencia</dt><dd>{m.referencia ?? 'Sin referencia'}</dd></div><div><dt>Motivo</dt><dd>{m.motivo ?? 'Motivo no registrado'}</dd></div><div><dt>Saldo de este cliente</dt><dd>{formatBs(m.saldo_cliente_antes)} → {formatBs(m.saldo_cliente_despues)}</dd></div><div><dt>Cambio de lo pendiente por cobrar</dt><dd>{formatBs(m.variacion_por_cobrar)}</dd></div><div><dt>Saldo a favor global después</dt><dd>{formatBs(m.favor_despues)}</dd></div></dl>{!preview && <div className="mayor-detail-links"><Link className="btn btn-secondary" href={`/clientes/${m.cliente_id}`}>Cuenta del cliente</Link>{m.partida_id && <Link className="btn btn-secondary" href={`/clientes/${m.cliente_id}/expediente/${m.partida_id}`}>Expediente y cobros</Link>}</div>}</div></td></tr>}
      </Fragment>)}</tbody></table></div>}
      <div className="mayor-pagination"><span>{filtradas.length ? `${paginaActual * 50 + 1}–${Math.min((paginaActual + 1) * 50, filtradas.length)} de ${filtradas.length}` : '0 movimientos'}</span><button type="button" className="btn btn-secondary" disabled={paginaActual === 0} onClick={() => setPagina(paginaActual - 1)}>Anterior</button><button type="button" className="btn btn-secondary" disabled={(paginaActual + 1) * 50 >= filtradas.length} onClick={() => setPagina(paginaActual + 1)}>Siguiente</button></div>
    </section>
    <p className="mayor-footnote">Cartera del Conciliador: mayorista, institucional y corporativo. Los pagos por verificar todavía no cambian este saldo contable. Las cuentas saldadas conservan sus movimientos. Consulta: {new Date(consultadoEn).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}.</p>
  </>;
}

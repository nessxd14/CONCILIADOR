"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccessNotice } from "@/components/AccessNotice";
import { Icon } from "@/components/Icon";
import {
  aplicarFiltro, contarFiltros, detalleIdea, diaMes, enlaceWhatsApp, etiquetaEstado, etiquetaTipo, formatUltimaVez,
  PARECIDO_MINIMO, POR_PAGINA, porAvisar, resumenUnidades, siguienteCanal,
  type AccionDemanda, type AnotacionDemanda, type FiltroDemanda, type IdeaDemanda, type SimilarDemanda, type ViaCompra,
} from "@/lib/demanda";
import { decidir, leerAnotaciones, marcarAvisados, unir, urlFoto, useDemanda } from "@/lib/use-demanda";
import "./demanda.css";

const FILTROS: { id: FiltroDemanda; etiqueta: string }[] = [
  { id: "TODO", etiqueta: "Todo" },
  { id: "POR_DECIDIR", etiqueta: "Por decidir" },
  { id: "NO_LO_TENEMOS", etiqueta: "No lo tenemos" },
  { id: "SE_ACABO", etiqueta: "Se nos acabó" },
];
const ETIQUETA_CANAL = { null: "Tienda / Por mayor", TIENDA: "Solo tienda", MAYOR: "Solo por mayor" } as const;

export default function DemandaPage() {
  const { acceso, canal, setCanal, ideas, cargando, error, cargar } = useDemanda();
  const [filtro, setFiltro] = useState<FiltroDemanda>("TODO");
  const [pagina, setPagina] = useState(0);
  const [seleccion, setSeleccion] = useState<number | null>(null);

  const conteos = useMemo(() => contarFiltros(ideas), [ideas]);
  const filtradas = useMemo(() => aplicarFiltro(ideas, filtro), [ideas, filtro]);
  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, paginas - 1);
  const visibles = filtradas.slice(paginaActual * POR_PAGINA, (paginaActual + 1) * POR_PAGINA);
  const seleccionada = ideas.find((i) => i.idea_id === seleccion) ?? ideas.find((i) => i.estado === "ABIERTA") ?? null;

  if (acceso === "verificando") return <p role="status">Verificando acceso…</p>;
  if (acceso === "no") return <AccessNotice message="Solo Rony y Ness ven la demanda de clientes." />;

  return (
    <div className="demanda-page">
      <span className="breadcrumb">Compras › Demanda de clientes</span>
      <header className="page-header">
        <div>
          <h1 className="page-title">Lo que nos piden</h1>
          <p className="page-sub">Anotado por quienes atienden clientes · últimos 30 días · ordenado por cuántas veces se pidió</p>
        </div>
      </header>

      <div className="demanda-filtros">
        <div className="demanda-chips" role="group" aria-label="Filtrar demanda">
          {FILTROS.map((f) => (
            <button key={f.id} type="button" className="demanda-chip" aria-pressed={filtro === f.id}
              onClick={() => { setFiltro(f.id); setPagina(0); }}>{f.etiqueta} · {conteos[f.id]}</button>
          ))}
        </div>
        <button type="button" className="btn btn-secondary" aria-label={`Canal: ${ETIQUETA_CANAL[canal ?? "null"]}`}
          onClick={() => { setCanal(siguienteCanal(canal)); setPagina(0); }}>{ETIQUETA_CANAL[canal ?? "null"]}</button>
      </div>

      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="demanda-layout">
        <section className="card demanda-tabla" aria-busy={cargando}>
          <div className="demanda-scroll">
            <table className="demanda-table">
              <thead><tr><th>Lo que buscaron</th><th>Tipo</th><th className="num">Veces</th><th>Última vez</th><th>Estado</th></tr></thead>
              <tbody>
                {visibles.map((i) => (
                  <tr key={i.idea_id} className={`${i.estado === "ABIERTA" ? "por-decidir" : ""} ${seleccionada?.idea_id === i.idea_id ? "activa" : ""}`}>
                    <td>
                      <button type="button" className="demanda-fila-btn" aria-current={seleccionada?.idea_id === i.idea_id} onClick={() => setSeleccion(i.idea_id)}>
                        <strong>{i.titulo}</strong><small>{detalleIdea(i)}</small>
                      </button>
                    </td>
                    <td>{etiquetaTipo(i.tipo)}</td>
                    <td className="num">{i.veces}</td>
                    <td>{formatUltimaVez(i.ultima)}</td>
                    <td><span className={`badge ${i.estado === "ABIERTA" ? "badge-ambar" : i.estado === "LLEGO" ? "badge-aldia" : "badge-pendiente"}`}>{etiquetaEstado(i)}</span></td>
                  </tr>
                ))}
                {!cargando && visibles.length === 0 && <tr><td colSpan={5} className="demanda-vacio">Nada para mostrar con este filtro.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="demanda-pie">
            <span>Mostrando {visibles.length} de {filtradas.length}</span>
            <div>
              <button type="button" className="btn btn-secondary" disabled={paginaActual === 0} onClick={() => setPagina(paginaActual - 1)}>Anterior</button>
              <button type="button" className="btn btn-secondary" disabled={paginaActual >= paginas - 1} onClick={() => setPagina(paginaActual + 1)}>Siguiente</button>
            </div>
          </div>
        </section>

        {seleccionada
          ? <PanelIdea key={seleccionada.idea_id} idea={seleccionada} alCambiar={cargar} />
          : <aside className="card demanda-panel"><p className="demanda-vacio">Elige una idea para ver sus anotaciones.</p></aside>}
      </div>
    </div>
  );
}

function PanelIdea({ idea, alCambiar }: { idea: IdeaDemanda; alCambiar: () => Promise<void> }) {
  const [anotaciones, setAnotaciones] = useState<AnotacionDemanda[]>([]);
  const [similares, setSimilares] = useState<SimilarDemanda[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [descartando, setDescartando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [foto, setFoto] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      const r = await leerAnotaciones(idea.idea_id);
      setAnotaciones(r.anotaciones); setSimilares(r.similares);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo leer el detalle."); }
  }, [idea.idea_id]);
  useEffect(() => { void recargar(); }, [recargar]);

  /** Ejecuta una mutación: deshabilita botones, muestra el error en línea y refresca resumen y panel. */
  async function correr(fn: () => Promise<void>): Promise<boolean> {
    setOcupado(true); setError(null);
    try { await fn(); await Promise.all([alCambiar(), recargar()]); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar la operación."); return false; }
    finally { setOcupado(false); }
  }
  const accion = (a: AccionDemanda, via?: ViaCompra, texto?: string) => correr(() => decidir(idea.idea_id, a, via, texto));

  async function confirmarDescarte(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo.trim()) { setErrorMotivo("Escribe el motivo para descartar."); return; }
    setErrorMotivo(null);
    if (await accion("DESCARTAR", undefined, motivo.trim())) { setDescartando(false); setMotivo(""); }
  }
  async function verFoto(path: string) {
    try { setFoto(await urlFoto(path)); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo abrir la foto."); }
  }
  const alternar = (id: number) => setMarcados((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const pendientes = idea.estado === "LLEGO" ? porAvisar(anotaciones) : [];
  const similaresVisibles = similares.filter((s) => s.parecido >= PARECIDO_MINIMO);

  return (
    <aside className="card demanda-panel" aria-label="Detalle de la idea">
      <span className="badge badge-ambar">{etiquetaEstado(idea)}</span>
      <h2>{idea.titulo}</h2>
      <p className="page-sub">{idea.veces} anotaciones · {resumenUnidades(anotaciones)} · Tienda {idea.tienda}, por mayor {idea.mayor}</p>
      {error && <p className="field-error" role="alert">{error}</p>}

      <ul className="demanda-notas">
        {anotaciones.map((a) => (
          <li key={a.demanda_id}>
            <div>
              <strong>{a.cantidad_aprox ?? "?"} {a.unidad ?? "unidades"} · {a.canal === "MAYOR" ? "Por mayor" : "Tienda"}</strong>
              <small>{a.anotado_por_nombre ?? "—"} ({a.anotado_por_rol ?? "—"}) · {diaMes(a.anotado_en)}</small>
              {a.descripcion && <small>{a.descripcion}</small>}
            </div>
            <span className="badge badge-pendiente">{a.contacto_telefono ? "Con teléfono" : "Sin contacto"}</span>
            {a.foto_path && <button type="button" className="icon-button" aria-label="Ver foto" onClick={() => verFoto(a.foto_path!)}><Icon name="camera" size={18} /></button>}
          </li>
        ))}
      </ul>
      {foto && <div className="demanda-foto"><img src={foto} alt="Foto anotada por el vendedor" /><button type="button" className="btn btn-secondary" onClick={() => setFoto(null)}>Cerrar foto</button></div>}

      {similaresVisibles.map((s) => (
        <div key={s.idea_id} className="demanda-similar">
          <span>Se parece a «{s.titulo}» ({s.anotaciones} anotaciones)</span>
          <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => correr(() => unir(s.idea_id, idea.idea_id))}>Unir</button>
        </div>
      ))}

      <div className="demanda-decision">
        <h3>Traerlo por</h3>
        <div className="demanda-botones">
          <button type="button" className="btn btn-orange" disabled={ocupado} onClick={() => accion("TRAER", "OC")}>Una OC</button>
          <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => accion("TRAER", "EVENTUAL")}>Compra eventual</button>
          <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => accion("TRAER", "IMPORTACION")}>Próxima importación</button>
        </div>
        <div className="demanda-botones">
          <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => accion("SEGUIR_MIRANDO")}>Seguir mirando</button>
          <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => setDescartando(true)}>Descartar con motivo</button>
          {idea.estado === "TRAER" && <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => accion("LLEGO")}>Ya llegó</button>}
          {(idea.estado === "DESCARTADA" || idea.estado === "SEGUIR_MIRANDO") && <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => accion("REABRIR")}>Volver a abrir</button>}
        </div>
      </div>

      {pendientes.length > 0 && (
        <div className="demanda-avisar">
          <h3>Avisar a los clientes</h3>
          <ul>
            {pendientes.map((p) => {
              const nombre = p.contacto_nombre ?? "cliente";
              const link = p.contacto_telefono ? enlaceWhatsApp(p.contacto_telefono, nombre, idea.titulo) : null;
              return (
                <li key={p.demanda_id}>
                  <label><input type="checkbox" checked={marcados.has(p.demanda_id)} onChange={() => alternar(p.demanda_id)} /> {nombre} · {p.contacto_telefono ?? "sin teléfono"}</label>
                  {link && <a className="btn-link" href={link} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                </li>
              );
            })}
          </ul>
          <button type="button" className="btn btn-orange" disabled={ocupado || marcados.size === 0}
            onClick={async () => { if (await correr(() => marcarAvisados([...marcados]))) setMarcados(new Set()); }}>Marcar como avisados</button>
        </div>
      )}

      {descartando && (
        <div className="modal-overlay" onClick={ocupado ? undefined : () => setDescartando(false)}>
          <form className="card modal-card" role="dialog" aria-label="Descartar idea" onClick={(e) => e.stopPropagation()} onSubmit={confirmarDescarte} noValidate>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Descartar «{idea.titulo}»</div>
            <div className="field">
              <label htmlFor="motivo-descarte">Motivo (obligatorio)</label>
              <textarea id="motivo-descarte" className="textarea" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
            {errorMotivo && <p className="field-error" role="alert">{errorMotivo}</p>}
            {error && <p className="field-error" role="alert">{error}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => setDescartando(false)}>Cancelar</button>
              <button type="submit" className="btn btn-orange" disabled={ocupado}>{ocupado ? "Descartando…" : "Confirmar descarte"}</button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
}

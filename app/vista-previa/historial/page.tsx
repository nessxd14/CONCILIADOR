import { notFound } from "next/navigation";
import { HistorialPartida } from "@/components/HistorialPartida";
import { BajasPartidas } from "@/components/BajasPartidas";
import { clientFixture } from "../preview-data";

export default function HistorialPreview() {
  if (process.env.NODE_ENV !== "development" || process.env.HERMES_UI_PREVIEW !== "1") notFound();
  return <main className="content"><p className="preview-banner">Vista de prueba · datos sintéticos · sin escrituras</p><h1>Bajas e historial</h1>
    <BajasPartidas clienteId={1} fixture={clientFixture.bajas} />
    <HistorialPartida partidaId={901} estadoPartida="ANULADA" fixture={{
      pedido: { id: 901, numero: "Ejemplo · PED-901", estado: "CANCELADO", lineas_rechazadas: 1 },
      eventos: [
        { id: "p901", accion: "PARTIDA_ANULADA", sistema: "HERMES", motivo: "El cliente canceló el pedido antes del despacho.", usuario: "María · Gerencia (ejemplo)", usuario_id: null, fecha: "2026-10-12T14:30:00Z", pedido_linea_id: null, estado_previo: null },
        { id: "e902", accion: "ANULADO", sistema: "SELLER", motivo: "El cliente canceló el pedido antes del despacho.", usuario: "María · Gerencia (ejemplo)", usuario_id: null, fecha: "2026-10-12T14:30:00Z", pedido_linea_id: null, estado_previo: "ABIERTO" },
        { id: "e901", accion: "LINEA_RECHAZADA", sistema: "ALMACEN", motivo: "Producto sin disponibilidad. Se informó a comercial.", usuario: "Carlos · Almacén (ejemplo)", usuario_id: null, fecha: "2026-10-12T13:00:00Z", pedido_linea_id: 12, estado_previo: null },
      ],
    }} />
  </main>;
}

import type { IncidenciasFixture } from '@/components/Incidencias';
export const incidenciasFixture: IncidenciasFixture = {
 bandeja:{puede_resolver:true,total:2,items:[
  {pedido_id:21,numero:'PED-2026-021',cliente_id:1,cliente:'Distribuidora de ejemplo',estado:'CANCELADO',importe:'1000.00',motivos:['CANCELADO_CON_CARTERA']},
  {pedido_id:22,numero:'PED-2026-022',cliente_id:1,cliente:'Distribuidora de ejemplo',estado:'ABIERTO',importe:'1000.00',motivos:['RECHAZOS_PENDIENTES']},
 ]},
 detalle:{version:'ejemplo',puede_resolver:true,pedido:{id:21,numero:'PED-2026-021',cliente_id:1,cliente:'Distribuidora de ejemplo',estado:'CANCELADO',subtotal:'1000.00',total:'1000.00',recepcion:null},
  partidas:[{id:31,documento:'PA-021',total:'1000.00',aplicado:'1000.00',estado:'PAGADA',entrega:null,factura:null,cuf:null}],
  lineas:[{id:41,descripcion:'Cajas de material — presentación de ejemplo',cantidad:'10',despachada:'0',cancelable:'10',subtotal:'1000.00',estado:'RECHAZADO'}],
  pagos:[{id:51,estado:'CONFIRMADO',medio:'EFECTIVO',monto:'1000.00',devuelto:'0',referencia:'Recibo de ejemplo',aplicado_origen:'1000.00',libre:'0',de_caja:true}],
  destinos:[{id:32,documento:'PA-022',pendiente:'1500.00'}],turnos:[{id:61,caja_id:1,abierta_en:'2026-10-13T12:00:00Z',efectivo:'1800.00'}],historial:[]},
};
incidenciasFixture.detalles={21:incidenciasFixture.detalle,22:{...incidenciasFixture.detalle,
 pedido:{...incidenciasFixture.detalle.pedido,id:22,numero:'PED-2026-022',estado:'ABIERTO'},
 lineas:[{...incidenciasFixture.detalle.lineas[0],id:42,estado:'POR_DESPACHAR',despachada:'4',cancelable:'6'}],
}};

import { CATEGORIAS_CONCILIADOR } from '@/lib/types';
import type { ClienteMayor, FiltroMayor } from '@/lib/mayor-cartera';

export function FiltrosMayor({ filtro, clientes, action = '/mayor' }: { filtro: FiltroMayor; clientes: ClienteMayor[]; action?: string }) {
  return <form className="glass-panel mayor-period" action={action}>
    <label>Desde<input type="date" name="desde" required defaultValue={filtro.desde} /></label>
    <label>Hasta<input type="date" name="hasta" required defaultValue={filtro.hasta} /></label>
    <label>Categoría<select name="categoria" defaultValue={filtro.categoria ?? ''}><option value="">Toda la cartera</option>{CATEGORIAS_CONCILIADOR.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
    <label>Cliente<select name="cliente" defaultValue={filtro.clienteId ?? ''}><option value="">Todos los clientes</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
    <button className="btn btn-primary" type="submit">Consultar</button>
  </form>;
}

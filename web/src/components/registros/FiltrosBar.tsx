import type { FormEvent } from 'react';
import type { Catalogo } from '../../types';
import { fechaVisible, FILTROS_VACIOS, hayFiltros, TIPOS, type Filtros } from './format';

type FiltrosBarProps = {
  valores: Filtros;
  aplicados: Filtros;
  areas: Catalogo[];
  onChange: (valores: Filtros) => void;
  onFiltrar: (event: FormEvent) => void;
  onLimpiar: () => void;
  onQuitar: (valores: Filtros) => void;
};

export function FiltrosBar({ valores, aplicados, areas, onChange, onFiltrar, onLimpiar, onQuitar }: FiltrosBarProps) {
  const chips = chipsActivos(aplicados, areas);
  return (
    <section className="card filtros-card" aria-label="Filtros de registros">
      <form className="filtros-bar" onSubmit={onFiltrar}>
        <label className="busqueda">
          Buscar
          <span>
            <Lupa />
            <input
              value={valores.q}
              onChange={(event) => onChange({ ...valores, q: event.target.value })}
              placeholder="Solicitante o descripción"
              aria-label="Buscar solicitante o descripción"
            />
          </span>
        </label>
        <label>
          Área
          <select value={valores.areaId} onChange={(event) => onChange({ ...valores, areaId: event.target.value })} aria-label="Área">
            <option value="">Todas</option>
            {areas.map((area) => <option key={area.id} value={area.id}>{area.nombre}</option>)}
          </select>
        </label>
        <label>
          Tipo
          <select value={valores.tipo} onChange={(event) => onChange({ ...valores, tipo: event.target.value })} aria-label="Tipo">
            <option value="">Todos</option>
            {TIPOS.map((item) => <option key={item.value} value={item.value}>{item.corto}</option>)}
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={valores.desde} onChange={(event) => onChange({ ...valores, desde: event.target.value })} aria-label="Desde" />
        </label>
        <label>
          Hasta
          <input type="date" value={valores.hasta} onChange={(event) => onChange({ ...valores, hasta: event.target.value })} aria-label="Hasta" />
        </label>
        <div className="filtros-acciones">
          <button type="submit">Filtrar</button>
          <button type="button" className="ghost" onClick={onLimpiar} disabled={!hayFiltros(valores) && !hayFiltros(aplicados)}>Limpiar</button>
        </div>
      </form>
      {chips.length > 0 ? (
        <div className="chips" aria-label="Filtros activos">
          {chips.map((chip) => (
            <button key={chip.clave} type="button" className="chip" onClick={() => onQuitar(chip.siguiente)} aria-label={`Quitar filtro ${chip.texto}`}>
              {chip.texto} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function chipsActivos(filtros: Filtros, areas: Catalogo[]) {
  const chips: { clave: string; texto: string; siguiente: Filtros }[] = [];
  if (filtros.q.trim()) chips.push({ clave: 'q', texto: filtros.q.trim(), siguiente: { ...filtros, q: '' } });
  if (filtros.areaId) {
    const nombre = areas.find((area) => String(area.id) === filtros.areaId)?.nombre ?? 'Área';
    chips.push({ clave: 'area', texto: nombre, siguiente: { ...filtros, areaId: '' } });
  }
  if (filtros.tipo) {
    const nombre = TIPOS.find((item) => item.value === filtros.tipo)?.corto ?? filtros.tipo;
    chips.push({ clave: 'tipo', texto: nombre, siguiente: { ...filtros, tipo: '' } });
  }
  if (filtros.desde) chips.push({ clave: 'desde', texto: `Desde ${fechaVisible(filtros.desde)}`, siguiente: { ...filtros, desde: '' } });
  if (filtros.hasta) chips.push({ clave: 'hasta', texto: `Hasta ${fechaVisible(filtros.hasta)}`, siguiente: { ...filtros, hasta: '' } });
  return chips;
}

function Lupa() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </svg>
  );
}

export { FILTROS_VACIOS };

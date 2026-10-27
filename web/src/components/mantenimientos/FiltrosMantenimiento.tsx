import type { FormEvent } from 'react';
import type { Catalogo } from '../../types';
import { fechaVisible } from '../registros/format';

export type FiltrosMant = {
  q: string;
  areaId: string;
  estado: string;
  desde: string;
  hasta: string;
};

export const FILTROS_MANT_VACIOS: FiltrosMant = { q: '', areaId: '', estado: '', desde: '', hasta: '' };

export function hayFiltrosMant(filtros: FiltrosMant): boolean {
  return Boolean(filtros.q.trim() || filtros.areaId || filtros.estado || filtros.desde || filtros.hasta);
}

type FiltrosMantenimientoProps = {
  valores: FiltrosMant;
  aplicados: FiltrosMant;
  areas: Catalogo[];
  estados: readonly string[];
  placeholder: string;
  etiqueta: string;
  onChange: (valores: FiltrosMant) => void;
  onFiltrar: (event: FormEvent) => void;
  onLimpiar: () => void;
  onQuitar: (valores: FiltrosMant) => void;
};

export function FiltrosMantenimiento({
  valores,
  aplicados,
  areas,
  estados,
  placeholder,
  etiqueta,
  onChange,
  onFiltrar,
  onLimpiar,
  onQuitar,
}: FiltrosMantenimientoProps) {
  const chips = chipsActivos(aplicados, areas);
  return (
    <section className="card filtros-card" aria-label={etiqueta}>
      <form className="filtros-bar" onSubmit={onFiltrar}>
        <label className="busqueda">
          Buscar
          <span>
            <Lupa />
            <input
              value={valores.q}
              onChange={(event) => onChange({ ...valores, q: event.target.value })}
              placeholder={placeholder}
              aria-label="Buscar"
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
          Estado
          <select value={valores.estado} onChange={(event) => onChange({ ...valores, estado: event.target.value })} aria-label="Estado">
            <option value="">Todos</option>
            {estados.map((item) => <option key={item} value={item}>{item}</option>)}
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
          <button type="button" className="ghost" onClick={onLimpiar} disabled={!hayFiltrosMant(valores) && !hayFiltrosMant(aplicados)}>Limpiar</button>
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

function chipsActivos(filtros: FiltrosMant, areas: Catalogo[]) {
  const chips: { clave: string; texto: string; siguiente: FiltrosMant }[] = [];
  if (filtros.q.trim()) chips.push({ clave: 'q', texto: filtros.q.trim(), siguiente: { ...filtros, q: '' } });
  if (filtros.areaId) {
    const nombre = areas.find((area) => String(area.id) === filtros.areaId)?.nombre ?? 'Área';
    chips.push({ clave: 'area', texto: nombre, siguiente: { ...filtros, areaId: '' } });
  }
  if (filtros.estado) chips.push({ clave: 'estado', texto: filtros.estado, siguiente: { ...filtros, estado: '' } });
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

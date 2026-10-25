import { useState } from 'react';
import type { Soporte } from '../../types';
import { BadgeTipo } from './BadgeTipo';
import { fechaVisible, tiempoVisible } from './format';

type TablaSoportesProps = {
  items: Soporte[];
  cargando: boolean;
  esAdmin: boolean;
  hayFiltros: boolean;
  onPdf: (soporte: Soporte) => void;
  onEditar: (soporte: Soporte) => void;
  onEliminar: (soporte: Soporte) => void;
  onLimpiar: () => void;
};

export function TablaSoportes({ items, cargando, esAdmin, hayFiltros, onPdf, onEditar, onEliminar, onLimpiar }: TablaSoportesProps) {
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});

  if (cargando) {
    return (
      <div className="card table-wrap" aria-hidden="true">
        {Array.from({ length: 6 }, (_, indice) => <div key={indice} className="fila-skeleton" />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card vacio-registros">
        <p>Sin resultados</p>
        {hayFiltros ? <button type="button" onClick={onLimpiar}>Limpiar filtros</button> : null}
      </div>
    );
  }

  return (
    <div className="card table-wrap">
      <table className="registros-table">
        <thead>
          <tr>
            <th>Solicitante</th>
            <th>Descripción</th>
            <th>Tipo</th>
            <th>Solicitud</th>
            <th>Entrega</th>
            <th>Tiempo</th>
            <th>Realizado por</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((soporte) => {
            const descripcion = soporte.descripcion ?? '';
            const abierto = abiertos[soporte.id] === true;
            const largo = descripcion.length > 90;
            return (
              <tr key={soporte.id}>
                <td data-label="Solicitante">
                  <strong className="solicitante">{soporte.solicitante}</strong>
                  <span className="area-secundaria">{soporte.area}</span>
                </td>
                <td data-label="Descripción">
                  <p className={abierto ? 'descripcion abierta' : 'descripcion'} title={descripcion}>{descripcion}</p>
                  {largo ? (
                    <button type="button" className="ver-mas" onClick={() => setAbiertos((estado) => ({ ...estado, [soporte.id]: !abierto }))}>
                      {abierto ? 'Ver menos' : 'Ver más'}
                    </button>
                  ) : null}
                </td>
                <td data-label="Tipo"><BadgeTipo tipo={soporte.tipo} /></td>
                <td data-label="Solicitud" className="fecha">{fechaVisible(soporte.fechaSolicitud)}</td>
                <td data-label="Entrega" className="fecha">{fechaVisible(soporte.fechaEntrega)}</td>
                <td data-label="Tiempo" className="tiempo">{tiempoVisible(soporte.tiempoSoporte)}</td>
                <td data-label="Realizado por" className="tiempo">{soporte.tecnico}</td>
                <td data-label="Acciones" className="acciones-fila">
                  <button type="button" className="icono" aria-label="Imprimir PDF" title="Imprimir PDF" onClick={() => onPdf(soporte)}><IconoPdf /></button>
                  <button type="button" className="icono" aria-label="Editar soporte" title="Editar" onClick={() => onEditar(soporte)}><IconoEditar /></button>
                  {esAdmin ? <button type="button" className="icono peligro" aria-label="Eliminar soporte" title="Eliminar" onClick={() => onEliminar(soporte)}><IconoEliminar /></button> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function IconoPdf() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>;
}
function IconoEditar() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16z" /><path d="M13 7l4 4" /></svg>;
}
function IconoEliminar() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12" /></svg>;
}

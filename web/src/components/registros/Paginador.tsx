import { numero } from './format';

type PaginadorProps = {
  desde: number;
  hasta: number;
  total: number;
  hayAnterior: boolean;
  haySiguiente: boolean;
  onAnterior: () => void;
  onSiguiente: () => void;
};

export function Paginador({ desde, hasta, total, hayAnterior, haySiguiente, onAnterior, onSiguiente }: PaginadorProps) {
  const texto = total === 0 ? 'Mostrando 0 de 0' : `Mostrando ${numero.format(desde)}–${numero.format(hasta)} de ${numero.format(total)}`;
  return (
    <div className="paginador">
      <p>{texto}</p>
      <div>
        <button type="button" onClick={onAnterior} disabled={!hayAnterior}>Anterior</button>
        <button type="button" onClick={onSiguiente} disabled={!haySiguiente}>Siguiente</button>
      </div>
    </div>
  );
}

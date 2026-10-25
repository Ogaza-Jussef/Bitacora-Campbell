import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import type { Soporte } from '../../types';

type SelectorSoporteProps = {
  soporteId?: string;
  solicitante?: string | null;
  onChange: (soporte: { id: string; solicitante: string; descripcion: string | null } | null) => void;
};

export function SelectorSoporte({ soporteId, solicitante, onChange }: SelectorSoporteProps) {
  const [texto, setTexto] = useState(solicitante ?? '');
  const [opciones, setOpciones] = useState<Soporte[]>([]);

  useEffect(() => { setTexto(solicitante ?? ''); }, [solicitante, soporteId]);

  useEffect(() => {
    const consulta = texto.trim();
    if (consulta.length < 2) {
      setOpciones([]);
      return;
    }
    const timer = window.setTimeout(() => {
      const pedidos: Promise<Soporte[]>[] = [
        api<{ items: Soporte[] }>(`/api/v1/soportes?limit=8&q=${encodeURIComponent(consulta)}`).then((page) => page.items).catch(() => []),
      ];
      if (/^\d{8,20}$/.test(consulta)) {
        pedidos.push(api<Soporte>(`/api/v1/soportes/${consulta}`).then((item) => [item]).catch(() => []));
      }
      Promise.all(pedidos).then((listas) => {
        const unicos = new Map<string, Soporte>();
        listas.flat().forEach((item) => unicos.set(item.id, item));
        setOpciones([...unicos.values()]);
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [texto]);

  return (
    <label>
      Solicitud de soporte
      <input value={texto} aria-label="Solicitud de soporte" onChange={(event) => { setTexto(event.target.value); onChange(null); }} placeholder="Id, solicitante o descripción" />
      {opciones.length > 0 ? (
        <ul className="sugerencias" aria-label="Soportes encontrados">
          {opciones.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => { onChange({ id: item.id, solicitante: item.solicitante, descripcion: item.descripcion }); setTexto(item.solicitante); setOpciones([]); }}>
                {item.solicitante} · {item.descripcion ?? item.id}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {soporteId ? <Link to={`/?q=${encodeURIComponent(texto || soporteId)}`}>Ver registro {soporteId}</Link> : null}
    </label>
  );
}

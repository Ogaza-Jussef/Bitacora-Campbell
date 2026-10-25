import { useEffect, useState } from 'react';
import { api } from '../../api';

type Equipo = { id: number; descripcion: string; areaId: number; area: string };

type EquipoCampoProps = {
  areaId: number;
  equipoId?: number;
  etiquetaInicial?: string;
  onChange: (equipo: Equipo | null) => void;
};

export function EquipoCampo({ areaId, equipoId, etiquetaInicial = '', onChange }: EquipoCampoProps) {
  const [texto, setTexto] = useState(etiquetaInicial);
  const [opciones, setOpciones] = useState<Equipo[]>([]);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    setTexto(etiquetaInicial);
  }, [etiquetaInicial]);

  useEffect(() => {
    if (!areaId) {
      setOpciones([]);
      return;
    }
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ areaId: String(areaId), limit: '8' });
      if (texto.trim()) params.set('q', texto.trim());
      api<{ items: Equipo[] }>(`/api/v1/equipos?${params.toString()}`)
        .then((page) => setOpciones(page.items))
        .catch(() => setOpciones([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [texto, areaId]);

  async function crear() {
    if (!areaId || texto.trim().length < 2) {
      setMensaje('Escribe el equipo y elige el área antes de crearlo.');
      return;
    }
    setMensaje('');
    const creado = await api<Equipo>('/api/v1/equipos', {
      method: 'POST',
      body: JSON.stringify({ descripcion: texto.trim(), areaId }),
    });
    onChange(creado);
    setTexto(creado.descripcion);
    setMensaje('Equipo creado.');
  }

  return (
    <label>
      Equipo
      <input value={texto} aria-label="Equipo" onChange={(event) => { setTexto(event.target.value); onChange(null); }} placeholder="Busca o crea un equipo" />
      {opciones.length > 0 ? (
        <ul className="sugerencias" aria-label="Equipos encontrados">
          {opciones.map((equipo) => (
            <li key={equipo.id}>
              <button type="button" className={equipo.id === equipoId ? 'primary' : ''} onClick={() => { onChange(equipo); setTexto(equipo.descripcion); setOpciones([]); }}>
                {equipo.descripcion}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" onClick={() => crear().catch((error: Error) => setMensaje(error.message))}>Crear equipo nuevo</button>
      {mensaje ? <span className="meta">{mensaje}</span> : null}
    </label>
  );
}

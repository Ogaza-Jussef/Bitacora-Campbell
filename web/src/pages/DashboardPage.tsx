import { useEffect, useState } from 'react';
import { ApiError, api } from '../api';
import { Shell } from '../Shell';

type Punto = { etiqueta: string; total: number };

type Estadisticas = {
  total: number;
  hoy: number;
  semana: number;
  mes: number;
  anio: number;
  fecha: string;
  porDia: Punto[];
  porSemana: Punto[];
  porMes: Punto[];
  porAnio: Punto[];
  porArea: Punto[];
  porTipo: Punto[];
  porTecnico: Punto[];
};

export function DashboardPage() {
  const [data, setData] = useState<Estadisticas | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Estadisticas>('/api/v1/estadisticas')
      .then(setData)
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar el tablero'));
  }, []);

  return (
    <Shell>
      <main className="board">
        <h1>Tablero de soportes</h1>
        {error ? <p className="alert" role="alert">{error}</p> : null}
        {!data && !error ? <p className="meta">Cargando estadísticas…</p> : null}
        {data ? (
          <>
            <section className="cards">
              <article><span>Hoy</span><strong>{data.hoy}</strong></article>
              <article><span>Esta semana</span><strong>{data.semana}</strong></article>
              <article><span>Este mes</span><strong>{data.mes}</strong></article>
              <article><span>Este año</span><strong>{data.anio}</strong></article>
              <article><span>Total</span><strong>{data.total}</strong></article>
            </section>
            <section className="panels">
              <Barras titulo="Por día, últimos 30" puntos={data.porDia} formato={fechaCorta} />
              <Barras titulo="Por semana, últimas 12" puntos={data.porSemana} formato={fechaCorta} />
              <Barras titulo="Por mes, últimos 12" puntos={data.porMes} />
              <Barras titulo="Por año" puntos={data.porAnio} />
              <Barras titulo="Por área" puntos={data.porArea} />
              <Barras titulo="Por tipo" puntos={data.porTipo} formato={etiquetaTipo} />
              <Barras titulo="Por técnico" puntos={data.porTecnico} />
            </section>
          </>
        ) : null}
      </main>
    </Shell>
  );
}

function Barras({ titulo, puntos, formato = (value: string) => value }: {
  titulo: string;
  puntos: Punto[];
  formato?: (value: string) => string;
}) {
  const maximo = Math.max(1, ...puntos.map((punto) => punto.total));
  return (
    <section className={titulo.startsWith('Por área') ? 'panel panel-wide' : 'panel'}>
      <h2>{titulo}</h2>
      {puntos.length === 0 ? <p className="meta">Sin datos</p> : null}
      <div className="hbars">
        {puntos.map((punto) => (
          <div key={`${titulo}-${punto.etiqueta}`} className="bar-row">
            <span>{formato(punto.etiqueta)}</span>
            <span className="track" aria-hidden="true">
              <span style={{ width: `${Math.round((punto.total / maximo) * 100)}%` }} />
            </span>
            <strong>{punto.total}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function fechaCorta(value: string): string {
  const parts = value.slice(0, 10).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : value;
}

function etiquetaTipo(value: string): string {
  if (value === 'Chequeo') return 'Asesoría';
  if (value === 'Instalación') return 'Instalación';
  if (value === 'Correctivo') return 'Correctivo';
  return value;
}

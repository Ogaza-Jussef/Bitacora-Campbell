import { useEffect, useState } from 'react';
import { ApiError, api } from '../api';
import { Shell } from '../Shell';
import { Icono } from '../components/dashboard/Icono';
import { KpiCard } from '../components/dashboard/KpiCard';
import {
  areaLider,
  diaPico,
  fechaLarga,
  numero,
  suma,
  variacion,
  type Estadisticas,
  type Punto,
} from '../components/dashboard/format';

const VACIO: Periodo = { hoy: 0, semana: 0, mes: 0, anio: 0, treinta: 0 };
type Periodo = NonNullable<Estadisticas['anterior']>;

export function DashboardPage() {
  const [data, setData] = useState<Estadisticas | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [animar, setAnimar] = useState(true);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aplicar = () => setAnimar(!media.matches);
    aplicar();
    media.addEventListener('change', aplicar);
    return () => media.removeEventListener('change', aplicar);
  }, []);

  function cargar() {
    setCargando(true);
    setError('');
    api<Estadisticas>('/api/v1/estadisticas')
      .then(setData)
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar el tablero'))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar();
  }, []);

  const anterior = data?.anterior ?? VACIO;
  const promedio = data ? suma(data.porDia) / 30 : 0;
  const promedioAnterior = anterior.treinta / 30;
  const pico = data ? diaPico(data.porDia) : null;
  const lider = data ? areaLider(data.porArea) : null;

  return (
    <Shell>
      <main className="board tablero">
        <header className="page-head">
          <div>
            <h1>Tablero</h1>
            <p className="meta">Resumen ejecutivo de los soportes de tecnología.</p>
            <p className="meta">{data?.fecha ? `Actualizado al ${fechaLarga(data.fecha)}` : 'Fecha de actualización pendiente'}</p>
          </div>
          <button type="button" onClick={cargar} disabled={cargando}>Actualizar</button>
        </header>
        {error ? <p className="alert" role="alert">{error}</p> : null}
        {cargando && !data ? <Skeleton /> : null}
        {data ? (
          <div className="tablero-grid">
            <KpiCard etiqueta="Hoy" valor={numero.format(data.hoy)} detalle="Soportes con fecha de hoy" delta={variacion(data.hoy, anterior.hoy)} comparacion="vs ayer" serie={data.porDia.slice(-14)} icono={<Icono nombre="hoy" />} animar={animar} />
            <KpiCard etiqueta="Esta semana" valor={numero.format(data.semana)} detalle="Semana en curso" delta={variacion(data.semana, anterior.semana)} comparacion="vs la anterior" serie={data.porSemana} icono={<Icono nombre="semana" />} animar={animar} />
            <KpiCard etiqueta="Este mes" valor={numero.format(data.mes)} detalle="Mes en curso" delta={variacion(data.mes, anterior.mes)} comparacion="vs el anterior" serie={data.porMes} icono={<Icono nombre="mes" />} animar={animar} />
            <KpiCard etiqueta="Este año" valor={numero.format(data.anio)} detalle="Año en curso" delta={variacion(data.anio, anterior.anio)} comparacion="vs el anterior" serie={data.porAnio} icono={<Icono nombre="anio" />} animar={animar} />
            <KpiCard etiqueta="Total" valor={numero.format(data.total)} detalle="Soportes acumulados" delta={variacion(suma(data.porDia), anterior.treinta)} comparacion="30 días vs los previos" serie={data.porDia} icono={<Icono nombre="total" />} animar={animar} />
            <KpiCard etiqueta="Promedio diario" valor={numero.format(Math.round(promedio))} detalle="Media de los últimos 30 días" delta={variacion(promedio, promedioAnterior)} comparacion="vs los 30 previos" serie={data.porDia} icono={<Icono nombre="promedio" />} animar={animar} />
            <KpiCard etiqueta="Día pico" valor={pico ? numero.format(pico.total) : '0'} detalle={pico ? fechaLarga(pico.etiqueta) : 'Sin datos'} delta={pico ? variacion(pico.total, promedio) : 0} comparacion="vs el promedio diario" serie={data.porDia} icono={<Icono nombre="pico" />} animar={animar} />
            <KpiCard etiqueta="Área con más soportes" valor={lider ? lider.etiqueta : 'Sin datos'} detalle={lider ? `${numero.format(lider.total)} soportes, ${numero.format(data.total > 0 ? Math.round((lider.total / data.total) * 100) : 0)}% del total` : 'Sin datos'} delta={null} comparacion="" serie={topSerie(data.porArea)} icono={<Icono nombre="area" />} animar={animar} />
          </div>
        ) : null}
      </main>
    </Shell>
  );
}

function topSerie(puntos: Punto[]): Punto[] {
  return [...puntos].filter((punto) => punto.total > 0).slice(0, 8).reverse();
}

function Skeleton() {
  return (
    <div className="tablero-grid" aria-hidden="true">
      {Array.from({ length: 8 }, (_, indice) => <div key={indice} className="kpi-card skeleton" />)}
    </div>
  );
}

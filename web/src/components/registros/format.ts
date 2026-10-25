import type { TipoSoporte } from '../../types';

export const TIPOS: { value: TipoSoporte; label: string; corto: string }[] = [
  { value: 'Chequeo', label: 'Asesoría, visita, chequeo', corto: 'Asesoría' },
  { value: 'Instalación', label: 'Instalación', corto: 'Instalación' },
  { value: 'Correctivo', label: 'Correctivo', corto: 'Correctivo' },
];

export type Filtros = {
  q: string;
  areaId: string;
  tipo: string;
  desde: string;
  hasta: string;
};

export const FILTROS_VACIOS: Filtros = { q: '', areaId: '', tipo: '', desde: '', hasta: '' };

export function hayFiltros(filtros: Filtros): boolean {
  return Boolean(filtros.q.trim() || filtros.areaId || filtros.tipo || filtros.desde || filtros.hasta);
}

export function queryString(pageCursor: string | null, filters: Filtros): string {
  const params = new URLSearchParams({ limit: '20', sort: 'fecha_solicitud' });
  if (pageCursor) params.set('cursor', pageCursor);
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.areaId) params.set('areaId', filters.areaId);
  if (filters.tipo) params.set('tipo', filters.tipo);
  if (filters.desde) params.set('desde', filters.desde);
  if (filters.hasta) params.set('hasta', filters.hasta);
  return params.toString();
}

export function fechaVisible(value: string | null): string {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function tiempoVisible(value: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export function etiquetaTipo(tipo: string | null): string {
  return TIPOS.find((item) => item.value === tipo)?.corto ?? (tipo ?? '');
}

export const numero = new Intl.NumberFormat('es-CO');

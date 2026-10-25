import { etiquetaTipo } from './format';

export function BadgeTipo({ tipo }: { tipo: string | null }) {
  const texto = etiquetaTipo(tipo);
  const clase = tipo === 'Instalación' ? 'badge instalacion' : tipo === 'Correctivo' ? 'badge correctivo' : 'badge asesoria';
  return <span className={clase}>{texto || 'Sin tipo'}</span>;
}

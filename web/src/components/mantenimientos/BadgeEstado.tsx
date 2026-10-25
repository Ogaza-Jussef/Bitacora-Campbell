const COLORES: Record<string, string> = {
  Realizado: 'realizado',
  Programado: 'programado',
  'No realizado': 'no-realizado',
  Pendiente: 'pendiente',
  'En proceso': 'en-proceso',
  Resuelto: 'resuelto',
};

export function BadgeEstado({ estado }: { estado: string }) {
  return <span className={`badge ${COLORES[estado] ?? 'programado'}`}>{estado}</span>;
}

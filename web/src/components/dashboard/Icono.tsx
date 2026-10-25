type IconoProps = { nombre: string };

export function Icono({ nombre }: IconoProps) {
  const comun = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': true as const };
  if (nombre === 'hoy') {
    return <svg {...comun}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>;
  }
  if (nombre === 'semana') {
    return <svg {...comun}><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>;
  }
  if (nombre === 'mes') {
    return <svg {...comun}><path d="M4 18V6M10 18V10M16 18V8M22 18H2" /></svg>;
  }
  if (nombre === 'anio') {
    return <svg {...comun}><circle cx="12" cy="12" r="8" /><path d="M3 12h18M12 4c2 2.5 2 13 0 16M12 4c-2 2.5-2 13 0 16" /></svg>;
  }
  if (nombre === 'total') {
    return <svg {...comun}><path d="M5 19V9M10 19V5M15 19v-7M20 19V8" /></svg>;
  }
  if (nombre === 'promedio') {
    return <svg {...comun}><path d="M4 16c2-6 4-6 6 0s4 6 6 0 4-6 4 0" /></svg>;
  }
  if (nombre === 'pico') {
    return <svg {...comun}><path d="M4 18l6-10 4 6 6-8" /></svg>;
  }
  return <svg {...comun}><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2" /></svg>;
}

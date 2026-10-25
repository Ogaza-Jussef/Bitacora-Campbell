export type Punto = { etiqueta: string; total: number };

export type PeriodoAnterior = {
  hoy: number;
  semana: number;
  mes: number;
  anio: number;
  treinta: number;
};

export type Estadisticas = {
  total: number;
  hoy: number;
  semana: number;
  mes: number;
  anio: number;
  fecha: string;
  anterior?: PeriodoAnterior;
  porDia: Punto[];
  porSemana: Punto[];
  porMes: Punto[];
  porAnio: Punto[];
  porArea: Punto[];
  porTipo: Punto[];
  porTecnico: Punto[];
};

export const numero = new Intl.NumberFormat('es-CO');

export function variacion(actual: number, base: number): number | null {
  if (base === 0) {
    return actual === 0 ? 0 : null;
  }
  return ((actual - base) / base) * 100;
}

export function textoVariacion(valor: number | null): string {
  if (valor === null) {
    return 'Sin base anterior';
  }
  const redondeado = Math.round(valor);
  const signo = redondeado > 0 ? '+' : '';
  return `${signo}${numero.format(redondeado)}%`;
}

export function fechaCorta(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}`;
}

export function fechaLarga(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}

export function suma(puntos: Punto[]): number {
  return puntos.reduce((total, punto) => total + punto.total, 0);
}

export function diaPico(puntos: Punto[]): Punto | null {
  const conDatos = puntos.filter((punto) => punto.total > 0);
  if (conDatos.length === 0) {
    return null;
  }
  return conDatos.reduce((mejor, punto) => (punto.total > mejor.total ? punto : mejor));
}

export function areaLider(puntos: Punto[]): Punto | null {
  const conDatos = puntos.filter((punto) => punto.total > 0);
  return conDatos[0] ?? null;
}

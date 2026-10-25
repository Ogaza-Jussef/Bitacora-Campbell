import { Inject, Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

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
  anterior: PeriodoAnterior;
  porDia: Punto[];
  porSemana: Punto[];
  porMes: Punto[];
  porAnio: Punto[];
  porArea: Punto[];
  porTipo: Punto[];
  porTecnico: Punto[];
};

type Conteo = RowDataPacket & {
  total: number;
  hoy: number;
  semana: number;
  mes: number;
  anio: number;
  hoy_anterior: number;
  semana_anterior: number;
  mes_anterior: number;
  anio_anterior: number;
  treinta_anterior: number;
  fecha: string;
};

type Grupo = RowDataPacket & { etiqueta: string | number; total: number };

@Injectable()
export class EstadisticasService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  async resumen(): Promise<Estadisticas> {
    const [conteo] = await this.db.query<Conteo>(`
      SELECT CURDATE() AS fecha,
             COUNT(*) AS total,
             COALESCE(SUM(fecha_solicitud = CURDATE()), 0) AS hoy,
             COALESCE(SUM(fecha_solicitud = DATE_SUB(CURDATE(), INTERVAL 1 DAY)), 0) AS hoy_anterior,
             COALESCE(SUM(YEARWEEK(fecha_solicitud, 3) = YEARWEEK(CURDATE(), 3)), 0) AS semana,
             COALESCE(SUM(YEARWEEK(fecha_solicitud, 3) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 3)), 0) AS semana_anterior,
             COALESCE(SUM(DATE_FORMAT(fecha_solicitud, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')), 0) AS mes,
             COALESCE(SUM(DATE_FORMAT(fecha_solicitud, '%Y-%m') = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m')), 0) AS mes_anterior,
             COALESCE(SUM(YEAR(fecha_solicitud) = YEAR(CURDATE())), 0) AS anio,
             COALESCE(SUM(YEAR(fecha_solicitud) = YEAR(CURDATE()) - 1), 0) AS anio_anterior,
             COALESCE(SUM(fecha_solicitud >= DATE_SUB(CURDATE(), INTERVAL 59 DAY)
                          AND fecha_solicitud < DATE_SUB(CURDATE(), INTERVAL 29 DAY)), 0) AS treinta_anterior
      FROM soportes
    `);
    const fecha = String(conteo?.fecha ?? '').slice(0, 10);
    const porDia = await this.agrupar(`
      SELECT DATE_FORMAT(fecha_solicitud, '%Y-%m-%d') AS etiqueta, COUNT(*) AS total
      FROM soportes
      WHERE fecha_solicitud >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
      GROUP BY etiqueta
      ORDER BY etiqueta
    `);
    const porSemana = await this.agrupar(`
      SELECT MIN(fecha_solicitud) AS etiqueta, COUNT(*) AS total
      FROM soportes
      WHERE fecha_solicitud >= DATE_SUB(CURDATE(), INTERVAL 11 WEEK)
      GROUP BY YEARWEEK(fecha_solicitud, 3)
      ORDER BY etiqueta
    `);
    const porMes = await this.agrupar(`
      SELECT DATE_FORMAT(fecha_solicitud, '%Y-%m') AS etiqueta, COUNT(*) AS total
      FROM soportes
      WHERE fecha_solicitud >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH)
      GROUP BY etiqueta
      ORDER BY etiqueta
    `);
    const porAnio = await this.agrupar(`
      SELECT CAST(YEAR(fecha_solicitud) AS CHAR) AS etiqueta, COUNT(*) AS total
      FROM soportes
      WHERE fecha_solicitud IS NOT NULL
      GROUP BY etiqueta
      ORDER BY etiqueta
    `);
    const porArea = await this.agrupar(`
      SELECT a.nombre AS etiqueta, COUNT(s.id) AS total
      FROM areas a
      LEFT JOIN soportes s ON s.area_id = a.id
      GROUP BY a.id, a.nombre
      ORDER BY total DESC, a.nombre ASC
    `);
    const porTipo = await this.agrupar(`
      SELECT COALESCE(tipo, 'Sin tipo') AS etiqueta, COUNT(*) AS total
      FROM soportes
      GROUP BY tipo
      ORDER BY total DESC
    `);
    const porTecnico = await this.agrupar(`
      SELECT COALESCE(t.nombre, 'Sin asignar') AS etiqueta, COUNT(s.id) AS total
      FROM tecnicos t
      LEFT JOIN soportes s ON s.tecnico_id = t.id
      GROUP BY t.id, t.nombre
      ORDER BY total DESC, t.nombre ASC
    `);

    return {
      total: Number(conteo?.total ?? 0),
      hoy: Number(conteo?.hoy ?? 0),
      semana: Number(conteo?.semana ?? 0),
      mes: Number(conteo?.mes ?? 0),
      anio: Number(conteo?.anio ?? 0),
      fecha,
      anterior: {
        hoy: Number(conteo?.hoy_anterior ?? 0),
        semana: Number(conteo?.semana_anterior ?? 0),
        mes: Number(conteo?.mes_anterior ?? 0),
        anio: Number(conteo?.anio_anterior ?? 0),
        treinta: Number(conteo?.treinta_anterior ?? 0),
      },
      porDia: completarDias(porDia, fecha, 30),
      porSemana,
      porMes,
      porAnio,
      porArea,
      porTipo,
      porTecnico,
    };
  }

  private async agrupar(sql: string): Promise<Punto[]> {
    const rows = await this.db.query<Grupo>(sql);
    return rows.map((row) => ({ etiqueta: String(row.etiqueta), total: Number(row.total) }));
  }
}

export function completarDias(rows: Punto[], hoy: string, dias: number): Punto[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hoy)) {
    return rows;
  }
  const totales = new Map(rows.map((row) => [row.etiqueta, row.total]));
  const serie: Punto[] = [];
  for (let offset = dias - 1; offset >= 0; offset -= 1) {
    const etiqueta = sumarDias(hoy, -offset);
    serie.push({ etiqueta, total: totales.get(etiqueta) ?? 0 });
  }
  return serie;
}

function sumarDias(iso: string, dias: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + dias));
  return date.toISOString().slice(0, 10);
}

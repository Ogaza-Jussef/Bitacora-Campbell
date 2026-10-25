import { Inject, Injectable } from '@nestjs/common';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';
import { encodeCursor } from './cursor';
import type { Soporte, SoporteInput, TipoSoporte } from './soporte';

type SoporteRow = RowDataPacket & {
  id: string;
  solicitante: string;
  area_id: number;
  area: string;
  descripcion: string | null;
  tipo: TipoSoporte | null;
  fecha_solicitud: string | null;
  fecha_entrega: string | null;
  tiempo_soporte: string | null;
  tecnico_id: number | null;
  tecnico: string | null;
  actualizado_en: string | null;
  version: number;
};

type IdempotenciaRow = RowDataPacket & {
  hash_solicitud: string;
  estado_http: number;
  cuerpo: Soporte | string;
};

export type FiltroSoportes = {
  limit: number;
  cursorFecha: string | null;
  cursorId: string | null;
  areaId: number | null;
  tipo: TipoSoporte | null;
  desde: string | null;
  hasta: string | null;
  q: string | null;
};

const SELECT_SOPORTE = `
  SELECT s.id, s.solicitante, s.area_id, a.nombre AS area, s.descripcion, s.tipo,
         DATE_FORMAT(s.fecha_solicitud, '%Y-%m-%d') AS fecha_solicitud,
         DATE_FORMAT(s.fecha_entrega, '%Y-%m-%d') AS fecha_entrega,
         s.tiempo_soporte, s.tecnico_id, t.nombre AS tecnico,
         DATE_FORMAT(s.actualizado_en, '%Y-%m-%d %H:%i:%s') AS actualizado_en,
         s.version
  FROM soportes s
  INNER JOIN areas a ON a.id = s.area_id
  LEFT JOIN tecnicos t ON t.id = s.tecnico_id
`;

@Injectable()
export class SoportesRepository {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  async listar(filtro: FiltroSoportes): Promise<{ items: Soporte[]; nextCursor: string | null; total: number }> {
    const where = this.where(filtro, true);
    const rows = await this.db.query<SoporteRow>(
      `${SELECT_SOPORTE}
       ${where.sql}
       ORDER BY COALESCE(s.fecha_solicitud, '1000-01-01') DESC, s.id DESC
       LIMIT ?`,
      [...where.params, filtro.limit + 1],
    );
    const hasMore = rows.length > filtro.limit;
    const page = rows.slice(0, filtro.limit).map(mapSoporte);
    const last = page[page.length - 1];
    const countWhere = this.where(filtro, false);
    const totalRows = await this.db.query<RowDataPacket & { total: number }>(
      `SELECT COUNT(*) AS total
       FROM soportes s
       ${countWhere.sql}`,
      countWhere.params,
    );
    return {
      items: page,
      nextCursor: hasMore && last ? encodeCursor(last.fechaSolicitud ?? '1000-01-01', last.id) : null,
      total: Number(totalRows[0]?.total ?? 0),
    };
  }

  async exportar(filtro: Omit<FiltroSoportes, 'limit' | 'cursorFecha' | 'cursorId'>): Promise<Soporte[]> {
    const where = this.where({ ...filtro, limit: 0, cursorFecha: null, cursorId: null }, false);
    const rows = await this.db.query<SoporteRow>(
      `${SELECT_SOPORTE}
       ${where.sql}
       ORDER BY COALESCE(s.fecha_solicitud, '1000-01-01') DESC, s.id DESC
       LIMIT 10000`,
      where.params,
    );
    return rows.map(mapSoporte);
  }

  async obtener(id: string, connection?: PoolConnection): Promise<Soporte | undefined> {
    const rows = await this.query<SoporteRow>(
      `${SELECT_SOPORTE} WHERE s.id = ? LIMIT 1`,
      [id],
      connection,
    );
    return rows[0] ? mapSoporte(rows[0]) : undefined;
  }

  async existeArea(id: number, connection: PoolConnection): Promise<boolean> {
    const rows = await this.query<RowDataPacket>(`SELECT id FROM areas WHERE id = ? LIMIT 1`, [id], connection);
    return rows.length === 1;
  }

  async existeTecnico(id: number, connection: PoolConnection): Promise<boolean> {
    const rows = await this.query<RowDataPacket>(`SELECT id FROM tecnicos WHERE id = ? LIMIT 1`, [id], connection);
    return rows.length === 1;
  }

  async reservarIdempotencia(
    connection: PoolConnection,
    usuarioId: number,
    clave: string,
    hashSolicitud: string,
  ): Promise<'created' | 'duplicate'> {
    try {
      await connection.query(
        `INSERT INTO solicitudes_idempotentes
           (usuario_id, clave, hash_solicitud, estado_http, cuerpo, creado_en)
         VALUES (?, ?, ?, 0, JSON_OBJECT(), NOW())`,
        [usuarioId, clave, hashSolicitud],
      );
      return 'created';
    } catch (error) {
      if (mysqlCode(error) === 'ER_DUP_ENTRY') {
        return 'duplicate';
      }
      throw error;
    }
  }

  async leerIdempotencia(connection: PoolConnection, usuarioId: number, clave: string): Promise<IdempotenciaRow | undefined> {
    const [rows] = await connection.query<IdempotenciaRow[]>(
      `SELECT hash_solicitud, estado_http, cuerpo
       FROM solicitudes_idempotentes
       WHERE usuario_id = ? AND clave = ?
       LIMIT 1`,
      [usuarioId, clave],
    );
    return rows[0];
  }

  async completarIdempotencia(
    connection: PoolConnection,
    usuarioId: number,
    clave: string,
    soporte: Soporte,
  ): Promise<void> {
    await connection.query(
      `UPDATE solicitudes_idempotentes
       SET estado_http = 201, cuerpo = CAST(? AS JSON)
       WHERE usuario_id = ? AND clave = ?`,
      [JSON.stringify(soporte), usuarioId, clave],
    );
  }

  insertar(connection: PoolConnection, id: string, input: SoporteInput): Promise<ResultSetHeader> {
    return this.db.execute(
      `INSERT INTO soportes (
         id, solicitante, area_id, descripcion, tipo, fecha_solicitud, fecha_entrega,
         tiempo_soporte, tecnico_id, actualizado_en, creado_en, version
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)`,
      [
        id,
        input.solicitante,
        input.areaId,
        input.descripcion,
        input.tipo,
        input.fechaSolicitud,
        input.fechaEntrega ?? null,
        input.tiempoSoporte ?? null,
        input.tecnicoId ?? null,
      ],
      connection,
    );
  }

  actualizar(connection: PoolConnection, id: string, input: SoporteInput, version: number): Promise<ResultSetHeader> {
    return this.db.execute(
      `UPDATE soportes
       SET solicitante = ?, area_id = ?, descripcion = ?, tipo = ?, fecha_solicitud = ?,
           fecha_entrega = ?, tiempo_soporte = ?, tecnico_id = ?, actualizado_en = NOW(),
           version = version + 1
       WHERE id = ? AND version = ?`,
      [
        input.solicitante,
        input.areaId,
        input.descripcion,
        input.tipo,
        input.fechaSolicitud,
        input.fechaEntrega ?? null,
        input.tiempoSoporte ?? null,
        input.tecnicoId ?? null,
        id,
        version,
      ],
      connection,
    );
  }

  async eliminar(connection: PoolConnection, id: string, version: number): Promise<number> {
    const result = await this.db.execute(
      `DELETE FROM soportes WHERE id = ? AND version = ?`,
      [id, version],
      connection,
    );
    return result.affectedRows;
  }

  async existe(connection: PoolConnection, id: string): Promise<boolean> {
    const rows = await this.query<RowDataPacket>(`SELECT id FROM soportes WHERE id = ? LIMIT 1`, [id], connection);
    return rows.length === 1;
  }

  private where(filtro: FiltroSoportes, withCursor: boolean): { sql: string; params: unknown[] } {
    const params: unknown[] = [
      filtro.areaId,
      filtro.areaId,
      filtro.tipo,
      filtro.tipo,
      filtro.desde,
      filtro.desde,
      filtro.hasta,
      filtro.hasta,
      filtro.q,
      filtro.q ? `%${filtro.q}%` : null,
      filtro.q ? `%${filtro.q}%` : null,
    ];
    let sql = `
      WHERE (? IS NULL OR s.area_id = ?)
        AND (? IS NULL OR s.tipo = ?)
        AND (? IS NULL OR s.fecha_solicitud >= ?)
        AND (? IS NULL OR s.fecha_solicitud <= ?)
        AND (? IS NULL OR s.solicitante LIKE ? OR s.descripcion LIKE ?)
    `;
    if (withCursor) {
      sql += `
        AND (
          ? IS NULL
          OR COALESCE(s.fecha_solicitud, '1000-01-01') < ?
          OR (COALESCE(s.fecha_solicitud, '1000-01-01') = ? AND s.id < ?)
        )
      `;
      params.push(filtro.cursorFecha, filtro.cursorFecha, filtro.cursorFecha, filtro.cursorId);
    }
    return { sql, params };
  }

  private async query<T extends RowDataPacket>(sql: string, params: unknown[], connection?: PoolConnection): Promise<T[]> {
    if (!connection) {
      return this.db.query<T>(sql, params);
    }
    const [rows] = await connection.query<T[]>(sql, params);
    return rows;
  }
}

function mapSoporte(row: SoporteRow): Soporte {
  return {
    id: String(row.id),
    solicitante: row.solicitante,
    areaId: Number(row.area_id),
    area: row.area,
    descripcion: row.descripcion,
    tipo: row.tipo,
    fechaSolicitud: row.fecha_solicitud,
    fechaEntrega: row.fecha_entrega,
    tiempoSoporte: row.tiempo_soporte,
    tecnicoId: row.tecnico_id === null ? null : Number(row.tecnico_id),
    tecnico: row.tecnico,
    actualizadoEn: row.actualizado_en ? `${row.actualizado_en.replace(' ', 'T')}-05:00` : null,
    version: Number(row.version),
  };
}

function mysqlCode(error: unknown): string {
  return typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
}

import { createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { AppError } from '../common/app-error';
import type { Principal } from '../common/principal';
import { DatabaseService } from '../database/database.service';
import { decodeCursor, encodeCursor, leerVersion, validarRango } from './cursor';
import type { EstadoCorrectivo, EstadoPreventivo, GuardarCorrectivoDto, GuardarPreventivoDto, ListarMantenimientoDto } from './mantenimiento.dto';

export type Preventivo = {
  id: string;
  fechaProgramacion: string;
  areaId: number;
  area: string;
  equipoId: number;
  equipo: string;
  estado: EstadoPreventivo;
  observaciones: string | null;
  version: number;
};

export type Correctivo = {
  id: string;
  areaId: number;
  area: string;
  equipoId: number;
  equipo: string;
  soporteId: string | null;
  soporteSolicitante: string | null;
  soporteDescripcion: string | null;
  estado: EstadoCorrectivo;
  fecha: string;
  observaciones: string | null;
  version: number;
};

export type Equipo = { id: number; descripcion: string; areaId: number; area: string };

export type ResumenMantenimiento = {
  preventivos: { programados: number; realizados: number; noRealizados: number; cumplimiento: number };
  correctivos: { abiertos: number; resueltos: number };
};

type Fila = RowDataPacket & Record<string, unknown>;

@Injectable()
export class MantenimientosService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  listarPreventivos(query: ListarMantenimientoDto) {
    validarRango(query.desde, query.hasta);
    if (query.estado && !['Programado', 'Realizado', 'No realizado'].includes(query.estado)) {
      throw new AppError('validation_error', 400, 'Estado no válido', [{ field: 'estado', reason: 'Estado no válido' }]);
    }
    return this.listar('preventivo', query);
  }

  listarCorrectivos(query: ListarMantenimientoDto) {
    validarRango(query.desde, query.hasta);
    if (query.estado && !['Pendiente', 'En proceso', 'Resuelto'].includes(query.estado)) {
      throw new AppError('validation_error', 400, 'Estado no válido', [{ field: 'estado', reason: 'Estado no válido' }]);
    }
    return this.listar('correctivo', query);
  }

  async crearPreventivo(usuario: Principal, dto: GuardarPreventivoDto, idempotencyKey?: string): Promise<Preventivo> {
    return this.crear(usuario, 'preventivo', dto, idempotencyKey);
  }

  async crearCorrectivo(usuario: Principal, dto: GuardarCorrectivoDto, idempotencyKey?: string): Promise<Correctivo> {
    return this.crear(usuario, 'correctivo', dto, idempotencyKey);
  }

  async actualizarPreventivo(id: string, dto: GuardarPreventivoDto, ifMatch: string | undefined): Promise<Preventivo> {
    return this.actualizar('preventivo', id, dto, ifMatch) as Promise<Preventivo>;
  }

  async actualizarCorrectivo(id: string, dto: GuardarCorrectivoDto, ifMatch: string | undefined): Promise<Correctivo> {
    return this.actualizar('correctivo', id, dto, ifMatch) as Promise<Correctivo>;
  }

  async eliminarPreventivo(usuario: Principal, id: string, ifMatch: string | undefined): Promise<void> {
    return this.eliminar(usuario, 'preventivo', id, ifMatch);
  }

  async eliminarCorrectivo(usuario: Principal, id: string, ifMatch: string | undefined): Promise<void> {
    return this.eliminar(usuario, 'correctivo', id, ifMatch);
  }

  async buscarEquipos(q?: string, areaId?: number, limit = 20): Promise<{ items: Equipo[] }> {
    const rows = await this.db.query<Fila>(
      `SELECT e.id, e.descripcion, e.area_id, a.nombre AS area
       FROM equipos e
       INNER JOIN areas a ON a.id = e.area_id
       WHERE (? IS NULL OR e.area_id = ?)
         AND (? IS NULL OR e.descripcion LIKE ?)
       ORDER BY e.descripcion ASC
       LIMIT ?`,
      [areaId ?? null, areaId ?? null, q ?? null, q ? `%${q}%` : null, limit],
    );
    return { items: rows.map(mapEquipo) };
  }

  async crearEquipo(descripcion: string, areaId: number): Promise<Equipo> {
    return this.db.transaction(async (connection) => {
      if (!(await this.existe(connection, 'SELECT id FROM areas WHERE id = ? LIMIT 1', [areaId]))) {
        throw new AppError('validation_error', 400, 'Revisa los datos enviados', [{ field: 'areaId', reason: 'El área no existe' }]);
      }
      try {
        const header = await this.ejecutar(
          connection,
          'INSERT INTO equipos (descripcion, area_id) VALUES (?, ?)',
          [descripcion, areaId],
        );
        const equipo = await this.unoEquipo(connection, header.insertId);
        if (!equipo) throw new AppError('internal_error', 500, 'No se pudo leer el equipo');
        return equipo;
      } catch (error) {
        if (error instanceof AppError && error.code === 'conflict') {
          throw new AppError('conflict', 409, 'Ese equipo ya existe en el área');
        }
        throw error;
      }
    });
  }

  async resumen(): Promise<ResumenMantenimiento> {
    const [preventivo] = await this.db.query<Fila>(`
      SELECT
        COALESCE(SUM(estado = 'Programado'), 0) AS programados,
        COALESCE(SUM(estado = 'Realizado'), 0) AS realizados,
        COALESCE(SUM(estado = 'No realizado'), 0) AS no_realizados
      FROM mantenimientos_preventivos
      WHERE fecha_programacion >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND fecha_programacion < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
    `);
    const [correctivo] = await this.db.query<Fila>(`
      SELECT
        COALESCE(SUM(estado IN ('Pendiente', 'En proceso')), 0) AS abiertos,
        COALESCE(SUM(estado = 'Resuelto'), 0) AS resueltos
      FROM mantenimientos_correctivos
    `);
    const programados = Number(preventivo?.programados ?? 0);
    const realizados = Number(preventivo?.realizados ?? 0);
    const noRealizados = Number(preventivo?.no_realizados ?? 0);
    const base = programados + realizados + noRealizados;
    return {
      preventivos: {
        programados,
        realizados,
        noRealizados,
        cumplimiento: base === 0 ? 0 : Math.round((realizados / base) * 100),
      },
      correctivos: {
        abiertos: Number(correctivo?.abiertos ?? 0),
        resueltos: Number(correctivo?.resueltos ?? 0),
      },
    };
  }

  private async listar(tipo: 'preventivo' | 'correctivo', query: ListarMantenimientoDto) {
    const limit = query.limit ?? 20;
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const fecha = tipo === 'preventivo' ? 'm.fecha_programacion' : 'm.fecha';
    const extra = tipo === 'correctivo'
      ? ', m.soporte_id, s.solicitante AS soporte_solicitante, s.descripcion AS soporte_descripcion'
      : '';
    const joinSoporte = tipo === 'correctivo' ? 'LEFT JOIN soportes s ON s.id = m.soporte_id' : '';
    const busqueda = tipo === 'correctivo'
      ? `(? IS NULL OR e.descripcion LIKE ? OR m.observaciones LIKE ? OR s.solicitante LIKE ? OR s.descripcion LIKE ? OR m.soporte_id = ?)`
      : `(? IS NULL OR e.descripcion LIKE ? OR m.observaciones LIKE ?)`;
    const params: unknown[] = [
      query.areaId ?? null, query.areaId ?? null,
      query.estado ?? null, query.estado ?? null,
      query.desde ?? null, query.desde ?? null,
      query.hasta ?? null, query.hasta ?? null,
    ];
    if (tipo === 'correctivo') {
      params.push(query.q ?? null, like(query.q), like(query.q), like(query.q), like(query.q), query.q ?? null);
    } else {
      params.push(query.q ?? null, like(query.q), like(query.q));
    }
    params.push(cursor?.fecha ?? null, cursor?.fecha ?? null, cursor?.fecha ?? null, cursor?.id ?? null, limit + 1);
    const rows = await this.db.query<Fila>(
      `SELECT m.id, ${fecha} AS fecha, m.area_id, a.nombre AS area, m.equipo_id, e.descripcion AS equipo,
              m.estado, m.observaciones, m.version ${extra}
       FROM ${tabla(tipo)} m
       INNER JOIN areas a ON a.id = m.area_id
       INNER JOIN equipos e ON e.id = m.equipo_id
       ${joinSoporte}
       WHERE (? IS NULL OR m.area_id = ?)
         AND (? IS NULL OR m.estado = ?)
         AND (? IS NULL OR ${fecha} >= ?)
         AND (? IS NULL OR ${fecha} <= ?)
         AND ${busqueda}
         AND (? IS NULL OR ${fecha} < ? OR (${fecha} = ? AND m.id < ?))
       ORDER BY ${fecha} DESC, m.id DESC
       LIMIT ?`,
      params,
    );
    const page = rows.slice(0, limit).map((row) => (tipo === 'preventivo' ? mapPreventivo(row) : mapCorrectivo(row)));
    const last = page[page.length - 1] as Preventivo | Correctivo | undefined;
    const fechaUltima = last && 'fechaProgramacion' in last ? last.fechaProgramacion : last && 'fecha' in last ? last.fecha : '';
    const countParams = params.slice(0, params.length - 5);
    const [conteo] = await this.db.query<Fila>(
      `SELECT COUNT(*) AS total
       FROM ${tabla(tipo)} m
       INNER JOIN equipos e ON e.id = m.equipo_id
       ${joinSoporte}
       WHERE (? IS NULL OR m.area_id = ?)
         AND (? IS NULL OR m.estado = ?)
         AND (? IS NULL OR ${fecha} >= ?)
         AND (? IS NULL OR ${fecha} <= ?)
         AND ${busqueda}`,
      countParams,
    );
    return {
      items: page,
      nextCursor: rows.length > limit && last ? encodeCursor(fechaUltima, last.id) : null,
      limit,
      total: Number(conteo?.total ?? 0),
    };
  }

  private async crear(usuario: Principal, tipo: 'preventivo' | 'correctivo', dto: GuardarPreventivoDto | GuardarCorrectivoDto, idempotencyKey?: string) {
    const key = idempotencyKey?.trim();
    if (key && key.length > 120) {
      throw new AppError('validation_error', 400, 'Idempotency-Key es demasiado larga', [{ field: 'Idempotency-Key', reason: 'Máximo 120 caracteres' }]);
    }
    return this.db.transaction(async (connection) => {
      const clave = key ? sha(key) : null;
      const hash = sha(`${tipo}:${JSON.stringify(dto)}`);
      if (clave) {
        const reserva = await this.reservar(connection, usuario.id, clave, hash);
        if (reserva === 'duplicate') return this.reutilizar(connection, usuario.id, clave, hash);
      }
      await this.validarRelaciones(connection, tipo, dto);
      const id = await this.insertar(connection, tipo, dto);
      const creado = await this.obtener(connection, tipo, id);
      if (clave) {
        await connection.query(
          `UPDATE solicitudes_idempotentes SET estado_http = 201, cuerpo = CAST(? AS JSON) WHERE usuario_id = ? AND clave = ?`,
          [JSON.stringify(creado), usuario.id, clave],
        );
      }
      return creado;
    });
  }

  private async actualizar(tipo: 'preventivo' | 'correctivo', id: string, dto: GuardarPreventivoDto | GuardarCorrectivoDto, ifMatch: string | undefined) {
    const version = leerVersion(ifMatch);
    if (!/^\d{1,20}$/.test(id)) {
      throw new AppError('validation_error', 400, 'El identificador no es válido', [{ field: 'id', reason: 'Identificador inválido' }]);
    }
    return this.db.transaction(async (connection) => {
      await this.validarRelaciones(connection, tipo, dto);
      const header = tipo === 'preventivo'
        ? await this.ejecutar(connection, `UPDATE mantenimientos_preventivos SET fecha_programacion = ?, area_id = ?, equipo_id = ?, estado = ?, observaciones = ?, actualizado_en = NOW(), version = version + 1 WHERE id = ? AND version = ?`, [dtoFecha(dto), dto.areaId, dto.equipoId, (dto as GuardarPreventivoDto).estado, dto.observaciones ?? null, id, version])
        : await this.ejecutar(connection, `UPDATE mantenimientos_correctivos SET area_id = ?, equipo_id = ?, soporte_id = ?, estado = ?, fecha = ?, observaciones = ?, actualizado_en = NOW(), version = version + 1 WHERE id = ? AND version = ?`, [(dto as GuardarCorrectivoDto).areaId, dto.equipoId, (dto as GuardarCorrectivoDto).soporteId ?? null, (dto as GuardarCorrectivoDto).estado, (dto as GuardarCorrectivoDto).fecha, dto.observaciones ?? null, id, version]);
      if (header.affectedRows !== 1) {
        const existe = await this.existe(connection, `SELECT id FROM ${tabla(tipo)} WHERE id = ? LIMIT 1`, [id]);
        if (!existe) throw new AppError('not_found', 404, 'No se encontró el mantenimiento');
        throw new AppError('precondition_failed', 412, 'El registro cambió. Vuelve a cargarlo.');
      }
      return this.obtener(connection, tipo, id);
    });
  }

  private async eliminar(usuario: Principal, tipo: 'preventivo' | 'correctivo', id: string, ifMatch: string | undefined) {
    if (usuario.rol !== 'admin') {
      throw new AppError('forbidden', 403, 'Solo un administrador puede eliminar registros');
    }
    const version = leerVersion(ifMatch);
    await this.db.transaction(async (connection) => {
      const header = await this.ejecutar(connection, `DELETE FROM ${tabla(tipo)} WHERE id = ? AND version = ?`, [id, version]);
      if (header.affectedRows === 1) return;
      const existe = await this.existe(connection, `SELECT id FROM ${tabla(tipo)} WHERE id = ? LIMIT 1`, [id]);
      if (!existe) throw new AppError('not_found', 404, 'No se encontró el mantenimiento');
      throw new AppError('precondition_failed', 412, 'El registro cambió. Vuelve a cargarlo.');
    });
  }

  private async validarRelaciones(connection: PoolConnection, tipo: 'preventivo' | 'correctivo', dto: GuardarPreventivoDto | GuardarCorrectivoDto) {
    const details = [];
    if (!(await this.existe(connection, 'SELECT id FROM areas WHERE id = ? LIMIT 1', [dto.areaId]))) {
      details.push({ field: 'areaId', reason: 'El área no existe' });
    }
    const equipo = await this.dbQuery(connection, 'SELECT id, area_id FROM equipos WHERE id = ? LIMIT 1', [dto.equipoId]);
    if (!equipo) details.push({ field: 'equipoId', reason: 'El equipo no existe' });
    else if (Number(equipo.area_id) !== Number(dto.areaId)) details.push({ field: 'equipoId', reason: 'El equipo no pertenece al área' });
    if (tipo === 'correctivo' && (dto as GuardarCorrectivoDto).soporteId) {
      const soporteId = (dto as GuardarCorrectivoDto).soporteId;
      if (!(await this.existe(connection, 'SELECT id FROM soportes WHERE id = ? LIMIT 1', [soporteId]))) {
        details.push({ field: 'soporteId', reason: 'La solicitud de soporte no existe' });
      }
    }
    if (details.length > 0) throw new AppError('validation_error', 400, 'Revisa los datos enviados', details);
  }

  private async insertar(connection: PoolConnection, tipo: 'preventivo' | 'correctivo', dto: GuardarPreventivoDto | GuardarCorrectivoDto): Promise<string> {
    if (tipo === 'preventivo') {
      const body = dto as GuardarPreventivoDto;
      const header = await this.ejecutar(connection, `INSERT INTO mantenimientos_preventivos (fecha_programacion, area_id, equipo_id, estado, observaciones, version, actualizado_en) VALUES (?, ?, ?, ?, ?, 1, NOW())`, [body.fechaProgramacion, body.areaId, body.equipoId, body.estado, body.observaciones ?? null]);
      return String(header.insertId);
    }
    const body = dto as GuardarCorrectivoDto;
    const header = await this.ejecutar(connection, `INSERT INTO mantenimientos_correctivos (area_id, equipo_id, soporte_id, estado, fecha, observaciones, version, actualizado_en) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`, [body.areaId, body.equipoId, body.soporteId ?? null, body.estado, body.fecha, body.observaciones ?? null]);
    return String(header.insertId);
  }

  private async obtener(connection: PoolConnection, tipo: 'preventivo' | 'correctivo', id: string): Promise<Preventivo | Correctivo> {
    const extra = tipo === 'correctivo' ? ', m.soporte_id, s.solicitante AS soporte_solicitante, s.descripcion AS soporte_descripcion' : '';
    const join = tipo === 'correctivo' ? 'LEFT JOIN soportes s ON s.id = m.soporte_id' : '';
    const fecha = tipo === 'preventivo' ? 'm.fecha_programacion' : 'm.fecha';
    const [row] = await this.filas(connection, `SELECT m.id, ${fecha} AS fecha, m.area_id, a.nombre AS area, m.equipo_id, e.descripcion AS equipo, m.estado, m.observaciones, m.version ${extra} FROM ${tabla(tipo)} m INNER JOIN areas a ON a.id = m.area_id INNER JOIN equipos e ON e.id = m.equipo_id ${join} WHERE m.id = ? LIMIT 1`, [id]);
    if (!row) throw new AppError('not_found', 404, 'No se encontró el mantenimiento');
    return tipo === 'preventivo' ? mapPreventivo(row) : mapCorrectivo(row);
  }

  private async reservar(connection: PoolConnection, usuarioId: number, clave: string, hash: string): Promise<'created' | 'duplicate'> {
    try {
      await connection.query(`INSERT INTO solicitudes_idempotentes (usuario_id, clave, hash_solicitud, estado_http, cuerpo, creado_en) VALUES (?, ?, ?, 0, JSON_OBJECT(), NOW())`, [usuarioId, clave, hash]);
      return 'created';
    } catch (error) {
      if (codigo(error) === 'ER_DUP_ENTRY') return 'duplicate';
      throw error;
    }
  }

  private async reutilizar(connection: PoolConnection, usuarioId: number, clave: string, hash: string) {
    const [row] = await this.filas(connection, `SELECT hash_solicitud, estado_http, cuerpo FROM solicitudes_idempotentes WHERE usuario_id = ? AND clave = ? LIMIT 1`, [usuarioId, clave]);
    if (!row) throw new AppError('conflict', 409, 'No se pudo reutilizar la solicitud');
    if (String(row.hash_solicitud) !== hash) throw new AppError('conflict', 409, 'La llave de idempotencia ya se usó con otros datos');
    if (Number(row.estado_http) !== 201) throw new AppError('conflict', 409, 'Esa solicitud ya se está procesando');
    return typeof row.cuerpo === 'string' ? JSON.parse(row.cuerpo) : row.cuerpo;
  }

  private async unoEquipo(connection: PoolConnection, id: number): Promise<Equipo | undefined> {
    const [row] = await this.filas(connection, `SELECT e.id, e.descripcion, e.area_id, a.nombre AS area FROM equipos e INNER JOIN areas a ON a.id = e.area_id WHERE e.id = ? LIMIT 1`, [id]);
    return row ? mapEquipo(row) : undefined;
  }

  private async existe(connection: PoolConnection, sql: string, params: unknown[]): Promise<boolean> {
    const rows = await this.filas(connection, sql, params);
    return rows.length === 1;
  }

  private async dbQuery(connection: PoolConnection, sql: string, params: unknown[]): Promise<Fila | undefined> {
    const [row] = await this.filas(connection, sql, params);
    return row;
  }

  private async filas(connection: PoolConnection, sql: string, params: unknown[]): Promise<Fila[]> {
    const [rows] = await connection.query<Fila[]>(sql, params);
    return rows;
  }

  private async ejecutar(connection: PoolConnection, sql: string, params: unknown[]): Promise<ResultSetHeader> {
    try {
      const [header] = await connection.query<ResultSetHeader>(sql, params);
      return header;
    } catch (error) {
      if (codigo(error) === 'ER_DUP_ENTRY') throw new AppError('conflict', 409, 'El registro ya existe');
      throw error;
    }
  }
}

function tabla(tipo: 'preventivo' | 'correctivo'): string {
  return tipo === 'preventivo' ? 'mantenimientos_preventivos' : 'mantenimientos_correctivos';
}

function like(value?: string): string | null {
  return value ? `%${value}%` : null;
}

function dtoFecha(dto: GuardarPreventivoDto | GuardarCorrectivoDto): string {
  return 'fechaProgramacion' in dto ? dto.fechaProgramacion : dto.fecha;
}

function fechaTexto(value: unknown): string {
  return String(value ?? '').slice(0, 10);
}

function mapPreventivo(row: Fila): Preventivo {
  return {
    id: String(row.id),
    fechaProgramacion: fechaTexto(row.fecha),
    areaId: Number(row.area_id),
    area: String(row.area),
    equipoId: Number(row.equipo_id),
    equipo: String(row.equipo),
    estado: row.estado as EstadoPreventivo,
    observaciones: row.observaciones === null || row.observaciones === undefined ? null : String(row.observaciones),
    version: Number(row.version),
  };
}

function mapCorrectivo(row: Fila): Correctivo {
  return {
    id: String(row.id),
    fecha: fechaTexto(row.fecha),
    areaId: Number(row.area_id),
    area: String(row.area),
    equipoId: Number(row.equipo_id),
    equipo: String(row.equipo),
    soporteId: row.soporte_id === null || row.soporte_id === undefined ? null : String(row.soporte_id),
    soporteSolicitante: row.soporte_solicitante === null || row.soporte_solicitante === undefined ? null : String(row.soporte_solicitante),
    soporteDescripcion: row.soporte_descripcion === null || row.soporte_descripcion === undefined ? null : String(row.soporte_descripcion),
    estado: row.estado as EstadoCorrectivo,
    observaciones: row.observaciones === null || row.observaciones === undefined ? null : String(row.observaciones),
    version: Number(row.version),
  };
}

function mapEquipo(row: Fila): Equipo {
  return { id: Number(row.id), descripcion: String(row.descripcion), areaId: Number(row.area_id), area: String(row.area) };
}

function sha(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function codigo(error: unknown): string {
  return typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
}

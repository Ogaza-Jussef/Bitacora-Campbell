import { createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { AppError } from '../common/app-error';
import type { Principal } from '../common/principal';
import { DatabaseService } from '../database/database.service';
import { decodeCursor } from './cursor';
import type { ListarSoportesDto } from './soporte.dto';
import type { Soporte, SoporteInput } from './soporte';
import { renderListaPdf, renderSoportePdf } from './pdf';
import { SoportesRepository } from './soportes.repository';

@Injectable()
export class SoportesService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(SoportesRepository) private readonly soportes: SoportesRepository,
  ) {}

  async listar(query: ListarSoportesDto): Promise<{ items: Soporte[]; nextCursor: string | null; limit: number; total: number }> {
    this.validarRango(query.desde, query.hasta);
    const limit = query.limit ?? 20;
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const page = await this.soportes.listar({
      limit,
      cursorFecha: cursor?.fecha ?? null,
      cursorId: cursor?.id ?? null,
      areaId: query.areaId ?? null,
      tipo: query.tipo ?? null,
      desde: query.desde ?? null,
      hasta: query.hasta ?? null,
      q: query.q ?? null,
    });
    return { ...page, limit };
  }

  async exportar(query: ListarSoportesDto): Promise<string> {
    this.validarRango(query.desde, query.hasta);
    const items = await this.soportes.exportar({
      areaId: query.areaId ?? null,
      tipo: query.tipo ?? null,
      desde: query.desde ?? null,
      hasta: query.hasta ?? null,
      q: query.q ?? null,
    });
    const header = ['Solicitante', 'Área', 'Descripción', 'Tipo de soporte', 'Fecha solicitud', 'Fecha entrega', 'Tiempo soporte', 'Realizado por'];
    const lines = items.map((item) => [
      item.solicitante,
      item.area,
      item.descripcion ?? '',
      item.tipo ?? '',
      item.fechaSolicitud ?? '',
      item.fechaEntrega ?? '',
      item.tiempoSoporte ?? '',
      item.tecnico ?? '',
    ].map(csvCell).join(','));
    return [header.join(','), ...lines].join('\n');
  }

  async imprimirLista(query: ListarSoportesDto): Promise<Buffer> {
    this.validarRango(query.desde, query.hasta);
    const items = await this.soportes.exportar({
      areaId: query.areaId ?? null,
      tipo: query.tipo ?? null,
      desde: query.desde ?? null,
      hasta: query.hasta ?? null,
      q: query.q ?? null,
    });
    if (items.length > 3000) {
      throw new AppError('validation_error', 400, 'El filtro supera 3000 soportes. Acota las fechas para imprimir.', [
        { field: 'desde', reason: 'Demasiados registros' },
      ]);
    }
    return renderListaPdf(items, await this.describirFiltro(query));
  }

  async imprimirUno(id: string): Promise<Buffer> {
    return renderSoportePdf(await this.requerir(id));
  }

  obtener(id: string): Promise<Soporte> {
    return this.requerir(id);
  }

  crear(usuario: Principal, input: SoporteInput, idempotencyKey?: string): Promise<Soporte> {
    const key = idempotencyKey?.trim();
    if (key && key.length > 120) {
      throw new AppError('validation_error', 400, 'Idempotency-Key es demasiado larga', [
        { field: 'Idempotency-Key', reason: 'Máximo 120 caracteres' },
      ]);
    }
    return this.db.transaction(async (connection) => {
      const clave = key ? sha256(key) : null;
      const hash = sha256(JSON.stringify(input));
      if (clave) {
        const reserva = await this.soportes.reservarIdempotencia(connection, usuario.id, clave, hash);
        if (reserva === 'duplicate') {
          return this.reutilizar(connection, usuario.id, clave, hash);
        }
      }
      await this.asegurarCatalogos(connection, input);
      const soporte = await this.insertarConReintento(connection, input);
      if (clave) {
        await this.soportes.completarIdempotencia(connection, usuario.id, clave, soporte);
      }
      return soporte;
    });
  }

  actualizar(id: string, input: SoporteInput, ifMatch: string | undefined): Promise<Soporte> {
    const version = leerVersion(ifMatch);
    return this.db.transaction(async (connection) => {
      await this.asegurarCatalogos(connection, input);
      const result = await this.soportes.actualizar(connection, id, input, version);
      if (result.affectedRows === 1) {
        const soporte = await this.soportes.obtener(id, connection);
        if (!soporte) {
          throw new AppError('not_found', 404, 'No se encontró el soporte');
        }
        return soporte;
      }
      await this.conflictoVersion(connection, id);
      throw new AppError('precondition_failed', 412, 'El registro cambió. Vuelve a cargarlo.');
    });
  }

  async eliminar(usuario: Principal, id: string, ifMatch: string | undefined): Promise<void> {
    if (usuario.rol !== 'admin') {
      throw new AppError('forbidden', 403, 'Solo un administrador puede eliminar registros');
    }
    const version = leerVersion(ifMatch);
    await this.db.transaction(async (connection) => {
      const affected = await this.soportes.eliminar(connection, id, version);
      if (affected === 1) {
        return;
      }
      await this.conflictoVersion(connection, id);
      throw new AppError('precondition_failed', 412, 'El registro cambió. Vuelve a cargarlo.');
    });
  }

  private async requerir(id: string): Promise<Soporte> {
    if (!/^\d{8,20}$/.test(id)) {
      throw new AppError('validation_error', 400, 'El identificador no es válido', [
        { field: 'id', reason: 'Identificador inválido' },
      ]);
    }
    const soporte = await this.soportes.obtener(id);
    if (!soporte) {
      throw new AppError('not_found', 404, 'No se encontró el soporte');
    }
    return soporte;
  }

  private async reutilizar(connection: PoolConnection, usuarioId: number, clave: string, hash: string): Promise<Soporte> {
    const previa = await this.soportes.leerIdempotencia(connection, usuarioId, clave);
    if (!previa) {
      throw new AppError('conflict', 409, 'No se pudo reutilizar la solicitud');
    }
    if (previa.hash_solicitud !== hash) {
      throw new AppError('conflict', 409, 'La llave de idempotencia ya se usó con otros datos');
    }
    if (previa.estado_http !== 201) {
      throw new AppError('conflict', 409, 'Esa solicitud ya se está procesando');
    }
    return typeof previa.cuerpo === 'string' ? JSON.parse(previa.cuerpo) as Soporte : previa.cuerpo;
  }

  private async insertarConReintento(connection: PoolConnection, input: SoporteInput): Promise<Soporte> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const id = String(Date.now() + attempt);
      try {
        await this.soportes.insertar(connection, id, input);
        const soporte = await this.soportes.obtener(id, connection);
        if (!soporte) {
          throw new AppError('internal_error', 500, 'No se pudo leer el soporte creado');
        }
        return soporte;
      } catch (error) {
        if (error instanceof AppError && error.code === 'conflict' && attempt === 0) {
          continue;
        }
        throw error;
      }
    }
    throw new AppError('conflict', 409, 'No se pudo asignar un identificador');
  }

  private async asegurarCatalogos(connection: PoolConnection, input: SoporteInput): Promise<void> {
    const details = [];
    if (!(await this.soportes.existeArea(input.areaId, connection))) {
      details.push({ field: 'areaId', reason: 'El área no existe' });
    }
    if (input.tecnicoId && !(await this.soportes.existeTecnico(input.tecnicoId, connection))) {
      details.push({ field: 'tecnicoId', reason: 'El técnico no existe' });
    }
    if (details.length > 0) {
      throw new AppError('validation_error', 400, 'Revisa los datos enviados', details);
    }
  }

  private async conflictoVersion(connection: PoolConnection, id: string): Promise<void> {
    if (!(await this.soportes.existe(connection, id))) {
      throw new AppError('not_found', 404, 'No se encontró el soporte');
    }
  }

  private async describirFiltro(query: ListarSoportesDto): Promise<string[]> {
    const partes: string[] = [];
    if (query.q) {
      partes.push(`Búsqueda: ${query.q}`);
    }
    if (query.areaId) {
      const rows = await this.db.query<RowDataPacket & { nombre: string }>(
        'SELECT nombre FROM areas WHERE id = ? LIMIT 1',
        [query.areaId],
      );
      partes.push(`Área: ${rows[0]?.nombre ?? String(query.areaId)}`);
    }
    if (query.tipo) {
      partes.push(`Tipo: ${query.tipo}`);
    }
    if (query.desde || query.hasta) {
      partes.push(`Fechas: ${query.desde ?? 'inicio'} a ${query.hasta ?? 'hoy'}`);
    }
    return partes;
  }

  private validarRango(desde?: string, hasta?: string): void {
    if (desde && hasta && desde > hasta) {
      throw new AppError('validation_error', 400, 'La fecha inicial no puede ser posterior a la final', [
        { field: 'desde', reason: 'Rango de fechas inválido' },
      ]);
    }
  }
}

function leerVersion(ifMatch: string | undefined): number {
  if (!ifMatch) {
    throw new AppError('precondition_required', 428, 'Falta la cabecera If-Match');
  }
  const match = ifMatch.match(/^(?:W\/)?"?(\d+)"?$/);
  if (!match) {
    throw new AppError('validation_error', 400, 'If-Match debe ser la versión del registro', [
      { field: 'If-Match', reason: 'Versión inválida' },
    ]);
  }
  return Number(match[1]);
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

import { Controller, Get, Inject, Query } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AppError } from '../common/app-error';
import { DatabaseService } from '../database/database.service';
import type { RowDataPacket } from 'mysql2/promise';

class ListarCatalogoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  cursor?: string;
}

type CatalogoRow = RowDataPacket & { id: number; nombre: string };

@Controller()
export class CatalogosController {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  @Get('areas')
  areas(@Query() query: ListarCatalogoDto) {
    return this.listar('areas', query);
  }

  @Get('tecnicos')
  tecnicos(@Query() query: ListarCatalogoDto) {
    return this.listar('tecnicos', query);
  }

  private async listar(tabla: 'areas' | 'tecnicos', query: ListarCatalogoDto) {
    const limit = query.limit ?? 100;
    const cursor = query.cursor ?? null;
    if (cursor && /[\u0000-\u001f]/.test(cursor)) {
      throw new AppError('validation_error', 400, 'El cursor de paginación no es válido', [
        { field: 'cursor', reason: 'Cursor inválido' },
      ]);
    }
    const rows = await this.db.query<CatalogoRow>(
      `SELECT id, nombre
       FROM ${tabla}
       WHERE (? IS NULL OR nombre > ?)
       ORDER BY nombre ASC
       LIMIT ?`,
      [cursor, cursor, limit + 1],
    );
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((row) => ({ id: Number(row.id), nombre: row.nombre }));
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.nombre ?? null : null,
      limit,
    };
  }
}

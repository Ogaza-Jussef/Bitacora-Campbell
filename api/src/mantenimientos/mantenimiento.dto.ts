import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export const ESTADOS_PREVENTIVO = ['Programado', 'Realizado', 'No realizado'] as const;
export const ESTADOS_CORRECTIVO = ['Pendiente', 'En proceso', 'Resuelto'] as const;
export type EstadoPreventivo = (typeof ESTADOS_PREVENTIVO)[number];
export type EstadoCorrectivo = (typeof ESTADOS_CORRECTIVO)[number];

function vacio(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export class ListarMantenimientoDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @Transform(vacio) @IsString() @MaxLength(200) cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) areaId?: number;
  @IsOptional() @Transform(vacio) @IsString() @MaxLength(40) estado?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) desde?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) hasta?: string;
  @IsOptional() @Transform(vacio) @IsString() @MaxLength(120) q?: string;
}

export class GuardarPreventivoDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) fechaProgramacion!: string;
  @Type(() => Number) @IsInt() @Min(1) areaId!: number;
  @Type(() => Number) @IsInt() @Min(1) equipoId!: number;
  @IsIn(ESTADOS_PREVENTIVO) estado!: EstadoPreventivo;
  @IsOptional() @Transform(vacio) @IsString() @MaxLength(4000) observaciones?: string;
}

export class GuardarCorrectivoDto {
  @Type(() => Number) @IsInt() @Min(1) areaId!: number;
  @Type(() => Number) @IsInt() @Min(1) equipoId!: number;
  @IsOptional() @Transform(vacio) @IsString() @MaxLength(20) soporteId?: string;
  @IsIn(ESTADOS_CORRECTIVO) estado!: EstadoCorrectivo;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha!: string;
  @IsOptional() @Transform(vacio) @IsString() @MaxLength(4000) observaciones?: string;
}

export class ListarEquiposDto {
  @IsOptional() @Transform(vacio) @IsString() @MaxLength(120) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) areaId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
}

export class CrearEquipoDto {
  @Transform(vacio) @IsString() @MinLength(2) @MaxLength(255) descripcion!: string;
  @Type(() => Number) @IsInt() @Min(1) areaId!: number;
}

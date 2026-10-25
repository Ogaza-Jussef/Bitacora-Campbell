import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { TIPOS_SOPORTE, type TipoSoporte } from './soporte';

function trimString({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export class ListarSoportesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(200)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  areaId?: number;

  @IsOptional()
  @IsIn(TIPOS_SOPORTE)
  tipo?: TipoSoporte;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  desde?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  hasta?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsIn(['fecha_solicitud'])
  sort?: 'fecha_solicitud';
}

export class GuardarSoporteDto {
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  solicitante!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  areaId!: number;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  descripcion!: string;

  @IsIn(TIPOS_SOPORTE)
  tipo!: TipoSoporte;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaSolicitud!: string;

  @IsOptional()
  @Transform(trimString)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaEntrega?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(80)
  tiempoSoporte?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  tecnicoId?: number;
}

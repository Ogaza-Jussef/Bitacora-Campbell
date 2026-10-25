import { AppError } from '../common/app-error';

export function encodeCursor(fecha: string, id: string): string {
  return Buffer.from(JSON.stringify({ f: fecha, i: id }), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): { fecha: string; id: string } {
  try {
    const raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { f?: unknown; i?: unknown };
    if (typeof raw.f !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.f)) throw new Error('fecha');
    if (typeof raw.i !== 'string' || !/^\d{1,20}$/.test(raw.i)) throw new Error('id');
    return { fecha: raw.f, id: raw.i };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('validation_error', 400, 'El cursor de paginación no es válido', [
      { field: 'cursor', reason: 'Cursor inválido' },
    ]);
  }
}

export function leerVersion(ifMatch: string | undefined): number {
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

export function validarRango(desde?: string, hasta?: string): void {
  if (desde && hasta && desde > hasta) {
    throw new AppError('validation_error', 400, 'La fecha inicial no puede ser posterior a la final', [
      { field: 'desde', reason: 'Rango de fechas inválido' },
    ]);
  }
}

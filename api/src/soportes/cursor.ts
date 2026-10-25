import { AppError } from '../common/app-error';

export function encodeCursor(fecha: string, id: string): string {
  return Buffer.from(JSON.stringify({ f: fecha, i: id }), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): { fecha: string; id: string } {
  try {
    const raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { f?: unknown; i?: unknown };
    if (typeof raw.f !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.f)) {
      throw new Error('fecha');
    }
    if (typeof raw.i !== 'string' || !/^\d{8,20}$/.test(raw.i)) {
      throw new Error('id');
    }
    return { fecha: raw.f, id: raw.i };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('validation_error', 400, 'El cursor de paginación no es válido', [
      { field: 'cursor', reason: 'Cursor inválido' },
    ]);
  }
}

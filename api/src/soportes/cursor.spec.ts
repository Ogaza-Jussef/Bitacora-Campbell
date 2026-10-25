import { AppError } from '../common/app-error';
import { decodeCursor, encodeCursor } from './cursor';

describe('cursor de soportes', () => {
  it('recupera la fecha y el id codificados', () => {
    const cursor = encodeCursor('2026-10-23', '1792785046710');
    expect(decodeCursor(cursor)).toEqual({ fecha: '2026-10-23', id: '1792785046710' });
  });

  it('rechaza un cursor alterado', () => {
    expect(() => decodeCursor('no-es-un-cursor')).toThrow(AppError);
    try {
      decodeCursor('no-es-un-cursor');
    } catch (error) {
      expect(error).toMatchObject({ status: 400, code: 'validation_error' });
    }
  });
});

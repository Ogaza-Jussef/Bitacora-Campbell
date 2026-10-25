import { AppError } from '../common/app-error';
import type { Principal } from '../common/principal';
import { SoportesService } from './soportes.service';

describe('SoportesService.eliminar', () => {
  const service = new SoportesService({} as never, {} as never);
  const soporte: Principal = { id: 2, email: 'soporte@fundacioncampbell.local', nombre: 'Soporte', rol: 'soporte' };

  it('niega el borrado a quien no es administrador', async () => {
    await expect(service.eliminar(soporte, '1792785046710', '"1"')).rejects.toMatchObject({
      status: 403,
      code: 'forbidden',
    });
  });

  it('exige If-Match antes de tocar la base', async () => {
    const admin: Principal = { ...soporte, rol: 'admin' };
    await expect(service.eliminar(admin, '1792785046710', undefined)).rejects.toMatchObject({
      status: 428,
      code: 'precondition_required',
    });
  });
});

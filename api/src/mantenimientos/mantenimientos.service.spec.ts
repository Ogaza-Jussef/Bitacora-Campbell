import { AppError } from '../common/app-error';
import type { Principal } from '../common/principal';
import { MantenimientosService } from './mantenimientos.service';

describe('MantenimientosService', () => {
  const service = new MantenimientosService({} as never);
  const soporte: Principal = { id: 2, email: 'soporte@fundacioncampbell.local', nombre: 'Soporte', rol: 'soporte' };
  const admin: Principal = { ...soporte, rol: 'admin' };

  it('niega el borrado de un preventivo a quien no es administrador', async () => {
    await expect(service.eliminarPreventivo(soporte, '1', '"1"')).rejects.toMatchObject({ status: 403, code: 'forbidden' });
  });

  it('exige If-Match antes de eliminar un correctivo', async () => {
    await expect(service.eliminarCorrectivo(admin, '1', undefined)).rejects.toBeInstanceOf(AppError);
    await expect(service.eliminarCorrectivo(admin, '1', undefined)).rejects.toMatchObject({ status: 428, code: 'precondition_required' });
  });

  it('rechaza un estado de preventivo desconocido antes de consultar', () => {
    expect(() => service.listarPreventivos({ estado: 'Cerrado' })).toThrow(AppError);
  });
});

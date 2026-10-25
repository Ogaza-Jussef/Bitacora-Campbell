import { AppError } from '../common/app-error';
import { LoginThrottle } from './login-throttle';

describe('LoginThrottle', () => {
  it('bloquea la clave después de 8 fallos', () => {
    const throttle = new LoginThrottle();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      throttle.assert('127.0.0.1:admin@fundacioncampbell.local');
      throttle.recordFailure('127.0.0.1:admin@fundacioncampbell.local');
    }
    expect(() => throttle.assert('127.0.0.1:admin@fundacioncampbell.local')).toThrow(AppError);
  });

  it('no mezcla los intentos de otra clave', () => {
    const throttle = new LoginThrottle();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      throttle.recordFailure('una-clave');
    }
    expect(() => throttle.assert('otra-clave')).not.toThrow();
  });
});

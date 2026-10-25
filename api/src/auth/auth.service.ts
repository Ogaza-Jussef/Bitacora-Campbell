import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AppError } from '../common/app-error';
import { getEnv } from '../config/env';
import type { Principal } from '../common/principal';
import { LoginThrottle } from './login-throttle';
import { UsuariosRepository } from './usuarios.repository';

const INVALID = 'Correo o contraseña incorrectos';
const DUMMY_HASH = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

@Injectable()
export class AuthService {
  constructor(
    @Inject(UsuariosRepository) private readonly usuarios: UsuariosRepository,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(LoginThrottle) private readonly throttle: LoginThrottle,
  ) {}

  async login(email: string, password: string, ip: string): Promise<{
    accessToken: string;
    expiresIn: string;
    user: Principal;
  }> {
    const key = `${ip}:${email}`;
    this.throttle.assert(key);
    const usuario = await this.usuarios.buscarPorEmail(email);
    const hash = usuario?.activo ? usuario.password_hash : DUMMY_HASH;
    const matches = await bcrypt.compare(password, hash);
    if (!usuario || !usuario.activo || !matches) {
      this.throttle.recordFailure(key);
      throw new AppError('unauthenticated', 401, INVALID);
    }
    this.throttle.clear(key);
    const principal: Principal = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
    };
    const accessToken = await this.jwt.signAsync({
      sub: principal.id,
      email: principal.email,
      nombre: principal.nombre,
      rol: principal.rol,
    });
    return { accessToken, expiresIn: getEnv().jwtExpiresIn, user: principal };
  }
}

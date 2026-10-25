import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getEnv } from '../config/env';
import type { Principal, Rol } from '../common/principal';
import { UsuariosRepository } from './usuarios.repository';

type JwtPayload = {
  sub: number;
  email: string;
  rol: Rol;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(UsuariosRepository) private readonly usuarios: UsuariosRepository) {
    const env = getEnv();
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.jwtSecret,
      issuer: 'bitacora-campbell',
      audience: 'bitacora-web',
    });
  }

  async validate(payload: JwtPayload): Promise<Principal> {
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException();
    }
    const usuario = await this.usuarios.buscarPorId(payload.sub);
    if (!usuario || !usuario.activo || usuario.email !== payload.email) {
      throw new UnauthorizedException();
    }
    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
    };
  }
}

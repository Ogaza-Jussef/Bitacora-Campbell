import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getEnv } from '../config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { LoginThrottle } from './login-throttle';
import { UsuariosRepository } from './usuarios.repository';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const env = getEnv();
        return {
          secret: env.jwtSecret,
          signOptions: {
            expiresIn: env.jwtExpiresSeconds,
            issuer: 'bitacora-campbell',
            audience: 'bitacora-web',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LoginThrottle, UsuariosRepository],
})
export class AuthModule {}

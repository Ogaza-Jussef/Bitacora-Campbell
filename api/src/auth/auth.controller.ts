import { Body, Controller, Get, HttpCode, Inject, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { Principal } from '../common/principal';
import { Public } from '../common/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() request: Request) {
    const ip = request.ip || request.socket.remoteAddress || 'local';
    return this.auth.login(dto.email, dto.password, ip);
  }

  @Get('me')
  me(@Req() request: Request & { user: Principal }): Principal {
    return request.user;
  }
}

import './config/load-env';
import { MiddlewareConsumer, Module, NestModule, RequestMethod, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { LoggingInterceptor } from './common/logging.interceptor';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { RolesGuard } from './common/roles.guard';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { SoportesModule } from './soportes/soportes.module';

@Module({
  imports: [DatabaseModule, AuthModule, CatalogosModule, SoportesModule, HealthModule],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}

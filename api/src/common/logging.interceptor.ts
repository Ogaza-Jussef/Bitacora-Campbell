import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { Observable, tap } from 'rxjs';
import type { Principal } from './principal';
import type { RequestWithId } from './request-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('http');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId & { user?: Principal; route?: { path?: string } }>();
    const response = http.getResponse<Response>();
    const started = Date.now();
    if (!response.headersSent) {
      response.setHeader('Cache-Control', 'no-store');
    }

    return next.handle().pipe(
      tap({
        next: () => this.write(request, response.statusCode, started),
        error: () => this.write(request, response.statusCode || 500, started),
      }),
    );
  }

  private write(
    request: RequestWithId & { user?: Principal; route?: { path?: string } },
    status: number,
    started: number,
  ): void {
    this.logger.log(JSON.stringify({
      level: status >= 500 ? 'error' : 'info',
      msg: 'http_request',
      requestId: request.requestId ?? '',
      method: request.method,
      route: request.route?.path ?? request.path,
      status,
      durationMs: Date.now() - started,
      userId: request.user?.id ?? '',
    }));
  }
}

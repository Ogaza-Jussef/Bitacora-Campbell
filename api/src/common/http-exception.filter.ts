import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { AppError } from './app-error';
import type { RequestWithId } from './request-id.middleware';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<RequestWithId>();
    const requestId = request.requestId ?? '';
    const mapped = this.map(exception);

    if (mapped.status >= 500) {
      this.logger.error(JSON.stringify({
        msg: 'unhandled_error',
        requestId,
        code: mapped.code,
        error: exception instanceof Error ? exception.message : 'unknown',
      }));
    }

    if (mapped.retryAfterSeconds) {
      response.setHeader('Retry-After', String(mapped.retryAfterSeconds));
    }

    response.status(mapped.status).json({
      error: {
        code: mapped.code,
        message: mapped.message,
        details: mapped.details,
        requestId,
      },
    });
  }

  private map(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details: { field: string; reason: string }[];
    retryAfterSeconds?: number;
  } {
    if (exception instanceof AppError) {
      return {
        status: exception.status,
        code: exception.code,
        message: exception.message,
        details: exception.details,
        retryAfterSeconds: exception.retryAfterSeconds,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (status === 400) {
        return {
          status: 400,
          code: 'validation_error',
          message: 'Revisa los datos enviados',
          details: validationDetails(body),
        };
      }
      if (status === 401) {
        return {
          status: 401,
          code: 'unauthenticated',
          message: 'Debes iniciar sesión',
          details: [],
        };
      }
      if (status === 403) {
        return { status: 403, code: 'forbidden', message: 'No tienes permiso para esta acción', details: [] };
      }
      if (status === 404) {
        return { status: 404, code: 'not_found', message: 'No se encontró el recurso', details: [] };
      }
      if (status === 429) {
        return { status: 429, code: 'rate_limited', message: 'Demasiadas solicitudes', details: [] };
      }
    }

    return {
      status: 500,
      code: 'internal_error',
      message: 'Ocurrió un error interno',
      details: [],
    };
  }
}

function validationDetails(body: unknown): { field: string; reason: string }[] {
  if (!body || typeof body !== 'object' || !('message' in body)) {
    return [];
  }
  const message = (body as { message: unknown }).message;
  if (typeof message === 'string') {
    return [{ field: 'body', reason: message }];
  }
  if (!Array.isArray(message)) {
    return [];
  }
  return message.map((item) => {
    const reason = String(item);
    const field = reason.split(' ')[0] ?? 'body';
    return { field, reason };
  });
}

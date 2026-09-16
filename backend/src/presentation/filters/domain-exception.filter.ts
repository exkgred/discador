import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../domain/errors/domain-error';

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = (ctx.getRequest<{ headers: Record<string, string> }>()
      .headers['x-request-id'] ?? crypto.randomUUID()) as string;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : Array.isArray((payload as { message?: unknown }).message)
            ? (payload as { message: string[] }).message.join(', ')
            : ((payload as { message?: string }).message ?? exception.message);

      response.status(status).json({
        success: false,
        error: {
          code: status === 400 ? 'VALIDATION_ERROR' : 'HTTP_ERROR',
          message,
          details: [],
        },
        meta: { timestamp: new Date().toISOString(), requestId },
      });
      return;
    }

    if (exception instanceof DomainError) {
      const status = this.toHttpStatus(exception);
      response.status(status).json({
        success: false,
        error: {
          code: exception.code,
          message: exception.message,
          details: [],
        },
        meta: { timestamp: new Date().toISOString(), requestId },
      });
      return;
    }

    this.logger.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: [],
      },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  }

  private toHttpStatus(error: DomainError): number {
    if (error instanceof UnauthorizedError) return HttpStatus.UNAUTHORIZED;
    if (error instanceof ForbiddenError) return HttpStatus.FORBIDDEN;
    if (error instanceof NotFoundError) return HttpStatus.NOT_FOUND;
    if (error instanceof ConflictError) return HttpStatus.CONFLICT;
    if (error instanceof ValidationError) return HttpStatus.BAD_REQUEST;
    if (error instanceof BusinessRuleError)
      return HttpStatus.UNPROCESSABLE_ENTITY;
    return HttpStatus.UNPROCESSABLE_ENTITY;
  }
}

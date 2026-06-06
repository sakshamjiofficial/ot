import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx      = host.switchToHttp();
    const request  = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: string[] | null = null;

    // ─── HttpException (NestJS + class-validator) ──────────
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || message;
        if (Array.isArray(resObj.message)) {
          errors  = resObj.message;
          message = 'Validation failed';
        }
      } else {
        message = res as string;
      }
    }

    // ─── TypeORM query errors ──────────────────────────────
    else if (exception instanceof QueryFailedError) {
      const err = exception as any;
      if (err.code === '23505') {          // unique_violation
        status  = HttpStatus.CONFLICT;
        message = 'Resource already exists';
      } else if (err.code === '23503') {   // foreign_key_violation
        status  = HttpStatus.BAD_REQUEST;
        message = 'Referenced resource not found';
      } else {
        this.logger.error('DB query error', err.message);
      }
    }

    // ─── Unknown errors ────────────────────────────────────
    else {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      path:      request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

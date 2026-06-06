import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request  = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const userId    = request.user?.id || 'anonymous';
    const start     = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const ms = Date.now() - start;
          this.logger.log(
            `${method} ${url} ${statusCode} ${ms}ms | user:${userId} | ${ip} | ${userAgent}`,
          );
        },
        error: (error) => {
          const ms = Date.now() - start;
          this.logger.warn(
            `${method} ${url} ERROR ${ms}ms | user:${userId} | ${error.message}`,
          );
        },
      }),
    );
  }
}

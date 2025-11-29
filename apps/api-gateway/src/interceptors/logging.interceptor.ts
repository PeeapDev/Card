import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const startTime = Date.now();

    const { method, url, headers } = request;
    const requestId = headers['x-request-id'] as string;
    const correlationId = headers['x-correlation-id'] as string;
    const userAgent = headers['user-agent'] || 'unknown';
    const ip = request.ip || request.socket.remoteAddress;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          this.logger.log(
            JSON.stringify({
              requestId,
              correlationId,
              method,
              url,
              statusCode,
              duration,
              ip,
              userAgent,
            }),
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            JSON.stringify({
              requestId,
              correlationId,
              method,
              url,
              statusCode,
              duration,
              ip,
              userAgent,
              error: error.message,
            }),
          );
        },
      }),
    );
  }
}

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { firstValueFrom, catchError, timeout, of } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';

interface ServiceConfig {
  url: string;
  timeout?: number;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly services: Map<string, ServiceConfig>;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.services = new Map([
      ['identity', { url: this.configService.get('IDENTITY_SERVICE_URL', 'http://localhost:3001') }],
      ['account', { url: this.configService.get('ACCOUNT_SERVICE_URL', 'http://localhost:3002') }],
      ['card', { url: this.configService.get('CARD_SERVICE_URL', 'http://localhost:3003') }],
      ['transaction', { url: this.configService.get('TRANSACTION_SERVICE_URL', 'http://localhost:3004') }],
      ['fraud', { url: this.configService.get('FRAUD_SERVICE_URL', 'http://localhost:3005') }],
      ['merchant', { url: this.configService.get('MERCHANT_SERVICE_URL', 'http://localhost:3006') }],
      ['settlement', { url: this.configService.get('SETTLEMENT_SERVICE_URL', 'http://localhost:3007') }],
      ['developer', { url: this.configService.get('DEVELOPER_SERVICE_URL', 'http://localhost:3008') }],
      ['notification', { url: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:3009') }],
    ]);
  }

  async proxyRequest(
    serviceName: string,
    path: string,
    req: Request,
  ): Promise<any> {
    const service = this.services.get(serviceName);

    if (!service) {
      throw new HttpException(
        `Service '${serviceName}' not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const targetUrl = `${service.url}${path}`;
    const serviceTimeout = service.timeout || 30000;

    // Prepare headers
    const headers: Record<string, string> = {};
    const forwardHeaders = [
      'authorization',
      'x-request-id',
      'x-correlation-id',
      'x-api-key',
      'content-type',
      'accept',
      'user-agent',
    ];

    for (const header of forwardHeaders) {
      const value = req.headers[header];
      if (value && typeof value === 'string') {
        headers[header] = value;
      }
    }

    // Add client IP
    headers['x-forwarded-for'] = req.ip || req.socket.remoteAddress || 'unknown';
    headers['x-original-uri'] = req.originalUrl;

    this.logger.debug(`Proxying ${req.method} ${targetUrl}`);

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: req.method,
          url: targetUrl,
          headers,
          data: req.body,
          params: req.query,
          validateStatus: () => true, // Don't throw on any status
        }).pipe(
          timeout(serviceTimeout),
          catchError((error: AxiosError) => {
            if (error.code === 'ECONNREFUSED') {
              throw new HttpException(
                `Service '${serviceName}' is unavailable`,
                HttpStatus.SERVICE_UNAVAILABLE,
              );
            }
            if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
              throw new HttpException(
                `Request to '${serviceName}' timed out`,
                HttpStatus.GATEWAY_TIMEOUT,
              );
            }
            throw error;
          }),
        ),
      );

      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Proxy error for ${serviceName}: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new HttpException(
        'Gateway error',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  getServiceHealth(serviceName: string): Promise<boolean> {
    const service = this.services.get(serviceName);
    if (!service) {
      return Promise.resolve(false);
    }

    return firstValueFrom(
      this.httpService.get<{ status: string }>(`${service.url}/health/live`).pipe(
        timeout(5000),
        catchError(() => {
          return of({ data: { status: 'error' } } as AxiosResponse<{ status: string }>);
        }),
      ),
    ).then(response => response?.data?.status === 'ok');
  }

  async getAllServicesHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    for (const [name] of this.services) {
      health[name] = await this.getServiceHealth(name);
    }

    return health;
  }
}

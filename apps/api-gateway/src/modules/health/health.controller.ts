import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ProxyService } from '../proxy/proxy.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private proxyService: ProxyService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Gateway health check' })
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  async readiness() {
    return { status: 'ok' };
  }

  @Get('services')
  @ApiOperation({ summary: 'Check all downstream services health' })
  async servicesHealth() {
    const health = await this.proxyService.getAllServicesHealth();

    const allHealthy = Object.values(health).every(h => h);

    return {
      status: allHealthy ? 'ok' : 'degraded',
      services: health,
      timestamp: new Date().toISOString(),
    };
  }
}

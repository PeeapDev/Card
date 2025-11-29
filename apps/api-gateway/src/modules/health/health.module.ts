import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { ProxyModule } from '../proxy/proxy.module';

@Module({
  imports: [TerminusModule, ProxyModule],
  controllers: [HealthController],
})
export class HealthModule {}

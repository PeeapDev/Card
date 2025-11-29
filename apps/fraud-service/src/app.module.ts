import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { FraudModule } from './modules/fraud/fraud.module';
import { RulesModule } from './modules/rules/rules.module';
import { FraudRule, RiskScore } from '@payment-system/database';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get('DB_PORT', 5432),
        username: config.get('DB_USER', 'fraud_user'),
        password: config.get('DB_PASSWORD', 'fraud_pass'),
        database: config.get('DB_NAME', 'fraud_db'),
        entities: [FraudRule, RiskScore],
        synchronize: config.get('NODE_ENV') === 'development',
      }),
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: config.get('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),
    FraudModule,
    RulesModule,
  ],
})
export class AppModule {}

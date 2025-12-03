import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from './modules/health/health.module';
import { MonimeModule } from './modules/monime/monime.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UsersModule } from './modules/users/users.module';
import { UploadModule } from './modules/upload/upload.module';
import { PaymentSettings } from '@payment-system/database';
import { MonimeTransaction } from './modules/monime/entities/monime-transaction.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Use Supabase PostgreSQL via direct connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const supabaseUrl = configService.get('SUPABASE_URL', '');
        const supabaseDbPassword = configService.get('SUPABASE_DB_PASSWORD');

        // Extract project ref from Supabase URL
        const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
        const host = supabaseDbPassword
          ? `db.${projectRef}.supabase.co`
          : configService.get('DB_HOST', 'localhost');

        console.log(`Connecting to database at: ${host}`);

        return {
          type: 'postgres',
          host,
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get('DB_USER', 'postgres'),
          password: supabaseDbPassword || configService.get('DB_PASSWORD', 'postgres'),
          database: configService.get('DB_NAME', 'postgres'),
          // Only include entities we need for Monime checkout flow
          entities: [MonimeTransaction, PaymentSettings],
          // Don't sync in production - use migrations
          synchronize: configService.get('NODE_ENV') === 'development',
          logging: configService.get('DB_LOGGING', 'false') === 'true',
          ssl: supabaseDbPassword ? { rejectUnauthorized: false } : false,
          // Connection pool settings for production
          extra: {
            max: 10,
            connectionTimeoutMillis: 5000,
          },
        };
      },
    }),

    HealthModule,
    MonimeModule,
    SettingsModule,
    UsersModule,
    UploadModule,
  ],
})
export class AppModule {}

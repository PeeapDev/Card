import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MonimeController } from './monime.controller';
import { MonimeService } from './monime.service';
import { MonimeApiService } from './monime-api.service';
import { MonimeTransaction } from './entities/monime-transaction.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MonimeTransaction]),
    ConfigModule,
    forwardRef(() => SettingsModule),
  ],
  controllers: [MonimeController],
  providers: [MonimeService, MonimeApiService],
  exports: [MonimeService, MonimeApiService],
})
export class MonimeModule {}

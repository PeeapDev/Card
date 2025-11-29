import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card, CardRequest } from '@payment-system/database';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { TokenVaultModule } from '../token-vault/token-vault.module';

@Module({
  imports: [TypeOrmModule.forFeature([Card, CardRequest]), TokenVaultModule],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CardToken } from '@payment-system/database';
import { TokenVaultService } from './token-vault.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([CardToken]), ConfigModule],
  providers: [TokenVaultService],
  exports: [TokenVaultService],
})
export class TokenVaultModule {}

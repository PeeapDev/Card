import { Module } from '@nestjs/common';
import { P2PTransferController } from './p2p-transfer.controller';
import { P2PTransferService } from './p2p-transfer.service';
import { CryptoModule } from '../crypto/crypto.module';

@Module({
  imports: [CryptoModule],
  controllers: [P2PTransferController],
  providers: [P2PTransferService],
  exports: [P2PTransferService],
})
export class P2PTransferModule {}

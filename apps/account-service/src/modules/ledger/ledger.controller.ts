import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';

@ApiTags('Ledger')
@Controller('ledger')
@ApiBearerAuth()
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('accounts/:accountId/balance')
  @ApiOperation({ summary: 'Get account balance' })
  @ApiResponse({ status: 200, description: 'Account balance' })
  async getBalance(@Param('accountId') accountId: string) {
    const balance = await this.ledgerService.getAccountBalance(accountId);
    return { accountId, balance };
  }

  @Get('accounts/:accountId/entries')
  @ApiOperation({ summary: 'Get account entries' })
  @ApiResponse({ status: 200, description: 'List of ledger entries' })
  async getEntries(
    @Param('accountId') accountId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.ledgerService.getAccountEntries(accountId, limit, offset);
  }

  @Get('journals/reference/:reference')
  @ApiOperation({ summary: 'Get journals by reference' })
  @ApiResponse({ status: 200, description: 'List of journal entries' })
  async getJournalsByReference(@Param('reference') reference: string) {
    return this.ledgerService.getJournalsByReference(reference);
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Verify trial balance' })
  @ApiResponse({ status: 200, description: 'Trial balance verification' })
  async verifyTrialBalance() {
    return this.ledgerService.verifyTrialBalance();
  }
}

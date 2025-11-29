import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { TransactionEntryMode } from '@payment-system/database';

class AuthorizeDto {
  cardToken: string;
  amount: number;
  currency: string;
  merchantId: string;
  merchantName?: string;
  merchantMcc?: string;
  terminalId?: string;
  entryMode: TransactionEntryMode;
  description?: string;
}

class CaptureDto {
  amount?: number;
  finalCapture?: boolean;
}

class RefundDto {
  amount: number;
  reason?: string;
}

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('authorize')
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Authorize a transaction' })
  @ApiResponse({ status: 201, description: 'Transaction authorized' })
  async authorize(
    @Body() dto: AuthorizeDto,
    @Headers('x-forwarded-for') ipAddress?: string,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.transactionsService.authorize({
      ...dto,
      ipAddress,
      deviceId,
    });
  }

  @Post(':transactionId/capture')
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Capture an authorized transaction' })
  @ApiResponse({ status: 200, description: 'Transaction captured' })
  async capture(
    @Param('transactionId') transactionId: string,
    @Body() dto: CaptureDto,
  ) {
    const transaction = await this.transactionsService.capture({
      transactionId,
      ...dto,
    });

    return {
      transactionId: transaction.id,
      status: transaction.state,
      capturedAmount: transaction.capturedAmount,
      feeAmount: transaction.feeAmount,
      netAmount: transaction.netAmount,
    };
  }

  @Post(':transactionId/void')
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Void an authorized transaction' })
  @ApiResponse({ status: 200, description: 'Transaction voided' })
  async void(
    @Param('transactionId') transactionId: string,
    @Body('reason') reason: string,
  ) {
    const transaction = await this.transactionsService.void(transactionId, reason);

    return {
      transactionId: transaction.id,
      status: transaction.state,
      voidedAt: transaction.voidedAt,
    };
  }

  @Post(':transactionId/refund')
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Refund a captured transaction' })
  @ApiResponse({ status: 200, description: 'Transaction refunded' })
  async refund(
    @Param('transactionId') transactionId: string,
    @Body() dto: RefundDto,
  ) {
    const transaction = await this.transactionsService.refund({
      transactionId,
      ...dto,
    });

    return {
      transactionId: transaction.id,
      status: transaction.state,
      refundedAmount: transaction.refundedAmount,
      remainingAmount: Number(transaction.capturedAmount) - Number(transaction.refundedAmount),
    };
  }

  @Get(':transactionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction details' })
  @ApiResponse({ status: 200, description: 'Transaction details' })
  async getTransaction(@Param('transactionId') transactionId: string) {
    return this.transactionsService.getTransaction(transactionId);
  }

  @Get(':transactionId/history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction event history' })
  @ApiResponse({ status: 200, description: 'Transaction history' })
  async getTransactionHistory(@Param('transactionId') transactionId: string) {
    return this.transactionsService.getTransactionHistory(transactionId);
  }

  @Get('user/:userId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user transactions' })
  @ApiResponse({ status: 200, description: 'User transactions' })
  async getUserTransactions(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.transactionsService.getUserTransactions(userId, limit, offset);
  }

  @Get('merchant/:merchantId')
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Get merchant transactions' })
  @ApiResponse({ status: 200, description: 'Merchant transactions' })
  async getMerchantTransactions(
    @Param('merchantId') merchantId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.transactionsService.getMerchantTransactions(merchantId, limit, offset);
  }
}

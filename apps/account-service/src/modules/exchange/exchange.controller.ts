import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ExchangeService } from './exchange.service';
import {
  GetExchangeRateDto,
  CalculateExchangeDto,
  ExecuteExchangeDto,
  SetExchangeRateDto,
  SetExchangePermissionDto,
  ExchangeRateResponseDto,
  ExchangeCalculationResponseDto,
  CanExchangeResponseDto,
  ExecuteExchangeResponseDto,
  ExchangeTransactionResponseDto,
  ExchangePermissionResponseDto,
  PaginatedResponseDto,
} from './dto/exchange.dto';

@ApiTags('Exchange')
@Controller('exchange')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  // =====================================================
  // PUBLIC ENDPOINTS
  // =====================================================

  @Get('rate')
  @ApiOperation({ summary: 'Get current exchange rate between two currencies' })
  @ApiResponse({ status: 200, type: ExchangeRateResponseDto })
  @ApiQuery({ name: 'fromCurrency', example: 'USD' })
  @ApiQuery({ name: 'toCurrency', example: 'SLE' })
  async getExchangeRate(
    @Query('fromCurrency') fromCurrency: string,
    @Query('toCurrency') toCurrency: string,
  ): Promise<ExchangeRateResponseDto> {
    return this.exchangeService.getExchangeRate({ fromCurrency, toCurrency });
  }

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate exchange preview with fees' })
  @ApiResponse({ status: 200, type: ExchangeCalculationResponseDto })
  async calculateExchange(
    @Headers('x-user-id') userId: string,
    @Body() dto: CalculateExchangeDto,
  ): Promise<ExchangeCalculationResponseDto> {
    return this.exchangeService.calculateExchange(dto, userId);
  }

  @Get('can-exchange')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user can exchange and get their limits' })
  @ApiResponse({ status: 200, type: CanExchangeResponseDto })
  @ApiQuery({ name: 'amount', required: false, description: 'Amount to check against limits' })
  async canExchange(
    @Headers('x-user-id') userId: string,
    @Query('amount') amount?: string,
  ): Promise<CanExchangeResponseDto> {
    const amountNum = amount ? parseFloat(amount) : undefined;
    return this.exchangeService.canUserExchange(userId, amountNum);
  }

  @Post('execute')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute currency exchange between user wallets' })
  @ApiResponse({ status: 200, type: ExecuteExchangeResponseDto })
  async executeExchange(
    @Headers('x-user-id') userId: string,
    @Body() dto: ExecuteExchangeDto,
  ): Promise<ExecuteExchangeResponseDto> {
    return this.exchangeService.executeExchange(userId, dto);
  }

  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user exchange history' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getExchangeHistory(
    @Headers('x-user-id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResponseDto<ExchangeTransactionResponseDto>> {
    return this.exchangeService.getExchangeHistory(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // =====================================================
  // ADMIN ENDPOINTS
  // =====================================================

  @Get('admin/rates')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all exchange rates (admin)' })
  @ApiResponse({ status: 200, type: [ExchangeRateResponseDto] })
  async getAllExchangeRates(): Promise<ExchangeRateResponseDto[]> {
    return this.exchangeService.getAllExchangeRates();
  }

  @Post('admin/rate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set exchange rate (admin)' })
  @ApiResponse({ status: 200, type: ExchangeRateResponseDto })
  async setExchangeRate(
    @Headers('x-user-id') adminId: string,
    @Body() dto: SetExchangeRateDto,
  ): Promise<ExchangeRateResponseDto> {
    return this.exchangeService.setExchangeRate(adminId, dto);
  }

  @Get('admin/permissions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all exchange permissions (admin)' })
  @ApiResponse({ status: 200, type: [ExchangePermissionResponseDto] })
  async getAllPermissions(): Promise<ExchangePermissionResponseDto[]> {
    return this.exchangeService.getAllPermissions();
  }

  @Post('admin/permission')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set exchange permission for user type (superadmin)' })
  @ApiResponse({ status: 200, type: ExchangePermissionResponseDto })
  async setExchangePermission(
    @Body() dto: SetExchangePermissionDto,
  ): Promise<ExchangePermissionResponseDto> {
    return this.exchangeService.setExchangePermission(dto);
  }

  @Get('admin/transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all exchange transactions (admin)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getAllExchangeTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResponseDto<ExchangeTransactionResponseDto>> {
    return this.exchangeService.getAllExchangeTransactions(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}

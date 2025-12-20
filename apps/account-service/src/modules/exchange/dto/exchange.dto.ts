import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  Length,
} from 'class-validator';

// =====================================================
// REQUEST DTOs
// =====================================================

export class GetExchangeRateDto {
  @ApiProperty({ description: 'Source currency code', example: 'USD' })
  @IsString()
  @Length(3, 3)
  fromCurrency: string;

  @ApiProperty({ description: 'Target currency code', example: 'SLE' })
  @IsString()
  @Length(3, 3)
  toCurrency: string;
}

export class CalculateExchangeDto {
  @ApiProperty({ description: 'Amount to exchange' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Source currency code', example: 'USD' })
  @IsString()
  @Length(3, 3)
  fromCurrency: string;

  @ApiProperty({ description: 'Target currency code', example: 'SLE' })
  @IsString()
  @Length(3, 3)
  toCurrency: string;
}

export class ExecuteExchangeDto {
  @ApiProperty({ description: 'Source wallet ID' })
  @IsUUID()
  fromWalletId: string;

  @ApiProperty({ description: 'Destination wallet ID' })
  @IsUUID()
  toWalletId: string;

  @ApiProperty({ description: 'Amount to exchange from source wallet' })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class SetExchangeRateDto {
  @ApiProperty({ description: 'Source currency code', example: 'USD' })
  @IsString()
  @Length(3, 3)
  fromCurrency: string;

  @ApiProperty({ description: 'Target currency code', example: 'SLE' })
  @IsString()
  @Length(3, 3)
  toCurrency: string;

  @ApiProperty({ description: 'Exchange rate', example: 22.5 })
  @IsNumber()
  @Min(0)
  rate: number;

  @ApiPropertyOptional({ description: 'Margin percentage (0-100)', example: 1.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  marginPercentage?: number;
}

export class SetExchangePermissionDto {
  @ApiProperty({ description: 'User type', example: 'user' })
  @IsString()
  userType: string;

  @ApiProperty({ description: 'Whether exchange is enabled' })
  @IsBoolean()
  canExchange: boolean;

  @ApiPropertyOptional({ description: 'Daily limit in USD equivalent' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyLimit?: number;

  @ApiPropertyOptional({ description: 'Monthly limit in USD equivalent' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyLimit?: number;

  @ApiPropertyOptional({ description: 'Minimum exchange amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum single exchange amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Fee percentage for this user type' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  feePercentage?: number;
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// =====================================================
// RESPONSE DTOs
// =====================================================

export class ExchangeRateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fromCurrency: string;

  @ApiProperty()
  toCurrency: string;

  @ApiProperty()
  rate: number;

  @ApiProperty()
  marginPercentage: number;

  @ApiProperty({ description: 'Effective rate after margin' })
  effectiveRate: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  updatedAt: Date;
}

export class ExchangeCalculationResponseDto {
  @ApiProperty()
  fromCurrency: string;

  @ApiProperty()
  toCurrency: string;

  @ApiProperty()
  fromAmount: number;

  @ApiProperty()
  toAmount: number;

  @ApiProperty()
  exchangeRate: number;

  @ApiProperty()
  feeAmount: number;

  @ApiProperty()
  feePercentage: number;

  @ApiProperty()
  netAmount: number;
}

export class CanExchangeResponseDto {
  @ApiProperty()
  allowed: boolean;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  dailyRemaining?: number;

  @ApiPropertyOptional()
  monthlyRemaining?: number;

  @ApiPropertyOptional()
  feePercentage?: number;
}

export class ExchangeTransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fromWalletId: string;

  @ApiProperty()
  toWalletId: string;

  @ApiProperty()
  fromCurrency: string;

  @ApiProperty()
  toCurrency: string;

  @ApiProperty()
  fromAmount: number;

  @ApiProperty()
  toAmount: number;

  @ApiProperty()
  exchangeRate: number;

  @ApiProperty()
  feeAmount: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  reference: string;

  @ApiProperty()
  createdAt: Date;
}

export class ExecuteExchangeResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  transaction?: ExchangeTransactionResponseDto;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional()
  fromWalletNewBalance?: number;

  @ApiPropertyOptional()
  toWalletNewBalance?: number;
}

export class ExchangePermissionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userType: string;

  @ApiProperty()
  canExchange: boolean;

  @ApiPropertyOptional()
  dailyLimit?: number;

  @ApiPropertyOptional()
  monthlyLimit?: number;

  @ApiPropertyOptional()
  minAmount?: number;

  @ApiPropertyOptional()
  maxAmount?: number;

  @ApiProperty()
  feePercentage: number;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedResponseDto<T> {
  @ApiProperty()
  data: T[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

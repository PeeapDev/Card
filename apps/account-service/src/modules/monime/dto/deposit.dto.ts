import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  IsUrl,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum DepositMethod {
  CHECKOUT_SESSION = 'CHECKOUT_SESSION', // Hosted payment page
  PAYMENT_CODE = 'PAYMENT_CODE', // USSD payment code
  MOBILE_MONEY = 'MOBILE_MONEY', // Direct mobile money
}

export class InitiateDepositDto {
  @ApiProperty({ description: 'Wallet ID to deposit into' })
  @IsString()
  walletId: string;

  @ApiProperty({ description: 'Amount in minor units (cents)', example: 10000 })
  @IsNumber()
  @IsPositive()
  @Min(100) // Minimum 1 SLE
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'SLE', default: 'SLE' })
  @IsString()
  currency: string = 'SLE';

  @ApiProperty({ enum: DepositMethod, default: DepositMethod.CHECKOUT_SESSION })
  @IsEnum(DepositMethod)
  method: DepositMethod = DepositMethod.CHECKOUT_SESSION;

  @ApiPropertyOptional({ description: 'Success redirect URL' })
  @IsOptional()
  @IsUrl()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'Cancel redirect URL' })
  @IsOptional()
  @IsUrl()
  cancelUrl?: string;

  @ApiPropertyOptional({ description: 'Phone number for mobile money' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Optional description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class DepositResponseDto {
  @ApiProperty({ description: 'Internal deposit transaction ID' })
  id: string;

  @ApiProperty({ description: 'Monime reference ID' })
  monimeReference: string;

  @ApiProperty({ description: 'Status of the deposit' })
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

  @ApiPropertyOptional({ description: 'URL to complete payment (for checkout session)' })
  paymentUrl?: string;

  @ApiPropertyOptional({ description: 'USSD code (for payment code method)' })
  ussdCode?: string;

  @ApiProperty({ description: 'Amount in minor units' })
  amount: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Expiry timestamp' })
  expiresAt: string;

  @ApiPropertyOptional({ description: 'Additional details' })
  metadata?: Record<string, string>;
}

export class DepositStatusDto {
  @ApiProperty({ description: 'Deposit transaction ID' })
  id: string;

  @ApiProperty({ description: 'Current status' })
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

  @ApiProperty({ description: 'Amount deposited' })
  amount: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiPropertyOptional({ description: 'Wallet ID credited' })
  walletId?: string;

  @ApiPropertyOptional({ description: 'Completion timestamp' })
  completedAt?: string;

  @ApiPropertyOptional({ description: 'Failure reason if failed' })
  failureReason?: string;
}

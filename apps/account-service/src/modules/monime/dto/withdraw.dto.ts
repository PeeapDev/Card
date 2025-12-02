import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  ValidateNested,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum WithdrawMethod {
  MOBILE_MONEY = 'MOBILE_MONEY', // Cash out to mobile money
  BANK_TRANSFER = 'BANK_TRANSFER', // Cash out to bank account
}

export class MobileMoneyDestinationDto {
  @ApiProperty({ description: 'Mobile money phone number', example: '+23276123456' })
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Invalid phone number format' })
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Mobile money provider (e.g., orange, africell)' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Account holder name' })
  @IsOptional()
  @IsString()
  accountName?: string;
}

export class BankDestinationDto {
  @ApiProperty({ description: 'Bank code/ID from Monime' })
  @IsString()
  bankCode: string;

  @ApiProperty({ description: 'Bank account number' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: 'Account holder name' })
  @IsString()
  accountName: string;
}

export class InitiateWithdrawDto {
  @ApiProperty({ description: 'Wallet ID to withdraw from' })
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

  @ApiProperty({ enum: WithdrawMethod })
  @IsEnum(WithdrawMethod)
  method: WithdrawMethod;

  @ApiPropertyOptional({ description: 'Mobile money destination' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MobileMoneyDestinationDto)
  mobileMoneyDestination?: MobileMoneyDestinationDto;

  @ApiPropertyOptional({ description: 'Bank destination' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDestinationDto)
  bankDestination?: BankDestinationDto;

  @ApiPropertyOptional({ description: 'Optional description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'PIN for verification' })
  @IsOptional()
  @IsString()
  pin?: string;
}

export class WithdrawResponseDto {
  @ApiProperty({ description: 'Internal withdrawal transaction ID' })
  id: string;

  @ApiProperty({ description: 'Monime payout reference ID' })
  monimeReference: string;

  @ApiProperty({ description: 'Status of the withdrawal' })
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'delayed';

  @ApiProperty({ description: 'Amount in minor units' })
  amount: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiPropertyOptional({ description: 'Fee charged' })
  fee?: number;

  @ApiPropertyOptional({ description: 'Net amount after fees' })
  netAmount?: number;

  @ApiProperty({ description: 'Destination type' })
  destinationType: WithdrawMethod;

  @ApiPropertyOptional({ description: 'Masked destination (phone or account)' })
  maskedDestination?: string;

  @ApiPropertyOptional({ description: 'Estimated completion time' })
  estimatedCompletionTime?: string;

  @ApiPropertyOptional({ description: 'Additional details' })
  metadata?: Record<string, string>;
}

export class WithdrawStatusDto {
  @ApiProperty({ description: 'Withdrawal transaction ID' })
  id: string;

  @ApiProperty({ description: 'Current status' })
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'delayed';

  @ApiProperty({ description: 'Amount withdrawn' })
  amount: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiPropertyOptional({ description: 'Fee charged' })
  fee?: number;

  @ApiPropertyOptional({ description: 'Wallet ID debited' })
  walletId?: string;

  @ApiPropertyOptional({ description: 'Completion timestamp' })
  completedAt?: string;

  @ApiPropertyOptional({ description: 'Failure reason if failed' })
  failureReason?: string;

  @ApiPropertyOptional({ description: 'Delay reason if delayed' })
  delayReason?: string;
}

export class ListBanksResponseDto {
  @ApiProperty({ description: 'Bank provider ID' })
  providerId: string;

  @ApiProperty({ description: 'Bank name' })
  name: string;

  @ApiProperty({ description: 'Country code' })
  country: string;

  @ApiProperty({ description: 'Whether payout is supported' })
  payoutSupported: boolean;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// OAuth DTOs
// ============================================================================

export class TokenRequestDto {
  @ApiProperty({ example: 'authorization_code', description: 'Grant type' })
  @IsString()
  grant_type: string;

  @ApiProperty({ example: 'school_saas', description: 'OAuth client ID' })
  @IsString()
  client_id: string;

  @ApiProperty({ description: 'OAuth client secret' })
  @IsString()
  client_secret: string;

  @ApiPropertyOptional({ description: 'Authorization code (for authorization_code grant)' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'Redirect URI (for authorization_code grant)' })
  @IsString()
  @IsOptional()
  redirect_uri?: string;

  @ApiPropertyOptional({ description: 'Refresh token (for refresh_token grant)' })
  @IsString()
  @IsOptional()
  refresh_token?: string;
}

export class TokenResponseDto {
  @ApiProperty({ description: 'Access token' })
  access_token: string;

  @ApiProperty({ description: 'Refresh token' })
  refresh_token: string;

  @ApiProperty({ example: 3600, description: 'Token expiry in seconds' })
  expires_in: number;

  @ApiProperty({ example: 'Bearer', description: 'Token type' })
  token_type: string;

  @ApiPropertyOptional({ description: 'Granted scopes' })
  scope?: string;

  @ApiPropertyOptional({ description: 'User information' })
  user?: {
    peeap_id: string;
    email?: string;
  };

  @ApiPropertyOptional({ description: 'School connection details' })
  school_connection?: {
    peeap_school_id?: string;
  };
}

export class TokenErrorDto {
  @ApiProperty({ example: 'invalid_grant', description: 'Error code' })
  error: string;

  @ApiProperty({ description: 'Human-readable error description' })
  error_description: string;
}

// ============================================================================
// Wallet DTOs
// ============================================================================

export class WalletBalanceDto {
  @ApiProperty({ example: 'wal_abc123', description: 'Wallet ID' })
  wallet_id: string;

  @ApiProperty({ example: 'John Doe', description: 'Wallet owner name' })
  owner_name: string;

  @ApiProperty({ example: 'student', description: 'Owner type' })
  owner_type: string;

  @ApiPropertyOptional({ example: 'SL-2025-02-00368', description: 'Student index number' })
  index_number?: string;

  @ApiProperty({ example: 150.00, description: 'Current balance' })
  balance: number;

  @ApiProperty({ example: 'NLE', description: 'Currency code' })
  currency: string;

  @ApiProperty({ example: 100.00, description: 'Daily spending limit' })
  daily_limit: number;

  @ApiProperty({ example: 25.00, description: 'Amount spent today' })
  daily_spent: number;

  @ApiProperty({ example: 75.00, description: 'Amount available to spend today' })
  available_today: number;

  @ApiProperty({ example: 'active', description: 'Wallet status' })
  status: string;

  @ApiPropertyOptional({ description: 'Timestamp of last transaction' })
  last_transaction_at?: string;
}

export class WalletBalanceResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: WalletBalanceDto })
  data: WalletBalanceDto;
}

// ============================================================================
// Payment DTOs
// ============================================================================

export class PaymentItemDto {
  @ApiProperty({ example: 'Rice and Chicken', description: 'Item name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1, description: 'Quantity' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 20.00, description: 'Unit price' })
  @IsNumber()
  @Min(0)
  price: number;
}

export class PaymentMetadataDto {
  @ApiPropertyOptional({ example: 1, description: 'School ID' })
  @IsNumber()
  @IsOptional()
  school_id?: number;

  @ApiPropertyOptional({ example: 'student', description: 'Payer type' })
  @IsString()
  @IsOptional()
  payer_type?: string;

  @ApiPropertyOptional({ example: 861, description: 'Payer ID in school system' })
  @IsNumber()
  @IsOptional()
  payer_id?: number;
}

export class AuthorizePaymentDto {
  @ApiProperty({ example: 'pay_abc123def456', description: 'Payment session ID' })
  @IsString()
  session_id: string;

  @ApiProperty({ example: 'wal_xyz789', description: 'Wallet ID to debit' })
  @IsString()
  wallet_id: string;

  @ApiProperty({ example: 25.00, description: 'Payment amount' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'NLE', description: 'Currency code' })
  @IsString()
  currency: string;

  @ApiProperty({ example: '1234', description: 'Wallet PIN' })
  @IsString()
  pin: string;

  @ApiProperty({ example: 'vendor_001', description: 'Vendor identifier' })
  @IsString()
  vendor_id: string;

  @ApiProperty({ example: 'School Canteen', description: 'Vendor name' })
  @IsString()
  vendor_name: string;

  @ApiPropertyOptional({ example: 'Lunch purchase', description: 'Payment description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: [PaymentItemDto], description: 'Line items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  @IsOptional()
  items?: PaymentItemDto[];

  @ApiPropertyOptional({ type: PaymentMetadataDto, description: 'Additional metadata' })
  @ValidateNested()
  @Type(() => PaymentMetadataDto)
  @IsOptional()
  metadata?: PaymentMetadataDto;
}

export class PaymentReceiptDto {
  @ApiProperty({ example: 'RCP-2026-000123', description: 'Receipt number' })
  number: string;

  @ApiProperty({ example: 'https://api.peeap.com/receipts/RCP-2026-000123', description: 'Receipt URL' })
  url: string;
}

export class PaymentResultDto {
  @ApiProperty({ example: 'txn_abc123xyz', description: 'Transaction ID' })
  transaction_id: string;

  @ApiProperty({ example: 'pay_abc123def456', description: 'Session ID' })
  session_id: string;

  @ApiProperty({ example: 'completed', description: 'Payment status' })
  status: string;

  @ApiProperty({ example: 25.00, description: 'Payment amount' })
  amount: number;

  @ApiProperty({ example: 'NLE', description: 'Currency code' })
  currency: string;

  @ApiProperty({ example: 150.00, description: 'Balance before payment' })
  balance_before: number;

  @ApiProperty({ example: 125.00, description: 'Balance after payment' })
  balance_after: number;

  @ApiProperty({ description: 'Completion timestamp' })
  completed_at: string;

  @ApiProperty({ type: PaymentReceiptDto, description: 'Receipt details' })
  receipt: PaymentReceiptDto;
}

export class PaymentResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: PaymentResultDto })
  data: PaymentResultDto;
}

export class PaymentErrorDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({
    example: {
      code: 'INSUFFICIENT_BALANCE',
      message: 'Wallet balance is insufficient',
      balance: 20.00,
      required: 25.00,
    },
    description: 'Error details',
  })
  error: {
    code: string;
    message: string;
    [key: string]: any;
  };
}

// ============================================================================
// Student Link DTOs
// ============================================================================

export class LinkStudentDto {
  @ApiProperty({ example: 1, description: 'School ID' })
  @IsNumber()
  school_id: number;

  @ApiProperty({ example: 861, description: 'Student ID in school system' })
  @IsNumber()
  student_id: number;

  @ApiProperty({ example: 'SL-2025-02-00368', description: 'Student index number' })
  @IsString()
  index_number: string;

  @ApiProperty({ example: 'usr_student123', description: 'Peeap user ID' })
  @IsString()
  peeap_user_id: string;

  @ApiProperty({ example: 'wal_student456', description: 'Peeap wallet ID' })
  @IsString()
  wallet_id: string;
}

export class LinkStudentResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    example: {
      linked: true,
      wallet_id: 'wal_student456',
      linked_at: '2026-01-13T10:00:00Z',
    },
  })
  data: {
    linked: boolean;
    wallet_id: string;
    linked_at: string;
  };
}

// ============================================================================
// Vendor DTOs
// ============================================================================

export class VendorDto {
  @ApiProperty({ example: 'vendor_001', description: 'Vendor ID' })
  id: string;

  @ApiProperty({ example: 'School Canteen', description: 'Vendor name' })
  name: string;

  @ApiProperty({ example: 'food', description: 'Vendor type' })
  type: string;

  @ApiProperty({ example: true, description: 'Active status' })
  active: boolean;
}

export class VendorProductDto {
  @ApiProperty({ example: 'prod_001', description: 'Product ID' })
  id: string;

  @ApiProperty({ example: 'Rice and Chicken', description: 'Product name' })
  name: string;

  @ApiPropertyOptional({ example: 'Lunch meal', description: 'Product description' })
  description?: string;

  @ApiProperty({ example: 'food', description: 'Category' })
  category: string;

  @ApiProperty({ example: 20.00, description: 'Price' })
  price: number;

  @ApiProperty({ example: 'NLE', description: 'Currency' })
  currency: string;

  @ApiPropertyOptional({ description: 'Image URL' })
  image?: string;

  @ApiPropertyOptional({ example: 50, description: 'Stock quantity' })
  stock?: number;

  @ApiProperty({ example: true, description: 'Availability' })
  available: boolean;
}

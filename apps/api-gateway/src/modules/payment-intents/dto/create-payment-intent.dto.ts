import { IsNumber, IsString, IsOptional, IsObject, IsArray, IsEmail, Min, MaxLength, IsIn } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsNumber()
  @Min(1)
  amount: number; // Amount in minor units (cents)

  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string = 'SLE';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(22)
  statement_descriptor?: string;

  @IsString()
  @IsOptional()
  @IsIn(['automatic', 'manual'])
  capture_method?: 'automatic' | 'manual' = 'automatic';

  @IsArray()
  @IsOptional()
  payment_methods?: ('nfc' | 'qr' | 'card' | 'wallet' | 'mobile_money')[] = ['nfc', 'qr', 'card', 'wallet'];

  @IsString()
  @IsOptional()
  return_url?: string;

  @IsString()
  @IsOptional()
  cancel_url?: string;

  @IsEmail()
  @IsOptional()
  customer_email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  customer_phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  terminal_id?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  idempotency_key?: string;

  @IsNumber()
  @IsOptional()
  @Min(5)
  expires_in_minutes?: number = 30;
}

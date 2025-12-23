import { IsString, IsOptional, IsObject, IsIn, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class NFCPaymentMethodDto {
  @IsString()
  @IsOptional()
  tag_id?: string;

  @IsString()
  @IsOptional()
  token?: string; // NFC token from reader

  @IsString()
  @IsOptional()
  @IsIn(['contactless_emv', 'apple_pay', 'google_pay', 'peeap_nfc'])
  type?: string;

  @IsObject()
  @IsOptional()
  raw_data?: Record<string, any>; // Raw NFC payload
}

export class CardPaymentMethodDto {
  @IsString()
  @IsOptional()
  token?: string; // Tokenized card (from card service)

  @IsString()
  @IsOptional()
  number?: string; // Card number (will be tokenized)

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(12)
  exp_month?: number;

  @IsNumber()
  @IsOptional()
  @Min(2024)
  @Max(2099)
  exp_year?: number;

  @IsString()
  @IsOptional()
  cvc?: string;

  @IsString()
  @IsOptional()
  cardholder_name?: string;
}

export class WalletPaymentMethodDto {
  @IsString()
  wallet_id: string;

  @IsString()
  @IsOptional()
  pin?: string; // Transaction PIN if required
}

export class MobileMoneyPaymentMethodDto {
  @IsString()
  phone_number: string;

  @IsString()
  @IsIn(['orange_money', 'africell_money'])
  provider: 'orange_money' | 'africell_money';
}

export class QRPaymentMethodDto {
  @IsString()
  @IsOptional()
  scanned_by_customer?: string; // Customer's user ID if they scanned merchant QR

  @IsString()
  @IsOptional()
  customer_wallet_id?: string;
}

export class ConfirmPaymentIntentDto {
  @IsString()
  @IsIn(['nfc', 'qr', 'card', 'wallet', 'mobile_money'])
  payment_method_type: 'nfc' | 'qr' | 'card' | 'wallet' | 'mobile_money';

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => NFCPaymentMethodDto)
  nfc?: NFCPaymentMethodDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => CardPaymentMethodDto)
  card?: CardPaymentMethodDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => WalletPaymentMethodDto)
  wallet?: WalletPaymentMethodDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => MobileMoneyPaymentMethodDto)
  mobile_money?: MobileMoneyPaymentMethodDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => QRPaymentMethodDto)
  qr?: QRPaymentMethodDto;

  @IsString()
  @IsOptional()
  customer_id?: string;

  @IsString()
  @IsOptional()
  return_url?: string; // Override return URL
}

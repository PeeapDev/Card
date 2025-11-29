export enum TransactionType {
  // Card payments
  PAYMENT = 'PAYMENT',

  // Peer-to-peer
  P2P_TRANSFER = 'P2P_TRANSFER',

  // Refunds
  REFUND = 'REFUND',
  PARTIAL_REFUND = 'PARTIAL_REFUND',

  // Wallet operations
  TOPUP = 'TOPUP',
  WITHDRAWAL = 'WITHDRAWAL',

  // Fees
  FEE = 'FEE',
  FEE_REVERSAL = 'FEE_REVERSAL',

  // Settlement
  SETTLEMENT = 'SETTLEMENT',

  // Adjustments
  ADJUSTMENT_CREDIT = 'ADJUSTMENT_CREDIT',
  ADJUSTMENT_DEBIT = 'ADJUSTMENT_DEBIT',
}

export enum PaymentChannel {
  NFC = 'NFC',
  QR = 'QR',
  ONLINE = 'ONLINE',
  POS = 'POS',
  P2P = 'P2P',
  API = 'API',
}

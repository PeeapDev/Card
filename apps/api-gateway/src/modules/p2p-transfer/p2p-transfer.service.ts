/**
 * Peeap Pay P2P Transfer Service
 *
 * Handles peer-to-peer money transfers:
 * - Wallet-to-wallet transfers
 * - QR/NFC initiated transfers
 * - Phone number/link transfers
 * - Fee calculation and application
 * - Transaction logging
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { CryptoService } from '../crypto/crypto.service';
import * as crypto from 'crypto';

export interface P2PTransferRequest {
  senderId: string;
  senderWalletId: string;
  recipientId?: string;
  recipientWalletId?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  amount: number;
  currency: string;
  note?: string;
  method: 'wallet' | 'qr' | 'nfc' | 'phone' | 'link';
  idempotencyKey?: string;
}

export interface P2PTransferResult {
  success: boolean;
  transactionId?: string;
  fee?: number;
  netAmount?: number;
  recipientName?: string;
  timestamp?: string;
  error?: string;
  errorCode?: string;
}

export interface FeeConfig {
  type: 'percentage' | 'fixed' | 'tiered';
  value: number;
  minFee?: number;
  maxFee?: number;
  tiers?: Array<{ min: number; max: number; fee: number; type: 'percentage' | 'fixed' }>;
}

export interface TransferLimits {
  dailyLimit: number;
  monthlyLimit: number;
  perTransactionLimit: number;
  minAmount: number;
}

export interface Transaction {
  id: string;
  senderId: string;
  senderWalletId: string;
  recipientId: string;
  recipientWalletId: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
  note?: string;
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class P2PTransferService {
  // In-memory stores (replace with database in production)
  private transactions: Map<string, Transaction> = new Map();
  private walletBalances: Map<string, number> = new Map();
  private feeConfigs: Map<string, FeeConfig> = new Map();
  private userLimits: Map<string, TransferLimits> = new Map();
  private dailyTotals: Map<string, number> = new Map();
  private idempotencyKeys: Map<string, string> = new Map();

  constructor(private readonly cryptoService: CryptoService) {
    // Initialize default fee configs
    this.initializeDefaultFees();
    this.initializeDefaultLimits();
  }

  private initializeDefaultFees() {
    // Standard user fee: 1% with min $0.10, max $10
    this.feeConfigs.set('standard', {
      type: 'percentage',
      value: 1.0,
      minFee: 0.10,
      maxFee: 10.0,
    });

    // Agent+ fee: 0.2% with min $0.05
    this.feeConfigs.set('agent_plus', {
      type: 'percentage',
      value: 0.2,
      minFee: 0.05,
      maxFee: 5.0,
    });

    // Merchant fee: 0.5%
    this.feeConfigs.set('merchant', {
      type: 'percentage',
      value: 0.5,
      minFee: 0.10,
      maxFee: 25.0,
    });

    // Tiered fee example
    this.feeConfigs.set('tiered', {
      type: 'tiered',
      value: 0,
      tiers: [
        { min: 0, max: 100, fee: 0.50, type: 'fixed' },
        { min: 100, max: 1000, fee: 1.0, type: 'percentage' },
        { min: 1000, max: 10000, fee: 0.75, type: 'percentage' },
        { min: 10000, max: Infinity, fee: 0.5, type: 'percentage' },
      ],
    });
  }

  private initializeDefaultLimits() {
    // Standard user limits
    this.userLimits.set('standard', {
      dailyLimit: 5000,
      monthlyLimit: 25000,
      perTransactionLimit: 2500,
      minAmount: 1.0,
    });

    // Agent+ limits (much higher)
    this.userLimits.set('agent_plus', {
      dailyLimit: 1000000,
      monthlyLimit: 10000000,
      perTransactionLimit: 500000,
      minAmount: 0.01,
    });

    // Merchant limits
    this.userLimits.set('merchant', {
      dailyLimit: 100000,
      monthlyLimit: 1000000,
      perTransactionLimit: 50000,
      minAmount: 0.01,
    });
  }

  /**
   * Calculate transfer fee based on user type and amount
   */
  calculateFee(amount: number, userType: string = 'standard'): number {
    const config = this.feeConfigs.get(userType) || this.feeConfigs.get('standard')!;

    let fee: number;

    if (config.type === 'percentage') {
      fee = (amount * config.value) / 100;
    } else if (config.type === 'fixed') {
      fee = config.value;
    } else if (config.type === 'tiered' && config.tiers) {
      // Find matching tier
      const tier = config.tiers.find(t => amount >= t.min && amount < t.max);
      if (tier) {
        fee = tier.type === 'percentage' ? (amount * tier.fee) / 100 : tier.fee;
      } else {
        fee = 0;
      }
    } else {
      fee = 0;
    }

    // Apply min/max constraints
    if (config.minFee !== undefined) {
      fee = Math.max(fee, config.minFee);
    }
    if (config.maxFee !== undefined) {
      fee = Math.min(fee, config.maxFee);
    }

    return Math.round(fee * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get transfer limits for user type
   */
  getLimits(userType: string = 'standard'): TransferLimits {
    return this.userLimits.get(userType) || this.userLimits.get('standard')!;
  }

  /**
   * Update fee configuration
   */
  updateFeeConfig(userType: string, config: FeeConfig): void {
    this.feeConfigs.set(userType, config);
  }

  /**
   * Update transfer limits
   */
  updateLimits(userType: string, limits: TransferLimits): void {
    this.userLimits.set(userType, limits);
  }

  /**
   * Validate transfer request
   */
  private validateTransfer(
    request: P2PTransferRequest,
    senderBalance: number,
    userType: string
  ): { valid: boolean; error?: string } {
    const limits = this.getLimits(userType);
    const fee = this.calculateFee(request.amount, userType);
    const totalAmount = request.amount + fee;

    // Check minimum amount
    if (request.amount < limits.minAmount) {
      return { valid: false, error: `Minimum transfer amount is ${limits.minAmount}` };
    }

    // Check per-transaction limit
    if (request.amount > limits.perTransactionLimit) {
      return { valid: false, error: `Maximum transfer amount is ${limits.perTransactionLimit}` };
    }

    // Check balance
    if (senderBalance < totalAmount) {
      return { valid: false, error: 'Insufficient balance' };
    }

    // Check daily limit
    const dailyKey = `${request.senderId}_${new Date().toISOString().split('T')[0]}`;
    const dailyTotal = this.dailyTotals.get(dailyKey) || 0;
    if (dailyTotal + request.amount > limits.dailyLimit) {
      return { valid: false, error: `Daily limit of ${limits.dailyLimit} exceeded` };
    }

    return { valid: true };
  }

  /**
   * Process P2P transfer
   */
  async processTransfer(
    request: P2PTransferRequest,
    userType: string = 'standard'
  ): Promise<P2PTransferResult> {
    // Check idempotency
    if (request.idempotencyKey) {
      const existingTxnId = this.idempotencyKeys.get(request.idempotencyKey);
      if (existingTxnId) {
        const existingTxn = this.transactions.get(existingTxnId);
        if (existingTxn) {
          return {
            success: true,
            transactionId: existingTxn.id,
            fee: existingTxn.fee,
            netAmount: existingTxn.netAmount,
            timestamp: existingTxn.createdAt.toISOString(),
          };
        }
      }
    }

    // Get sender balance
    const senderBalance = this.walletBalances.get(request.senderWalletId) || 0;

    // Validate transfer
    const validation = this.validateTransfer(request, senderBalance, userType);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Resolve recipient
    let recipientWalletId = request.recipientWalletId;
    let recipientId = request.recipientId;

    if (!recipientWalletId && request.recipientPhone) {
      // In production, look up wallet by phone number
      recipientWalletId = `wallet_${request.recipientPhone.replace(/\D/g, '')}`;
      recipientId = `user_${request.recipientPhone.replace(/\D/g, '')}`;
    }

    if (!recipientWalletId) {
      return {
        success: false,
        error: 'Recipient not found',
        errorCode: 'RECIPIENT_NOT_FOUND',
      };
    }

    // Calculate fee
    const fee = this.calculateFee(request.amount, userType);
    const netAmount = request.amount - fee;

    // Create transaction record
    const transactionId = `txn_${crypto.randomBytes(16).toString('hex')}`;
    const transaction: Transaction = {
      id: transactionId,
      senderId: request.senderId,
      senderWalletId: request.senderWalletId,
      recipientId: recipientId!,
      recipientWalletId: recipientWalletId!,
      amount: request.amount,
      fee,
      netAmount,
      currency: request.currency,
      method: request.method,
      status: 'processing',
      note: request.note,
      createdAt: new Date(),
      metadata: {
        userType,
        signedToken: this.cryptoService.createSignedToken({
          type: 'p2p_transfer',
          amount: request.amount,
          currency: request.currency,
          senderId: request.senderId,
          recipientId: recipientId!,
        }),
      },
    };

    // Process the transfer
    try {
      // Debit sender
      const newSenderBalance = senderBalance - request.amount;
      this.walletBalances.set(request.senderWalletId, newSenderBalance);

      // Credit recipient (net amount after fee)
      const recipientBalance = this.walletBalances.get(recipientWalletId) || 0;
      this.walletBalances.set(recipientWalletId, recipientBalance + netAmount);

      // Update daily totals
      const dailyKey = `${request.senderId}_${new Date().toISOString().split('T')[0]}`;
      const dailyTotal = this.dailyTotals.get(dailyKey) || 0;
      this.dailyTotals.set(dailyKey, dailyTotal + request.amount);

      // Complete transaction
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      this.transactions.set(transactionId, transaction);

      // Store idempotency key
      if (request.idempotencyKey) {
        this.idempotencyKeys.set(request.idempotencyKey, transactionId);
      }

      console.log(`[P2P] Transfer completed: ${transactionId} - ${request.amount} ${request.currency}`);

      return {
        success: true,
        transactionId,
        fee,
        netAmount,
        timestamp: transaction.createdAt.toISOString(),
      };
    } catch (error) {
      // Rollback on failure
      this.walletBalances.set(request.senderWalletId, senderBalance);
      transaction.status = 'failed';
      this.transactions.set(transactionId, transaction);

      return {
        success: false,
        transactionId,
        error: 'Transfer processing failed',
        errorCode: 'PROCESSING_ERROR',
      };
    }
  }

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId: string): Transaction | null {
    return this.transactions.get(transactionId) || null;
  }

  /**
   * Get transactions for user
   */
  getTransactionsForUser(userId: string, limit: number = 50): Transaction[] {
    const userTxns: Transaction[] = [];
    for (const txn of this.transactions.values()) {
      if (txn.senderId === userId || txn.recipientId === userId) {
        userTxns.push(txn);
      }
    }
    return userTxns
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get wallet balance
   */
  getWalletBalance(walletId: string): number {
    return this.walletBalances.get(walletId) || 0;
  }

  /**
   * Set wallet balance (for testing/admin)
   */
  setWalletBalance(walletId: string, balance: number): void {
    this.walletBalances.set(walletId, balance);
  }

  /**
   * Generate transfer link for sending money via link
   */
  generateTransferLink(
    senderId: string,
    amount: number,
    currency: string,
    expiresIn: number = 24 * 60 * 60 // 24 hours
  ): { url: string; token: string; expiresAt: string } {
    const token = this.cryptoService.createSignedToken({
      type: 'transfer_link',
      senderId,
      amount,
      currency,
      expiresAt: Date.now() + expiresIn * 1000,
    });

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return {
      url: `https://pay.peeap.com/claim/${token}`,
      token,
      expiresAt,
    };
  }

  /**
   * Claim transfer from link
   */
  async claimTransfer(
    token: string,
    recipientId: string,
    recipientWalletId: string
  ): Promise<P2PTransferResult> {
    const verification = this.cryptoService.verifyToken(token);

    if (!verification.valid || !verification.payload) {
      return {
        success: false,
        error: 'Invalid or expired transfer link',
        errorCode: 'INVALID_TOKEN',
      };
    }

    const { senderId, amount, currency, expiresAt } = verification.payload as {
      senderId: string;
      amount: number;
      currency: string;
      expiresAt: number;
    };

    if (Date.now() > expiresAt) {
      return {
        success: false,
        error: 'Transfer link has expired',
        errorCode: 'EXPIRED_LINK',
      };
    }

    // Process the transfer
    return this.processTransfer({
      senderId,
      senderWalletId: `wallet_${senderId}`,
      recipientId,
      recipientWalletId,
      amount,
      currency,
      method: 'link',
    });
  }

  /**
   * Get all fee configurations (for admin)
   */
  getAllFeeConfigs(): Map<string, FeeConfig> {
    return new Map(this.feeConfigs);
  }

  /**
   * Get all transfer limits (for admin)
   */
  getAllLimits(): Map<string, TransferLimits> {
    return new Map(this.userLimits);
  }
}

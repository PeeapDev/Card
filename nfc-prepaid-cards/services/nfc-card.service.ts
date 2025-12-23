/**
 * NFC PREPAID CARD SERVICE
 *
 * Core business logic for the closed-loop NFC prepaid card system.
 * This service handles:
 * - Card program management
 * - Batch creation and distribution
 * - Vendor management
 * - Card activation
 * - Tap-to-pay transactions
 * - Fraud detection
 * - Card lifecycle management
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import {
  NFCCardProgram,
  NFCCardBatch,
  NFCCardVendor,
  NFCPrepaidCard,
  NFCCardTransaction,
  NFCVendorInventory,
  NFCCardState,
  NFCTransactionType,
  NFCTransactionState,
  NFCBatchStatus,
  NFCVendorStatus,
  NFCChipType,
  NFCCardCategory,
  NFCReplacementReason,
  CreateNFCProgramRequest,
  CreateBatchRequest,
  CreateVendorRequest,
  AssignInventoryRequest,
  ActivateCardRequest,
  ActivateCardResponse,
  SetCardPinRequest,
  TapToPayRequest,
  TapToPayResponse,
  ReloadCardRequest,
  UpdateCardControlsRequest,
  FreezeCardRequest,
  RequestReplacementRequest,
  RecordVendorSaleRequest,
  NFCDashboardStats,
  VendorDashboardStats,
  NFCAuditEvent,
} from '../types/nfc-card.types';

// ============================================================================
// HSM INTERFACE (Abstract - implement with actual HSM provider)
// ============================================================================

interface HSMProvider {
  generateChallenge(): Promise<string>;
  validateCMAC(batchKeySlot: string, cardUid: string, challenge: string, response: string): Promise<boolean>;
  deriveCardKey(batchKeySlot: string, cardUid: string): Promise<string>; // Returns key slot reference, NOT key
}

// Mock HSM for development - replace with actual HSM integration
class MockHSM implements HSMProvider {
  async generateChallenge(): Promise<string> {
    return crypto.randomBytes(16).toString('hex');
  }

  async validateCMAC(batchKeySlot: string, cardUid: string, challenge: string, response: string): Promise<boolean> {
    // In production, this calls the actual HSM
    // The HSM derives the card key and validates the CMAC
    // For now, we simulate validation
    console.log(`[HSM] Validating CMAC for card ${cardUid}`);

    // Mock validation logic - in production, HSM does this
    const expectedResponse = crypto
      .createHmac('sha256', `${batchKeySlot}-${cardUid}`)
      .update(challenge)
      .digest('hex')
      .substring(0, 32);

    return response === expectedResponse;
  }

  async deriveCardKey(batchKeySlot: string, cardUid: string): Promise<string> {
    // Returns a key slot reference, never the actual key
    return `SLOT-${batchKeySlot}-${cardUid.substring(0, 8)}`;
  }
}

// ============================================================================
// NFC CARD SERVICE
// ============================================================================

export class NFCCardService {
  private supabase: SupabaseClient;
  private hsm: HSMProvider;

  constructor(supabaseUrl: string, supabaseKey: string, hsm?: HSMProvider) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.hsm = hsm || new MockHSM();
  }

  // ==========================================================================
  // CARD PROGRAM MANAGEMENT
  // ==========================================================================

  /**
   * Create a new NFC card program
   */
  async createCardProgram(data: CreateNFCProgramRequest, adminId: string): Promise<NFCCardProgram> {
    const { data: program, error } = await this.supabase
      .from('nfc_card_programs')
      .insert({
        program_code: data.programCode,
        program_name: data.programName,
        description: data.description,
        card_category: data.cardCategory,
        is_reloadable: data.isReloadable,
        requires_kyc: data.requiresKyc,
        card_price: data.cardPrice,
        initial_balance: data.initialBalance,
        daily_transaction_limit: data.dailyTransactionLimit,
        per_transaction_limit: data.perTransactionLimit,
        chip_type: data.chipType,
        validity_months: data.validityMonths,
        created_by: adminId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create card program: ${error.message}`);

    await this.auditLog({
      eventType: 'PROGRAM_CREATED',
      eventCategory: 'ADMIN',
      entityType: 'nfc_card_programs',
      entityId: program.id,
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'CREATE',
      newValues: data,
    });

    return this.mapProgram(program);
  }

  /**
   * Get all card programs
   */
  async getCardPrograms(includeInactive = false): Promise<NFCCardProgram[]> {
    let query = this.supabase.from('nfc_card_programs').select('*');

    if (!includeInactive) {
      query = query.eq('status', 'ACTIVE');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get card programs: ${error.message}`);

    return data.map(this.mapProgram);
  }

  /**
   * Get a single card program by ID
   */
  async getCardProgram(programId: string): Promise<NFCCardProgram | null> {
    const { data, error } = await this.supabase
      .from('nfc_card_programs')
      .select('*')
      .eq('id', programId)
      .single();

    if (error) return null;
    return this.mapProgram(data);
  }

  /**
   * Update card program status
   */
  async updateProgramStatus(
    programId: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'DISCONTINUED',
    adminId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('nfc_card_programs')
      .update({ status })
      .eq('id', programId);

    if (error) throw new Error(`Failed to update program status: ${error.message}`);

    await this.auditLog({
      eventType: 'PROGRAM_STATUS_CHANGED',
      eventCategory: 'ADMIN',
      entityType: 'nfc_card_programs',
      entityId: programId,
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'UPDATE_STATUS',
      newValues: { status },
    });
  }

  // ==========================================================================
  // BATCH MANAGEMENT
  // ==========================================================================

  /**
   * Create a new card batch for manufacturing
   */
  async createBatch(data: CreateBatchRequest, adminId: string): Promise<NFCCardBatch> {
    // Generate batch code
    const batchCode = `BATCH-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const { data: batch, error } = await this.supabase
      .from('nfc_card_batches')
      .insert({
        batch_code: batchCode,
        program_id: data.programId,
        card_count: data.cardCount,
        manufacturer: data.manufacturer,
        bin_prefix: data.binPrefix,
        sequence_start: data.sequenceStart,
        sequence_end: data.sequenceStart + data.cardCount - 1,
        wholesale_price: data.wholesalePrice,
        retail_price: data.retailPrice,
        status: NFCBatchStatus.MANUFACTURED,
        cards_in_warehouse: data.cardCount,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create batch: ${error.message}`);

    // Create individual card records
    await this.createCardsForBatch(batch.id, data.programId, data.binPrefix, data.sequenceStart, data.cardCount);

    await this.auditLog({
      eventType: 'BATCH_CREATED',
      eventCategory: 'ADMIN',
      entityType: 'nfc_card_batches',
      entityId: batch.id,
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'CREATE',
      newValues: { batchCode, cardCount: data.cardCount },
    });

    return this.mapBatch(batch);
  }

  /**
   * Create individual card records for a batch
   */
  private async createCardsForBatch(
    batchId: string,
    programId: string,
    binPrefix: string,
    sequenceStart: number,
    count: number
  ): Promise<void> {
    // Get program for expiry calculation
    const program = await this.getCardProgram(programId);
    if (!program) throw new Error('Program not found');

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + program.validityMonths);

    const cards: any[] = [];

    for (let i = 0; i < count; i++) {
      const sequence = sequenceStart + i;
      const cardNumber = this.generateCardNumber(binPrefix, sequence);
      const cardUid = crypto.randomBytes(7).toString('hex').toUpperCase(); // 7-byte UID
      const cardUidHash = crypto.createHash('sha256').update(cardUid).digest('hex');

      // Get key slot from HSM
      const keySlotId = await this.hsm.deriveCardKey(`BATCH-${batchId}`, cardUid);

      const activationCode = this.generateActivationCode();
      const activationCodeHash = crypto.createHash('sha256').update(activationCode).digest('hex');

      cards.push({
        card_number: cardNumber,
        card_uid: cardUid,
        card_uid_hash: cardUidHash,
        program_id: programId,
        batch_id: batchId,
        key_slot_id: keySlotId,
        key_version: 1,
        state: NFCCardState.CREATED,
        balance: 0, // Balance added at activation
        currency: program.currency,
        activation_code: activationCode, // Store in encrypted form in production
        activation_code_hash: activationCodeHash,
        expires_at: expiresAt.toISOString(),
        manufactured_at: new Date().toISOString(),
      });
    }

    // Batch insert cards
    const { error } = await this.supabase.from('nfc_prepaid_cards').insert(cards);

    if (error) throw new Error(`Failed to create cards: ${error.message}`);
  }

  /**
   * Generate card number with Luhn check digit
   */
  private generateCardNumber(binPrefix: string, sequence: number): string {
    const partial = binPrefix + sequence.toString().padStart(7, '0');
    const checkDigit = this.calculateLuhnCheckDigit(partial);
    return partial + checkDigit;
  }

  private calculateLuhnCheckDigit(partial: string): string {
    let sum = 0;
    for (let i = partial.length - 1; i >= 0; i--) {
      let digit = parseInt(partial[i], 10);
      if ((partial.length - i) % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return ((10 - (sum % 10)) % 10).toString();
  }

  private generateActivationCode(): string {
    // Generate 12-character alphanumeric code
    return crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  /**
   * Get all batches
   */
  async getBatches(programId?: string): Promise<NFCCardBatch[]> {
    let query = this.supabase.from('nfc_card_batches').select('*');

    if (programId) {
      query = query.eq('program_id', programId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get batches: ${error.message}`);

    return data.map(this.mapBatch);
  }

  /**
   * Update batch status
   */
  async updateBatchStatus(batchId: string, status: NFCBatchStatus, adminId: string): Promise<void> {
    const updates: any = { status };

    if (status === NFCBatchStatus.DISTRIBUTED) {
      updates.distributed_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('nfc_card_batches')
      .update(updates)
      .eq('id', batchId);

    if (error) throw new Error(`Failed to update batch status: ${error.message}`);

    await this.auditLog({
      eventType: 'BATCH_STATUS_CHANGED',
      eventCategory: 'ADMIN',
      entityType: 'nfc_card_batches',
      entityId: batchId,
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'UPDATE_STATUS',
      newValues: { status },
    });
  }

  // ==========================================================================
  // VENDOR MANAGEMENT
  // ==========================================================================

  /**
   * Create a new vendor
   */
  async createVendor(data: CreateVendorRequest): Promise<NFCCardVendor> {
    const vendorCode = `VND-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const { data: vendor, error } = await this.supabase
      .from('nfc_card_vendors')
      .insert({
        vendor_code: vendorCode,
        business_name: data.businessName,
        contact_name: data.contactName,
        phone: data.phone,
        email: data.email,
        region: data.region,
        district: data.district,
        address: data.address,
        commission_type: data.commissionType || 'PERCENTAGE',
        commission_rate: data.commissionRate || 5.0,
        max_inventory_value: data.maxInventoryValue || 10000000,
        status: NFCVendorStatus.PENDING,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create vendor: ${error.message}`);

    await this.auditLog({
      eventType: 'VENDOR_CREATED',
      eventCategory: 'VENDOR',
      entityType: 'nfc_card_vendors',
      entityId: vendor.id,
      actorType: 'SYSTEM',
      action: 'CREATE',
      newValues: { vendorCode, businessName: data.businessName },
    });

    return this.mapVendor(vendor);
  }

  /**
   * Approve a vendor
   */
  async approveVendor(vendorId: string, adminId: string): Promise<void> {
    const { error } = await this.supabase
      .from('nfc_card_vendors')
      .update({
        status: NFCVendorStatus.APPROVED,
        approved_at: new Date().toISOString(),
        approved_by: adminId,
      })
      .eq('id', vendorId);

    if (error) throw new Error(`Failed to approve vendor: ${error.message}`);

    await this.auditLog({
      eventType: 'VENDOR_APPROVED',
      eventCategory: 'VENDOR',
      entityType: 'nfc_card_vendors',
      entityId: vendorId,
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'APPROVE',
    });
  }

  /**
   * Get all vendors
   */
  async getVendors(status?: NFCVendorStatus): Promise<NFCCardVendor[]> {
    let query = this.supabase.from('nfc_card_vendors').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get vendors: ${error.message}`);

    return data.map(this.mapVendor);
  }

  /**
   * Assign card inventory to a vendor
   */
  async assignInventoryToVendor(data: AssignInventoryRequest, adminId: string): Promise<NFCVendorInventory> {
    // Get batch info
    const { data: batch, error: batchError } = await this.supabase
      .from('nfc_card_batches')
      .select('*, nfc_card_programs(*)')
      .eq('id', data.batchId)
      .single();

    if (batchError || !batch) throw new Error('Batch not found');

    const cardsAssigned = data.sequenceEnd - data.sequenceStart + 1;
    const retailPrice = batch.retail_price || batch.nfc_card_programs.card_price;
    const assignedValue = cardsAssigned * retailPrice;

    // Create inventory assignment
    const { data: inventory, error } = await this.supabase
      .from('nfc_vendor_inventory')
      .insert({
        vendor_id: data.vendorId,
        batch_id: data.batchId,
        cards_assigned: cardsAssigned,
        sequence_start: data.sequenceStart,
        sequence_end: data.sequenceEnd,
        assigned_value: assignedValue,
        status: 'ASSIGNED',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to assign inventory: ${error.message}`);

    // Update cards to ISSUED state and assign to vendor
    const { error: cardError } = await this.supabase
      .from('nfc_prepaid_cards')
      .update({
        state: NFCCardState.ISSUED,
        vendor_id: data.vendorId,
        vendor_inventory_id: inventory.id,
        issued_at: new Date().toISOString(),
      })
      .eq('batch_id', data.batchId)
      .gte('card_number', this.generateCardNumber(batch.bin_prefix, data.sequenceStart))
      .lte('card_number', this.generateCardNumber(batch.bin_prefix, data.sequenceEnd));

    if (cardError) throw new Error(`Failed to update cards: ${cardError.message}`);

    // Update batch inventory counts
    await this.supabase
      .from('nfc_card_batches')
      .update({
        cards_distributed: batch.cards_distributed + cardsAssigned,
        cards_in_warehouse: batch.cards_in_warehouse - cardsAssigned,
      })
      .eq('id', data.batchId);

    // Update vendor inventory value
    await this.supabase
      .from('nfc_card_vendors')
      .update({
        current_inventory_value: this.supabase.rpc('add_to_inventory_value', {
          vendor_id: data.vendorId,
          amount: assignedValue,
        }),
        status: NFCVendorStatus.ACTIVE,
      })
      .eq('id', data.vendorId);

    await this.auditLog({
      eventType: 'INVENTORY_ASSIGNED',
      eventCategory: 'VENDOR',
      entityType: 'nfc_vendor_inventory',
      entityId: inventory.id,
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'ASSIGN',
      newValues: { vendorId: data.vendorId, cardsAssigned, assignedValue },
    });

    return this.mapVendorInventory(inventory);
  }

  /**
   * Record a vendor sale
   */
  async recordVendorSale(data: RecordVendorSaleRequest): Promise<void> {
    // Get vendor commission info
    const { data: vendor, error: vendorError } = await this.supabase
      .from('nfc_card_vendors')
      .select('*')
      .eq('id', data.vendorId)
      .single();

    if (vendorError || !vendor) throw new Error('Vendor not found');

    // Calculate commission
    let commissionAmount = 0;
    if (vendor.commission_type === 'PERCENTAGE') {
      commissionAmount = data.salePrice * (vendor.commission_rate / 100);
    } else if (vendor.commission_type === 'FIXED') {
      commissionAmount = vendor.commission_fixed;
    }

    const netAmount = data.salePrice - commissionAmount;

    // Create sale record
    const receiptNumber = `RCP-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const { error: saleError } = await this.supabase.from('nfc_vendor_sales').insert({
      vendor_id: data.vendorId,
      card_id: data.cardId,
      sale_price: data.salePrice,
      commission_amount: commissionAmount,
      net_amount: netAmount,
      payment_method: data.paymentMethod || 'CASH',
      receipt_number: receiptNumber,
    });

    if (saleError) throw new Error(`Failed to record sale: ${saleError.message}`);

    // Update card state to SOLD
    await this.supabase
      .from('nfc_prepaid_cards')
      .update({
        state: NFCCardState.SOLD,
        sold_at: new Date().toISOString(),
      })
      .eq('id', data.cardId);

    // Update vendor stats
    await this.supabase
      .from('nfc_card_vendors')
      .update({
        total_cards_sold: vendor.total_cards_sold + 1,
        total_sales_value: vendor.total_sales_value + data.salePrice,
        last_sale_at: new Date().toISOString(),
      })
      .eq('id', data.vendorId);

    // Update inventory counts
    const { data: card } = await this.supabase
      .from('nfc_prepaid_cards')
      .select('vendor_inventory_id')
      .eq('id', data.cardId)
      .single();

    if (card?.vendor_inventory_id) {
      await this.supabase.rpc('increment_inventory_sold', {
        inventory_id: card.vendor_inventory_id,
        sale_amount: data.salePrice,
        commission: commissionAmount,
      });
    }

    await this.auditLog({
      eventType: 'CARD_SOLD',
      eventCategory: 'VENDOR',
      entityType: 'nfc_prepaid_cards',
      entityId: data.cardId,
      actorType: 'VENDOR',
      actorId: data.vendorId,
      action: 'SALE',
      newValues: { salePrice: data.salePrice, commissionAmount, receiptNumber },
    });
  }

  // ==========================================================================
  // CARD ACTIVATION
  // ==========================================================================

  /**
   * Activate a card for a user
   * This is the CRITICAL security function
   */
  async activateCard(data: ActivateCardRequest): Promise<ActivateCardResponse> {
    try {
      // Step 1: Find card by UID
      const cardUidHash = crypto.createHash('sha256').update(data.cardUid).digest('hex');

      const { data: card, error: cardError } = await this.supabase
        .from('nfc_prepaid_cards')
        .select('*, nfc_card_programs(*)')
        .eq('card_uid_hash', cardUidHash)
        .single();

      if (cardError || !card) {
        return { success: false, error: 'Card not found' };
      }

      // Step 2: Validate card state
      if (card.state !== NFCCardState.SOLD && card.state !== NFCCardState.INACTIVE) {
        if (card.state === NFCCardState.ACTIVATED) {
          return { success: false, error: 'Card already activated' };
        }
        return { success: false, error: `Card cannot be activated (state: ${card.state})` };
      }

      // Step 3: Check expiry
      if (new Date(card.expires_at) < new Date()) {
        return { success: false, error: 'Card has expired' };
      }

      // Step 4: Validate activation code if provided
      if (data.activationCode) {
        const codeHash = crypto.createHash('sha256').update(data.activationCode).digest('hex');
        if (codeHash !== card.activation_code_hash) {
          return { success: false, error: 'Invalid activation code' };
        }
      }

      // Step 5: CRITICAL - Validate cryptographic response via HSM
      const cryptoValid = await this.hsm.validateCMAC(
        `BATCH-${card.batch_id}`,
        data.cardUid,
        data.cryptoChallenge,
        data.cryptoResponse
      );

      if (!cryptoValid) {
        // Potential clone attempt!
        await this.auditLog({
          eventType: 'CRYPTO_VALIDATION_FAILED',
          eventCategory: 'SECURITY',
          entityType: 'nfc_prepaid_cards',
          entityId: card.id,
          actorType: 'USER',
          actorId: data.userId,
          action: 'ACTIVATION_FAILED',
          newValues: {
            reason: 'Cryptographic validation failed - potential clone',
            deviceFingerprint: data.deviceFingerprint,
            latitude: data.latitude,
            longitude: data.longitude,
          },
        });

        return { success: false, error: 'Card authentication failed' };
      }

      // Step 6: Check for duplicate activation attempts
      const { data: existingBinding } = await this.supabase
        .from('nfc_prepaid_cards')
        .select('id')
        .eq('user_id', data.userId)
        .eq('card_uid_hash', cardUidHash)
        .single();

      if (existingBinding) {
        return { success: false, error: 'Card already bound to this account' };
      }

      // Step 7: Get user's wallet
      const { data: wallet, error: walletError } = await this.supabase
        .from('wallets')
        .select('id')
        .eq('owner_id', data.userId)
        .eq('owner_type', 'USER')
        .single();

      if (walletError || !wallet) {
        return { success: false, error: 'User wallet not found' };
      }

      // Step 8: Bind card to user
      const initialBalance = card.nfc_card_programs.initial_balance;

      const { error: updateError } = await this.supabase
        .from('nfc_prepaid_cards')
        .update({
          state: NFCCardState.ACTIVATED,
          user_id: data.userId,
          wallet_id: wallet.id,
          balance: initialBalance,
          activated_at: new Date().toISOString(),
          last_device_fingerprint: data.deviceFingerprint,
          last_location_lat: data.latitude,
          last_location_lng: data.longitude,
          // Clear activation code after use
          activation_code: null,
        })
        .eq('id', card.id);

      if (updateError) {
        return { success: false, error: 'Failed to activate card' };
      }

      // Step 9: Create initial balance transaction
      if (initialBalance > 0) {
        await this.createTransaction({
          cardId: card.id,
          transactionType: NFCTransactionType.ACTIVATION_CREDIT,
          amount: initialBalance,
          feeAmount: 0,
          balanceBefore: 0,
          balanceAfter: initialBalance,
          state: NFCTransactionState.CAPTURED,
          description: 'Initial card balance',
        });
      }

      // Update batch stats
      await this.supabase.rpc('increment_batch_activated', { batch_id: card.batch_id });

      await this.auditLog({
        eventType: 'CARD_ACTIVATED',
        eventCategory: 'CARD_LIFECYCLE',
        entityType: 'nfc_prepaid_cards',
        entityId: card.id,
        actorType: 'USER',
        actorId: data.userId,
        action: 'ACTIVATE',
        newValues: {
          userId: data.userId,
          walletId: wallet.id,
          initialBalance,
          deviceFingerprint: data.deviceFingerprint,
        },
      });

      return {
        success: true,
        cardId: card.id,
        cardNumber: this.maskCardNumber(card.card_number),
        balance: initialBalance,
        expiresAt: new Date(card.expires_at),
        requiresPin: card.nfc_card_programs.requires_pin,
      };
    } catch (error: any) {
      console.error('Card activation error:', error);
      return { success: false, error: error.message || 'Activation failed' };
    }
  }

  /**
   * Set PIN for a card
   */
  async setCardPin(data: SetCardPinRequest): Promise<boolean> {
    if (data.pin !== data.confirmPin) {
      throw new Error('PINs do not match');
    }

    if (data.pin.length < 4 || data.pin.length > 6) {
      throw new Error('PIN must be 4-6 digits');
    }

    // Verify card ownership
    const { data: card, error } = await this.supabase
      .from('nfc_prepaid_cards')
      .select('id, user_id')
      .eq('id', data.cardId)
      .eq('user_id', data.userId)
      .single();

    if (error || !card) {
      throw new Error('Card not found or access denied');
    }

    // Hash PIN
    const pinHash = await this.hashPin(data.pin);

    const { error: updateError } = await this.supabase
      .from('nfc_prepaid_cards')
      .update({
        pin_hash: pinHash,
        pin_attempts: 0,
        pin_blocked_until: null,
      })
      .eq('id', data.cardId);

    if (updateError) throw new Error('Failed to set PIN');

    await this.auditLog({
      eventType: 'PIN_SET',
      eventCategory: 'SECURITY',
      entityType: 'nfc_prepaid_cards',
      entityId: data.cardId,
      actorType: 'USER',
      actorId: data.userId,
      action: 'SET_PIN',
    });

    return true;
  }

  private async hashPin(pin: string): Promise<string> {
    // In production, use bcrypt or argon2
    return crypto.createHash('sha256').update(pin + 'SALT').digest('hex');
  }

  private async verifyPin(pin: string, hash: string): Promise<boolean> {
    const inputHash = await this.hashPin(pin);
    return inputHash === hash;
  }

  // ==========================================================================
  // TAP-TO-PAY TRANSACTIONS
  // ==========================================================================

  /**
   * Process a tap-to-pay transaction
   * This is the core payment flow
   */
  async processTapToPay(data: TapToPayRequest): Promise<TapToPayResponse> {
    const transactionRef = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    try {
      // Step 1: Find card by UID
      const cardUidHash = crypto.createHash('sha256').update(data.cardUid).digest('hex');

      const { data: card, error: cardError } = await this.supabase
        .from('nfc_prepaid_cards')
        .select('*, nfc_card_programs(*)')
        .eq('card_uid_hash', cardUidHash)
        .single();

      if (cardError || !card) {
        return { success: false, declineReason: 'Card not found', declineCode: '14' };
      }

      // Step 2: Validate cryptographic response
      const cryptoValid = await this.hsm.validateCMAC(
        `BATCH-${card.batch_id}`,
        data.cardUid,
        data.cryptoChallenge,
        data.cryptoResponse
      );

      if (!cryptoValid) {
        await this.recordDeclinedTransaction(card.id, transactionRef, data.amount, 'CRYPTO_FAILED', '11');
        return { success: false, declineReason: 'Authentication failed', declineCode: '11' };
      }

      // Step 3: Validate card state
      if (card.state !== NFCCardState.ACTIVATED) {
        const declineCode = card.state === NFCCardState.SUSPENDED ? '03' : '04';
        await this.recordDeclinedTransaction(card.id, transactionRef, data.amount, `CARD_${card.state}`, declineCode);
        return {
          success: false,
          declineReason: `Card ${card.state.toLowerCase()}`,
          declineCode,
        };
      }

      // Step 4: Check expiry
      if (new Date(card.expires_at) < new Date()) {
        await this.recordDeclinedTransaction(card.id, transactionRef, data.amount, 'CARD_EXPIRED', '05');
        return { success: false, declineReason: 'Card expired', declineCode: '05' };
      }

      // Step 5: Validate PIN if required
      if (card.pin_hash && data.amount > 50000) {
        // PIN required for larger amounts
        if (!data.pin) {
          return { success: false, declineReason: 'PIN required', declineCode: '08' };
        }

        if (card.pin_blocked_until && new Date(card.pin_blocked_until) > new Date()) {
          return { success: false, declineReason: 'PIN blocked', declineCode: '09' };
        }

        const pinValid = await this.verifyPin(data.pin, card.pin_hash);
        if (!pinValid) {
          await this.handleFailedPinAttempt(card.id, card.pin_attempts);
          return { success: false, declineReason: 'Incorrect PIN', declineCode: '08' };
        }

        // Reset PIN attempts on success
        await this.supabase
          .from('nfc_prepaid_cards')
          .update({ pin_attempts: 0 })
          .eq('id', card.id);
      }

      // Step 6: Check transaction limits
      const perTxnLimit = card.per_transaction_limit || card.nfc_card_programs.per_transaction_limit;
      if (data.amount > perTxnLimit) {
        await this.recordDeclinedTransaction(card.id, transactionRef, data.amount, 'EXCEEDS_TXN_LIMIT', '06');
        return { success: false, declineReason: 'Exceeds transaction limit', declineCode: '06' };
      }

      // Step 7: Check daily limit
      const dailyLimit = card.daily_limit || card.nfc_card_programs.daily_transaction_limit;
      if (card.daily_spent + data.amount > dailyLimit) {
        await this.recordDeclinedTransaction(card.id, transactionRef, data.amount, 'EXCEEDS_DAILY_LIMIT', '07');
        return { success: false, declineReason: 'Daily limit exceeded', declineCode: '07' };
      }

      // Step 8: Check balance
      const fee = this.calculateTransactionFee(data.amount, card.nfc_card_programs);
      const totalDebit = data.amount + fee;

      if (card.balance < totalDebit) {
        await this.recordDeclinedTransaction(card.id, transactionRef, data.amount, 'INSUFFICIENT_BALANCE', '01');
        return { success: false, declineReason: 'Insufficient balance', declineCode: '01' };
      }

      // Step 9: Fraud check
      const fraudResult = await this.performFraudCheck(card, data);
      if (fraudResult.action === 'BLOCK') {
        await this.recordDeclinedTransaction(card.id, transactionRef, data.amount, 'FRAUD_DETECTED', '12');
        return { success: false, declineReason: 'Transaction declined', declineCode: '12' };
      }

      // Step 10: Execute transaction
      const newBalance = card.balance - totalDebit;
      const authCode = crypto.randomBytes(6).toString('hex').toUpperCase();

      // Atomic update
      const { error: updateError } = await this.supabase
        .from('nfc_prepaid_cards')
        .update({
          balance: newBalance,
          daily_spent: card.daily_spent + data.amount,
          weekly_spent: card.weekly_spent + data.amount,
          monthly_spent: card.monthly_spent + data.amount,
          daily_transaction_count: card.daily_transaction_count + 1,
          last_used_at: new Date().toISOString(),
          last_location_lat: data.latitude,
          last_location_lng: data.longitude,
        })
        .eq('id', card.id)
        .eq('balance', card.balance); // Optimistic lock

      if (updateError) {
        return { success: false, declineReason: 'Transaction failed', declineCode: '13' };
      }

      // Create transaction record
      const transactionId = await this.createTransaction({
        cardId: card.id,
        transactionReference: transactionRef,
        authorizationCode: authCode,
        transactionType: NFCTransactionType.PURCHASE,
        amount: data.amount,
        feeAmount: fee,
        balanceBefore: card.balance,
        balanceAfter: newBalance,
        state: NFCTransactionState.CAPTURED,
        merchantId: data.merchantId,
        terminalId: data.terminalId,
        latitude: data.latitude,
        longitude: data.longitude,
        isOffline: data.isOffline || false,
        fraudScore: fraudResult.score,
        cryptoValidationResult: 'VALID',
      });

      await this.auditLog({
        eventType: 'TRANSACTION_COMPLETED',
        eventCategory: 'TRANSACTION',
        entityType: 'nfc_card_transactions',
        entityId: transactionId,
        actorType: 'USER',
        actorId: card.user_id,
        action: 'PURCHASE',
        newValues: {
          amount: data.amount,
          merchantId: data.merchantId,
          authCode,
          balanceAfter: newBalance,
        },
      });

      return {
        success: true,
        transactionId,
        authorizationCode: authCode,
        balanceAfter: newBalance,
      };
    } catch (error: any) {
      console.error('Transaction error:', error);
      return { success: false, declineReason: 'System error', declineCode: '13' };
    }
  }

  private calculateTransactionFee(amount: number, program: any): number {
    const percentageFee = amount * (program.transaction_fee_percentage / 100);
    const fixedFee = program.transaction_fee_fixed || 0;
    return Math.round((percentageFee + fixedFee) * 100) / 100;
  }

  private async performFraudCheck(
    card: any,
    data: TapToPayRequest
  ): Promise<{ score: number; action: 'APPROVE' | 'FLAG' | 'BLOCK' }> {
    let score = 0;

    // Velocity check - transactions per hour
    const { count: hourlyCount } = await this.supabase
      .from('nfc_card_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('card_id', card.id)
      .gte('created_at', new Date(Date.now() - 3600000).toISOString());

    if (hourlyCount && hourlyCount > 10) {
      score += 30;
    } else if (hourlyCount && hourlyCount > 5) {
      score += 15;
    }

    // Geographic check - impossible travel
    if (card.last_location_lat && card.last_location_lng && data.latitude && data.longitude) {
      const lastTxnTime = new Date(card.last_used_at);
      const minutesSinceLastTxn = (Date.now() - lastTxnTime.getTime()) / 60000;

      const distance = this.calculateDistance(
        card.last_location_lat,
        card.last_location_lng,
        data.latitude,
        data.longitude
      );

      // If distance > 500km in less than 60 minutes, it's impossible
      if (distance > 500 && minutesSinceLastTxn < 60) {
        score += 50;
      } else if (distance > 100 && minutesSinceLastTxn < 30) {
        score += 25;
      }
    }

    // Amount check
    const avgAmount = card.monthly_spent / Math.max(card.daily_transaction_count, 1);
    if (data.amount > avgAmount * 3) {
      score += 15;
    }

    // Time of day check
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      score += 10;
    }

    // Determine action
    let action: 'APPROVE' | 'FLAG' | 'BLOCK' = 'APPROVE';
    if (score >= 80) {
      action = 'BLOCK';
    } else if (score >= 40) {
      action = 'FLAG';
    }

    return { score, action };
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private async handleFailedPinAttempt(cardId: string, currentAttempts: number): Promise<void> {
    const newAttempts = currentAttempts + 1;
    const updates: any = { pin_attempts: newAttempts };

    if (newAttempts >= 3) {
      // Block PIN for 30 minutes
      updates.pin_blocked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    }

    await this.supabase.from('nfc_prepaid_cards').update(updates).eq('id', cardId);
  }

  private async recordDeclinedTransaction(
    cardId: string,
    reference: string,
    amount: number,
    reason: string,
    code: string
  ): Promise<void> {
    await this.createTransaction({
      cardId,
      transactionReference: reference,
      transactionType: NFCTransactionType.PURCHASE,
      amount,
      feeAmount: 0,
      balanceBefore: 0,
      balanceAfter: 0,
      state: NFCTransactionState.DECLINED,
      declineReason: reason,
      declineCode: code,
    });
  }

  private async createTransaction(data: any): Promise<string> {
    const transactionRef = data.transactionReference || `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const { data: transaction, error } = await this.supabase
      .from('nfc_card_transactions')
      .insert({
        transaction_reference: transactionRef,
        authorization_code: data.authorizationCode,
        card_id: data.cardId,
        transaction_type: data.transactionType,
        amount: data.amount,
        fee_amount: data.feeAmount,
        net_amount: data.amount - data.feeAmount,
        currency: data.currency || 'SLE',
        balance_before: data.balanceBefore,
        balance_after: data.balanceAfter,
        state: data.state,
        merchant_id: data.merchantId,
        terminal_id: data.terminalId,
        latitude: data.latitude,
        longitude: data.longitude,
        is_offline: data.isOffline || false,
        decline_reason: data.declineReason,
        decline_code: data.declineCode,
        fraud_score: data.fraudScore || 0,
        crypto_validation_result: data.cryptoValidationResult,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create transaction: ${error.message}`);

    return transaction.id;
  }

  // ==========================================================================
  // CARD MANAGEMENT
  // ==========================================================================

  /**
   * Get user's NFC cards
   */
  async getUserCards(userId: string): Promise<NFCPrepaidCard[]> {
    const { data, error } = await this.supabase
      .from('nfc_prepaid_cards')
      .select('*, nfc_card_programs(*)')
      .eq('user_id', userId)
      .order('activated_at', { ascending: false });

    if (error) throw new Error(`Failed to get user cards: ${error.message}`);

    return data.map((card) => this.mapCard(card));
  }

  /**
   * Freeze a card (user-initiated)
   */
  async freezeCard(data: FreezeCardRequest): Promise<void> {
    const { error } = await this.supabase
      .from('nfc_prepaid_cards')
      .update({
        state: NFCCardState.SUSPENDED,
        suspended_at: new Date().toISOString(),
      })
      .eq('id', data.cardId)
      .eq('user_id', data.userId)
      .eq('state', NFCCardState.ACTIVATED);

    if (error) throw new Error('Failed to freeze card');

    await this.auditLog({
      eventType: 'CARD_FROZEN',
      eventCategory: 'CARD_LIFECYCLE',
      entityType: 'nfc_prepaid_cards',
      entityId: data.cardId,
      actorType: 'USER',
      actorId: data.userId,
      action: 'FREEZE',
      newValues: { reason: data.reason },
    });
  }

  /**
   * Unfreeze a card
   */
  async unfreezeCard(cardId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('nfc_prepaid_cards')
      .update({
        state: NFCCardState.ACTIVATED,
        suspended_at: null,
      })
      .eq('id', cardId)
      .eq('user_id', userId)
      .eq('state', NFCCardState.SUSPENDED);

    if (error) throw new Error('Failed to unfreeze card');

    await this.auditLog({
      eventType: 'CARD_UNFROZEN',
      eventCategory: 'CARD_LIFECYCLE',
      entityType: 'nfc_prepaid_cards',
      entityId: cardId,
      actorType: 'USER',
      actorId: userId,
      action: 'UNFREEZE',
    });
  }

  /**
   * Block a card (permanent - for lost/stolen)
   */
  async blockCard(cardId: string, userId: string, reason: string): Promise<void> {
    const { error } = await this.supabase
      .from('nfc_prepaid_cards')
      .update({
        state: NFCCardState.BLOCKED,
        blocked_at: new Date().toISOString(),
      })
      .eq('id', cardId)
      .eq('user_id', userId);

    if (error) throw new Error('Failed to block card');

    await this.auditLog({
      eventType: 'CARD_BLOCKED',
      eventCategory: 'CARD_LIFECYCLE',
      entityType: 'nfc_prepaid_cards',
      entityId: cardId,
      actorType: 'USER',
      actorId: userId,
      action: 'BLOCK',
      newValues: { reason },
    });
  }

  /**
   * Request card replacement
   */
  async requestReplacement(data: RequestReplacementRequest): Promise<string> {
    // Get original card
    const { data: originalCard, error: cardError } = await this.supabase
      .from('nfc_prepaid_cards')
      .select('*')
      .eq('id', data.cardId)
      .eq('user_id', data.userId)
      .single();

    if (cardError || !originalCard) {
      throw new Error('Card not found');
    }

    // Block the original card if not already blocked
    if (originalCard.state !== NFCCardState.BLOCKED) {
      await this.blockCard(data.cardId, data.userId, `Replacement requested: ${data.reason}`);
    }

    // Create replacement request
    const { data: replacement, error } = await this.supabase
      .from('nfc_card_replacements')
      .insert({
        original_card_id: data.cardId,
        reason: data.reason,
        description: data.description,
        original_balance: originalCard.balance,
        delivery_address: data.deliveryAddress,
        status: 'REQUESTED',
      })
      .select('id')
      .single();

    if (error) throw new Error('Failed to create replacement request');

    await this.auditLog({
      eventType: 'REPLACEMENT_REQUESTED',
      eventCategory: 'CARD_LIFECYCLE',
      entityType: 'nfc_card_replacements',
      entityId: replacement.id,
      actorType: 'USER',
      actorId: data.userId,
      action: 'REQUEST_REPLACEMENT',
      newValues: { reason: data.reason, originalBalance: originalCard.balance },
    });

    return replacement.id;
  }

  /**
   * Reload card balance
   */
  async reloadCard(data: ReloadCardRequest): Promise<{ newBalance: number; transactionId: string }> {
    // Get card and validate
    const { data: card, error: cardError } = await this.supabase
      .from('nfc_prepaid_cards')
      .select('*, nfc_card_programs(*)')
      .eq('id', data.cardId)
      .eq('user_id', data.userId)
      .single();

    if (cardError || !card) {
      throw new Error('Card not found');
    }

    if (card.state !== NFCCardState.ACTIVATED) {
      throw new Error('Card is not active');
    }

    if (!card.nfc_card_programs.is_reloadable) {
      throw new Error('This card type is not reloadable');
    }

    // Check reload limits
    const maxBalance = card.nfc_card_programs.max_balance;
    if (card.balance + data.amount > maxBalance) {
      throw new Error(`Reload would exceed maximum balance of ${maxBalance}`);
    }

    const minReload = card.nfc_card_programs.min_reload_amount || 0;
    const maxReload = card.nfc_card_programs.max_reload_amount || Infinity;

    if (data.amount < minReload || data.amount > maxReload) {
      throw new Error(`Reload amount must be between ${minReload} and ${maxReload}`);
    }

    // Calculate fee
    const feePercentage = card.nfc_card_programs.reload_fee_percentage || 0;
    const feeFixed = card.nfc_card_programs.reload_fee_fixed || 0;
    const fee = Math.round((data.amount * (feePercentage / 100) + feeFixed) * 100) / 100;

    // If reloading from wallet, verify wallet balance
    if (data.sourceType === 'WALLET' && data.sourceWalletId) {
      const { data: wallet, error: walletError } = await this.supabase
        .from('wallets')
        .select('available_balance')
        .eq('id', data.sourceWalletId)
        .eq('owner_id', data.userId)
        .single();

      if (walletError || !wallet || wallet.available_balance < data.amount + fee) {
        throw new Error('Insufficient wallet balance');
      }

      // Deduct from wallet
      await this.supabase.rpc('debit_wallet', {
        wallet_id: data.sourceWalletId,
        amount: data.amount + fee,
      });
    }

    // Add to card balance
    const newBalance = card.balance + data.amount;

    const { error: updateError } = await this.supabase
      .from('nfc_prepaid_cards')
      .update({ balance: newBalance })
      .eq('id', data.cardId);

    if (updateError) {
      throw new Error('Failed to update card balance');
    }

    // Create transaction record
    const transactionId = await this.createTransaction({
      cardId: data.cardId,
      transactionType: NFCTransactionType.RELOAD,
      amount: data.amount,
      feeAmount: fee,
      balanceBefore: card.balance,
      balanceAfter: newBalance,
      state: NFCTransactionState.CAPTURED,
    });

    // Create reload record
    await this.supabase.from('nfc_card_reloads').insert({
      card_id: data.cardId,
      transaction_id: transactionId,
      reload_amount: data.amount,
      fee_amount: fee,
      total_charged: data.amount + fee,
      reload_source: data.sourceType,
      source_wallet_id: data.sourceWalletId,
      balance_before: card.balance,
      balance_after: newBalance,
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      agent_id: data.agentId,
    });

    await this.auditLog({
      eventType: 'CARD_RELOADED',
      eventCategory: 'TRANSACTION',
      entityType: 'nfc_prepaid_cards',
      entityId: data.cardId,
      actorType: 'USER',
      actorId: data.userId,
      action: 'RELOAD',
      newValues: { amount: data.amount, fee, newBalance, source: data.sourceType },
    });

    return { newBalance, transactionId };
  }

  /**
   * Get card transaction history
   */
  async getCardTransactions(
    cardId: string,
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<NFCCardTransaction[]> {
    // Verify ownership
    const { data: card } = await this.supabase
      .from('nfc_prepaid_cards')
      .select('id')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();

    if (!card) {
      throw new Error('Card not found or access denied');
    }

    const { data, error } = await this.supabase
      .from('nfc_card_transactions')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to get transactions: ${error.message}`);

    return data.map(this.mapTransaction);
  }

  // ==========================================================================
  // ADMIN FUNCTIONS
  // ==========================================================================

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<NFCDashboardStats> {
    const [programs, batches, cards, transactions, vendors] = await Promise.all([
      this.supabase.from('nfc_card_programs').select('status'),
      this.supabase.from('nfc_card_batches').select('id'),
      this.supabase.from('nfc_prepaid_cards').select('state, balance'),
      this.supabase
        .from('nfc_card_transactions')
        .select('amount, created_at')
        .eq('state', NFCTransactionState.CAPTURED),
      this.supabase.from('nfc_card_vendors').select('status'),
    ]);

    const cardsByState: Record<string, number> = {};
    cards.data?.forEach((card) => {
      cardsByState[card.state] = (cardsByState[card.state] || 0) + 1;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTxns = transactions.data?.filter((t) => new Date(t.created_at) >= today) || [];

    return {
      totalPrograms: programs.data?.length || 0,
      activePrograms: programs.data?.filter((p) => p.status === 'ACTIVE').length || 0,
      totalBatches: batches.data?.length || 0,
      totalCards: cards.data?.length || 0,
      cardsByState: cardsByState as any,
      totalVendors: vendors.data?.length || 0,
      activeVendors: vendors.data?.filter((v) => v.status === 'ACTIVE').length || 0,
      totalTransactions: transactions.data?.length || 0,
      transactionVolume: transactions.data?.reduce((sum, t) => sum + t.amount, 0) || 0,
      todayTransactions: todayTxns.length,
      todayVolume: todayTxns.reduce((sum, t) => sum + t.amount, 0),
      activationRate:
        cards.data?.length > 0
          ? ((cardsByState[NFCCardState.ACTIVATED] || 0) / cards.data.length) * 100
          : 0,
      averageCardBalance:
        cards.data?.length > 0
          ? cards.data.reduce((sum, c) => sum + c.balance, 0) / cards.data.length
          : 0,
    };
  }

  /**
   * Get vendor dashboard stats
   */
  async getVendorDashboardStats(vendorId: string): Promise<VendorDashboardStats> {
    const { data: vendor, error } = await this.supabase
      .from('nfc_card_vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (error || !vendor) throw new Error('Vendor not found');

    const { data: inventory } = await this.supabase
      .from('nfc_vendor_inventory')
      .select('*')
      .eq('vendor_id', vendorId);

    const totals = inventory?.reduce(
      (acc, inv) => ({
        assigned: acc.assigned + inv.cards_assigned,
        sold: acc.sold + inv.cards_sold,
        commissionEarned: acc.commissionEarned + inv.commission_earned,
        commissionPaid: acc.commissionPaid + inv.commission_paid,
      }),
      { assigned: 0, sold: 0, commissionEarned: 0, commissionPaid: 0 }
    ) || { assigned: 0, sold: 0, commissionEarned: 0, commissionPaid: 0 };

    return {
      cardsAssigned: totals.assigned,
      cardsSold: totals.sold,
      cardsRemaining: totals.assigned - totals.sold,
      totalSalesValue: vendor.total_sales_value,
      commissionEarned: totals.commissionEarned,
      commissionPaid: totals.commissionPaid,
      commissionPending: totals.commissionEarned - totals.commissionPaid,
      lastSaleAt: vendor.last_sale_at,
    };
  }

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  private maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 16) return cardNumber;
    return `${cardNumber.substring(0, 4)}-****-****-${cardNumber.substring(12)}`;
  }

  private async auditLog(event: Partial<NFCAuditEvent>): Promise<void> {
    try {
      await this.supabase.from('nfc_audit_log').insert({
        event_type: event.eventType,
        event_category: event.eventCategory,
        entity_type: event.entityType,
        entity_id: event.entityId,
        actor_type: event.actorType,
        actor_id: event.actorId,
        action: event.action,
        description: event.description,
        old_values: event.oldValues,
        new_values: event.newValues,
        ip_address: event.ipAddress,
        device_fingerprint: event.deviceFingerprint,
        latitude: event.latitude,
        longitude: event.longitude,
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  // Mappers
  private mapProgram(data: any): NFCCardProgram {
    return {
      id: data.id,
      programCode: data.program_code,
      programName: data.program_name,
      description: data.description,
      cardCategory: data.card_category,
      isReloadable: data.is_reloadable,
      requiresKyc: data.requires_kyc,
      kycLevelRequired: data.kyc_level_required,
      cardPrice: parseFloat(data.card_price),
      initialBalance: parseFloat(data.initial_balance),
      currency: data.currency,
      maxBalance: parseFloat(data.max_balance),
      minReloadAmount: data.min_reload_amount ? parseFloat(data.min_reload_amount) : undefined,
      maxReloadAmount: data.max_reload_amount ? parseFloat(data.max_reload_amount) : undefined,
      dailyTransactionLimit: parseFloat(data.daily_transaction_limit),
      weeklyTransactionLimit: data.weekly_transaction_limit
        ? parseFloat(data.weekly_transaction_limit)
        : undefined,
      monthlyTransactionLimit: data.monthly_transaction_limit
        ? parseFloat(data.monthly_transaction_limit)
        : undefined,
      perTransactionLimit: parseFloat(data.per_transaction_limit),
      dailyTransactionCount: data.daily_transaction_count,
      reloadFeePercentage: data.reload_fee_percentage
        ? parseFloat(data.reload_fee_percentage)
        : undefined,
      reloadFeeFixed: data.reload_fee_fixed ? parseFloat(data.reload_fee_fixed) : undefined,
      transactionFeePercentage: data.transaction_fee_percentage
        ? parseFloat(data.transaction_fee_percentage)
        : undefined,
      transactionFeeFixed: data.transaction_fee_fixed
        ? parseFloat(data.transaction_fee_fixed)
        : undefined,
      monthlyMaintenanceFee: data.monthly_maintenance_fee
        ? parseFloat(data.monthly_maintenance_fee)
        : undefined,
      inactivityFee: data.inactivity_fee ? parseFloat(data.inactivity_fee) : undefined,
      inactivityDays: data.inactivity_days,
      cardDesignTemplate: data.card_design_template,
      cardColorPrimary: data.card_color_primary,
      cardColorSecondary: data.card_color_secondary,
      cardImageUrl: data.card_image_url,
      validityMonths: data.validity_months,
      chipType: data.chip_type,
      requiresPin: data.requires_pin,
      maxPinAttempts: data.max_pin_attempts,
      allowedMccCodes: data.allowed_mcc_codes,
      blockedMccCodes: data.blocked_mcc_codes,
      allowOfflineTransactions: data.allow_offline_transactions,
      offlineTransactionLimit: data.offline_transaction_limit
        ? parseFloat(data.offline_transaction_limit)
        : undefined,
      offlineDailyLimit: data.offline_daily_limit
        ? parseFloat(data.offline_daily_limit)
        : undefined,
      offlineTransactionCount: data.offline_transaction_count,
      status: data.status,
      isVisible: data.is_visible,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by,
    };
  }

  private mapBatch(data: any): NFCCardBatch {
    return {
      id: data.id,
      batchCode: data.batch_code,
      programId: data.program_id,
      cardCount: data.card_count,
      manufacturer: data.manufacturer,
      manufactureDate: data.manufacture_date ? new Date(data.manufacture_date) : undefined,
      manufactureOrderNumber: data.manufacture_order_number,
      masterKeyId: data.master_key_id,
      keyDerivationMethod: data.key_derivation_method,
      keyVersion: data.key_version,
      binPrefix: data.bin_prefix,
      sequenceStart: data.sequence_start,
      sequenceEnd: data.sequence_end,
      status: data.status,
      cardsInWarehouse: data.cards_in_warehouse,
      cardsDistributed: data.cards_distributed,
      cardsSold: data.cards_sold,
      cardsActivated: data.cards_activated,
      cardsDefective: data.cards_defective,
      qcPassed: data.qc_passed,
      qcDate: data.qc_date ? new Date(data.qc_date) : undefined,
      qcNotes: data.qc_notes,
      unitCost: data.unit_cost ? parseFloat(data.unit_cost) : undefined,
      wholesalePrice: data.wholesale_price ? parseFloat(data.wholesale_price) : undefined,
      retailPrice: data.retail_price ? parseFloat(data.retail_price) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      distributedAt: data.distributed_at ? new Date(data.distributed_at) : undefined,
    };
  }

  private mapVendor(data: any): NFCCardVendor {
    return {
      id: data.id,
      vendorCode: data.vendor_code,
      businessName: data.business_name,
      contactName: data.contact_name,
      phone: data.phone,
      email: data.email,
      region: data.region,
      district: data.district,
      address: data.address,
      gpsLatitude: data.gps_latitude ? parseFloat(data.gps_latitude) : undefined,
      gpsLongitude: data.gps_longitude ? parseFloat(data.gps_longitude) : undefined,
      commissionType: data.commission_type,
      commissionRate: parseFloat(data.commission_rate),
      commissionFixed: data.commission_fixed ? parseFloat(data.commission_fixed) : undefined,
      settlementAccountType: data.settlement_account_type,
      settlementWalletId: data.settlement_wallet_id,
      settlementBankName: data.settlement_bank_name,
      settlementAccountNumber: data.settlement_account_number,
      settlementFrequency: data.settlement_frequency,
      maxInventoryValue: parseFloat(data.max_inventory_value),
      currentInventoryValue: parseFloat(data.current_inventory_value),
      status: data.status,
      approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
      approvedBy: data.approved_by,
      totalCardsSold: data.total_cards_sold,
      totalSalesValue: parseFloat(data.total_sales_value),
      lastSaleAt: data.last_sale_at ? new Date(data.last_sale_at) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapVendorInventory(data: any): NFCVendorInventory {
    return {
      id: data.id,
      vendorId: data.vendor_id,
      batchId: data.batch_id,
      cardsAssigned: data.cards_assigned,
      cardsSold: data.cards_sold,
      cardsReturned: data.cards_returned,
      cardsDamaged: data.cards_damaged,
      sequenceStart: data.sequence_start,
      sequenceEnd: data.sequence_end,
      assignedValue: parseFloat(data.assigned_value),
      salesValue: parseFloat(data.sales_value),
      commissionEarned: parseFloat(data.commission_earned),
      commissionPaid: parseFloat(data.commission_paid),
      status: data.status,
      assignedAt: new Date(data.assigned_at),
      lastReconciledAt: data.last_reconciled_at ? new Date(data.last_reconciled_at) : undefined,
    };
  }

  private mapCard(data: any): NFCPrepaidCard {
    return {
      id: data.id,
      cardNumber: data.card_number,
      cardUid: data.card_uid,
      cardUidHash: data.card_uid_hash,
      programId: data.program_id,
      batchId: data.batch_id,
      keySlotId: data.key_slot_id,
      keyVersion: data.key_version,
      diversificationData: data.diversification_data,
      state: data.state,
      vendorId: data.vendor_id,
      vendorInventoryId: data.vendor_inventory_id,
      userId: data.user_id,
      walletId: data.wallet_id,
      activationCode: data.activation_code,
      activationCodeHash: data.activation_code_hash,
      balance: parseFloat(data.balance),
      pendingBalance: parseFloat(data.pending_balance || 0),
      currency: data.currency,
      dailySpent: parseFloat(data.daily_spent || 0),
      weeklySpent: parseFloat(data.weekly_spent || 0),
      monthlySpent: parseFloat(data.monthly_spent || 0),
      dailyTransactionCount: data.daily_transaction_count || 0,
      lastSpendingResetDaily: data.last_spending_reset_daily
        ? new Date(data.last_spending_reset_daily)
        : undefined,
      lastSpendingResetWeekly: data.last_spending_reset_weekly
        ? new Date(data.last_spending_reset_weekly)
        : undefined,
      lastSpendingResetMonthly: data.last_spending_reset_monthly
        ? new Date(data.last_spending_reset_monthly)
        : undefined,
      perTransactionLimit: data.per_transaction_limit
        ? parseFloat(data.per_transaction_limit)
        : undefined,
      dailyLimit: data.daily_limit ? parseFloat(data.daily_limit) : undefined,
      weeklyLimit: data.weekly_limit ? parseFloat(data.weekly_limit) : undefined,
      monthlyLimit: data.monthly_limit ? parseFloat(data.monthly_limit) : undefined,
      pinHash: data.pin_hash,
      pinAttempts: data.pin_attempts || 0,
      pinBlockedUntil: data.pin_blocked_until ? new Date(data.pin_blocked_until) : undefined,
      cardLabel: data.card_label,
      manufacturedAt: data.manufactured_at ? new Date(data.manufactured_at) : undefined,
      expiresAt: new Date(data.expires_at),
      createdAt: new Date(data.created_at),
      issuedAt: data.issued_at ? new Date(data.issued_at) : undefined,
      soldAt: data.sold_at ? new Date(data.sold_at) : undefined,
      activatedAt: data.activated_at ? new Date(data.activated_at) : undefined,
      suspendedAt: data.suspended_at ? new Date(data.suspended_at) : undefined,
      blockedAt: data.blocked_at ? new Date(data.blocked_at) : undefined,
      replacedAt: data.replaced_at ? new Date(data.replaced_at) : undefined,
      lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : undefined,
      replacedByCardId: data.replaced_by_card_id,
      replacesCardId: data.replaces_card_id,
      fraudScore: data.fraud_score || 0,
      fraudFlags: data.fraud_flags,
      lastLocationLat: data.last_location_lat ? parseFloat(data.last_location_lat) : undefined,
      lastLocationLng: data.last_location_lng ? parseFloat(data.last_location_lng) : undefined,
      lastDeviceFingerprint: data.last_device_fingerprint,
      metadata: data.metadata,
    };
  }

  private mapTransaction(data: any): NFCCardTransaction {
    return {
      id: data.id,
      transactionReference: data.transaction_reference,
      authorizationCode: data.authorization_code,
      cardId: data.card_id,
      cardNumberMasked: data.card_number_masked,
      transactionType: data.transaction_type,
      amount: parseFloat(data.amount),
      feeAmount: parseFloat(data.fee_amount),
      netAmount: parseFloat(data.net_amount),
      currency: data.currency,
      balanceBefore: parseFloat(data.balance_before),
      balanceAfter: parseFloat(data.balance_after),
      state: data.state,
      merchantId: data.merchant_id,
      merchantName: data.merchant_name,
      merchantMcc: data.merchant_mcc,
      merchantLocation: data.merchant_location,
      terminalId: data.terminal_id,
      terminalType: data.terminal_type,
      challengeSent: data.challenge_sent,
      responseReceived: data.response_received,
      cryptoValidationResult: data.crypto_validation_result,
      isOffline: data.is_offline,
      syncedAt: data.synced_at ? new Date(data.synced_at) : undefined,
      latitude: data.latitude ? parseFloat(data.latitude) : undefined,
      longitude: data.longitude ? parseFloat(data.longitude) : undefined,
      declineReason: data.decline_reason,
      declineCode: data.decline_code,
      errorMessage: data.error_message,
      settlementBatchId: data.settlement_batch_id,
      settledAt: data.settled_at ? new Date(data.settled_at) : undefined,
      originalTransactionId: data.original_transaction_id,
      refundAmount: parseFloat(data.refund_amount || 0),
      refundStatus: data.refund_status,
      fraudScore: data.fraud_score || 0,
      fraudCheckResult: data.fraud_check_result,
      fraudFlags: data.fraud_flags,
      createdAt: new Date(data.created_at),
      authorizedAt: data.authorized_at ? new Date(data.authorized_at) : undefined,
      capturedAt: data.captured_at ? new Date(data.captured_at) : undefined,
      deviceFingerprint: data.device_fingerprint,
      userAgent: data.user_agent,
      ipAddress: data.ip_address,
      metadata: data.metadata,
    };
  }
}

export default NFCCardService;

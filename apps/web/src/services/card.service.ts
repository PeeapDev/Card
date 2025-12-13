/**
 * Card Service - Production Grade
 *
 * Direct Supabase integration for card operations
 * Includes proper error handling and type safety
 */

import { supabase } from '@/lib/supabase';
import type { Card } from '@/types';

export interface CreateCardRequest {
  walletId: string;
  type: 'VIRTUAL' | 'PHYSICAL';
  cardholderName: string;
  dailyLimit?: number;
  monthlyLimit?: number;
}

export interface UpdateCardLimitsRequest {
  dailyLimit?: number;
  monthlyLimit?: number;
}

// Card Feature Flags - These control actual card behavior
export interface CardFeatureFlags {
  allowNegativeBalance: boolean;    // Card can go into negative balance
  allowBuyNowPayLater: boolean;     // BNPL feature enabled
  highTransactionLimit: boolean;    // Higher than normal limits
  noTransactionFees: boolean;       // No fees on transactions
  cashbackEnabled: boolean;         // Cashback on purchases
  cashbackPercentage: number;       // Cashback percentage
  overdraftLimit: number;           // Max negative balance allowed
  bnplMaxAmount: number;            // Max BNPL amount
  bnplInterestRate: number;         // BNPL interest rate
}

// Card Types (Admin-configured card products)
export interface CardType extends Partial<CardFeatureFlags> {
  id: string;
  name: string;
  description: string;
  cardImageUrl?: string;
  price: number;
  transactionFeePercentage: number;
  transactionFeeFixed: number;
  requiredKycLevel: number;
  cardType: 'VIRTUAL' | 'PHYSICAL';
  isActive: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  colorGradient: string;
  features: string[];  // Display features (text)
  createdAt: string;
  updatedAt: string;
}

export interface CreateCardTypeRequest {
  name: string;
  description: string;
  cardImageUrl?: string;
  price: number;
  transactionFeePercentage?: number;
  transactionFeeFixed?: number;
  requiredKycLevel?: number;
  cardType: 'VIRTUAL' | 'PHYSICAL';
  isActive?: boolean;
  dailyLimit?: number;
  monthlyLimit?: number;
  colorGradient?: string;
  features?: string[];
  // Feature flags
  allowNegativeBalance?: boolean;
  allowBuyNowPayLater?: boolean;
  highTransactionLimit?: boolean;
  noTransactionFees?: boolean;
  cashbackEnabled?: boolean;
  cashbackPercentage?: number;
  overdraftLimit?: number;
  bnplMaxAmount?: number;
  bnplInterestRate?: number;
}

// Card Orders (User purchase requests)
export interface CardOrder {
  id: string;
  userId: string;
  cardTypeId: string;
  walletId: string;
  amountPaid: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'GENERATED' | 'ACTIVATED' | 'CANCELLED';
  transactionId?: string;
  generatedCardId?: string;
  cardNumber?: string;
  qrCodeData?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  cardType?: CardType;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    kycStatus: string;
    kycTier?: number;
  };
  wallet?: {
    id: string;
    currency: string;
    balance: number;
  };
}

export interface CreateCardOrderRequest {
  cardTypeId: string;
  walletId: string;
  cardholderName?: string;
  cardPin?: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  giftRecipientId?: string;
}

// Generate a random card number (for virtual cards)
const generateCardNumber = (): string => {
  // Visa-like card number starting with 4
  const prefix = '4';
  let cardNumber = prefix;
  for (let i = 0; i < 15; i++) {
    cardNumber += Math.floor(Math.random() * 10).toString();
  }
  return cardNumber;
};

// Generate masked card number
const maskCardNumber = (cardNumber: string): string => {
  return `****${cardNumber.slice(-4)}`;
};

// Generate CVV
const generateCVV = (): string => {
  return Math.floor(100 + Math.random() * 900).toString();
};

// Map database row to CardType
const mapCardType = (row: any): CardType => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  cardImageUrl: row.card_image_url,
  price: parseFloat(row.price) || 0,
  transactionFeePercentage: parseFloat(row.transaction_fee_percentage) || 0,
  transactionFeeFixed: parseFloat(row.transaction_fee_fixed) || 0,
  requiredKycLevel: row.required_kyc_level || 1,
  cardType: row.card_type || 'VIRTUAL',
  isActive: row.is_active ?? true,
  dailyLimit: parseFloat(row.daily_limit) || 1000,
  monthlyLimit: parseFloat(row.monthly_limit) || 10000,
  colorGradient: row.color_gradient || 'from-blue-600 to-blue-800',
  features: row.features || [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  // Feature flags
  allowNegativeBalance: row.allow_negative_balance ?? false,
  allowBuyNowPayLater: row.allow_buy_now_pay_later ?? false,
  highTransactionLimit: row.high_transaction_limit ?? false,
  noTransactionFees: row.no_transaction_fees ?? false,
  cashbackEnabled: row.cashback_enabled ?? false,
  cashbackPercentage: parseFloat(row.cashback_percentage) || 0,
  overdraftLimit: parseFloat(row.overdraft_limit) || 0,
  bnplMaxAmount: parseFloat(row.bnpl_max_amount) || 0,
  bnplInterestRate: parseFloat(row.bnpl_interest_rate) || 0,
});

// Map database row to CardOrder
const mapCardOrder = (row: any): CardOrder => ({
  id: row.id,
  userId: row.user_id,
  cardTypeId: row.card_type_id,
  walletId: row.wallet_id,
  amountPaid: parseFloat(row.amount_paid) || 0,
  currency: row.currency || 'SLE',
  status: row.status || 'PENDING',
  transactionId: row.transaction_id,
  generatedCardId: row.generated_card_id,
  cardNumber: row.card_number,
  qrCodeData: row.qr_code_data,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
  reviewNotes: row.review_notes,
  shippingAddress: row.shipping_address,
  trackingNumber: row.tracking_number,
  shippedAt: row.shipped_at,
  deliveredAt: row.delivered_at,
  activatedAt: row.activated_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  cardType: row.card_types ? mapCardType(row.card_types) : undefined,
  user: row.users ? {
    id: row.users.id,
    firstName: row.users.first_name,
    lastName: row.users.last_name,
    email: row.users.email,
    phone: row.users.phone,
    kycStatus: row.users.kyc_status,
    kycTier: row.users.kyc_tier,
  } : undefined,
  wallet: row.wallets ? {
    id: row.wallets.id,
    currency: row.wallets.currency,
    balance: parseFloat(row.wallets.balance) || 0,
  } : undefined,
});

// Map database row to Card type
const mapCard = (row: any): Card => ({
  id: row.id,
  walletId: row.wallet_id,
  cardNumber: row.card_number || '',
  maskedNumber: row.masked_number || maskCardNumber(row.card_number || '0000'),
  expiryMonth: row.expiry_month || 12,
  expiryYear: row.expiry_year || new Date().getFullYear() + 3,
  cardholderName: row.cardholder_name || '',
  status: row.status || 'ACTIVE',
  type: row.type || 'VIRTUAL',
  dailyLimit: parseFloat(row.daily_limit) || 1000,
  monthlyLimit: parseFloat(row.monthly_limit) || 10000,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const cardService = {
  /**
   * Get all cards for the current user
   */
  async getCards(userId: string): Promise<Card[]> {
    // First get user's wallets
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId);

    if (walletsError || !wallets?.length) {
      return [];
    }

    const walletIds = wallets.map(w => w.id);

    // Get cards for those wallets
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .in('wallet_id', walletIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cards:', error);
      throw new Error(error.message);
    }

    return (data || []).map(mapCard);
  },

  /**
   * Get cards by user ID directly (if user_id column exists)
   */
  async getCardsByUserId(userId: string): Promise<Card[]> {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback to wallet-based lookup
      return this.getCards(userId);
    }

    return (data || []).map(mapCard);
  },

  /**
   * Get a single card by ID
   */
  async getCard(id: string): Promise<Card> {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching card:', error);
      throw new Error(error.message);
    }

    return mapCard(data);
  },

  /**
   * Create a new card
   */
  async createCard(userId: string, data: CreateCardRequest): Promise<Card> {
    const cardNumber = generateCardNumber();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 3);

    const { data: card, error } = await supabase
      .from('cards')
      .insert({
        user_id: userId,
        wallet_id: data.walletId,
        card_number: cardNumber,
        masked_number: maskCardNumber(cardNumber),
        cvv: generateCVV(),
        expiry_month: expiryDate.getMonth() + 1,
        expiry_year: expiryDate.getFullYear(),
        cardholder_name: data.cardholderName,
        type: data.type,
        status: data.type === 'VIRTUAL' ? 'ACTIVE' : 'INACTIVE',
        daily_limit: data.dailyLimit || 1000,
        monthly_limit: data.monthlyLimit || 10000,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating card:', error);
      throw new Error(error.message);
    }

    return mapCard(card);
  },

  /**
   * Activate a card
   */
  async activateCard(id: string): Promise<Card> {
    const { data, error } = await supabase
      .from('cards')
      .update({
        status: 'ACTIVE',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error activating card:', error);
      throw new Error(error.message);
    }

    return mapCard(data);
  },

  /**
   * Block a card
   */
  async blockCard(id: string): Promise<Card> {
    const { data, error } = await supabase
      .from('cards')
      .update({
        status: 'BLOCKED',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error blocking card:', error);
      throw new Error(error.message);
    }

    return mapCard(data);
  },

  /**
   * Unblock a card
   */
  async unblockCard(id: string): Promise<Card> {
    const { data, error } = await supabase
      .from('cards')
      .update({
        status: 'ACTIVE',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error unblocking card:', error);
      throw new Error(error.message);
    }

    return mapCard(data);
  },

  /**
   * Update card limits
   */
  async updateLimits(id: string, data: UpdateCardLimitsRequest): Promise<Card> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (data.dailyLimit !== undefined) updates.daily_limit = data.dailyLimit;
    if (data.monthlyLimit !== undefined) updates.monthly_limit = data.monthlyLimit;

    const { data: card, error } = await supabase
      .from('cards')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating card limits:', error);
      throw new Error(error.message);
    }

    return mapCard(card);
  },

  /**
   * Get full card details (sensitive data)
   * Note: In production, this should require additional authentication
   */
  async getCardDetails(id: string): Promise<{
    cardNumber: string;
    cvv: string;
    expiryMonth: number;
    expiryYear: number;
  }> {
    const { data, error } = await supabase
      .from('cards')
      .select('card_number, cvv, expiry_month, expiry_year')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching card details:', error);
      throw new Error(error.message);
    }

    return {
      cardNumber: data.card_number,
      cvv: data.cvv,
      expiryMonth: data.expiry_month,
      expiryYear: data.expiry_year,
    };
  },

  // ==========================================
  // Card Types Management (Admin)
  // ==========================================

  /**
   * Get all card types (active ones for users, all for admins)
   */
  async getCardTypes(includeInactive = false): Promise<CardType[]> {
    let query = supabase
      .from('card_types')
      .select('*')
      .order('price', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching card types:', error);
      throw new Error(error.message);
    }

    return (data || []).map(mapCardType);
  },

  /**
   * Get a single card type
   */
  async getCardType(id: string): Promise<CardType> {
    const { data, error } = await supabase
      .from('card_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching card type:', error);
      throw new Error(error.message);
    }

    return mapCardType(data);
  },

  /**
   * Create a new card type (Admin only)
   */
  async createCardType(data: CreateCardTypeRequest): Promise<CardType> {
    const insertData: any = {
      name: data.name,
      description: data.description,
      card_image_url: data.cardImageUrl,
      price: data.price,
      transaction_fee_percentage: data.transactionFeePercentage || 0,
      transaction_fee_fixed: data.transactionFeeFixed || 0,
      required_kyc_level: data.requiredKycLevel || 1,
      card_type: data.cardType,
      is_active: data.isActive ?? true,
      daily_limit: data.dailyLimit || 1000,
      monthly_limit: data.monthlyLimit || 10000,
      color_gradient: data.colorGradient || 'from-blue-600 to-blue-800',
      features: data.features || [],
      // Feature flags
      allow_negative_balance: data.allowNegativeBalance ?? false,
      allow_buy_now_pay_later: data.allowBuyNowPayLater ?? false,
      high_transaction_limit: data.highTransactionLimit ?? false,
      no_transaction_fees: data.noTransactionFees ?? false,
      cashback_enabled: data.cashbackEnabled ?? false,
      cashback_percentage: data.cashbackPercentage || 0,
      overdraft_limit: data.overdraftLimit || 0,
      bnpl_max_amount: data.bnplMaxAmount || 0,
      bnpl_interest_rate: data.bnplInterestRate || 0,
    };

    console.log('Creating card type with data:', insertData);

    const { data: cardType, error } = await supabase
      .from('card_types')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating card type:', error);
      throw new Error(error.message);
    }

    return mapCardType(cardType);
  },

  /**
   * Update a card type (Admin only)
   */
  async updateCardType(id: string, data: Partial<CreateCardTypeRequest>): Promise<CardType> {
    const updates: any = { updated_at: new Date().toISOString() };

    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.cardImageUrl !== undefined) updates.card_image_url = data.cardImageUrl;
    if (data.price !== undefined) updates.price = data.price;
    if (data.transactionFeePercentage !== undefined) updates.transaction_fee_percentage = data.transactionFeePercentage;
    if (data.transactionFeeFixed !== undefined) updates.transaction_fee_fixed = data.transactionFeeFixed;
    if (data.requiredKycLevel !== undefined) updates.required_kyc_level = data.requiredKycLevel;
    if (data.cardType !== undefined) updates.card_type = data.cardType;
    if (data.isActive !== undefined) updates.is_active = data.isActive;
    if (data.dailyLimit !== undefined) updates.daily_limit = data.dailyLimit;
    if (data.monthlyLimit !== undefined) updates.monthly_limit = data.monthlyLimit;
    if (data.colorGradient !== undefined) updates.color_gradient = data.colorGradient;
    if (data.features !== undefined) updates.features = data.features;
    // Feature flags
    if (data.allowNegativeBalance !== undefined) updates.allow_negative_balance = data.allowNegativeBalance;
    if (data.allowBuyNowPayLater !== undefined) updates.allow_buy_now_pay_later = data.allowBuyNowPayLater;
    if (data.highTransactionLimit !== undefined) updates.high_transaction_limit = data.highTransactionLimit;
    if (data.noTransactionFees !== undefined) updates.no_transaction_fees = data.noTransactionFees;
    if (data.cashbackEnabled !== undefined) updates.cashback_enabled = data.cashbackEnabled;
    if (data.cashbackPercentage !== undefined) updates.cashback_percentage = data.cashbackPercentage;
    if (data.overdraftLimit !== undefined) updates.overdraft_limit = data.overdraftLimit;
    if (data.bnplMaxAmount !== undefined) updates.bnpl_max_amount = data.bnplMaxAmount;
    if (data.bnplInterestRate !== undefined) updates.bnpl_interest_rate = data.bnplInterestRate;

    const { data: cardType, error } = await supabase
      .from('card_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating card type:', error);
      throw new Error(error.message);
    }

    return mapCardType(cardType);
  },

  /**
   * Delete a card type (Admin only)
   */
  async deleteCardType(id: string): Promise<void> {
    const { error } = await supabase
      .from('card_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting card type:', error);
      throw new Error(error.message);
    }
  },

  // ==========================================
  // Card Orders Management
  // ==========================================

  /**
   * Get all card orders for a user
   */
  async getCardOrders(userId: string): Promise<CardOrder[]> {
    const { data, error } = await supabase
      .from('card_orders')
      .select(`
        *,
        card_types (*),
        wallets (id, currency, balance)
      `)
      .eq('user_id', userId)
      .not('status', 'in', '("REJECTED","CANCELLED")') // Hide rejected/cancelled from user view
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching card orders:', error);
      throw new Error(error.message);
    }

    return (data || []).map(mapCardOrder);
  },

  /**
   * Get all card orders (Admin)
   */
  async getAllCardOrders(status?: string): Promise<CardOrder[]> {
    console.log('Fetching all card orders, status filter:', status);

    let query = supabase
      .from('card_orders')
      .select(`
        *,
        card_types (*)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    console.log('Card orders query result:', { data, error, count: data?.length });

    if (error) {
      console.error('Error fetching all card orders:', error);
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      console.log('No card orders found');
      return [];
    }

    // Get unique user IDs and wallet IDs
    const userIds = [...new Set(data.map(o => o.user_id).filter(Boolean))];
    const walletIds = [...new Set(data.map(o => o.wallet_id).filter(Boolean))];

    // Fetch users separately
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, kyc_status, kyc_tier')
      .in('id', userIds);

    // Fetch wallets separately
    const { data: wallets } = await supabase
      .from('wallets')
      .select('id, currency, balance')
      .in('id', walletIds);

    // Create lookup maps
    const userMap = new Map((users || []).map(u => [u.id, u]));
    const walletMap = new Map((wallets || []).map(w => [w.id, w]));

    // Map orders with related data
    return data.map(order => mapCardOrder({
      ...order,
      users: userMap.get(order.user_id) || null,
      wallets: walletMap.get(order.wallet_id) || null,
    }));
  },

  /**
   * Get a single card order
   */
  async getCardOrder(id: string): Promise<CardOrder> {
    console.log('Fetching card order:', id);

    // Get the basic order without joins to avoid relationship issues
    const { data, error } = await supabase
      .from('card_orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();  // Use maybeSingle instead of single to avoid error on no rows

    console.log('Card order fetch result:', { data, error });

    if (error) {
      console.error('Error fetching card order:', error);
      throw new Error(error.message);
    }

    if (!data) {
      // If order not found, return a minimal order object
      console.warn('Card order not found, returning minimal object');
      return {
        id,
        userId: '',
        cardTypeId: '',
        walletId: '',
        amountPaid: 0,
        currency: 'SLE',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as CardOrder;
    }

    // Get related data separately
    let cardTypeData = null;
    let userData = null;
    let walletData = null;

    if (data.card_type_id) {
      const { data: cardType } = await supabase
        .from('card_types')
        .select('*')
        .eq('id', data.card_type_id)
        .maybeSingle();
      cardTypeData = cardType;
    }

    if (data.user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, kyc_status, kyc_tier')
        .eq('id', data.user_id)
        .maybeSingle();
      userData = user;
    }

    if (data.wallet_id) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id, currency, balance')
        .eq('id', data.wallet_id)
        .maybeSingle();
      walletData = wallet;
    }

    return mapCardOrder({
      ...data,
      card_types: cardTypeData,
      users: userData,
      wallets: walletData
    });
  },

  /**
   * Create a card order (purchase a card)
   */
  async createCardOrder(userId: string, data: CreateCardOrderRequest): Promise<CardOrder> {
    console.log('Creating card order:', { userId, data });

    // Use the RPC function for atomic operation
    const { data: orderId, error } = await supabase.rpc('create_card_order', {
      p_user_id: userId,
      p_card_type_id: data.cardTypeId,
      p_wallet_id: data.walletId,
    });

    console.log('RPC result:', { orderId, error });

    if (error) {
      console.error('Error creating card order:', error);
      throw new Error(error.message);
    }

    if (!orderId) {
      throw new Error('Failed to create order - no order ID returned');
    }

    // Update additional fields if provided
    const updateData: any = {};
    if (data.shippingAddress) {
      updateData.shipping_address = data.shippingAddress;
    }
    if (data.cardholderName) {
      updateData.cardholder_name = data.cardholderName;
    }
    if (data.cardPin) {
      updateData.card_pin = data.cardPin;
    }
    if (data.giftRecipientId) {
      updateData.gift_recipient_id = data.giftRecipientId;
      updateData.is_gift = true;
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('card_orders')
        .update(updateData)
        .eq('id', orderId);

      if (updateError) {
        console.warn('Failed to update additional fields:', updateError);
      }
    }

    return this.getCardOrder(orderId);
  },

  /**
   * Admin: Generate a card for an order
   */
  async generateCard(orderId: string, adminId: string, notes?: string): Promise<string> {
    const { data: cardId, error } = await supabase.rpc('admin_generate_card', {
      p_order_id: orderId,
      p_admin_id: adminId,
      p_notes: notes || null,
    });

    if (error) {
      console.error('Error generating card:', error);
      throw new Error(error.message);
    }

    return cardId;
  },

  /**
   * Admin: Reject a card order
   * - Refunds the payment to user's wallet
   * - Deletes any generated card
   * - Updates order status to REJECTED
   */
  async rejectCardOrder(orderId: string, adminId: string, notes: string): Promise<CardOrder> {
    // Get the order to refund
    const order = await this.getCardOrder(orderId);

    // Refund the wallet
    await supabase.rpc('wallet_deposit', {
      p_wallet_id: order.walletId,
      p_amount: order.amountPaid,
      p_description: `Refund for rejected card order: ${order.cardType?.name || 'Card'}`,
    });

    // If a card was already generated, delete it
    if (order.generatedCardId) {
      const { error: deleteError } = await supabase
        .from('cards')
        .delete()
        .eq('id', order.generatedCardId);

      if (deleteError) {
        console.error('Error deleting generated card:', deleteError);
        // Continue with rejection even if card deletion fails
      }
    }

    // Update order status
    const { data, error } = await supabase
      .from('card_orders')
      .update({
        status: 'REJECTED',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
        generated_card_id: null, // Clear the reference to deleted card
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select(`
        *,
        card_types (*),
        users:user_id (id, first_name, last_name, email, phone, kyc_status, kyc_tier),
        wallets (id, currency, balance)
      `)
      .single();

    if (error) {
      console.error('Error rejecting card order:', error);
      throw new Error(error.message);
    }

    return mapCardOrder(data);
  },

  /**
   * Admin: Update shipping info
   */
  async updateShipping(orderId: string, trackingNumber: string): Promise<CardOrder> {
    const { data, error } = await supabase
      .from('card_orders')
      .update({
        tracking_number: trackingNumber,
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select(`
        *,
        card_types (*),
        users:user_id (id, first_name, last_name, email, phone, kyc_status, kyc_tier),
        wallets (id, currency, balance)
      `)
      .single();

    if (error) {
      console.error('Error updating shipping:', error);
      throw new Error(error.message);
    }

    return mapCardOrder(data);
  },

  /**
   * Activate card by QR code
   */
  async activateCardByQR(qrCode: string, userId: string): Promise<string> {
    const { data: cardId, error } = await supabase.rpc('activate_card_by_qr', {
      p_qr_code: qrCode,
      p_user_id: userId,
    });

    if (error) {
      console.error('Error activating card by QR:', error);
      throw new Error(error.message);
    }

    return cardId;
  },

  /**
   * Get card by QR code
   */
  async getCardByQR(qrCode: string): Promise<Card | null> {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('qr_code', qrCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching card by QR:', error);
      throw new Error(error.message);
    }

    return mapCard(data);
  },

  /**
   * Get card with extended info (including card type)
   */
  async getCardWithType(id: string): Promise<Card & { cardType?: CardType }> {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        card_types (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching card with type:', error);
      throw new Error(error.message);
    }

    const card = mapCard(data);
    return {
      ...card,
      cardType: data.card_types ? mapCardType(data.card_types) : undefined,
    };
  },

  // ==========================================
  // Card Payment Services (Hosted Checkout)
  // ==========================================

  /**
   * Look up a card by its 16-digit number and CVV for payment
   * Returns card info with wallet balance (no sensitive data)
   */
  async lookupCardForPayment(cardNumber: string, cvv?: string): Promise<{
    cardId: string;
    maskedNumber: string;
    cardholderName: string;
    walletId: string;
    walletBalance: number;
    currency: string;
    status: string;
  } | null> {
    // Clean the card number (remove spaces/dashes)
    const cleanNumber = cardNumber.replace(/[\s-]/g, '');

    console.log('[CardService] Looking up card number:', cleanNumber, 'length:', cleanNumber.length);

    const { data, error } = await supabase
      .from('cards')
      .select(`
        id,
        card_number,
        masked_number,
        cardholder_name,
        cvv,
        status,
        wallet_id,
        wallets (id, balance, currency)
      `)
      .eq('card_number', cleanNumber)
      .maybeSingle();

    console.log('[CardService] Lookup result:', { data, error, hasData: !!data });

    if (error) {
      console.error('[CardService] Error looking up card:', error);
      throw new Error('Failed to look up card');
    }

    if (!data) {
      console.log('[CardService] No card found for number:', cleanNumber);
      return null;
    }

    // Validate CVV if provided
    if (cvv && data.cvv && data.cvv !== cvv) {
      console.log('[CardService] CVV mismatch');
      throw new Error('Invalid CVV. Please check your card details.');
    }

    // Check if card is active
    if (data.status !== 'ACTIVE') {
      throw new Error(`Card is ${data.status.toLowerCase()}. Please use an active card.`);
    }

    // Get wallet data (could be object or array depending on relation)
    const wallet = Array.isArray(data.wallets) ? data.wallets[0] : data.wallets;

    return {
      cardId: data.id,
      maskedNumber: data.masked_number || maskCardNumber(data.card_number),
      cardholderName: data.cardholder_name || 'Card Holder',
      walletId: data.wallet_id,
      walletBalance: parseFloat(wallet?.balance) || 0,
      currency: wallet?.currency || 'SLE',
      status: data.status,
    };
  },

  /**
   * Verify the card's transaction PIN
   */
  async verifyCardPin(cardId: string, pin: string): Promise<boolean> {
    // Get the card's PIN from the database
    const { data, error } = await supabase
      .from('cards')
      .select('transaction_pin')
      .eq('id', cardId)
      .single();

    if (error) {
      console.error('Error verifying PIN:', error);
      throw new Error('Failed to verify PIN');
    }

    // Check if PIN matches
    // In production, the PIN should be hashed, but for now we compare directly
    if (!data.transaction_pin) {
      throw new Error('Transaction PIN not set for this card. Please set a PIN in your Peeap app.');
    }

    return data.transaction_pin === pin;
  },

  /**
   * Process a card payment for checkout
   * Deducts amount from the card's linked wallet
   */
  async processCardPayment(params: {
    cardId: string;
    walletId: string;
    amount: number;
    merchantId: string;
    description: string;
    checkoutSessionId: string;
  }): Promise<{ success: boolean; transactionId: string }> {
    const { cardId, walletId, amount, merchantId, description, checkoutSessionId } = params;

    // Use an RPC function for atomic operation (withdraw + create transaction)
    const { data, error } = await supabase.rpc('process_card_checkout_payment', {
      p_card_id: cardId,
      p_wallet_id: walletId,
      p_amount: amount,
      p_merchant_id: merchantId,
      p_description: description,
      p_checkout_session_id: checkoutSessionId,
    });

    if (error) {
      console.error('Error processing card payment:', error);
      // Parse error message for user-friendly display
      if (error.message.includes('insufficient')) {
        throw new Error('Insufficient funds in your wallet');
      }
      throw new Error(error.message || 'Payment failed');
    }

    return {
      success: true,
      transactionId: data,
    };
  },
};

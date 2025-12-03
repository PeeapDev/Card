/**
 * Cash-Out Service
 *
 * Handles cash withdrawal requests at agent locations
 */

import { supabase } from '@/lib/supabase';

export interface AgentLocation {
  id: string;
  agentId: string;
  businessName: string;
  address: string;
  city?: string;
  region?: string;
  phone?: string;
  whatsapp?: string;
  operatingHours?: Record<string, string>;
  isOpenNow: boolean;
  cashAvailable: boolean;
  dailyLimit: number;
  minAmount: number;
  maxAmount: number;
  isActive: boolean;
  verified: boolean;
  rating: number;
  totalTransactions: number;
  latitude?: number;
  longitude?: number;
  distance?: number; // km from user
}

export interface CashOutRequest {
  id: string;
  userId: string;
  agentId?: string;
  agentLocationId?: string;
  amount: number;
  currency: string;
  fee: number;
  totalDeducted: number;
  code: string;
  codeExpiresAt: string;
  codeVerifiedAt?: string;
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  qrCodeData?: string;
  walletId: string;
  transactionId?: string;
  requestedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  agentLocation?: AgentLocation;
}

// Map database row to AgentLocation
const mapAgentLocation = (row: any): AgentLocation => ({
  id: row.id,
  agentId: row.agent_id,
  businessName: row.business_name,
  address: row.address,
  city: row.city,
  region: row.region,
  phone: row.phone,
  whatsapp: row.whatsapp,
  operatingHours: row.operating_hours,
  isOpenNow: row.is_open_now ?? false,
  cashAvailable: row.cash_available ?? true,
  dailyLimit: parseFloat(row.daily_limit) || 50000,
  minAmount: parseFloat(row.min_amount) || 10,
  maxAmount: parseFloat(row.max_amount) || 10000,
  isActive: row.is_active ?? true,
  verified: row.verified ?? false,
  rating: parseFloat(row.rating) || 0,
  totalTransactions: parseInt(row.total_transactions) || 0,
  latitude: row.latitude ? parseFloat(row.latitude) : undefined,
  longitude: row.longitude ? parseFloat(row.longitude) : undefined,
});

// Map database row to CashOutRequest
const mapCashOutRequest = (row: any): CashOutRequest => ({
  id: row.id,
  userId: row.user_id,
  agentId: row.agent_id,
  agentLocationId: row.agent_location_id,
  amount: parseFloat(row.amount) || 0,
  currency: row.currency || 'SLE',
  fee: parseFloat(row.fee) || 0,
  totalDeducted: parseFloat(row.total_deducted) || 0,
  code: row.code,
  codeExpiresAt: row.code_expires_at,
  codeVerifiedAt: row.code_verified_at,
  status: row.status || 'PENDING',
  qrCodeData: row.qr_code_data,
  walletId: row.wallet_id,
  transactionId: row.transaction_id,
  requestedAt: row.requested_at || row.created_at,
  completedAt: row.completed_at,
  cancelledAt: row.cancelled_at,
  cancelReason: row.cancel_reason,
  agentLocation: row.agent_locations ? mapAgentLocation(row.agent_locations) : undefined,
});

export const cashoutService = {
  /**
   * Get nearby agent locations
   */
  async getNearbyAgents(options?: {
    city?: string;
    limit?: number;
    latitude?: number;
    longitude?: number;
  }): Promise<AgentLocation[]> {
    let query = supabase
      .from('agent_locations')
      .select('*')
      .eq('is_active', true)
      .eq('cash_available', true)
      .order('total_transactions', { ascending: false });

    if (options?.city) {
      query = query.eq('city', options.city);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching agent locations:', error);
      return [];
    }

    let locations = (data || []).map(mapAgentLocation);

    // Calculate distance if coordinates provided
    if (options?.latitude && options?.longitude) {
      locations = locations.map(loc => ({
        ...loc,
        distance: loc.latitude && loc.longitude
          ? this.calculateDistance(
              options.latitude!,
              options.longitude!,
              loc.latitude,
              loc.longitude
            )
          : undefined,
      }));

      // Sort by distance
      locations.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    }

    return locations;
  },

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal
  },

  toRad(deg: number): number {
    return deg * (Math.PI / 180);
  },

  /**
   * Get agent location by ID
   */
  async getAgentLocation(locationId: string): Promise<AgentLocation | null> {
    const { data, error } = await supabase
      .from('agent_locations')
      .select('*')
      .eq('id', locationId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapAgentLocation(data);
  },

  /**
   * Create a cash-out request
   */
  async createRequest(params: {
    userId: string;
    amount: number;
    walletId: string;
    agentLocationId?: string;
    currency?: string;
  }): Promise<{ success: boolean; request?: CashOutRequest; code?: string; error?: string }> {
    // Try RPC function
    const { data, error } = await supabase.rpc('create_cash_out_request', {
      p_user_id: params.userId,
      p_amount: params.amount,
      p_wallet_id: params.walletId,
      p_agent_location_id: params.agentLocationId || null,
      p_currency: params.currency || 'SLE',
    });

    if (error) {
      // Fallback to manual creation
      if (error.message.includes('does not exist')) {
        return this.createRequestManually(params);
      }
      return { success: false, error: error.message };
    }

    const result = data?.[0] || data;

    if (!result?.success) {
      return { success: false, error: result?.message || 'Failed to create request' };
    }

    // Fetch the created request
    const request = await this.getRequest(result.request_id);
    return {
      success: true,
      request: request || undefined,
      code: result.code,
    };
  },

  /**
   * Manual request creation fallback
   */
  async createRequestManually(params: {
    userId: string;
    amount: number;
    walletId: string;
    agentLocationId?: string;
    currency?: string;
  }): Promise<{ success: boolean; request?: CashOutRequest; code?: string; error?: string }> {
    // Calculate fee (1% min 1)
    const fee = Math.max(Math.round(params.amount * 0.01 * 100) / 100, 1);
    const total = params.amount + fee;

    // Check balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', params.walletId)
      .single();

    if (!wallet || parseFloat(wallet.balance) < total) {
      return { success: false, error: 'Insufficient balance' };
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Expires in 30 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    // Deduct from wallet
    await supabase
      .from('wallets')
      .update({
        balance: parseFloat(wallet.balance) - total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.walletId);

    // Create request
    const { data: request, error } = await supabase
      .from('cash_out_requests')
      .insert({
        user_id: params.userId,
        agent_location_id: params.agentLocationId,
        amount: params.amount,
        currency: params.currency || 'SLE',
        fee,
        total_deducted: total,
        code,
        code_expires_at: expiresAt.toISOString(),
        wallet_id: params.walletId,
        status: 'PENDING',
        qr_code_data: `CASHOUT_${params.userId}_${Date.now()}`,
      })
      .select()
      .single();

    if (error) {
      // Refund wallet
      await supabase
        .from('wallets')
        .update({
          balance: parseFloat(wallet.balance),
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.walletId);

      return { success: false, error: error.message };
    }

    return {
      success: true,
      request: mapCashOutRequest(request),
      code,
    };
  },

  /**
   * Get a cash-out request by ID
   */
  async getRequest(requestId: string): Promise<CashOutRequest | null> {
    const { data, error } = await supabase
      .from('cash_out_requests')
      .select(`
        *,
        agent_locations (*)
      `)
      .eq('id', requestId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapCashOutRequest(data);
  },

  /**
   * Get user's cash-out history
   */
  async getUserRequests(userId: string, limit = 20): Promise<CashOutRequest[]> {
    const { data, error } = await supabase
      .from('cash_out_requests')
      .select(`
        *,
        agent_locations (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching cash-out requests:', error);
      return [];
    }

    return (data || []).map(mapCashOutRequest);
  },

  /**
   * Get active (pending) request for user
   */
  async getActiveRequest(userId: string): Promise<CashOutRequest | null> {
    const { data } = await supabase
      .from('cash_out_requests')
      .select(`
        *,
        agent_locations (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'PENDING')
      .gt('code_expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? mapCashOutRequest(data) : null;
  },

  /**
   * Cancel a cash-out request
   */
  async cancelRequest(requestId: string, userId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    // Try RPC
    const { data, error } = await supabase.rpc('cancel_cash_out', {
      p_request_id: requestId,
      p_user_id: userId,
      p_reason: reason || null,
    });

    if (error) {
      // Manual fallback
      if (error.message.includes('does not exist')) {
        return this.cancelRequestManually(requestId, userId, reason);
      }
      return { success: false, message: error.message };
    }

    const result = data?.[0] || data;
    return {
      success: result?.success || false,
      message: result?.message || 'Unknown error',
    };
  },

  /**
   * Manual cancel fallback
   */
  async cancelRequestManually(requestId: string, userId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    // Get request
    const { data: request } = await supabase
      .from('cash_out_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', userId)
      .eq('status', 'PENDING')
      .single();

    if (!request) {
      return { success: false, message: 'Request not found or cannot be cancelled' };
    }

    // Refund wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', request.wallet_id)
      .single();

    if (wallet) {
      await supabase
        .from('wallets')
        .update({
          balance: parseFloat(wallet.balance) + parseFloat(request.total_deducted),
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.wallet_id);
    }

    // Update request
    await supabase
      .from('cash_out_requests')
      .update({
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    return { success: true, message: 'Cash-out request cancelled and funds refunded' };
  },

  /**
   * Calculate fee for an amount
   */
  calculateFee(amount: number): number {
    return Math.max(Math.round(amount * 0.01 * 100) / 100, 1);
  },

  /**
   * Get withdrawal limits
   */
  getLimits(): { minAmount: number; maxAmount: number; dailyLimit: number } {
    return {
      minAmount: 10,
      maxAmount: 10000,
      dailyLimit: 50000,
    };
  },
};

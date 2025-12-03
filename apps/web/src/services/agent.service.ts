/**
 * Agent Service
 *
 * Handles agent-specific operations for cash handling, transactions, and float management
 */

import { supabase } from '@/lib/supabase';

export interface AgentProfile {
  id: string;
  userId: string;
  businessName: string;
  address: string;
  city?: string;
  region?: string;
  phone?: string;
  whatsapp?: string;
  operatingHours?: Record<string, string>;
  isActive: boolean;
  verified: boolean;
  tier: 'basic' | 'standard' | 'agent_plus';
  dailyLimit: number;
  minAmount: number;
  maxAmount: number;
  commissionRate: number;
  totalTransactions: number;
  rating: number;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

export interface AgentDashboardStats {
  walletBalance: number;
  floatBalance: number;
  todayCashIn: number;
  todayCashOut: number;
  todayCommissions: number;
  todayTransactions: number;
  pendingCashOuts: number;
  monthlyVolume: number;
  monthlyCommissions: number;
  totalCustomersServed: number;
}

export interface CashOutRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  fee: number;
  code: string;
  codeExpiresAt: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  requestedAt: string;
  walletId: string;
}

export interface AgentTransaction {
  id: string;
  type: 'CASH_IN' | 'CASH_OUT' | 'TRANSFER' | 'COMMISSION' | 'FLOAT_TOPUP' | 'FLOAT_WITHDRAW' | 'DEPOSIT';
  amount: number;
  fee: number;
  commission: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  reference: string;
  description: string;
  createdAt: string;
}

export interface CashInParams {
  agentId: string;
  customerPhone: string;
  amount: number;
  description?: string;
}

// Map database row to AgentProfile
const mapAgentProfile = (row: any): AgentProfile => ({
  id: row.id,
  userId: row.agent_id || row.user_id,
  businessName: row.business_name,
  address: row.address,
  city: row.city,
  region: row.region,
  phone: row.phone,
  whatsapp: row.whatsapp,
  operatingHours: row.operating_hours,
  isActive: row.is_active ?? true,
  verified: row.verified ?? false,
  tier: row.tier || 'basic',
  dailyLimit: parseFloat(row.daily_limit) || 500000,
  minAmount: parseFloat(row.min_amount) || 10,
  maxAmount: parseFloat(row.max_amount) || 100000,
  commissionRate: parseFloat(row.commission_rate) || 0.5,
  totalTransactions: parseInt(row.total_transactions) || 0,
  rating: parseFloat(row.rating) || 0,
  latitude: row.latitude ? parseFloat(row.latitude) : undefined,
  longitude: row.longitude ? parseFloat(row.longitude) : undefined,
  createdAt: row.created_at,
});

// Map database row to CashOutRequest
const mapCashOutRequest = (row: any): CashOutRequest => ({
  id: row.id,
  customerId: row.user_id,
  customerName: row.user?.first_name
    ? `${row.user.first_name} ${row.user.last_name || ''}`.trim()
    : 'Unknown Customer',
  customerPhone: row.user?.phone,
  amount: parseFloat(row.amount) || 0,
  fee: parseFloat(row.fee) || 0,
  code: row.code,
  codeExpiresAt: row.code_expires_at,
  status: row.status || 'PENDING',
  requestedAt: row.requested_at || row.created_at,
  walletId: row.wallet_id,
});

// Map database row to AgentTransaction
const mapAgentTransaction = (row: any): AgentTransaction => ({
  id: row.id,
  type: row.type || 'TRANSFER',
  amount: Math.abs(parseFloat(row.amount) || 0),
  fee: parseFloat(row.fee) || 0,
  commission: parseFloat(row.commission) || 0,
  customerId: row.customer_id || row.recipient_id,
  customerName: row.customer_name || row.description,
  customerPhone: row.customer_phone,
  status: row.status || 'COMPLETED',
  reference: row.reference || row.id?.slice(0, 8).toUpperCase(),
  description: row.description || row.type,
  createdAt: row.created_at,
});

export const agentService = {
  /**
   * Get agent's profile/location data
   */
  async getProfile(userId: string): Promise<AgentProfile | null> {
    // First try agent_locations table
    const { data: location } = await supabase
      .from('agent_locations')
      .select('*')
      .eq('agent_id', userId)
      .maybeSingle();

    if (location) {
      return mapAgentProfile(location);
    }

    // Fallback: check if user is an agent and create basic profile
    const { data: user } = await supabase
      .from('users')
      .select('id, first_name, last_name, phone, role')
      .eq('id', userId)
      .eq('role', 'agent')
      .maybeSingle();

    if (user) {
      return {
        id: user.id,
        userId: user.id,
        businessName: `${user.first_name} ${user.last_name || ''}`.trim() || 'Agent',
        address: '',
        isActive: true,
        verified: false,
        tier: 'basic',
        dailyLimit: 500000,
        minAmount: 10,
        maxAmount: 100000,
        commissionRate: 0.5,
        totalTransactions: 0,
        rating: 0,
        phone: user.phone,
        createdAt: new Date().toISOString(),
      };
    }

    return null;
  },

  /**
   * Get agent's dashboard statistics
   */
  async getDashboardStats(userId: string): Promise<AgentDashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get agent's wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .maybeSingle();

    const walletId = wallet?.id;
    const walletBalance = parseFloat(wallet?.balance || '0');

    // Get today's transactions
    const { data: todayTxns } = await supabase
      .from('transactions')
      .select('amount, type, fee')
      .eq('wallet_id', walletId)
      .eq('status', 'COMPLETED')
      .gte('created_at', today.toISOString());

    let todayCashIn = 0;
    let todayCashOut = 0;
    let todayCommissions = 0;

    for (const txn of todayTxns || []) {
      const amount = parseFloat(txn.amount) || 0;
      const fee = parseFloat(txn.fee) || 0;

      if (txn.type === 'CASH_IN' || txn.type === 'DEPOSIT') {
        todayCashIn += Math.abs(amount);
        todayCommissions += fee * 0.5; // Agent gets 50% of fee
      } else if (txn.type === 'CASH_OUT') {
        todayCashOut += Math.abs(amount);
        todayCommissions += fee * 0.5;
      }
    }

    // Get pending cash-out requests (assigned to this agent or in this agent's area)
    const { data: pendingCashOuts } = await supabase
      .from('cash_out_requests')
      .select('id')
      .or(`agent_id.eq.${userId},agent_location_id.is.null`)
      .eq('status', 'PENDING')
      .gt('code_expires_at', new Date().toISOString());

    // Get monthly volume
    const { data: monthlyTxns } = await supabase
      .from('transactions')
      .select('amount')
      .eq('wallet_id', walletId)
      .eq('status', 'COMPLETED')
      .gte('created_at', startOfMonth.toISOString());

    const monthlyVolume = (monthlyTxns || []).reduce((sum, txn) =>
      sum + Math.abs(parseFloat(txn.amount) || 0), 0);

    // Get total customers served (unique customers from transactions)
    const { count: customersCount } = await supabase
      .from('transactions')
      .select('recipient_id', { count: 'exact', head: true })
      .eq('wallet_id', walletId)
      .not('recipient_id', 'is', null);

    return {
      walletBalance,
      floatBalance: walletBalance, // Float is the agent's available cash
      todayCashIn,
      todayCashOut,
      todayCommissions,
      todayTransactions: todayTxns?.length || 0,
      pendingCashOuts: pendingCashOuts?.length || 0,
      monthlyVolume,
      monthlyCommissions: todayCommissions * 30, // Estimate
      totalCustomersServed: customersCount || 0,
    };
  },

  /**
   * Get pending cash-out requests for agent to process
   */
  async getPendingCashOuts(agentId: string, limit = 20): Promise<CashOutRequest[]> {
    // Get cash-out requests that are pending and not expired
    const { data, error } = await supabase
      .from('cash_out_requests')
      .select(`
        *,
        user:users(first_name, last_name, phone)
      `)
      .eq('status', 'PENDING')
      .gt('code_expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching pending cash-outs:', error);
      return [];
    }

    return (data || []).map(mapCashOutRequest);
  },

  /**
   * Verify cash-out code and get request details
   */
  async verifyCashOutCode(code: string): Promise<{
    success: boolean;
    request?: CashOutRequest;
    error?: string
  }> {
    const { data, error } = await supabase
      .from('cash_out_requests')
      .select(`
        *,
        user:users(first_name, last_name, phone)
      `)
      .eq('code', code)
      .eq('status', 'PENDING')
      .gt('code_expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Invalid or expired code' };
    }

    return { success: true, request: mapCashOutRequest(data) };
  },

  /**
   * Complete a cash-out request (dispense cash)
   */
  async completeCashOut(params: {
    requestId: string;
    agentId: string;
    code: string;
  }): Promise<{ success: boolean; message: string }> {
    // Try RPC function first
    const { data, error } = await supabase.rpc('complete_cash_out', {
      p_request_id: params.requestId,
      p_agent_id: params.agentId,
      p_code: params.code,
    });

    if (error) {
      // Manual fallback
      if (error.message.includes('does not exist')) {
        return this.completeCashOutManually(params);
      }
      return { success: false, message: error.message };
    }

    const result = data?.[0] || data;
    return {
      success: result?.success || false,
      message: result?.message || 'Cash-out completed',
    };
  },

  /**
   * Manual cash-out completion fallback
   */
  async completeCashOutManually(params: {
    requestId: string;
    agentId: string;
    code: string;
  }): Promise<{ success: boolean; message: string }> {
    // Get and verify request
    const { data: request } = await supabase
      .from('cash_out_requests')
      .select('*')
      .eq('id', params.requestId)
      .eq('code', params.code)
      .eq('status', 'PENDING')
      .gt('code_expires_at', new Date().toISOString())
      .single();

    if (!request) {
      return { success: false, message: 'Invalid request or code' };
    }

    // Get agent's wallet
    const { data: agentWallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', params.agentId)
      .eq('is_primary', true)
      .single();

    if (!agentWallet || parseFloat(agentWallet.balance) < parseFloat(request.amount)) {
      return { success: false, message: 'Insufficient float balance' };
    }

    // Deduct from agent wallet (they're giving out cash)
    await supabase
      .from('wallets')
      .update({
        balance: parseFloat(agentWallet.balance) - parseFloat(request.amount),
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentWallet.id);

    // Update request status
    await supabase
      .from('cash_out_requests')
      .update({
        status: 'COMPLETED',
        agent_id: params.agentId,
        code_verified_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.requestId);

    // Create transaction record for agent
    const commission = parseFloat(request.fee) * 0.5; // 50% of fee
    await supabase.from('transactions').insert({
      wallet_id: agentWallet.id,
      user_id: params.agentId,
      amount: -parseFloat(request.amount),
      type: 'CASH_OUT',
      status: 'COMPLETED',
      description: `Cash-out to customer`,
      fee: 0,
      metadata: {
        cash_out_request_id: params.requestId,
        commission,
        customer_id: request.user_id,
      },
    });

    return { success: true, message: `Cash-out of Le ${request.amount} completed. Commission: Le ${commission.toFixed(2)}` };
  },

  /**
   * Process a cash-in (deposit) for a customer
   */
  async processCashIn(params: CashInParams): Promise<{
    success: boolean;
    transactionId?: string;
    message: string
  }> {
    // Find customer by phone
    const { data: customer } = await supabase
      .from('users')
      .select('id')
      .eq('phone', params.customerPhone)
      .maybeSingle();

    if (!customer) {
      return { success: false, message: 'Customer not found with that phone number' };
    }

    // Get customer's wallet
    const { data: customerWallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', customer.id)
      .eq('is_primary', true)
      .maybeSingle();

    if (!customerWallet) {
      return { success: false, message: 'Customer wallet not found' };
    }

    // Get agent's wallet
    const { data: agentWallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', params.agentId)
      .eq('is_primary', true)
      .single();

    if (!agentWallet) {
      return { success: false, message: 'Agent wallet not found' };
    }

    // Calculate fee (1% with min of Le 1)
    const fee = Math.max(params.amount * 0.01, 1);
    const commission = fee * 0.5;
    const amountAfterFee = params.amount - fee;

    // Credit customer wallet
    await supabase
      .from('wallets')
      .update({
        balance: parseFloat(customerWallet.balance) + amountAfterFee,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerWallet.id);

    // Credit agent wallet (they receive cash)
    await supabase
      .from('wallets')
      .update({
        balance: parseFloat(agentWallet.balance) + params.amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentWallet.id);

    // Create customer transaction
    const { data: txn } = await supabase
      .from('transactions')
      .insert({
        wallet_id: customerWallet.id,
        user_id: customer.id,
        amount: amountAfterFee,
        type: 'CASH_IN',
        status: 'COMPLETED',
        description: params.description || 'Cash deposit via agent',
        fee,
        metadata: {
          agent_id: params.agentId,
          gross_amount: params.amount,
        },
      })
      .select('id')
      .single();

    // Create agent transaction
    await supabase.from('transactions').insert({
      wallet_id: agentWallet.id,
      user_id: params.agentId,
      amount: params.amount,
      type: 'CASH_IN',
      status: 'COMPLETED',
      description: `Cash-in from customer`,
      fee: 0,
      metadata: {
        customer_id: customer.id,
        commission,
      },
    });

    return {
      success: true,
      transactionId: txn?.id,
      message: `Deposited Le ${amountAfterFee.toLocaleString()} to customer. Commission: Le ${commission.toFixed(2)}`,
    };
  },

  /**
   * Get agent's transaction history
   */
  async getTransactions(userId: string, options?: {
    type?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AgentTransaction[]> {
    // Get agent's wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .maybeSingle();

    if (!wallet) {
      return [];
    }

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false });

    if (options?.type) {
      query = query.eq('type', options.type);
    }

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return (data || []).map(mapAgentTransaction);
  },

  /**
   * Get processed cash-out history
   */
  async getCashOutHistory(agentId: string, limit = 20): Promise<CashOutRequest[]> {
    const { data, error } = await supabase
      .from('cash_out_requests')
      .select(`
        *,
        user:users(first_name, last_name, phone)
      `)
      .eq('agent_id', agentId)
      .in('status', ['COMPLETED', 'CANCELLED'])
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching cash-out history:', error);
      return [];
    }

    return (data || []).map(mapCashOutRequest);
  },

  /**
   * Top up agent float (request more cash)
   */
  async requestFloatTopup(agentId: string, amount: number): Promise<{
    success: boolean;
    message: string;
  }> {
    // This would typically create a request to the admin/bank
    // For now, we'll create a pending transaction
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', agentId)
      .eq('is_primary', true)
      .single();

    if (!wallet) {
      return { success: false, message: 'Wallet not found' };
    }

    await supabase.from('transactions').insert({
      wallet_id: wallet.id,
      user_id: agentId,
      amount,
      type: 'FLOAT_TOPUP',
      status: 'PENDING',
      description: 'Float top-up request',
    });

    return { success: true, message: 'Float top-up request submitted' };
  },

  /**
   * Get commission rates
   */
  getCommissionRates(): { cashIn: number; cashOut: number; transfer: number } {
    return {
      cashIn: 0.5,  // 0.5% of fee
      cashOut: 0.5, // 0.5% of fee
      transfer: 0.3, // 0.3% of fee
    };
  },

  /**
   * Get transaction limits
   */
  getLimits(tier: 'basic' | 'standard' | 'agent_plus' = 'basic'): {
    minTransaction: number;
    maxTransaction: number;
    dailyLimit: number;
  } {
    const limits = {
      basic: { minTransaction: 10, maxTransaction: 50000, dailyLimit: 500000 },
      standard: { minTransaction: 10, maxTransaction: 100000, dailyLimit: 1000000 },
      agent_plus: { minTransaction: 10, maxTransaction: 500000, dailyLimit: 5000000 },
    };
    return limits[tier];
  },
};

/**
 * Employee Card Service - CRUD operations for employee cards
 */

import { supabase } from '../supabase';
import type {
  EmployeeCard,
  CardTransaction,
  SpendingPolicy,
  CardDashboardStats,
  CardStatus,
  MerchantCategory,
  IssueCardDto,
  UpdateCardDto,
  CreatePolicyDto,
  UpdateTransactionDto,
  CardFilters,
  TransactionFilters,
} from './types';

// Use the shared Supabase client
function getSupabase() {
  return supabase;
}

// =============================================
// CARDS
// =============================================

export async function getCards(businessId: string, filters?: CardFilters): Promise<EmployeeCard[]> {
  let query = getSupabase()
    .from('employee_cards')
    .select(`
      *,
      transactions:card_transactions(*)
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.card_type) {
    query = query.eq('card_type', filters.card_type);
  }
  if (filters?.employee_id) {
    query = query.eq('employee_id', filters.employee_id);
  }
  if (filters?.department) {
    query = query.eq('employee_department', filters.department);
  }
  if (filters?.search) {
    query = query.or(`employee_name.ilike.%${filters.search}%,card_name.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data || [];
}

export async function getCard(cardId: string): Promise<EmployeeCard | null> {
  const { data, error } = await getSupabase()
    .from('employee_cards')
    .select(`
      *,
      transactions:card_transactions(*)
    `)
    .eq('id', cardId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

function generateCardNumber(): string {
  // Generate last 4 digits (in real implementation, this would come from card issuer)
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function issueCard(businessId: string, dto: IssueCardDto): Promise<EmployeeCard> {
  const cardNumberLast4 = generateCardNumber();
  const cardName = dto.card_name || `${dto.employee_name}'s Card`;

  const { data, error } = await getSupabase()
    .from('employee_cards')
    .insert({
      business_id: businessId,
      employee_id: dto.employee_id,
      card_number_last4: cardNumberLast4,
      card_type: dto.card_type || 'virtual',
      card_name: cardName,
      status: 'pending',
      employee_name: dto.employee_name,
      employee_email: dto.employee_email,
      employee_department: dto.employee_department,
      spending_limit: dto.spending_limit,
      spending_limit_period: dto.spending_limit_period || 'monthly',
      current_spend: 0,
      currency: dto.currency || 'NLE',
      allowed_categories: dto.allowed_categories,
      blocked_categories: dto.blocked_categories,
      require_receipt: dto.require_receipt ?? false,
      require_memo: dto.require_memo ?? false,
      notes: dto.notes,
      issued_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Activate the card (in production, this would go through card issuer)
  const { error: activateError } = await getSupabase()
    .from('employee_cards')
    .update({ status: 'active' })
    .eq('id', data.id);

  if (activateError) throw activateError;

  return getCard(data.id) as Promise<EmployeeCard>;
}

export async function updateCard(cardId: string, dto: UpdateCardDto): Promise<EmployeeCard> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (dto.card_name !== undefined) updates.card_name = dto.card_name;
  if (dto.spending_limit !== undefined) updates.spending_limit = dto.spending_limit;
  if (dto.spending_limit_period !== undefined) updates.spending_limit_period = dto.spending_limit_period;
  if (dto.allowed_categories !== undefined) updates.allowed_categories = dto.allowed_categories;
  if (dto.blocked_categories !== undefined) updates.blocked_categories = dto.blocked_categories;
  if (dto.require_receipt !== undefined) updates.require_receipt = dto.require_receipt;
  if (dto.require_memo !== undefined) updates.require_memo = dto.require_memo;
  if (dto.notes !== undefined) updates.notes = dto.notes;

  const { error } = await getSupabase()
    .from('employee_cards')
    .update(updates)
    .eq('id', cardId);

  if (error) throw error;
  return getCard(cardId) as Promise<EmployeeCard>;
}

export async function freezeCard(cardId: string): Promise<EmployeeCard> {
  const { error } = await getSupabase()
    .from('employee_cards')
    .update({
      status: 'frozen',
      frozen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId);

  if (error) throw error;
  return getCard(cardId) as Promise<EmployeeCard>;
}

export async function unfreezeCard(cardId: string): Promise<EmployeeCard> {
  const { error } = await getSupabase()
    .from('employee_cards')
    .update({
      status: 'active',
      frozen_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId);

  if (error) throw error;
  return getCard(cardId) as Promise<EmployeeCard>;
}

export async function cancelCard(cardId: string): Promise<EmployeeCard> {
  const { error } = await getSupabase()
    .from('employee_cards')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId);

  if (error) throw error;
  return getCard(cardId) as Promise<EmployeeCard>;
}

export async function deleteCard(cardId: string): Promise<void> {
  // Delete transactions first
  await getSupabase().from('card_transactions').delete().eq('employee_card_id', cardId);

  const { error } = await getSupabase()
    .from('employee_cards')
    .delete()
    .eq('id', cardId);

  if (error) throw error;
}

// =============================================
// TRANSACTIONS
// =============================================

export async function getTransactions(businessId: string, filters?: TransactionFilters): Promise<CardTransaction[]> {
  let query = supabase
    .from('card_transactions')
    .select(`
      *,
      card:employee_cards!employee_card_id(*)
    `)
    .eq('card.business_id', businessId)
    .order('transaction_date', { ascending: false });

  if (filters?.card_id) {
    query = query.eq('employee_card_id', filters.card_id);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.category) {
    query = query.eq('merchant_category', filters.category);
  }
  if (filters?.date_from) {
    query = query.gte('transaction_date', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('transaction_date', filters.date_to);
  }
  if (filters?.needs_receipt) {
    query = query.is('receipt_url', null);
  }
  if (filters?.needs_approval) {
    query = query.eq('requires_approval', true).is('approved_at', null);
  }
  if (filters?.search) {
    query = query.or(`merchant_name.ilike.%${filters.search}%,memo.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data || [];
}

export async function getTransaction(transactionId: string): Promise<CardTransaction | null> {
  const { data, error } = await getSupabase()
    .from('card_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function updateTransaction(transactionId: string, dto: UpdateTransactionDto): Promise<CardTransaction> {
  const updates: Record<string, unknown> = {};

  if (dto.expense_category !== undefined) updates.expense_category = dto.expense_category;
  if (dto.memo !== undefined) updates.memo = dto.memo;
  if (dto.receipt_url !== undefined) {
    updates.receipt_url = dto.receipt_url;
    updates.receipt_uploaded_at = new Date().toISOString();
  }

  const { error } = await getSupabase()
    .from('card_transactions')
    .update(updates)
    .eq('id', transactionId);

  if (error) throw error;
  return getTransaction(transactionId) as Promise<CardTransaction>;
}

export async function approveTransaction(transactionId: string, approverId: string): Promise<CardTransaction> {
  const { error } = await getSupabase()
    .from('card_transactions')
    .update({
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', transactionId);

  if (error) throw error;
  return getTransaction(transactionId) as Promise<CardTransaction>;
}

export async function declineTransaction(transactionId: string, reason: string): Promise<CardTransaction> {
  const { error } = await getSupabase()
    .from('card_transactions')
    .update({
      status: 'declined',
      decline_reason: reason,
    })
    .eq('id', transactionId);

  if (error) throw error;
  return getTransaction(transactionId) as Promise<CardTransaction>;
}

// =============================================
// POLICIES
// =============================================

export async function getPolicies(businessId: string): Promise<SpendingPolicy[]> {
  const { data, error } = await getSupabase()
    .from('spending_policies')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPolicy(policyId: string): Promise<SpendingPolicy | null> {
  const { data, error } = await getSupabase()
    .from('spending_policies')
    .select('*')
    .eq('id', policyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createPolicy(businessId: string, dto: CreatePolicyDto): Promise<SpendingPolicy> {
  const { data, error } = await getSupabase()
    .from('spending_policies')
    .insert({
      business_id: businessId,
      name: dto.name,
      description: dto.description,
      daily_limit: dto.daily_limit,
      weekly_limit: dto.weekly_limit,
      monthly_limit: dto.monthly_limit,
      per_transaction_limit: dto.per_transaction_limit,
      currency: dto.currency || 'NLE',
      allowed_categories: dto.allowed_categories,
      blocked_categories: dto.blocked_categories,
      auto_approve_limit: dto.auto_approve_limit,
      require_receipt_above: dto.require_receipt_above,
      require_memo: dto.require_memo ?? false,
      default_policy: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePolicy(policyId: string, dto: Partial<CreatePolicyDto>): Promise<SpendingPolicy> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.description !== undefined) updates.description = dto.description;
  if (dto.daily_limit !== undefined) updates.daily_limit = dto.daily_limit;
  if (dto.weekly_limit !== undefined) updates.weekly_limit = dto.weekly_limit;
  if (dto.monthly_limit !== undefined) updates.monthly_limit = dto.monthly_limit;
  if (dto.per_transaction_limit !== undefined) updates.per_transaction_limit = dto.per_transaction_limit;
  if (dto.allowed_categories !== undefined) updates.allowed_categories = dto.allowed_categories;
  if (dto.blocked_categories !== undefined) updates.blocked_categories = dto.blocked_categories;
  if (dto.auto_approve_limit !== undefined) updates.auto_approve_limit = dto.auto_approve_limit;
  if (dto.require_receipt_above !== undefined) updates.require_receipt_above = dto.require_receipt_above;
  if (dto.require_memo !== undefined) updates.require_memo = dto.require_memo;

  const { data, error } = await getSupabase()
    .from('spending_policies')
    .update(updates)
    .eq('id', policyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePolicy(policyId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('spending_policies')
    .delete()
    .eq('id', policyId);

  if (error) throw error;
}

// =============================================
// DASHBOARD
// =============================================

export async function getCardDashboard(businessId: string): Promise<CardDashboardStats> {
  const { data: cards } = await getSupabase()
    .from('employee_cards')
    .select('*')
    .eq('business_id', businessId);

  const allCards = cards || [];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  let activeCards = 0;
  let frozenCards = 0;
  let pendingCards = 0;

  allCards.forEach(card => {
    if (card.status === 'active') activeCards++;
    else if (card.status === 'frozen') frozenCards++;
    else if (card.status === 'pending') pendingCards++;
  });

  // Get transactions
  const { data: transactions } = await getSupabase()
    .from('card_transactions')
    .select('*')
    .gte('transaction_date', startOfLastMonth.toISOString());

  let thisMonthSpend = 0;
  let lastMonthSpend = 0;
  let pendingReceipts = 0;
  let pendingApprovals = 0;
  const spendByCategory: Record<string, number> = {};
  const spendByEmployee: Record<string, number> = {};

  (transactions || []).forEach(tx => {
    const txDate = new Date(tx.transaction_date);
    if (txDate >= startOfMonth) {
      thisMonthSpend += tx.amount;
    } else if (txDate >= startOfLastMonth && txDate <= endOfLastMonth) {
      lastMonthSpend += tx.amount;
    }

    if (!tx.receipt_url && tx.status === 'approved') {
      pendingReceipts++;
    }
    if (tx.requires_approval && !tx.approved_at) {
      pendingApprovals++;
    }

    // Aggregate by category
    const category = tx.merchant_category || 'other';
    spendByCategory[category] = (spendByCategory[category] || 0) + tx.amount;
  });

  // Aggregate spend by employee
  allCards.forEach(card => {
    if (card.current_spend > 0) {
      spendByEmployee[card.employee_name] = (spendByEmployee[card.employee_name] || 0) + card.current_spend;
    }
  });

  const spendGrowth = lastMonthSpend > 0
    ? ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100
    : 0;

  const topEmployees = Object.entries(spendByEmployee)
    .map(([name, amount]) => ({ employee_name: name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    total_cards: allCards.length,
    active_cards: activeCards,
    frozen_cards: frozenCards,
    pending_cards: pendingCards,
    total_spend_this_month: thisMonthSpend,
    total_spend_last_month: lastMonthSpend,
    spend_growth: Math.round(spendGrowth * 100) / 100,
    total_transactions: (transactions || []).length,
    pending_receipts: pendingReceipts,
    pending_approvals: pendingApprovals,
    spend_by_category: spendByCategory,
    spend_by_employee: topEmployees,
    recent_transactions: (transactions || []).slice(0, 10),
  };
}

// =============================================
// HELPER
// =============================================

function getBusinessId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const businessId = localStorage.getItem('plusBusinessId');
  if (!businessId) {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Use businessId if available, otherwise use user ID as business ID
        const id = user.businessId || user.id;
        if (id) {
          localStorage.setItem('plusBusinessId', id);
          return id;
        }
      } catch {}
    }
    console.warn('No business ID found in localStorage. Card operations may not work correctly.');
    return '';
  }
  return businessId;
}

function getStaffId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const staffId = localStorage.getItem('plusStaffId');
  return staffId || 'unknown';
}

// Wrapper to handle empty businessId gracefully
async function withBusinessId<T>(fn: (businessId: string) => Promise<T>, defaultValue: T): Promise<T> {
  const businessId = getBusinessId();
  if (!businessId) {
    console.warn('No business ID available - returning empty result');
    return defaultValue;
  }
  return fn(businessId);
}

// =============================================
// FACADE EXPORT
// =============================================

export const cardService = {
  // Cards
  getCards: (filters?: CardFilters) => withBusinessId((bid) => getCards(bid, filters), []),
  getCard,
  issueCard: (dto: IssueCardDto) => {
    const businessId = getBusinessId();
    if (!businessId) throw new Error('Business ID required to issue card');
    return issueCard(businessId, dto);
  },
  updateCard,
  freezeCard,
  unfreezeCard,
  cancelCard,
  deleteCard,

  // Transactions
  getTransactions: (filters?: TransactionFilters) => withBusinessId((bid) => getTransactions(bid, filters), []),
  getTransaction,
  updateTransaction,
  approveTransaction: (txId: string) => approveTransaction(txId, getStaffId()),
  declineTransaction,

  // Policies
  getPolicies: () => withBusinessId(getPolicies, []),
  getPolicy,
  createPolicy: (dto: CreatePolicyDto) => {
    const businessId = getBusinessId();
    if (!businessId) throw new Error('Business ID required to create policy');
    return createPolicy(businessId, dto);
  },
  updatePolicy,
  deletePolicy,

  // Dashboard
  getDashboard: () => withBusinessId(getCardDashboard, {
    total_cards: 0,
    active_cards: 0,
    frozen_cards: 0,
    total_spent: 0,
    this_month_spent: 0,
    pending_transactions: 0,
    recent_transactions: [],
    spending_by_category: [],
    cards_by_status: [],
  }),
};

/**
 * BNPL (Buy Now Pay Later) Service
 *
 * Handles installment loan creation, payments, and tracking
 */

import { supabase } from '@/lib/supabase';

export interface BnplLoan {
  id: string;
  userId: string;
  cardId?: string;
  transactionId?: string;
  principalAmount: number;
  totalAmount: number;
  interestAmount: number;
  interestRate: number;
  currency: string;
  numInstallments: number;
  installmentAmount: number;
  installmentsPaid: number;
  amountPaid: number;
  amountRemaining: number;
  status: 'ACTIVE' | 'PAID_OFF' | 'OVERDUE' | 'DEFAULTED' | 'CANCELLED';
  nextPaymentDate?: string;
  lastPaymentDate?: string;
  merchantName?: string;
  description?: string;
  startedAt: string;
  dueDate: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BnplPayment {
  id: string;
  loanId: string;
  userId: string;
  amount: number;
  currency: string;
  installmentNumber: number;
  dueDate: string;
  paidDate?: string;
  status: 'SCHEDULED' | 'PAID' | 'OVERDUE' | 'MISSED';
  transactionId?: string;
  autoDebitEnabled: boolean;
  createdAt: string;
}

export interface BnplSummary {
  userId: string;
  activeLoans: number;
  overdueLoans: number;
  totalOutstanding: number;
  lifetimeBorrowed: number;
  totalRepaid: number;
}

export interface CreateBnplLoanRequest {
  cardId?: string;
  amount: number;
  numInstallments: number;
  interestRate?: number;
  merchantName?: string;
  description?: string;
  currency?: string;
}

// Map database row to BnplLoan
const mapBnplLoan = (row: any): BnplLoan => ({
  id: row.id,
  userId: row.user_id,
  cardId: row.card_id,
  transactionId: row.transaction_id,
  principalAmount: parseFloat(row.principal_amount) || 0,
  totalAmount: parseFloat(row.total_amount) || 0,
  interestAmount: parseFloat(row.interest_amount) || 0,
  interestRate: parseFloat(row.interest_rate) || 0,
  currency: row.currency || 'SLE',
  numInstallments: parseInt(row.num_installments) || 3,
  installmentAmount: parseFloat(row.installment_amount) || 0,
  installmentsPaid: parseInt(row.installments_paid) || 0,
  amountPaid: parseFloat(row.amount_paid) || 0,
  amountRemaining: parseFloat(row.amount_remaining) || 0,
  status: row.status || 'ACTIVE',
  nextPaymentDate: row.next_payment_date,
  lastPaymentDate: row.last_payment_date,
  merchantName: row.merchant_name,
  description: row.description,
  startedAt: row.started_at,
  dueDate: row.due_date,
  completedAt: row.completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Map database row to BnplPayment
const mapBnplPayment = (row: any): BnplPayment => ({
  id: row.id,
  loanId: row.loan_id,
  userId: row.user_id,
  amount: parseFloat(row.amount) || 0,
  currency: row.currency || 'SLE',
  installmentNumber: parseInt(row.installment_number) || 1,
  dueDate: row.due_date,
  paidDate: row.paid_date,
  status: row.status || 'SCHEDULED',
  transactionId: row.transaction_id,
  autoDebitEnabled: row.auto_debit_enabled ?? true,
  createdAt: row.created_at,
});

export const bnplService = {
  /**
   * Get user's BNPL summary
   */
  async getSummary(userId: string): Promise<BnplSummary> {
    // First try the view
    const { data, error } = await supabase
      .from('user_bnpl_summary')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      // Calculate directly
      return this.calculateSummary(userId);
    }

    return {
      userId: data.user_id,
      activeLoans: parseInt(data.active_loans) || 0,
      overdueLoans: parseInt(data.overdue_loans) || 0,
      totalOutstanding: parseFloat(data.total_outstanding) || 0,
      lifetimeBorrowed: parseFloat(data.lifetime_borrowed) || 0,
      totalRepaid: parseFloat(data.total_repaid) || 0,
    };
  },

  /**
   * Calculate summary directly from loans table
   */
  async calculateSummary(userId: string): Promise<BnplSummary> {
    const { data: loans } = await supabase
      .from('bnpl_loans')
      .select('status, amount_remaining, total_amount, amount_paid')
      .eq('user_id', userId);

    let activeLoans = 0;
    let overdueLoans = 0;
    let totalOutstanding = 0;
    let lifetimeBorrowed = 0;
    let totalRepaid = 0;

    for (const loan of loans || []) {
      lifetimeBorrowed += parseFloat(loan.total_amount) || 0;
      totalRepaid += parseFloat(loan.amount_paid) || 0;

      if (loan.status === 'ACTIVE') {
        activeLoans++;
        totalOutstanding += parseFloat(loan.amount_remaining) || 0;
      } else if (loan.status === 'OVERDUE') {
        overdueLoans++;
        totalOutstanding += parseFloat(loan.amount_remaining) || 0;
      }
    }

    return {
      userId,
      activeLoans,
      overdueLoans,
      totalOutstanding,
      lifetimeBorrowed,
      totalRepaid,
    };
  },

  /**
   * Get user's BNPL loans
   */
  async getLoans(
    userId: string,
    options?: { status?: BnplLoan['status']; limit?: number }
  ): Promise<BnplLoan[]> {
    let query = supabase
      .from('bnpl_loans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching BNPL loans:', error);
      return [];
    }

    return (data || []).map(mapBnplLoan);
  },

  /**
   * Get a single loan with payments
   */
  async getLoan(loanId: string): Promise<BnplLoan | null> {
    const { data, error } = await supabase
      .from('bnpl_loans')
      .select('*')
      .eq('id', loanId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapBnplLoan(data);
  },

  /**
   * Get payments for a loan
   */
  async getLoanPayments(loanId: string): Promise<BnplPayment[]> {
    const { data, error } = await supabase
      .from('bnpl_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('installment_number', { ascending: true });

    if (error) {
      console.error('Error fetching BNPL payments:', error);
      return [];
    }

    return (data || []).map(mapBnplPayment);
  },

  /**
   * Get next due payment for user
   */
  async getNextPayment(userId: string): Promise<BnplPayment | null> {
    const { data } = await supabase
      .from('bnpl_payments')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['SCHEDULED', 'OVERDUE'])
      .order('due_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    return data ? mapBnplPayment(data) : null;
  },

  /**
   * Create a new BNPL loan
   */
  async createLoan(
    userId: string,
    request: CreateBnplLoanRequest
  ): Promise<{ success: boolean; loanId?: string; error?: string }> {
    // Try RPC function first
    const { data, error } = await supabase.rpc('create_bnpl_loan', {
      p_user_id: userId,
      p_card_id: request.cardId || null,
      p_amount: request.amount,
      p_num_installments: request.numInstallments,
      p_interest_rate: request.interestRate || 0,
      p_merchant_name: request.merchantName || null,
      p_description: request.description || null,
      p_currency: request.currency || 'SLE',
    });

    if (error) {
      // Fallback to manual creation
      if (error.message.includes('does not exist')) {
        return this.createLoanManually(userId, request);
      }
      return { success: false, error: error.message };
    }

    return { success: true, loanId: data };
  },

  /**
   * Manual loan creation fallback
   */
  async createLoanManually(
    userId: string,
    request: CreateBnplLoanRequest
  ): Promise<{ success: boolean; loanId?: string; error?: string }> {
    const interestAmount = Math.round(request.amount * ((request.interestRate || 0) / 100) * 100) / 100;
    const totalAmount = request.amount + interestAmount;
    const installmentAmount = Math.round((totalAmount / request.numInstallments) * 100) / 100;

    // Calculate due date
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + request.numInstallments);

    // Calculate next payment date
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    const { data: loan, error } = await supabase
      .from('bnpl_loans')
      .insert({
        user_id: userId,
        card_id: request.cardId,
        principal_amount: request.amount,
        total_amount: totalAmount,
        interest_amount: interestAmount,
        interest_rate: request.interestRate || 0,
        currency: request.currency || 'SLE',
        num_installments: request.numInstallments,
        installment_amount: installmentAmount,
        amount_remaining: totalAmount,
        status: 'ACTIVE',
        next_payment_date: nextPaymentDate.toISOString().split('T')[0],
        merchant_name: request.merchantName,
        description: request.description,
        due_date: dueDate.toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Create scheduled payments
    for (let i = 1; i <= request.numInstallments; i++) {
      const paymentDate = new Date();
      paymentDate.setMonth(paymentDate.getMonth() + i);

      await supabase.from('bnpl_payments').insert({
        loan_id: loan.id,
        user_id: userId,
        amount: installmentAmount,
        currency: request.currency || 'SLE',
        installment_number: i,
        due_date: paymentDate.toISOString().split('T')[0],
        status: 'SCHEDULED',
      });
    }

    return { success: true, loanId: loan.id };
  },

  /**
   * Make a payment on a loan
   */
  async makePayment(
    paymentId: string,
    walletId: string
  ): Promise<{ success: boolean; message: string; loanStatus?: string }> {
    // Try RPC function
    const { data, error } = await supabase.rpc('make_bnpl_payment', {
      p_payment_id: paymentId,
      p_wallet_id: walletId,
    });

    if (error) {
      // Fallback to manual payment
      if (error.message.includes('does not exist')) {
        return this.makePaymentManually(paymentId, walletId);
      }
      return { success: false, message: error.message };
    }

    const result = data?.[0] || data;
    return {
      success: result?.success || false,
      message: result?.message || 'Unknown error',
      loanStatus: result?.loan_status,
    };
  },

  /**
   * Manual payment fallback
   */
  async makePaymentManually(
    paymentId: string,
    walletId: string
  ): Promise<{ success: boolean; message: string; loanStatus?: string }> {
    // Get payment
    const { data: payment } = await supabase
      .from('bnpl_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!payment) {
      return { success: false, message: 'Payment not found' };
    }

    if (payment.status === 'PAID') {
      return { success: false, message: 'Payment already made' };
    }

    // Get wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', walletId)
      .single();

    if (!wallet || parseFloat(wallet.balance) < parseFloat(payment.amount)) {
      return { success: false, message: 'Insufficient wallet balance' };
    }

    // Get loan
    const { data: loan } = await supabase
      .from('bnpl_loans')
      .select('*')
      .eq('id', payment.loan_id)
      .single();

    if (!loan) {
      return { success: false, message: 'Loan not found' };
    }

    // Deduct from wallet
    await supabase
      .from('wallets')
      .update({
        balance: parseFloat(wallet.balance) - parseFloat(payment.amount),
        updated_at: new Date().toISOString(),
      })
      .eq('id', walletId);

    // Create transaction
    const { data: txn } = await supabase
      .from('transactions')
      .insert({
        wallet_id: walletId,
        type: 'BNPL_PAYMENT',
        amount: -parseFloat(payment.amount),
        status: 'COMPLETED',
        description: `BNPL installment payment #${payment.installment_number}`,
        metadata: { loan_id: loan.id, payment_id: paymentId },
      })
      .select('id')
      .single();

    // Update payment
    await supabase
      .from('bnpl_payments')
      .update({
        status: 'PAID',
        paid_date: new Date().toISOString().split('T')[0],
        transaction_id: txn?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    // Calculate new loan state
    const newPaid = parseInt(loan.installments_paid) + 1;
    const newAmountPaid = parseFloat(loan.amount_paid) + parseFloat(payment.amount);
    const newRemaining = parseFloat(loan.amount_remaining) - parseFloat(payment.amount);
    const newStatus = newPaid >= parseInt(loan.num_installments) ? 'PAID_OFF' : 'ACTIVE';

    // Get next payment date
    let nextPaymentDate = null;
    if (newStatus === 'ACTIVE') {
      const { data: nextPayment } = await supabase
        .from('bnpl_payments')
        .select('due_date')
        .eq('loan_id', loan.id)
        .eq('status', 'SCHEDULED')
        .order('installment_number')
        .limit(1)
        .maybeSingle();
      nextPaymentDate = nextPayment?.due_date;
    }

    // Update loan
    await supabase
      .from('bnpl_loans')
      .update({
        installments_paid: newPaid,
        amount_paid: newAmountPaid,
        amount_remaining: newRemaining,
        status: newStatus,
        next_payment_date: nextPaymentDate,
        last_payment_date: new Date().toISOString().split('T')[0],
        completed_at: newStatus === 'PAID_OFF' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loan.id);

    return {
      success: true,
      message: 'Payment successful',
      loanStatus: newStatus,
    };
  },

  /**
   * Check if user is eligible for BNPL
   */
  async checkEligibility(
    userId: string,
    amount: number
  ): Promise<{ eligible: boolean; maxAmount: number; reason?: string }> {
    // Get user's active loans
    const summary = await this.getSummary(userId);

    // Check for overdue loans
    if (summary.overdueLoans > 0) {
      return {
        eligible: false,
        maxAmount: 0,
        reason: 'You have overdue BNPL payments. Please clear them first.',
      };
    }

    // Check max active loans (limit to 3)
    if (summary.activeLoans >= 3) {
      return {
        eligible: false,
        maxAmount: 0,
        reason: 'Maximum number of active BNPL loans reached (3).',
      };
    }

    // Check total outstanding (limit to Le 50,000)
    const maxOutstanding = 50000;
    const availableCredit = maxOutstanding - summary.totalOutstanding;

    if (availableCredit <= 0) {
      return {
        eligible: false,
        maxAmount: 0,
        reason: 'You have reached your BNPL credit limit.',
      };
    }

    if (amount > availableCredit) {
      return {
        eligible: false,
        maxAmount: availableCredit,
        reason: `Amount exceeds your available BNPL credit of Le ${availableCredit.toLocaleString()}.`,
      };
    }

    return {
      eligible: true,
      maxAmount: availableCredit,
    };
  },

  /**
   * Get installment options for an amount
   */
  getInstallmentOptions(amount: number): Array<{
    installments: number;
    interestRate: number;
    installmentAmount: number;
    totalAmount: number;
    totalInterest: number;
  }> {
    const options = [
      { installments: 2, interestRate: 0 },
      { installments: 3, interestRate: 0 },
      { installments: 4, interestRate: 5 },
      { installments: 6, interestRate: 8 },
      { installments: 12, interestRate: 12 },
    ];

    return options.map(opt => {
      const totalInterest = Math.round(amount * (opt.interestRate / 100) * 100) / 100;
      const totalAmount = amount + totalInterest;
      const installmentAmount = Math.round((totalAmount / opt.installments) * 100) / 100;

      return {
        installments: opt.installments,
        interestRate: opt.interestRate,
        installmentAmount,
        totalAmount,
        totalInterest,
      };
    });
  },
};

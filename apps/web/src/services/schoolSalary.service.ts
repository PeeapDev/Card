/**
 * School Salary Service
 * Handles staff salary payments via Peeap
 */

import { supabaseAdmin } from '@/lib/supabase';
import { schoolChatService } from './schoolChat.service';

export interface StaffMember {
  id: string;
  staffId: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  department: string;
  peeapUserId?: string;
  peeapWalletId?: string;
  bankName?: string;
  accountNumber?: string;
  hasPeeapAccount: boolean;
}

export interface SalaryPaymentRequest {
  staffId: string;
  staffName: string;
  schoolId: string;
  schoolName: string;
  schoolWalletId: string;
  recipientWalletId?: string;
  recipientUserId?: string;
  month: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentMethod: 'wallet' | 'bank' | 'mobile_money';
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  mobileMoneyDetails?: {
    provider: 'orange' | 'africell';
    phoneNumber: string;
  };
}

export interface SalaryPaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

class SchoolSalaryService {
  /**
   * Get staff members with their Peeap wallet status
   */
  async getStaffWithWalletStatus(schoolId: string, staffList: any[]): Promise<StaffMember[]> {
    // Get staff emails/phones to look up Peeap accounts
    const emails = staffList.map(s => s.email).filter(Boolean);
    const phones = staffList.map(s => s.phone).filter(Boolean);

    // Lookup Peeap users by email or phone
    let userMap = new Map<string, { userId: string; walletId: string }>();

    if (emails.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, email, phone')
        .in('email', emails);

      if (users) {
        for (const user of users) {
          // Get user's wallet
          const { data: wallet } = await supabaseAdmin
            .from('wallets')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'ACTIVE')
            .single();

          if (wallet) {
            userMap.set(user.email, { userId: user.id, walletId: wallet.id });
            if (user.phone) {
              userMap.set(user.phone, { userId: user.id, walletId: wallet.id });
            }
          }
        }
      }
    }

    // Map staff with Peeap info
    return staffList.map((staff: any) => {
      const peeapInfo = userMap.get(staff.email) || userMap.get(staff.phone);

      return {
        id: staff.id,
        staffId: staff.staff_id || staff.employee_id || `STF${staff.id}`,
        name: staff.name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim(),
        email: staff.email,
        phone: staff.phone,
        role: staff.role || staff.position || 'Staff',
        department: staff.department || 'General',
        peeapUserId: peeapInfo?.userId,
        peeapWalletId: peeapInfo?.walletId,
        bankName: staff.bank_name,
        accountNumber: staff.account_number,
        hasPeeapAccount: !!peeapInfo,
      };
    });
  }

  /**
   * Pay salary to a staff member
   */
  async paySalary(request: SalaryPaymentRequest): Promise<SalaryPaymentResult> {
    try {
      // Generate transaction ID
      const transactionId = `SAL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Get school wallet balance
      const { data: schoolWallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('id, balance, status')
        .eq('id', request.schoolWalletId)
        .single();

      if (walletError || !schoolWallet) {
        return { success: false, error: 'School wallet not found' };
      }

      if (schoolWallet.status !== 'ACTIVE') {
        return { success: false, error: 'School wallet is not active' };
      }

      const schoolBalance = parseFloat(schoolWallet.balance) || 0;
      if (schoolBalance < request.netSalary) {
        return { success: false, error: `Insufficient school wallet balance. Available: SLE ${schoolBalance.toLocaleString()}` };
      }

      // Process based on payment method
      if (request.paymentMethod === 'wallet' && request.recipientWalletId) {
        // Direct wallet transfer
        return await this.processWalletPayment(request, transactionId, schoolBalance);
      } else if (request.paymentMethod === 'bank' && request.bankDetails) {
        // Bank transfer (via Peeap gateway)
        return await this.processBankPayment(request, transactionId, schoolBalance);
      } else if (request.paymentMethod === 'mobile_money' && request.mobileMoneyDetails) {
        // Mobile money transfer
        return await this.processMobileMoneyPayment(request, transactionId, schoolBalance);
      } else {
        // No valid payment method - still record the payment but mark for manual processing
        return await this.recordManualPayment(request, transactionId, schoolBalance);
      }
    } catch (err) {
      console.error('Salary payment error:', err);
      return { success: false, error: 'Payment processing failed' };
    }
  }

  /**
   * Process wallet-to-wallet payment
   */
  private async processWalletPayment(
    request: SalaryPaymentRequest,
    transactionId: string,
    schoolBalance: number
  ): Promise<SalaryPaymentResult> {
    // Deduct from school wallet
    const newSchoolBalance = schoolBalance - request.netSalary;
    const { error: deductError } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newSchoolBalance, updated_at: new Date().toISOString() })
      .eq('id', request.schoolWalletId);

    if (deductError) {
      console.error('Error deducting from school wallet:', deductError);
      return { success: false, error: 'Failed to process payment' };
    }

    // Credit staff wallet
    const { data: staffWallet } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('id', request.recipientWalletId)
      .single();

    const staffBalance = parseFloat(staffWallet?.balance) || 0;
    await supabaseAdmin
      .from('wallets')
      .update({ balance: staffBalance + request.netSalary, updated_at: new Date().toISOString() })
      .eq('id', request.recipientWalletId);

    // Record transactions
    await this.recordTransactions(request, transactionId, 'wallet');

    // Send salary slip via chat
    if (request.recipientUserId) {
      await schoolChatService.sendSalarySlip({
        recipientUserId: request.recipientUserId,
        staffId: request.staffId,
        staffName: request.staffName,
        schoolId: request.schoolId,
        schoolName: request.schoolName,
        month: request.month,
        baseSalary: request.baseSalary,
        allowances: request.allowances,
        deductions: request.deductions,
        netSalary: request.netSalary,
        transactionId,
        paidAt: new Date().toISOString(),
      });
    }

    return { success: true, transactionId };
  }

  /**
   * Process bank transfer payment
   */
  private async processBankPayment(
    request: SalaryPaymentRequest,
    transactionId: string,
    schoolBalance: number
  ): Promise<SalaryPaymentResult> {
    // For bank transfers, we deduct from school wallet and queue the bank transfer
    const newSchoolBalance = schoolBalance - request.netSalary;
    const { error: deductError } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newSchoolBalance, updated_at: new Date().toISOString() })
      .eq('id', request.schoolWalletId);

    if (deductError) {
      return { success: false, error: 'Failed to process payment' };
    }

    // Record the pending bank transfer
    await supabaseAdmin
      .from('pending_transfers')
      .insert({
        type: 'bank_transfer',
        transaction_id: transactionId,
        amount: request.netSalary,
        currency: 'SLE',
        recipient_name: request.staffName,
        bank_name: request.bankDetails!.bankName,
        account_number: request.bankDetails!.accountNumber,
        account_name: request.bankDetails!.accountName,
        description: `Salary payment - ${request.month}`,
        status: 'pending',
        metadata: {
          staff_id: request.staffId,
          school_id: request.schoolId,
          month: request.month,
        },
      });

    // Record transactions
    await this.recordTransactions(request, transactionId, 'bank');

    return { success: true, transactionId };
  }

  /**
   * Process mobile money payment
   */
  private async processMobileMoneyPayment(
    request: SalaryPaymentRequest,
    transactionId: string,
    schoolBalance: number
  ): Promise<SalaryPaymentResult> {
    // Deduct from school wallet
    const newSchoolBalance = schoolBalance - request.netSalary;
    const { error: deductError } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newSchoolBalance, updated_at: new Date().toISOString() })
      .eq('id', request.schoolWalletId);

    if (deductError) {
      return { success: false, error: 'Failed to process payment' };
    }

    // Record mobile money transfer (would integrate with mobile money APIs)
    await supabaseAdmin
      .from('pending_transfers')
      .insert({
        type: 'mobile_money',
        transaction_id: transactionId,
        amount: request.netSalary,
        currency: 'SLE',
        recipient_name: request.staffName,
        mobile_provider: request.mobileMoneyDetails!.provider,
        phone_number: request.mobileMoneyDetails!.phoneNumber,
        description: `Salary payment - ${request.month}`,
        status: 'pending',
        metadata: {
          staff_id: request.staffId,
          school_id: request.schoolId,
          month: request.month,
        },
      });

    // Record transactions
    await this.recordTransactions(request, transactionId, 'mobile_money');

    return { success: true, transactionId };
  }

  /**
   * Record payment that needs manual processing
   */
  private async recordManualPayment(
    request: SalaryPaymentRequest,
    transactionId: string,
    schoolBalance: number
  ): Promise<SalaryPaymentResult> {
    // Still deduct from school wallet
    const newSchoolBalance = schoolBalance - request.netSalary;
    await supabaseAdmin
      .from('wallets')
      .update({ balance: newSchoolBalance, updated_at: new Date().toISOString() })
      .eq('id', request.schoolWalletId);

    // Record for manual processing
    await supabaseAdmin
      .from('pending_transfers')
      .insert({
        type: 'manual',
        transaction_id: transactionId,
        amount: request.netSalary,
        currency: 'SLE',
        recipient_name: request.staffName,
        description: `Salary payment - ${request.month} (manual processing required)`,
        status: 'pending_manual',
        metadata: {
          staff_id: request.staffId,
          school_id: request.schoolId,
          month: request.month,
          payment_method: request.paymentMethod,
        },
      });

    await this.recordTransactions(request, transactionId, 'manual');

    return { success: true, transactionId };
  }

  /**
   * Record transactions in the database
   */
  private async recordTransactions(
    request: SalaryPaymentRequest,
    transactionId: string,
    paymentMethod: string
  ): Promise<void> {
    // School debit transaction
    await supabaseAdmin.from('transactions').insert({
      wallet_id: request.schoolWalletId,
      type: 'SALARY_PAYMENT',
      amount: -request.netSalary,
      currency: 'SLE',
      status: 'COMPLETED',
      description: `Salary payment to ${request.staffName} - ${request.month}`,
      reference: transactionId,
      merchant_name: 'Payroll',
      metadata: {
        staff_id: request.staffId,
        staff_name: request.staffName,
        month: request.month,
        base_salary: request.baseSalary,
        allowances: request.allowances,
        deductions: request.deductions,
        net_salary: request.netSalary,
        payment_method: paymentMethod,
      },
    });

    // Staff credit transaction (if wallet payment)
    if (request.recipientWalletId) {
      await supabaseAdmin.from('transactions').insert({
        wallet_id: request.recipientWalletId,
        type: 'SALARY_RECEIVED',
        amount: request.netSalary,
        currency: 'SLE',
        status: 'COMPLETED',
        description: `Salary from ${request.schoolName} - ${request.month}`,
        reference: transactionId,
        merchant_name: request.schoolName,
        metadata: {
          school_id: request.schoolId,
          month: request.month,
        },
      });
    }

    // Record in salary payments table
    await supabaseAdmin.from('school_salary_payments').insert({
      school_id: request.schoolId,
      staff_id: request.staffId,
      staff_name: request.staffName,
      month: request.month,
      base_salary: request.baseSalary,
      allowances: request.allowances,
      deductions: request.deductions,
      net_salary: request.netSalary,
      payment_method: paymentMethod,
      transaction_id: transactionId,
      school_wallet_id: request.schoolWalletId,
      recipient_wallet_id: request.recipientWalletId,
      recipient_user_id: request.recipientUserId,
      status: 'completed',
      paid_at: new Date().toISOString(),
    });
  }

  /**
   * Pay multiple staff members (bulk payroll)
   */
  async processBulkPayroll(
    payments: SalaryPaymentRequest[]
  ): Promise<{ successful: number; failed: number; results: SalaryPaymentResult[] }> {
    const results: SalaryPaymentResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const payment of payments) {
      const result = await this.paySalary(payment);
      results.push(result);
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return { successful, failed, results };
  }

  /**
   * Get salary payment history for a school
   */
  async getSalaryHistory(schoolId: string, month?: string): Promise<any[]> {
    let query = supabaseAdmin
      .from('school_salary_payments')
      .select('*')
      .eq('school_id', schoolId)
      .order('paid_at', { ascending: false });

    if (month) {
      query = query.eq('month', month);
    }

    const { data, error } = await query.limit(500);

    if (error) {
      console.error('Error fetching salary history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get payment summary for a month
   */
  async getPaymentSummary(schoolId: string, month: string): Promise<{
    totalPaid: number;
    totalAmount: number;
    paidCount: number;
    pendingCount: number;
  }> {
    const { data } = await supabaseAdmin
      .from('school_salary_payments')
      .select('net_salary, status')
      .eq('school_id', schoolId)
      .eq('month', month);

    if (!data) {
      return { totalPaid: 0, totalAmount: 0, paidCount: 0, pendingCount: 0 };
    }

    const paidPayments = data.filter(p => p.status === 'completed');
    const pendingPayments = data.filter(p => p.status !== 'completed');

    return {
      totalPaid: paidPayments.reduce((sum, p) => sum + p.net_salary, 0),
      totalAmount: data.reduce((sum, p) => sum + p.net_salary, 0),
      paidCount: paidPayments.length,
      pendingCount: pendingPayments.length,
    };
  }
}

export const schoolSalaryService = new SchoolSalaryService();

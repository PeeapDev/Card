/**
 * Statement Service
 *
 * Generates transaction statements and merchant reports
 * Supports PDF download and online viewing
 */

import { supabaseAdmin } from '@/lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Statement period
export interface StatementPeriod {
  startDate: Date;
  endDate: Date;
  month: number;
  year: number;
}

// Transaction with fee breakdown
export interface StatementTransaction {
  id: string;
  date: string;
  reference: string;
  type: string;
  description: string;
  grossAmount: number;
  gatewayFee: number;
  platformFee: number;
  netAmount: number;
  status: string;
  paymentMethod?: string;
  customerName?: string;
}

// Summary totals
export interface StatementSummary {
  grossAmount: number;
  gatewayFees: number;
  platformFees: number;
  totalFees: number;
  netAmount: number;
  transactionCount: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
}

// Chart data
export interface DailyRevenue {
  date: string;
  gross: number;
  net: number;
  fees: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

// Full statement data
export interface MerchantStatementData {
  period: StatementPeriod;
  merchant: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  summary: StatementSummary;
  transactions: StatementTransaction[];
  dailyRevenue: DailyRevenue[];
  paymentMethods: PaymentMethodBreakdown[];
  generatedAt: string;
}

export interface UserStatementData {
  period: StatementPeriod;
  user: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  walletId: string;
  summary: {
    deposits: number;
    withdrawals: number;
    payments: number;
    received: number;
    fees: number;
    netChange: number;
    openingBalance: number;
    closingBalance: number;
  };
  transactions: StatementTransaction[];
  generatedAt: string;
}

/**
 * Get the date range for a specific month
 */
export function getMonthPeriod(month: number, year: number): StatementPeriod {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month
  endDate.setHours(23, 59, 59, 999);

  return {
    startDate,
    endDate,
    month,
    year,
  };
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'SLE'): string {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get month name
 */
export function getMonthName(month: number): string {
  return new Date(2024, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
}

/**
 * Generate merchant statement data
 */
export async function generateMerchantStatement(
  merchantId: string,
  month: number,
  year: number
): Promise<MerchantStatementData> {
  const period = getMonthPeriod(month, year);

  // Get merchant info
  const { data: merchant, error: merchantError } = await supabaseAdmin
    .from('merchant_businesses')
    .select('id, name, merchant_id, users!inner(email, phone, first_name, last_name)')
    .eq('id', merchantId)
    .single();

  if (merchantError || !merchant) {
    throw new Error('Merchant not found');
  }

  // Get all transactions for this merchant in the period
  // Look for transactions where metadata contains merchantId or merchant_id
  const { data: transactions, error: txError } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .gte('created_at', period.startDate.toISOString())
    .lte('created_at', period.endDate.toISOString())
    .or(`metadata->merchantId.eq.${merchantId},metadata->merchant_id.eq.${merchantId}`)
    .order('created_at', { ascending: false });

  if (txError) {
    console.error('Error fetching transactions:', txError);
  }

  const txList = transactions || [];

  // Map transactions to statement format
  const statementTransactions: StatementTransaction[] = txList.map((tx: any) => {
    const metadata = tx.metadata || {};
    const grossAmount = Math.abs(parseFloat(metadata.grossAmount?.toString() || tx.amount?.toString() || '0'));
    const gatewayFee = parseFloat(metadata.monimeFee?.toString() || tx.fee?.toString() || '0');
    const platformFee = parseFloat(metadata.peeapFee?.toString() || '0');
    const netAmount = parseFloat(metadata.netAmount?.toString() || (grossAmount - gatewayFee - platformFee).toString());

    return {
      id: tx.id,
      date: tx.created_at,
      reference: tx.reference || tx.external_id || tx.id.slice(0, 8),
      type: tx.type || 'PAYMENT',
      description: tx.description || 'Payment received',
      grossAmount,
      gatewayFee,
      platformFee,
      netAmount,
      status: tx.status || 'COMPLETED',
      paymentMethod: metadata.paymentMethod || 'mobile_money',
      customerName: metadata.payerName || metadata.customerName,
    };
  });

  // Calculate summary
  const summary: StatementSummary = {
    grossAmount: statementTransactions.reduce((sum, tx) => sum + tx.grossAmount, 0),
    gatewayFees: statementTransactions.reduce((sum, tx) => sum + tx.gatewayFee, 0),
    platformFees: statementTransactions.reduce((sum, tx) => sum + tx.platformFee, 0),
    totalFees: 0,
    netAmount: statementTransactions.reduce((sum, tx) => sum + tx.netAmount, 0),
    transactionCount: statementTransactions.length,
    completedCount: statementTransactions.filter(tx => tx.status === 'COMPLETED').length,
    pendingCount: statementTransactions.filter(tx => tx.status === 'PENDING').length,
    failedCount: statementTransactions.filter(tx => tx.status === 'FAILED').length,
  };
  summary.totalFees = summary.gatewayFees + summary.platformFees;

  // Calculate daily revenue
  const dailyMap = new Map<string, DailyRevenue>();
  statementTransactions.forEach(tx => {
    const dateKey = tx.date.slice(0, 10);
    const existing = dailyMap.get(dateKey) || { date: dateKey, gross: 0, net: 0, fees: 0 };
    existing.gross += tx.grossAmount;
    existing.net += tx.netAmount;
    existing.fees += tx.gatewayFee + tx.platformFee;
    dailyMap.set(dateKey, existing);
  });
  const dailyRevenue = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Calculate payment method breakdown
  const methodMap = new Map<string, { count: number; amount: number }>();
  statementTransactions.forEach(tx => {
    const method = tx.paymentMethod || 'other';
    const existing = methodMap.get(method) || { count: 0, amount: 0 };
    existing.count += 1;
    existing.amount += tx.grossAmount;
    methodMap.set(method, existing);
  });
  const totalAmount = summary.grossAmount || 1;
  const paymentMethods: PaymentMethodBreakdown[] = Array.from(methodMap.entries()).map(([method, data]) => ({
    method,
    count: data.count,
    amount: data.amount,
    percentage: (data.amount / totalAmount) * 100,
  }));

  const userData = merchant.users as any;

  return {
    period,
    merchant: {
      id: merchant.id,
      name: merchant.name,
      email: userData?.email,
      phone: userData?.phone,
    },
    summary,
    transactions: statementTransactions,
    dailyRevenue,
    paymentMethods,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate user transaction statement
 */
export async function generateUserStatement(
  userId: string,
  walletId: string,
  month: number,
  year: number
): Promise<UserStatementData> {
  const period = getMonthPeriod(month, year);

  // Get user info
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, phone, first_name, last_name')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new Error('User not found');
  }

  // Get transactions for the period
  const { data: transactions, error: txError } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('wallet_id', walletId)
    .gte('created_at', period.startDate.toISOString())
    .lte('created_at', period.endDate.toISOString())
    .order('created_at', { ascending: false });

  if (txError) {
    console.error('Error fetching transactions:', txError);
  }

  const txList = transactions || [];

  // Map transactions
  const statementTransactions: StatementTransaction[] = txList.map((tx: any) => {
    const metadata = tx.metadata || {};
    const amount = parseFloat(tx.amount?.toString() || '0');
    const fee = parseFloat(metadata.monimeFee?.toString() || tx.fee?.toString() || '0');

    return {
      id: tx.id,
      date: tx.created_at,
      reference: tx.reference || tx.external_id || tx.id.slice(0, 8),
      type: tx.type || 'TRANSACTION',
      description: tx.description || tx.type || 'Transaction',
      grossAmount: Math.abs(amount),
      gatewayFee: fee,
      platformFee: 0,
      netAmount: amount, // For user statements, show actual amount (can be negative)
      status: tx.status || 'COMPLETED',
      paymentMethod: metadata.paymentMethod,
    };
  });

  // Calculate summary by type
  let deposits = 0, withdrawals = 0, payments = 0, received = 0, fees = 0;
  txList.forEach((tx: any) => {
    const amount = parseFloat(tx.amount?.toString() || '0');
    const fee = parseFloat(tx.fee?.toString() || '0');
    fees += fee;

    switch (tx.type) {
      case 'DEPOSIT':
        deposits += amount;
        break;
      case 'WITHDRAWAL':
        withdrawals += Math.abs(amount);
        break;
      case 'PAYMENT_SENT':
      case 'TRANSFER_OUT':
        payments += Math.abs(amount);
        break;
      case 'PAYMENT_RECEIVED':
      case 'TRANSFER_IN':
        received += amount;
        break;
    }
  });

  // Get opening balance (balance at start of period)
  // This would require looking at the first transaction before the period or the wallet creation
  const openingBalance = 0; // Simplified - would need historical data
  const closingBalance = openingBalance + deposits + received - withdrawals - payments - fees;

  return {
    period,
    user: {
      id: user.id,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
      email: user.email,
      phone: user.phone,
    },
    walletId,
    summary: {
      deposits,
      withdrawals,
      payments,
      received,
      fees,
      netChange: deposits + received - withdrawals - payments - fees,
      openingBalance,
      closingBalance,
    },
    transactions: statementTransactions,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate PDF from HTML element
 */
export async function generatePDF(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Element not found');
  }

  // Wait for any charts/images to render
  await new Promise(resolve => setTimeout(resolve, 500));

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20; // 10mm margins
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 10;

  // Add first page
  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Add additional pages if needed
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}

/**
 * Get list of available statement months for a merchant
 */
export async function getAvailableStatementMonths(merchantId: string): Promise<{ month: number; year: number }[]> {
  // Get the earliest transaction date
  const { data: earliest } = await supabaseAdmin
    .from('transactions')
    .select('created_at')
    .or(`metadata->merchantId.eq.${merchantId},metadata->merchant_id.eq.${merchantId}`)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!earliest) {
    return [];
  }

  const startDate = new Date(earliest.created_at);
  const now = new Date();
  const months: { month: number; year: number }[] = [];

  let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (current <= now) {
    months.push({
      month: current.getMonth() + 1,
      year: current.getFullYear(),
    });
    current.setMonth(current.getMonth() + 1);
  }

  return months.reverse(); // Most recent first
}

export const statementService = {
  getMonthPeriod,
  formatCurrency,
  formatDate,
  getMonthName,
  generateMerchantStatement,
  generateUserStatement,
  generatePDF,
  getAvailableStatementMonths,
};

export default statementService;

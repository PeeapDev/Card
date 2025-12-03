/**
 * BNPL (Buy Now Pay Later) Page
 *
 * Displays user's installment loans, payment schedules, and loan management
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { bnplService, BnplLoan, BnplPayment, BnplSummary } from '@/services/bnpl.service';
import { supabase } from '@/lib/supabase';

type TabType = 'overview' | 'loans' | 'payments';

export function BnplPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Data states
  const [summary, setSummary] = useState<BnplSummary | null>(null);
  const [loans, setLoans] = useState<BnplLoan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<BnplLoan | null>(null);
  const [loanPayments, setLoanPayments] = useState<BnplPayment[]>([]);
  const [nextPayment, setNextPayment] = useState<BnplPayment | null>(null);
  const [wallet, setWallet] = useState<{ id: string; balance: number } | null>(null);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentToMake, setPaymentToMake] = useState<BnplPayment | null>(null);
  const [paymentResult, setPaymentResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load data
  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  // Load loan payments when selected
  useEffect(() => {
    if (selectedLoan) {
      loadLoanPayments(selectedLoan.id);
    }
  }, [selectedLoan?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [summaryData, loansData, nextPaymentData, walletData] = await Promise.all([
        bnplService.getSummary(user.id),
        bnplService.getLoans(user.id),
        bnplService.getNextPayment(user.id),
        loadWallet(),
      ]);

      setSummary(summaryData);
      setLoans(loansData);
      setNextPayment(nextPaymentData);
      setWallet(walletData);
    } catch (error) {
      console.error('Error loading BNPL data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWallet = async () => {
    if (!user?.id) return null;

    const { data } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    return data ? { id: data.id, balance: parseFloat(data.balance) || 0 } : null;
  };

  const loadLoanPayments = async (loanId: string) => {
    const payments = await bnplService.getLoanPayments(loanId);
    setLoanPayments(payments);
  };

  const handleMakePayment = async () => {
    if (!paymentToMake || !wallet?.id) return;

    setPayingId(paymentToMake.id);
    setPaymentResult(null);

    try {
      const result = await bnplService.makePayment(paymentToMake.id, wallet.id);
      setPaymentResult(result);

      if (result.success) {
        // Reload data
        await loadData();
        if (selectedLoan) {
          await loadLoanPayments(selectedLoan.id);
        }

        // Close modal after delay
        setTimeout(() => {
          setShowPaymentModal(false);
          setPaymentToMake(null);
          setPaymentResult(null);
        }, 2000);
      }
    } catch (error: any) {
      setPaymentResult({ success: false, message: error.message });
    } finally {
      setPayingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-blue-100 text-blue-800',
      PAID_OFF: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
      DEFAULTED: 'bg-red-200 text-red-900',
      CANCELLED: 'bg-gray-100 text-gray-600',
      SCHEDULED: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      MISSED: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getProgressPercentage = (loan: BnplLoan) => {
    return Math.round((loan.installmentsPaid / loan.numInstallments) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Buy Now Pay Later</h1>
            <p className="text-gray-600 mt-1">Split payments into easy installments</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-white mb-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-purple-200 text-sm font-medium">Outstanding Balance</p>
            <p className="text-4xl font-bold mt-1">{formatCurrency(summary?.totalOutstanding || 0)}</p>
            {(summary?.overdueLoans || 0) > 0 && (
              <p className="text-red-300 text-sm mt-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {summary?.overdueLoans} overdue payment(s)
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-purple-200 text-xs">Active Loans</p>
            <p className="text-2xl font-bold">{summary?.activeLoans || 0}</p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-purple-500/30">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-lg font-bold">{formatCurrency(summary?.lifetimeBorrowed || 0)}</p>
              <p className="text-purple-200 text-xs">Total Borrowed</p>
            </div>
            <div>
              <p className="text-lg font-bold">{formatCurrency(summary?.totalRepaid || 0)}</p>
              <p className="text-purple-200 text-xs">Total Repaid</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Payment Due */}
      {nextPayment && (
        <div className={`rounded-xl p-4 mb-6 ${
          getDaysUntilDue(nextPayment.dueDate) < 0
            ? 'bg-red-50 border border-red-200'
            : getDaysUntilDue(nextPayment.dueDate) <= 7
            ? 'bg-yellow-50 border border-yellow-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                getDaysUntilDue(nextPayment.dueDate) < 0
                  ? 'bg-red-100'
                  : getDaysUntilDue(nextPayment.dueDate) <= 7
                  ? 'bg-yellow-100'
                  : 'bg-blue-100'
              }`}>
                <svg className={`w-5 h-5 ${
                  getDaysUntilDue(nextPayment.dueDate) < 0
                    ? 'text-red-600'
                    : getDaysUntilDue(nextPayment.dueDate) <= 7
                    ? 'text-yellow-600'
                    : 'text-blue-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {getDaysUntilDue(nextPayment.dueDate) < 0
                    ? 'Payment Overdue!'
                    : `Next payment due in ${getDaysUntilDue(nextPayment.dueDate)} days`}
                </p>
                <p className="text-sm text-gray-600">
                  {formatCurrency(nextPayment.amount)} - Due {formatDate(nextPayment.dueDate)}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setPaymentToMake(nextPayment);
                setShowPaymentModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Pay Now
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        {(['overview', 'loans', 'payments'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSelectedLoan(null);
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'loans' && 'My Loans'}
            {tab === 'payments' && 'Payments'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* How it works */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">How BNPL Works</h3>
            <div className="grid gap-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold text-sm">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Shop & Choose BNPL</p>
                  <p className="text-sm text-gray-500">Select BNPL at checkout for eligible purchases</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold text-sm">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Split Into Installments</p>
                  <p className="text-sm text-gray-500">Pay in 2-12 monthly installments. 0% interest for 2-3 months!</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold text-sm">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Auto-Pay Monthly</p>
                  <p className="text-sm text-gray-500">Payments are auto-debited from your wallet each month</p>
                </div>
              </div>
            </div>
          </div>

          {/* Installment Options */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Installment Plans</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { months: 2, rate: '0%', label: 'Pay in 2' },
                { months: 3, rate: '0%', label: 'Pay in 3' },
                { months: 4, rate: '5%', label: 'Pay in 4' },
                { months: 6, rate: '8%', label: 'Pay in 6' },
                { months: 12, rate: '12%', label: 'Pay in 12' },
              ].map((plan) => (
                <div key={plan.months} className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-gray-900">{plan.months}</p>
                  <p className="text-xs text-gray-500">months</p>
                  <p className={`text-xs font-medium mt-1 ${plan.rate === '0%' ? 'text-green-600' : 'text-gray-600'}`}>
                    {plan.rate} interest
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Loans */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Loans</h3>
              <button
                onClick={() => setActiveTab('loans')}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {loans.slice(0, 3).map((loan) => (
                <div
                  key={loan.id}
                  onClick={() => {
                    setSelectedLoan(loan);
                    setActiveTab('loans');
                  }}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {loan.merchantName || loan.description || 'BNPL Purchase'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {loan.installmentsPaid}/{loan.numInstallments} payments
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(loan.amountRemaining)}</p>
                    {getStatusBadge(loan.status)}
                  </div>
                </div>
              ))}
              {loans.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p>No BNPL loans yet</p>
                  <p className="text-sm mt-1">Use BNPL at checkout to split payments</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'loans' && (
        <div className="space-y-4">
          {selectedLoan ? (
            // Loan Detail View
            <div className="space-y-4">
              <button
                onClick={() => setSelectedLoan(null)}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Loans
              </button>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedLoan.merchantName || selectedLoan.description || 'BNPL Purchase'}
                    </h3>
                    <p className="text-sm text-gray-500">Started {formatDate(selectedLoan.startedAt)}</p>
                  </div>
                  {getStatusBadge(selectedLoan.status)}
                </div>

                {/* Progress */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium text-gray-900">
                      {selectedLoan.installmentsPaid}/{selectedLoan.numInstallments} payments
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${getProgressPercentage(selectedLoan)}%` }}
                    />
                  </div>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Principal</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedLoan.principalAmount)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Interest ({selectedLoan.interestRate}%)</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedLoan.interestAmount)}</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <p className="text-xs text-indigo-600">Amount Paid</p>
                    <p className="text-lg font-semibold text-indigo-600">{formatCurrency(selectedLoan.amountPaid)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedLoan.amountRemaining)}</p>
                  </div>
                </div>

                {/* Payment Schedule */}
                <h4 className="font-medium text-gray-900 mb-3">Payment Schedule</h4>
                <div className="space-y-2">
                  {loanPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`p-3 rounded-lg flex items-center justify-between ${
                        payment.status === 'PAID'
                          ? 'bg-green-50'
                          : payment.status === 'OVERDUE'
                          ? 'bg-red-50'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          payment.status === 'PAID'
                            ? 'bg-green-100 text-green-600'
                            : payment.status === 'OVERDUE'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {payment.status === 'PAID' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="text-sm font-medium">{payment.installmentNumber}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Installment #{payment.installmentNumber}</p>
                          <p className="text-sm text-gray-500">
                            {payment.status === 'PAID'
                              ? `Paid ${formatDate(payment.paidDate!)}`
                              : `Due ${formatDate(payment.dueDate)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
                        {payment.status !== 'PAID' && (
                          <button
                            onClick={() => {
                              setPaymentToMake(payment);
                              setShowPaymentModal(true);
                            }}
                            className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Loans List
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="divide-y divide-gray-100">
                {loans.map((loan) => (
                  <div
                    key={loan.id}
                    onClick={() => setSelectedLoan(loan)}
                    className="p-4 cursor-pointer hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {loan.merchantName || loan.description || 'BNPL Purchase'}
                        </p>
                        <p className="text-sm text-gray-500">{formatDate(loan.startedAt)}</p>
                      </div>
                      {getStatusBadge(loan.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${getProgressPercentage(loan)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {loan.installmentsPaid}/{loan.numInstallments} payments
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(loan.amountRemaining)}</p>
                        <p className="text-xs text-gray-500">remaining</p>
                      </div>
                    </div>
                  </div>
                ))}
                {loans.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <p>No BNPL loans</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">All Scheduled Payments</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {loans.flatMap((loan) =>
                loan.status === 'ACTIVE' || loan.status === 'OVERDUE'
                  ? [loan]
                  : []
              ).length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No upcoming payments</p>
                </div>
              ) : (
                loans
                  .filter((loan) => loan.status === 'ACTIVE' || loan.status === 'OVERDUE')
                  .map((loan) => (
                    <div key={loan.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {loan.merchantName || loan.description || 'BNPL Purchase'}
                          </p>
                          <p className="text-sm text-gray-500">
                            Next: {formatCurrency(loan.installmentAmount)} on{' '}
                            {loan.nextPaymentDate ? formatDate(loan.nextPaymentDate) : 'N/A'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(loan.status)}
                          <button
                            onClick={() => setSelectedLoan(loan)}
                            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentToMake && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Make Payment</h3>

            {paymentResult ? (
              <div className={`p-4 rounded-lg mb-4 ${paymentResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className={`flex items-center gap-2 ${paymentResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {paymentResult.success ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className="font-medium">{paymentResult.message}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Installment #{paymentToMake.installmentNumber}</span>
                    <span className="text-xl font-bold text-gray-900">{formatCurrency(paymentToMake.amount)}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Due: {formatDate(paymentToMake.dueDate)}</p>
                </div>

                <div className="p-4 bg-indigo-50 rounded-lg mb-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-indigo-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <div className="text-sm">
                      <p className="font-medium text-indigo-800">Payment from wallet</p>
                      <p className="text-indigo-600">
                        Available: {wallet ? formatCurrency(wallet.balance) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {wallet && wallet.balance < paymentToMake.amount && (
                  <div className="p-3 bg-red-50 rounded-lg mb-4 text-sm text-red-700">
                    Insufficient wallet balance. Please top up your wallet first.
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentToMake(null);
                  setPaymentResult(null);
                }}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                {paymentResult ? 'Close' : 'Cancel'}
              </button>
              {!paymentResult && (
                <button
                  onClick={handleMakePayment}
                  disabled={payingId !== null || !wallet || wallet.balance < paymentToMake.amount}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium text-white ${
                    payingId !== null || !wallet || wallet.balance < paymentToMake.amount
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {payingId ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Pay Now'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

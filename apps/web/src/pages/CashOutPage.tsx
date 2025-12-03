/**
 * Cash-Out Page
 *
 * Allows users to withdraw cash at agent locations
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cashoutService, AgentLocation, CashOutRequest } from '@/services/cashout.service';
import { supabase } from '@/lib/supabase';

type Step = 'amount' | 'agents' | 'confirm' | 'code' | 'history';

export function CashOutPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('amount');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data states
  const [wallet, setWallet] = useState<{ id: string; balance: number; currency: string } | null>(null);
  const [agents, setAgents] = useState<AgentLocation[]>([]);
  const [activeRequest, setActiveRequest] = useState<CashOutRequest | null>(null);
  const [history, setHistory] = useState<CashOutRequest[]>([]);

  // Form states
  const [amount, setAmount] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<AgentLocation | null>(null);
  const [newRequest, setNewRequest] = useState<CashOutRequest | null>(null);
  const [requestCode, setRequestCode] = useState<string>('');

  // Error state
  const [error, setError] = useState<string | null>(null);

  const limits = cashoutService.getLimits();

  // Load initial data
  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [walletData, activeReq, historyData] = await Promise.all([
        loadWallet(),
        cashoutService.getActiveRequest(user.id),
        cashoutService.getUserRequests(user.id, 20),
      ]);

      setWallet(walletData);
      setActiveRequest(activeReq);
      setHistory(historyData);

      // If there's an active request, show the code
      if (activeReq) {
        setNewRequest(activeReq);
        setRequestCode(activeReq.code);
        setStep('code');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWallet = async () => {
    if (!user?.id) return null;

    const { data } = await supabase
      .from('wallets')
      .select('id, balance, currency')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    return data ? {
      id: data.id,
      balance: parseFloat(data.balance) || 0,
      currency: data.currency || 'SLE',
    } : null;
  };

  const loadAgents = async () => {
    setLoading(true);
    try {
      const agentList = await cashoutService.getNearbyAgents({ limit: 20 });
      setAgents(agentList);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAmountSubmit = () => {
    setError(null);

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum < limits.minAmount) {
      setError(`Minimum withdrawal is Le ${limits.minAmount.toLocaleString()}`);
      return;
    }

    if (amountNum > limits.maxAmount) {
      setError(`Maximum withdrawal is Le ${limits.maxAmount.toLocaleString()}`);
      return;
    }

    const fee = cashoutService.calculateFee(amountNum);
    const total = amountNum + fee;

    if (!wallet || wallet.balance < total) {
      setError('Insufficient balance');
      return;
    }

    loadAgents();
    setStep('agents');
  };

  const handleAgentSelect = (agent: AgentLocation | null) => {
    setSelectedAgent(agent);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!user?.id || !wallet?.id) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await cashoutService.createRequest({
        userId: user.id,
        amount: parseFloat(amount),
        walletId: wallet.id,
        agentLocationId: selectedAgent?.id,
      });

      if (result.success && result.request) {
        setNewRequest(result.request);
        setRequestCode(result.code || result.request.code);
        setStep('code');
        // Reload wallet balance
        const newWallet = await loadWallet();
        setWallet(newWallet);
      } else {
        setError(result.error || 'Failed to create cash-out request');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!user?.id || !newRequest) return;

    setSubmitting(true);
    try {
      const result = await cashoutService.cancelRequest(newRequest.id, user.id, 'User cancelled');

      if (result.success) {
        setNewRequest(null);
        setRequestCode('');
        setAmount('');
        setSelectedAgent(null);
        setStep('amount');
        // Reload data
        await loadData();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const mins = Math.floor(diff / 60000);
    return `${mins} min${mins !== 1 ? 's' : ''} remaining`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-600',
      EXPIRED: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  const fee = amount ? cashoutService.calculateFee(parseFloat(amount) || 0) : 0;
  const total = (parseFloat(amount) || 0) + fee;

  if (loading && !wallet) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => {
            if (step === 'history') {
              setStep(newRequest ? 'code' : 'amount');
            } else if (step === 'agents') {
              setStep('amount');
            } else if (step === 'confirm') {
              setStep('agents');
            } else {
              navigate(-1);
            }
          }}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cash Out</h1>
            <p className="text-gray-600 mt-1">Withdraw cash at agent locations</p>
          </div>
          <button
            onClick={() => setStep('history')}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            History
          </button>
        </div>
      </div>

      {/* Balance Card */}
      {step !== 'history' && step !== 'code' && (
        <div className="bg-gradient-to-br from-green-600 to-teal-700 rounded-2xl p-6 text-white mb-6 shadow-lg">
          <p className="text-green-100 text-sm">Available Balance</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(wallet?.balance || 0)}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Step: Amount Entry */}
      {step === 'amount' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Enter Amount</h3>

          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-2">Amount to withdraw</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Le</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min={limits.minAmount}
                max={limits.maxAmount}
                className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-lg text-xl font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Min: {formatCurrency(limits.minAmount)} • Max: {formatCurrency(limits.maxAmount)}
            </p>
          </div>

          {/* Quick amounts */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[100, 500, 1000, 5000].map((quickAmount) => (
              <button
                key={quickAmount}
                onClick={() => setAmount(quickAmount.toString())}
                className={`py-2 rounded-lg text-sm font-medium ${
                  amount === quickAmount.toString()
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {quickAmount.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Fee breakdown */}
          {parseFloat(amount) > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount</span>
                <span className="font-medium">{formatCurrency(parseFloat(amount))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Fee (1%)</span>
                <span className="font-medium">{formatCurrency(fee)}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between">
                <span className="font-medium text-gray-900">Total</span>
                <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleAmountSubmit}
            disabled={!amount || parseFloat(amount) <= 0}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white ${
              !amount || parseFloat(amount) <= 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            Continue
          </button>
        </div>
      )}

      {/* Step: Select Agent */}
      {step === 'agents' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Select Agent (Optional)</h3>
            <p className="text-sm text-gray-500 mt-1">Choose a nearby agent or skip to get your code</p>
          </div>

          <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
            {/* Skip option */}
            <button
              onClick={() => handleAgentSelect(null)}
              className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-indigo-600">Skip - Use any agent</p>
                <p className="text-sm text-gray-500">Get a code valid at all agents</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleAgentSelect(agent)}
                disabled={!agent.cashAvailable}
                className={`w-full p-4 text-left hover:bg-gray-50 ${!agent.cashAvailable ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{agent.businessName}</p>
                      {agent.verified && (
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{agent.address}</p>
                    {agent.city && (
                      <p className="text-xs text-gray-400">{agent.city}</p>
                    )}
                    {agent.distance !== undefined && (
                      <p className="text-xs text-indigo-600 mt-1">{agent.distance} km away</p>
                    )}
                  </div>
                  <div className="text-right">
                    {agent.cashAvailable ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Cash Available</span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">No Cash</span>
                    )}
                    {agent.rating > 0 && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center justify-end gap-1">
                        <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {agent.rating.toFixed(1)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {agents.length === 0 && !loading && (
              <div className="p-8 text-center text-gray-500">
                <p>No agents available</p>
                <button
                  onClick={() => handleAgentSelect(null)}
                  className="mt-2 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Skip and get code
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Confirm Cash-Out</h3>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Amount to receive</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(parseFloat(amount))}</p>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Fee</span>
              <span className="font-medium">{formatCurrency(fee)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total deducted</span>
              <span className="font-semibold">{formatCurrency(total)}</span>
            </div>

            {selectedAgent && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Agent</p>
                <p className="font-medium text-gray-900">{selectedAgent.businessName}</p>
                <p className="text-sm text-gray-500">{selectedAgent.address}</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Important</p>
                <p>You'll receive a 6-digit code valid for 30 minutes. Show this code to the agent to collect your cash.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('agents')}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-white ${
                submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {submitting ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* Step: Show Code */}
      {step === 'code' && newRequest && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cash-Out Code Ready</h3>
            <p className="text-sm text-gray-500 mb-6">Show this code to any Peeap agent</p>

            {/* Code display */}
            <div className="bg-gray-900 rounded-xl p-6 mb-4">
              <p className="text-4xl font-mono font-bold text-white tracking-widest">
                {requestCode}
              </p>
            </div>

            {/* Amount */}
            <div className="mb-4">
              <p className="text-sm text-gray-500">Collect</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(newRequest.amount)}</p>
            </div>

            {/* Timer */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              new Date(newRequest.codeExpiresAt) > new Date()
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {getTimeRemaining(newRequest.codeExpiresAt)}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h4 className="font-medium text-gray-900 mb-3">How to collect</h4>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                <span>Visit any Peeap agent location</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                <span>Show your 6-digit code to the agent</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                <span>Collect your {formatCurrency(newRequest.amount)} cash</span>
              </li>
            </ol>
          </div>

          {/* Cancel button */}
          {newRequest.status === 'PENDING' && (
            <button
              onClick={handleCancel}
              disabled={submitting}
              className="w-full py-3 px-4 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50"
            >
              {submitting ? 'Cancelling...' : 'Cancel Request'}
            </button>
          )}
        </div>
      )}

      {/* Step: History */}
      {step === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Withdrawal History</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {history.map((request) => (
              <div key={request.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{formatCurrency(request.amount)}</p>
                    <p className="text-sm text-gray-500">{formatDate(request.requestedAt)}</p>
                    {request.agentLocation && (
                      <p className="text-xs text-gray-400 mt-1">{request.agentLocation.businessName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {getStatusBadge(request.status)}
                    <p className="text-xs text-gray-500 mt-1">Fee: {formatCurrency(request.fee)}</p>
                  </div>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <p>No withdrawal history</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

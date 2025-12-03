import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Banknote,
  QrCode,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  User,
  Phone,
  Search,
} from 'lucide-react';
import { MotionCard } from '@/components/ui/Card';
import { AgentLayout } from '@/components/layout/AgentLayout';
import { useAuth } from '@/context/AuthContext';
import { agentService, CashOutRequest, AgentDashboardStats } from '@/services/agent.service';
import { currencyService, Currency } from '@/services/currency.service';

export function AgentCashOutPage() {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<CashOutRequest[]>([]);
  const [completedRequests, setCompletedRequests] = useState<CashOutRequest[]>([]);
  const [stats, setStats] = useState<AgentDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  // Verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifiedRequest, setVerifiedRequest] = useState<CashOutRequest | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const currencySymbol = defaultCurrency?.symbol || 'Le ';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [pending, completed, dashStats] = await Promise.all([
        agentService.getPendingCashOuts(user.id, 50),
        agentService.getCashOutHistory(user.id, 20),
        agentService.getDashboardStats(user.id),
      ]);
      setPendingRequests(pending);
      setCompletedRequests(completed);
      setStats(dashStats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      setVerifyMessage({ type: 'error', text: 'Please enter a valid 6-digit code' });
      return;
    }

    setVerifyLoading(true);
    setVerifyMessage(null);

    try {
      const result = await agentService.verifyCashOutCode(verifyCode);
      if (result.success && result.request) {
        setVerifiedRequest(result.request);
        setVerifyMessage({ type: 'success', text: 'Code verified! Confirm to dispense cash.' });
      } else {
        setVerifyMessage({ type: 'error', text: result.error || 'Invalid or expired code' });
      }
    } catch {
      setVerifyMessage({ type: 'error', text: 'Failed to verify code' });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCompleteCashOut = async () => {
    if (!user?.id || !verifiedRequest) return;

    setVerifyLoading(true);
    try {
      const result = await agentService.completeCashOut({
        requestId: verifiedRequest.id,
        agentId: user.id,
        code: verifyCode,
      });

      if (result.success) {
        setVerifyMessage({ type: 'success', text: result.message });
        fetchData();
        setTimeout(() => {
          resetModal();
        }, 2000);
      } else {
        setVerifyMessage({ type: 'error', text: result.message });
      }
    } catch {
      setVerifyMessage({ type: 'error', text: 'Failed to complete cash-out' });
    } finally {
      setVerifyLoading(false);
    }
  };

  const resetModal = () => {
    setShowVerifyModal(false);
    setVerifyCode('');
    setVerifiedRequest(null);
    setVerifyMessage(null);
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m left`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m left`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AgentLayout>
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cash Out Processing</h1>
            <p className="text-gray-500 dark:text-gray-400">Verify codes and dispense cash to customers</p>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={fetchData}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowVerifyModal(true)}
              className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Verify Code
            </motion.button>
          </div>
        </div>

        {/* Float Balance Warning */}
        {stats && stats.floatBalance < 1000 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">Low Float Balance</p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Your float balance is {formatCurrency(stats.floatBalance)}. Top up to continue processing cash-outs.
              </p>
            </div>
          </motion.div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MotionCard className="p-4" delay={0.1}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingRequests.length}</p>
              </div>
            </div>
          </MotionCard>

          <MotionCard className="p-4" delay={0.15}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Today's Processed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.todayTransactions || 0}</p>
              </div>
            </div>
          </MotionCard>

          <MotionCard className="p-4" delay={0.2}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Banknote className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Float Balance</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(stats?.floatBalance || 0)}</p>
              </div>
            </div>
          </MotionCard>

          <MotionCard className="p-4" delay={0.25}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Banknote className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Today's Cash Out</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats?.todayCashOut || 0)}</p>
              </div>
            </div>
          </MotionCard>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Pending Requests ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'completed'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Requests List */}
        <MotionCard className="overflow-hidden" delay={0.3}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : activeTab === 'pending' ? (
            pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No pending cash-out requests</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Requests will appear here when customers request cash</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {pendingRequests.map((request) => (
                  <motion.div
                    key={request.id}
                    whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                    className="p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                        <User className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{request.customerName}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          {request.customerPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {request.customerPhone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeRemaining(request.codeExpiresAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(request.amount)}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Code: <span className="font-mono font-bold text-orange-600">{request.code}</span>
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setVerifyCode(request.code);
                          setShowVerifyModal(true);
                        }}
                        disabled={(stats?.floatBalance || 0) < request.amount}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Banknote className="w-4 h-4" />
                        Process
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            completedRequests.length === 0 ? (
              <div className="text-center py-12">
                <Banknote className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No completed requests yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {completedRequests.map((request) => (
                  <div key={request.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${
                        request.status === 'COMPLETED'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {request.status === 'COMPLETED' ? (
                          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{request.customerName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(request.requestedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(request.amount)}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        request.status === 'COMPLETED'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </MotionCard>
      </motion.div>

      {/* Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Cash Out Verification</h3>

            {!verifiedRequest ? (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Enter the 6-digit code from the customer
                </p>

                <div className="mb-4">
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-3xl font-mono text-center tracking-widest"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                {verifyMessage && (
                  <div className={`p-3 rounded-lg mb-4 ${
                    verifyMessage.type === 'success'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                    {verifyMessage.text}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={resetModal}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyCode}
                    disabled={verifyLoading || verifyCode.length !== 6}
                    className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {verifyLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Verify Code
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-3">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Code Verified</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Customer</span>
                      <span className="font-medium text-gray-900 dark:text-white">{verifiedRequest.customerName}</span>
                    </div>
                    {verifiedRequest.customerPhone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Phone</span>
                        <span className="text-gray-900 dark:text-white">{verifiedRequest.customerPhone}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-green-200 dark:border-green-800 pt-2">
                      <span className="text-gray-600 dark:text-gray-400">Amount to Dispense</span>
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(verifiedRequest.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Your Commission</span>
                      <span className="font-bold text-purple-600">{formatCurrency(verifiedRequest.fee * 0.5)}</span>
                    </div>
                  </div>
                </div>

                {(stats?.floatBalance || 0) < verifiedRequest.amount && (
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Insufficient float balance. You need {formatCurrency(verifiedRequest.amount - (stats?.floatBalance || 0))} more.
                  </div>
                )}

                {verifyMessage && verifyMessage.type === 'error' && (
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg mb-4">
                    {verifyMessage.text}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={resetModal}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompleteCashOut}
                    disabled={verifyLoading || (stats?.floatBalance || 0) < verifiedRequest.amount}
                    className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {verifyLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Banknote className="w-5 h-5" />
                        Dispense Cash
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AgentLayout>
  );
}

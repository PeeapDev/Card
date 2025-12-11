/**
 * Shop Detail Page
 * Dashboard for a specific business/shop showing stats and quick actions
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Store,
  ArrowLeft,
  ArrowLeftRight,
  AlertTriangle,
  Settings,
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  X,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Calendar,
  Activity,
  Eye,
  Code2,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { businessService, MerchantBusiness } from '@/services/business.service';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customer_email?: string;
  description?: string;
  reference?: string;
  type?: string;
  metadata?: {
    payerName?: string;
    payerId?: string;
    paymentMethod?: string;
    merchantName?: string;
    checkoutSessionId?: string;
  };
  created_at: string;
}

interface Dispute {
  id: string;
  transaction_id: string;
  reason: string;
  status: string;
  amount: number;
  created_at: string;
}

export function ShopDetailPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<MerchantBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentDisputes, setRecentDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    successRate: 0,
    pendingDisputes: 0,
  });

  useEffect(() => {
    if (businessId) {
      fetchBusinessData();
    }
  }, [businessId]);

  const fetchBusinessData = async () => {
    if (!businessId) return;

    try {
      // Fetch business details
      const { data: businessData, error: businessError } = await supabase
        .from('merchant_businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (businessError) throw businessError;
      setBusiness(businessData);

      // Fetch the merchant's wallet to get transactions
      const { data: merchantWallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', businessData.merchant_id)
        .eq('wallet_type', 'primary')
        .single();

      // Fetch recent transactions for this merchant's wallet
      const { data: transactionData } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', merchantWallet?.id || '')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentTransactions(transactionData || []);

      // Fetch disputes for this business
      const { data: disputeData } = await supabase
        .from('disputes')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentDisputes(disputeData || []);

      // Calculate stats from merchant wallet transactions
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('amount, status')
        .eq('wallet_id', merchantWallet?.id || '');

      if (allTransactions) {
        const total = allTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const successful = allTransactions.filter(t => t.status === 'completed' || t.status === 'success').length;
        setStats({
          totalRevenue: total,
          totalTransactions: allTransactions.length,
          successRate: allTransactions.length > 0 ? (successful / allTransactions.length) * 100 : 0,
          pendingDisputes: (disputeData || []).filter(d => d.status === 'pending' || d.status === 'open').length,
        });
      }
    } catch (error) {
      console.error('Error fetching business data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending' },
      APPROVED: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Approved' },
      REJECTED: { color: 'bg-red-100 text-red-700', icon: <X className="w-3.5 h-3.5" />, label: 'Rejected' },
      SUSPENDED: { color: 'bg-gray-100 text-gray-700', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Suspended' },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Using imported formatCurrency from @/lib/currency

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </MerchantLayout>
    );
  }

  if (!business) {
    return (
      <MerchantLayout>
        <div className="text-center py-12">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Business not found</h2>
          <p className="text-gray-500 mb-4">The business you're looking for doesn't exist or you don't have access.</p>
          <button
            onClick={() => navigate('/merchant/shops')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to My Shops
          </button>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate('/merchant/shops')}
              className="p-2 hover:bg-gray-100 rounded-lg mt-1"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-start gap-4">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={business.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                  <Store className="w-8 h-8 text-green-600" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
                  {getStatusBadge(business.approval_status)}
                  <span className={`text-xs px-2 py-0.5 rounded ${business.is_live_mode ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {business.is_live_mode ? 'Live' : 'Test Mode'}
                  </span>
                </div>
                <p className="text-gray-500">{business.description || 'No description'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{business.id}</code>
                  <button
                    onClick={() => copyToClipboard(business.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Copy Business ID"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/merchant/developer/${business.id}`}
              className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 flex items-center gap-2 text-sm font-medium"
            >
              <Code2 className="w-4 h-4" />
              Developer
            </Link>
            <Link
              to={`/merchant/shops/${business.id}/settings`}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm font-medium"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ArrowLeftRight className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Transactions</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalTransactions}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Success Rate</p>
                <p className="text-xl font-bold text-gray-900">{stats.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Disputes</p>
                <p className="text-xl font-bold text-gray-900">{stats.pendingDisputes}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to={`/merchant/shops/${business.id}/transactions`}
            className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <div className="p-3 bg-blue-100 rounded-lg">
              <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Transactions</h3>
              <p className="text-sm text-gray-500">View all payments</p>
            </div>
          </Link>
          <Link
            to={`/merchant/shops/${business.id}/disputes`}
            className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Disputes</h3>
              <p className="text-sm text-gray-500">Manage customer issues</p>
            </div>
          </Link>
          <Link
            to={`/merchant/developer/${business.id}`}
            className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Code2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Integration</h3>
              <p className="text-sm text-gray-500">API keys & SDK</p>
            </div>
          </Link>
          <Link
            to={`/merchant/shops/${business.id}/settings`}
            className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <div className="p-3 bg-gray-100 rounded-lg">
              <Settings className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Settings</h3>
              <p className="text-sm text-gray-500">Configure shop</p>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <Card className="p-0">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
              <Link
                to={`/merchant/shops/${business.id}/transactions`}
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                View All
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentTransactions.length === 0 ? (
                <div className="p-8 text-center">
                  <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No transactions yet</p>
                </div>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {tx.metadata?.payerName || tx.customer_email || 'Customer'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatDate(tx.created_at)}</span>
                        {tx.metadata?.paymentMethod && (
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded">
                            {tx.metadata.paymentMethod === 'scan_to_pay' ? 'QR Scan' :
                             tx.metadata.paymentMethod === 'mobile_money' ? 'Mobile Money' :
                             tx.metadata.paymentMethod === 'peeap_card' ? 'Card' :
                             tx.metadata.paymentMethod}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(tx.amount)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        tx.status === 'completed' || tx.status === 'success' || tx.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-700'
                          : tx.status === 'pending' || tx.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Recent Disputes */}
          <Card className="p-0">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recent Disputes</h2>
              <Link
                to={`/merchant/shops/${business.id}/disputes`}
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                View All
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentDisputes.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-8 h-8 text-green-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No disputes</p>
                </div>
              ) : (
                recentDisputes.map((dispute) => (
                  <div key={dispute.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{dispute.reason || 'Dispute'}</p>
                      <p className="text-xs text-gray-500">{formatDate(dispute.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(dispute.amount)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        dispute.status === 'resolved' || dispute.status === 'closed'
                          ? 'bg-green-100 text-green-700'
                          : dispute.status === 'pending' || dispute.status === 'open'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {dispute.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </MerchantLayout>
  );
}

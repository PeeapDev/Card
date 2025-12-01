import { useState, useEffect } from 'react';
import {
  DollarSign,
  Percent,
  CreditCard,
  ArrowLeftRight,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Edit,
  Plus,
  Users,
  Building2,
  Zap,
  User,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';

interface FeeConfig {
  id: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed' | 'tiered';
  value: number;
  minFee?: number;
  maxFee?: number;
  category: 'transfer' | 'card' | 'merchant' | 'withdrawal' | 'p2p';
  userType: 'standard' | 'agent' | 'agent_plus' | 'merchant' | 'all_users';
  isActive: boolean;
}

interface TransferLimit {
  id: string;
  userType: string;
  dailyLimit: number;
  monthlyLimit: number;
  perTransactionLimit: number;
  minAmount: number;
}

export function FeesPage() {
  const [activeTab, setActiveTab] = useState<'p2p' | 'transfer' | 'card' | 'merchant' | 'limits'>('p2p');
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [fees, setFees] = useState<FeeConfig[]>([
    // P2P Transfer Fees by User Type
    { id: 'p2p-standard', name: 'Standard User P2P Fee', description: 'Fee for regular user transfers', type: 'percentage', value: 1.0, minFee: 0.10, maxFee: 10.00, category: 'p2p', userType: 'standard', isActive: true },
    { id: 'p2p-agent', name: 'Agent P2P Fee', description: 'Fee for agent transfers', type: 'percentage', value: 0.5, minFee: 0.10, maxFee: 5.00, category: 'p2p', userType: 'agent', isActive: true },
    { id: 'p2p-agent-plus', name: 'Agent+ P2P Fee', description: 'Fee for Agent+ transfers (unlimited volume)', type: 'percentage', value: 0.2, minFee: 0.05, maxFee: 5.00, category: 'p2p', userType: 'agent_plus', isActive: true },
    { id: 'p2p-merchant', name: 'Merchant P2P Fee', description: 'Fee for merchant transfers', type: 'percentage', value: 0.5, minFee: 0.10, maxFee: 25.00, category: 'p2p', userType: 'merchant', isActive: true },

    // Transfer Fees
    { id: 'transfer-internal', name: 'Internal Transfer Fee', description: 'Fee for transfers between users', type: 'percentage', value: 0.5, minFee: 0, maxFee: 100, category: 'transfer', userType: 'all_users', isActive: true },
    { id: 'transfer-external', name: 'External Transfer Fee', description: 'Fee for transfers to external banks', type: 'fixed', value: 2.50, category: 'transfer', userType: 'all_users', isActive: true },
    { id: 'transfer-intl', name: 'International Transfer Fee', description: 'Fee for international transfers', type: 'percentage', value: 2.5, minFee: 5, maxFee: 500, category: 'transfer', userType: 'all_users', isActive: true },

    // Card Fees
    { id: 'card-virtual', name: 'Virtual Card Creation', description: 'One-time fee for virtual card', type: 'fixed', value: 1.00, category: 'card', userType: 'all_users', isActive: true },
    { id: 'card-physical', name: 'Physical Card Creation', description: 'One-time fee for physical card', type: 'fixed', value: 10.00, category: 'card', userType: 'all_users', isActive: true },
    { id: 'card-txn', name: 'Card Transaction Fee', description: 'Per transaction fee', type: 'percentage', value: 1.5, minFee: 0.10, maxFee: 50, category: 'card', userType: 'all_users', isActive: true },
    { id: 'card-monthly', name: 'Card Monthly Maintenance', description: 'Monthly card maintenance fee', type: 'fixed', value: 1.00, category: 'card', userType: 'all_users', isActive: true },

    // Merchant Fees
    { id: 'merchant-processing', name: 'Payment Processing Fee', description: 'Fee for processing payments', type: 'percentage', value: 2.9, minFee: 0.30, category: 'merchant', userType: 'merchant', isActive: true },
    { id: 'merchant-payout', name: 'Payout Fee', description: 'Fee for merchant payouts', type: 'percentage', value: 0.25, minFee: 0.25, maxFee: 25, category: 'merchant', userType: 'merchant', isActive: true },
    { id: 'merchant-chargeback', name: 'Chargeback Fee', description: 'Fee per chargeback', type: 'fixed', value: 15.00, category: 'merchant', userType: 'merchant', isActive: true },
  ]);

  const [limits, setLimits] = useState<TransferLimit[]>([
    { id: 'limit-standard', userType: 'standard', dailyLimit: 5000, monthlyLimit: 25000, perTransactionLimit: 2500, minAmount: 1.00 },
    { id: 'limit-agent', userType: 'agent', dailyLimit: 50000, monthlyLimit: 250000, perTransactionLimit: 25000, minAmount: 0.50 },
    { id: 'limit-agent-plus', userType: 'agent_plus', dailyLimit: 1000000, monthlyLimit: 10000000, perTransactionLimit: 500000, minAmount: 0.01 },
    { id: 'limit-merchant', userType: 'merchant', dailyLimit: 100000, monthlyLimit: 1000000, perTransactionLimit: 50000, minAmount: 0.01 },
  ]);

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    setLoading(true);
    try {
      // In production, fetch from supabase
      // const { data, error } = await supabase.from('fee_configs').select('*');
      // if (error) throw error;
      // setFees(data);

      // For now, just use local state
      setLoading(false);
    } catch (error) {
      console.error('Error fetching fees:', error);
      setLoading(false);
    }
  };

  const filteredFees = fees.filter(fee => fee.category === activeTab);

  const handleSave = async () => {
    try {
      // In production, save to supabase
      // await supabase.from('fee_configs').upsert(fees);

      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving fees:', error);
    }
  };

  const updateFee = (id: string, field: keyof FeeConfig, value: any) => {
    setFees(fees.map(fee =>
      fee.id === id ? { ...fee, [field]: value } : fee
    ));
  };

  const updateLimit = (id: string, field: keyof TransferLimit, value: any) => {
    setLimits(limits.map(limit =>
      limit.id === id ? { ...limit, [field]: value } : limit
    ));
  };

  const toggleFeeStatus = (id: string) => {
    setFees(fees.map(fee =>
      fee.id === id ? { ...fee, isActive: !fee.isActive } : fee
    ));
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'standard': return <User className="w-4 h-4" />;
      case 'agent': return <Users className="w-4 h-4" />;
      case 'agent_plus': return <Zap className="w-4 h-4" />;
      case 'merchant': return <Building2 className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'standard': return 'Standard User';
      case 'agent': return 'Agent';
      case 'agent_plus': return 'Agent+';
      case 'merchant': return 'Merchant';
      case 'all_users': return 'All Users';
      default: return userType;
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'standard': return 'bg-blue-100 text-blue-700';
      case 'agent': return 'bg-purple-100 text-purple-700';
      case 'agent_plus': return 'bg-orange-100 text-orange-700';
      case 'merchant': return 'bg-green-100 text-green-700';
      case 'all_users': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fees & Pricing</h1>
            <p className="text-gray-500">Configure transaction fees, limits, and pricing for all user types</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                Changes saved
              </span>
            )}
            <button
              onClick={fetchFees}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isEditing
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Edit className="w-4 h-4" />
              {isEditing ? 'Cancel' : 'Edit Fees'}
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Fee Configuration</p>
              <p className="text-sm text-blue-700 mt-1">
                Fees are applied based on user type. Agent+ users get the lowest fees with unlimited transaction limits.
                Changes affect all new transactions immediately.
              </p>
            </div>
          </div>
        </Card>

        {/* Category Tabs */}
        <Card className="p-1">
          <div className="flex gap-1">
            {[
              { id: 'p2p', label: 'P2P Fees', icon: ArrowLeftRight },
              { id: 'transfer', label: 'Transfer Fees', icon: ArrowLeftRight },
              { id: 'card', label: 'Card Fees', icon: CreditCard },
              { id: 'merchant', label: 'Merchant Fees', icon: DollarSign },
              { id: 'limits', label: 'Transfer Limits', icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Limits Tab */}
        {activeTab === 'limits' ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Transfer Limits by User Type</h3>
            {limits.map((limit) => (
              <Card key={limit.id} className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${getUserTypeColor(limit.userType)}`}>
                    {getUserTypeIcon(limit.userType)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{getUserTypeLabel(limit.userType)}</h4>
                    <p className="text-sm text-gray-500">Transaction limits for {limit.userType} users</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Daily Limit</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={limit.dailyLimit}
                        onChange={(e) => updateLimit(limit.id, 'dailyLimit', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-xl font-bold text-gray-900">
                        ${limit.dailyLimit.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Monthly Limit</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={limit.monthlyLimit}
                        onChange={(e) => updateLimit(limit.id, 'monthlyLimit', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-xl font-bold text-gray-900">
                        ${limit.monthlyLimit.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Per Transaction</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={limit.perTransactionLimit}
                        onChange={(e) => updateLimit(limit.id, 'perTransactionLimit', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-xl font-bold text-gray-900">
                        ${limit.perTransactionLimit.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Minimum Amount</label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={limit.minAmount}
                        onChange={(e) => updateLimit(limit.id, 'minAmount', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-xl font-bold text-gray-900">
                        ${limit.minAmount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Fees List */
          <div className="space-y-4">
            {filteredFees.map((fee) => (
              <Card key={fee.id} className={`p-6 ${!fee.isActive ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${fee.isActive ? 'bg-primary-100' : 'bg-gray-100'}`}>
                      {fee.type === 'percentage' ? (
                        <Percent className={`w-5 h-5 ${fee.isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                      ) : (
                        <DollarSign className={`w-5 h-5 ${fee.isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{fee.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${getUserTypeColor(fee.userType)}`}>
                          {getUserTypeIcon(fee.userType)}
                          {getUserTypeLabel(fee.userType)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{fee.description}</p>
                      {(fee.minFee !== undefined || fee.maxFee !== undefined) && (
                        <p className="text-xs text-gray-400 mt-2">
                          {fee.minFee !== undefined && `Min Fee: $${fee.minFee.toFixed(2)}`}
                          {fee.minFee !== undefined && fee.maxFee !== undefined && ' | '}
                          {fee.maxFee !== undefined && `Max Fee: $${fee.maxFee.toFixed(2)}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={fee.value}
                          onChange={(e) => updateFee(fee.id, 'value', parseFloat(e.target.value))}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <span className="text-gray-500 text-sm">
                          {fee.type === 'percentage' ? '%' : 'USD'}
                        </span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {fee.type === 'percentage' ? `${fee.value}%` : `$${fee.value.toFixed(2)}`}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{fee.type}</p>
                      </div>
                    )}

                    <button
                      onClick={() => toggleFeeStatus(fee.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        fee.isActive
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                      title={fee.isActive ? 'Disable' : 'Enable'}
                    >
                      {fee.isActive ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <RefreshCw className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add New Fee */}
        {isEditing && activeTab !== 'limits' && (
          <button className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Fee
          </button>
        )}

        {/* Summary Card */}
        <Card className="p-6 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-4">Fee Summary by User Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-900">Standard</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">1.0%</p>
              <p className="text-xs text-gray-500">P2P Transfer Fee</p>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-gray-900">Agent</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">0.5%</p>
              <p className="text-xs text-gray-500">P2P Transfer Fee</p>
            </div>
            <div className="p-4 bg-white rounded-lg border-2 border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-gray-900">Agent+</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">0.2%</p>
              <p className="text-xs text-gray-500">P2P Transfer Fee</p>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-green-600" />
                <span className="font-medium text-gray-900">Merchant</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">0.5%</p>
              <p className="text-xs text-gray-500">P2P Transfer Fee</p>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

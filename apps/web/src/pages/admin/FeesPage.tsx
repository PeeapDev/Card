import { useState } from 'react';
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
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface FeeConfig {
  id: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed' | 'tiered';
  value: number;
  minAmount?: number;
  maxAmount?: number;
  category: 'transfer' | 'card' | 'merchant' | 'withdrawal';
  isActive: boolean;
}

export function FeesPage() {
  const [activeTab, setActiveTab] = useState<'transfer' | 'card' | 'merchant' | 'withdrawal'>('transfer');
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const [fees, setFees] = useState<FeeConfig[]>([
    // Transfer Fees
    { id: '1', name: 'Internal Transfer Fee', description: 'Fee for transfers between users', type: 'percentage', value: 0.5, minAmount: 0, maxAmount: 100, category: 'transfer', isActive: true },
    { id: '2', name: 'External Transfer Fee', description: 'Fee for transfers to external banks', type: 'fixed', value: 2.50, category: 'transfer', isActive: true },
    { id: '3', name: 'International Transfer Fee', description: 'Fee for international transfers', type: 'percentage', value: 2.5, minAmount: 5, maxAmount: 500, category: 'transfer', isActive: true },
    // Card Fees
    { id: '4', name: 'Virtual Card Creation', description: 'One-time fee for virtual card', type: 'fixed', value: 1.00, category: 'card', isActive: true },
    { id: '5', name: 'Physical Card Creation', description: 'One-time fee for physical card', type: 'fixed', value: 10.00, category: 'card', isActive: true },
    { id: '6', name: 'Card Transaction Fee', description: 'Per transaction fee', type: 'percentage', value: 1.5, minAmount: 0.10, maxAmount: 50, category: 'card', isActive: true },
    { id: '7', name: 'Card Monthly Maintenance', description: 'Monthly card maintenance fee', type: 'fixed', value: 1.00, category: 'card', isActive: true },
    // Merchant Fees
    { id: '8', name: 'Payment Processing Fee', description: 'Fee for processing payments', type: 'percentage', value: 2.9, minAmount: 0.30, category: 'merchant', isActive: true },
    { id: '9', name: 'Payout Fee', description: 'Fee for merchant payouts', type: 'percentage', value: 0.25, minAmount: 0.25, maxAmount: 25, category: 'merchant', isActive: true },
    { id: '10', name: 'Chargeback Fee', description: 'Fee per chargeback', type: 'fixed', value: 15.00, category: 'merchant', isActive: true },
    // Withdrawal Fees
    { id: '11', name: 'ATM Withdrawal', description: 'Fee for ATM withdrawals', type: 'fixed', value: 2.00, category: 'withdrawal', isActive: true },
    { id: '12', name: 'Bank Withdrawal', description: 'Fee for bank withdrawals', type: 'percentage', value: 1.0, minAmount: 1, maxAmount: 25, category: 'withdrawal', isActive: true },
  ]);

  const filteredFees = fees.filter(fee => fee.category === activeTab);

  const handleSave = () => {
    setSaved(true);
    setIsEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const updateFee = (id: string, field: keyof FeeConfig, value: any) => {
    setFees(fees.map(fee =>
      fee.id === id ? { ...fee, [field]: value } : fee
    ));
  };

  const toggleFeeStatus = (id: string) => {
    setFees(fees.map(fee =>
      fee.id === id ? { ...fee, isActive: !fee.isActive } : fee
    ));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'transfer': return <ArrowLeftRight className="w-5 h-5" />;
      case 'card': return <CreditCard className="w-5 h-5" />;
      case 'merchant': return <DollarSign className="w-5 h-5" />;
      case 'withdrawal': return <DollarSign className="w-5 h-5" />;
      default: return <DollarSign className="w-5 h-5" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fees & Pricing</h1>
            <p className="text-gray-500">Configure transaction fees and pricing for all services</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                Changes saved
              </span>
            )}
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
                Changes to fees will affect all new transactions. Existing transactions will not be affected.
                Make sure to review all changes before saving.
              </p>
            </div>
          </div>
        </Card>

        {/* Category Tabs */}
        <Card className="p-1">
          <div className="flex gap-1">
            {[
              { id: 'transfer', label: 'Transfer Fees', icon: ArrowLeftRight },
              { id: 'card', label: 'Card Fees', icon: CreditCard },
              { id: 'merchant', label: 'Merchant Fees', icon: DollarSign },
              { id: 'withdrawal', label: 'Withdrawal Fees', icon: DollarSign },
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

        {/* Fees List */}
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
                    <h3 className="font-semibold text-gray-900">{fee.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{fee.description}</p>
                    {(fee.minAmount !== undefined || fee.maxAmount !== undefined) && (
                      <p className="text-xs text-gray-400 mt-2">
                        {fee.minAmount !== undefined && `Min: $${fee.minAmount.toFixed(2)}`}
                        {fee.minAmount !== undefined && fee.maxAmount !== undefined && ' | '}
                        {fee.maxAmount !== undefined && `Max: $${fee.maxAmount.toFixed(2)}`}
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

        {/* Add New Fee */}
        {isEditing && (
          <button className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Fee
          </button>
        )}

        {/* Summary Card */}
        <Card className="p-6 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-4">Fee Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Transfer Fees</p>
              <p className="text-lg font-semibold">{fees.filter(f => f.category === 'transfer' && f.isActive).length} active</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Card Fees</p>
              <p className="text-lg font-semibold">{fees.filter(f => f.category === 'card' && f.isActive).length} active</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Merchant Fees</p>
              <p className="text-lg font-semibold">{fees.filter(f => f.category === 'merchant' && f.isActive).length} active</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Withdrawal Fees</p>
              <p className="text-lg font-semibold">{fees.filter(f => f.category === 'withdrawal' && f.isActive).length} active</p>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

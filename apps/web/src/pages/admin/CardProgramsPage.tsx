import { useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  Pause,
  CreditCard,
  X,
  Loader2,
  Zap,
  Clock,
  TrendingUp,
  Percent,
  Banknote,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useCardTypes, useCreateCardType, useUpdateCardType, useDeleteCardType } from '@/hooks/useCards';
import type { CardType, CreateCardTypeRequest } from '@/services/card.service';

// Predefined gradient options
const GRADIENT_OPTIONS = [
  { name: 'Blue', value: 'from-blue-600 to-blue-800' },
  { name: 'Purple', value: 'from-purple-600 to-purple-800' },
  { name: 'Green', value: 'from-green-600 to-green-800' },
  { name: 'Red', value: 'from-red-600 to-red-800' },
  { name: 'Orange', value: 'from-orange-500 to-orange-700' },
  { name: 'Teal', value: 'from-teal-500 to-teal-700' },
  { name: 'Pink', value: 'from-pink-500 to-pink-700' },
  { name: 'Indigo', value: 'from-indigo-600 to-indigo-800' },
  { name: 'Gray', value: 'from-gray-700 to-gray-900' },
  { name: 'Gold', value: 'from-yellow-500 to-yellow-700' },
];

// Feature definitions with descriptions
const FEATURE_DEFINITIONS = [
  {
    key: 'noTransactionFees',
    label: 'No Transaction Fees',
    description: 'Zero fees on all card transactions',
    icon: Percent,
  },
  {
    key: 'allowNegativeBalance',
    label: 'Negative Balance / Overdraft',
    description: 'Allow spending beyond available balance up to overdraft limit',
    icon: Banknote,
    hasAmount: true,
    amountKey: 'overdraftLimit',
    amountLabel: 'Overdraft Limit (SLE)',
  },
  {
    key: 'allowBuyNowPayLater',
    label: 'Buy Now Pay Later (BNPL)',
    description: 'Allow purchases to be paid in installments',
    icon: Clock,
    hasAmount: true,
    amountKey: 'bnplMaxAmount',
    amountLabel: 'Max BNPL Amount (SLE)',
    hasRate: true,
    rateKey: 'bnplInterestRate',
    rateLabel: 'Interest Rate (%)',
  },
  {
    key: 'highTransactionLimit',
    label: 'High Transaction Limits',
    description: 'Higher daily and monthly limits for large transactions',
    icon: TrendingUp,
  },
  {
    key: 'cashbackEnabled',
    label: 'Cashback Rewards',
    description: 'Earn cashback on purchases',
    icon: Zap,
    hasRate: true,
    rateKey: 'cashbackPercentage',
    rateLabel: 'Cashback Rate (%)',
  },
];

// Default form state
const DEFAULT_FORM: CreateCardTypeRequest = {
  name: '',
  description: '',
  cardImageUrl: '',
  price: 0,
  transactionFeePercentage: 0,
  transactionFeeFixed: 0,
  requiredKycLevel: 1,
  cardType: 'VIRTUAL',
  isActive: true,
  dailyLimit: 5000,
  monthlyLimit: 50000,
  colorGradient: 'from-blue-600 to-blue-800',
  features: [],
  // Feature flags
  allowNegativeBalance: false,
  allowBuyNowPayLater: false,
  highTransactionLimit: false,
  noTransactionFees: false,
  cashbackEnabled: false,
  cashbackPercentage: 0,
  overdraftLimit: 0,
  bnplMaxAmount: 0,
  bnplInterestRate: 0,
};

export function CardProgramsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [formData, setFormData] = useState<CreateCardTypeRequest>(DEFAULT_FORM);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Hooks
  const { data: cardTypes, isLoading } = useCardTypes(true);
  const createCardType = useCreateCardType();
  const updateCardType = useUpdateCardType();
  const deleteCardType = useDeleteCardType();

  // Stats
  const stats = {
    totalPrograms: cardTypes?.length || 0,
    activePrograms: cardTypes?.filter(ct => ct.isActive).length || 0,
    virtualCards: cardTypes?.filter(ct => ct.cardType === 'VIRTUAL').length || 0,
    physicalCards: cardTypes?.filter(ct => ct.cardType === 'PHYSICAL').length || 0,
  };

  // Open create modal
  const openCreateModal = () => {
    setEditingCard(null);
    setFormData(DEFAULT_FORM);
    setNewFeatureText('');
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (cardType: CardType) => {
    setEditingCard(cardType);
    setFormData({
      name: cardType.name,
      description: cardType.description,
      cardImageUrl: cardType.cardImageUrl || '',
      price: cardType.price,
      transactionFeePercentage: cardType.transactionFeePercentage,
      transactionFeeFixed: cardType.transactionFeeFixed,
      requiredKycLevel: cardType.requiredKycLevel,
      cardType: cardType.cardType,
      isActive: cardType.isActive,
      dailyLimit: cardType.dailyLimit,
      monthlyLimit: cardType.monthlyLimit,
      colorGradient: cardType.colorGradient,
      features: cardType.features || [],
      // Feature flags
      allowNegativeBalance: cardType.allowNegativeBalance || false,
      allowBuyNowPayLater: cardType.allowBuyNowPayLater || false,
      highTransactionLimit: cardType.highTransactionLimit || false,
      noTransactionFees: cardType.noTransactionFees || false,
      cashbackEnabled: cardType.cashbackEnabled || false,
      cashbackPercentage: cardType.cashbackPercentage || 0,
      overdraftLimit: cardType.overdraftLimit || 0,
      bnplMaxAmount: cardType.bnplMaxAmount || 0,
      bnplInterestRate: cardType.bnplInterestRate || 0,
    });
    setNewFeatureText('');
    setShowModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCard) {
        await updateCardType.mutateAsync({ id: editingCard.id, data: formData });
      } else {
        await createCardType.mutateAsync(formData);
      }
      setShowModal(false);
      setEditingCard(null);
      setFormData(DEFAULT_FORM);
    } catch (error) {
      console.error('Error saving card program:', error);
      alert('Failed to save card program. Please try again.');
    }
  };

  // Add display feature text
  const addFeatureText = () => {
    if (newFeatureText.trim() && !formData.features?.includes(newFeatureText.trim())) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), newFeatureText.trim()],
      });
      setNewFeatureText('');
    }
  };

  // Remove display feature text
  const removeFeatureText = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features?.filter((_, i) => i !== index),
    });
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteCardType.mutateAsync(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting card program:', error);
      alert('Failed to delete card program. It may be in use.');
    }
  };

  // Toggle active status
  const toggleActive = async (cardType: CardType) => {
    try {
      await updateCardType.mutateAsync({
        id: cardType.id,
        data: { isActive: !cardType.isActive },
      });
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  // Filter card types
  const filteredCardTypes = cardTypes?.filter(ct => {
    if (searchQuery && !ct.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  }) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get active features for display
  const getActiveFeatures = (cardType: CardType) => {
    const features: string[] = [];
    if (cardType.noTransactionFees) features.push('No Fees');
    if (cardType.allowNegativeBalance) features.push(`Overdraft: ${formatCurrency(cardType.overdraftLimit || 0)}`);
    if (cardType.allowBuyNowPayLater) features.push('BNPL');
    if (cardType.highTransactionLimit) features.push('High Limits');
    if (cardType.cashbackEnabled) features.push(`${cardType.cashbackPercentage}% Cashback`);
    return features;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Card Programs</h1>
            <p className="text-gray-500">Configure card products for the marketplace</p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Card Program
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Programs</p>
                <p className="text-2xl font-bold">{stats.totalPrograms}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.activePrograms}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Virtual Cards</p>
                <p className="text-2xl font-bold">{stats.virtualCards}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Physical Cards</p>
                <p className="text-2xl font-bold">{stats.physicalCards}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search card programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </Card>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading card programs...</p>
          </div>
        ) : filteredCardTypes.length === 0 ? (
          <Card className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No card programs</h3>
            <p className="text-gray-500 mb-4">Create your first card program to get started</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Create Card Program
            </button>
          </Card>
        ) : (
          /* Card Programs Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCardTypes.map((cardType) => (
              <Card key={cardType.id} className="overflow-hidden">
                {/* Card Preview - No name on card */}
                <div
                  className={`relative p-6 text-white bg-gradient-to-br ${cardType.colorGradient}`}
                >
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        cardType.isActive
                          ? 'bg-green-500/20 text-green-100'
                          : 'bg-red-500/20 text-red-100'
                      }`}
                    >
                      {cardType.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex flex-col h-40 justify-between">
                    <div>
                      <CreditCard className="w-10 h-10 opacity-80" />
                      <p className="text-white/70 text-sm mt-2">{cardType.cardType} Card</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs opacity-70">Price</p>
                        <p className="text-2xl font-bold">
                          {cardType.price === 0 ? 'FREE' : formatCurrency(cardType.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs opacity-70">KYC Level</p>
                        <p className="text-lg font-semibold">{cardType.requiredKycLevel}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{cardType.name}</h3>
                    <p className="text-sm text-gray-600">{cardType.description}</p>
                  </div>

                  {/* Active Features */}
                  {getActiveFeatures(cardType).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase">Active Features</p>
                      <div className="flex flex-wrap gap-1">
                        {getActiveFeatures(cardType).map((feature, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Display Features */}
                  {cardType.features && cardType.features.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase">Description Features</p>
                      <div className="flex flex-wrap gap-1">
                        {cardType.features.map((feature, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pricing Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Transaction Fee</p>
                      <p className="font-medium">
                        {cardType.noTransactionFees ? (
                          <span className="text-green-600">No Fees</span>
                        ) : (
                          `${cardType.transactionFeePercentage}% + ${formatCurrency(cardType.transactionFeeFixed)}`
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Daily Limit</p>
                      <p className="font-medium">{formatCurrency(cardType.dailyLimit)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Monthly Limit</p>
                      <p className="font-medium">{formatCurrency(cardType.monthlyLimit)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <button
                      onClick={() => openEditModal(cardType)}
                      className="flex-1 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(cardType)}
                      className={`flex-1 py-2 text-sm rounded-lg flex items-center justify-center gap-2 ${
                        cardType.isActive
                          ? 'text-yellow-600 hover:bg-yellow-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {cardType.isActive ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Activate
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(cardType.id)}
                      className="flex-1 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
                  <h2 className="text-lg font-semibold">
                    {editingCard ? 'Edit Card Program' : 'Create Card Program'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 space-y-6">
                  {/* Card Preview - No name */}
                  <div
                    className={`relative p-6 text-white bg-gradient-to-br ${formData.colorGradient} rounded-xl`}
                  >
                    <div className="flex flex-col h-32 justify-between">
                      <div>
                        <CreditCard className="w-8 h-8 opacity-80" />
                        <p className="text-white/70 text-sm mt-2">{formData.cardType} Card</p>
                      </div>
                      <div className="flex justify-between items-end">
                        <p className="text-xl font-bold">
                          {formData.price === 0 ? 'FREE' : `SLE ${formData.price}`}
                        </p>
                        <p className="text-sm opacity-70">KYC {formData.requiredKycLevel}</p>
                      </div>
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Program Name * <span className="text-gray-400 font-normal">(for admin reference)</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Premium Virtual Card"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description * <span className="text-gray-400 font-normal">(shown to users)</span>
                      </label>
                      <textarea
                        required
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe what this card offers..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Card Type *</label>
                      <select
                        value={formData.cardType}
                        onChange={(e) =>
                          setFormData({ ...formData, cardType: e.target.value as 'VIRTUAL' | 'PHYSICAL' })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="VIRTUAL">Virtual</option>
                        <option value="PHYSICAL">Physical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Card Color</label>
                      <select
                        value={formData.colorGradient}
                        onChange={(e) => setFormData({ ...formData, colorGradient: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        {GRADIENT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Pricing & Fees</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Card Price (SLE)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Transaction Fee (%)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.transactionFeePercentage}
                          onChange={(e) =>
                            setFormData({ ...formData, transactionFeePercentage: parseFloat(e.target.value) || 0 })
                          }
                          disabled={formData.noTransactionFees}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Fixed Fee (SLE)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.transactionFeeFixed}
                          onChange={(e) =>
                            setFormData({ ...formData, transactionFeeFixed: parseFloat(e.target.value) || 0 })
                          }
                          disabled={formData.noTransactionFees}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Limits */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Transaction Limits</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Daily Limit (SLE)</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.dailyLimit}
                          onChange={(e) => setFormData({ ...formData, dailyLimit: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Monthly Limit (SLE)</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.monthlyLimit}
                          onChange={(e) => setFormData({ ...formData, monthlyLimit: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Requirements */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Required KYC Level</label>
                      <select
                        value={formData.requiredKycLevel}
                        onChange={(e) =>
                          setFormData({ ...formData, requiredKycLevel: parseInt(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value={1}>Level 1 - Basic</option>
                        <option value={2}>Level 2 - Advanced</option>
                        <option value={3}>Level 3 - Enhanced</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Active in marketplace</span>
                      </label>
                    </div>
                  </div>

                  {/* FUNCTIONAL FEATURES - These actually affect card behavior */}
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-1 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary-600" />
                      Functional Features
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                      These features will be applied to all cards issued under this program
                    </p>

                    <div className="space-y-4">
                      {FEATURE_DEFINITIONS.map((feature) => {
                        const isEnabled = formData[feature.key as keyof CreateCardTypeRequest] as boolean;
                        const Icon = feature.icon;

                        return (
                          <div key={feature.key} className="border rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary-100' : 'bg-gray-100'}`}>
                                <Icon className={`w-5 h-5 ${isEnabled ? 'text-primary-600' : 'text-gray-400'}`} />
                              </div>
                              <div className="flex-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={(e) =>
                                      setFormData({ ...formData, [feature.key]: e.target.checked })
                                    }
                                    className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                                  />
                                  <span className="font-medium text-gray-900">{feature.label}</span>
                                </label>
                                <p className="text-xs text-gray-500 mt-1">{feature.description}</p>

                                {/* Additional inputs when enabled */}
                                {isEnabled && (feature.hasAmount || feature.hasRate) && (
                                  <div className="mt-3 flex gap-4">
                                    {feature.hasAmount && feature.amountKey && (
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                          {feature.amountLabel}
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          value={formData[feature.amountKey as keyof CreateCardTypeRequest] as number || 0}
                                          onChange={(e) =>
                                            setFormData({
                                              ...formData,
                                              [feature.amountKey!]: parseFloat(e.target.value) || 0,
                                            })
                                          }
                                          className="w-32 px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                                        />
                                      </div>
                                    )}
                                    {feature.hasRate && feature.rateKey && (
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                          {feature.rateLabel}
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          max="100"
                                          value={formData[feature.rateKey as keyof CreateCardTypeRequest] as number || 0}
                                          onChange={(e) =>
                                            setFormData({
                                              ...formData,
                                              [feature.rateKey!]: parseFloat(e.target.value) || 0,
                                            })
                                          }
                                          className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Display Features - Text descriptions for marketing */}
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Display Features</h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Marketing text shown to users (does not affect card behavior)
                    </p>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newFeatureText}
                          onChange={(e) => setNewFeatureText(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addFeatureText();
                            }
                          }}
                          placeholder="Add a display feature..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={addFeatureText}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {formData.features && formData.features.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.features.map((feature, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                            >
                              {feature}
                              <button
                                type="button"
                                onClick={() => removeFeatureText(index)}
                                className="p-0.5 hover:bg-gray-200 rounded-full"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t sticky bottom-0 bg-white">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createCardType.isPending || updateCardType.isPending}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {(createCardType.isPending || updateCardType.isPending) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {editingCard ? 'Save Changes' : 'Create Card Program'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Card Program?</h3>
                <p className="text-gray-500 mb-6">
                  This action cannot be undone. Cards already issued will not be affected.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    disabled={deleteCardType.isPending}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteCardType.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

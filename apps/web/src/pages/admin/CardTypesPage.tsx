import { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  DollarSign,
  Shield,
  Percent,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input, MotionCard } from '@/components/ui';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  useCardTypes,
  useCreateCardType,
  useUpdateCardType,
  useDeleteCardType,
} from '@/hooks/useCards';
import type { CardType, CreateCardTypeRequest } from '@/services/card.service';
import { clsx } from 'clsx';
import { currencyService, Currency } from '@/services/currency.service';

const KYC_LEVELS = [
  { value: 1, label: 'Basic', description: 'Email verification only' },
  { value: 2, label: 'Advanced', description: 'ID verification required' },
  { value: 3, label: 'Enhanced', description: 'Full KYC with address proof' },
];

const COLOR_GRADIENTS = [
  { value: 'from-blue-500 to-blue-700', label: 'Blue' },
  { value: 'from-purple-600 to-purple-800', label: 'Purple' },
  { value: 'from-gray-700 to-gray-900', label: 'Dark' },
  { value: 'from-yellow-600 to-yellow-800', label: 'Gold' },
  { value: 'from-green-500 to-green-700', label: 'Green' },
  { value: 'from-red-500 to-red-700', label: 'Red' },
  { value: 'from-indigo-500 to-indigo-700', label: 'Indigo' },
  { value: 'from-pink-500 to-pink-700', label: 'Pink' },
];

const emptyForm: CreateCardTypeRequest = {
  name: '',
  description: '',
  price: 0,
  transactionFeePercentage: 0,
  transactionFeeFixed: 0,
  requiredKycLevel: 1,
  cardType: 'VIRTUAL',
  isActive: true,
  dailyLimit: 1000,
  monthlyLimit: 10000,
  colorGradient: 'from-blue-500 to-blue-700',
  features: [],
};

export function CardTypesPage() {
  const { data: cardTypes, isLoading } = useCardTypes(true);
  const createCardType = useCreateCardType();
  const updateCardType = useUpdateCardType();
  const deleteCardType = useDeleteCardType();

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateCardTypeRequest>(emptyForm);
  const [featureInput, setFeatureInput] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleOpenEdit = (cardType: CardType) => {
    setEditingId(cardType.id);
    setForm({
      name: cardType.name,
      description: cardType.description,
      cardImageUrl: cardType.cardImageUrl,
      price: cardType.price,
      transactionFeePercentage: cardType.transactionFeePercentage,
      transactionFeeFixed: cardType.transactionFeeFixed,
      requiredKycLevel: cardType.requiredKycLevel,
      cardType: cardType.cardType,
      isActive: cardType.isActive,
      dailyLimit: cardType.dailyLimit,
      monthlyLimit: cardType.monthlyLimit,
      colorGradient: cardType.colorGradient,
      features: cardType.features,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateCardType.mutateAsync({ id: editingId, data: form });
      } else {
        await createCardType.mutateAsync(form);
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (error) {
      console.error('Failed to save card type:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCardType.mutateAsync(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete card type:', error);
    }
  };

  const handleAddFeature = () => {
    if (featureInput.trim() && form.features) {
      setForm({ ...form, features: [...form.features, featureInput.trim()] });
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    if (form.features) {
      setForm({ ...form, features: form.features.filter((_, i) => i !== index) });
    }
  };

  const handleToggleActive = async (cardType: CardType) => {
    try {
      await updateCardType.mutateAsync({
        id: cardType.id,
        data: { isActive: !cardType.isActive },
      });
    } catch (error) {
      console.error('Failed to toggle card type:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Card Types</h1>
            <p className="text-gray-500 dark:text-gray-400">Configure available card products for users</p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Card Type
          </Button>
        </div>

        {/* Card Types Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading card types...</div>
        ) : cardTypes && cardTypes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cardTypes.map((cardType) => (
              <Card key={cardType.id} className="overflow-hidden">
                {/* Card Preview */}
                <div
                  className={clsx(
                    'relative aspect-[1.586/1] p-6 text-white bg-gradient-to-br',
                    cardType.colorGradient,
                    !cardType.isActive && 'opacity-50'
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs uppercase tracking-wider opacity-80">
                        {cardType.cardType}
                      </p>
                      <p className="font-bold mt-1">{cardType.name}</p>
                    </div>
                    <CreditCard className="w-8 h-8 opacity-80" />
                  </div>
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs opacity-70">Price</p>
                        <p className="text-lg font-bold">
                          {cardType.price === 0 ? 'FREE' : formatCurrency(cardType.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs opacity-70">KYC Level</p>
                        <p className="text-sm">{KYC_LEVELS.find(k => k.value === cardType.requiredKycLevel)?.label}</p>
                      </div>
                    </div>
                  </div>
                  {!cardType.isActive && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-red-500 px-3 py-1 rounded-full text-sm font-medium">
                        INACTIVE
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Details */}
                <div className="p-4 space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{cardType.description}</p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Transaction Fee</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {cardType.transactionFeePercentage}% + {formatCurrency(cardType.transactionFeeFixed)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Daily Limit</p>
                      <p className="font-medium text-gray-900 dark:text-white">{currencySymbol}{cardType.dailyLimit.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Features */}
                  {cardType.features.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {cardType.features.slice(0, 3).map((feature, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                      {cardType.features.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                          +{cardType.features.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleToggleActive(cardType)}
                      className={clsx(
                        'flex items-center gap-1 text-sm',
                        cardType.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                      )}
                    >
                      {cardType.isActive ? (
                        <>
                          <ToggleRight className="w-5 h-5" />
                          Active
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5" />
                          Inactive
                        </>
                      )}
                    </button>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(cardType)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(cardType.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No card types configured</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first card type to get started</p>
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Card Type
            </Button>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-gray-900 dark:text-white">{editingId ? 'Edit Card Type' : 'Add Card Type'}</CardTitle>
            </CardHeader>
            <div className="space-y-4 p-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Card Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Premium Virtual Card"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Card Type</label>
                  <select
                    value={form.cardType}
                    onChange={(e) => setForm({ ...form, cardType: e.target.value as 'VIRTUAL' | 'PHYSICAL' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="VIRTUAL">Virtual Card</option>
                    <option value="PHYSICAL">Physical Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the card benefits and features..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Card Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Percent className="w-4 h-4 inline mr-1" />
                    Fee %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.transactionFeePercentage}
                    onChange={(e) => setForm({ ...form, transactionFeePercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Fixed Fee
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.transactionFeeFixed}
                    onChange={(e) => setForm({ ...form, transactionFeeFixed: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Limit ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.dailyLimit}
                    onChange={(e) => setForm({ ...form, dailyLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Limit ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.monthlyLimit}
                    onChange={(e) => setForm({ ...form, monthlyLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* KYC & Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Required KYC Level
                  </label>
                  <select
                    value={form.requiredKycLevel}
                    onChange={(e) => setForm({ ...form, requiredKycLevel: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {KYC_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label} - {level.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Card Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_GRADIENTS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setForm({ ...form, colorGradient: color.value })}
                        className={clsx(
                          'w-8 h-8 rounded-full bg-gradient-to-br border-2',
                          color.value,
                          form.colorGradient === color.value
                            ? 'border-primary-500 ring-2 ring-primary-200'
                            : 'border-transparent'
                        )}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Features</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                    placeholder="Add a feature..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <Button type="button" variant="outline" onClick={handleAddFeature}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.features?.map((feature, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                    >
                      {feature}
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(index)}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={clsx(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    form.isActive ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={clsx(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      form.isActive ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  {form.isActive ? 'Active - visible to users' : 'Inactive - hidden from users'}
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowModal(false);
                    setForm(emptyForm);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  isLoading={createCardType.isPending || updateCardType.isPending}
                  disabled={!form.name || !form.description}
                >
                  {editingId ? 'Update Card Type' : 'Create Card Type'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-md p-6 bg-white dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Card Type</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete this card type? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => handleDelete(deleteConfirm)}
                isLoading={deleteCardType.isPending}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}

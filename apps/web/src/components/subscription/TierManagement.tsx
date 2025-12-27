/**
 * Tier Management Component
 *
 * Admin interface for configuring subscription tier limits and features
 * Production-grade: All pricing and limits are stored in database
 */

import { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Loader2,
  Check,
  X,
  DollarSign,
  Users,
  Package,
  MapPin,
  FolderOpen,
  Calendar,
  Percent,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Database,
  RefreshCw,
  Edit2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { tierConfigService, TierConfiguration, MerchantTier } from '@/services/subscription.service';

interface TierCardProps {
  config: TierConfiguration;
  onSave: (updates: Partial<TierConfiguration>) => Promise<void>;
  saving: boolean;
}

function TierCard({ config, onSave, saving }: TierCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editedConfig, setEditedConfig] = useState<Partial<TierConfiguration>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const updateField = <K extends keyof TierConfiguration>(
    field: K,
    value: TierConfiguration[K]
  ) => {
    setEditedConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSave(editedConfig);
    setEditedConfig({});
    setHasChanges(false);
  };

  const getValue = <K extends keyof TierConfiguration>(field: K): TierConfiguration[K] => {
    return field in editedConfig ? editedConfig[field] as TierConfiguration[K] : config[field];
  };

  const tierColors: Record<MerchantTier, string> = {
    basic: 'border-gray-300 bg-gray-50',
    business: 'border-amber-300 bg-amber-50',
    business_plus: 'border-purple-300 bg-purple-50',
  };

  const tierHeaderColors: Record<MerchantTier, string> = {
    basic: 'bg-gray-600',
    business: 'bg-amber-500',
    business_plus: 'bg-purple-600',
  };

  return (
    <Card className={`border-2 ${tierColors[config.tier]} overflow-hidden`}>
      {/* Header */}
      <div className={`${tierHeaderColors[config.tier]} text-white p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">{getValue('display_name')}</h3>
            <p className="text-sm opacity-90">{getValue('description')}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {getValue('currency')} {getValue('price_monthly')}
            </p>
            <p className="text-sm opacity-75">/month</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Display Name & Description */}
        <div className="space-y-3 pb-3 border-b">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Edit2 className="w-3 h-3" /> Display Name
            </label>
            <input
              type="text"
              value={getValue('display_name')}
              onChange={(e) => updateField('display_name', e.target.value)}
              className="w-full px-2 py-1.5 border rounded-lg text-sm font-medium"
              placeholder="Tier name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Description
            </label>
            <input
              type="text"
              value={getValue('description')}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full px-2 py-1.5 border rounded-lg text-sm"
              placeholder="Short description for users"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Monthly Price ({getValue('currency')})
            </label>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={getValue('price_monthly')}
                onChange={(e) => updateField('price_monthly', parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Yearly Price ({getValue('currency')})
            </label>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={getValue('price_yearly')}
                onChange={(e) => updateField('price_yearly', parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Numeric Limits */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Limits (-1 = Unlimited)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Package className="w-3 h-3" /> Products
              </label>
              <input
                type="number"
                value={getValue('max_products')}
                onChange={(e) => updateField('max_products', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                min="-1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Staff
              </label>
              <input
                type="number"
                value={getValue('max_staff')}
                onChange={(e) => updateField('max_staff', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                min="-1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Locations
              </label>
              <input
                type="number"
                value={getValue('max_locations')}
                onChange={(e) => updateField('max_locations', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                min="-1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                <FolderOpen className="w-3 h-3" /> Categories
              </label>
              <input
                type="number"
                value={getValue('max_categories')}
                onChange={(e) => updateField('max_categories', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                min="-1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Event Staff
              </label>
              <input
                type="number"
                value={getValue('max_event_staff')}
                onChange={(e) => updateField('max_event_staff', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                min="-1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Report Days
              </label>
              <input
                type="number"
                value={getValue('report_history_days')}
                onChange={(e) => updateField('report_history_days', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                min="-1"
              />
            </div>
          </div>
        </div>

        {/* Fees */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Percent className="w-3 h-3" /> Transaction Fee %
            </label>
            <input
              type="number"
              step="0.1"
              value={getValue('transaction_fee_percent')}
              onChange={(e) => updateField('transaction_fee_percent', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1.5 border rounded-lg text-sm"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Percent className="w-3 h-3" /> Event Ticket %
            </label>
            <input
              type="number"
              step="0.1"
              value={getValue('event_ticket_commission_percent')}
              onChange={(e) => updateField('event_ticket_commission_percent', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1.5 border rounded-lg text-sm"
              min="0"
            />
          </div>
        </div>

        {/* Expand/Collapse Features */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide Features
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show Features ({Object.keys(config).filter(k => k.startsWith('feature_')).length})
            </>
          )}
        </button>

        {/* Features (Expandable) */}
        {expanded && (
          <div className="space-y-3 border-t pt-3">
            <h4 className="text-sm font-semibold text-gray-700">POS Features</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'feature_customers_credit', label: 'Customer Credit' },
                { key: 'feature_loyalty_program', label: 'Loyalty Program' },
                { key: 'feature_advanced_reports', label: 'Advanced Reports' },
                { key: 'feature_kitchen_display', label: 'Kitchen Display' },
                { key: 'feature_table_management', label: 'Table Management' },
                { key: 'feature_online_ordering', label: 'Online Ordering' },
                { key: 'feature_multi_payment', label: 'Multi-Payment' },
                { key: 'feature_discount_codes', label: 'Discount Codes' },
                { key: 'feature_inventory_alerts', label: 'Inventory Alerts' },
                { key: 'feature_export_reports', label: 'Export Reports' },
                { key: 'feature_custom_receipts', label: 'Custom Receipts' },
                { key: 'feature_api_access', label: 'API Access' },
                { key: 'feature_priority_support', label: 'Priority Support' },
                { key: 'feature_barcode_scanner', label: 'Barcode Scanner' },
                { key: 'feature_multi_currency', label: 'Multi-Currency' },
                { key: 'feature_supplier_management', label: 'Suppliers' },
                { key: 'feature_purchase_orders', label: 'Purchase Orders' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={getValue(key as keyof TierConfiguration) as boolean}
                    onChange={(e) => updateField(key as keyof TierConfiguration, e.target.checked as any)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            <h4 className="text-sm font-semibold text-gray-700 pt-2">Event Features</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'feature_event_management', label: 'Event Management' },
                { key: 'feature_event_analytics', label: 'Event Analytics' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={getValue(key as keyof TierConfiguration) as boolean}
                    onChange={(e) => updateField(key as keyof TierConfiguration, e.target.checked as any)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            <h4 className="text-sm font-semibold text-gray-700 pt-2">Communication</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'feature_sms_notifications', label: 'SMS Notifications' },
                { key: 'feature_whatsapp_notifications', label: 'WhatsApp Notifications' },
                { key: 'feature_email_notifications', label: 'Email Notifications' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={getValue(key as keyof TierConfiguration) as boolean}
                    onChange={(e) => updateField(key as keyof TierConfiguration, e.target.checked as any)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        )}
      </div>
    </Card>
  );
}

export function TierManagement() {
  const [configurations, setConfigurations] = useState<TierConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      setError(null);
      const configs = await tierConfigService.fetchAllConfigurations();
      setConfigurations(configs);
    } catch (err) {
      setError('Failed to load tier configurations. Make sure the database table exists.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (tier: MerchantTier, updates: Partial<TierConfiguration>) => {
    try {
      setSaving(true);
      setError(null);
      await tierConfigService.updateConfiguration(tier, updates);
      setSuccess(`${tier} tier updated successfully`);
      setTimeout(() => setSuccess(null), 3000);
      await loadConfigurations();
    } catch (err) {
      setError(`Failed to update ${tier} tier`);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      setError(null);
      await tierConfigService.seedDefaultConfigurations();
      setSuccess('Default tier configurations created successfully!');
      setTimeout(() => setSuccess(null), 3000);
      await loadConfigurations();
    } catch (err: any) {
      if (err.message?.includes('tier_configurations')) {
        setError('Database table not found. Please run the migration first: scripts/migrations/081_tier_configurations.sql');
      } else {
        setError('Failed to seed tier configurations: ' + (err.message || 'Unknown error'));
      }
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tier Configuration</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Configure pricing, limits, and features for each subscription tier
          </p>
        </div>
        <button
          onClick={loadConfigurations}
          disabled={loading}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="text-blue-800 dark:text-blue-300 font-medium">Database-Driven Configuration</p>
            <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
              All pricing and limits are stored in the database. Changes made here will immediately affect all users.
              The values here override any hardcoded defaults.
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-300 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
            <X className="w-4 h-4 text-red-600 dark:text-red-400" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          <p className="text-green-700 dark:text-green-300">{success}</p>
        </div>
      )}

      {/* Tier Cards */}
      {configurations.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-6">
          {configurations.map((config) => (
            <TierCard
              key={config.id}
              config={config}
              onSave={(updates) => handleSave(config.tier, updates)}
              saving={saving}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Database className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Tier Configurations Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            The tier configurations table is empty. You can initialize it with default values
            or run the database migration manually.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleSeedData}
              disabled={seeding}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {seeding ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5" />
                  Initialize Default Tiers
                </>
              )}
            </button>
            <span className="text-gray-400 text-sm">or</span>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Run migration: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                081_tier_configurations.sql
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Last Updated Info */}
      {configurations.length > 0 && configurations[0]?.updated_at && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          Last updated: {new Date(configurations[0].updated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  Link2,
  Search,
  Plus,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  X,
  DollarSign,
  Calendar,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { currencyService, Currency } from '@/services/currency.service';
import { paymentLinkService, PaymentLink, CreatePaymentLinkDto } from '@/services/paymentLink.service';
import { businessService, MerchantBusiness } from '@/services/business.service';

export function MerchantPaymentLinksPage() {
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreatePaymentLinkDto>({
    business_id: '',
    name: '',
    description: '',
    amount: undefined,
    currency: 'SLE',
    allow_custom_amount: false,
  });

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [linksData, businessesData] = await Promise.all([
        paymentLinkService.getMyPaymentLinks(),
        businessService.getMyBusinesses(),
      ]);
      setPaymentLinks(linksData);
      setBusinesses(businessesData);
      if (businessesData.length > 0 && !formData.business_id) {
        setFormData(prev => ({ ...prev, business_id: businessesData[0].id }));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load payment links');
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const copyToClipboard = (id: string, businessSlug: string, linkSlug: string) => {
    const url = paymentLinkService.getPaymentLinkUrl(businessSlug, linkSlug);
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async () => {
    if (!formData.business_id || !formData.name) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.allow_custom_amount && !formData.amount) {
      setError('Please enter an amount or enable custom amount');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await paymentLinkService.createPaymentLink(formData);
      setShowCreateModal(false);
      setFormData({
        business_id: businesses[0]?.id || '',
        name: '',
        description: '',
        amount: undefined,
        currency: 'SLE',
        allow_custom_amount: false,
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create payment link');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment link?')) return;

    setDeleting(id);
    try {
      await paymentLinkService.deletePaymentLink(id);
      await fetchData();
    } catch (err) {
      console.error('Error deleting payment link:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleStatus = async (link: PaymentLink) => {
    try {
      await paymentLinkService.updatePaymentLink(link.id, {
        status: link.status === 'active' ? 'inactive' : 'active',
      });
      await fetchData();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Active</span>;
      case 'inactive':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"><XCircle className="w-3 h-3" /> Inactive</span>;
      case 'expired':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Expired</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const filteredLinks = paymentLinks.filter(link =>
    link.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const stats = {
    total: paymentLinks.length,
    active: paymentLinks.filter(l => l.status === 'active').length,
    totalViews: paymentLinks.reduce((sum, l) => sum + (l.view_count || 0), 0),
    totalPayments: paymentLinks.reduce((sum, l) => sum + (l.payment_count || 0), 0),
    totalCollected: paymentLinks.reduce((sum, l) => sum + (l.total_collected || 0), 0),
  };

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Links</h1>
            <p className="text-gray-500 dark:text-gray-400">Create shareable links to receive payments</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={businesses.length === 0}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Create Payment Link
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Links</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Payments</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalPayments}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Collected</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalCollected)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* No Businesses Warning */}
        {businesses.length === 0 && !loading && (
          <Card className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                <Link2 className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">No Business Found</h3>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                  You need to create a business first before you can create payment links.
                </p>
                <a
                  href="/merchant/businesses"
                  className="inline-block mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700"
                >
                  Create Business
                </a>
              </div>
            </div>
          </Card>
        )}

        {/* Search */}
        {paymentLinks.length > 0 && (
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search payment links..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800"
              />
            </div>
          </Card>
        )}

        {/* Payment Links Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
              <p className="mt-2 text-gray-500 dark:text-gray-400">Loading payment links...</p>
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="p-8 text-center">
              <Link2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm ? 'No payment links match your search' : 'No payment links yet'}
              </p>
              {businesses.length > 0 && !searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Payment Link
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Views</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payments</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredLinks.map((link) => (
                    <tr key={link.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{link.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{link.business?.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {link.allow_custom_amount ? (
                          <span className="text-sm text-gray-500 dark:text-gray-400">Custom</span>
                        ) : (
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(link.amount || 0)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(link.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{link.view_count}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{link.payment_count}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => copyToClipboard(link.id, link.business?.slug || '', link.slug)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="Copy link"
                          >
                            {copiedId === link.id ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                          <a
                            href={paymentLinkService.getPaymentLinkUrl(link.business?.slug || '', link.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="Open link"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-500" />
                          </a>
                          <button
                            onClick={() => handleToggleStatus(link)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title={link.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {link.status === 'active' ? (
                              <EyeOff className="w-4 h-4 text-gray-500" />
                            ) : (
                              <Eye className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(link.id)}
                            disabled={deleting === link.id}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-red-500"
                            title="Delete"
                          >
                            {deleting === link.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Payment Link</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Business Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business *
                </label>
                <select
                  value={formData.business_id}
                  onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Link Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Product Purchase, Service Fee"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description shown to customers"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700"
                />
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Amount
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={formData.allow_custom_amount}
                      onChange={(e) => setFormData({ ...formData, allow_custom_amount: e.target.checked, amount: undefined })}
                      className="rounded border-gray-300"
                    />
                    Let customer enter amount
                  </label>
                </div>
                {!formData.allow_custom_amount && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                    <input
                      type="number"
                      value={formData.amount || ''}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || undefined })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Link
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MerchantLayout>
  );
}

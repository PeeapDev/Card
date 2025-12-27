/**
 * Merchant Invoices Page
 *
 * Comprehensive invoice management with:
 * - Multiple invoice types (Standard, Proforma, Quote, Credit Note, etc.)
 * - Recurring billing management
 * - Advanced filtering and search
 * - Invoice statistics dashboard
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Send,
  Eye,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Download,
  Link as LinkIcon,
  Loader2,
  Calendar,
  DollarSign,
  TrendingUp,
  Repeat,
  Settings,
  Copy,
  ArrowUpRight,
  Receipt,
  FileCheck,
  FileMinus,
  FilePlus,
  ChevronDown,
  RefreshCw,
  X,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import {
  invoiceService,
  Invoice,
  InvoiceStatus,
  PaymentStatus,
  InvoiceType,
  INVOICE_TYPE_CONFIG,
  RecurringInvoiceTemplate,
  RECURRING_FREQUENCY_CONFIG,
} from '@/services/invoice.service';
import { useBusiness } from '@/context/BusinessContext';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bgColor: string; icon: any }> = {
  draft: { label: 'Draft', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-700', icon: FileText },
  sent: { label: 'Sent', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: Send },
  viewed: { label: 'Viewed', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: Eye },
  paid: { label: 'Paid', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-700', icon: XCircle },
};

const INVOICE_TYPE_ICONS: Record<InvoiceType, any> = {
  standard: FileText,
  proforma: FileCheck,
  quote: FileText,
  credit_note: FileMinus,
  debit_note: FilePlus,
  receipt: Receipt,
};

export default function MerchantInvoicesPage() {
  const navigate = useNavigate();
  const { business: currentBusiness } = useBusiness();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringInvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<InvoiceType | 'all'>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [sendingInvoice, setSendingInvoice] = useState<string | null>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'invoices' | 'recurring'>('invoices');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    byType: {} as Record<InvoiceType, number>,
    recurringActive: 0,
  });

  useEffect(() => {
    if (currentBusiness?.id) {
      loadData();
    }
  }, [currentBusiness?.id, statusFilter, typeFilter]);

  const loadData = async () => {
    if (!currentBusiness?.id) return;

    setLoading(true);

    // Load invoices
    let data = await invoiceService.getBusinessInvoices(
      currentBusiness.id,
      statusFilter === 'all' ? undefined : statusFilter
    );

    // Filter by type if selected
    if (typeFilter !== 'all') {
      data = data.filter(inv => (inv.invoice_type || 'standard') === typeFilter);
    }

    setInvoices(data);

    // Load stats
    const invoiceStats = await invoiceService.getInvoiceStats(currentBusiness.id);
    setStats(invoiceStats);

    // Load recurring templates
    const templates = await invoiceService.getRecurringTemplates(currentBusiness.id);
    setRecurringTemplates(templates);

    setLoading(false);
  };

  const handleSendInvoice = async (invoiceId: string) => {
    setSendingInvoice(invoiceId);
    await invoiceService.sendInvoice(invoiceId);
    await loadData();
    setSendingInvoice(null);
    setMenuOpen(null);
  };

  const handleCopyPaymentLink = async (invoice: Invoice) => {
    let url: string | undefined = invoice.payment_url || undefined;
    if (!url) {
      url = await invoiceService.generatePaymentLink(invoice.id) || undefined;
    }
    if (url) {
      navigator.clipboard.writeText(url);
      alert('Payment link copied!');
    }
    setMenuOpen(null);
  };

  const handleDuplicate = async (invoiceId: string) => {
    const { invoice } = await invoiceService.duplicateInvoice(invoiceId);
    if (invoice) {
      navigate(`/merchant/invoices/${invoice.id}`);
    }
    setMenuOpen(null);
  };

  const handleConvertToInvoice = async (invoiceId: string) => {
    const { invoice } = await invoiceService.convertToInvoice(invoiceId);
    if (invoice) {
      navigate(`/merchant/invoices/${invoice.id}`);
    }
    setMenuOpen(null);
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      invoice.invoice_number?.toLowerCase().includes(query) ||
      invoice.customer_name?.toLowerCase().includes(query) ||
      invoice.customer_email?.toLowerCase().includes(query) ||
      invoice.title?.toLowerCase().includes(query)
    );
  });

  const formatCurrency = (amount: number, currency = 'SLE') => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  return (
    <MerchantLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Create and manage invoices, quotes, and billing
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/merchant/invoices/settings')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
            <div className="relative">
              <button
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-5 h-5" />
                New Invoice
                <ChevronDown className="w-4 h-4" />
              </button>

              {showTypeDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowTypeDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20">
                    <div className="p-2">
                      {(Object.keys(INVOICE_TYPE_CONFIG) as InvoiceType[]).map(type => {
                        const config = INVOICE_TYPE_CONFIG[type];
                        const Icon = INVOICE_TYPE_ICONS[type];
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              setShowTypeDropdown(false);
                              navigate(`/merchant/invoices/new?type=${type}`);
                            }}
                            className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                          >
                            <Icon className="w-5 h-5 mt-0.5 text-gray-500 dark:text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">{config.label}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{config.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                      <button
                        onClick={() => {
                          setShowTypeDropdown(false);
                          navigate('/merchant/invoices/recurring/new');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                      >
                        <Repeat className="w-5 h-5 text-primary-500" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">Recurring Invoice</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Auto-generate on schedule</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.draft + stats.sent}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Paid</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.paid}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.overdue}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Repeat className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Recurring</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.recurringActive}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100">Total Invoiced</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-primary-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Collected</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.paidAmount)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Outstanding</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.pendingAmount)}</p>
              </div>
              <Clock className="w-10 h-10 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'invoices'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All Invoices
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'recurring'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Recurring ({recurringTemplates.length})
          </button>
        </div>

        {activeTab === 'invoices' ? (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search invoices..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {/* Status filter */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        statusFilter === status
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {status === 'all' ? 'All' : STATUS_CONFIG[status].label}
                    </button>
                  ))}
                </div>

                {/* Type filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as InvoiceType | 'all')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">All Types</option>
                  {(Object.keys(INVOICE_TYPE_CONFIG) as InvoiceType[]).map(type => (
                    <option key={type} value={type}>{INVOICE_TYPE_CONFIG[type].label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No invoices found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {searchQuery ? 'Try a different search term' : 'Create your first invoice to get started'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => navigate('/merchant/invoices/new')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      <Plus className="w-5 h-5" />
                      Create Invoice
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Invoice
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Due Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredInvoices.map((invoice) => {
                        const statusConfig = STATUS_CONFIG[invoice.status];
                        const StatusIcon = statusConfig.icon;
                        const invoiceType = (invoice.invoice_type || 'standard') as InvoiceType;
                        const typeConfig = INVOICE_TYPE_CONFIG[invoiceType];
                        const TypeIcon = INVOICE_TYPE_ICONS[invoiceType];

                        return (
                          <tr
                            key={invoice.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                            onClick={() => navigate(`/merchant/invoices/${invoice.id}`)}
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                {invoice.is_recurring && (
                                  <Repeat className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                )}
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    #{invoice.invoice_number}
                                  </p>
                                  {invoice.title && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                      {invoice.title}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-${typeConfig.color}-100 text-${typeConfig.color}-700 dark:bg-${typeConfig.color}-900/30 dark:text-${typeConfig.color}-400`}>
                                <TypeIcon className="w-3 h-3" />
                                {typeConfig.label.split(' ')[0]}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div>
                                <p className="text-gray-900 dark:text-white">
                                  {invoice.customer_name || 'No name'}
                                </p>
                                {invoice.customer_email && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                    {invoice.customer_email}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {formatCurrency(invoice.total_amount, invoice.currency)}
                              </p>
                              {invoice.payment_status === 'partial' && (
                                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                                  Paid: {formatCurrency(invoice.amount_paid, invoice.currency)}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              {invoice.due_date ? (
                                <div>
                                  <p className="text-gray-900 dark:text-white">
                                    {new Date(invoice.due_date).toLocaleDateString()}
                                  </p>
                                  {invoice.status === 'overdue' && (
                                    <p className="text-xs text-red-600 dark:text-red-400">
                                      Overdue
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="relative">
                                <button
                                  onClick={() => setMenuOpen(menuOpen === invoice.id ? null : invoice.id)}
                                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                  <MoreVertical className="w-5 h-5" />
                                </button>

                                {menuOpen === invoice.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                                    <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                                      <div className="py-1">
                                        <button
                                          onClick={() => navigate(`/merchant/invoices/${invoice.id}`)}
                                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                          <Eye className="w-4 h-4" />
                                          View Details
                                        </button>

                                        {invoice.status === 'draft' && (
                                          <button
                                            onClick={() => handleSendInvoice(invoice.id)}
                                            disabled={sendingInvoice === invoice.id}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                          >
                                            {sendingInvoice === invoice.id ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <Send className="w-4 h-4" />
                                            )}
                                            Send Invoice
                                          </button>
                                        )}

                                        <button
                                          onClick={() => handleCopyPaymentLink(invoice)}
                                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                          <LinkIcon className="w-4 h-4" />
                                          Copy Payment Link
                                        </button>

                                        <button
                                          onClick={() => handleDuplicate(invoice.id)}
                                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                          <Copy className="w-4 h-4" />
                                          Duplicate
                                        </button>

                                        {['quote', 'proforma'].includes(invoiceType) && (
                                          <button
                                            onClick={() => handleConvertToInvoice(invoice.id)}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                          >
                                            <ArrowUpRight className="w-4 h-4" />
                                            Convert to Invoice
                                          </button>
                                        )}

                                        <button
                                          onClick={() => {
                                            navigate(`/merchant/invoices/${invoice.id}?print=true`);
                                            setMenuOpen(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                          <Download className="w-4 h-4" />
                                          Download / Print
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Recurring Templates Tab */
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : recurringTemplates.length === 0 ? (
              <div className="text-center py-12">
                <Repeat className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No recurring invoices
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Set up automatic billing for your regular customers
                </p>
                <button
                  onClick={() => navigate('/merchant/invoices/recurring/new')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="w-5 h-5" />
                  Create Recurring Invoice
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Template
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Frequency
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Next Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Generated
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {recurringTemplates.map((template) => (
                      <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
                          {template.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              {template.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-gray-900 dark:text-white">{template.customer_name || 'No customer'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <RefreshCw className="w-4 h-4" />
                            {RECURRING_FREQUENCY_CONFIG[template.frequency]?.label || template.frequency}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {template.next_generation_date ? (
                            <p className="text-gray-900 dark:text-white">
                              {new Date(template.next_generation_date).toLocaleDateString()}
                            </p>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-gray-900 dark:text-white">{template.total_generated}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatCurrency(template.total_amount_billed)}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            template.status === 'active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : template.status === 'paused'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {template.status.charAt(0).toUpperCase() + template.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {template.status === 'active' ? (
                              <button
                                onClick={() => invoiceService.updateRecurringTemplateStatus(template.id, 'paused').then(loadData)}
                                className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg"
                                title="Pause"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            ) : template.status === 'paused' ? (
                              <button
                                onClick={() => invoiceService.updateRecurringTemplateStatus(template.id, 'active').then(loadData)}
                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                                title="Resume"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            ) : null}
                            <button
                              onClick={() => invoiceService.updateRecurringTemplateStatus(template.id, 'cancelled').then(loadData)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </MerchantLayout>
  );
}

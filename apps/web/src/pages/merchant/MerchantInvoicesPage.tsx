/**
 * Merchant Invoices Page
 *
 * Manage invoices - create, view, send, track payments
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
  Mail,
  Loader2,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { invoiceService, Invoice, InvoiceStatus, PaymentStatus } from '@/services/invoice.service';
import { useBusiness } from '@/context/BusinessContext';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: any }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Send },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Eye },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-500', icon: XCircle },
};

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string }> = {
  unpaid: { label: 'Unpaid', color: 'text-gray-600 dark:text-gray-400' },
  partial: { label: 'Partial', color: 'text-yellow-600 dark:text-yellow-400' },
  paid: { label: 'Paid', color: 'text-green-600 dark:text-green-400' },
  overdue: { label: 'Overdue', color: 'text-red-600 dark:text-red-400' },
  cancelled: { label: 'Cancelled', color: 'text-gray-500' },
};

export default function MerchantInvoicesPage() {
  const navigate = useNavigate();
  const { business: currentBusiness } = useBusiness();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [sendingInvoice, setSendingInvoice] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
  });

  useEffect(() => {
    if (currentBusiness?.id) {
      loadInvoices();
    }
  }, [currentBusiness?.id, statusFilter]);

  const loadInvoices = async () => {
    if (!currentBusiness?.id) return;

    setLoading(true);
    const data = await invoiceService.getBusinessInvoices(
      currentBusiness.id,
      statusFilter === 'all' ? undefined : statusFilter
    );
    setInvoices(data);

    // Calculate stats
    const allInvoices = statusFilter === 'all' ? data : await invoiceService.getBusinessInvoices(currentBusiness.id);
    setStats({
      total: allInvoices.length,
      draft: allInvoices.filter(i => i.status === 'draft').length,
      sent: allInvoices.filter(i => i.status === 'sent' || i.status === 'viewed').length,
      paid: allInvoices.filter(i => i.status === 'paid').length,
      overdue: allInvoices.filter(i => i.status === 'overdue').length,
      totalAmount: allInvoices.reduce((sum, i) => sum + i.total_amount, 0),
      paidAmount: allInvoices.filter(i => i.payment_status === 'paid').reduce((sum, i) => sum + i.total_amount, 0),
    });

    setLoading(false);
  };

  const handleSendInvoice = async (invoiceId: string) => {
    setSendingInvoice(invoiceId);
    await invoiceService.sendInvoice(invoiceId);
    await loadInvoices();
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
              Create and manage invoices for your customers
            </p>
          </div>
          <button
            onClick={() => navigate('/merchant/invoices/new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-5 h-5" />
            New Invoice
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>

        {/* Revenue Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100">Total Invoiced</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <DollarSign className="w-12 h-12 text-primary-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Total Collected</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(stats.paidAmount)}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-200" />
            </div>
          </div>
        </div>

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

          <div className="flex gap-2">
            {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {status === 'all' ? 'All' : STATUS_CONFIG[status].label}
              </button>
            ))}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Created
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

                    return (
                      <tr
                        key={invoice.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                        onClick={() => navigate(`/merchant/invoices/${invoice.id}`)}
                      >
                        <td className="px-4 py-4">
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
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-gray-900 dark:text-white">
                              {invoice.customer_name || 'No name'}
                            </p>
                            {invoice.customer_email && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
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
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
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
                        <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(new Date(invoice.created_at))} ago
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
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
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
                                    onClick={() => {/* TODO: Download PDF */}}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Download className="w-4 h-4" />
                                    Download PDF
                                  </button>
                                </div>
                              </div>
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
      </div>
    </MerchantLayout>
  );
}

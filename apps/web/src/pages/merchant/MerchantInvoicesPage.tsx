import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Send,
  Eye,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2,
  DollarSign,
  ChevronDown,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { invoiceService, Invoice, InvoiceStatus } from '@/services/invoice.service';
import { useBusiness } from '@/context/BusinessContext';

export default function MerchantInvoicesPage() {
  const navigate = useNavigate();
  const { business } = useBusiness();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
  });

  useEffect(() => {
    loadInvoices();
  }, [business?.id]);

  const loadInvoices = async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await invoiceService.getBusinessInvoices(business.id);
      setInvoices(data || []);

      // Calculate stats
      let total = 0, draft = 0, sent = 0, paid = 0, overdue = 0;
      let totalAmount = 0, paidAmount = 0, pendingAmount = 0;

      for (const inv of data || []) {
        total++;
        totalAmount += inv.total_amount || 0;

        if (inv.status === 'draft') draft++;
        else if (inv.status === 'sent' || inv.status === 'viewed') sent++;
        else if (inv.status === 'paid') {
          paid++;
          paidAmount += inv.total_amount || 0;
        }
        else if (inv.status === 'overdue') {
          overdue++;
          pendingAmount += inv.total_amount || 0;
        }

        if (inv.status !== 'paid' && inv.status !== 'cancelled') {
          pendingAmount += inv.total_amount || 0;
        }
      }

      setStats({ total, draft, sent, paid, overdue, totalAmount, paidAmount, pendingAmount });
    } catch (err) {
      console.error('Failed to load invoices:', err);
    }
    setLoading(false);
  };

  const handleSendInvoice = async (id: string) => {
    await invoiceService.sendInvoice(id);
    loadInvoices();
    setMenuOpen(null);
  };

  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (typeFilter !== 'all' && (inv.invoice_type || 'standard') !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.customer_email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatCurrency = (amount: number) => `SLE ${(amount || 0).toLocaleString()}`;

  const getStatusBadge = (status: InvoiceStatus) => {
    const config: Record<string, { bg: string; text: string; icon: any }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText },
      sent: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Send },
      viewed: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Eye },
      paid: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', icon: XCircle },
    };
    const c = config[status] || config.draft;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const invoiceTypes = [
    { id: 'standard', label: 'Standard Invoice', desc: 'Regular invoice for goods/services' },
    { id: 'proforma', label: 'Proforma Invoice', desc: 'Preliminary invoice' },
    { id: 'quote', label: 'Quote / Estimate', desc: 'Price quote for work' },
    { id: 'credit_note', label: 'Credit Note', desc: 'Credit for refunds' },
    { id: 'debit_note', label: 'Debit Note', desc: 'Additional charges' },
    { id: 'receipt', label: 'Receipt', desc: 'Proof of payment' },
  ];

  return (
    <MerchantLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
            <p className="text-gray-600 dark:text-gray-400">Create and manage invoices</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowNewMenu(!showNewMenu)}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              <Plus className="w-5 h-5" />
              New Invoice
              <ChevronDown className="w-4 h-4" />
            </button>

            {showNewMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNewMenu(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden">
                  {invoiceTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => {
                        setShowNewMenu(false);
                        navigate(`/merchant/invoices/new?type=${type.id}`);
                      }}
                      className="w-full flex flex-col px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">{type.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{type.desc}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.draft + stats.sent}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Paid</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.paid}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.overdue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white">
            <p className="text-blue-100 text-sm">Total Invoiced</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalAmount)}</p>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-5 text-white">
            <p className="text-green-100 text-sm">Collected</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.paidAmount)}</p>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-5 text-white">
            <p className="text-orange-100 text-sm">Outstanding</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.pendingAmount)}</p>
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
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            {invoiceTypes.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Invoice List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No invoices found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {searchQuery ? 'Try a different search' : 'Create your first invoice to get started'}
              </p>
              <button
                onClick={() => navigate('/merchant/invoices/new')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                <Plus className="w-5 h-5" />
                Create Invoice
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Due Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => navigate(`/merchant/invoices/${invoice.id}`)}
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">#{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {(invoice.invoice_type || 'standard').replace('_', ' ')}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-gray-900 dark:text-white">{invoice.customer_name || 'No name'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.customer_email || ''}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(invoice.total_amount)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-4 py-4">
                        {invoice.due_date ? (
                          <p className="text-gray-900 dark:text-white">
                            {new Date(invoice.due_date).toLocaleDateString()}
                          </p>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block">
                          <button
                            onClick={() => setMenuOpen(menuOpen === invoice.id ? null : invoice.id)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-500" />
                          </button>
                          {menuOpen === invoice.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                                <button
                                  onClick={() => navigate(`/merchant/invoices/${invoice.id}`)}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>
                                {invoice.status === 'draft' && (
                                  <button
                                    onClick={() => handleSendInvoice(invoice.id)}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Send className="w-4 h-4" />
                                    Send Invoice
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MerchantLayout>
  );
}

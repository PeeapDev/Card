import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SchoolLayout } from '@/components/school';
import {
  FileText,
  Search,
  Plus,
  Download,
  Send,
  Printer,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Calendar,
  User,
  MoreVertical,
  Copy,
  Mail,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  recipient: {
    name: string;
    email?: string;
    phone?: string;
    type: 'student' | 'parent' | 'vendor' | 'other';
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  notes?: string;
}

export function SchoolInvoicesPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get school domain from localStorage
  const getSchoolDomain = () => {
    const schoolDomain = localStorage.getItem('school_domain');
    const schoolId = localStorage.getItem('schoolId');
    return schoolDomain || schoolId || null;
  };

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);

    try {
      const schoolDomain = getSchoolDomain();
      if (!schoolDomain) {
        setError('School information not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Try to fetch invoices from SDSL2 sync API
      let data: any = null;
      try {
        const response = await fetch(
          `https://${schoolDomain}.gov.school.edu.sl/api/peeap/sync/invoices`,
          {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          }
        );

        if (response.ok) {
          data = await response.json();
        }
      } catch (apiErr) {
        console.log('SaaS API not available:', apiErr);
      }

      if (data) {
        const invoiceList = (data.invoices || data || []).map((inv: any) => {
          // Calculate status based on dates and payment
          let status: Invoice['status'] = 'draft';
          if (inv.status) {
            status = inv.status;
          } else if (inv.paid_amount >= inv.total_amount) {
            status = 'paid';
          } else if (inv.sent_at && new Date(inv.due_date) < new Date()) {
            status = 'overdue';
          } else if (inv.sent_at) {
            status = 'sent';
          }

          return {
            id: inv.id,
            invoiceNumber: inv.invoice_number || inv.reference || `INV-${inv.id}`,
            recipient: {
              name: inv.recipient_name || inv.student_name || inv.parent_name || 'Unknown',
              email: inv.recipient_email || inv.email,
              phone: inv.recipient_phone || inv.phone,
              type: inv.recipient_type || 'parent',
            },
            items: (inv.items || inv.line_items || []).map((item: any) => ({
              description: item.description || item.name,
              quantity: item.quantity || 1,
              unitPrice: item.unit_price || item.amount,
              total: item.total || item.amount,
            })),
            subtotal: inv.subtotal || inv.total_amount,
            tax: inv.tax || 0,
            total: inv.total || inv.total_amount,
            status,
            issueDate: inv.issue_date || inv.created_at,
            dueDate: inv.due_date,
            paidDate: inv.paid_date || inv.paid_at,
            notes: inv.notes,
          };
        });
        setInvoices(invoiceList);
      } else {
        // If SaaS API fails, show empty state
        setInvoices([]);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Could not load invoices. The school system sync may not be configured yet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'sent':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'draft':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'overdue':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-500';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'sent':
        return <Send className="h-4 w-4" />;
      case 'draft':
        return <FileText className="h-4 w-4" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.recipient.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || invoice.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === 'draft').length,
    sent: invoices.filter((i) => i.status === 'sent').length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
    totalAmount: invoices.reduce((sum, i) => sum + i.total, 0),
    paidAmount: invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.total, 0),
    pendingAmount: invoices
      .filter((i) => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.total, 0)
  };

  return (
    <SchoolLayout>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Invoices</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create and manage invoices
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={fetchInvoices}
            className="ml-auto text-red-600 hover:text-red-700 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      )}

      {!loading && !error && (
      <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Invoices</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Paid</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(stats.paidAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                {formatCurrency(stats.pendingAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex overflow-x-auto">
            {[
              { id: 'all', label: 'All', count: stats.total },
              { id: 'draft', label: 'Draft', count: stats.draft },
              { id: 'sent', label: 'Sent', count: stats.sent },
              { id: 'paid', label: 'Paid', count: stats.paid },
              { id: 'overdue', label: 'Overdue', count: stats.overdue }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 whitespace-nowrap ${
                  selectedStatus === tab.id
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    selectedStatus === tab.id
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices by number or recipient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Invoice List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
              onClick={() => setSelectedInvoice(invoice)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {invoice.invoiceNumber}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {getStatusIcon(invoice.status)}
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <User className="h-4 w-4" />
                        {invoice.recipient.name}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        Due: {formatDate(invoice.dueDate)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(invoice.total)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {invoice.items.length} item{invoice.items.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No invoices found</p>
            <p className="text-sm text-gray-400 mt-1">Invoices from your school system will appear here</p>
          </div>
        )}
      </div>
      </>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl m-4 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedInvoice.invoiceNumber}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusColor(
                    selectedInvoice.status
                  )}`}
                >
                  {getStatusIcon(selectedInvoice.status)}
                  {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <Copy className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <Printer className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Recipient Info */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Bill To</h4>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedInvoice.recipient.name}
                </p>
                {selectedInvoice.recipient.email && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedInvoice.recipient.email}
                  </p>
                )}
                {selectedInvoice.recipient.phone && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedInvoice.recipient.phone}
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Issue Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(selectedInvoice.issueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(selectedInvoice.dueDate)}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                        Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {item.description}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-right">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-right">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatCurrency(selectedInvoice.subtotal)}
                  </span>
                </div>
                {selectedInvoice.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Tax (15%)</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(selectedInvoice.tax)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatCurrency(selectedInvoice.total)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {selectedInvoice.status === 'draft' && (
                  <>
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                      <Send className="h-4 w-4" />
                      Send Invoice
                    </button>
                    <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                      Edit
                    </button>
                  </>
                )}
                {selectedInvoice.status === 'sent' && (
                  <>
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      <CheckCircle className="h-4 w-4" />
                      Mark as Paid
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <Mail className="h-4 w-4" />
                      Resend
                    </button>
                  </>
                )}
                {selectedInvoice.status === 'overdue' && (
                  <>
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      <CheckCircle className="h-4 w-4" />
                      Mark as Paid
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50">
                      <AlertCircle className="h-4 w-4" />
                      Send Reminder
                    </button>
                  </>
                )}
                {selectedInvoice.status === 'paid' && (
                  <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                    Paid on {formatDate(selectedInvoice.paidDate!)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg m-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Invoice
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recipient Type
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option>Parent/Guardian</option>
                  <option>Student</option>
                  <option>Vendor</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  placeholder="Enter name"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  You can add line items after creating the invoice.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}

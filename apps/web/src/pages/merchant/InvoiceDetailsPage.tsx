/**
 * Invoice Details Page
 *
 * View, edit, and manage a single invoice
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Send,
  Download,
  Link as LinkIcon,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Loader2,
  Copy,
  Edit,
  Trash2,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { invoiceService, Invoice, InvoiceStatus } from '@/services/invoice.service';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bgColor: string; icon: any }> = {
  draft: { label: 'Draft', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-700', icon: FileText },
  sent: { label: 'Sent', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: Send },
  viewed: { label: 'Viewed', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: Eye },
  paid: { label: 'Paid', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-700', icon: XCircle },
};

export default function InvoiceDetailsPage() {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId]);

  const loadInvoice = async () => {
    if (!invoiceId) return;

    setLoading(true);
    const data = await invoiceService.getInvoice(invoiceId);
    setInvoice(data);
    setLoading(false);
  };

  const handleSendInvoice = async () => {
    if (!invoice) return;

    setSending(true);
    await invoiceService.sendInvoice(invoice.id);
    await loadInvoice();
    setSending(false);
  };

  const handleCopyPaymentLink = async () => {
    if (!invoice) return;

    let url: string | undefined = invoice.payment_url || undefined;
    if (!url) {
      url = await invoiceService.generatePaymentLink(invoice.id) || undefined;
    }
    if (url) {
      navigator.clipboard.writeText(url);
      alert('Payment link copied to clipboard!');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;

    await invoiceService.markAsPaid(invoice.id);
    await loadInvoice();
    setMenuOpen(false);
  };

  const formatCurrency = (amount: number, currency = 'SLE') => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MerchantLayout>
    );
  }

  if (!invoice) {
    return (
      <MerchantLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Invoice not found
            </h3>
            <button
              onClick={() => navigate('/merchant/invoices')}
              className="text-primary-600 hover:text-primary-700"
            >
              Back to Invoices
            </button>
          </div>
        </div>
      </MerchantLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[invoice.status];
  const StatusIcon = statusConfig.icon;

  return (
    <MerchantLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/merchant/invoices')}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Invoice #{invoice.invoice_number}
                </h1>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig.label}
                </span>
              </div>
              {invoice.title && (
                <p className="text-gray-600 dark:text-gray-400">{invoice.title}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {invoice.status === 'draft' && (
              <button
                onClick={handleSendInvoice}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Invoice
              </button>
            )}

            <button
              onClick={handleCopyPaymentLink}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <LinkIcon className="w-4 h-4" />
              Copy Link
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                  <div className="py-1">
                    {invoice.status !== 'paid' && (
                      <button
                        onClick={handleMarkAsPaid}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark as Paid
                      </button>
                    )}
                    <button
                      onClick={() => {/* TODO */}}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                    <button
                      onClick={() => {/* TODO */}}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Copy className="w-4 h-4" />
                      Duplicate Invoice
                    </button>
                    {invoice.status === 'draft' && (
                      <button
                        onClick={() => {/* TODO */}}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Invoice
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Dates */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Bill To</h3>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {invoice.customer_name || 'No name'}
                  </p>
                  {invoice.customer_email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <Mail className="w-4 h-4" />
                      {invoice.customer_email}
                    </div>
                  )}
                  {invoice.customer_phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <Phone className="w-4 h-4" />
                      {invoice.customer_phone}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="mb-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Issue Date</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(invoice.issue_date).toLocaleDateString()}
                    </p>
                  </div>
                  {invoice.due_date && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
                      <p className={`font-medium ${
                        invoice.status === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                      }`}>
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Line Items</h3>
              </div>

              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Item
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {invoice.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-900 dark:text-white">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900 dark:text-white">
                        {formatCurrency(item.unit_price, invoice.currency)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(item.total, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatCurrency(invoice.subtotal, invoice.currency)}
                  </span>
                </div>
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Tax ({invoice.tax_rate}%)</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(invoice.tax_amount, invoice.currency)}
                    </span>
                  </div>
                )}
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Discount</span>
                    <span className="text-green-600 dark:text-green-400">
                      -{formatCurrency(invoice.discount_amount, invoice.currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                  <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                  <span className="font-bold text-xl text-gray-900 dark:text-white">
                    {formatCurrency(invoice.total_amount, invoice.currency)}
                  </span>
                </div>
                {invoice.payment_status === 'partial' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Amount Paid</span>
                      <span className="text-green-600 dark:text-green-400">
                        -{formatCurrency(invoice.amount_paid, invoice.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">Balance Due</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(invoice.total_amount - invoice.amount_paid, invoice.currency)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Notes */}
            {(invoice.notes || invoice.terms) && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                {invoice.notes && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</h3>
                    <p className="text-gray-900 dark:text-white">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Terms</h3>
                    <p className="text-gray-900 dark:text-white">{invoice.terms}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Payment Info</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Amount Due</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(
                      invoice.total_amount - invoice.amount_paid,
                      invoice.currency
                    )}
                  </p>
                </div>

                {invoice.payment_url && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Payment Link</p>
                    <a
                      href={invoice.payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Payment Page
                    </a>
                  </div>
                )}

                {invoice.paid_at && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Paid On</p>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(invoice.paid_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Activity</h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">Invoice created</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(invoice.created_at))} ago
                    </p>
                  </div>
                </div>

                {invoice.sent_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">Invoice sent</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(invoice.sent_at))} ago
                      </p>
                    </div>
                  </div>
                )}

                {invoice.viewed_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">Invoice viewed</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(invoice.viewed_at))} ago
                      </p>
                    </div>
                  </div>
                )}

                {invoice.paid_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">Payment received</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(invoice.paid_at))} ago
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
}

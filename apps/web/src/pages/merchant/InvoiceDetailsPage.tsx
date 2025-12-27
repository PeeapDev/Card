import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Copy,
  Printer,
  Share2,
  Trash2,
  Eye,
} from 'lucide-react';
import QRCode from 'qrcode';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { invoiceService, Invoice, InvoiceStatus } from '@/services/invoice.service';

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await invoiceService.getInvoice(id);
      setInvoice(data);

      if (data) {
        // Generate payment URL
        const url = data.payment_url || await invoiceService.generatePaymentLink(id);
        if (url) {
          setPaymentUrl(url);
          // Generate QR code
          const qr = await QRCode.toDataURL(url, { width: 200, margin: 2 });
          setQrCodeUrl(qr);
        }
      }
    } catch (err) {
      console.error('Failed to load invoice:', err);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!id) return;
    setActionLoading('send');
    await invoiceService.sendInvoice(id);
    await loadInvoice();
    setActionLoading(null);
  };

  const handleMarkPaid = async () => {
    if (!id) return;
    setActionLoading('paid');
    await invoiceService.markAsPaid(id);
    await loadInvoice();
    setActionLoading(null);
  };

  const handleCancel = async () => {
    if (!id || !confirm('Are you sure you want to cancel this invoice?')) return;
    setActionLoading('cancel');
    await invoiceService.cancelInvoice(id);
    await loadInvoice();
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this invoice?')) return;
    setActionLoading('delete');
    await invoiceService.deleteInvoice(id);
    navigate('/merchant/invoices');
  };

  const handleCopyLink = () => {
    if (paymentUrl) {
      navigator.clipboard.writeText(paymentUrl);
      alert('Payment link copied!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share && paymentUrl) {
      try {
        await navigator.share({
          title: `Invoice #${invoice?.invoice_number}`,
          text: `Pay your invoice of SLE ${invoice?.total_amount?.toLocaleString()}`,
          url: paymentUrl,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const getStatusConfig = (status: InvoiceStatus) => {
    const config: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText, label: 'Draft' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Send, label: 'Sent' },
      viewed: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Eye, label: 'Viewed' },
      paid: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Paid' },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle, label: 'Overdue' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', icon: XCircle, label: 'Cancelled' },
    };
    return config[status] || config.draft;
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </MerchantLayout>
    );
  }

  if (!invoice) {
    return (
      <MerchantLayout>
        <div className="p-6 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Invoice not found</h2>
          <button
            onClick={() => navigate('/merchant/invoices')}
            className="text-green-600 hover:underline"
          >
            Back to Invoices
          </button>
        </div>
      </MerchantLayout>
    );
  }

  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;

  return (
    <MerchantLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/merchant/invoices')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Invoice #{invoice.invoice_number}
                </h1>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 capitalize">
                {(invoice.invoice_type || 'standard').replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {invoice.status === 'draft' && (
              <button
                onClick={handleSend}
                disabled={actionLoading === 'send'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </button>
            )}
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <button
                onClick={handleMarkPaid}
                disabled={actionLoading === 'paid'}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading === 'paid' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Mark Paid
              </button>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Invoice */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Card - Printable */}
            <div ref={printRef} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 print:shadow-none print:border-0">
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">INVOICE</h2>
                  <p className="text-gray-600 dark:text-gray-400">#{invoice.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{invoice.business_name || 'Your Business'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(invoice.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Bill To:</p>
                <p className="font-semibold text-gray-900 dark:text-white">{invoice.customer_name}</p>
                {invoice.customer_email && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {invoice.customer_email}
                  </p>
                )}
                {invoice.customer_phone && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {invoice.customer_phone}
                  </p>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full mb-6">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Item</th>
                    <th className="text-center py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Qty</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Price</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                        )}
                      </td>
                      <td className="py-3 text-center text-gray-700 dark:text-gray-300">{item.quantity}</td>
                      <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                        SLE {item.unit_price?.toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                        SLE {item.total?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="text-gray-900 dark:text-white">SLE {invoice.subtotal?.toLocaleString()}</span>
                  </div>
                  {invoice.tax_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Tax ({invoice.tax_rate}%)</span>
                      <span className="text-gray-900 dark:text-white">SLE {invoice.tax_amount?.toLocaleString()}</span>
                    </div>
                  )}
                  {invoice.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Discount</span>
                      <span className="text-red-600">-SLE {invoice.discount_amount?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-green-600">SLE {invoice.total_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Due Date & Notes */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                {invoice.due_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <Calendar className="w-4 h-4" />
                    <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                  </div>
                )}
                {invoice.notes && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="font-medium mb-1">Notes:</p>
                    <p>{invoice.notes}</p>
                  </div>
                )}
              </div>

              {/* QR Code for Print */}
              {qrCodeUrl && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4">
                  <img src={qrCodeUrl} alt="Payment QR Code" className="w-24 h-24" />
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="font-medium text-gray-900 dark:text-white">Scan to Pay</p>
                    <p>Use your phone camera to scan this QR code and pay this invoice instantly.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Link Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Payment Link</h3>

              {qrCodeUrl && (
                <div className="flex justify-center mb-4">
                  <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 rounded-lg" />
                </div>
              )}

              {paymentUrl && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <input
                      type="text"
                      value={paymentUrl}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none truncate"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Share2 className="w-4 h-4" />
                Share Payment Link
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={handlePrint}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                >
                  <Printer className="w-4 h-4" />
                  Print Invoice
                </button>
                {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading === 'cancel'}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    {actionLoading === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Cancel Invoice
                  </button>
                )}
                {invoice.status === 'draft' && (
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading === 'delete'}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    {actionLoading === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete Invoice
                  </button>
                )}
              </div>
            </div>

            {/* Payment Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Payment Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
                  <span className="font-medium text-gray-900 dark:text-white">SLE {invoice.total_amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Amount Paid</span>
                  <span className="font-medium text-green-600">SLE {(invoice.amount_paid || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Balance Due</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    SLE {(invoice.total_amount - (invoice.amount_paid || 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:shadow-none, .print\\:shadow-none * { visibility: visible; }
          .print\\:shadow-none { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </MerchantLayout>
  );
}

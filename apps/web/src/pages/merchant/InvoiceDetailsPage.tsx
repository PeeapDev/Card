/**
 * Invoice Details Page
 *
 * View and manage invoice with:
 * - Full invoice details and items
 * - QR code for payment
 * - Payment link sharing
 * - Print/Download functionality
 * - Invoice actions (send, cancel, mark paid)
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Send,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Download,
  Link as LinkIcon,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Copy,
  Printer,
  QrCode,
  ExternalLink,
  Trash2,
  MoreVertical,
  FileCheck,
  FileMinus,
  FilePlus,
  Receipt,
  Repeat,
  Share2,
  DollarSign,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import {
  invoiceService,
  Invoice,
  InvoiceStatus,
  InvoiceType,
  INVOICE_TYPE_CONFIG,
} from '@/services/invoice.service';
import { useBusiness } from '@/context/BusinessContext';
import QRCode from 'qrcode';

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

export default function InvoiceDetailsPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { business: currentBusiness } = useBusiness();
  const printRef = useRef<HTMLDivElement>(null);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPrintView, setShowPrintView] = useState(searchParams.get('print') === 'true');
  const [markingPaid, setMarkingPaid] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

    if (data) {
      let url = data.payment_url;
      if (!url) {
        url = await invoiceService.generatePaymentLink(invoiceId) || '';
      }
      if (url) {
        setPaymentUrl(url);
        try {
          const qr = await QRCode.toDataURL(url, {
            width: 200,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
            errorCorrectionLevel: 'H',
          });
          setQrCodeUrl(qr);
        } catch (err) {
          console.error('Failed to generate QR code:', err);
        }
      }
    }

    setLoading(false);
  };

  const handleSend = async () => {
    if (!invoiceId) return;
    setSending(true);
    await invoiceService.sendInvoice(invoiceId);
    await loadInvoice();
    setSending(false);
  };

  const handleMarkPaid = async () => {
    if (!invoiceId || !invoice) return;
    setMarkingPaid(true);
    await invoiceService.markAsPaid(invoiceId, invoice.total_amount);
    await loadInvoice();
    setMarkingPaid(false);
    setMenuOpen(false);
  };

  const handleCancel = async () => {
    if (!invoiceId) return;
    if (!confirm('Are you sure you want to cancel this invoice?')) return;
    setCancelling(true);
    await invoiceService.cancelInvoice(invoiceId);
    await loadInvoice();
    setCancelling(false);
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    if (!invoiceId) return;
    if (!confirm('Are you sure you want to delete this invoice? This cannot be undone.')) return;
    const success = await invoiceService.deleteInvoice(invoiceId);
    if (success) {
      navigate('/merchant/invoices');
    } else {
      alert('Failed to delete invoice. Only draft invoices can be deleted.');
    }
    setMenuOpen(false);
  };

  const handleCopyLink = () => {
    if (paymentUrl) {
      navigator.clipboard.writeText(paymentUrl);
      alert('Payment link copied to clipboard!');
    }
  };

  const handlePrint = () => window.print();

  const handleShare = async () => {
    if (paymentUrl && navigator.share) {
      try {
        await navigator.share({
          title: `Invoice #${invoice?.invoice_number}`,
          text: `Pay invoice: ${invoice?.title || invoice?.invoice_number}`,
          url: paymentUrl,
        });
      } catch { handleCopyLink(); }
    } else {
      handleCopyLink();
    }
  };

  const formatCurrency = (amount: number, currency = 'SLE') => `${currency} ${amount.toLocaleString()}`;

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MerchantLayout>
    );
  }

  if (!invoice) {
    return (
      <MerchantLayout>
        <div className="p-6 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Invoice not found</h2>
          <button onClick={() => navigate('/merchant/invoices')} className="text-primary-600 hover:text-primary-700">
            Back to invoices
          </button>
        </div>
      </MerchantLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[invoice.status];
  const StatusIcon = statusConfig.icon;
  const invoiceType = (invoice.invoice_type || 'standard') as InvoiceType;
  const typeConfig = INVOICE_TYPE_CONFIG[invoiceType];
  const TypeIcon = INVOICE_TYPE_ICONS[invoiceType];

  if (showPrintView) {
    return (
      <div className="min-h-screen bg-white print:bg-white">
        <div className="print:hidden fixed top-0 left-0 right-0 bg-gray-900 text-white p-4 z-50 flex items-center justify-between">
          <button onClick={() => setShowPrintView(false)} className="flex items-center gap-2 text-gray-300 hover:text-white">
            <ArrowLeft className="w-5 h-5" />Back
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <Printer className="w-5 h-5" />Print Invoice
          </button>
        </div>

        <div ref={printRef} className="max-w-3xl mx-auto p-8 pt-20 print:pt-8 print:p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{typeConfig.label}</h1>
              <p className="text-gray-600 mt-1">#{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-gray-900">{currentBusiness?.name || 'Your Business'}</div>
              <div className="text-sm text-gray-600 mt-1">
                {currentBusiness?.address && <p>{currentBusiness.address}</p>}
                {currentBusiness?.phone && <p>{currentBusiness.phone}</p>}
                {currentBusiness?.email && <p>{currentBusiness.email}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Bill To</h3>
              <div className="text-gray-900">
                <p className="font-medium">{invoice.customer_name || 'Customer'}</p>
                {invoice.customer_email && <p className="text-sm">{invoice.customer_email}</p>}
                {invoice.customer_phone && <p className="text-sm">{invoice.customer_phone}</p>}
              </div>
            </div>
            <div className="text-right space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Issue Date:</span>
                <span className="text-gray-900">{new Date(invoice.issue_date).toLocaleDateString()}</span>
              </div>
              {invoice.due_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Date:</span>
                  <span className="text-gray-900 font-medium">{new Date(invoice.due_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {invoice.title && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">{invoice.title}</h2>
              {invoice.description && <p className="text-gray-600 mt-1">{invoice.description}</p>}
            </div>
          )}

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="py-3 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                <th className="py-3 text-right text-xs font-semibold text-gray-500 uppercase">Price</th>
                <th className="py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="py-3">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                  </td>
                  <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                  <td className="py-3 text-right text-gray-600">{formatCurrency(item.unit_price, invoice.currency)}</td>
                  <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(item.total || item.quantity * item.unit_price, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              {invoice.tax_rate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax ({invoice.tax_rate}%)</span>
                  <span className="text-gray-900">{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
                </div>
              )}
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-green-600">-{formatCurrency(invoice.discount_amount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t-2 border-gray-200">
                <span className="font-bold text-gray-900">Total Due</span>
                <span className="font-bold text-xl text-gray-900">{formatCurrency(invoice.total_amount, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {paymentUrl && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <div className="flex items-center justify-center mb-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 mb-3">Scan to Pay</p>
                {qrCodeUrl && <img src={qrCodeUrl} alt="Payment QR Code" className="w-36 h-36 mx-auto" />}
                <p className="text-xs text-gray-500 mt-2 max-w-xs break-all">{paymentUrl}</p>
              </div>
            </div>
          )}

          {(invoice.notes || invoice.terms) && (
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-200 text-sm">
              {invoice.notes && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Terms & Conditions</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>Thank you for your business!</p>
            <p className="mt-1">Powered by Peeap</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MerchantLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/merchant/invoices')} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">#{invoice.invoice_number}</h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                  <StatusIcon className="w-3 h-3" />{statusConfig.label}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  <TypeIcon className="w-3 h-3" />{typeConfig.label.split(' ')[0]}
                </span>
                {invoice.is_recurring && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                    <Repeat className="w-3 h-3" />Recurring
                  </span>
                )}
              </div>
              {invoice.title && <p className="text-gray-600 dark:text-gray-400 mt-1">{invoice.title}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {invoice.status === 'draft' && (
              <button onClick={handleSend} disabled={sending} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Send Invoice
              </button>
            )}
            <button onClick={() => setShowPrintView(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <Printer className="w-4 h-4" />Print
            </button>
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <MoreVertical className="w-5 h-5" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                    <div className="py-1">
                      {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                        <button onClick={handleMarkPaid} disabled={markingPaid} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                          {markingPaid ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Mark as Paid
                        </button>
                      )}
                      {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
                        <button onClick={handleCancel} disabled={cancelling} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                          {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}Cancel Invoice
                        </button>
                      )}
                      {invoice.status === 'draft' && (
                        <button onClick={handleDelete} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Trash2 className="w-4 h-4" />Delete Invoice
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Bill To</h3>
                    <p className="font-medium text-gray-900 dark:text-white">{invoice.customer_name || 'No name'}</p>
                    {invoice.customer_email && <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400"><Mail className="w-4 h-4" />{invoice.customer_email}</div>}
                    {invoice.customer_phone && <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400"><Phone className="w-4 h-4" />{invoice.customer_phone}</div>}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />Issue: {new Date(invoice.issue_date).toLocaleDateString()}
                    </div>
                    {invoice.due_date && (
                      <div className={`flex items-center justify-end gap-2 text-sm mt-1 ${invoice.status === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        <Clock className="w-4 h-4" />Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Qty</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {invoice.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                          {item.description && <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">{item.quantity}</td>
                        <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.unit_price, invoice.currency)}</td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(item.total || item.quantity * item.unit_price, invoice.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-400">Subtotal</span><span className="text-gray-900 dark:text-white">{formatCurrency(invoice.subtotal, invoice.currency)}</span></div>
                    {invoice.tax_rate > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-400">Tax ({invoice.tax_rate}%)</span><span className="text-gray-900 dark:text-white">{formatCurrency(invoice.tax_amount, invoice.currency)}</span></div>}
                    {invoice.discount_amount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-400">Discount</span><span className="text-green-600 dark:text-green-400">-{formatCurrency(invoice.discount_amount, invoice.currency)}</span></div>}
                    <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-600"><span className="font-bold text-gray-900 dark:text-white">Total</span><span className="font-bold text-xl text-gray-900 dark:text-white">{formatCurrency(invoice.total_amount, invoice.currency)}</span></div>
                    {invoice.amount_paid > 0 && invoice.amount_paid < invoice.total_amount && (
                      <>
                        <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-400">Paid</span><span className="text-green-600 dark:text-green-400">-{formatCurrency(invoice.amount_paid, invoice.currency)}</span></div>
                        <div className="flex justify-between"><span className="font-semibold text-gray-900 dark:text-white">Balance</span><span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(invoice.total_amount - invoice.amount_paid, invoice.currency)}</span></div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {(invoice.notes || invoice.terms) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invoice.notes && <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"><h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Notes</h3><p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{invoice.notes}</p></div>}
                {invoice.terms && <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"><h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Terms & Conditions</h3><p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{invoice.terms}</p></div>}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4"><QrCode className="w-5 h-5 text-primary-600" /><h3 className="font-semibold text-gray-900 dark:text-white">Payment QR Code</h3></div>
                {qrCodeUrl ? (
                  <div className="text-center">
                    <div className="inline-block p-4 bg-white rounded-lg shadow-inner"><img src={qrCodeUrl} alt="Payment QR Code" className="w-40 h-40" /></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Scan to pay this invoice</p>
                  </div>
                ) : (
                  <div className="text-center py-4"><Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" /><p className="text-sm text-gray-500 mt-2">Generating QR code...</p></div>
                )}
              </div>
            )}

            {paymentUrl && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4"><LinkIcon className="w-5 h-5 text-primary-600" /><h3 className="font-semibold text-gray-900 dark:text-white">Payment Link</h3></div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4"><p className="text-sm text-gray-600 dark:text-gray-400 break-all font-mono">{paymentUrl}</p></div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleCopyLink} className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"><Copy className="w-4 h-4" />Copy</button>
                  <button onClick={handleShare} className="flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"><Share2 className="w-4 h-4" />Share</button>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4"><DollarSign className="w-5 h-5 text-primary-600" /><h3 className="font-semibold text-gray-900 dark:text-white">Payment Status</h3></div>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Total Amount</span><span className="font-medium text-gray-900 dark:text-white">{formatCurrency(invoice.total_amount, invoice.currency)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Amount Paid</span><span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(invoice.amount_paid, invoice.currency)}</span></div>
                <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-900 dark:text-white">Balance Due</span>
                  <span className={`font-bold ${invoice.total_amount - invoice.amount_paid > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(Math.max(0, invoice.total_amount - invoice.amount_paid), invoice.currency)}</span>
                </div>
              </div>
              {invoice.paid_at && <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"><div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"><CheckCircle className="w-4 h-4" />Paid on {new Date(invoice.paid_at).toLocaleDateString()}</div></div>}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Timeline</h3>
              <div className="space-y-4">
                <div className="flex gap-3"><div className="w-2 h-2 mt-2 rounded-full bg-gray-400" /><div><p className="text-sm text-gray-900 dark:text-white">Created</p><p className="text-xs text-gray-500 dark:text-gray-400">{new Date(invoice.created_at).toLocaleString()}</p></div></div>
                {invoice.sent_at && <div className="flex gap-3"><div className="w-2 h-2 mt-2 rounded-full bg-blue-500" /><div><p className="text-sm text-gray-900 dark:text-white">Sent</p><p className="text-xs text-gray-500 dark:text-gray-400">{new Date(invoice.sent_at).toLocaleString()}</p></div></div>}
                {invoice.viewed_at && <div className="flex gap-3"><div className="w-2 h-2 mt-2 rounded-full bg-purple-500" /><div><p className="text-sm text-gray-900 dark:text-white">Viewed</p><p className="text-xs text-gray-500 dark:text-gray-400">{new Date(invoice.viewed_at).toLocaleString()}</p></div></div>}
                {invoice.paid_at && <div className="flex gap-3"><div className="w-2 h-2 mt-2 rounded-full bg-green-500" /><div><p className="text-sm text-gray-900 dark:text-white">Paid</p><p className="text-xs text-gray-500 dark:text-gray-400">{new Date(invoice.paid_at).toLocaleString()}</p></div></div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
}

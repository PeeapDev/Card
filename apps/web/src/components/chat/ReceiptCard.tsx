/**
 * ReceiptCard Component
 *
 * Displays a receipt/transaction within a chat message.
 * Features:
 * - Transaction details
 * - Line items (for POS sales)
 * - Status indicator
 * - Download option
 * - Click to view full receipt in modal
 */

import { useState } from 'react';
import {
  Receipt,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  Smartphone,
  QrCode,
  Download,
  Store,
  Loader2,
  X,
  User,
  Hash,
  FileText,
  Printer,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReceiptData {
  id: string;
  type: 'transaction' | 'pos_sale';
  reference: string;
  amount: number;
  currency: string;
  status: string;
  customer_name?: string;
  customer_email?: string;
  date: string;
  items?: Array<{ name: string; quantity: number; price: number; total: number }>;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total: number;
  payment_method?: string;
  merchant_name?: string;
  metadata?: Record<string, any>;
}

interface ReceiptCardProps {
  receipt: ReceiptData;
  compact?: boolean;
  senderName?: string;
}

export function ReceiptCard({ receipt, compact = false, senderName }: ReceiptCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleViewDetails = () => {
    setShowModal(true);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const receiptContent = generateReceiptText();
      const blob = new Blob([receiptContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receipt.reference}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download receipt:', err);
    }
    setDownloading(false);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt #${receipt.reference}</title>
            <style>
              body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
              .header h1 { margin: 0; font-size: 18px; }
              .header p { margin: 5px 0; font-size: 12px; }
              .section { margin: 10px 0; padding: 10px 0; border-bottom: 1px dashed #ccc; }
              .row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
              .item-name { font-weight: bold; }
              .total-row { font-weight: bold; font-size: 14px; margin-top: 10px; }
              .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
              .status.success { background: #d1fae5; color: #065f46; }
              .status.pending { background: #fef3c7; color: #92400e; }
              .status.failed { background: #fee2e2; color: #991b1b; }
              .footer { text-align: center; margin-top: 20px; font-size: 11px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${receipt.merchant_name || 'Receipt'}</h1>
              <p>Reference: #${receipt.reference}</p>
              <p>${formatDate(receipt.date)}</p>
              <span class="status ${getStatusClass()}">${receipt.status.toUpperCase()}</span>
            </div>
            ${receipt.customer_name ? `
              <div class="section">
                <div class="row"><span>Customer:</span><span>${receipt.customer_name}</span></div>
                ${receipt.customer_email ? `<div class="row"><span>Email:</span><span>${receipt.customer_email}</span></div>` : ''}
              </div>
            ` : ''}
            ${receipt.items && receipt.items.length > 0 ? `
              <div class="section">
                ${receipt.items.map(item => `
                  <div class="row item-name">${item.name}</div>
                  <div class="row"><span>${item.quantity} x ${formatCurrency(item.price)}</span><span>${formatCurrency(item.total)}</span></div>
                `).join('')}
              </div>
              <div class="section">
                ${receipt.subtotal ? `<div class="row"><span>Subtotal</span><span>${formatCurrency(receipt.subtotal)}</span></div>` : ''}
                ${receipt.tax ? `<div class="row"><span>Tax</span><span>${formatCurrency(receipt.tax)}</span></div>` : ''}
                ${receipt.discount ? `<div class="row"><span>Discount</span><span>-${formatCurrency(receipt.discount)}</span></div>` : ''}
              </div>
            ` : ''}
            <div class="total-row row">
              <span>TOTAL</span>
              <span>${formatCurrency(receipt.total)}</span>
            </div>
            ${receipt.payment_method ? `<div class="row"><span>Payment</span><span>${receipt.payment_method}</span></div>` : ''}
            <div class="footer">
              <p>Thank you for your business!</p>
              <p>Powered by PeeAP</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const generateReceiptText = () => {
    const lines = [
      '================================',
      receipt.merchant_name || 'Receipt',
      '================================',
      '',
      `Reference: #${receipt.reference}`,
      `Date: ${formatDate(receipt.date)}`,
      `Status: ${receipt.status.toUpperCase()}`,
      '',
    ];

    if (receipt.customer_name) {
      lines.push(`Customer: ${receipt.customer_name}`);
      if (receipt.customer_email) lines.push(`Email: ${receipt.customer_email}`);
      lines.push('');
    }

    if (receipt.items && receipt.items.length > 0) {
      lines.push('--------------------------------');
      lines.push('Items:');
      receipt.items.forEach(item => {
        lines.push(`  ${item.name}`);
        lines.push(`    ${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(item.total)}`);
      });
      lines.push('--------------------------------');

      if (receipt.subtotal) lines.push(`Subtotal: ${formatCurrency(receipt.subtotal)}`);
      if (receipt.tax) lines.push(`Tax: ${formatCurrency(receipt.tax)}`);
      if (receipt.discount) lines.push(`Discount: -${formatCurrency(receipt.discount)}`);
    }

    lines.push('');
    lines.push(`TOTAL: ${formatCurrency(receipt.total)}`);
    if (receipt.payment_method) lines.push(`Payment: ${receipt.payment_method}`);
    lines.push('');
    lines.push('================================');
    lines.push('Thank you!');
    lines.push('================================');

    return lines.join('\n');
  };

  const getStatusColor = () => {
    switch (receipt.status?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'paid':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'failed':
      case 'cancelled':
      case 'voided':
      case 'refunded':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusClass = () => {
    switch (receipt.status?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'paid':
        return 'success';
      case 'pending':
      case 'processing':
        return 'pending';
      default:
        return 'failed';
    }
  };

  const getStatusIcon = () => {
    switch (receipt.status?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-4 h-4" />;
      case 'failed':
      case 'cancelled':
      case 'voided':
      case 'refunded':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getPaymentMethodIcon = () => {
    const method = receipt.payment_method?.toLowerCase();
    if (method?.includes('card')) return <CreditCard className="w-4 h-4" />;
    if (method?.includes('cash')) return <Banknote className="w-4 h-4" />;
    if (method?.includes('mobile') || method?.includes('momo')) return <Smartphone className="w-4 h-4" />;
    if (method?.includes('qr')) return <QrCode className="w-4 h-4" />;
    return <CreditCard className="w-4 h-4" />;
  };

  const formatCurrency = (amount: number) => {
    return `${receipt.currency} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              #{receipt.reference}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(receipt.date))} ago
              {receipt.customer_name && ` • ${receipt.customer_name}`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {formatCurrency(receipt.total)}
          </p>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${getStatusColor()}`}>
            {receipt.status}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-w-md">
        {/* Header - Clickable to show modal */}
        <button
          onClick={handleViewDetails}
          className="w-full text-left bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30 px-4 py-3 border-b border-orange-200 dark:border-orange-800 hover:from-orange-100 hover:to-orange-150 dark:hover:from-orange-900/30 dark:hover:to-orange-900/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="font-semibold text-orange-900 dark:text-orange-100">
                {receipt.type === 'pos_sale' ? 'Sale' : 'Transaction'} #{receipt.reference}
              </span>
            </div>
            <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}>
              {getStatusIcon()}
              {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
            </span>
          </div>
          {(receipt.merchant_name || senderName) && (
            <div className="flex items-center gap-1 text-sm text-orange-700 dark:text-orange-300 mt-1">
              <Store className="w-4 h-4" />
              {senderName ? `Shared by ${senderName}` : receipt.merchant_name}
            </div>
          )}
        </button>

        {/* Summary */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(receipt.total)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                <Calendar className="w-4 h-4" />
                {formatDate(receipt.date)}
              </p>
            </div>
            {receipt.payment_method && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                {getPaymentMethodIcon()}
                {receipt.payment_method}
              </div>
            )}
          </div>

          {/* Customer */}
          {(receipt.customer_name || receipt.customer_email) && (
            <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Customer</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {receipt.customer_name || 'Guest'}
              </p>
              {receipt.customer_email && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {receipt.customer_email}
                </p>
              )}
            </div>
          )}

          {/* Expandable Line Items */}
          {receipt.items && receipt.items.length > 0 && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-2"
              >
                <span>{receipt.items.length} item(s)</span>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expanded && (
                <div className="space-y-2 py-2 border-t border-gray-100 dark:border-gray-700">
                  {receipt.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.quantity} x {formatCurrency(item.price)}
                        </p>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  ))}

                  <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                    {receipt.subtotal && (
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>Subtotal</span>
                        <span>{formatCurrency(receipt.subtotal)}</span>
                      </div>
                    )}
                    {receipt.tax && receipt.tax > 0 && (
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>Tax</span>
                        <span>{formatCurrency(receipt.tax)}</span>
                      </div>
                    )}
                    {receipt.discount && receipt.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(receipt.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-gray-900 dark:text-white pt-1">
                      <span>Total</span>
                      <span>{formatCurrency(receipt.total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm disabled:opacity-50"
            title="Download Receipt"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download
          </button>
          <button
            onClick={handleViewDetails}
            className="flex items-center justify-center gap-1 px-3 py-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg text-sm font-medium"
            title="View Full Receipt"
          >
            <FileText className="w-4 h-4" />
            View
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{receipt.merchant_name || 'Receipt'}</h2>
                    <p className="text-orange-100 text-sm">#{receipt.reference}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Status Badge */}
              <div className="flex justify-center mb-6">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusColor()}`}>
                  {getStatusIcon()}
                  {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                </span>
              </div>

              {/* Amount */}
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(receipt.total)}
                </p>
                <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(receipt.date)}
                </p>
              </div>

              {/* Details Grid */}
              <div className="space-y-4">
                {/* Transaction ID */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Hash className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Transaction ID</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-white">{receipt.id}</p>
                  </div>
                </div>

                {/* Customer */}
                {(receipt.customer_name || receipt.customer_email) && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Customer</p>
                      <p className="font-medium text-gray-900 dark:text-white">{receipt.customer_name || 'Guest'}</p>
                      {receipt.customer_email && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{receipt.customer_email}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Method */}
                {receipt.payment_method && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    {getPaymentMethodIcon()}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Payment Method</p>
                      <p className="font-medium text-gray-900 dark:text-white">{receipt.payment_method}</p>
                    </div>
                  </div>
                )}

                {/* Line Items */}
                {receipt.items && receipt.items.length > 0 && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">Items ({receipt.items.length})</p>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {receipt.items.map((item, i) => (
                        <div key={i} className="px-4 py-3 flex justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {item.quantity} x {formatCurrency(item.price)}
                            </p>
                          </div>
                          <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.total)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 space-y-2 border-t border-gray-200 dark:border-gray-700">
                      {receipt.subtotal && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                          <span className="text-gray-900 dark:text-white">{formatCurrency(receipt.subtotal)}</span>
                        </div>
                      )}
                      {receipt.tax && receipt.tax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Tax</span>
                          <span className="text-gray-900 dark:text-white">{formatCurrency(receipt.tax)}</span>
                        </div>
                      )}
                      {receipt.discount && receipt.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Discount</span>
                          <span className="text-green-600">-{formatCurrency(receipt.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold pt-2 border-t border-gray-200 dark:border-gray-600">
                        <span className="text-gray-900 dark:text-white">Total</span>
                        <span className="text-gray-900 dark:text-white">{formatCurrency(receipt.total)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Shared By */}
                {senderName && (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <Store className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="text-xs text-orange-600 dark:text-orange-400">Shared by</p>
                      <p className="font-medium text-orange-700 dark:text-orange-300">{senderName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white hover:bg-orange-600 rounded-xl font-medium transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

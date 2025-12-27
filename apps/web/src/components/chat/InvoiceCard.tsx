/**
 * InvoiceCard Component
 *
 * Displays an invoice within a chat message.
 * Features:
 * - Invoice summary
 * - Line items
 * - Pay Now button
 * - Status indicator
 */

import { useState } from 'react';
import {
  FileText,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
} from 'lucide-react';
import { Invoice } from '@/services/invoice.service';
import { formatDistanceToNow } from 'date-fns';

interface InvoiceCardProps {
  invoice: Invoice;
  isOwner?: boolean; // Merchant who created it
  onPay?: () => void;
}

export function InvoiceCard({ invoice, isOwner = false, onPay }: InvoiceCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = () => {
    switch (invoice.payment_status) {
      case 'paid':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'partial':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'overdue':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (invoice.payment_status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return `${invoice.currency} ${amount.toLocaleString()}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-w-md">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-900/30 px-4 py-3 border-b border-primary-200 dark:border-primary-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <span className="font-semibold text-primary-900 dark:text-primary-100">
              Invoice #{invoice.invoice_number}
            </span>
          </div>
          <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}>
            {getStatusIcon()}
            {invoice.payment_status.charAt(0).toUpperCase() + invoice.payment_status.slice(1)}
          </span>
        </div>
        {invoice.title && (
          <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">{invoice.title}</p>
        )}
      </div>

      {/* Summary */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(invoice.total_amount)}
            </p>
            {invoice.due_date && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                <Calendar className="w-4 h-4" />
                Due {new Date(invoice.due_date).toLocaleDateString()}
              </p>
            )}
          </div>
          {invoice.payment_status === 'paid' && invoice.paid_at && (
            <div className="text-right">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Paid</p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(invoice.paid_at))} ago
              </p>
            </div>
          )}
        </div>

        {/* Expandable Line Items */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-2 border-t border-gray-100 dark:border-gray-700"
        >
          <span>{invoice.items?.length || 0} item(s)</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && invoice.items && invoice.items.length > 0 && (
          <div className="space-y-2 py-2 border-t border-gray-100 dark:border-gray-700">
            {invoice.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-gray-900 dark:text-white">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.quantity} x {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(item.total)}
                </span>
              </div>
            ))}

            {/* Totals */}
            <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.tax_amount > 0 && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Tax ({invoice.tax_rate}%)</span>
                  <span>{formatCurrency(invoice.tax_amount)}</span>
                </div>
              )}
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 dark:text-white pt-1">
                <span>Total</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes:</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex gap-2">
        {invoice.payment_status !== 'paid' && !isOwner && (
          <button
            onClick={onPay}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
          >
            <CreditCard className="w-4 h-4" />
            Pay Now
          </button>
        )}

        {invoice.payment_url && (
          <a
            href={invoice.payment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <button
          className="flex items-center justify-center gap-1 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
          title="Download PDF"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

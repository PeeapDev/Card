import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  Loader2,
  Calendar,
  User,
  Mail,
  Phone,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { invoiceService, InvoiceItem, InvoiceType } from '@/services/invoice.service';
import { useBusiness } from '@/context/BusinessContext';

const INVOICE_TYPES: { id: InvoiceType; label: string; desc: string }[] = [
  { id: 'standard', label: 'Standard Invoice', desc: 'Regular invoice' },
  { id: 'proforma', label: 'Proforma Invoice', desc: 'Preliminary invoice' },
  { id: 'quote', label: 'Quote / Estimate', desc: 'Price quote' },
  { id: 'credit_note', label: 'Credit Note', desc: 'Credit/refund' },
  { id: 'debit_note', label: 'Debit Note', desc: 'Additional charges' },
  { id: 'receipt', label: 'Receipt', desc: 'Payment proof' },
];

export default function NewInvoicePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { business } = useBusiness();
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const [invoiceType, setInvoiceType] = useState<InvoiceType>(
    (searchParams.get('type') as InvoiceType) || 'standard'
  );
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  const [items, setItems] = useState<InvoiceItem[]>([
    { name: '', description: '', quantity: 1, unit_price: 0, total: 0 }
  ]);

  const addItem = () => {
    setItems([...items, { name: '', description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discountAmount;

  const handleSave = async (send: boolean = false) => {
    if (!business?.id) {
      alert('No business selected');
      return;
    }

    if (!customerName.trim()) {
      alert('Please enter customer name');
      return;
    }

    if (items.length === 0 || !items[0].name.trim()) {
      alert('Please add at least one item');
      return;
    }

    send ? setSending(true) : setSaving(true);

    try {
      const { invoice, error } = await invoiceService.createInvoice({
        businessId: business.id,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        title: title.trim() || undefined,
        items: items.filter(i => i.name.trim()),
        taxRate,
        discountAmount,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        invoiceType,
      });

      if (error || !invoice) {
        alert(error || 'Failed to create invoice');
        return;
      }

      if (send) {
        await invoiceService.sendInvoice(invoice.id);
      }

      navigate(`/merchant/invoices/${invoice.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
      setSending(false);
    }
  };

  return (
    <MerchantLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/merchant/invoices')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Invoice</h1>
            <p className="text-gray-600 dark:text-gray-400">Create a new invoice for your customer</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Invoice Type */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invoice Type</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {INVOICE_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setInvoiceType(type.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    invoiceType === type.id
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{type.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{type.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+232 76 123456"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Website Development Services"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Items</h2>
              <button
                onClick={addItem}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Item Name</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        placeholder="Product or service name"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Unit Price (SLE)</label>
                      <input
                        type="number"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="text-right pt-6">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      SLE {(item.quantity * item.unit_price).toLocaleString()}
                    </p>
                  </div>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg mt-5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end">
                <div className="w-72 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="text-gray-900 dark:text-white font-medium">SLE {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Tax (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Tax Amount</span>
                      <span className="text-gray-900 dark:text-white">SLE {taxAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Discount (SLE)</span>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-green-600">SLE {total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for the customer..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              onClick={() => navigate('/merchant/invoices')}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving || sending}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save as Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || sending}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Save & Send
            </button>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
}

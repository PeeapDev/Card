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
  RefreshCw,
  MessageSquare,
  Receipt,
  FileCheck,
  Trash2,
  X,
  GraduationCap,
  Link as LinkIcon
} from 'lucide-react';
import { schoolInvoiceService, type Invoice, type InvoiceType, type InvoiceItem } from '@/services/schoolInvoice.service';
import { supabaseAdmin } from '@/lib/supabase';

interface Student {
  id: string;
  indexNumber: string;
  name: string;
  class: string;
  parentUserId?: string;
  parentName?: string;
  email?: string;
  phone?: string;
  hasParentLinked: boolean;
}

export function SchoolInvoicesPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Create invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    type: 'invoice' as InvoiceType,
    studentId: '',
    items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }] as InvoiceItem[],
    dueDate: '',
    notes: '',
    sendViaChat: true,
  });

  const schoolDomain = schoolSlug || localStorage.getItem('school_domain');

  // Fetch students for selection
  const fetchStudents = async () => {
    if (!schoolDomain) return;

    try {
      const response = await fetch(
        `https://${schoolDomain}.gov.school.edu.sl/api/peeap/sync/students?per_page=500`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (response.ok) {
        const result = await response.json();
        const studentList = (result.data || []).map((s: any) => ({
          id: s.id?.toString(),
          indexNumber: s.index_number || s.indexNumber || '',
          name: s.full_name || s.name,
          class: s.class || s.class_name || '',
          parentUserId: s.parent?.peeap_user_id || s.peeap_parent_id,
          parentName: s.parent?.guardian_name,
          email: s.email || s.parent?.guardian_email,
          phone: s.phone || s.parent?.guardian_phone,
          hasParentLinked: false,
        }));

        // Lookup parent links from Peeap database
        const indexNumbers = studentList.map((s: Student) => s.indexNumber).filter(Boolean);
        if (indexNumbers.length > 0) {
          try {
            const { data: studentAccounts } = await supabaseAdmin
              .from('student_accounts')
              .select('id, index_number')
              .in('index_number', indexNumbers);

            if (studentAccounts && studentAccounts.length > 0) {
              const accountIds = studentAccounts.map(sa => sa.id);
              const { data: parentLinks } = await supabaseAdmin
                .from('parent_student_links')
                .select('student_account_id, parent_user_id')
                .in('student_account_id', accountIds)
                .eq('is_active', true);

              // Create a map of index_number -> parent_user_id
              const parentMap = new Map<string, string>();
              for (const link of parentLinks || []) {
                const account = studentAccounts.find(sa => sa.id === link.student_account_id);
                if (account) {
                  parentMap.set(account.index_number, link.parent_user_id);
                }
              }

              // Update student list with parent info
              for (const student of studentList) {
                const parentId = parentMap.get(student.indexNumber);
                if (parentId) {
                  student.parentUserId = parentId;
                  student.hasParentLinked = true;
                }
              }
            }
          } catch (err) {
            console.log('Could not lookup parent links:', err);
          }
        }

        setStudents(studentList);
      }
    } catch (err) {
      console.log('Could not fetch students:', err);
    }
  };

  // Fetch invoices
  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!schoolDomain) {
        setError('School information not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Try to fetch from SaaS API first
      try {
        const response = await fetch(
          `https://${schoolDomain}.gov.school.edu.sl/api/peeap/sync/invoices`,
          { headers: { 'Accept': 'application/json' } }
        );

        if (response.ok) {
          const data = await response.json();
          const invoiceList = (data.invoices || data.data || []).map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoice_number || `INV-${inv.id}`,
            schoolId: schoolDomain,
            type: inv.type || 'invoice',
            recipient: {
              type: inv.recipient_type || 'student',
              studentId: inv.student_id,
              name: inv.recipient_name || inv.student_name || 'Unknown',
              email: inv.recipient_email,
              phone: inv.recipient_phone,
            },
            items: inv.items || [],
            subtotal: inv.subtotal || inv.total_amount || 0,
            tax: inv.tax || 0,
            total: inv.total || inv.total_amount || 0,
            status: inv.status || (inv.paid_at ? 'paid' : 'sent'),
            issueDate: inv.issue_date || inv.created_at,
            dueDate: inv.due_date,
            paidDate: inv.paid_date || inv.paid_at,
            paidAmount: inv.paid_amount || 0,
            notes: inv.notes,
            createdAt: inv.created_at,
            updatedAt: inv.updated_at,
          }));
          setInvoices(invoiceList);
          return;
        }
      } catch (apiErr) {
        console.log('SaaS API not available:', apiErr);
      }

      setInvoices([]);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Could not load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchStudents();
  }, [schoolDomain]);

  // Handle item changes
  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...invoiceForm.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate total
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
    }

    setInvoiceForm({ ...invoiceForm, items: newItems });
  };

  const addItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }],
    });
  };

  const removeItem = (index: number) => {
    if (invoiceForm.items.length > 1) {
      setInvoiceForm({
        ...invoiceForm,
        items: invoiceForm.items.filter((_, i) => i !== index),
      });
    }
  };

  // Create invoice
  const handleCreateInvoice = async () => {
    const selectedStudent = students.find(s => s.id === invoiceForm.studentId);
    if (!selectedStudent) {
      alert('Please select a student');
      return;
    }

    if (invoiceForm.items.some(item => !item.description || item.total <= 0)) {
      alert('Please fill in all item details');
      return;
    }

    if (invoiceForm.sendViaChat && !selectedStudent.parentUserId) {
      alert('This student does not have a parent linked in Peeap. The invoice will be saved but cannot be sent via chat.');
    }

    setSending(true);
    try {
      await schoolInvoiceService.createInvoice({
        schoolId: schoolDomain!,
        type: invoiceForm.type,
        recipient: {
          type: 'student',
          studentId: selectedStudent.indexNumber || selectedStudent.id,
          parentUserId: selectedStudent.parentUserId,
          name: selectedStudent.name,
          email: selectedStudent.email,
          phone: selectedStudent.phone,
        },
        items: invoiceForm.items,
        dueDate: invoiceForm.dueDate,
        notes: invoiceForm.notes,
        sendViaChat: invoiceForm.sendViaChat && !!selectedStudent.parentUserId,
      });

      setShowCreateModal(false);
      setInvoiceForm({
        type: 'invoice',
        studentId: '',
        items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
        dueDate: '',
        notes: '',
        sendViaChat: true,
      });
      fetchInvoices();
    } catch (err) {
      console.error('Error creating invoice:', err);
      alert('Failed to create invoice');
    } finally {
      setSending(false);
    }
  };

  // Send invoice via chat
  const handleSendViaChat = async (invoice: Invoice) => {
    if (!invoice.recipient.parentUserId) {
      alert('No parent linked to this student');
      return;
    }

    setSending(true);
    try {
      await schoolInvoiceService.sendInvoiceViaChat(invoice, invoice.recipient.parentUserId);
      fetchInvoices();
      alert('Invoice sent via Peeap Chat!');
    } catch (err) {
      alert('Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  // Send reminder
  const handleSendReminder = async (invoice: Invoice) => {
    setSending(true);
    try {
      await schoolInvoiceService.sendReminder(invoice.id);
      alert('Reminder sent!');
    } catch (err) {
      alert('Failed to send reminder');
    } finally {
      setSending(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `SLE ${(amount / 100).toLocaleString()}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'proforma': return <FileCheck className="h-4 w-4" />;
      case 'receipt': return <Receipt className="h-4 w-4" />;
      case 'fee_notice': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return {
      proforma: 'Proforma',
      invoice: 'Invoice',
      receipt: 'Receipt',
      fee_notice: 'Fee Notice',
    }[type] || 'Invoice';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'sent': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'viewed': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'draft': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'overdue': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'cancelled': return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-500';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'viewed': return <User className="h-4 w-4" />;
      case 'draft': return <FileText className="h-4 w-4" />;
      case 'overdue': return <AlertCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.recipient.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || invoice.status === selectedStatus;
    const matchesType = selectedType === 'all' || invoice.type === selectedType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent' || i.status === 'viewed').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    totalAmount: invoices.reduce((sum, i) => sum + i.total, 0),
    paidAmount: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0),
    pendingAmount: invoices.filter(i => ['sent', 'viewed', 'overdue'].includes(i.status)).reduce((sum, i) => sum + i.total, 0),
  };

  const invoiceTotal = invoiceForm.items.reduce((sum, item) => sum + item.total, 0);

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
              Create and send invoices via Peeap Chat
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">Collected</p>
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

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by invoice number or recipient..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Types</option>
                  <option value="proforma">Proforma</option>
                  <option value="invoice">Invoice</option>
                  <option value="fee_notice">Fee Notice</option>
                  <option value="receipt">Receipt</option>
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="viewed">Viewed</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
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
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        {getTypeIcon(invoice.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {invoice.invoiceNumber}
                          </p>
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                            {getTypeLabel(invoice.type)}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
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
                      {invoice.status === 'draft' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendViaChat(invoice);
                          }}
                          disabled={sending}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Send
                        </button>
                      )}
                      {invoice.status === 'overdue' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendReminder(invoice);
                          }}
                          disabled={sending}
                          className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600"
                        >
                          <AlertCircle className="h-4 w-4" />
                          Remind
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredInvoices.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No invoices found</p>
                <p className="text-sm text-gray-400 mt-1">Create your first invoice to get started</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create New Invoice
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Invoice Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Invoice Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['proforma', 'invoice', 'fee_notice', 'receipt'] as InvoiceType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setInvoiceForm({ ...invoiceForm, type })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                        invoiceForm.type === type
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {getTypeIcon(type)}
                      <span className="text-xs font-medium">{getTypeLabel(type)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Student
                </label>
                <select
                  value={invoiceForm.studentId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, studentId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Choose a student...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} - {student.class} {student.hasParentLinked ? '(Parent Linked)' : ''}
                    </option>
                  ))}
                </select>
                {invoiceForm.studentId && (
                  <div className="mt-2">
                    {(() => {
                      const selected = students.find(s => s.id === invoiceForm.studentId);
                      if (!selected) return null;
                      return selected.hasParentLinked ? (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <LinkIcon className="h-4 w-4" />
                          Parent linked - can send via Peeap Chat
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                          <AlertCircle className="h-4 w-4" />
                          No parent linked - invoice will be saved as draft
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Items
                </label>
                <div className="space-y-3">
                  {invoiceForm.items.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-16 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Unit Price"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateItem(index, 'unitPrice', parseInt(e.target.value) || 0)}
                        className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <div className="w-24 px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-sm font-medium text-right">
                        {formatCurrency(item.total)}
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-500 hover:text-red-600"
                        disabled={invoiceForm.items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addItem}
                  className="mt-2 flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional notes..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Send via Chat Option */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <input
                  type="checkbox"
                  id="sendViaChat"
                  checked={invoiceForm.sendViaChat}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, sendViaChat: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="sendViaChat" className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  Send invoice via Peeap Chat to parent
                </label>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <span className="text-lg font-medium text-gray-900 dark:text-white">Total Amount</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(invoiceTotal)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={sending || !invoiceForm.studentId || !invoiceForm.dueDate}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedInvoice.invoiceNumber}
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                    {getTypeLabel(selectedInvoice.type)}
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusColor(selectedInvoice.status)}`}>
                  {getStatusIcon(selectedInvoice.status)}
                  {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-2">
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
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Recipient */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Bill To</h4>
                <p className="font-medium text-gray-900 dark:text-white">{selectedInvoice.recipient.name}</p>
                {selectedInvoice.recipient.email && (
                  <p className="text-sm text-gray-500">{selectedInvoice.recipient.email}</p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Issue Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedInvoice.issueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedInvoice.dueDate)}</p>
                </div>
              </div>

              {/* Items */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="flex justify-between text-lg font-semibold p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(selectedInvoice.total)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                {selectedInvoice.status === 'draft' && (
                  <button
                    onClick={() => handleSendViaChat(selectedInvoice)}
                    disabled={sending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Send via Peeap Chat
                  </button>
                )}
                {(selectedInvoice.status === 'sent' || selectedInvoice.status === 'overdue') && (
                  <button
                    onClick={() => handleSendReminder(selectedInvoice)}
                    disabled={sending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Send Reminder
                  </button>
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
    </SchoolLayout>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  GraduationCap,
  Wallet,
  Receipt,
  UserPlus,
  Trash2,
  FileText,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { parentStudentService, LinkedChild } from '@/services/parentStudent.service';
import { schoolInvoiceService, Invoice } from '@/services/schoolInvoice.service';
import { supabaseAdmin } from '@/lib/supabase';

export function MyChildrenPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invoices
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceSummary, setInvoiceSummary] = useState({
    totalPending: 0,
    totalOverdue: 0,
    pendingCount: 0,
    overdueCount: 0,
  });

  // Parent wallet
  const [parentWallet, setParentWallet] = useState<{ id: string; balance: number } | null>(null);

  // Add child modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [nsi, setNsi] = useState('');  // National Student Identifier
  const [relationship, setRelationship] = useState<'parent' | 'guardian' | 'sponsor' | 'other'>('parent');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pay invoice modal
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<{ receiptNumber: string; transactionId: string } | null>(null);

  // Expanded children
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set());

  // Load data
  useEffect(() => {
    if (user?.id) {
      loadChildren();
      loadInvoices();
      loadParentWallet();
    }
  }, [user?.id]);

  const loadChildren = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await parentStudentService.getLinkedChildren(user.id);
      setChildren(data);
      // Expand all children by default
      setExpandedChildren(new Set(data.map(c => c.id)));
    } catch (err: any) {
      console.error('Error loading children:', err);
      setError(err.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    if (!user?.id) return;

    setLoadingInvoices(true);
    try {
      const [invoiceData, summary] = await Promise.all([
        schoolInvoiceService.getPendingInvoicesForParent(user.id),
        schoolInvoiceService.getParentInvoiceSummary(user.id),
      ]);
      setInvoices(invoiceData);
      setInvoiceSummary(summary);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const loadParentWallet = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabaseAdmin
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .single();

      if (data) {
        setParentWallet({
          id: data.id,
          balance: parseFloat(data.balance) || 0,
        });
      }
    } catch (err) {
      console.error('Error loading wallet:', err);
    }
  };

  // Format NSI (National Student Identifier)
  const formatNsi = (value: string): string => {
    let cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned.startsWith('SL')) {
      cleaned = cleaned.slice(2);
    }
    if (cleaned.length === 0) return '';
    let formatted = 'SL-';
    if (cleaned.length > 0) formatted += cleaned.slice(0, 4);
    if (cleaned.length > 4) formatted += '-' + cleaned.slice(4, 6);
    if (cleaned.length > 6) formatted += '-' + cleaned.slice(6, 11);
    return formatted;
  };

  // Add child
  const handleAddChild = async () => {
    if (!user?.id || !nsi.trim()) return;

    setAdding(true);
    setAddError(null);

    try {
      const newChild = await parentStudentService.linkChild(user.id, {
        nsi: nsi.trim(),
        relationship,
      });

      setChildren(prev => [newChild, ...prev]);
      setExpandedChildren(prev => new Set([...prev, newChild.id]));
      setAddSuccess(true);

      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess(false);
        setNsi('');
        setRelationship('parent');
      }, 1500);
    } catch (err: any) {
      setAddError(err.message || 'Failed to add child');
    } finally {
      setAdding(false);
    }
  };

  // Remove child
  const handleRemoveChild = async (linkId: string) => {
    if (!user?.id) return;

    try {
      await parentStudentService.unlinkChild(user.id, linkId);
      setChildren(prev => prev.filter(c => c.id !== linkId));
      setDeletingId(null);
    } catch (err: any) {
      console.error('Error removing child:', err);
    }
  };

  // Pay invoice
  const handlePayInvoice = async () => {
    if (!payingInvoice || !user?.id || !parentWallet) return;

    setPaying(true);
    setPayError(null);

    try {
      const result = await schoolInvoiceService.payInvoiceFromParentWallet(
        payingInvoice.id,
        user.id,
        parentWallet.id
      );

      if (result.success) {
        setPaySuccess({
          receiptNumber: result.receiptNumber || '',
          transactionId: result.transactionId || '',
        });
        // Refresh data
        loadInvoices();
        loadParentWallet();
      } else {
        setPayError(result.error || 'Payment failed');
      }
    } catch (err: any) {
      setPayError(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const formatCurrency = (amount: number, inCents = true) => {
    const value = inCents ? amount / 100 : amount;
    return `SLE ${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      viewed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
      overdue: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Get invoices for a specific student by NSI
  const getInvoicesForStudent = (studentNsi: string) => {
    return invoices.filter(inv => inv.recipient.studentId === studentNsi || inv.recipient.nsi === studentNsi);
  };

  const toggleChildExpanded = (childId: string) => {
    setExpandedChildren(prev => {
      const newSet = new Set(prev);
      if (newSet.has(childId)) {
        newSet.delete(childId);
      } else {
        newSet.add(childId);
      }
      return newSet;
    });
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Children</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Manage your linked children and pay their school fees
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Add Child</span>
          </button>
        </div>

        {/* Fee Summary Banner */}
        {(invoiceSummary.pendingCount > 0 || invoiceSummary.overdueCount > 0) && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 mb-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-blue-100 text-sm mb-1">Outstanding Fees</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(invoiceSummary.totalPending + invoiceSummary.totalOverdue)}
                </p>
              </div>
              <div className="flex gap-4">
                {invoiceSummary.pendingCount > 0 && (
                  <div className="text-center">
                    <p className="text-3xl font-bold">{invoiceSummary.pendingCount}</p>
                    <p className="text-blue-100 text-xs">Pending</p>
                  </div>
                )}
                {invoiceSummary.overdueCount > 0 && (
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-200">{invoiceSummary.overdueCount}</p>
                    <p className="text-red-200 text-xs">Overdue</p>
                  </div>
                )}
              </div>
            </div>
            {parentWallet && (
              <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm">Your Wallet Balance:</span>
                  <span className="font-semibold">{formatCurrency(parentWallet.balance, false)}</span>
                </div>
                <Link
                  to="/deposit"
                  className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
                >
                  Top Up
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading your children...</p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-700 dark:text-gray-300 mb-4">{error}</p>
            <button
              onClick={loadChildren}
              className="text-purple-600 hover:text-purple-700"
            >
              Try again
            </button>
          </div>
        ) : children.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserPlus className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No children linked yet
            </h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Add your children by their school index number to pay their fees, top up their wallets, and track their transactions.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Your First Child
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {children.map((child) => {
              const childInvoices = getInvoicesForStudent(child.student.nsi);
              const isExpanded = expandedChildren.has(child.id);
              const hasOverdue = childInvoices.some(inv => inv.status === 'overdue');

              return (
                <div
                  key={child.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden"
                >
                  {/* Child header - always visible */}
                  <div
                    className="p-4 sm:p-6 cursor-pointer"
                    onClick={() => toggleChildExpanded(child.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      {child.student.profilePhotoUrl ? (
                        <img
                          src={child.student.profilePhotoUrl}
                          alt={child.student.fullName}
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                          {child.student.firstName.charAt(0)}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              {child.student.fullName}
                              {hasOverdue && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                            </h3>
                            <p className="text-gray-500 text-sm">{child.student.schoolName}</p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                              <span>{child.student.className}</span>
                              <span>|</span>
                              <span className="font-mono">{child.student.nsi}</span>
                            </div>
                          </div>

                          {/* Expand/collapse indicator */}
                          <div className="flex items-center gap-2">
                            {childInvoices.length > 0 && (
                              <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full">
                                {childInvoices.length} fee{childInvoices.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <>
                      {/* Pending Invoices */}
                      {childInvoices.length > 0 && (
                        <div className="px-4 sm:px-6 pb-4">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Pending Fees
                          </h4>
                          <div className="space-y-2">
                            {childInvoices.map((invoice) => {
                              const daysUntil = getDaysUntilDue(invoice.dueDate);
                              const amountDue = (invoice.total - invoice.paidAmount) / 100;

                              return (
                                <div
                                  key={invoice.id}
                                  className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(invoice.status)}`}>
                                        {invoice.status === 'overdue' ? 'Overdue' : invoice.status}
                                      </span>
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        #{invoice.invoiceNumber}
                                      </span>
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                      {formatCurrency(amountDue, false)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {daysUntil < 0 ? (
                                        <span className="text-red-500">{Math.abs(daysUntil)} days overdue</span>
                                      ) : daysUntil === 0 ? (
                                        <span className="text-orange-500">Due today</span>
                                      ) : (
                                        <span>Due in {daysUntil} days</span>
                                      )}
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPayingInvoice(invoice);
                                        setPayError(null);
                                        setPaySuccess(null);
                                      }}
                                      className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                      <CreditCard className="h-3 w-3" />
                                      Pay Now
                                    </button>
                                  </div>
                                  {/* Invoice items preview */}
                                  {invoice.items.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500">
                                      {invoice.items.slice(0, 2).map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                          <span>{item.description}</span>
                                          <span>{formatCurrency(item.total)}</span>
                                        </div>
                                      ))}
                                      {invoice.items.length > 2 && (
                                        <p className="text-gray-400 mt-1">+{invoice.items.length - 2} more items</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Wallet info if available */}
                      {child.student.walletId && (
                        <div className="mx-4 sm:mx-6 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <Wallet className="h-4 w-4" />
                            <span>@{child.student.username}</span>
                          </div>
                          {child.student.walletBalance !== undefined && (
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {formatCurrency(child.student.walletBalance, false)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Quick actions */}
                      <div className="px-4 sm:px-6 pb-4">
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-3">
                          <Link
                            to={`/school-utilities?nsi=${child.student.nsi}`}
                            className="flex items-center justify-center gap-2 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm"
                          >
                            <Receipt className="h-4 w-4" />
                            All Fees
                          </Link>
                          {child.canTopupWallet && child.student.walletId && (
                            <Link
                              to={`/send?to=@${child.student.username}`}
                              className="flex items-center justify-center gap-2 py-2.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors text-sm"
                            >
                              <Wallet className="h-4 w-4" />
                              Top Up
                            </Link>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(child.id);
                            }}
                            className="flex items-center justify-center gap-2 py-2.5 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Delete confirmation */}
                      {deletingId === child.id && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-900/30">
                          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                            Remove {child.student.firstName} from your children?
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(null);
                              }}
                              className="flex-1 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveChild(child.id);
                              }}
                              className="flex-1 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Refresh button */}
        {children.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                loadChildren();
                loadInvoices();
                loadParentWallet();
              }}
              disabled={loading || loadingInvoices}
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${(loading || loadingInvoices) ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        )}

        {/* Add Child Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Add Child
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError(null);
                    setNsi('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {addSuccess ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Child Added!
                    </h4>
                    <p className="text-gray-500">
                      You can now manage their fees and wallet.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* NSI (National Student Identifier) Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        National Student ID (NSI)
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                          <GraduationCap className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={nsi}
                          onChange={(e) => {
                            setNsi(formatNsi(e.target.value));
                            setAddError(null);
                          }}
                          placeholder="SL-2025-02-00050"
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 font-mono"
                          autoFocus
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Enter the student's National Student Identifier
                      </p>
                    </div>

                    {/* Relationship */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Relationship
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['parent', 'guardian', 'sponsor', 'other'] as const).map((rel) => (
                          <button
                            key={rel}
                            onClick={() => setRelationship(rel)}
                            className={`py-2 px-4 rounded-lg text-sm capitalize transition-colors ${
                              relationship === rel
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {rel}
                          </button>
                        ))}
                      </div>
                    </div>

                    {addError && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-300">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm">{addError}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!addSuccess && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleAddChild}
                    disabled={adding || !nsi.trim() || nsi.length < 15}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {adding ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-5 w-5" />
                        Add Child
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pay Invoice Modal */}
        {payingInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Pay School Fee
                </h3>
                <button
                  onClick={() => {
                    setPayingInvoice(null);
                    setPayError(null);
                    setPaySuccess(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                {paySuccess ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Payment Successful!
                    </h4>
                    <p className="text-gray-500 mb-4">
                      Receipt #{paySuccess.receiptNumber}
                    </p>
                    <p className="text-sm text-gray-400">
                      A receipt has been sent to your chat.
                    </p>
                    <button
                      onClick={() => {
                        setPayingInvoice(null);
                        setPaySuccess(null);
                      }}
                      className="mt-4 w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Invoice details */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm text-gray-500">Invoice</p>
                          <p className="font-mono font-semibold text-gray-900 dark:text-white">
                            #{payingInvoice.invoiceNumber}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(payingInvoice.status)}`}>
                          {payingInvoice.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Student</span>
                          <span className="text-gray-900 dark:text-white">{payingInvoice.recipient.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Due Date</span>
                          <span className="text-gray-900 dark:text-white">
                            {new Date(payingInvoice.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-600 mt-3 pt-3">
                        {payingInvoice.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{item.description}</span>
                            <span className="text-gray-900 dark:text-white">{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-600 mt-3 pt-3 flex justify-between items-center">
                        <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                        <span className="text-xl font-bold text-purple-600">
                          {formatCurrency(payingInvoice.total - payingInvoice.paidAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Wallet balance */}
                    {parentWallet && (
                      <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl mb-4">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-5 w-5 text-purple-600" />
                          <span className="text-sm text-purple-700 dark:text-purple-300">Your Balance</span>
                        </div>
                        <span className="font-bold text-purple-600">
                          {formatCurrency(parentWallet.balance, false)}
                        </span>
                      </div>
                    )}

                    {/* Insufficient balance warning */}
                    {parentWallet && parentWallet.balance < (payingInvoice.total - payingInvoice.paidAmount) / 100 && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl flex items-center gap-2 mb-4">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <div className="text-sm">
                          <p className="text-yellow-700 dark:text-yellow-300">Insufficient balance</p>
                          <Link to="/deposit" className="text-yellow-600 underline">Top up your wallet</Link>
                        </div>
                      </div>
                    )}

                    {payError && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-2 mb-4 text-red-700 dark:text-red-300">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm">{payError}</span>
                      </div>
                    )}

                    <button
                      onClick={handlePayInvoice}
                      disabled={paying || !parentWallet || parentWallet.balance < (payingInvoice.total - payingInvoice.paidAmount) / 100}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {paying ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="h-5 w-5" />
                          Pay {formatCurrency(payingInvoice.total - payingInvoice.paidAmount)}
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

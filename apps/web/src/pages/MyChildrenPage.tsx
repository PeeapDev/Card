import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  GraduationCap,
  Wallet,
  Receipt,
  ChevronRight,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { parentStudentService, LinkedChild } from '@/services/parentStudent.service';

export function MyChildrenPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add child modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [indexNumber, setIndexNumber] = useState('');
  const [relationship, setRelationship] = useState<'parent' | 'guardian' | 'sponsor' | 'other'>('parent');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load linked children
  useEffect(() => {
    if (user?.id) {
      loadChildren();
    }
  }, [user?.id]);

  const loadChildren = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await parentStudentService.getLinkedChildren(user.id);
      setChildren(data);
    } catch (err: any) {
      console.error('Error loading children:', err);
      setError(err.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  // Format index number
  const formatIndexNumber = (value: string): string => {
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
    if (!user?.id || !indexNumber.trim()) return;

    setAdding(true);
    setAddError(null);

    try {
      const newChild = await parentStudentService.linkChild(user.id, {
        indexNumber: indexNumber.trim(),
        relationship,
      });

      setChildren(prev => [newChild, ...prev]);
      setAddSuccess(true);

      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess(false);
        setIndexNumber('');
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

  const formatCurrency = (amount: number) => {
    return `NLE ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
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
            {children.map((child) => (
              <div
                key={child.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="p-4 sm:p-6">
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
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {child.student.fullName}
                          </h3>
                          <p className="text-gray-500 text-sm">{child.student.schoolName}</p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                            <span>{child.student.className}</span>
                            <span>|</span>
                            <span className="font-mono">{child.student.indexNumber}</span>
                          </div>
                          <span className="inline-block mt-2 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full capitalize">
                            {child.relationship}
                          </span>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => setDeletingId(child.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove child"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Wallet info if available */}
                      {child.student.walletId && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <Wallet className="h-4 w-4" />
                            <span>@{child.student.username}</span>
                          </div>
                          {child.student.walletBalance !== undefined && (
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {formatCurrency(child.student.walletBalance)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-3">
                    <Link
                      to={`/school-utilities?index=${child.student.indexNumber}`}
                      className="flex items-center justify-center gap-2 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      <Receipt className="h-5 w-5" />
                      Pay Fees
                    </Link>
                    {child.canTopupWallet && child.student.walletId && (
                      <Link
                        to={`/send?to=@${child.student.username}`}
                        className="flex items-center justify-center gap-2 py-2.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                      >
                        <Wallet className="h-5 w-5" />
                        Top Up
                      </Link>
                    )}
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
                        onClick={() => setDeletingId(null)}
                        className="flex-1 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRemoveChild(child.id)}
                        className="flex-1 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
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
                    setIndexNumber('');
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
                    {/* Index Number Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Student Index Number
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                          <GraduationCap className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={indexNumber}
                          onChange={(e) => {
                            setIndexNumber(formatIndexNumber(e.target.value));
                            setAddError(null);
                          }}
                          placeholder="SL-2025-02-00050"
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 font-mono"
                          autoFocus
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Enter the student's school index number
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
                    disabled={adding || !indexNumber.trim() || indexNumber.length < 15}
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
      </div>
    </MainLayout>
  );
}

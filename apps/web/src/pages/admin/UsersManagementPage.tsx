import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Download,
  Mail,
  Phone,
  X,
  Loader2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  DollarSign,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { normalizePhoneNumber, isValidPhoneNumber, getPhoneValidationError } from '@/utils/phone';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  roles: string;
  kyc_status: string;
  status: string;
  created_at: string;
  last_login_at?: string;
  external_id?: string;
}

interface UserWallet {
  id: string;
  balance: number;
  currency: string;
  status: string;
}

interface Transaction {
  id: string;
  external_id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created_at: string;
}

interface CreateUserForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  username: string;
  role: string;
  initialBalance: number;
}

export function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateUserForm>({
    email: '',
    password: 'User123!@#',
    firstName: '',
    lastName: '',
    phone: '',
    username: '',
    role: 'user',
    initialBalance: 100,
  });

  // User detail modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userWallet, setUserWallet] = useState<UserWallet | null>(null);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
        return;
      }
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (user: User) => {
    setSelectedUser(user);
    setLoadingDetails(true);
    setUserWallet(null);
    setUserTransactions([]);

    try {
      // Fetch user's wallet
      const { data: walletData } = await supabase
        .from('wallets')
        .select('id, balance, currency, status')
        .eq('user_id', user.id)
        .eq('wallet_type', 'primary')
        .single();

      if (walletData) {
        setUserWallet(walletData);

        // Fetch transactions for this wallet
        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .eq('wallet_id', walletData.id)
          .order('created_at', { ascending: false })
          .limit(20);

        setUserTransactions(txData || []);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const createUser = async () => {
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      if (!formData.phone || !formData.firstName || !formData.lastName) {
        setCreateError('Please fill in all required fields (Phone, First Name, Last Name)');
        setCreating(false);
        return;
      }

      // Normalize and validate phone number
      const normalizedPhone = normalizePhoneNumber(formData.phone);
      const phoneError = getPhoneValidationError(formData.phone);

      if (phoneError) {
        setCreateError(phoneError);
        setCreating(false);
        return;
      }

      const username = formData.username || `user${Date.now().toString(36)}`;

      // Check if phone already exists (using normalized phone)
      const { data: existingPhone, error: phoneCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (!phoneCheckError && existingPhone) {
        setCreateError('A user with this phone number already exists');
        setCreating(false);
        return;
      }

      // Check if email already exists (if provided)
      if (formData.email) {
        const { data: existingEmail, error: emailCheckError } = await supabase
          .from('users')
          .select('id')
          .eq('email', formData.email)
          .maybeSingle();

        if (!emailCheckError && existingEmail) {
          setCreateError('A user with this email already exists');
          setCreating(false);
          return;
        }
      }

      const externalId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const walletExternalId = `wal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // Try RPC function first
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_user_with_wallet', {
        p_external_id: externalId,
        p_email: formData.email || null,
        p_password_hash: formData.password,
        p_first_name: formData.firstName,
        p_last_name: formData.lastName,
        p_phone: normalizedPhone,
        p_username: username,
        p_roles: formData.role,
        p_wallet_external_id: walletExternalId,
        p_initial_balance: formData.initialBalance,
      });

      if (!rpcError && rpcResult) {
        setCreateSuccess(`User ${formData.firstName} created successfully with $${formData.initialBalance} balance!`);
      } else {
        console.log('RPC not available, trying direct insert:', rpcError?.message);

        // Direct insert without username column
        const insertData: Record<string, unknown> = {
          external_id: externalId,
          email: formData.email || null,
          password_hash: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: normalizedPhone,
          roles: formData.role,
          kyc_tier: 1,
          kyc_status: 'APPROVED',
          status: 'ACTIVE',
          email_verified: formData.email ? true : false,
          phone_verified: true,
        };

        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert(insertData)
          .select()
          .single();

        if (userError) {
          if (userError.message.includes('external_id') && userError.message.includes('wallets')) {
            setCreateError('Database trigger error. Please run the SQL migration in Supabase.');
          } else {
            setCreateError(`Failed to create user: ${userError.message}`);
          }
          setCreating(false);
          return;
        }

        // Check if wallet was auto-created
        const { data: existingWallet } = await supabase
          .from('wallets')
          .select('id, external_id')
          .eq('user_id', newUser.id)
          .eq('wallet_type', 'primary')
          .maybeSingle();

        if (existingWallet) {
          await supabase
            .from('wallets')
            .update({
              external_id: existingWallet.external_id || walletExternalId,
              balance: formData.initialBalance,
              status: 'ACTIVE',
              daily_limit: 5000,
              monthly_limit: 50000,
            })
            .eq('id', existingWallet.id);
        } else {
          await supabase
            .from('wallets')
            .insert({
              external_id: walletExternalId,
              user_id: newUser.id,
              wallet_type: 'primary',
              currency: 'USD',
              balance: formData.initialBalance,
              status: 'ACTIVE',
              daily_limit: 5000,
              monthly_limit: 50000,
            });
        }

        setCreateSuccess(`User ${formData.firstName} created successfully with $${formData.initialBalance} balance!`);
      }

      setFormData({
        email: '',
        password: 'User123!@#',
        firstName: '',
        lastName: '',
        phone: '',
        username: '',
        role: 'user',
        initialBalance: 100,
      });

      fetchUsers();

      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess(null);
      }, 2000);

    } catch (error: any) {
      setCreateError(error.message || 'An unexpected error occurred');
    } finally {
      setCreating(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user status:', error);
        return;
      }

      // Update local state
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, status: newStatus } : u
      ));

      // Update selected user if viewing
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());

    const isActive = user.status === 'ACTIVE';
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'inactive' && !isActive) ||
      (statusFilter === 'verified' && user.kyc_status === 'APPROVED') ||
      (statusFilter === 'pending' && user.kyc_status === 'PENDING');

    return matchesSearch && matchesStatus;
  });

  const getKycBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'VERIFIED':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Verified</span>;
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" /> Pending</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Not Started</span>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500">Manage regular user accounts and settings</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-xl font-semibold">{users.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Verified</p>
                <p className="text-xl font-semibold">{users.filter(u => u.kyc_status === 'APPROVED' || u.kyc_status === 'VERIFIED').length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending KYC</p>
                <p className="text-xl font-semibold">{users.filter(u => u.kyc_status === 'PENDING').length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Suspended</p>
                <p className="text-xl font-semibold">{users.filter(u => u.status === 'SUSPENDED').length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Suspended</option>
              <option value="verified">KYC Verified</option>
              <option value="pending">KYC Pending</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </Card>

        {/* Users Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading users...</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">KYC Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => fetchUserDetails(user)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-medium">
                            {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                          <p className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {user.email && (
                          <p className="text-sm flex items-center gap-1">
                            <Mail className="w-3 h-3 text-gray-400" />
                            {user.email}
                          </p>
                        )}
                        {user.phone && (
                          <p className="text-sm flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {user.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getKycBadge(user.kyc_status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.status === 'ACTIVE' ? 'Active' : user.status || 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filteredUsers.length === 0 && (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </Card>

        {/* User Detail Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-bold text-xl">
                      {selectedUser.first_name?.charAt(0)}{selectedUser.last_name?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </h2>
                    <p className="text-sm text-gray-500">{selectedUser.email || selectedUser.phone}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 hover:bg-gray-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                  </div>
                ) : (
                  <>
                    {/* User Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">Phone</p>
                        <p className="font-medium">{selectedUser.phone || 'N/A'}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">Email</p>
                        <p className="font-medium">{selectedUser.email || 'N/A'}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">Role</p>
                        <p className="font-medium capitalize">{selectedUser.roles || 'user'}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">Joined</p>
                        <p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Status & KYC */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-500">Status:</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          selectedUser.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {selectedUser.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-500">KYC:</span>
                        {getKycBadge(selectedUser.kyc_status)}
                      </div>
                    </div>

                    {/* Wallet Info */}
                    {userWallet && (
                      <div className="p-4 bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-primary-100">Wallet Balance</p>
                            <p className="text-3xl font-bold">
                              ${userWallet.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                            </p>
                          </div>
                          <div className="p-3 bg-white/20 rounded-xl">
                            <Wallet className="w-8 h-8" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Transactions */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Recent Transactions
                      </h3>
                      {userTransactions.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No transactions yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {userTransactions.map((tx) => (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${
                                  tx.amount >= 0 ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                  {tx.amount >= 0 ? (
                                    <ArrowDownLeft className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{tx.description || tx.type}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(tx.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <p className={`font-semibold ${
                                tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {tx.amount >= 0 ? '+' : ''}{tx.amount?.toFixed(2)} {tx.currency}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
                <button
                  onClick={() => toggleUserStatus(selectedUser.id, selectedUser.status)}
                  className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                    selectedUser.status === 'ACTIVE'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {selectedUser.status === 'ACTIVE' ? (
                    <>
                      <Ban className="w-4 h-4" />
                      Suspend User
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Activate User
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Create New User</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError(null);
                    setCreateSuccess(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {createError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {createError}
                  </div>
                )}

                {createSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {createSuccess}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="077123456 or +232771234567"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    9 digits starting with 0. Country code (+232) will be auto-removed.
                  </p>
                  {formData.phone && (
                    <p className="text-xs text-primary-600 mt-1">
                      Will be saved as: {normalizePhoneNumber(formData.phone) || formData.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="user">User</option>
                    <option value="merchant">Merchant</option>
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Wallet className="w-4 h-4 inline mr-1" />
                    Initial Balance ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.initialBalance}
                    onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError(null);
                    setCreateSuccess(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createUser}
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create User
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

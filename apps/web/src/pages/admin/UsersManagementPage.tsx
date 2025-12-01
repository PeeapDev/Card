import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Eye,
  Edit,
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
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';

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
  last_login?: string;
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

  const createUser = async () => {
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      // Validate form
      if (!formData.phone || !formData.firstName || !formData.lastName) {
        setCreateError('Please fill in all required fields (Phone, First Name, Last Name)');
        setCreating(false);
        return;
      }

      // Generate username if not provided
      const username = formData.username || `user${Date.now().toString(36)}`;

      // Check if phone already exists (phone column should always exist)
      const { data: existingPhone, error: phoneCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', formData.phone)
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

      // Try using RPC function if available
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_user_with_wallet', {
        p_external_id: externalId,
        p_email: formData.email || null,
        p_password_hash: formData.password,
        p_first_name: formData.firstName,
        p_last_name: formData.lastName,
        p_phone: formData.phone,
        p_username: username,
        p_roles: formData.role,
        p_wallet_external_id: walletExternalId,
        p_initial_balance: formData.initialBalance,
      });

      if (!rpcError && rpcResult) {
        setCreateSuccess(`User ${formData.firstName} created successfully with $${formData.initialBalance} balance!`);
      } else {
        // RPC not available, try direct insert WITHOUT username (column might not exist)
        console.log('RPC not available, trying direct insert:', rpcError?.message);

        // Build insert object without username if column doesn't exist
        const insertData: Record<string, unknown> = {
          external_id: externalId,
          email: formData.email || null,
          password_hash: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          roles: formData.role,
          kyc_tier: 1,
          kyc_status: 'APPROVED',
          status: 'ACTIVE',
          email_verified: formData.email ? true : false,
          phone_verified: true,
        };

        // Create user directly
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert(insertData)
          .select()
          .single();

        if (userError) {
          // Check if it's the wallet trigger error
          if (userError.message.includes('external_id') && userError.message.includes('wallets')) {
            setCreateError('Database trigger error: The wallet trigger is missing external_id. Please run the SQL migration in Supabase.');
          } else if (userError.message.includes('username')) {
            setCreateError('Username column not found. Please run the SQL migration in Supabase to add the username column.');
          } else {
            setCreateError(`Failed to create user: ${userError.message}`);
          }
          setCreating(false);
          return;
        }

        // Check if wallet was auto-created by a database trigger
        const { data: existingWallet } = await supabase
          .from('wallets')
          .select('id, external_id')
          .eq('user_id', newUser.id)
          .eq('wallet_type', 'primary')
          .single();

        if (existingWallet) {
          // Wallet exists (created by trigger) - update it with external_id and balance
          const walletExtId = existingWallet.external_id || walletExternalId;

          await supabase
            .from('wallets')
            .update({
              external_id: walletExtId,
              balance: formData.initialBalance,
              status: 'ACTIVE',
              daily_limit: 5000,
              monthly_limit: 50000,
            })
            .eq('id', existingWallet.id);

          setCreateSuccess(`User @${username} created successfully with $${formData.initialBalance} balance!`);
        } else {
          // No wallet exists - create one
          const { error: walletError } = await supabase
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

          if (walletError) {
            setCreateSuccess(`User @${username} created but wallet failed: ${walletError.message}`);
          } else {
            setCreateSuccess(`User @${username} created successfully with $${formData.initialBalance} balance!`);
          }
        }
      }

      // Reset form
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

      // Refresh user list
      fetchUsers();

      // Close modal after 2 seconds on success
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

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
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
                <p className="text-sm text-gray-500">Inactive</p>
                <p className="text-xl font-semibold">{users.filter(u => u.status !== 'ACTIVE').length}</p>
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
                placeholder="Search users by name or email..."
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
              <option value="inactive">Inactive</option>
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
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
                        <p className="text-sm flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400" />
                          {user.email}
                        </p>
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
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => toggleUserStatus(user.id, user.status)}
                          className={`p-2 hover:bg-gray-100 rounded-lg ${user.status === 'ACTIVE' ? 'text-red-500' : 'text-green-500'}`}
                          title={user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        >
                          {user.status === 'ACTIVE' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </div>
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
                    <XCircle className="w-4 h-4" />
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
                    placeholder="+1234567890"
                  />
                  <p className="text-xs text-gray-500 mt-1">Primary login method</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="johndoe"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Unique username for transfers. Auto-generated if empty.</p>
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
                  <p className="text-xs text-gray-500 mt-1">Alternative login method</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="User123!@#"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: User123!@#</p>
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
                    Initial Wallet Balance ($)
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

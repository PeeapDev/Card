import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Ban,
  Edit,
  Camera,
  FileText,
  AlertTriangle,
  Loader2,
  DollarSign,
  Bell,
  RefreshCw,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';

interface UserData {
  id: string;
  external_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  username?: string;
  roles: string;
  kyc_status: string;
  kyc_tier: number;
  status: string;
  created_at: string;
  last_login_at?: string;
  email_verified: boolean;
  phone_verified: boolean;
  profile_picture?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  country?: string;
}

interface WalletData {
  id: string;
  external_id: string;
  wallet_type: string;
  currency: string;
  balance: number;
  status: string;
  daily_limit: number;
  monthly_limit: number;
}

interface CardData {
  id: string;
  external_id: string;
  card_number: string;
  card_type: string;
  status: string;
  expiry_date: string;
  created_at: string;
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
  wallet_id: string;
}

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserData | null>(null);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'cards' | 'kyc'>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Fetch user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        console.error('Error fetching user:', userError);
        navigate('/admin/users');
        return;
      }

      setUser(userData);

      // Fetch wallets
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId);

      setWallets(walletData || []);

      // Fetch cards
      const { data: cardData } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', userId);

      setCards(cardData || []);

      // Fetch transactions from all wallets
      if (walletData && walletData.length > 0) {
        const walletIds = walletData.map(w => w.id);
        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .in('wallet_id', walletIds)
          .order('created_at', { ascending: false })
          .limit(50);

        setTransactions(txData || []);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async () => {
    if (!user) return;

    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const { error } = await supabase
      .from('users')
      .update({ status: newStatus })
      .eq('id', user.id);

    if (!error) {
      setUser({ ...user, status: newStatus });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700"><CheckCircle className="w-4 h-4" /> Active</span>;
      case 'SUSPENDED':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700"><Ban className="w-4 h-4" /> Suspended</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getKycBadge = (status: string, tier: number) => {
    switch (status) {
      case 'APPROVED':
      case 'VERIFIED':
        return (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
              <CheckCircle className="w-4 h-4" /> Verified
            </span>
            <span className="text-sm text-gray-500">Tier {tier}</span>
          </div>
        );
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700"><Clock className="w-4 h-4" /> Pending Review</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700"><XCircle className="w-4 h-4" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700"><AlertTriangle className="w-4 h-4" /> Not Started</span>;
    }
  };

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  const openEditModal = () => {
    if (user) {
      setEditForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        email: user.email || '',
      });
      setShowEditModal(true);
    }
  };

  const saveUserChanges = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('users')
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
        email: editForm.email,
      })
      .eq('id', user.id);

    if (!error) {
      setUser({
        ...user,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
        email: editForm.email,
      });
      setShowEditModal(false);
    }
    setSaving(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        // If bucket doesn't exist, just save a placeholder URL
        const placeholderUrl = `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=random`;
        await supabase
          .from('users')
          .update({ profile_picture: placeholderUrl })
          .eq('id', user.id);
        setUser({ ...user, profile_picture: placeholderUrl });
      } else {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Update user profile
        await supabase
          .from('users')
          .update({ profile_picture: publicUrl })
          .eq('id', user.id);

        setUser({ ...user, profile_picture: publicUrl });
      }
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">User not found</h2>
          <button
            onClick={() => navigate('/admin/users')}
            className="mt-4 text-primary-600 hover:underline"
          >
            Back to Users
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
            <p className="text-gray-500">Manage user account and view activity</p>
          </div>
          <button
            onClick={fetchUserData}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Card */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-32 h-32 bg-primary-100 rounded-full flex items-center justify-center">
                  {user.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt={`${user.first_name} ${user.last_name}`}
                      className="w-32 h-32 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-primary-600">
                      {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                    </span>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 cursor-pointer">
                  {uploadingPhoto ? (
                    <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-gray-600" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.first_name} {user.last_name}
                </h2>
                {user.username && (
                  <span className="text-lg text-primary-600">@{user.username}</span>
                )}
                {getStatusBadge(user.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{user.phone || 'No phone'}</span>
                  {user.phone_verified && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{user.email || 'No email'}</span>
                  {user.email_verified && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Shield className="w-4 h-4" />
                  <span className="capitalize">{user.roles || 'user'}</span>
                </div>
                {user.last_login_at && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Last login: {new Date(user.last_login_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">KYC Status:</span>
                {getKycBadge(user.kyc_status, user.kyc_tier)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={toggleUserStatus}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  user.status === 'ACTIVE'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {user.status === 'ACTIVE' ? (
                  <>
                    <Ban className="w-4 h-4" />
                    Suspend
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Activate
                  </>
                )}
              </button>
              <button
                onClick={openEditModal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-200"
              >
                <Edit className="w-4 h-4" />
                Edit User
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-200">
                <Bell className="w-4 h-4" />
                Send Notification
              </button>
            </div>
          </div>
        </Card>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gradient-to-br from-primary-600 to-primary-500 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm">Total Balance</p>
                <p className="text-3xl font-bold mt-1">
                  ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Wallet className="w-8 h-8" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Active Wallets</p>
                <p className="text-3xl font-bold mt-1 text-gray-900">{wallets.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Wallet className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Active Cards</p>
                <p className="text-3xl font-bold mt-1 text-gray-900">{cards.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <CreditCard className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'transactions', label: 'Transactions', icon: DollarSign },
              { id: 'cards', label: 'Cards & Wallets', icon: CreditCard },
              { id: 'kyc', label: 'KYC Details', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Recent Transactions
              </h3>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  No transactions yet
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
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
            </Card>

            {/* Wallets */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Wallets
              </h3>
              {wallets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wallet className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  No wallets found
                </div>
              ) : (
                <div className="space-y-3">
                  {wallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">{wallet.wallet_type} Wallet</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          wallet.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {wallet.status}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        ${wallet.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Daily Limit: ${wallet.daily_limit?.toLocaleString()} | Monthly: ${wallet.monthly_limit?.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'transactions' && (
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">All Transactions</h3>
            </div>
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                No transactions found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-full ${
                            tx.amount >= 0 ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {tx.amount >= 0 ? (
                              <ArrowDownLeft className="w-3 h-3 text-green-600" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 text-red-600" />
                            )}
                          </div>
                          <span className="font-medium">{tx.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{tx.description || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${
                          tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {tx.amount >= 0 ? '+' : ''}{tx.amount?.toFixed(2)} {tx.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}

        {activeTab === 'cards' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cards */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Cards
              </h3>
              {cards.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  No cards issued
                  <button className="block mx-auto mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">
                    Issue New Card
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      className="p-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl text-white"
                    >
                      <div className="flex justify-between items-start mb-8">
                        <CreditCard className="w-8 h-8" />
                        <span className={`px-2 py-1 rounded text-xs ${
                          card.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {card.status}
                        </span>
                      </div>
                      <p className="text-lg tracking-widest mb-4">
                        •••• •••• •••• {card.card_number?.slice(-4) || '****'}
                      </p>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Expires: {card.expiry_date}</span>
                        <span className="capitalize">{card.card_type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Wallets Detail */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Wallet Details
              </h3>
              {wallets.map((wallet) => (
                <div key={wallet.id} className="p-4 border border-gray-200 rounded-lg mb-3">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="font-medium capitalize">{wallet.wallet_type} Wallet</p>
                      <p className="text-xs text-gray-500">{wallet.external_id}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      wallet.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {wallet.status}
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-3">
                    ${wallet.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    <span className="text-sm text-gray-500 ml-2">{wallet.currency}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Daily Limit</p>
                      <p className="font-medium">${wallet.daily_limit?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Monthly Limit</p>
                      <p className="font-medium">${wallet.monthly_limit?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

        {activeTab === 'kyc' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* KYC Status */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                KYC Verification
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Status</span>
                    {getKycBadge(user.kyc_status, user.kyc_tier)}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 mb-1">Verification Tier</p>
                  <p className="font-semibold text-lg">Tier {user.kyc_tier}</p>
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3].map((tier) => (
                      <div
                        key={tier}
                        className={`flex-1 h-2 rounded-full ${
                          tier <= user.kyc_tier ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 mb-1">Email Verified</p>
                    <p className={`font-semibold flex items-center gap-1 ${
                      user.email_verified ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {user.email_verified ? (
                        <><CheckCircle className="w-4 h-4" /> Yes</>
                      ) : (
                        <><XCircle className="w-4 h-4" /> No</>
                      )}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 mb-1">Phone Verified</p>
                    <p className={`font-semibold flex items-center gap-1 ${
                      user.phone_verified ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {user.phone_verified ? (
                        <><CheckCircle className="w-4 h-4" /> Yes</>
                      ) : (
                        <><XCircle className="w-4 h-4" /> No</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Personal Details */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Details
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">First Name</p>
                    <p className="font-medium">{user.first_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Name</p>
                    <p className="font-medium">{user.last_name}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{user.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{user.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-medium">{user.date_of_birth || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{user.address || 'Not provided'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">City</p>
                    <p className="font-medium">{user.city || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Country</p>
                    <p className="font-medium">{user.country || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveUserChanges}
                  disabled={saving}
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
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

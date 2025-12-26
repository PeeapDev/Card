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
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { currencyService, Currency } from '@/services/currency.service';

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

interface KycApplication {
  id: string;
  user_id: string;
  status: string;
  type: string;
  first_name?: string;
  last_name?: string;
  id_number?: string;
  verification_result?: {
    documentCheck?: boolean;
    faceMatch?: boolean;
    idCardImage?: string;
    idCardImageMimeType?: string;
    idCardCapturedAt?: string;
    selfieImage?: string;
    selfieImageMimeType?: string;
    selfieCapturedAt?: string;
    slVerification?: {
      nin?: string;
      phoneNumber?: string;
      simRegisteredName?: string;
      idCardName?: string;
      phoneVerified?: boolean;
      nameMatchScore?: number;
      verified?: boolean;
    };
    extractedData?: {
      documentNumber?: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      dateOfBirth?: string;
      expiryDate?: string;
    };
    issues?: string[];
  };
  created_at: string;
  updated_at: string;
}

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserData | null>(null);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kycApplication, setKycApplication] = useState<KycApplication | null>(null);
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
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [kycProcessing, setKycProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error',
  });
  const [sendingNotification, setSendingNotification] = useState(false);

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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
      setAvatarLoadError(false); // Reset avatar error state for new user

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

      // Fetch KYC application
      const { data: kycData } = await supabase
        .from('kyc_applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (kycData) {
        setKycApplication(kycData);
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
    // Use supabaseAdmin to bypass RLS since admin is editing another user
    const { error } = await supabaseAdmin
      .from('users')
      .update({ status: newStatus })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status. Please try again.');
    } else {
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

    // Use supabaseAdmin to bypass RLS since admin is editing another user
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
        email: editForm.email,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    } else {
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

  // Handle KYC approval
  const handleApproveKyc = async () => {
    if (!kycApplication || !user) return;
    setKycProcessing(true);

    try {
      // Update KYC application status - use supabaseAdmin to bypass RLS
      await supabaseAdmin
        .from('kyc_applications')
        .update({
          status: 'APPROVED',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', kycApplication.id);

      // Update user's KYC status
      await supabaseAdmin
        .from('users')
        .update({
          kyc_status: 'approved',
          kyc_tier: 2,
        })
        .eq('id', user.id);

      // Update local state
      setKycApplication({ ...kycApplication, status: 'APPROVED' });
      setUser({ ...user, kyc_status: 'approved', kyc_tier: 2 });

      // Optionally create a notification for the user
      await supabaseAdmin.from('user_notifications').insert({
        user_id: user.id,
        title: 'Identity Verified',
        message: 'Congratulations! Your identity has been verified. You now have full access to all features.',
        type: 'kyc_approved',
        read: false,
      });
    } catch (error) {
      console.error('Error approving KYC:', error);
      alert('Failed to approve KYC. Please try again.');
    } finally {
      setKycProcessing(false);
    }
  };

  // Handle KYC rejection
  const handleRejectKyc = async () => {
    if (!kycApplication || !user || !rejectReason) return;
    setKycProcessing(true);

    try {
      // Update KYC application status - use supabaseAdmin to bypass RLS
      await supabaseAdmin
        .from('kyc_applications')
        .update({
          status: 'REJECTED',
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectReason,
        })
        .eq('id', kycApplication.id);

      // Update user's KYC status
      await supabaseAdmin
        .from('users')
        .update({
          kyc_status: 'rejected',
        })
        .eq('id', user.id);

      // Update local state
      setKycApplication({ ...kycApplication, status: 'REJECTED' });
      setUser({ ...user, kyc_status: 'rejected' });
      setShowRejectModal(false);
      setRejectReason('');

      // Create a notification for the user
      await supabaseAdmin.from('user_notifications').insert({
        user_id: user.id,
        title: 'Verification Requires Attention',
        message: `Your identity verification could not be completed. Reason: ${rejectReason}. Please try again or contact support.`,
        type: 'kyc_rejected',
        read: false,
      });
    } catch (error) {
      console.error('Error rejecting KYC:', error);
      alert('Failed to reject KYC. Please try again.');
    } finally {
      setKycProcessing(false);
    }
  };

  // Handle sending notification to user
  const handleSendNotification = async () => {
    if (!user || !notificationForm.title.trim() || !notificationForm.message.trim()) return;
    setSendingNotification(true);

    try {
      // Use supabaseAdmin to bypass RLS when sending notifications to other users
      const { error } = await supabaseAdmin.from('user_notifications').insert({
        user_id: user.id,
        title: notificationForm.title,
        message: notificationForm.message,
        type: notificationForm.type,
        read: false,
      });

      if (error) {
        console.error('Error sending notification:', error);
        alert('Failed to send notification. Please try again.');
      } else {
        setShowNotificationModal(false);
        setNotificationForm({ title: '', message: '', type: 'info' });
        alert('Notification sent successfully!');
      }
    } catch (err) {
      console.error('Error sending notification:', err);
      alert('Failed to send notification. Please try again.');
    } finally {
      setSendingNotification(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    setAvatarLoadError(false);

    try {
      // Upload to Supabase Storage using admin client to bypass RLS
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      let profilePictureUrl: string;

      if (uploadError) {
        console.log('Storage upload error (using fallback):', uploadError.message);
        // If bucket doesn't exist or upload fails, resize and convert image to base64 data URL
        const resizeImage = (file: File, maxSize: number = 150): Promise<string> => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down to maxSize while maintaining aspect ratio
                if (width > height) {
                  if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                  }
                } else {
                  if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                  }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
              };
              img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
          });
        };

        profilePictureUrl = await resizeImage(file);
      } else {
        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('avatars')
          .getPublicUrl(filePath);
        profilePictureUrl = publicUrl;
      }

      // Update user profile using admin client to bypass RLS
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ profile_picture: profilePictureUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user profile picture:', updateError);
        alert('Failed to update profile picture. Please try again.');
      } else {
        setUser({ ...user, profile_picture: profilePictureUrl });
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      alert('Failed to upload photo. Please try again.');
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Details</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage user account and view activity</p>
          </div>
          <button
            onClick={fetchUserData}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* User Profile Card */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-32 h-32 bg-primary-100 rounded-full flex items-center justify-center">
                  {user.profile_picture && !avatarLoadError ? (
                    <img
                      src={user.profile_picture}
                      alt={`${user.first_name} ${user.last_name}`}
                      className="w-32 h-32 rounded-full object-cover"
                      onError={() => setAvatarLoadError(true)}
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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.first_name} {user.last_name}
                </h2>
                {user.username && (
                  <span className="text-lg text-primary-600 dark:text-primary-400">@{user.username}</span>
                )}
                {getStatusBadge(user.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Phone className="w-4 h-4" />
                  <span>{user.phone || 'No phone'}</span>
                  {user.phone_verified && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Mail className="w-4 h-4" />
                  <span>{user.email || 'No email'}</span>
                  {user.email_verified && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Shield className="w-4 h-4" />
                  <span className="capitalize">{user.roles || 'user'}</span>
                </div>
                {user.last_login_at && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span>Last login: {new Date(user.last_login_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">KYC Status:</span>
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
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Edit className="w-4 h-4" />
                Edit User
              </button>
              <button
                onClick={() => setShowNotificationModal(true)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
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
                  {formatCurrency(totalBalance)}
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
                <p className="text-gray-500 dark:text-gray-400 text-sm">Active Wallets</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{wallets.length}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Active Cards</p>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{cards.length}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <CreditCard className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
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
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Recent Transactions
              </h3>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  No transactions yet
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          tx.amount >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {tx.amount >= 0 ? (
                            <ArrowDownLeft className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">{tx.description || tx.type}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(tx.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className={`font-semibold ${
                        tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
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
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Wallets
              </h3>
              {wallets.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Wallet className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  No wallets found
                </div>
              ) : (
                <div className="space-y-3">
                  {wallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize text-gray-900 dark:text-white">{wallet.wallet_type} Wallet</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          wallet.status === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {wallet.status}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(wallet.balance || 0)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Daily Limit: {currencySymbol}{wallet.daily_limit?.toLocaleString()} | Monthly: {currencySymbol}{wallet.monthly_limit?.toLocaleString()}
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
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">All Transactions</h3>
            </div>
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                No transactions found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-full ${
                            tx.amount >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                          }`}>
                            {tx.amount >= 0 ? (
                              <ArrowDownLeft className="w-3 h-3 text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{tx.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{tx.description || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${
                          tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {tx.amount >= 0 ? '+' : ''}{tx.amount?.toFixed(2)} {tx.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tx.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          tx.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
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
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Cards
              </h3>
              {cards.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
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
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Wallet Details
              </h3>
              {wallets.map((wallet) => (
                <div key={wallet.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg mb-3">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="font-medium capitalize text-gray-900 dark:text-white">{wallet.wallet_type} Wallet</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{wallet.external_id}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      wallet.status === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {wallet.status}
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                    {formatCurrency(wallet.balance || 0)}
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{wallet.currency}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Daily Limit</p>
                      <p className="font-medium text-gray-900 dark:text-white">{currencySymbol}{wallet.daily_limit?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Monthly Limit</p>
                      <p className="font-medium text-gray-900 dark:text-white">{currencySymbol}{wallet.monthly_limit?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

        {activeTab === 'kyc' && (
          <div className="space-y-6">
            {/* Top row: Status and Verification Photos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* KYC Status */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  KYC Verification
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600 dark:text-gray-300">Status</span>
                      {getKycBadge(user.kyc_status, user.kyc_tier)}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-300 mb-1">Verification Tier</p>
                    <p className="font-semibold text-lg text-gray-900 dark:text-white">Tier {user.kyc_tier}</p>
                    <div className="mt-2 flex gap-1">
                      {[1, 2, 3].map((tier) => (
                        <div
                          key={tier}
                          className={`flex-1 h-2 rounded-full ${
                            tier <= user.kyc_tier ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-gray-600 dark:text-gray-300 mb-1">Email</p>
                      <p className={`font-semibold flex items-center gap-1 ${
                        user.email_verified ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {user.email_verified ? (
                          <><CheckCircle className="w-4 h-4" /> Verified</>
                        ) : (
                          <><XCircle className="w-4 h-4" /> No</>
                        )}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-gray-600 dark:text-gray-300 mb-1">Phone</p>
                      <p className={`font-semibold flex items-center gap-1 ${
                        user.phone_verified || kycApplication?.verification_result?.slVerification?.phoneVerified ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {user.phone_verified || kycApplication?.verification_result?.slVerification?.phoneVerified ? (
                          <><CheckCircle className="w-4 h-4" /> Verified</>
                        ) : (
                          <><XCircle className="w-4 h-4" /> No</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Selfie Image */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Selfie Photo
                </h3>
                {kycApplication?.verification_result?.selfieImage ? (
                  <div className="space-y-3">
                    <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden">
                      <img
                        src={`data:${kycApplication.verification_result.selfieImageMimeType || 'image/jpeg'};base64,${kycApplication.verification_result.selfieImage}`}
                        alt="User Selfie"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {kycApplication.verification_result.selfieCapturedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Captured: {new Date(kycApplication.verification_result.selfieCapturedAt).toLocaleString()}
                      </p>
                    )}
                    <div className={`p-2 rounded-lg text-center text-sm font-medium ${
                      kycApplication.verification_result.faceMatch
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {kycApplication.verification_result.faceMatch ? 'Face Captured' : 'Pending Review'}
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <Camera className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">No selfie uploaded</p>
                    </div>
                  </div>
                )}
              </Card>

              {/* ID Card Image */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  ID Document
                </h3>
                {kycApplication?.verification_result?.idCardImage ? (
                  <div className="space-y-3">
                    <div className="relative w-full aspect-[1.5] bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden">
                      <img
                        src={`data:${kycApplication.verification_result.idCardImageMimeType || 'image/jpeg'};base64,${kycApplication.verification_result.idCardImage}`}
                        alt="ID Card"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {kycApplication.verification_result.idCardCapturedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Captured: {new Date(kycApplication.verification_result.idCardCapturedAt).toLocaleString()}
                      </p>
                    )}
                    <div className={`p-2 rounded-lg text-center text-sm font-medium ${
                      kycApplication.verification_result.documentCheck
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {kycApplication.verification_result.documentCheck ? 'Document Verified' : 'Pending Review'}
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-[1.5] bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">No ID uploaded</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Bottom row: Sierra Leone Verification Details & Personal Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SL Verification Details */}
              {kycApplication?.verification_result?.slVerification && (
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Sierra Leone ID Verification
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">NIN</p>
                        <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">
                          {kycApplication.verification_result.slVerification.nin || 'Not extracted'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phone Number</p>
                        <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">
                          {kycApplication.verification_result.slVerification.phoneNumber || 'Not provided'}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID Card Name</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {kycApplication.verification_result.slVerification.idCardName || 'Not extracted'}
                      </p>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">SIM Registered Name</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {kycApplication.verification_result.slVerification.simRegisteredName || 'Not available'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Name Match Score</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                (kycApplication.verification_result.slVerification.nameMatchScore || 0) >= 70
                                  ? 'bg-green-500'
                                  : (kycApplication.verification_result.slVerification.nameMatchScore || 0) >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${kycApplication.verification_result.slVerification.nameMatchScore || 0}%` }}
                            />
                          </div>
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">
                            {kycApplication.verification_result.slVerification.nameMatchScore || 0}%
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phone Verified</p>
                        <p className={`font-semibold flex items-center gap-1 ${
                          kycApplication.verification_result.slVerification.phoneVerified
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {kycApplication.verification_result.slVerification.phoneVerified ? (
                            <><CheckCircle className="w-4 h-4" /> Yes</>
                          ) : (
                            <><XCircle className="w-4 h-4" /> No</>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Issues if any */}
                    {kycApplication.verification_result.issues && kycApplication.verification_result.issues.length > 0 && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs text-red-600 font-semibold mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Issues Found
                        </p>
                        <ul className="text-sm text-red-700 space-y-1">
                          {kycApplication.verification_result.issues.map((issue, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-red-400">•</span>
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Approve/Reject Actions */}
                    {kycApplication.status === 'PENDING' && (
                      <div className="pt-4 border-t border-gray-200 flex gap-3">
                        <button
                          onClick={handleApproveKyc}
                          disabled={kycProcessing}
                          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors"
                        >
                          {kycProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approve Verification
                        </button>
                        <button
                          onClick={() => setShowRejectModal(true)}
                          disabled={kycProcessing}
                          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Show status badge for approved/rejected */}
                    {kycApplication.status === 'APPROVED' && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-green-100 text-green-700 rounded-lg">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">Verification Approved</span>
                        </div>
                      </div>
                    )}

                    {kycApplication.status === 'REJECTED' && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-red-100 text-red-700 rounded-lg">
                          <XCircle className="w-5 h-5" />
                          <span className="font-medium">Verification Rejected</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Personal Details */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Details
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">First Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">{user.first_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Last Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">{user.last_name}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">{user.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="font-medium text-gray-900 dark:text-white">{user.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {kycApplication?.verification_result?.extractedData?.dateOfBirth || user.date_of_birth || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                    <p className="font-medium text-gray-900 dark:text-white">{user.address || 'Not provided'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">City</p>
                      <p className="font-medium text-gray-900 dark:text-white">{user.city || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Country</p>
                      <p className="font-medium text-gray-900 dark:text-white">{user.country || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit User</h2>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
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

        {/* Reject KYC Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reject Verification</h2>
                <button onClick={() => setShowRejectModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Please provide a reason for rejecting this verification. The user will be notified and can try again.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g., ID card image is blurry, name doesn't match SIM registration..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Common rejection reasons:
                  <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• ID card image is unclear or blurry</li>
                    <li>• ID card appears to be expired</li>
                    <li>• Name on ID doesn't match SIM registration</li>
                    <li>• Selfie doesn't match ID photo</li>
                    <li>• Document appears to be altered</li>
                  </ul>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectKyc}
                  disabled={kycProcessing || !rejectReason.trim()}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {kycProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Reject Verification
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Send Notification Modal */}
        {showNotificationModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Send Notification</h2>
                <button onClick={() => setShowNotificationModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Sending to: {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">{user?.email || user?.phone}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notification Type
                  </label>
                  <select
                    value={notificationForm.type}
                    onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="info">Information</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                    placeholder="e.g., Account Update"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                    placeholder="Enter your message to the user..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => {
                    setShowNotificationModal(false);
                    setNotificationForm({ title: '', message: '', type: 'info' });
                  }}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNotification}
                  disabled={sendingNotification || !notificationForm.title.trim() || !notificationForm.message.trim()}
                  className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sendingNotification ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      Send Notification
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

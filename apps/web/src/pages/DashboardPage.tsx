import { Link } from 'react-router-dom';
import { Wallet, CreditCard, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/context/AuthContext';
import { useWallets } from '@/hooks/useWallets';
import { useCards } from '@/hooks/useCards';
import { clsx } from 'clsx';

export function DashboardPage() {
  const { user } = useAuth();
  const { data: wallets, isLoading: walletsLoading } = useWallets();
  const { data: cards, isLoading: cardsLoading } = useCards();

  const totalBalance = wallets?.reduce((sum, w) => sum + w.balance, 0) || 0;
  const activeCards = cards?.filter((c) => c.status === 'ACTIVE').length || 0;

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Welcome section */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your account.</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {walletsLoading ? '...' : `$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+12.5% from last month</span>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Wallets</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {walletsLoading ? '...' : wallets?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <Link to="/wallets" className="mt-4 text-sm text-primary-600 hover:text-primary-700">
              View all wallets →
            </Link>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Cards</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {cardsLoading ? '...' : activeCards}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <Link to="/cards" className="mt-4 text-sm text-primary-600 hover:text-primary-700">
              Manage cards →
            </Link>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">KYC Status</p>
                <p
                  className={clsx(
                    'text-lg font-bold mt-1',
                    user?.kycStatus === 'VERIFIED' && 'text-green-600',
                    user?.kycStatus === 'PENDING' && 'text-yellow-600',
                    user?.kycStatus === 'REJECTED' && 'text-red-600',
                    user?.kycStatus === 'SUBMITTED' && 'text-blue-600'
                  )}
                >
                  {user?.kycStatus}
                </p>
              </div>
              <div
                className={clsx(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  user?.kycStatus === 'VERIFIED' && 'bg-green-100',
                  user?.kycStatus === 'PENDING' && 'bg-yellow-100',
                  user?.kycStatus === 'REJECTED' && 'bg-red-100',
                  user?.kycStatus === 'SUBMITTED' && 'bg-blue-100'
                )}
              >
                <TrendingUp
                  className={clsx(
                    'w-6 h-6',
                    user?.kycStatus === 'VERIFIED' && 'text-green-600',
                    user?.kycStatus === 'PENDING' && 'text-yellow-600',
                    user?.kycStatus === 'REJECTED' && 'text-red-600',
                    user?.kycStatus === 'SUBMITTED' && 'text-blue-600'
                  )}
                />
              </div>
            </div>
            {user?.kycStatus !== 'VERIFIED' && (
              <Link to="/profile" className="mt-4 text-sm text-primary-600 hover:text-primary-700">
                Complete verification →
              </Link>
            )}
          </Card>
        </div>

        {/* Recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest financial activity</CardDescription>
            </CardHeader>
            <div className="space-y-4">
              {/* Placeholder transactions */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <ArrowDownRight className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Deposit</p>
                    <p className="text-xs text-gray-500">Nov 28, 2024</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-green-600">+$500.00</p>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Payment - Amazon</p>
                    <p className="text-xs text-gray-500">Nov 27, 2024</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-red-600">-$89.99</p>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Transfer</p>
                    <p className="text-xs text-gray-500">Nov 26, 2024</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-blue-600">-$200.00</p>
              </div>
            </div>
            <Link
              to="/transactions"
              className="block mt-4 text-center text-sm text-primary-600 hover:text-primary-700"
            >
              View all transactions
            </Link>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks you can perform</CardDescription>
            </CardHeader>
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/wallets?action=deposit"
                className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                  <ArrowDownRight className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">Deposit</span>
              </Link>
              <Link
                to="/wallets?action=transfer"
                className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                  <ArrowUpRight className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">Transfer</span>
              </Link>
              <Link
                to="/cards?action=new"
                className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">New Card</span>
              </Link>
              <Link
                to="/wallets?action=new"
                className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                  <Wallet className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">New Wallet</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

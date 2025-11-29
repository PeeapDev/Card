import { useState } from 'react';
import { User, Mail, Phone, Shield, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, Button, Input } from '@/components/ui';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/context/AuthContext';
import { clsx } from 'clsx';

export function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const kycStatusConfig: Record<string, { icon: typeof Clock; color: string; bg: string; label: string; description: string }> = {
    PENDING: {
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
      label: 'Pending Verification',
      description: 'Your KYC verification is pending. Please complete the verification process.',
    },
    SUBMITTED: {
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      label: 'Under Review',
      description: 'Your documents are being reviewed. This usually takes 1-2 business days.',
    },
    VERIFIED: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-100',
      label: 'Verified',
      description: 'Your identity has been verified. You have full access to all features.',
    },
    APPROVED: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-100',
      label: 'Approved',
      description: 'Your identity has been approved. You have full access to all features.',
    },
    REJECTED: {
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-100',
      label: 'Rejected',
      description: 'Your verification was rejected. Please resubmit with valid documents.',
    },
  };

  const kycConfig = kycStatusConfig[user?.kycStatus || 'PENDING'];
  const KycIcon = kycConfig.icon;

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-500 mt-1">Manage your account information and security</p>
        </div>

        {/* Profile info */}
        <Card>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-700">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-gray-500">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>

          {isEditing ? (
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  defaultValue={user?.firstName}
                />
                <Input
                  label="Last Name"
                  defaultValue={user?.lastName}
                />
              </div>
              <Input
                label="Email"
                type="email"
                defaultValue={user?.email}
                disabled
                helperText="Email cannot be changed"
              />
              <Input
                label="Phone"
                type="tel"
                defaultValue={user?.phone}
              />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{user?.phone || 'Not set'}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* KYC Status */}
        <Card>
          <CardHeader>
            <CardTitle>Identity Verification</CardTitle>
            <CardDescription>Your KYC verification status</CardDescription>
          </CardHeader>

          <div className={clsx('flex items-start p-4 rounded-lg', kycConfig.bg)}>
            <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center bg-white', kycConfig.color)}>
              <KycIcon className="w-5 h-5" />
            </div>
            <div className="ml-4 flex-1">
              <p className={clsx('font-medium', kycConfig.color)}>{kycConfig.label}</p>
              <p className="text-sm text-gray-600 mt-1">{kycConfig.description}</p>
            </div>
          </div>

          {user?.kycStatus !== 'VERIFIED' && user?.kycStatus !== 'SUBMITTED' && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Required Documents</h4>
              <ul className="space-y-3">
                <li className="flex items-center text-sm text-gray-600">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                    1
                  </div>
                  Government-issued ID (Passport, Driver's License, or National ID)
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                    2
                  </div>
                  Proof of address (Utility bill or Bank statement, less than 3 months old)
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                    3
                  </div>
                  Selfie holding your ID document
                </li>
              </ul>
              <Button className="mt-6">
                Start Verification
              </Button>
            </div>
          )}
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your account security settings</CardDescription>
          </CardHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Password</p>
                  <p className="text-sm text-gray-500">Last changed 30 days ago</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Change Password
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-500">Add an extra layer of security</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Delete Account</p>
              <p className="text-sm text-gray-500">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button variant="danger" size="sm">
              Delete Account
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

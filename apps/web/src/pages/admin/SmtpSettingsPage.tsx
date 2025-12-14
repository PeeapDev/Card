/**
 * SMTP Settings Page
 *
 * Admin page to configure email settings for:
 * - Transaction notifications
 * - Login alerts
 * - Email verification
 * - Business notifications
 */

import { useState, useEffect } from 'react';
import {
  Mail,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Send,
  Server,
  Lock,
  User,
  Globe,
  ToggleLeft,
  ToggleRight,
  TestTube,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  isEnabled: boolean;
}

interface NotificationSettings {
  transactionReceived: boolean;
  transactionSent: boolean;
  loginSuccess: boolean;
  loginFailed: boolean;
  emailVerification: boolean;
  passwordReset: boolean;
  paymentReceived: boolean;
  withdrawalCompleted: boolean;
  kycApproved: boolean;
  kycRejected: boolean;
}

const DEFAULT_SMTP_CONFIG: SmtpConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  username: '',
  password: '',
  fromEmail: '',
  fromName: 'Peeap',
  isEnabled: false,
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  transactionReceived: true,
  transactionSent: true,
  loginSuccess: false,
  loginFailed: true,
  emailVerification: true,
  passwordReset: true,
  paymentReceived: true,
  withdrawalCompleted: true,
  kycApproved: true,
  kycRejected: true,
};

export function SmtpSettingsPage() {
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(DEFAULT_SMTP_CONFIG);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'smtp' | 'notifications'>('smtp');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data: settings, error: fetchError } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('id', SETTINGS_ID)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(fetchError.message);
      }

      if (settings) {
        setSmtpConfig({
          host: settings.smtp_host || 'smtp.gmail.com',
          port: settings.smtp_port || 587,
          secure: settings.smtp_secure ?? false,
          username: settings.smtp_username || '',
          password: settings.smtp_password || '',
          fromEmail: settings.smtp_from_email || '',
          fromName: settings.smtp_from_name || 'Peeap',
          isEnabled: settings.smtp_enabled ?? false,
        });

        setNotificationSettings({
          transactionReceived: settings.notify_transaction_received ?? true,
          transactionSent: settings.notify_transaction_sent ?? true,
          loginSuccess: settings.notify_login_success ?? false,
          loginFailed: settings.notify_login_failed ?? true,
          emailVerification: settings.notify_email_verification ?? true,
          passwordReset: settings.notify_password_reset ?? true,
          paymentReceived: settings.notify_payment_received ?? true,
          withdrawalCompleted: settings.notify_withdrawal_completed ?? true,
          kycApproved: settings.notify_kyc_approved ?? true,
          kycRejected: settings.notify_kyc_rejected ?? true,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch settings:', err);
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);

    try {
      const settingsData = {
        // SMTP Config
        smtp_host: smtpConfig.host,
        smtp_port: smtpConfig.port,
        smtp_secure: smtpConfig.secure,
        smtp_username: smtpConfig.username,
        smtp_password: smtpConfig.password,
        smtp_from_email: smtpConfig.fromEmail,
        smtp_from_name: smtpConfig.fromName,
        smtp_enabled: smtpConfig.isEnabled,
        // Notification Settings
        notify_transaction_received: notificationSettings.transactionReceived,
        notify_transaction_sent: notificationSettings.transactionSent,
        notify_login_success: notificationSettings.loginSuccess,
        notify_login_failed: notificationSettings.loginFailed,
        notify_email_verification: notificationSettings.emailVerification,
        notify_password_reset: notificationSettings.passwordReset,
        notify_payment_received: notificationSettings.paymentReceived,
        notify_withdrawal_completed: notificationSettings.withdrawalCompleted,
        notify_kyc_approved: notificationSettings.kycApproved,
        notify_kyc_rejected: notificationSettings.kycRejected,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('payment_settings')
        .update(settingsData)
        .eq('id', SETTINGS_ID);

      if (updateError) {
        if (updateError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('payment_settings')
            .insert({ id: SETTINGS_ID, ...settingsData });

          if (insertError) throw new Error(insertError.message);
        } else {
          throw new Error(updateError.message);
        }
      }

      setSuccess('SMTP settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setTesting(true);
    setError(null);

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject: 'Peeap SMTP Test',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Peeap</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1f2937;">SMTP Test Successful!</h2>
                <p style="color: #4b5563;">
                  This is a test email to verify your SMTP configuration is working correctly.
                </p>
                <p style="color: #4b5563;">
                  If you received this email, your email notifications are properly configured.
                </p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    Sent from Peeap Payment Gateway
                  </p>
                </div>
              </div>
            </div>
          `,
          smtpConfig: smtpConfig,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }

      setSuccess(`Test email sent to ${testEmail}`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Settings</h1>
            <p className="text-gray-500 dark:text-gray-400">Configure SMTP and email notifications</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchSettings}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
            <XCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex gap-6">
            {[
              { id: 'smtp', label: 'SMTP Configuration', icon: Server },
              { id: 'notifications', label: 'Email Notifications', icon: Bell },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* SMTP Configuration Tab */}
        {activeTab === 'smtp' && (
          <div className="space-y-6">
            {/* Enable/Disable Toggle */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${smtpConfig.isEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <Mail className={`w-5 h-5 ${smtpConfig.isEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Notifications</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enable email notifications for users</p>
                  </div>
                </div>
                <button
                  onClick={() => setSmtpConfig(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
                  className={`p-2 rounded-lg transition-colors ${
                    smtpConfig.isEnabled ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {smtpConfig.isEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>
            </Card>

            {/* SMTP Server Settings */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">SMTP Server</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Configure your email server settings</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SMTP Port</label>
                  <input
                    type="number"
                    value={smtpConfig.port}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                    placeholder="587"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <button
                    onClick={() => setSmtpConfig(prev => ({ ...prev, secure: !prev.secure }))}
                    className={`p-1 rounded ${smtpConfig.secure ? 'bg-green-200 dark:bg-green-900/50' : 'bg-gray-200 dark:bg-gray-600'}`}
                  >
                    {smtpConfig.secure ? <ToggleRight className="w-6 h-6 text-green-600 dark:text-green-400" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                  </button>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Use SSL/TLS</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enable for port 465, disable for port 587</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Authentication */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Authentication</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">SMTP login credentials</p>
                </div>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="ml-auto p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                </button>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username / Email</label>
                  <input
                    type="text"
                    value={smtpConfig.username}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="your-email@gmail.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password / App Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={smtpConfig.password}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Your SMTP password or app password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    For Gmail, use an App Password from Google Account settings
                  </p>
                </div>
              </div>
            </Card>

            {/* Sender Information */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <User className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sender Information</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">How emails will appear to recipients</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Email</label>
                  <input
                    type="email"
                    value={smtpConfig.fromEmail}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                    placeholder="noreply@peeap.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Name</label>
                  <input
                    type="text"
                    value={smtpConfig.fromName}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, fromName: e.target.value }))}
                    placeholder="Peeap"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </Card>

            {/* Test Email */}
            <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-4">
                <TestTube className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-300">Send Test Email</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400">Verify your SMTP configuration is working</p>
                </div>
              </div>

              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">Recipient Email</label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <button
                  onClick={sendTestEmail}
                  disabled={testing || !smtpConfig.host || !smtpConfig.username}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed h-[42px]"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {testing ? 'Sending...' : 'Send Test'}
                </button>
              </div>
            </Card>

            {/* Gmail Setup Instructions */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Globe className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Gmail SMTP Setup</h3>
              </div>

              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p><strong>1.</strong> Go to your Google Account &gt; Security</p>
                <p><strong>2.</strong> Enable 2-Factor Authentication if not already enabled</p>
                <p><strong>3.</strong> Go to App Passwords and generate a new password for "Mail"</p>
                <p><strong>4.</strong> Use the generated 16-character password in the Password field above</p>
                <p><strong>Settings:</strong> Host: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">smtp.gmail.com</code>, Port: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">587</code>, SSL/TLS: Off</p>
              </div>
            </Card>
          </div>
        )}

        {/* Email Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction Notifications</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email users about their transactions</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'transactionReceived', label: 'Money Received', description: 'When user receives money in their wallet' },
                  { key: 'transactionSent', label: 'Money Sent', description: 'When user sends money from their wallet' },
                  { key: 'paymentReceived', label: 'Payment Received', description: 'When merchant receives a payment' },
                  { key: 'withdrawalCompleted', label: 'Withdrawal Completed', description: 'When withdrawal is processed' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                    <button
                      onClick={() => setNotificationSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof NotificationSettings] }))}
                      className={`p-1 rounded ${notificationSettings[item.key as keyof NotificationSettings] ? 'bg-green-200 dark:bg-green-900/50' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                      {notificationSettings[item.key as keyof NotificationSettings] ? (
                        <ToggleRight className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security Notifications</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email users about security events</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'loginSuccess', label: 'Successful Login', description: 'When user logs in successfully' },
                  { key: 'loginFailed', label: 'Failed Login Attempt', description: 'When someone fails to log in' },
                  { key: 'emailVerification', label: 'Email Verification', description: 'Send verification emails to new users' },
                  { key: 'passwordReset', label: 'Password Reset', description: 'Send password reset links' },
                  { key: 'kycApproved', label: 'KYC Approved', description: 'When user KYC is approved' },
                  { key: 'kycRejected', label: 'KYC Rejected', description: 'When user KYC is rejected' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                    <button
                      onClick={() => setNotificationSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof NotificationSettings] }))}
                      className={`p-1 rounded ${notificationSettings[item.key as keyof NotificationSettings] ? 'bg-green-200 dark:bg-green-900/50' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                      {notificationSettings[item.key as keyof NotificationSettings] ? (
                        <ToggleRight className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/**
 * Events Setup Wizard
 *
 * Guides merchants through initial Events app configuration:
 * - Welcome and feature overview
 * - Default settings (refunds, ticket limits)
 * - Complete setup
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useApps } from '@/context/AppsContext';
import eventService, { EventsSettings } from '@/services/event.service';
import {
  Calendar,
  Settings,
  Check,
  ChevronRight,
  ChevronLeft,
  Ticket,
  Users,
  QrCode,
  BarChart3,
  Loader2,
  PartyPopper,
} from 'lucide-react';

interface SetupSettings {
  businessName: string;
  defaultCurrency: string;
  allowRefunds: boolean;
  refundDeadlineHours: number;
  maxTicketsPerOrder: number;
}

const defaultSettings: SetupSettings = {
  businessName: '',
  defaultCurrency: 'SLE',
  allowRefunds: true,
  refundDeadlineHours: 24,
  maxTicketsPerOrder: 10,
};

const steps = [
  { id: 'welcome', title: 'Welcome', icon: Calendar },
  { id: 'settings', title: 'Settings', icon: Settings },
  { id: 'complete', title: 'Complete', icon: Check },
];

export function EventsSetupWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshApps, enableApp } = useApps();
  const [currentStep, setCurrentStep] = useState(0);
  const [settings, setSettings] = useState<SetupSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  // Load existing settings if any
  useEffect(() => {
    const loadSettings = async () => {
      if (user?.id) {
        const existingSettings = await eventService.getEventsSettings(user.id);
        if (existingSettings) {
          setSettings({
            businessName: existingSettings.business_name || '',
            defaultCurrency: existingSettings.default_currency || 'SLE',
            allowRefunds: existingSettings.allow_refunds ?? true,
            refundDeadlineHours: existingSettings.refund_deadline_hours ?? 24,
            maxTicketsPerOrder: existingSettings.max_tickets_per_order ?? 10,
          });
        } else {
          // Pre-fill with user data
          setSettings(prev => ({
            ...prev,
            businessName: `${user.firstName} ${user.lastName}`,
          }));
        }
      }
    };
    loadSettings();
  }, [user]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      // Save settings to database
      await eventService.saveEventsSettings({
        merchant_id: user.id,
        business_name: settings.businessName,
        default_currency: settings.defaultCurrency,
        allow_refunds: settings.allowRefunds,
        refund_deadline_hours: settings.refundDeadlineHours,
        max_tickets_per_order: settings.maxTicketsPerOrder,
        setup_completed: true,
      });

      // Enable the events app
      await enableApp('events');
      await refreshApps();

      // Navigate to events dashboard
      navigate('/merchant/apps/events');
    } catch (error) {
      console.error('Error completing setup:', error);
      alert('Failed to complete setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderWelcomeStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6">
          <PartyPopper className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to Events
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Create and manage events, sell tickets, and scan them at the door. Perfect for concerts, parties, conferences, and more.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Ticket className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Ticket Sales</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create ticket types with different prices and quantities
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">QR Tickets</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Each ticket gets a unique QR code for easy scanning
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Staff Management</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Invite team members to help scan tickets at the door
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Analytics</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track sales, attendance, and revenue in real-time
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Default Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your default event settings. You can change these per event.
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Business Name
          </label>
          <input
            type="text"
            value={settings.businessName}
            onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            placeholder="Your business name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Max Tickets Per Order
          </label>
          <select
            value={settings.maxTicketsPerOrder}
            onChange={(e) => setSettings({ ...settings, maxTicketsPerOrder: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            {[1, 2, 5, 10, 20, 50].map(num => (
              <option key={num} value={num}>{num} tickets</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Allow Refunds</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Allow customers to request ticket refunds
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettings({ ...settings, allowRefunds: !settings.allowRefunds })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
              settings.allowRefunds ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.allowRefunds ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {settings.allowRefunds && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Refund Deadline (hours before event)
            </label>
            <select
              value={settings.refundDeadlineHours}
              onChange={(e) => setSettings({ ...settings, refundDeadlineHours: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value={0}>Anytime before event</option>
              <option value={1}>1 hour before</option>
              <option value={6}>6 hours before</option>
              <option value={12}>12 hours before</option>
              <option value={24}>24 hours before</option>
              <option value={48}>48 hours before</option>
              <option value={72}>72 hours before</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
        <Check className="w-10 h-10 text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          You're All Set!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Your Events app is ready. Start by creating your first event.
        </p>
      </div>

      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 max-w-md mx-auto">
        <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-3">
          What's next?
        </h3>
        <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-2 text-left">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            Create your first event
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            Add ticket types with pricing
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            Share your event and start selling
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            Invite staff to help scan tickets
          </li>
        </ul>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'welcome':
        return renderWelcomeStep();
      case 'settings':
        return renderSettingsStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return null;
    }
  };

  return (
    <MerchantLayout>
      <div className="max-w-3xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-1 mx-2 rounded ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <Card className="p-8">
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button
                onClick={handleComplete}
                disabled={saving}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    Get Started
                    <PartyPopper className="w-4 h-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </MerchantLayout>
  );
}

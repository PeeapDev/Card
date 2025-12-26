/**
 * Payment Link Setup Wizard
 * Beautiful wizard for first-time payment link setup with wallet creation option
 */

import { useState } from 'react';
import {
  Link2,
  Wallet,
  QrCode,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Share2,
  Copy,
  Download,
  CheckCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MerchantBusiness } from '@/services/business.service';
import { CreatePaymentLinkDto, PaymentLink } from '@/services/paymentLink.service';
import QRCode from 'qrcode';

interface PaymentLinkSetupWizardProps {
  businesses: MerchantBusiness[];
  currencySymbol: string;
  onComplete: (data: CreatePaymentLinkDto & { createWallet?: boolean }) => Promise<PaymentLink>;
  onSkip: () => void;
}

type WizardStep = 'welcome' | 'wallet' | 'details' | 'complete';

export function PaymentLinkSetupWizard({
  businesses,
  currencySymbol,
  onComplete,
  onSkip,
}: PaymentLinkSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [createWallet, setCreateWallet] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<PaymentLink | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState<CreatePaymentLinkDto>({
    business_id: businesses[0]?.id || '',
    name: '',
    description: '',
    amount: undefined,
    currency: 'SLE',
    allow_custom_amount: false,
  });

  const steps: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
    { key: 'welcome', label: 'Welcome', icon: <Sparkles className="w-5 h-5" /> },
    { key: 'wallet', label: 'Wallet', icon: <Wallet className="w-5 h-5" /> },
    { key: 'details', label: 'Details', icon: <Link2 className="w-5 h-5" /> },
    { key: 'complete', label: 'Complete', icon: <QrCode className="w-5 h-5" /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  const handleNext = () => {
    const stepOrder: WizardStep[] = ['welcome', 'wallet', 'details', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder: WizardStep[] = ['welcome', 'wallet', 'details', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const generateQRCode = async (url: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeUrl(qrDataUrl);
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  };

  const handleCreate = async () => {
    if (!formData.business_id || !formData.name) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.allow_custom_amount && !formData.amount) {
      setError('Please enter an amount or enable custom amount');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const link = await onComplete({ ...formData, createWallet });
      setCreatedLink(link);

      // Generate QR code for the payment link
      const business = businesses.find((b) => b.id === formData.business_id);
      if (business && link.slug) {
        const paymentUrl = `${window.location.origin}/pay/${business.slug}/${link.slug}`;
        await generateQRCode(paymentUrl);
      }

      setCurrentStep('complete');
    } catch (err: any) {
      setError(err.message || 'Failed to create payment link');
    } finally {
      setCreating(false);
    }
  };

  const getPaymentUrl = () => {
    if (!createdLink) return '';
    const business = businesses.find((b) => b.id === createdLink.business_id);
    return `${window.location.origin}/pay/${business?.slug || ''}/${createdLink.slug}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getPaymentUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.download = `payment-link-qr-${createdLink?.slug || 'code'}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  return (
    <Card className="max-w-2xl mx-auto overflow-hidden">
      {/* Progress Bar */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  index <= currentStepIndex
                    ? 'bg-white text-green-600'
                    : 'bg-white/30 text-white'
                }`}
              >
                {index < currentStepIndex ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.icon
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 md:w-20 h-1 mx-2 rounded transition-all ${
                    index < currentStepIndex ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <h2 className="text-xl font-bold text-white">
          {currentStep === 'welcome' && 'Welcome to Payment Links'}
          {currentStep === 'wallet' && 'Payment Link Wallet'}
          {currentStep === 'details' && 'Create Your Payment Link'}
          {currentStep === 'complete' && 'Your Link is Ready!'}
        </h2>
        <p className="text-white/80 text-sm mt-1">
          {currentStep === 'welcome' && 'Accept payments with shareable links'}
          {currentStep === 'wallet' && 'Choose where payments should go'}
          {currentStep === 'details' && 'Configure your payment link details'}
          {currentStep === 'complete' && 'Share your payment link with customers'}
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Welcome Step */}
        {currentStep === 'welcome' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Link2 className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Create Links</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Generate shareable payment URLs
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <QrCode className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">QR Codes</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Share via scannable QR codes
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Dedicated Wallet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Separate funds for tracking
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">How it works</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  Create a payment link with a fixed or custom amount
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  Share the link or QR code with your customers
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  Customers pay via our secure hosted checkout
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                  Funds are deposited to your wallet instantly
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Skip for Now
              </button>
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Wallet Step */}
        {currentStep === 'wallet' && (
          <div className="space-y-6">
            <p className="text-gray-600 dark:text-gray-400">
              Choose where your payment link funds should be deposited:
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setCreateWallet(false)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  !createWallet
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      !createWallet
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Default Wallet
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Payments will go to your main business wallet. Simple and straightforward.
                    </p>
                  </div>
                  {!createWallet && (
                    <Check className="w-6 h-6 text-green-500 flex-shrink-0" />
                  )}
                </div>
              </button>

              <button
                onClick={() => setCreateWallet(true)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  createWallet
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      createWallet
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Create Payment Link Wallet
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Create a dedicated wallet to track payment link earnings separately. Better for accounting and reporting.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                        Separate tracking
                      </span>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                        Easy reporting
                      </span>
                    </div>
                  </div>
                  {createWallet && (
                    <Check className="w-6 h-6 text-green-500 flex-shrink-0" />
                  )}
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Details Step */}
        {currentStep === 'details' && (
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Business Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business *
              </label>
              <select
                value={formData.business_id}
                onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Product Purchase, Service Fee"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description shown to customers"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700"
              />
            </div>

            {/* Amount */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Amount
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={formData.allow_custom_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allow_custom_amount: e.target.checked,
                        amount: undefined,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  Let customer enter amount
                </label>
              </div>
              {!formData.allow_custom_amount && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: parseFloat(e.target.value) || undefined,
                      })
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleBack}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Payment Link
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {currentStep === 'complete' && createdLink && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {createdLink.name}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Your payment link is ready to share
              </p>
            </div>

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-xl shadow-lg inline-block">
                  <img src={qrCodeUrl} alt="Payment QR Code" className="w-48 h-48" />
                </div>
              </div>
            )}

            {/* Payment URL */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Payment Link URL</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={getPaymentUrl()}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {qrCodeUrl && (
                <button
                  onClick={downloadQRCode}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download QR Code
                </button>
              )}
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: createdLink.name,
                      text: createdLink.description || 'Pay via this link',
                      url: getPaymentUrl(),
                    });
                  } else {
                    copyToClipboard();
                  }
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share Link
              </button>
            </div>

            <button
              onClick={onSkip}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
            >
              Done - Go to Payment Links
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

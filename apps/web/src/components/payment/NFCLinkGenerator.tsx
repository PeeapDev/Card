/**
 * Secure NFC Payment Link Generator
 *
 * Creates cryptographically secure payment links for NFC payments.
 * Features:
 * - Server-side secret key generation
 * - Optional PIN protection for high-value transactions
 * - Transaction limits
 * - Fraud prevention
 */

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import {
  Wifi,
  Copy,
  Check,
  Smartphone,
  CreditCard,
  Link,
  AlertCircle,
  Loader2,
  X,
  QrCode,
  ExternalLink,
  Shield,
  Lock,
  DollarSign,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { nfcEngine, NFCCapabilities } from '@/services/nfc-engine';
import { useCreateNFCPaymentLink, useNFCPaymentLinks } from '@/hooks/useNFCPayments';
import { clsx } from 'clsx';

interface NFCLinkGeneratorProps {
  cardId: string;
  userId: string;
  walletId: string;
  cardholderName: string;
  cardLastFour: string;
  onClose: () => void;
}

export function NFCLinkGenerator({
  cardId,
  userId,
  walletId,
  cardholderName,
  cardLastFour,
  onClose,
}: NFCLinkGeneratorProps) {
  const [capabilities, setCapabilities] = useState<NFCCapabilities | null>(null);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'configure' | 'created'>('configure');

  // Form state
  const [tagName, setTagName] = useState(`NFC Payment - ${cardholderName}`);
  const [singleLimit, setSingleLimit] = useState('1000');
  const [dailyLimit, setDailyLimit] = useState('5000');
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Result state
  const [paymentUrl, setPaymentUrl] = useState('');
  const [shortCode, setShortCode] = useState('');

  // Hooks
  const createPaymentLink = useCreateNFCPaymentLink();
  const { data: existingLinks, refetch: refetchLinks } = useNFCPaymentLinks();

  // Check for existing link for this card
  const existingLink = existingLinks?.find(
    (link) => link.card_id === cardId && link.status === 'active'
  );

  useEffect(() => {
    const caps = nfcEngine.checkNFCCapabilities();
    setCapabilities(caps);

    // If there's an existing link, show it
    if (existingLink) {
      setPaymentUrl(`${window.location.origin}/pay/nfc/${existingLink.short_code}`);
      setShortCode(existingLink.short_code);
      setTagName(existingLink.name);
      setStep('created');
    }
  }, [existingLink]);

  const handleCreateLink = async () => {
    if (usePin && pin.length !== 6) {
      alert('PIN must be exactly 6 digits');
      return;
    }

    try {
      const result = await createPaymentLink.mutateAsync({
        wallet_id: walletId,
        card_id: cardId,
        name: tagName,
        single_limit: parseFloat(singleLimit) || 1000,
        daily_limit: parseFloat(dailyLimit) || 5000,
        pin: usePin ? pin : undefined,
      });

      setPaymentUrl(result.payment_url);
      setShortCode(result.short_code);
      setStep('created');
      refetchLinks();
    } catch (error: any) {
      alert(error.message || 'Failed to create payment link');
    }
  };

  const copyPaymentLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  const writeToNFCTag = async () => {
    if (!capabilities?.canWrite || !paymentUrl) {
      alert('NFC writing not available');
      return;
    }

    try {
      // @ts-ignore - Web NFC types
      const writer = new NDEFReader();
      await writer.write({
        records: [{ recordType: 'url', data: paymentUrl }],
      });
      alert('Successfully wrote payment link to NFC tag!');
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        alert('NFC permission denied. Please allow NFC access and try again.');
      } else {
        alert(err.message || 'Failed to write to NFC tag');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-lg my-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Secure NFC Payment Setup
            </CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>

        <div className="p-6 space-y-6">
          {/* Card Info */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{cardholderName}</p>
              <p className="text-sm text-gray-500">Card ending in {cardLastFour}</p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
            <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Bank-Grade Security</p>
              <p className="text-sm text-green-700 mt-1">
                Each payment requires a unique cryptographic token that expires in minutes.
                All transactions are verified server-side to prevent fraud.
              </p>
            </div>
          </div>

          {step === 'configure' && (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Link Name
                </label>
                <Input
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="e.g., My Business Card"
                />
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Single Transaction Limit
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={singleLimit}
                      onChange={(e) => setSingleLimit(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Limit
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* PIN Protection */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900">PIN Protection</span>
                  </div>
                  <button
                    onClick={() => setUsePin(!usePin)}
                    className={clsx(
                      'w-12 h-6 rounded-full transition-colors relative',
                      usePin ? 'bg-indigo-600' : 'bg-gray-300'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform',
                        usePin ? 'translate-x-6' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Require PIN for transactions above a certain amount
                </p>
                {usePin && (
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit PIN"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              <Button
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
                onClick={handleCreateLink}
                isLoading={createPaymentLink.isPending}
              >
                <Shield className="w-4 h-4 mr-2" />
                Generate Secure Payment Link
              </Button>
            </div>
          )}

          {step === 'created' && (
            <div className="space-y-6">
              {/* Short Code Display */}
              <div className="text-center p-4 bg-indigo-50 rounded-xl">
                <p className="text-sm text-indigo-600 mb-1">Payment Code</p>
                <p className="text-3xl font-bold tracking-widest text-indigo-900">{shortCode}</p>
              </div>

              {/* Payment URL */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Payment URL
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-200 font-mono text-sm text-gray-600 truncate">
                    {paymentUrl}
                  </div>
                  <Button
                    variant="outline"
                    onClick={copyPaymentLink}
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* QR Code */}
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 mb-3 flex items-center justify-center gap-2">
                  <QrCode className="w-4 h-4" />
                  Scan to Pay or Write to NFC Tag
                </p>
                <div className="bg-white p-4 rounded-xl border border-gray-200 inline-block">
                  <QRCode value={paymentUrl} size={180} level="H" />
                </div>
              </div>

              {/* Write to NFC (if available) */}
              {capabilities?.canWrite && (
                <Button
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
                  onClick={writeToNFCTag}
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Write to NFC Tag
                </Button>
              )}

              {/* Instructions */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <h4 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  How It Works
                </h4>
                <ol className="space-y-1 text-sm text-amber-800">
                  <li>1. Copy the URL or scan the QR with an NFC writer app</li>
                  <li>2. Write the URL to your NFC tag/card</li>
                  <li>3. When tapped, payers enter amount and complete payment</li>
                  <li>4. Each payment generates a unique token (valid 5 mins)</li>
                  <li>5. Funds are deposited to your wallet minus 1% fee</li>
                </ol>
              </div>

              {/* Existing Link Stats */}
              {existingLink && (
                <div className="flex items-center justify-around p-4 bg-gray-50 rounded-xl">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {existingLink.total_transactions}
                    </p>
                    <p className="text-xs text-gray-500">Transactions</p>
                  </div>
                  <div className="h-10 w-px bg-gray-200" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      ${existingLink.total_amount_received?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-xs text-gray-500">Received</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
            {step === 'created' && (
              <Button
                className="flex-1"
                onClick={() => window.open(paymentUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Test Payment
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default NFCLinkGenerator;

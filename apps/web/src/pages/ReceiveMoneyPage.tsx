/**
 * Receive Money Page
 *
 * Allows users to receive money via:
 * - QR Code (static or with amount)
 * - NFC tap
 * - Payment link
 */

import { useState, useEffect } from 'react';
import {
  QrCode,
  Wifi,
  Link2,
  DollarSign,
  Copy,
  CheckCircle,
  Share2,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MainLayout } from '@/components/layout/MainLayout';
import { PaymentQRCode } from '@/components/payment/PaymentQRCode';
import { NFCPayment } from '@/components/payment/NFCPayment';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type ReceiveMethod = 'qr' | 'nfc' | 'link';

export function ReceiveMoneyPage() {
  const { user } = useAuth();
  const [method, setMethod] = useState<ReceiveMethod>('qr');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [walletId, setWalletId] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [paymentLink, setPaymentLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchWallet();
    }
  }, [user?.id]);

  const fetchWallet = async () => {
    setWalletLoading(true);
    setWalletError(null);

    try {
      const { data: wallet, error } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user?.id)
        .eq('wallet_type', 'primary')
        .single();

      if (error) {
        console.error('Wallet fetch error:', error);
        setWalletError('Failed to load wallet');
        return;
      }

      if (wallet) {
        setWalletId(wallet.id);
        setWalletBalance(wallet.balance);
      } else {
        setWalletError('No wallet found');
      }
    } catch (err) {
      console.error('Wallet fetch exception:', err);
      setWalletError('Failed to load wallet');
    } finally {
      setWalletLoading(false);
    }
  };

  const generatePaymentLink = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      to: user?.id || '',
      ...(amount && { amount }),
      ...(description && { note: description }),
    });
    const link = `${baseUrl}/pay?${params.toString()}`;
    setPaymentLink(link);
    return link;
  };

  const handleCopyLink = async () => {
    const link = paymentLink || generatePaymentLink();
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const link = paymentLink || generatePaymentLink();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Request',
          text: amount ? `Pay me $${amount}` : 'Send me money',
          url: link,
        });
      } catch {
        // User cancelled
      }
    }
  };

  const parsedAmount = parseFloat(amount) || undefined;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receive Money</h1>
          <p className="text-gray-500">Get paid via QR code, NFC, or payment link</p>
        </div>

        {/* Balance Card */}
        <Card className="p-4 bg-gradient-to-r from-green-600 to-green-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-100">Current Balance</p>
              <p className="text-3xl font-bold">
                ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
        </Card>

        {/* Amount Input */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <label className="font-medium text-gray-700">Request specific amount?</label>
            <button
              onClick={() => setShowAmountInput(!showAmountInput)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showAmountInput ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showAmountInput ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {showAmountInput && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-xl font-semibold focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this for?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          )}
        </Card>

        {/* Method Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'qr', label: 'QR Code', icon: QrCode },
            { key: 'nfc', label: 'NFC Tap', icon: Wifi },
            { key: 'link', label: 'Link', icon: Link2 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMethod(key as ReceiveMethod)}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${
                method === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content based on method */}
        <Card className="p-6">
          {/* Loading state */}
          {walletLoading && (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500">Loading wallet...</p>
            </div>
          )}

          {/* Error state */}
          {!walletLoading && walletError && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <QrCode className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">Unable to load QR code</p>
              <p className="text-red-500 text-sm mt-2">{walletError}</p>
              <button
                onClick={fetchWallet}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Try Again
              </button>
            </div>
          )}

          {method === 'qr' && !walletLoading && !walletError && user?.id && walletId && (
            <PaymentQRCode
              userId={user.id}
              walletId={walletId}
              amount={parsedAmount}
              description={description}
              type={parsedAmount ? 'dynamic' : 'static'}
              size={250}
            />
          )}

          {method === 'nfc' && !walletLoading && !walletError && user?.id && walletId && (
            <NFCPayment
              userId={user.id}
              walletId={walletId}
              amount={parsedAmount}
              mode="receive"
              onPaymentReceived={(txId) => {
                console.log('Payment received:', txId);
                fetchWallet(); // Refresh balance
              }}
            />
          )}

          {method === 'link' && (
            <div className="space-y-6">
              <div className="text-center">
                <Link2 className="w-16 h-16 text-primary-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">Payment Link</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Share this link to receive payments
                </p>
              </div>

              {/* Generated Link */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Your payment link:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={paymentLink || generatePaymentLink()}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {copied ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copy Link
                    </>
                  )}
                </button>

                {navigator.share && (
                  <button
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
                  >
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                )}
              </div>

              {/* Amount display */}
              {parsedAmount && (
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Requesting</p>
                  <p className="text-2xl font-bold text-green-700">
                    ${parsedAmount.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Instructions */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            {method === 'qr' && (
              <>
                <li>1. Show the QR code to the sender</li>
                <li>2. They scan it with their camera or app</li>
                <li>3. Payment is sent directly to your wallet</li>
              </>
            )}
            {method === 'nfc' && (
              <>
                <li>1. Generate an NFC token</li>
                <li>2. Tap your phone to the sender's phone</li>
                <li>3. Payment is transferred instantly</li>
              </>
            )}
            {method === 'link' && (
              <>
                <li>1. Copy or share the payment link</li>
                <li>2. Sender opens the link and confirms</li>
                <li>3. Money arrives in your wallet</li>
              </>
            )}
          </ul>
        </Card>
      </div>
    </MainLayout>
  );
}

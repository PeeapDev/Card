import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  Truck,
  QrCode,
  User,
  Mail,
  Phone,
  Shield,
  Wallet,
  Wifi,
  Usb,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input, MotionCard } from '@/components/ui';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  useAllCardOrders,
  useGenerateCard,
  useRejectCardOrder,
  useUpdateShipping,
} from '@/hooks/useCards';
import type { CardOrder } from '@/services/card.service';
import { clsx } from 'clsx';
import { currencyService, Currency } from '@/services/currency.service';
import { useNFC } from '@/hooks/useNFC';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_TABS = [
  { value: undefined, label: 'All Orders' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'GENERATED', label: 'Generated' },
  { value: 'ACTIVATED', label: 'Activated' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function CardOrdersPage() {
  const queryClient = useQueryClient();

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<CardOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [generateNotes, setGenerateNotes] = useState('');

  // NFC Programming state
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [selectedOrderForNFC, setSelectedOrderForNFC] = useState<CardOrder | null>(null);
  const [nfcWriteStatus, setNfcWriteStatus] = useState<'idle' | 'waiting' | 'writing' | 'success' | 'error'>('idle');
  const [nfcWriteError, setNfcWriteError] = useState<string | null>(null);
  const [isRewriteMode, setIsRewriteMode] = useState(false);

  // Batch selection state
  const [selectedForBatch, setSelectedForBatch] = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentOrder: null as CardOrder | null });
  const [batchStatus, setBatchStatus] = useState<'idle' | 'processing' | 'waiting' | 'complete'>('idle');

  // NFC Hook
  const {
    status: nfcStatus,
    lastCardRead,
    connectUSBReader,
    startUSBScanning,
    writeToCard,
    onCardDetected,
    error: nfcError,
  } = useNFC();

  const isNFCReaderConnected = nfcStatus.usbReader.connected || nfcStatus.webNFC.scanning;

  const { data: orders, isLoading, refetch } = useAllCardOrders(statusFilter);
  const generateCard = useGenerateCard();
  const rejectOrder = useRejectCardOrder();
  const updateShipping = useUpdateShipping();

  // Get NFC status badge for an order
  const getNFCBadge = (order: CardOrder) => {
    if (order.nfcProgrammed) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          <Wifi className="w-3 h-3" />
          NFC Ready
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
        <Wifi className="w-3 h-3" />
        Not Programmed
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
      PENDING: {
        icon: <Clock className="w-3 h-3" />,
        className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
        label: 'Pending Review',
      },
      APPROVED: {
        icon: <CheckCircle className="w-3 h-3" />,
        className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        label: 'Approved',
      },
      REJECTED: {
        icon: <XCircle className="w-3 h-3" />,
        className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        label: 'Rejected',
      },
      GENERATED: {
        icon: <CreditCard className="w-3 h-3" />,
        className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
        label: 'Card Generated',
      },
      ACTIVATED: {
        icon: <CheckCircle className="w-3 h-3" />,
        className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        label: 'Activated',
      },
      CANCELLED: {
        icon: <XCircle className="w-3 h-3" />,
        className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
        label: 'Cancelled',
      },
    };

    const badge = badges[status] || badges.PENDING;
    return (
      <span className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', badge.className)}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  const handleViewOrder = (order: CardOrder) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const handleGenerateCard = async () => {
    if (!selectedOrder) return;
    try {
      await generateCard.mutateAsync({
        orderId: selectedOrder.id,
        notes: generateNotes || undefined,
      });
      setShowDetailModal(false);
      setGenerateNotes('');
    } catch (error) {
      console.error('Failed to generate card:', error);
    }
  };

  const handleRejectOrder = async () => {
    if (!selectedOrder || !rejectNotes.trim()) return;
    try {
      await rejectOrder.mutateAsync({
        orderId: selectedOrder.id,
        notes: rejectNotes,
      });
      setShowRejectModal(false);
      setShowDetailModal(false);
      setRejectNotes('');
    } catch (error) {
      console.error('Failed to reject order:', error);
    }
  };

  const handleUpdateShipping = async () => {
    if (!selectedOrder || !trackingNumber.trim()) return;
    try {
      await updateShipping.mutateAsync({
        orderId: selectedOrder.id,
        trackingNumber: trackingNumber,
      });
      setShowShippingModal(false);
      setTrackingNumber('');
    } catch (error) {
      console.error('Failed to update shipping:', error);
    }
  };

  // Connect NFC Reader
  const handleConnectReader = async () => {
    try {
      const connected = await connectUSBReader();
      if (connected) {
        startUSBScanning();
      }
    } catch (err) {
      console.error('Failed to connect reader:', err);
    }
  };

  // Open NFC Programming Modal for single order
  const handleProgramNFC = (order: CardOrder, rewrite: boolean = false) => {
    if (!order.wallet?.id) {
      alert('This order does not have a linked wallet. Cannot program NFC.');
      return;
    }
    setSelectedOrderForNFC(order);
    setIsRewriteMode(rewrite);
    setNfcWriteStatus('idle');
    setNfcWriteError(null);
    setShowNFCModal(true);
  };

  // Write NFC data to card for single order
  const handleWriteNFC = useCallback(async () => {
    if (!selectedOrderForNFC?.wallet?.id) {
      setNfcWriteError('No wallet linked to this order');
      return;
    }

    if (!lastCardRead) {
      setNfcWriteStatus('waiting');
      setNfcWriteError(null);
      return;
    }

    setNfcWriteStatus('writing');
    setNfcWriteError(null);

    try {
      // Write wallet ID to the NFC card
      const walletId = selectedOrderForNFC.wallet.id;
      const success = await writeToCard(walletId);

      if (success) {
        // Update database to mark as NFC programmed
        const { error: updateError } = await supabase
          .from('card_orders')
          .update({
            nfc_programmed: true,
            nfc_programmed_at: new Date().toISOString(),
            nfc_card_uid: lastCardRead.uid,
          })
          .eq('id', selectedOrderForNFC.id);

        if (updateError) {
          throw new Error('Failed to update order status');
        }

        setNfcWriteStatus('success');

        // Refresh the orders list
        queryClient.invalidateQueries({ queryKey: ['cardOrders'] });
        refetch();

        // Auto-close after success
        setTimeout(() => {
          setShowNFCModal(false);
          setSelectedOrderForNFC(null);
          setNfcWriteStatus('idle');
        }, 2000);
      } else {
        throw new Error(nfcError || 'Failed to write to card');
      }
    } catch (err: any) {
      setNfcWriteStatus('error');
      setNfcWriteError(err.message || 'Failed to program NFC card');
    }
  }, [selectedOrderForNFC, lastCardRead, writeToCard, nfcError, queryClient, refetch]);

  // Auto-trigger write when card is detected and we're waiting
  useEffect(() => {
    if (nfcWriteStatus === 'waiting' && lastCardRead && selectedOrderForNFC) {
      handleWriteNFC();
    }
  }, [lastCardRead, nfcWriteStatus, selectedOrderForNFC, handleWriteNFC]);

  // Batch selection handlers
  const toggleBatchSelection = (orderId: string) => {
    const newSelection = new Set(selectedForBatch);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedForBatch(newSelection);
  };

  const selectAllUnprogrammed = () => {
    const unprogrammed = filteredOrders
      ?.filter(o => o.status === 'GENERATED' && o.cardType?.cardType === 'PHYSICAL' && !o.nfcProgrammed)
      .map(o => o.id) || [];
    setSelectedForBatch(new Set(unprogrammed));
  };

  const clearBatchSelection = () => {
    setSelectedForBatch(new Set());
  };

  // Batch programming
  const handleBatchProgram = async () => {
    const selectedOrders = filteredOrders?.filter(o => selectedForBatch.has(o.id)) || [];
    if (selectedOrders.length === 0) return;

    setBatchProgress({ current: 0, total: selectedOrders.length, currentOrder: null });
    setBatchStatus('processing');
    setShowBatchModal(true);

    for (let i = 0; i < selectedOrders.length; i++) {
      const order = selectedOrders[i];
      setBatchProgress({ current: i + 1, total: selectedOrders.length, currentOrder: order });
      setBatchStatus('waiting');

      // Wait for card to be placed
      await new Promise<void>((resolve) => {
        const checkCard = setInterval(async () => {
          if (lastCardRead && order.wallet?.id) {
            clearInterval(checkCard);

            // Write to card
            const success = await writeToCard(order.wallet.id);
            if (success) {
              await supabase
                .from('card_orders')
                .update({
                  nfc_programmed: true,
                  nfc_programmed_at: new Date().toISOString(),
                  nfc_card_uid: lastCardRead.uid,
                })
                .eq('id', order.id);
            }

            resolve();
          }
        }, 500);

        // Timeout after 60 seconds per card
        setTimeout(() => {
          clearInterval(checkCard);
          resolve();
        }, 60000);
      });
    }

    setBatchStatus('complete');
    queryClient.invalidateQueries({ queryKey: ['cardOrders'] });
    refetch();
    setSelectedForBatch(new Set());
  };

  const filteredOrders = orders?.filter((order) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      order.user?.firstName?.toLowerCase().includes(searchLower) ||
      order.user?.lastName?.toLowerCase().includes(searchLower) ||
      order.user?.email?.toLowerCase().includes(searchLower) ||
      order.cardType?.name?.toLowerCase().includes(searchLower) ||
      order.cardNumber?.includes(searchQuery)
    );
  });

  // Filter for physical cards that need programming
  const physicalOrders = filteredOrders?.filter(o =>
    o.status === 'GENERATED' && o.cardType?.cardType === 'PHYSICAL'
  ) || [];
  const unprogrammedCount = physicalOrders.filter(o => !o.nfcProgrammed).length;
  const programmedCount = physicalOrders.filter(o => o.nfcProgrammed).length;

  const stats = {
    pending: orders?.filter((o) => o.status === 'PENDING').length || 0,
    generated: orders?.filter((o) => o.status === 'GENERATED').length || 0,
    activated: orders?.filter((o) => o.status === 'ACTIVATED').length || 0,
    rejected: orders?.filter((o) => o.status === 'REJECTED').length || 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Card Orders</h1>
            <p className="text-gray-500 dark:text-gray-400">Review and manage card purchase orders</p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Orders
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MotionCard className="p-4" delay={0}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
              </div>
            </div>
          </MotionCard>
          <MotionCard className="p-4" delay={0.1}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Generated</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.generated}</p>
              </div>
            </div>
          </MotionCard>
          <MotionCard className="p-4" delay={0.2}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Activated</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activated}</p>
              </div>
            </div>
          </MotionCard>
          <MotionCard className="p-4" delay={0.3}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Rejected</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</p>
              </div>
            </div>
          </MotionCard>
        </div>

        {/* NFC Reader Status & Batch Actions */}
        <MotionCard className="p-4" delay={0.35}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Reader Status */}
            <div className="flex items-center gap-4">
              <div className={clsx(
                'w-12 h-12 rounded-full flex items-center justify-center',
                isNFCReaderConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
              )}>
                <Usb className={clsx(
                  'w-6 h-6',
                  isNFCReaderConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                )} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">NFC Reader</h3>
                  <span className={clsx(
                    'w-2 h-2 rounded-full',
                    isNFCReaderConnected ? 'bg-green-500' : 'bg-red-500'
                  )} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isNFCReaderConnected
                    ? `Connected: ${nfcStatus.usbReader.deviceName || 'ACR122U'}`
                    : 'Connect reader to program cards'}
                </p>
              </div>
            </div>

            {/* NFC Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <Wifi className="w-4 h-4 text-orange-500" />
                <span className="text-orange-700 dark:text-orange-400">{unprogrammedCount} need programming</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-700 dark:text-green-400">{programmedCount} programmed</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!isNFCReaderConnected ? (
                <Button onClick={handleConnectReader}>
                  <Usb className="w-4 h-4 mr-2" />
                  Connect Reader
                </Button>
              ) : (
                <>
                  {selectedForBatch.size > 0 && (
                    <Button onClick={handleBatchProgram} className="bg-blue-600 hover:bg-blue-700">
                      <Wifi className="w-4 h-4 mr-2" />
                      Program {selectedForBatch.size} Cards
                    </Button>
                  )}
                  <Button variant="outline" onClick={selectAllUnprogrammed}>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Select Unprogrammed
                  </Button>
                  {selectedForBatch.size > 0 && (
                    <Button variant="ghost" onClick={clearBatchSelection}>
                      Clear
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Card Detection Indicator */}
          {isNFCReaderConnected && (
            <div className={clsx(
              'mt-4 p-3 rounded-lg flex items-center gap-3',
              lastCardRead
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700'
            )}>
              <CreditCard className={clsx('w-5 h-5', lastCardRead ? 'text-green-600' : 'text-gray-400')} />
              <span className={clsx('text-sm', lastCardRead ? 'text-green-700 dark:text-green-400' : 'text-gray-500')}>
                {lastCardRead
                  ? `Card detected - UID: ${lastCardRead.uid}`
                  : 'Place card on reader to detect...'}
              </span>
              <span className={clsx(
                'w-2 h-2 rounded-full ml-auto',
                lastCardRead ? 'bg-green-500' : 'bg-red-500'
              )} />
            </div>
          )}
        </MotionCard>

        {/* Filters */}
        <MotionCard className="p-4" delay={0.4}>
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value || 'all'}
                  onClick={() => setStatusFilter(tab.value)}
                  className={clsx(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    statusFilter === tab.value
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by customer, card type, or card number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </MotionCard>

        {/* Orders Table */}
        <MotionCard className="overflow-hidden" delay={0.5}>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading orders...</div>
          ) : filteredOrders && filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {isNFCReaderConnected && (
                      <th className="w-12 px-4 py-3"></th>
                    )}
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Card Type</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Card Number</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">NFC</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredOrders.map((order) => {
                    const isPhysical = order.cardType?.cardType === 'PHYSICAL';
                    const canProgram = order.status === 'GENERATED' && isPhysical && !order.nfcProgrammed;
                    const canRewrite = order.status === 'GENERATED' && isPhysical && order.nfcProgrammed;

                    return (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {isNFCReaderConnected && (
                          <td className="px-4 py-4">
                            {canProgram && (
                              <button
                                onClick={() => toggleBatchSelection(order.id)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                              >
                                {selectedForBatch.has(order.id)
                                  ? <CheckSquare className="w-5 h-5 text-blue-600" />
                                  : <Square className="w-5 h-5 text-gray-400" />
                                }
                              </button>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-900 dark:text-white">
                                {order.user?.firstName} {order.user?.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{order.user?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={clsx(
                                'w-8 h-5 rounded bg-gradient-to-br',
                                order.cardType?.colorGradient || 'from-blue-500 to-blue-700'
                              )}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{order.cardType?.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{order.cardType?.cardType}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(order.amountPaid)}</span>
                        </td>
                        <td className="px-6 py-4">
                          {order.cardNumber ? (
                            <span className="font-mono text-sm text-gray-900 dark:text-white">{order.cardNumber}</span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-sm">Not generated</span>
                          )}
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                        <td className="px-6 py-4">
                          {isPhysical ? getNFCBadge(order) : (
                            <span className="text-xs text-gray-400">Virtual</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewOrder(order)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {order.status === 'GENERATED' && isPhysical && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowShippingModal(true);
                                  }}
                                  title="Update Shipping"
                                >
                                  <Truck className="w-4 h-4" />
                                </Button>
                                {canProgram && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleProgramNFC(order)}
                                    title="Program NFC Card"
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    disabled={!isNFCReaderConnected}
                                  >
                                    <Wifi className="w-4 h-4" />
                                  </Button>
                                )}
                                {canRewrite && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleProgramNFC(order, true)}
                                    title="Rewrite NFC Card"
                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    disabled={!isNFCReaderConnected}
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No orders found</h3>
              <p className="text-gray-500 dark:text-gray-400">Card orders will appear here when users purchase cards</p>
            </div>
          )}
        </MotionCard>
      </div>

      {/* Single NFC Programming Modal */}
      {showNFCModal && selectedOrderForNFC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md bg-white dark:bg-gray-800">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Wifi className="w-5 h-5" />
                {isRewriteMode ? 'Rewrite NFC Card' : 'Program NFC Card'}
              </CardTitle>
            </CardHeader>

            <div className="p-6 space-y-4">
              {/* Order Info */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedOrderForNFC.user?.firstName} {selectedOrderForNFC.user?.lastName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Card: {selectedOrderForNFC.cardNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rewrite Warning */}
              {isRewriteMode && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-orange-700 dark:text-orange-400">
                      This will overwrite the existing NFC data on this card.
                    </span>
                  </div>
                </div>
              )}

              {/* Card Detection */}
              <div className={clsx(
                'p-4 rounded-lg border',
                lastCardRead
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
              )}>
                <div className="flex items-center gap-3">
                  <CreditCard className={clsx('w-6 h-6', lastCardRead ? 'text-green-600' : 'text-gray-400')} />
                  <div className="flex-1">
                    <p className={clsx('font-medium', lastCardRead ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-300')}>
                      {lastCardRead ? 'Card Detected' : 'Place Card on Reader'}
                    </p>
                    {lastCardRead && (
                      <p className="text-xs text-green-600 dark:text-green-500 font-mono">UID: {lastCardRead.uid}</p>
                    )}
                  </div>
                  <span className={clsx('w-3 h-3 rounded-full', lastCardRead ? 'bg-green-500' : 'bg-red-500')} />
                </div>
              </div>

              {/* Status Messages */}
              {nfcWriteStatus === 'waiting' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-sm text-blue-700 dark:text-blue-400">Waiting for card...</span>
                  </div>
                </div>
              )}

              {nfcWriteStatus === 'writing' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-sm text-blue-700 dark:text-blue-400">Writing to card...</span>
                  </div>
                </div>
              )}

              {nfcWriteStatus === 'success' && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-400">Card programmed successfully!</span>
                  </div>
                </div>
              )}

              {nfcWriteStatus === 'error' && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-700 dark:text-red-400">{nfcWriteError}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowNFCModal(false);
                    setSelectedOrderForNFC(null);
                    setNfcWriteStatus('idle');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleWriteNFC}
                  disabled={nfcWriteStatus === 'writing' || nfcWriteStatus === 'success'}
                >
                  {nfcWriteStatus === 'writing' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Writing...
                    </>
                  ) : nfcWriteStatus === 'waiting' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Waiting...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4 mr-2" />
                      {lastCardRead ? 'Write to Card' : 'Start Programming'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Batch Programming Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md bg-white dark:bg-gray-800">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Wifi className="w-5 h-5" />
                Batch Programming
              </CardTitle>
            </CardHeader>

            <div className="p-6 space-y-4">
              {/* Progress */}
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {batchProgress.current} / {batchProgress.total}
                </p>
                <p className="text-gray-500 dark:text-gray-400">Cards programmed</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                />
              </div>

              {/* Current Order */}
              {batchProgress.currentOrder && batchStatus !== 'complete' && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Now programming:</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {batchProgress.currentOrder.user?.firstName} {batchProgress.currentOrder.user?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{batchProgress.currentOrder.cardNumber}</p>
                </div>
              )}

              {/* Status */}
              {batchStatus === 'waiting' && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-700 dark:text-yellow-400">Place next card on reader...</span>
                  </div>
                </div>
              )}

              {batchStatus === 'complete' && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-400">All cards programmed!</span>
                  </div>
                </div>
              )}

              {/* Close Button */}
              {batchStatus === 'complete' && (
                <Button
                  className="w-full"
                  onClick={() => {
                    setShowBatchModal(false);
                    setBatchStatus('idle');
                  }}
                >
                  Done
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 dark:text-white">Order Details</CardTitle>
                <div className="flex items-center gap-2">
                  {selectedOrder.cardType?.cardType === 'PHYSICAL' && getNFCBadge(selectedOrder)}
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>
            </CardHeader>
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Customer Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="text-gray-500 dark:text-gray-400">Name:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedOrder.user?.firstName} {selectedOrder.user?.lastName}
                      </span>
                    </p>
                    <p className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                      <Mail className="w-3 h-3 text-gray-400" />
                      {selectedOrder.user?.email}
                    </p>
                    {selectedOrder.user?.phone && (
                      <p className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {selectedOrder.user.phone}
                      </p>
                    )}
                    <p className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                      <Shield className="w-3 h-3 text-gray-400" />
                      KYC: {selectedOrder.user?.kycStatus || 'Pending'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Card Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="text-gray-500 dark:text-gray-400">Card Type:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">{selectedOrder.cardType?.name}</span>
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="text-gray-500 dark:text-gray-400">Type:</span>{' '}
                      {selectedOrder.cardType?.cardType}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="text-gray-500 dark:text-gray-400">Price:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedOrder.amountPaid)}</span>
                    </p>
                    {selectedOrder.cardNumber && (
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="text-gray-500 dark:text-gray-400">Card Number:</span>{' '}
                        <span className="font-mono text-gray-900 dark:text-white">{selectedOrder.cardNumber}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* NFC Info for Physical Cards */}
              {selectedOrder.cardType?.cardType === 'PHYSICAL' && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    NFC Status
                  </h3>
                  {selectedOrder.nfcProgrammed ? (
                    <div className="space-y-1">
                      <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Card programmed and ready for tap-to-pay
                      </p>
                      {selectedOrder.nfcCardUid && (
                        <p className="text-xs text-gray-500 font-mono">Card UID: {selectedOrder.nfcCardUid}</p>
                      )}
                      {selectedOrder.nfcProgrammedAt && (
                        <p className="text-xs text-gray-500">
                          Programmed: {new Date(selectedOrder.nfcProgrammedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Card not yet programmed
                    </p>
                  )}
                </div>
              )}

              {/* Wallet Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Wallet className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Linked Wallet</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedOrder.wallet?.currency} Wallet - Balance: {formatCurrency(selectedOrder.wallet?.balance || 0)}
                  </p>
                </div>
              </div>

              {/* Shipping Info */}
              {selectedOrder.cardType?.cardType === 'PHYSICAL' && selectedOrder.shippingAddress && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Shipping Address
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.city},{' '}
                    {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.postalCode},{' '}
                    {selectedOrder.shippingAddress.country}
                  </p>
                  {selectedOrder.trackingNumber && (
                    <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                      <span className="text-gray-500 dark:text-gray-400">Tracking:</span>{' '}
                      <span className="font-mono text-gray-900 dark:text-white">{selectedOrder.trackingNumber}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Actions for pending orders */}
              {selectedOrder.status === 'PENDING' && (
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={generateNotes}
                      onChange={(e) => setGenerateNotes(e.target.value)}
                      placeholder="Add any notes about this order..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowDetailModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => setShowRejectModal(true)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={handleGenerateCard}
                      isLoading={generateCard.isPending}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Generate Card
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions for generated physical cards */}
              {selectedOrder.status === 'GENERATED' && selectedOrder.cardType?.cardType === 'PHYSICAL' && (
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                    Close
                  </Button>
                  {!selectedOrder.nfcProgrammed ? (
                    <Button
                      onClick={() => {
                        setShowDetailModal(false);
                        handleProgramNFC(selectedOrder);
                      }}
                      disabled={!isNFCReaderConnected}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Wifi className="w-4 h-4 mr-2" />
                      Program NFC
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDetailModal(false);
                        handleProgramNFC(selectedOrder, true);
                      }}
                      disabled={!isNFCReaderConnected}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Rewrite NFC
                    </Button>
                  )}
                </div>
              )}

              {/* Close for other statuses */}
              {(selectedOrder.status !== 'PENDING' && selectedOrder.status !== 'GENERATED') && (
                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                    Close
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-md p-6 bg-white dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Reject Order</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This will refund the customer and reject their card order. Please provide a reason.
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleRejectOrder}
                isLoading={rejectOrder.isPending}
                disabled={!rejectNotes.trim()}
              >
                Reject & Refund
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Shipping Modal */}
      {showShippingModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-md p-6 bg-white dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Add Shipping Info</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Enter the tracking number for the physical card shipment.
            </p>
            <Input
              label="Tracking Number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g., 1Z999AA10123456784"
              className="mb-4"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowShippingModal(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdateShipping}
                isLoading={updateShipping.isPending}
                disabled={!trackingNumber.trim()}
              >
                <Truck className="w-4 h-4 mr-2" />
                Update Shipping
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}

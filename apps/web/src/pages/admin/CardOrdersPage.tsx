import { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  Truck,
  QrCode,
  ChevronDown,
  User,
  Mail,
  Phone,
  Shield,
  Wallet,
  FileCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  useAllCardOrders,
  useGenerateCard,
  useRejectCardOrder,
  useUpdateShipping,
  useCardOrder,
} from '@/hooks/useCards';
import type { CardOrder } from '@/services/card.service';
import { clsx } from 'clsx';
import { currencyService, Currency } from '@/services/currency.service';

const STATUS_TABS = [
  { value: undefined, label: 'All Orders' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'GENERATED', label: 'Generated' },
  { value: 'ACTIVATED', label: 'Activated' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function CardOrdersPage() {
  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  const currencySymbol = defaultCurrency?.symbol || '';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  const { data: orders, isLoading } = useAllCardOrders(statusFilter);
  const generateCard = useGenerateCard();
  const rejectOrder = useRejectCardOrder();
  const updateShipping = useUpdateShipping();

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
      PENDING: {
        icon: <Clock className="w-3 h-3" />,
        className: 'bg-yellow-100 text-yellow-700',
        label: 'Pending Review',
      },
      APPROVED: {
        icon: <CheckCircle className="w-3 h-3" />,
        className: 'bg-blue-100 text-blue-700',
        label: 'Approved',
      },
      REJECTED: {
        icon: <XCircle className="w-3 h-3" />,
        className: 'bg-red-100 text-red-700',
        label: 'Rejected',
      },
      GENERATED: {
        icon: <CreditCard className="w-3 h-3" />,
        className: 'bg-purple-100 text-purple-700',
        label: 'Card Generated',
      },
      ACTIVATED: {
        icon: <CheckCircle className="w-3 h-3" />,
        className: 'bg-green-100 text-green-700',
        label: 'Activated',
      },
      CANCELLED: {
        icon: <XCircle className="w-3 h-3" />,
        className: 'bg-gray-100 text-gray-700',
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
            <h1 className="text-2xl font-bold text-gray-900">Card Orders</h1>
            <p className="text-gray-500">Review and manage card purchase orders</p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Orders
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Generated</p>
                <p className="text-2xl font-bold text-purple-600">{stats.generated}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Activated</p>
                <p className="text-2xl font-bold text-green-600">{stats.activated}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value || 'all'}
                  onClick={() => setStatusFilter(tab.value)}
                  className={clsx(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    statusFilter === tab.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Orders Table */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12">Loading orders...</div>
          ) : filteredOrders && filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Card Type</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Card Number</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {order.user?.firstName} {order.user?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{order.user?.email}</p>
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
                            <p className="text-sm font-medium">{order.cardType?.name}</p>
                            <p className="text-xs text-gray-500">{order.cardType?.cardType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium">{formatCurrency(order.amountPaid)}</span>
                      </td>
                      <td className="px-6 py-4">
                        {order.cardNumber ? (
                          <span className="font-mono text-sm">{order.cardNumber}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">Not generated</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
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
                          {order.status === 'GENERATED' && order.cardType?.cardType === 'PHYSICAL' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowShippingModal(true);
                              }}
                            >
                              <Truck className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-500">Card orders will appear here when users purchase cards</p>
            </div>
          )}
        </Card>
      </div>

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Order Details</CardTitle>
                {getStatusBadge(selectedOrder.status)}
              </div>
            </CardHeader>
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Customer Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-gray-500">Name:</span>{' '}
                      <span className="font-medium">
                        {selectedOrder.user?.firstName} {selectedOrder.user?.lastName}
                      </span>
                    </p>
                    <p className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-gray-400" />
                      {selectedOrder.user?.email}
                    </p>
                    {selectedOrder.user?.phone && (
                      <p className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {selectedOrder.user.phone}
                      </p>
                    )}
                    <p className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-gray-400" />
                      KYC: {selectedOrder.user?.kycStatus || 'Pending'}
                      {selectedOrder.user?.kycTier && ` (Tier ${selectedOrder.user.kycTier})`}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Card Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-gray-500">Card Type:</span>{' '}
                      <span className="font-medium">{selectedOrder.cardType?.name}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Type:</span>{' '}
                      {selectedOrder.cardType?.cardType}
                    </p>
                    <p>
                      <span className="text-gray-500">Price:</span>{' '}
                      <span className="font-medium">{formatCurrency(selectedOrder.amountPaid)}</span>
                    </p>
                    {selectedOrder.cardNumber && (
                      <p>
                        <span className="text-gray-500">Card Number:</span>{' '}
                        <span className="font-mono">{selectedOrder.cardNumber}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Preview */}
              {selectedOrder.cardType && (
                <div className="flex justify-center">
                  <div
                    className={clsx(
                      'w-80 aspect-[1.586/1] rounded-xl p-6 text-white bg-gradient-to-br shadow-lg',
                      selectedOrder.cardType.colorGradient
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs uppercase tracking-wider opacity-80">
                          {selectedOrder.cardType.cardType}
                        </p>
                        <p className="font-bold mt-1">{selectedOrder.cardType.name}</p>
                      </div>
                      <CreditCard className="w-8 h-8 opacity-80" />
                    </div>
                    <div className="absolute bottom-6 left-6 right-6">
                      <p className="text-lg tracking-widest font-mono">
                        {selectedOrder.cardNumber || '•••• •••• ••••'}
                      </p>
                      <p className="text-sm mt-2 opacity-80">
                        {selectedOrder.user?.firstName?.toUpperCase()}{' '}
                        {selectedOrder.user?.lastName?.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction & Wallet Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Wallet className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Payment from wallet</p>
                  <p className="font-medium">
                    {selectedOrder.wallet?.currency} Wallet - Balance: {formatCurrency(selectedOrder.wallet?.balance || 0)}
                  </p>
                </div>
              </div>

              {/* Shipping Info (for physical cards) */}
              {selectedOrder.cardType?.cardType === 'PHYSICAL' && selectedOrder.shippingAddress && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Shipping Address
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.city},{' '}
                    {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.postalCode},{' '}
                    {selectedOrder.shippingAddress.country}
                  </p>
                  {selectedOrder.trackingNumber && (
                    <p className="text-sm mt-2">
                      <span className="text-gray-500">Tracking:</span>{' '}
                      <span className="font-mono">{selectedOrder.trackingNumber}</span>
                    </p>
                  )}
                </div>
              )}

              {/* QR Code Preview (if generated) */}
              {selectedOrder.qrCodeData && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <QrCode className="w-8 h-8 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">QR Code for activation</p>
                    <p className="font-mono text-xs text-gray-400 truncate max-w-md">
                      {selectedOrder.qrCodeData}
                    </p>
                  </div>
                </div>
              )}

              {/* Review Notes */}
              {selectedOrder.reviewNotes && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Review Notes</h3>
                  <p className="text-sm text-gray-600">{selectedOrder.reviewNotes}</p>
                  {selectedOrder.reviewedAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      Reviewed on {new Date(selectedOrder.reviewedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Actions for pending orders */}
              {selectedOrder.status === 'PENDING' && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={generateNotes}
                      onChange={(e) => setGenerateNotes(e.target.value)}
                      placeholder="Add any notes about this order..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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

              {/* Close button for non-pending orders */}
              {selectedOrder.status !== 'PENDING' && (
                <div className="flex justify-end pt-4 border-t">
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
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Order</h3>
            <p className="text-gray-600 mb-4">
              This will refund the customer and reject their card order. Please provide a reason.
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 mb-4"
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
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Add Shipping Info</h3>
            <p className="text-gray-600 mb-4">
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

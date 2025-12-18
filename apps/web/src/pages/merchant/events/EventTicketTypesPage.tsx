/**
 * Event Ticket Types Page
 *
 * Manage ticket types for an event.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import eventService, { Event, EventTicketType } from '@/services/event.service';
import { currencyService } from '@/services/currency.service';
import {
  ArrowLeft,
  Plus,
  Ticket,
  Edit,
  Trash2,
  Loader2,
  DollarSign,
  Hash,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface TicketTypeFormData {
  name: string;
  description: string;
  price: string;
  quantity_available: string;
  max_per_order: string;
  is_active: boolean;
}

const defaultFormData: TicketTypeFormData = {
  name: '',
  description: '',
  price: '',
  quantity_available: '',
  max_per_order: '10',
  is_active: true,
};

export function EventTicketTypesPage() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<EventTicketType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<EventTicketType | null>(null);
  const [formData, setFormData] = useState<TicketTypeFormData>(defaultFormData);

  useEffect(() => {
    const loadData = async () => {
      if (!eventId) return;

      setLoading(true);
      try {
        const [eventData, typesData] = await Promise.all([
          eventService.getEventById(eventId),
          eventService.getEventTicketTypes(eventId),
        ]);
        setEvent(eventData);
        setTicketTypes(typesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId]);

  const formatCurrency = (amount: number) => {
    return currencyService.formatAmount(amount, 'SLE');
  };

  const openModal = (ticketType?: EventTicketType) => {
    if (ticketType) {
      setEditingType(ticketType);
      setFormData({
        name: ticketType.name,
        description: ticketType.description || '',
        price: ticketType.price.toString(),
        quantity_available: ticketType.quantity_available.toString(),
        max_per_order: (ticketType.max_per_order || 10).toString(),
        is_active: ticketType.is_active,
      });
    } else {
      setEditingType(null);
      setFormData(defaultFormData);
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!eventId || !user?.id) return;

    if (!formData.name.trim()) {
      alert('Please enter a ticket type name');
      return;
    }

    const price = parseFloat(formData.price) || 0;
    const quantity = parseInt(formData.quantity_available) || 0;

    if (quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    setSaving(true);
    try {
      const typeData: Partial<EventTicketType> = {
        event_id: eventId,
        merchant_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price,
        quantity_available: quantity,
        max_per_order: parseInt(formData.max_per_order) || 10,
        is_active: formData.is_active,
      };

      if (editingType?.id) {
        const updated = await eventService.updateEventTicketType(editingType.id, typeData);
        setTicketTypes(ticketTypes.map((t) => (t.id === editingType.id ? updated : t)));
      } else {
        const created = await eventService.createEventTicketType(typeData);
        setTicketTypes([...ticketTypes, created]);
      }

      setShowModal(false);
    } catch (error) {
      console.error('Error saving ticket type:', error);
      alert('Failed to save ticket type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (typeId: string) => {
    if (!confirm('Are you sure you want to delete this ticket type?')) return;

    try {
      await eventService.deleteEventTicketType(typeId);
      setTicketTypes(ticketTypes.filter((t) => t.id !== typeId));
    } catch (error) {
      console.error('Error deleting ticket type:', error);
      alert('Failed to delete ticket type');
    }
  };

  const handleToggleActive = async (ticketType: EventTicketType) => {
    try {
      const updated = await eventService.updateEventTicketType(ticketType.id!, {
        is_active: !ticketType.is_active,
      });
      setTicketTypes(ticketTypes.map((t) => (t.id === ticketType.id ? updated : t)));
    } catch (error) {
      console.error('Error toggling ticket type:', error);
      alert('Failed to update ticket type');
    }
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/merchant/events/${eventId}`)}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ticket Types</h1>
              <p className="text-gray-600 dark:text-gray-400">{event?.title}</p>
            </div>
          </div>
          <Button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
            Add Ticket Type
          </Button>
        </div>

        {/* Ticket Types List */}
        {ticketTypes.length === 0 ? (
          <Card className="p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No ticket types yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Create ticket types to start selling tickets
            </p>
            <Button
              onClick={() => openModal()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Add Your First Ticket Type
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {ticketTypes.map((ticketType) => (
              <Card key={ticketType.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        ticketType.is_active
                          ? 'bg-purple-100 dark:bg-purple-900/30'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                    >
                      <Ticket
                        className={`w-6 h-6 ${
                          ticketType.is_active
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-gray-400'
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {ticketType.name}
                        </h3>
                        {!ticketType.is_active && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      {ticketType.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {ticketType.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {ticketType.price === 0 ? 'Free' : formatCurrency(ticketType.price)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {ticketType.quantity_sold || 0} / {ticketType.quantity_available} sold
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(ticketType)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title={ticketType.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {ticketType.is_active ? (
                          <ToggleRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => openModal(ticketType)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        <Edit className="w-5 h-5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(ticketType.id!)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all"
                      style={{
                        width: `${
                          ((ticketType.quantity_sold || 0) / ticketType.quantity_available) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingType ? 'Edit Ticket Type' : 'Add Ticket Type'}
        >
          <Modal.Body>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., General Admission, VIP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  placeholder="What's included with this ticket?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price (NLe)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      placeholder="0 for free"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantity Available *
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.quantity_available}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity_available: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      placeholder="100"
                      min="1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Per Order
                </label>
                <select
                  value={formData.max_per_order}
                  onChange={(e) => setFormData({ ...formData, max_per_order: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                >
                  {[1, 2, 5, 10, 20, 50].map((num) => (
                    <option key={num} value={num}>
                      {num} tickets
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : editingType ? (
                'Save Changes'
              ) : (
                'Add Ticket Type'
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </MerchantLayout>
  );
}

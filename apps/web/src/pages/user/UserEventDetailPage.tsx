/**
 * User Event Detail Page
 *
 * Shows event details and allows users to purchase tickets.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useUserApps } from '@/context/UserAppsContext';
import eventService, { Event, EventTicketType } from '@/services/event.service';
import { currencyService } from '@/services/currency.service';
import { notificationService } from '@/services/notification.service';
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Loader2,
  ArrowLeft,
  Users,
  Minus,
  Plus,
  Share2,
  AlertCircle,
  CheckCircle,
  CreditCard,
} from 'lucide-react';

interface TicketSelection {
  ticketTypeId: string;
  quantity: number;
  price: number;
  name: string;
}

export function UserEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAppEnabled, hasLoadedFromDB, isLoading: appsLoading } = useUserApps();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<EventTicketType[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<TicketSelection[]>([]);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Redirect to enable events if not enabled
  useEffect(() => {
    if (!hasLoadedFromDB || appsLoading) return;
    if (!isAppEnabled('events')) {
      navigate('/profile', { state: { openApps: true } });
    }
  }, [hasLoadedFromDB, appsLoading, isAppEnabled, navigate]);

  // Load event and ticket types
  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId || !hasLoadedFromDB || appsLoading) return;
      if (!isAppEnabled('events')) return;

      setLoading(true);
      try {
        const [eventData, ticketTypesData] = await Promise.all([
          eventService.getPublishedEventById(eventId),
          eventService.getEventTicketTypes(eventId),
        ]);

        if (!eventData) {
          navigate('/events');
          return;
        }

        setEvent(eventData);
        setTicketTypes(ticketTypesData.filter(tt => tt.is_active));
      } catch (error) {
        console.error('Error loading event:', error);
        navigate('/events');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId, hasLoadedFromDB, appsLoading, isAppEnabled, navigate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return currencyService.formatAmount(amount, 'SLE');
  };

  const getAvailableQuantity = (ticketType: EventTicketType) => {
    return ticketType.quantity_available - (ticketType.quantity_sold || 0);
  };

  const updateTicketQuantity = (ticketType: EventTicketType, delta: number) => {
    setSelectedTickets(prev => {
      const existing = prev.find(t => t.ticketTypeId === ticketType.id);
      const currentQty = existing?.quantity || 0;
      const newQty = Math.max(0, Math.min(currentQty + delta, getAvailableQuantity(ticketType)));

      if (newQty === 0) {
        return prev.filter(t => t.ticketTypeId !== ticketType.id);
      }

      if (existing) {
        return prev.map(t =>
          t.ticketTypeId === ticketType.id ? { ...t, quantity: newQty } : t
        );
      }

      return [
        ...prev,
        {
          ticketTypeId: ticketType.id!,
          quantity: newQty,
          price: ticketType.price,
          name: ticketType.name,
        },
      ];
    });
  };

  const getSelectedQuantity = (ticketTypeId: string) => {
    return selectedTickets.find(t => t.ticketTypeId === ticketTypeId)?.quantity || 0;
  };

  const getTotalPrice = () => {
    return selectedTickets.reduce((sum, t) => sum + t.price * t.quantity, 0);
  };

  const getTotalTickets = () => {
    return selectedTickets.reduce((sum, t) => sum + t.quantity, 0);
  };

  const handlePurchase = async () => {
    if (!user || !event || selectedTickets.length === 0) return;

    setPurchasing(true);
    setPurchaseError(null);

    try {
      // Create tickets for each selection
      for (const selection of selectedTickets) {
        for (let i = 0; i < selection.quantity; i++) {
          await eventService.createEventTicket({
            event_id: event.id,
            ticket_type_id: selection.ticketTypeId,
            user_id: user.id,
            merchant_id: event.merchant_id,
            price_paid: selection.price,
            purchaser_name: `${user.firstName} ${user.lastName}`,
            purchaser_email: user.email,
            purchaser_phone: user.phone,
            attendee_name: `${user.firstName} ${user.lastName}`,
          });
        }
      }

      // Send ticket purchased notification
      try {
        const totalTickets = getTotalTickets();
        const totalPrice = getTotalPrice();
        const ticketTypeNames = selectedTickets.map(t => t.name).join(', ');

        await notificationService.sendTicketPurchased({
          userId: user.id,
          eventId: event.id!,
          eventTitle: event.title,
          eventDate: event.start_date,
          ticketCount: totalTickets,
          ticketType: ticketTypeNames,
          totalAmount: totalPrice,
          currency: 'SLE',
        });

        // Schedule event reminders
        await notificationService.scheduleEventReminders({
          userId: user.id,
          eventId: event.id!,
          eventTitle: event.title,
          eventDate: event.start_date,
          venueName: event.venue_name,
        });
      } catch (notifError) {
        console.warn('Failed to send notifications:', notifError);
        // Don't fail the purchase if notifications fail
      }

      setPurchaseSuccess(true);
      setSelectedTickets([]);
    } catch (error) {
      console.error('Error purchasing tickets:', error);
      setPurchaseError('Failed to purchase tickets. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleShare = async () => {
    if (!event) return;

    const shareData = {
      title: event.title,
      text: `Check out ${event.title} on ${formatDate(event.start_date)}`,
      url: window.location.href,
    };

    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading || appsLoading || !hasLoadedFromDB) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </MainLayout>
    );
  }

  if (!event) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Event not found
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            This event may have ended or been removed.
          </p>
          <Link to="/events">
            <Button>Browse Events</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>

        {/* Event Cover Image */}
        {event.cover_image ? (
          <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden">
            <img
              src={event.cover_image}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button
              onClick={handleShare}
              className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        ) : (
          <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <Calendar className="w-24 h-24 text-white/30" />
            <button
              onClick={handleShare}
              className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Event Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Title and Description */}
            <Card className="p-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {event.title}
              </h1>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <span>{formatDate(event.start_date)}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <span>
                    {formatTime(event.start_date)} - {formatTime(event.end_date)}
                  </span>
                </div>
                {event.venue_name && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    <div>
                      <div>{event.venue_name}</div>
                      {event.address && (
                        <div className="text-sm text-gray-500">{event.address}</div>
                      )}
                      {event.city && (
                        <div className="text-sm text-gray-500">{event.city}</div>
                      )}
                    </div>
                  </div>
                )}
                {event.capacity && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span>
                      {event.capacity - (event.tickets_sold || 0)} spots remaining
                    </span>
                  </div>
                )}
              </div>

              {event.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    About This Event
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              )}
            </Card>

            {/* Ticket Types */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Select Tickets
              </h2>

              {ticketTypes.length === 0 ? (
                <div className="text-center py-8">
                  <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No tickets available for this event.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ticketTypes.map((ticketType) => {
                    const available = getAvailableQuantity(ticketType);
                    const selectedQty = getSelectedQuantity(ticketType.id!);
                    const isSoldOut = available <= 0;

                    return (
                      <div
                        key={ticketType.id}
                        className={`p-4 border rounded-xl ${
                          isSoldOut
                            ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {ticketType.name}
                            </h4>
                            {ticketType.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {ticketType.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-4">
                              <span className="text-lg font-bold text-purple-600">
                                {ticketType.price === 0
                                  ? 'Free'
                                  : formatCurrency(ticketType.price)}
                              </span>
                              <span className="text-sm text-gray-500">
                                {isSoldOut ? 'Sold out' : `${available} available`}
                              </span>
                            </div>
                          </div>

                          {!isSoldOut && (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => updateTicketQuantity(ticketType, -1)}
                                disabled={selectedQty === 0}
                                className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center font-semibold">
                                {selectedQty}
                              </span>
                              <button
                                onClick={() => updateTicketQuantity(ticketType, 1)}
                                disabled={selectedQty >= available}
                                className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Order Summary - Sticky on desktop */}
          <div className="md:col-span-1">
            <div className="sticky top-4">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Order Summary
                </h2>

                {purchaseSuccess ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Tickets Purchased!
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Your tickets have been added to your account.
                    </p>
                    <Link to="/my-tickets">
                      <Button className="w-full">View My Tickets</Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {selectedTickets.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        Select tickets to continue
                      </p>
                    ) : (
                      <>
                        <div className="space-y-3 mb-4">
                          {selectedTickets.map((ticket) => (
                            <div
                              key={ticket.ticketTypeId}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-gray-600 dark:text-gray-400">
                                {ticket.name} x {ticket.quantity}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {formatCurrency(ticket.price * ticket.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
                          <div className="flex justify-between">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              Total ({getTotalTickets()} tickets)
                            </span>
                            <span className="font-bold text-lg text-purple-600">
                              {formatCurrency(getTotalPrice())}
                            </span>
                          </div>
                        </div>

                        {purchaseError && (
                          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {purchaseError}
                            </p>
                          </div>
                        )}

                        <Button
                          onClick={handlePurchase}
                          disabled={purchasing}
                          className="w-full"
                        >
                          {purchasing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4 mr-2" />
                              Get Tickets
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                          By purchasing, you agree to the event terms and conditions.
                        </p>
                      </>
                    )}
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default UserEventDetailPage;

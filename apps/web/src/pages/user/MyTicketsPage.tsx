/**
 * My Tickets Page
 *
 * Shows user's purchased event tickets with QR codes for scanning.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useUserApps } from '@/context/UserAppsContext';
import eventService, { EventTicket, Event, EventTicketType } from '@/services/event.service';
import { currencyService } from '@/services/currency.service';
import QRCode from 'react-qr-code';
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  QrCode,
  Download,
  Share2,
} from 'lucide-react';

interface TicketWithEvent extends EventTicket {
  events?: Event;
  event_ticket_types?: EventTicketType;
}

export function MyTicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAppEnabled, hasLoadedFromDB, isLoading: appsLoading } = useUserApps();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  // Redirect to enable events if not enabled
  useEffect(() => {
    if (!hasLoadedFromDB || appsLoading) return;
    if (!isAppEnabled('events')) {
      navigate('/profile', { state: { openApps: true } });
    }
  }, [hasLoadedFromDB, appsLoading, isAppEnabled, navigate]);

  // Load user's tickets
  useEffect(() => {
    const loadTickets = async () => {
      if (!user?.id || !hasLoadedFromDB || appsLoading) return;
      if (!isAppEnabled('events')) return;

      setLoading(true);
      try {
        const data = await eventService.getUserEventTickets(user.id);
        setTickets(data as TicketWithEvent[]);
      } catch (error) {
        console.error('Error loading tickets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, [user?.id, hasLoadedFromDB, appsLoading, isAppEnabled]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  const isEventPast = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const getStatusBadge = (ticket: TicketWithEvent) => {
    if (ticket.status === 'used') {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle className="w-3 h-3" />
          Used
        </span>
      );
    }
    if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="w-3 h-3" />
          {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
        <Ticket className="w-3 h-3" />
        Valid
      </span>
    );
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (!ticket.events) return false;
    const isPast = isEventPast(ticket.events.end_date);

    if (filter === 'upcoming') return !isPast;
    if (filter === 'past') return isPast;
    return true;
  });

  const handleShare = async (ticket: TicketWithEvent) => {
    if (!ticket.events) return;

    const shareData = {
      title: `Ticket for ${ticket.events.title}`,
      text: `My ticket for ${ticket.events.title} on ${formatDate(ticket.events.start_date)}`,
      url: window.location.href,
    };

    if (navigator.share) {
      await navigator.share(shareData);
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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Events
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Tickets</h1>
            <p className="text-gray-500 dark:text-gray-400">
              View and manage your event tickets
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['upcoming', 'past', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        {filteredTickets.length === 0 ? (
          <Card className="p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No tickets found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {filter === 'upcoming'
                ? "You don't have any upcoming event tickets."
                : filter === 'past'
                ? "You haven't attended any events yet."
                : "You haven't purchased any tickets yet."}
            </p>
            <Link to="/events">
              <Button>Browse Events</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => {
              const event = ticket.events;
              const ticketType = ticket.event_ticket_types;
              const isExpanded = expandedTicket === ticket.id;
              const isPast = event && isEventPast(event.end_date);

              return (
                <Card
                  key={ticket.id}
                  className={`overflow-hidden ${isPast ? 'opacity-75' : ''}`}
                >
                  {/* Ticket Header */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedTicket(isExpanded ? null : ticket.id!)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Event Image Thumbnail */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        {event?.cover_image ? (
                          <img
                            src={event.cover_image}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-white/50" />
                          </div>
                        )}
                      </div>

                      {/* Ticket Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                              {event?.title || 'Event'}
                            </h3>
                            <p className="text-sm text-purple-600 dark:text-purple-400">
                              {ticketType?.name || 'Ticket'}
                            </p>
                          </div>
                          {getStatusBadge(ticket)}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          {event && (
                            <>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(event.start_date)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatTime(event.start_date)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expand Arrow */}
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      {/* QR Code Section */}
                      <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center">
                        <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
                          <QRCode
                            value={ticket.qr_code}
                            size={180}
                            level="H"
                          />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          Ticket Number
                        </p>
                        <p className="font-mono font-semibold text-gray-900 dark:text-white">
                          {ticket.ticket_number}
                        </p>
                      </div>

                      {/* Ticket Details */}
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Attendee</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {ticket.attendee_name || ticket.purchaser_name || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Price Paid</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {ticket.price_paid === 0
                                ? 'Free'
                                : formatCurrency(ticket.price_paid)}
                            </p>
                          </div>
                          {event?.venue_name && (
                            <div className="col-span-2">
                              <p className="text-gray-500 dark:text-gray-400">Venue</p>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {event.venue_name}
                              </p>
                              {event.address && (
                                <p className="text-sm text-gray-500">{event.address}</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                          {event && (
                            <Link to={`/events/${event.id}`} className="flex-1">
                              <Button variant="secondary" className="w-full">
                                View Event
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="secondary"
                            onClick={() => handleShare(ticket)}
                            className="flex items-center gap-2"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Scan Status */}
                        {ticket.status === 'used' && ticket.scanned_at && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-sm text-green-600 dark:text-green-400">
                              Scanned at{' '}
                              {new Date(ticket.scanned_at).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default MyTicketsPage;

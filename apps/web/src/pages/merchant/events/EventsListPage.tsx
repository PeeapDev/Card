/**
 * Events List Page
 *
 * Lists all events with filtering, search, and CRUD operations.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import eventService, { Event, EventStatus } from '@/services/event.service';
import { currencyService } from '@/services/currency.service';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Ticket,
  Users,
  QrCode,
  BarChart3,
  Loader2,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Send,
  ArrowLeft,
} from 'lucide-react';

const statusFilters: { value: EventStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Events' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

export function EventsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Load events
  useEffect(() => {
    const loadEvents = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        const data = await eventService.getEvents(user.id);
        setEvents(data);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [user]);

  // Filter events
  useEffect(() => {
    let filtered = events;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.venue_name?.toLowerCase().includes(query) ||
          e.city?.toLowerCase().includes(query)
      );
    }

    setFilteredEvents(filtered);
  }, [events, statusFilter, searchQuery]);

  const formatCurrency = (amount: number) => {
    return currencyService.formatAmount(amount, 'SLE');
  };

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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return styles[status] || styles.draft;
  };

  const handlePublish = async (eventId: string) => {
    try {
      await eventService.publishEvent(eventId);
      setEvents(events.map((e) => (e.id === eventId ? { ...e, status: 'published' } : e)));
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error publishing event:', error);
      alert('Failed to publish event');
    }
  };

  const handleCancel = async (eventId: string) => {
    if (!confirm('Are you sure you want to cancel this event?')) return;

    try {
      await eventService.cancelEvent(eventId);
      setEvents(events.map((e) => (e.id === eventId ? { ...e, status: 'cancelled' } : e)));
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error cancelling event:', error);
      alert('Failed to cancel event');
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) return;

    try {
      await eventService.deleteEvent(eventId);
      setEvents(events.filter((e) => e.id !== eventId));
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/merchant/apps/events')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Events</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/merchant/events/create')}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {events.length === 0 ? 'No events yet' : 'No events match your search'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {events.length === 0
                ? 'Create your first event to get started'
                : 'Try adjusting your filters'}
            </p>
            {events.length === 0 && (
              <Button
                onClick={() => navigate('/merchant/events/create')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Create Your First Event
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Event Image */}
                  <div className="md:w-48 h-32 md:h-auto flex-shrink-0">
                    {event.cover_image ? (
                      <img
                        src={event.cover_image}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Calendar className="w-12 h-12 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Event Info */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            to={`/merchant/events/${event.id}`}
                            className="text-lg font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400"
                          >
                            {event.title}
                          </Link>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(
                              event.status
                            )}`}
                          >
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDate(event.start_date)} at {formatTime(event.start_date)}
                          </span>
                          {event.venue_name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {event.venue_name}
                              {event.city && `, ${event.city}`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Menu */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActionMenuOpen(actionMenuOpen === event.id ? null : event.id!)
                          }
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-500" />
                        </button>

                        {actionMenuOpen === event.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenuOpen(null)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                              <Link
                                to={`/merchant/events/${event.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </Link>
                              <Link
                                to={`/merchant/events/${event.id}/edit`}
                                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Edit className="w-4 h-4" />
                                Edit Event
                              </Link>
                              <Link
                                to={`/merchant/events/${event.id}/tickets`}
                                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Ticket className="w-4 h-4" />
                                Manage Tickets
                              </Link>
                              <Link
                                to={`/merchant/events/${event.id}/staff`}
                                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Users className="w-4 h-4" />
                                Manage Staff
                              </Link>
                              <Link
                                to={`/merchant/events/${event.id}/scanner`}
                                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <QrCode className="w-4 h-4" />
                                Scan Tickets
                              </Link>
                              <hr className="my-1 border-gray-200 dark:border-gray-700" />
                              {event.status === 'draft' && (
                                <button
                                  onClick={() => handlePublish(event.id!)}
                                  className="flex items-center gap-2 px-4 py-2 w-full text-left text-green-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Send className="w-4 h-4" />
                                  Publish Event
                                </button>
                              )}
                              {event.status === 'published' && (
                                <button
                                  onClick={() => handleCancel(event.id!)}
                                  className="flex items-center gap-2 px-4 py-2 w-full text-left text-orange-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Cancel Event
                                </button>
                              )}
                              {(event.status === 'draft' || event.status === 'cancelled') && (
                                <button
                                  onClick={() => handleDelete(event.id!)}
                                  className="flex items-center gap-2 px-4 py-2 w-full text-left text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete Event
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {event.tickets_sold || 0}
                          </span>{' '}
                          tickets sold
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(event.total_revenue || 0)}
                          </span>{' '}
                          revenue
                        </span>
                      </div>
                      {event.capacity && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {event.capacity - (event.tickets_sold || 0)}
                            </span>{' '}
                            spots left
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MerchantLayout>
  );
}

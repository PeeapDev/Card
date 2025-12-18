/**
 * Event Details Page
 *
 * Shows single event with overview, stats, and actions.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import eventService, { Event, EventAnalytics } from '@/services/event.service';
import { currencyService } from '@/services/currency.service';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Edit,
  Ticket,
  Users,
  QrCode,
  BarChart3,
  Loader2,
  Send,
  XCircle,
  CheckCircle,
  Share2,
  Copy,
  ExternalLink,
  Wallet,
} from 'lucide-react';

export function EventDetailsPage() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);

  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId) return;

      setLoading(true);
      try {
        const [eventData, analyticsData] = await Promise.all([
          eventService.getEventById(eventId),
          eventService.getEventAnalytics(eventId),
        ]);
        setEvent(eventData);
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Error loading event:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  const formatCurrency = (amount: number) => {
    return currencyService.formatAmount(amount, 'SLE');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
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
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      draft: {
        bg: 'bg-gray-100 dark:bg-gray-700',
        text: 'text-gray-700 dark:text-gray-300',
        icon: <Edit className="w-4 h-4" />,
      },
      published: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        icon: <CheckCircle className="w-4 h-4" />,
      },
      cancelled: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        icon: <XCircle className="w-4 h-4" />,
      },
      completed: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        icon: <CheckCircle className="w-4 h-4" />,
      },
    };
    return styles[status] || styles.draft;
  };

  const handlePublish = async () => {
    if (!eventId) return;
    try {
      await eventService.publishEvent(eventId);
      setEvent((prev) => (prev ? { ...prev, status: 'published' } : null));
    } catch (error) {
      console.error('Error publishing event:', error);
      alert('Failed to publish event');
    }
  };

  const handleCancel = async () => {
    if (!eventId || !confirm('Are you sure you want to cancel this event?')) return;
    try {
      await eventService.cancelEvent(eventId);
      setEvent((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
    } catch (error) {
      console.error('Error cancelling event:', error);
      alert('Failed to cancel event');
    }
  };

  const handleComplete = async () => {
    if (!eventId) return;
    try {
      await eventService.completeEvent(eventId);
      setEvent((prev) => (prev ? { ...prev, status: 'completed' } : null));
    } catch (error) {
      console.error('Error completing event:', error);
      alert('Failed to complete event');
    }
  };

  const copyEventLink = () => {
    const link = `${window.location.origin}/events/${eventId}`;
    navigator.clipboard.writeText(link);
    alert('Event link copied!');
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

  if (!event) {
    return (
      <MerchantLayout>
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Event not found
          </h2>
          <Button onClick={() => navigate('/merchant/events')}>Back to Events</Button>
        </div>
      </MerchantLayout>
    );
  }

  const statusStyle = getStatusBadge(event.status);

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/merchant/events')} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{event.title}</h1>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}
                >
                  {statusStyle.icon}
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDate(event.start_date)} at {formatTime(event.start_date)}
                </span>
                {event.venue_name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {event.venue_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {event.status === 'draft' && (
              <Button
                onClick={handlePublish}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4" />
                Publish
              </Button>
            )}
            {event.status === 'published' && (
              <>
                <Button variant="outline" onClick={copyEventLink} className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  onClick={handleComplete}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete
                </Button>
              </>
            )}
            <Link to={`/merchant/events/${eventId}/edit`}>
              <Button variant="outline" className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            </Link>
          </div>
        </div>

        {/* Cover Image */}
        {event.cover_image && (
          <div className="h-64 rounded-xl overflow-hidden">
            <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Link to={`/merchant/events/${eventId}/tickets`}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                  <Ticket className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Tickets</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage types</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to={`/merchant/events/${eventId}/staff`}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Staff</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage team</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to={`/merchant/events/${eventId}/scanner`}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                  <QrCode className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Scanner</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Scan tickets</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to={`/merchant/events/${eventId}/wallet`}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                  <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Wallet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage funds</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to={`/merchant/events/${eventId}/analytics`}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                  <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Analytics</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">View stats</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tickets Sold</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics?.total_tickets || 0}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tickets Scanned</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics?.tickets_scanned || 0}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Revenue</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(analytics?.total_revenue || 0)}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Attendance Rate</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {(analytics?.attendance_rate || 0).toFixed(1)}%
            </p>
          </Card>
        </div>

        {/* Description */}
        {event.description && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              About This Event
            </h2>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {event.description}
            </p>
          </Card>
        )}

        {/* Event Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Event Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Date & Time</p>
              <p className="text-gray-900 dark:text-white">
                {formatDate(event.start_date)}
                <br />
                {formatTime(event.start_date)} - {formatTime(event.end_date)}
              </p>
            </div>

            {event.venue_name && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Location</p>
                <p className="text-gray-900 dark:text-white">
                  {event.venue_name}
                  {event.address && (
                    <>
                      <br />
                      {event.address}
                    </>
                  )}
                  {event.city && (
                    <>
                      <br />
                      {event.city}, {event.country}
                    </>
                  )}
                </p>
              </div>
            )}

            {event.capacity && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Capacity</p>
                <p className="text-gray-900 dark:text-white">
                  {event.capacity} attendees
                  {event.tickets_sold !== undefined && (
                    <span className="text-gray-500">
                      {' '}
                      ({event.capacity - event.tickets_sold} remaining)
                    </span>
                  )}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ticket Type</p>
              <p className="text-gray-900 dark:text-white">
                {event.is_free ? 'Free Event' : 'Paid Tickets'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </MerchantLayout>
  );
}

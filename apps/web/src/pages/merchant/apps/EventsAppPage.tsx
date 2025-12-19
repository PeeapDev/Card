/**
 * Events App Page
 *
 * Main dashboard for the Events app.
 * Shows stats, recent events, and quick actions.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useApps } from '@/context/AppsContext';
import eventService, { Event } from '@/services/event.service';
import { currencyService } from '@/services/currency.service';
import {
  Calendar,
  Plus,
  Ticket,
  Users,
  DollarSign,
  BarChart3,
  QrCode,
  ArrowRight,
  CalendarDays,
  Loader2,
  TrendingUp,
  Clock,
  MapPin,
} from 'lucide-react';

interface EventStats {
  totalEvents: number;
  upcomingEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
}

export function EventsAppPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAppEnabled, hasLoadedFromDB, isLoading: appsLoading } = useApps();
  const [loading, setLoading] = useState(true);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<EventStats>({
    totalEvents: 0,
    upcomingEvents: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
  });

  // Check if setup is completed - wait for AppsContext to load from DB first
  useEffect(() => {
    // Wait for AppsContext to finish loading from database
    if (!hasLoadedFromDB || appsLoading) return;
    if (!user?.id) return;

    // Use the app enabled state from AppsContext (which already queried the DB)
    const eventsEnabled = isAppEnabled('events');

    if (!eventsEnabled) {
      navigate('/merchant/events/setup', { replace: true });
      return;
    }

    setCheckingSetup(false);
  }, [user, navigate, hasLoadedFromDB, appsLoading, isAppEnabled]);

  // Load events and calculate stats
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id || checkingSetup) return;

      setLoading(true);
      try {
        const allEvents = await eventService.getEvents(user.id);
        setEvents(allEvents);

        // Calculate stats
        const now = new Date();
        const upcoming = allEvents.filter(
          e => e.status === 'published' && new Date(e.start_date) > now
        );

        setStats({
          totalEvents: allEvents.length,
          upcomingEvents: upcoming.length,
          totalTicketsSold: allEvents.reduce((sum, e) => sum + (e.tickets_sold || 0), 0),
          totalRevenue: allEvents.reduce((sum, e) => sum + (e.total_revenue || 0), 0),
        });
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, checkingSetup]);

  if (checkingSetup || appsLoading || !hasLoadedFromDB) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </MerchantLayout>
    );
  }

  const formatCurrency = (amount: number) => {
    return currencyService.formatAmount(amount, 'SLE');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  const recentEvents = events.slice(0, 5);

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              Events
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your events and ticket sales
            </p>
          </div>
          <Button
            onClick={() => navigate('/merchant/events/create')}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Events</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {loading ? '-' : stats.totalEvents}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {loading ? '-' : stats.upcomingEvents}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Ticket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tickets Sold</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {loading ? '-' : stats.totalTicketsSold}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {loading ? '-' : formatCurrency(stats.totalRevenue)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/merchant/events">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                  <CalendarDays className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">All Events</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">View & manage</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/merchant/events/create">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                  <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Create Event</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">New event</p>
                </div>
              </div>
            </Card>
          </Link>

          {events.length > 0 && (
            <Link to={`/merchant/events/${events[0]?.id}/scanner`}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                    <QrCode className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Scan Tickets</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">At the door</p>
                  </div>
                </div>
              </Card>
            </Link>
          )}

          {events.length > 0 && (
            <Link to={`/merchant/events/${events[0]?.id}/analytics`}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                    <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Analytics</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">View reports</p>
                  </div>
                </div>
              </Card>
            </Link>
          )}
        </div>

        {/* Recent Events */}
        <Card>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Events</h2>
            <Link
              to="/merchant/events"
              className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
            </div>
          ) : recentEvents.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">No events yet</p>
              <Button
                onClick={() => navigate('/merchant/events/create')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Create Your First Event
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/merchant/events/${event.id}`}
                  className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {event.cover_image ? (
                      <img
                        src={event.cover_image}
                        alt={event.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {event.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(
                            event.status
                          )}`}
                        >
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDate(event.start_date)}
                        </span>
                        {event.venue_name && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-4 h-4" />
                            {event.venue_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {event.tickets_sold || 0} sold
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(event.total_revenue || 0)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </MerchantLayout>
  );
}

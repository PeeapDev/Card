/**
 * User Events Page
 *
 * Browse and discover upcoming events.
 * Users can view event details and purchase tickets.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useUserApps } from '@/context/UserAppsContext';
import eventService, { Event } from '@/services/event.service';
import { currencyService } from '@/services/currency.service';
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Search,
  Filter,
  Loader2,
  ChevronRight,
  Star,
  Users,
} from 'lucide-react';

export function UserEventsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAppEnabled, hasLoadedFromDB, isLoading: appsLoading } = useUserApps();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Redirect to enable events if not enabled
  useEffect(() => {
    if (!hasLoadedFromDB || appsLoading) return;
    if (!isAppEnabled('events')) {
      navigate('/profile', { state: { openApps: true } });
    }
  }, [hasLoadedFromDB, appsLoading, isAppEnabled, navigate]);

  // Load published events
  useEffect(() => {
    const loadEvents = async () => {
      if (!hasLoadedFromDB || appsLoading) return;
      if (!isAppEnabled('events')) return;

      setLoading(true);
      try {
        const data = await eventService.getPublishedEvents();
        setEvents(data);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [hasLoadedFromDB, appsLoading, isAppEnabled]);

  // Filter events based on search and category
  useEffect(() => {
    let filtered = events;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.venue_name?.toLowerCase().includes(query) ||
          event.city?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((event) => event.category === categoryFilter);
    }

    setFilteredEvents(filtered);
  }, [events, searchQuery, categoryFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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

  // Get unique categories from events
  const categories = [...new Set(events.map((e) => e.category).filter(Boolean))];

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discover Events</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Find and attend amazing events near you
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* My Tickets Link */}
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <Link to="/my-tickets" className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">My Tickets</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View your purchased tickets
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </Card>

        {/* Events List */}
        {filteredEvents.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No events found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || categoryFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Check back later for upcoming events'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredEvents.map((event) => (
              <Link key={event.id} to={`/events/${event.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                  {/* Cover Image */}
                  {event.cover_image ? (
                    <div className="h-40 overflow-hidden">
                      <img
                        src={event.cover_image}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                      <Calendar className="w-12 h-12 text-white/50" />
                    </div>
                  )}

                  <div className="p-4">
                    {/* Date Badge */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-medium">{formatDate(event.start_date)}</span>
                      </div>
                      {event.is_free ? (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Free
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          From {formatCurrency(event.min_price || 0)}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {event.title}
                    </h3>

                    {/* Details */}
                    <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(event.start_date)}</span>
                      </div>
                      {event.venue_name && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{event.venue_name}</span>
                        </div>
                      )}
                      {event.tickets_sold !== undefined && event.capacity && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>
                            {event.capacity - event.tickets_sold} spots left
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default UserEventsPage;

/**
 * Event Analytics Page
 *
 * Charts and statistics for an event.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import eventService, { Event, EventAnalytics, EventTicketType } from '@/services/event.service';
import { currencyService } from '@/services/currency.service';
import {
  ArrowLeft,
  BarChart3,
  Ticket,
  DollarSign,
  Users,
  TrendingUp,
  Loader2,
  PieChart,
} from 'lucide-react';

export function EventAnalyticsPage() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [ticketTypes, setTicketTypes] = useState<EventTicketType[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!eventId) return;

      setLoading(true);
      try {
        const [eventData, analyticsData, typesData] = await Promise.all([
          eventService.getEventById(eventId),
          eventService.getEventAnalytics(eventId),
          eventService.getEventTicketTypes(eventId),
        ]);
        setEvent(eventData);
        setAnalytics(analyticsData);
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

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </MerchantLayout>
    );
  }

  // Calculate ticket type percentages
  const totalSold = analytics?.total_tickets || 0;
  const ticketTypeStats = ticketTypes.map((type) => {
    const typeData = analytics?.tickets_by_type[type.id!] || { sold: 0, scanned: 0, revenue: 0 };
    return {
      ...type,
      sold: typeData.sold,
      scanned: typeData.scanned,
      revenue: typeData.revenue,
      percentage: totalSold > 0 ? (typeData.sold / totalSold) * 100 : 0,
    };
  });

  // Get staff stats
  const staffStats = Object.entries(analytics?.scans_by_staff || {}).map(([id, data]) => ({
    id,
    name: data.name,
    count: data.count,
  }));

  // Colors for charts
  const colors = [
    '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B',
    '#EF4444', '#3B82F6', '#84CC16', '#F97316', '#6366F1',
  ];

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/merchant/events/${eventId}`)}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400">{event?.title}</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Ticket className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics?.total_tickets || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Checked In</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics?.tickets_scanned || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Attendance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(analytics?.attendance_rate || 0).toFixed(1)}%
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(analytics?.total_revenue || 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Tickets by Type */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Tickets by Type
            </h2>

            {ticketTypeStats.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No ticket types created yet
              </div>
            ) : (
              <div className="space-y-4">
                {ticketTypeStats.map((type, index) => (
                  <div key={type.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {type.name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {type.sold} / {type.quantity_available}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(type.sold / type.quantity_available) * 100}%`,
                          backgroundColor: colors[index % colors.length],
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{type.percentage.toFixed(1)}% of total sales</span>
                      <span>{formatCurrency(type.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Staff Performance */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Staff Performance
            </h2>

            {staffStats.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No scans recorded yet
              </div>
            ) : (
              <div className="space-y-3">
                {staffStats
                  .sort((a, b) => b.count - a.count)
                  .map((staff, index) => {
                    const maxScans = staffStats[0]?.count || 1;
                    return (
                      <div key={staff.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {staff.name}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {staff.count} scans
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-600 rounded-full transition-all"
                            style={{ width: `${(staff.count / maxScans) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>

        {/* Revenue Breakdown */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Revenue Breakdown
          </h2>

          {ticketTypeStats.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No revenue data yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Ticket Type
                    </th>
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-right">
                      Price
                    </th>
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-right">
                      Sold
                    </th>
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-right">
                      Scanned
                    </th>
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-right">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {ticketTypeStats.map((type) => (
                    <tr key={type.id}>
                      <td className="py-3 text-gray-900 dark:text-white font-medium">
                        {type.name}
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400 text-right">
                        {type.price === 0 ? 'Free' : formatCurrency(type.price)}
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400 text-right">
                        {type.sold}
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400 text-right">
                        {type.scanned}
                      </td>
                      <td className="py-3 text-gray-900 dark:text-white font-medium text-right">
                        {formatCurrency(type.revenue)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="pt-4 text-gray-900 dark:text-white">Total</td>
                    <td className="pt-4"></td>
                    <td className="pt-4 text-gray-900 dark:text-white text-right">
                      {analytics?.total_tickets || 0}
                    </td>
                    <td className="pt-4 text-gray-900 dark:text-white text-right">
                      {analytics?.tickets_scanned || 0}
                    </td>
                    <td className="pt-4 text-gray-900 dark:text-white text-right">
                      {formatCurrency(analytics?.total_revenue || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </MerchantLayout>
  );
}

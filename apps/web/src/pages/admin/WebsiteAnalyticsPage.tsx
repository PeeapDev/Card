import { useState, useEffect } from 'react';
import {
  Eye,
  Users,
  Clock,
  TrendingUp,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  FileText,
  ExternalLink,
  BarChart3,
  Zap,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { MotionCard } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { ANALYTICS_API_URL } from '@/config/urls';

const API_URL = ANALYTICS_API_URL;

interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgDuration: number;
  viewsByDay: Record<string, number>;
  period: string;
}

interface TopPage {
  path: string;
  title: string;
  views: number;
}

interface VisitorStats {
  devices: { name: string; count: number }[];
  browsers: { name: string; count: number }[];
  operatingSystems: { name: string; count: number }[];
  referrers: { name: string; count: number }[];
}

export function WebsiteAnalyticsPage() {
  const [period, setPeriod] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [summaryRes, pagesRes, visitorsRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics/summary?period=${period}`, { headers }),
        fetch(`${API_URL}/api/analytics/pages?period=${period}`, { headers }),
        fetch(`${API_URL}/api/analytics/visitors?period=${period}`, { headers }),
      ]);

      if (!summaryRes.ok) {
        const err = await summaryRes.json();
        throw new Error(err.error || 'Failed to fetch analytics');
      }

      const summaryData = await summaryRes.json();
      const pagesData = await pagesRes.json();
      const visitorsData = await visitorsRes.json();

      setSummary(summaryData);
      setTopPages(pagesData.topPages || []);
      setVisitorStats(visitorsData);
    } catch (err: any) {
      console.error('[Analytics] Fetch error:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  // Calculate trend (placeholder - would compare with previous period)
  const getTrend = (value: number, baseline: number = 0) => {
    if (baseline === 0) return { direction: 'up', percent: 0 };
    const percent = Math.round(((value - baseline) / baseline) * 100);
    return {
      direction: percent >= 0 ? 'up' : 'down',
      percent: Math.abs(percent),
    };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Website Analytics
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track visitor activity and engagement across all platforms
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(['24h', '7d', '30d', '90d'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    period === p
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {p === '24h' ? '24 Hours' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Vercel Analytics Link */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <BarChart3 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Vercel Analytics
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-400/20 text-green-100 rounded-full text-xs font-medium">
                    <Zap className="h-3 w-3" />
                    Live
                  </span>
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  Real-time visitor tracking, page views, and performance metrics powered by Vercel
                </p>
              </div>
            </div>
            <a
              href="https://vercel.com/peeapdev/my-peeap-com/analytics"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open Vercel Dashboard
            </a>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-200" />
              <span className="text-blue-100">Page Views Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-200" />
              <span className="text-blue-100">Unique Visitors</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-200" />
              <span className="text-blue-100">Geographic Data</span>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <p className="text-sm text-red-600 dark:text-red-500 mt-1">
              Make sure the page_views table exists in your database.
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MotionCard delay={0} padding="none" className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="flex items-center text-green-600 text-sm font-medium">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                12%
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-sm text-gray-500 dark:text-gray-400">Total Page Views</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {loading ? '...' : summary?.totalViews.toLocaleString() || 0}
              </p>
            </div>
          </MotionCard>

          <MotionCard delay={0.1} padding="none" className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="flex items-center text-green-600 text-sm font-medium">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                8%
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-sm text-gray-500 dark:text-gray-400">Unique Visitors</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {loading ? '...' : summary?.uniqueVisitors.toLocaleString() || 0}
              </p>
            </div>
          </MotionCard>

          <MotionCard delay={0.2} padding="none" className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <span className={`flex items-center text-sm font-medium ${
                (summary?.bounceRate || 0) > 50 ? 'text-red-600' : 'text-green-600'
              }`}>
                {(summary?.bounceRate || 0) > 50 ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                )}
                {summary?.bounceRate || 0}%
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-sm text-gray-500 dark:text-gray-400">Bounce Rate</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {loading ? '...' : `${summary?.bounceRate || 0}%`}
              </p>
            </div>
          </MotionCard>

          <MotionCard delay={0.3} padding="none" className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="flex items-center text-green-600 text-sm font-medium">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                5%
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-sm text-gray-500 dark:text-gray-400">Avg. Session Duration</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {loading ? '...' : formatDuration(summary?.avgDuration || 0)}
              </p>
            </div>
          </MotionCard>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Page Views Chart */}
          <MotionCard delay={0.4} padding="none" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Page Views Over Time
            </h3>
            {summary?.viewsByDay && Object.keys(summary.viewsByDay).length > 0 ? (
              <div className="h-64 flex items-end justify-between gap-1">
                {Object.entries(summary.viewsByDay).map(([date, views], i) => {
                  const maxViews = Math.max(...Object.values(summary.viewsByDay));
                  const height = maxViews > 0 ? (views / maxViews) * 100 : 0;
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-blue-500 dark:bg-blue-600 rounded-t transition-all hover:bg-blue-600 dark:hover:bg-blue-500"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${date}: ${views} views`}
                      />
                      <span className="text-xs text-gray-500 mt-2 rotate-45 origin-left">
                        {new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                No data available for this period
              </div>
            )}
          </MotionCard>

          {/* Top Pages */}
          <MotionCard delay={0.5} padding="none" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Pages
            </h3>
            {topPages.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {topPages.slice(0, 10).map((page, i) => (
                  <div key={page.path} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-400 w-6">{i + 1}</span>
                      <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {page.title || page.path}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{page.path}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white ml-4">
                      {page.views.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                No page data available
              </div>
            )}
          </MotionCard>
        </div>

        {/* Visitor Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Devices */}
          <MotionCard delay={0.6} padding="none" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Devices
            </h3>
            <div className="space-y-3">
              {visitorStats?.devices.slice(0, 5).map((device) => (
                <div key={device.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(device.name)}
                    <span className="text-sm text-gray-600 dark:text-gray-300">{device.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {device.count.toLocaleString()}
                  </span>
                </div>
              )) || (
                <p className="text-sm text-gray-500">No data</p>
              )}
            </div>
          </MotionCard>

          {/* Browsers */}
          <MotionCard delay={0.7} padding="none" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Browsers
            </h3>
            <div className="space-y-3">
              {visitorStats?.browsers.slice(0, 5).map((browser) => (
                <div key={browser.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{browser.name}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {browser.count.toLocaleString()}
                  </span>
                </div>
              )) || (
                <p className="text-sm text-gray-500">No data</p>
              )}
            </div>
          </MotionCard>

          {/* OS */}
          <MotionCard delay={0.8} padding="none" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Operating Systems
            </h3>
            <div className="space-y-3">
              {visitorStats?.operatingSystems.slice(0, 5).map((os) => (
                <div key={os.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{os.name}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {os.count.toLocaleString()}
                  </span>
                </div>
              )) || (
                <p className="text-sm text-gray-500">No data</p>
              )}
            </div>
          </MotionCard>

          {/* Referrers */}
          <MotionCard delay={0.9} padding="none" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Traffic Sources
            </h3>
            <div className="space-y-3">
              {visitorStats?.referrers.slice(0, 5).map((referrer) => (
                <div key={referrer.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1">
                    {referrer.name}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white ml-2">
                    {referrer.count.toLocaleString()}
                  </span>
                </div>
              )) || (
                <p className="text-sm text-gray-500">No data</p>
              )}
            </div>
          </MotionCard>
        </div>
      </div>
    </AdminLayout>
  );
}

export default WebsiteAnalyticsPage;

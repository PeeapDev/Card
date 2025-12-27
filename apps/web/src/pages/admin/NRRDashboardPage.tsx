import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Sparkles,
  ChevronRight,
  Calendar,
  Target,
  BarChart3,
  PieChart,
  Loader2,
  UserPlus,
  UserMinus,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { Card, MotionCard } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { currencyService, Currency } from '@/services/currency.service';
import {
  nrrService,
  NRRSummary,
  NRRTrend,
  MonthlyNRRData,
  SubscriptionMovement,
  CustomerCohort,
} from '@/services/nrr.service';
import { aiService } from '@/services/ai.service';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
  ComposedChart,
} from 'recharts';

type TabType = 'overview' | 'trends' | 'movements' | 'cohorts' | 'ai-insights';

export function NRRDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data state
  const [summary, setSummary] = useState<NRRSummary | null>(null);
  const [trend, setTrend] = useState<NRRTrend | null>(null);
  const [movements, setMovements] = useState<SubscriptionMovement[]>([]);
  const [cohorts, setCohorts] = useState<CustomerCohort[]>([]);

  // AI insights state
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Currency
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  const formatCurrency = useCallback((amount: number): string => {
    const symbol = defaultCurrency?.symbol || 'NLe';
    return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }, [defaultCurrency]);

  const loadData = useCallback(async () => {
    try {
      const [summaryData, trendData, movementsData, cohortsData] = await Promise.all([
        nrrService.getNRRSummary(),
        nrrService.getNRRTrend(12),
        nrrService.getSubscriptionMovements(30),
        nrrService.getCohortAnalysis(6),
      ]);

      setSummary(summaryData);
      setTrend(trendData);
      setMovements(movementsData);
      setCohorts(cohortsData);
    } catch (error) {
      console.error('Error loading NRR data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadAIInsights = async () => {
    if (!summary || !trend) return;

    setLoadingAI(true);
    setAiError(null);

    try {
      await aiService.initialize();

      if (!aiService.isConfigured()) {
        setAiError('AI is not configured. Please add your API key in Settings > AI.');
        return;
      }

      const nrrData = await nrrService.getDataForAIAnalysis();

      const prompt = `Analyze the following Net Revenue Retention (NRR) data for a SaaS/subscription business and provide actionable insights.

## Current NRR Summary
- Current MRR: ${formatCurrency(nrrData.summary.currentMRR)}
- Previous MRR: ${formatCurrency(nrrData.summary.previousMRR)}
- MRR Growth: ${nrrData.summary.mrrGrowthPercent}%
- Current NRR: ${nrrData.summary.currentNRR}%
- Previous NRR: ${nrrData.summary.previousNRR}%
- NRR Change: ${nrrData.summary.nrrChange > 0 ? '+' : ''}${nrrData.summary.nrrChange}%
- Current GRR: ${nrrData.summary.currentGRR}%
- 12-Month Average NRR: ${nrrData.summary.averageNRR12Months}%
- 12-Month Average GRR: ${nrrData.summary.averageGRR12Months}%
- Health Status: ${nrrData.summary.healthStatus}

## Monthly NRR Trend (Last 12 Months)
${nrrData.trend.monthly.slice(-6).map(m =>
  `- ${m.month}: NRR ${m.nrr}%, MRR ${formatCurrency(m.endingMRR)}, New: ${m.newCustomers}, Churned: ${m.churnedCustomers}, Expansion: ${formatCurrency(m.expansionMRR)}, Contraction: ${formatCurrency(m.contractionMRR)}`
).join('\n')}

## Recent Movements (Last 20)
- New subscriptions: ${nrrData.movements.filter(m => m.movementType === 'new').length}
- Churned: ${nrrData.movements.filter(m => m.movementType === 'churn').length}
- Expansions: ${nrrData.movements.filter(m => m.movementType === 'expansion').length}
- Contractions: ${nrrData.movements.filter(m => m.movementType === 'contraction').length}

## Cohort Retention
${nrrData.cohorts.map(c =>
  `- ${c.cohortMonth}: ${c.totalCustomers} customers, ${c.retentionRate}% retained, ${c.revenueRetentionRate}% revenue retained`
).join('\n')}

Please provide:
1. **Performance Summary** (2-3 sentences on overall NRR health)
2. **Key Insights** (3-4 bullet points on trends and patterns)
3. **Risk Areas** (identify any concerning trends)
4. **Recommendations** (3-4 specific, actionable recommendations to improve NRR)
5. **Forecast** (brief outlook for next month based on trends)

Keep the analysis concise, data-driven, and focused on actionable insights. Use specific numbers from the data.`;

      const response = await aiService.chat(
        [
          { role: 'system', content: 'You are an expert SaaS metrics analyst specializing in revenue retention and subscription analytics. Provide clear, actionable insights based on the data provided. Be specific with numbers and recommendations.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.3, max_tokens: 1500 }
      );

      setAiInsights(response.content);
    } catch (error) {
      console.error('Error getting AI insights:', error);
      setAiError(error instanceof Error ? error.message : 'Failed to get AI insights');
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'good':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'good':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'critical':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'new':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'churn':
        return <UserMinus className="w-4 h-4 text-red-500" />;
      case 'expansion':
        return <ArrowUp className="w-4 h-4 text-blue-500" />;
      case 'contraction':
        return <ArrowDown className="w-4 h-4 text-orange-500" />;
      case 'reactivation':
        return <RefreshCw className="w-4 h-4 text-purple-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'new':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'churn':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'expansion':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'contraction':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'reactivation':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: PieChart },
    { id: 'trends' as TabType, label: 'Trends', icon: BarChart3 },
    { id: 'movements' as TabType, label: 'Movements', icon: ArrowUpRight },
    { id: 'cohorts' as TabType, label: 'Cohorts', icon: Users },
    { id: 'ai-insights' as TabType, label: 'AI Insights', icon: Sparkles },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading NRR data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Net Revenue Retention</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Track subscription revenue health and customer retention metrics
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MotionCard className="p-4" delay={0}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Current MRR</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(summary.currentMRR)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {summary.mrrGrowthPercent >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                    <span
                      className={`text-sm ${
                        summary.mrrGrowthPercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {summary.mrrGrowthPercent >= 0 ? '+' : ''}
                      {summary.mrrGrowthPercent}%
                    </span>
                    <span className="text-xs text-gray-400">vs last month</span>
                  </div>
                </div>
                <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
            </MotionCard>

            <MotionCard className="p-4" delay={0.1}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Net Revenue Retention</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.currentNRR}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    {summary.nrrChange >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm ${summary.nrrChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {summary.nrrChange >= 0 ? '+' : ''}
                      {summary.nrrChange}%
                    </span>
                    <span className="text-xs text-gray-400">vs last month</span>
                  </div>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </MotionCard>

            <MotionCard className="p-4" delay={0.2}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gross Revenue Retention</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.currentGRR}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm text-gray-500">12mo avg:</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {summary.averageGRR12Months}%
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </MotionCard>

            <MotionCard className="p-4" delay={0.3}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Health Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getHealthIcon(summary.healthStatus)}
                    <span
                      className={`px-2 py-1 rounded-full text-sm font-medium ${getHealthColor(
                        summary.healthStatus
                      )}`}
                    >
                      {summary.healthStatus.charAt(0).toUpperCase() + summary.healthStatus.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                    {summary.healthMessage}
                  </p>
                </div>
              </div>
            </MotionCard>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-4 overflow-x-auto pb-px" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && trend && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* NRR Trend Chart */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">NRR & GRR Trend</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend.monthly}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const [, month] = value.split('-');
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return months[parseInt(month) - 1];
                      }}
                    />
                    <YAxis domain={[80, 140]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      formatter={(value: number) => `${value}%`}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="nrr"
                      name="NRR"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ fill: '#10B981' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="grr"
                      name="GRR"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* MRR Composition */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">MRR Changes</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trend.monthly.slice(-6)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const [, month] = value.split('-');
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return months[parseInt(month) - 1];
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="newMRR" name="New" fill="#10B981" stackId="positive" />
                    <Bar dataKey="expansionMRR" name="Expansion" fill="#3B82F6" stackId="positive" />
                    <Bar dataKey="contractionMRR" name="Contraction" fill="#F59E0B" stackId="negative" />
                    <Bar dataKey="churnedMRR" name="Churn" fill="#EF4444" stackId="negative" />
                    <Line type="monotone" dataKey="endingMRR" name="Ending MRR" stroke="#8B5CF6" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">This Month's Stats</h3>
              {trend.monthly.length > 0 && (
                <div className="space-y-4">
                  {[
                    {
                      label: 'New MRR',
                      value: trend.monthly[trend.monthly.length - 1].newMRR,
                      icon: UserPlus,
                      color: 'green',
                    },
                    {
                      label: 'Expansion MRR',
                      value: trend.monthly[trend.monthly.length - 1].expansionMRR,
                      icon: ArrowUp,
                      color: 'blue',
                    },
                    {
                      label: 'Contraction MRR',
                      value: trend.monthly[trend.monthly.length - 1].contractionMRR,
                      icon: ArrowDown,
                      color: 'orange',
                    },
                    {
                      label: 'Churned MRR',
                      value: trend.monthly[trend.monthly.length - 1].churnedMRR,
                      icon: UserMinus,
                      color: 'red',
                    },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              stat.color === 'green'
                                ? 'bg-green-100 dark:bg-green-900/30'
                                : stat.color === 'blue'
                                ? 'bg-blue-100 dark:bg-blue-900/30'
                                : stat.color === 'orange'
                                ? 'bg-orange-100 dark:bg-orange-900/30'
                                : 'bg-red-100 dark:bg-red-900/30'
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 ${
                                stat.color === 'green'
                                  ? 'text-green-600 dark:text-green-400'
                                  : stat.color === 'blue'
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : stat.color === 'orange'
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            />
                          </div>
                          <span className="text-gray-600 dark:text-gray-300">{stat.label}</span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(stat.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Customer Stats */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Customer Movement</h3>
              {trend.monthly.length > 0 && (
                <div className="space-y-4">
                  {[
                    {
                      label: 'Total Customers',
                      value: trend.monthly[trend.monthly.length - 1].totalCustomers,
                      icon: Users,
                      color: 'primary',
                    },
                    {
                      label: 'New This Month',
                      value: trend.monthly[trend.monthly.length - 1].newCustomers,
                      icon: UserPlus,
                      color: 'green',
                    },
                    {
                      label: 'Expanded',
                      value: trend.monthly[trend.monthly.length - 1].expandedCustomers,
                      icon: TrendingUp,
                      color: 'blue',
                    },
                    {
                      label: 'Contracted',
                      value: trend.monthly[trend.monthly.length - 1].contractedCustomers,
                      icon: TrendingDown,
                      color: 'orange',
                    },
                    {
                      label: 'Churned',
                      value: trend.monthly[trend.monthly.length - 1].churnedCustomers,
                      icon: UserMinus,
                      color: 'red',
                    },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-4 h-4 ${
                              stat.color === 'primary'
                                ? 'text-primary-600 dark:text-primary-400'
                                : stat.color === 'green'
                                ? 'text-green-600 dark:text-green-400'
                                : stat.color === 'blue'
                                ? 'text-blue-600 dark:text-blue-400'
                                : stat.color === 'orange'
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          />
                          <span className="text-gray-600 dark:text-gray-300">{stat.label}</span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">{stat.value}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && trend && (
          <div className="space-y-6">
            {/* Monthly Trend Table */}
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Monthly NRR Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Month
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Starting MRR
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        New
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Expansion
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Contraction
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Churn
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Ending MRR
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        NRR
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        GRR
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {trend.monthly.map((month) => (
                      <tr key={month.month} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{month.month}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                          {formatCurrency(month.startingMRR)}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                          +{formatCurrency(month.newMRR)}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">
                          +{formatCurrency(month.expansionMRR)}
                        </td>
                        <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400">
                          -{formatCurrency(month.contractionMRR)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                          -{formatCurrency(month.churnedMRR)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(month.endingMRR)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              month.nrr >= 100
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {month.nrr}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              month.grr >= 90
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}
                          >
                            {month.grr}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Quarterly Summary */}
            {trend.quarterly.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quarterly Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {trend.quarterly.map((q) => (
                    <div key={q.quarter} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{q.quarter}</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{q.nrr}% NRR</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {q.grr}% GRR | {formatCurrency(q.mrr)} MRR
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Movements Tab */}
        {activeTab === 'movements' && (
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Recent Subscription Movements</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                New subscriptions, upgrades, downgrades, and cancellations
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Change
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Impact
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No subscription movements found
                      </td>
                    </tr>
                  ) : (
                    movements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-white">{movement.userName}</p>
                          <p className="text-xs text-gray-500">{movement.userId.slice(0, 8)}...</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getMovementColor(
                              movement.movementType
                            )}`}
                          >
                            {getMovementIcon(movement.movementType)}
                            {movement.movementType.charAt(0).toUpperCase() + movement.movementType.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {movement.fromTier && movement.toTier ? (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-500">{movement.fromTier}</span>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900 dark:text-white">{movement.toTier}</span>
                            </div>
                          ) : movement.toTier ? (
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {movement.toTier}
                            </span>
                          ) : movement.fromTier ? (
                            <span className="text-sm text-gray-500">{movement.fromTier}</span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-medium ${
                              movement.difference >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {movement.difference >= 0 ? '+' : ''}
                            {formatCurrency(movement.difference)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500">
                          {new Date(movement.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Cohorts Tab */}
        {activeTab === 'cohorts' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Cohort Retention Analysis</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Track how well each cohort of customers is retained over time
              </p>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Cohort
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Total
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Retained
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Retention %
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Revenue Retained
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Revenue %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {cohorts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No cohort data available
                        </td>
                      </tr>
                    ) : (
                      cohorts.map((cohort) => (
                        <tr key={cohort.cohortMonth} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                            {cohort.cohortMonth}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                            {cohort.totalCustomers}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                            {cohort.retainedCustomers}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    cohort.retentionRate >= 80
                                      ? 'bg-green-500'
                                      : cohort.retentionRate >= 60
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${cohort.retentionRate}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {cohort.retentionRate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                            {formatCurrency(cohort.revenueRetained)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                cohort.revenueRetentionRate >= 100
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : cohort.revenueRetentionRate >= 80
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}
                            >
                              {cohort.revenueRetentionRate}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Cohort Chart */}
            {cohorts.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Cohort Retention Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cohorts}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis dataKey="cohortMonth" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(value: number) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="retentionRate" name="Customer Retention" fill="#10B981" />
                      <Bar dataKey="revenueRetentionRate" name="Revenue Retention" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* AI Insights Tab */}
        {activeTab === 'ai-insights' && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">AI-Powered NRR Analysis</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Get intelligent insights and recommendations based on your NRR data
                    </p>
                  </div>
                </div>
                <button
                  onClick={loadAIInsights}
                  disabled={loadingAI}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Insights
                    </>
                  )}
                </button>
              </div>

              {aiError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{aiError}</span>
                  </div>
                </div>
              )}

              {aiInsights ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{aiInsights}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Click "Generate Insights" to get AI-powered analysis of your NRR metrics
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    The AI will analyze trends, identify risks, and provide recommendations
                  </p>
                </div>
              )}
            </Card>

            {/* Tips for Improving NRR */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Understanding NRR Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">What is Good NRR?</h4>
                  <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                    <li>NRR &gt; 100%: Revenue from existing customers is growing</li>
                    <li>NRR = 100%: Revenue is stable (no net churn)</li>
                    <li>NRR &lt; 100%: Revenue is shrinking from existing base</li>
                  </ul>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Industry Benchmarks</h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                    <li>Excellent: 120%+ NRR</li>
                    <li>Good: 100-120% NRR</li>
                    <li>Healthy GRR: 85%+</li>
                    <li>Top SaaS companies: 120-140% NRR</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

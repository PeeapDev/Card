/**
 * Net Revenue Retention (NRR) Service
 *
 * Calculates and tracks NRR metrics from subscription data:
 * - Starting MRR (Monthly Recurring Revenue)
 * - Expansion MRR (upsells, upgrades)
 * - Contraction MRR (downgrades)
 * - Churned MRR (cancellations)
 * - NRR = (Starting MRR + Expansion - Contraction - Churn) / Starting MRR × 100
 */

import { supabase } from '@/lib/supabase';

// Types
export interface MRRData {
  startingMRR: number;
  expansionMRR: number;
  contractionMRR: number;
  churnedMRR: number;
  endingMRR: number;
  nrr: number; // Net Revenue Retention percentage
  grr: number; // Gross Revenue Retention percentage
}

export interface MonthlyNRRData extends MRRData {
  month: string; // YYYY-MM format
  date: Date;
  newMRR: number;
  reactivationMRR: number;
  totalCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  expandedCustomers: number;
  contractedCustomers: number;
}

export interface NRRTrend {
  monthly: MonthlyNRRData[];
  quarterly: {
    quarter: string;
    nrr: number;
    grr: number;
    mrr: number;
  }[];
  yearly: {
    year: number;
    nrr: number;
    grr: number;
    totalRevenue: number;
  }[];
}

export interface CustomerCohort {
  cohortMonth: string;
  totalCustomers: number;
  retainedCustomers: number;
  retentionRate: number;
  revenueRetained: number;
  revenueRetentionRate: number;
}

export interface SubscriptionMovement {
  id: string;
  userId: string;
  userName: string;
  movementType: 'new' | 'expansion' | 'contraction' | 'churn' | 'reactivation';
  fromTier?: string;
  toTier?: string;
  fromAmount: number;
  toAmount: number;
  difference: number;
  date: string;
  reason?: string;
}

export interface NRRSummary {
  currentMRR: number;
  previousMRR: number;
  mrrGrowth: number;
  mrrGrowthPercent: number;
  currentNRR: number;
  previousNRR: number;
  nrrChange: number;
  currentGRR: number;
  averageNRR12Months: number;
  averageGRR12Months: number;
  healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
  healthMessage: string;
}

class NRRService {
  /**
   * Calculate NRR for a specific month
   */
  async calculateMonthlyNRR(year: number, month: number): Promise<MonthlyNRRData> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;

    // Previous month for comparison
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
    const prevEndDate = new Date(prevYear, prevMonth, 0);

    try {
      // Get subscriptions at start of month (active at end of previous month)
      const { data: startOfMonthSubs } = await supabase
        .from('merchant_subscriptions')
        .select('*, tier_configurations!inner(price_monthly)')
        .or(`status.eq.active,status.eq.trialing`)
        .lte('created_at', prevEndDate.toISOString());

      // Get subscriptions at end of month
      const { data: endOfMonthSubs } = await supabase
        .from('merchant_subscriptions')
        .select('*, tier_configurations!inner(price_monthly)')
        .or(`status.eq.active,status.eq.trialing`)
        .lte('created_at', endDate.toISOString());

      // Get new subscriptions this month
      const { data: newSubs } = await supabase
        .from('merchant_subscriptions')
        .select('*, tier_configurations!inner(price_monthly)')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Get cancelled subscriptions this month
      const { data: cancelledSubs } = await supabase
        .from('merchant_subscriptions')
        .select('*, tier_configurations!inner(price_monthly)')
        .eq('status', 'cancelled')
        .gte('cancelled_at', startDate.toISOString())
        .lte('cancelled_at', endDate.toISOString());

      // Get tier changes this month (expansions/contractions)
      const { data: tierChanges } = await supabase
        .from('subscription_events')
        .select('*')
        .in('event_type', ['tier_upgrade', 'tier_downgrade'])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Calculate MRR values
      const startingMRR = (startOfMonthSubs || []).reduce((sum, sub) => {
        const price = sub.tier_configurations?.price_monthly || sub.price_monthly || 0;
        return sum + price;
      }, 0);

      const newMRR = (newSubs || []).reduce((sum, sub) => {
        const price = sub.tier_configurations?.price_monthly || sub.price_monthly || 0;
        return sum + price;
      }, 0);

      const churnedMRR = (cancelledSubs || []).reduce((sum, sub) => {
        const price = sub.tier_configurations?.price_monthly || sub.price_monthly || 0;
        return sum + price;
      }, 0);

      // Calculate expansion and contraction from tier changes
      let expansionMRR = 0;
      let contractionMRR = 0;
      let expandedCustomers = 0;
      let contractedCustomers = 0;

      (tierChanges || []).forEach((change) => {
        const data = change.data as Record<string, any>;
        const oldPrice = data?.old_price || 0;
        const newPrice = data?.new_price || 0;
        const diff = newPrice - oldPrice;

        if (diff > 0) {
          expansionMRR += diff;
          expandedCustomers++;
        } else if (diff < 0) {
          contractionMRR += Math.abs(diff);
          contractedCustomers++;
        }
      });

      // Calculate ending MRR
      const endingMRR = (endOfMonthSubs || []).reduce((sum, sub) => {
        const price = sub.tier_configurations?.price_monthly || sub.price_monthly || 0;
        return sum + price;
      }, 0);

      // Calculate NRR and GRR
      const nrr = startingMRR > 0
        ? ((startingMRR + expansionMRR - contractionMRR - churnedMRR) / startingMRR) * 100
        : 100;

      const grr = startingMRR > 0
        ? ((startingMRR - contractionMRR - churnedMRR) / startingMRR) * 100
        : 100;

      return {
        month: monthStr,
        date: startDate,
        startingMRR,
        endingMRR,
        newMRR,
        expansionMRR,
        contractionMRR,
        churnedMRR,
        reactivationMRR: 0, // TODO: Track reactivations
        nrr: Math.round(nrr * 100) / 100,
        grr: Math.round(grr * 100) / 100,
        totalCustomers: (endOfMonthSubs || []).length,
        newCustomers: (newSubs || []).length,
        churnedCustomers: (cancelledSubs || []).length,
        expandedCustomers,
        contractedCustomers,
      };
    } catch (error) {
      console.error('Error calculating monthly NRR:', error);
      return {
        month: monthStr,
        date: startDate,
        startingMRR: 0,
        endingMRR: 0,
        newMRR: 0,
        expansionMRR: 0,
        contractionMRR: 0,
        churnedMRR: 0,
        reactivationMRR: 0,
        nrr: 100,
        grr: 100,
        totalCustomers: 0,
        newCustomers: 0,
        churnedCustomers: 0,
        expandedCustomers: 0,
        contractedCustomers: 0,
      };
    }
  }

  /**
   * Get NRR trend for the last N months
   */
  async getNRRTrend(months: number = 12): Promise<NRRTrend> {
    const monthlyData: MonthlyNRRData[] = [];
    const today = new Date();

    // Calculate for each month
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const data = await this.calculateMonthlyNRR(date.getFullYear(), date.getMonth() + 1);
      monthlyData.push(data);
    }

    // Calculate quarterly data
    const quarterlyData: NRRTrend['quarterly'] = [];
    for (let i = 0; i < monthlyData.length; i += 3) {
      const quarterMonths = monthlyData.slice(i, i + 3);
      if (quarterMonths.length === 3) {
        const avgNRR = quarterMonths.reduce((sum, m) => sum + m.nrr, 0) / 3;
        const avgGRR = quarterMonths.reduce((sum, m) => sum + m.grr, 0) / 3;
        const avgMRR = quarterMonths.reduce((sum, m) => sum + m.endingMRR, 0) / 3;
        const firstMonth = quarterMonths[0].month;
        const quarter = `Q${Math.ceil((parseInt(firstMonth.split('-')[1])) / 3)} ${firstMonth.split('-')[0]}`;

        quarterlyData.push({
          quarter,
          nrr: Math.round(avgNRR * 100) / 100,
          grr: Math.round(avgGRR * 100) / 100,
          mrr: Math.round(avgMRR),
        });
      }
    }

    // Calculate yearly data
    const yearlyMap = new Map<number, { nrrSum: number; grrSum: number; revenueSum: number; count: number }>();
    monthlyData.forEach((m) => {
      const year = parseInt(m.month.split('-')[0]);
      const existing = yearlyMap.get(year) || { nrrSum: 0, grrSum: 0, revenueSum: 0, count: 0 };
      yearlyMap.set(year, {
        nrrSum: existing.nrrSum + m.nrr,
        grrSum: existing.grrSum + m.grr,
        revenueSum: existing.revenueSum + m.endingMRR,
        count: existing.count + 1,
      });
    });

    const yearlyData: NRRTrend['yearly'] = Array.from(yearlyMap.entries()).map(([year, data]) => ({
      year,
      nrr: Math.round((data.nrrSum / data.count) * 100) / 100,
      grr: Math.round((data.grrSum / data.count) * 100) / 100,
      totalRevenue: Math.round(data.revenueSum),
    }));

    return {
      monthly: monthlyData,
      quarterly: quarterlyData,
      yearly: yearlyData,
    };
  }

  /**
   * Get NRR summary with health indicators
   */
  async getNRRSummary(): Promise<NRRSummary> {
    const today = new Date();
    const currentMonth = await this.calculateMonthlyNRR(today.getFullYear(), today.getMonth() + 1);

    const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonth = await this.calculateMonthlyNRR(prevDate.getFullYear(), prevDate.getMonth() + 1);

    // Get last 12 months for averages
    const trend = await this.getNRRTrend(12);
    const avgNRR = trend.monthly.reduce((sum, m) => sum + m.nrr, 0) / trend.monthly.length;
    const avgGRR = trend.monthly.reduce((sum, m) => sum + m.grr, 0) / trend.monthly.length;

    const mrrGrowth = currentMonth.endingMRR - previousMonth.endingMRR;
    const mrrGrowthPercent = previousMonth.endingMRR > 0
      ? (mrrGrowth / previousMonth.endingMRR) * 100
      : 0;

    // Determine health status based on NRR
    let healthStatus: NRRSummary['healthStatus'];
    let healthMessage: string;

    if (currentMonth.nrr >= 120) {
      healthStatus = 'excellent';
      healthMessage = 'Outstanding NRR! Strong expansion revenue is driving growth.';
    } else if (currentMonth.nrr >= 100) {
      healthStatus = 'good';
      healthMessage = 'Healthy NRR. Revenue from existing customers is stable or growing.';
    } else if (currentMonth.nrr >= 90) {
      healthStatus = 'warning';
      healthMessage = 'NRR below 100%. Consider improving retention and expansion strategies.';
    } else {
      healthStatus = 'critical';
      healthMessage = 'Critical NRR. Significant revenue loss from churn. Immediate action needed.';
    }

    return {
      currentMRR: currentMonth.endingMRR,
      previousMRR: previousMonth.endingMRR,
      mrrGrowth,
      mrrGrowthPercent: Math.round(mrrGrowthPercent * 100) / 100,
      currentNRR: currentMonth.nrr,
      previousNRR: previousMonth.nrr,
      nrrChange: Math.round((currentMonth.nrr - previousMonth.nrr) * 100) / 100,
      currentGRR: currentMonth.grr,
      averageNRR12Months: Math.round(avgNRR * 100) / 100,
      averageGRR12Months: Math.round(avgGRR * 100) / 100,
      healthStatus,
      healthMessage,
    };
  }

  /**
   * Get recent subscription movements (upgrades, downgrades, churns)
   */
  async getSubscriptionMovements(limit: number = 20): Promise<SubscriptionMovement[]> {
    const movements: SubscriptionMovement[] = [];

    try {
      // Get recent cancellations
      const { data: cancellations } = await supabase
        .from('merchant_subscriptions')
        .select('*, users:user_id(first_name, last_name, email), tier_configurations!inner(price_monthly, display_name)')
        .eq('status', 'cancelled')
        .order('cancelled_at', { ascending: false })
        .limit(limit / 2);

      (cancellations || []).forEach((sub) => {
        const price = sub.tier_configurations?.price_monthly || sub.price_monthly || 0;
        movements.push({
          id: sub.id,
          userId: sub.user_id,
          userName: sub.users ? `${sub.users.first_name} ${sub.users.last_name}` : 'Unknown',
          movementType: 'churn',
          fromTier: sub.tier_configurations?.display_name || sub.tier,
          toTier: undefined,
          fromAmount: price,
          toAmount: 0,
          difference: -price,
          date: sub.cancelled_at || sub.updated_at,
          reason: sub.cancel_reason,
        });
      });

      // Get recent new subscriptions
      const { data: newSubs } = await supabase
        .from('merchant_subscriptions')
        .select('*, users:user_id(first_name, last_name, email), tier_configurations!inner(price_monthly, display_name)')
        .or(`status.eq.active,status.eq.trialing`)
        .order('created_at', { ascending: false })
        .limit(limit / 2);

      (newSubs || []).forEach((sub) => {
        const price = sub.tier_configurations?.price_monthly || sub.price_monthly || 0;
        movements.push({
          id: sub.id,
          userId: sub.user_id,
          userName: sub.users ? `${sub.users.first_name} ${sub.users.last_name}` : 'Unknown',
          movementType: 'new',
          fromTier: undefined,
          toTier: sub.tier_configurations?.display_name || sub.tier,
          fromAmount: 0,
          toAmount: price,
          difference: price,
          date: sub.created_at,
        });
      });

      // Get tier changes from events
      const { data: tierChanges } = await supabase
        .from('subscription_events')
        .select('*, customer_subscriptions!inner(user_id)')
        .in('event_type', ['tier_upgrade', 'tier_downgrade'])
        .order('created_at', { ascending: false })
        .limit(limit);

      (tierChanges || []).forEach((event) => {
        const data = event.data as Record<string, any>;
        const isUpgrade = event.event_type === 'tier_upgrade';
        movements.push({
          id: event.id,
          userId: event.customer_subscriptions?.user_id || '',
          userName: data?.user_name || 'Unknown',
          movementType: isUpgrade ? 'expansion' : 'contraction',
          fromTier: data?.from_tier,
          toTier: data?.to_tier,
          fromAmount: data?.old_price || 0,
          toAmount: data?.new_price || 0,
          difference: (data?.new_price || 0) - (data?.old_price || 0),
          date: event.created_at,
        });
      });

      // Sort by date descending
      movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return movements.slice(0, limit);
    } catch (error) {
      console.error('Error getting subscription movements:', error);
      return [];
    }
  }

  /**
   * Get cohort retention analysis
   */
  async getCohortAnalysis(months: number = 6): Promise<CustomerCohort[]> {
    const cohorts: CustomerCohort[] = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const cohortDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const cohortMonth = `${cohortDate.getFullYear()}-${(cohortDate.getMonth() + 1).toString().padStart(2, '0')}`;
      const cohortEndDate = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + 1, 0);

      try {
        // Get customers who joined in this cohort month
        const { data: cohortCustomers } = await supabase
          .from('merchant_subscriptions')
          .select('*, tier_configurations!inner(price_monthly)')
          .gte('created_at', cohortDate.toISOString())
          .lte('created_at', cohortEndDate.toISOString());

        const totalCustomers = (cohortCustomers || []).length;
        const initialRevenue = (cohortCustomers || []).reduce((sum, sub) => {
          return sum + (sub.tier_configurations?.price_monthly || sub.price_monthly || 0);
        }, 0);

        // Get how many are still active
        const { data: retainedCustomers } = await supabase
          .from('merchant_subscriptions')
          .select('*, tier_configurations!inner(price_monthly)')
          .gte('created_at', cohortDate.toISOString())
          .lte('created_at', cohortEndDate.toISOString())
          .or(`status.eq.active,status.eq.trialing`);

        const retained = (retainedCustomers || []).length;
        const currentRevenue = (retainedCustomers || []).reduce((sum, sub) => {
          return sum + (sub.tier_configurations?.price_monthly || sub.price_monthly || 0);
        }, 0);

        cohorts.push({
          cohortMonth,
          totalCustomers,
          retainedCustomers: retained,
          retentionRate: totalCustomers > 0 ? Math.round((retained / totalCustomers) * 10000) / 100 : 0,
          revenueRetained: currentRevenue,
          revenueRetentionRate: initialRevenue > 0 ? Math.round((currentRevenue / initialRevenue) * 10000) / 100 : 0,
        });
      } catch (error) {
        console.error(`Error getting cohort for ${cohortMonth}:`, error);
      }
    }

    return cohorts;
  }

  /**
   * Get data formatted for AI analysis
   */
  async getDataForAIAnalysis(): Promise<{
    summary: NRRSummary;
    trend: NRRTrend;
    movements: SubscriptionMovement[];
    cohorts: CustomerCohort[];
  }> {
    const [summary, trend, movements, cohorts] = await Promise.all([
      this.getNRRSummary(),
      this.getNRRTrend(12),
      this.getSubscriptionMovements(20),
      this.getCohortAnalysis(6),
    ]);

    return { summary, trend, movements, cohorts };
  }
}

export const nrrService = new NRRService();

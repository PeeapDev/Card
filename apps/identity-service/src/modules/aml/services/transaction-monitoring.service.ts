import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between } from 'typeorm';
import {
  AmlMonitoringRule,
  AmlAlert,
  AmlRiskProfile,
  AmlHighRiskCountry,
  AlertType,
  AlertSeverity,
  RuleCategory,
  RuleType,
} from '@payment-system/database';
import { AlertService } from './alert.service';

interface TransactionData {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  type: string;
  counterpartyId?: string;
  counterpartyCountry?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

interface MonitoringResult {
  transactionId: string;
  rulesEvaluated: number;
  rulesTriggered: number;
  triggeredRules: Array<{
    ruleId: string;
    ruleCode: string;
    severity: string;
    details: Record<string, any>;
  }>;
  alertsGenerated: string[];
  transactionRiskScore: number;
}

@Injectable()
export class TransactionMonitoringService {
  private readonly logger = new Logger(TransactionMonitoringService.name);

  // Cache for user transaction history (in production, use Redis)
  private userTransactionCache: Map<string, TransactionData[]> = new Map();

  constructor(
    @InjectRepository(AmlMonitoringRule)
    private ruleRepo: Repository<AmlMonitoringRule>,
    @InjectRepository(AmlRiskProfile)
    private riskProfileRepo: Repository<AmlRiskProfile>,
    @InjectRepository(AmlHighRiskCountry)
    private highRiskCountryRepo: Repository<AmlHighRiskCountry>,
    private alertService: AlertService,
  ) {}

  /**
   * Monitor a transaction against all active rules
   */
  async monitorTransaction(transaction: TransactionData): Promise<MonitoringResult> {
    this.logger.log(`Monitoring transaction ${transaction.id} for user ${transaction.userId}`);

    // Get active monitoring rules
    const rules = await this.ruleRepo.find({ where: { isActive: true } });

    const result: MonitoringResult = {
      transactionId: transaction.id,
      rulesEvaluated: rules.length,
      rulesTriggered: 0,
      triggeredRules: [],
      alertsGenerated: [],
      transactionRiskScore: 0,
    };

    // Cache this transaction for velocity checks
    this.cacheTransaction(transaction);

    // Evaluate each rule
    for (const rule of rules) {
      const ruleResult = await this.evaluateRule(rule, transaction);

      if (ruleResult.triggered) {
        result.rulesTriggered++;
        result.triggeredRules.push({
          ruleId: rule.id,
          ruleCode: rule.code,
          severity: rule.severity,
          details: ruleResult.details,
        });
        result.transactionRiskScore += rule.riskScoreImpact;

        // Generate alert if rule action is alert or block
        if (['alert', 'block'].includes(rule.actionType)) {
          const alert = await this.alertService.createAlert({
            userId: transaction.userId,
            transactionId: transaction.id,
            alertType: this.mapRuleCategoryToAlertType(rule.category),
            severity: this.mapSeverity(rule.severity),
            title: `${rule.name} - Transaction ${transaction.id}`,
            description: `Rule ${rule.code} triggered: ${ruleResult.details.reason}`,
            triggerData: {
              transactionAmount: transaction.amount,
              transactionType: transaction.type,
              ruleCode: rule.code,
              ...ruleResult.details,
            },
            ruleCode: rule.code,
            riskScoreImpact: rule.riskScoreImpact,
          });

          result.alertsGenerated.push(alert.id);
        }
      }
    }

    // Update user risk profile if rules triggered
    if (result.rulesTriggered > 0) {
      await this.updateUserTransactionRisk(transaction.userId, result.transactionRiskScore);
    }

    this.logger.log(
      `Transaction ${transaction.id} monitoring complete: ${result.rulesTriggered}/${result.rulesEvaluated} rules triggered`,
    );

    return result;
  }

  /**
   * Evaluate a single rule against a transaction
   */
  private async evaluateRule(
    rule: AmlMonitoringRule,
    transaction: TransactionData,
  ): Promise<{ triggered: boolean; details: Record<string, any> }> {
    const params = rule.parameters;

    switch (rule.category) {
      case RuleCategory.AMOUNT:
        return this.evaluateAmountRule(rule, transaction);

      case RuleCategory.STRUCTURING:
        return this.evaluateStructuringRule(rule, transaction);

      case RuleCategory.VELOCITY:
        return this.evaluateVelocityRule(rule, transaction);

      case RuleCategory.GEOGRAPHIC:
        return this.evaluateGeographicRule(rule, transaction);

      case RuleCategory.BEHAVIORAL:
        return this.evaluateBehavioralRule(rule, transaction);

      default:
        return { triggered: false, details: {} };
    }
  }

  /**
   * Evaluate amount-based rules (single large transactions)
   */
  private evaluateAmountRule(
    rule: AmlMonitoringRule,
    transaction: TransactionData,
  ): { triggered: boolean; details: Record<string, any> } {
    const params = rule.parameters;
    const threshold = params.amount_threshold || 10000;

    // Convert to USD for comparison if needed
    const amountUsd = this.convertToUsd(transaction.amount, transaction.currency);

    if (amountUsd >= threshold) {
      return {
        triggered: true,
        details: {
          reason: `Transaction amount ${amountUsd} USD exceeds threshold ${threshold} USD`,
          threshold,
          actualAmount: amountUsd,
          originalAmount: transaction.amount,
          originalCurrency: transaction.currency,
        },
      };
    }

    return { triggered: false, details: {} };
  }

  /**
   * Evaluate structuring detection rules
   */
  private async evaluateStructuringRule(
    rule: AmlMonitoringRule,
    transaction: TransactionData,
  ): Promise<{ triggered: boolean; details: Record<string, any> }> {
    const params = rule.parameters;
    const amountBelow = params.amount_below || 9500;
    const countThreshold = params.count_threshold || 3;
    const timeWindowHours = params.time_window_hours || 24;

    // Get recent transactions for this user
    const recentTransactions = this.getRecentTransactions(
      transaction.userId,
      timeWindowHours * 60 * 60 * 1000,
    );

    // Count transactions just below threshold
    const suspiciousTransactions = recentTransactions.filter(tx => {
      const amountUsd = this.convertToUsd(tx.amount, tx.currency);
      return amountUsd >= amountBelow * 0.8 && amountUsd < 10000;
    });

    if (suspiciousTransactions.length >= countThreshold) {
      const totalAmount = suspiciousTransactions.reduce(
        (sum, tx) => sum + this.convertToUsd(tx.amount, tx.currency),
        0,
      );

      return {
        triggered: true,
        details: {
          reason: `Potential structuring detected: ${suspiciousTransactions.length} transactions just below reporting threshold`,
          transactionCount: suspiciousTransactions.length,
          totalAmount,
          timeWindowHours,
          transactionIds: suspiciousTransactions.map(tx => tx.id),
        },
      };
    }

    return { triggered: false, details: {} };
  }

  /**
   * Evaluate velocity rules (transaction frequency/volume)
   */
  private async evaluateVelocityRule(
    rule: AmlMonitoringRule,
    transaction: TransactionData,
  ): Promise<{ triggered: boolean; details: Record<string, any> }> {
    const params = rule.parameters;

    if (rule.code === 'HIGH_VELOCITY_COUNT') {
      const maxCount = params.max_count || 20;
      const timeWindowHours = params.time_window_hours || 24;

      const recentTransactions = this.getRecentTransactions(
        transaction.userId,
        timeWindowHours * 60 * 60 * 1000,
      );

      if (recentTransactions.length >= maxCount) {
        return {
          triggered: true,
          details: {
            reason: `High transaction velocity: ${recentTransactions.length} transactions in ${timeWindowHours} hours`,
            transactionCount: recentTransactions.length,
            maxAllowed: maxCount,
            timeWindowHours,
          },
        };
      }
    }

    if (rule.code === 'HIGH_VELOCITY_AMOUNT') {
      const maxAmount = params.max_amount || 50000;
      const timeWindowHours = params.time_window_hours || 24;

      const recentTransactions = this.getRecentTransactions(
        transaction.userId,
        timeWindowHours * 60 * 60 * 1000,
      );

      const totalAmount = recentTransactions.reduce(
        (sum, tx) => sum + this.convertToUsd(tx.amount, tx.currency),
        0,
      );

      if (totalAmount >= maxAmount) {
        return {
          triggered: true,
          details: {
            reason: `High volume velocity: ${totalAmount} USD in ${timeWindowHours} hours`,
            totalAmount,
            maxAllowed: maxAmount,
            transactionCount: recentTransactions.length,
            timeWindowHours,
          },
        };
      }
    }

    if (rule.code === 'RAPID_MOVEMENT') {
      const gapMinutes = params.deposit_withdrawal_gap_minutes || 30;
      const percentageMoved = params.percentage_moved || 80;

      // Check for rapid fund movement pattern
      const recentTransactions = this.getRecentTransactions(
        transaction.userId,
        gapMinutes * 60 * 1000,
      );

      const deposits = recentTransactions.filter(tx => tx.type === 'deposit' || tx.type === 'credit');
      const withdrawals = recentTransactions.filter(tx => tx.type === 'withdrawal' || tx.type === 'debit');

      if (deposits.length > 0 && withdrawals.length > 0) {
        const totalDeposits = deposits.reduce((sum, tx) => sum + tx.amount, 0);
        const totalWithdrawals = withdrawals.reduce((sum, tx) => sum + tx.amount, 0);

        if ((totalWithdrawals / totalDeposits) * 100 >= percentageMoved) {
          return {
            triggered: true,
            details: {
              reason: `Rapid fund movement: ${((totalWithdrawals / totalDeposits) * 100).toFixed(1)}% moved within ${gapMinutes} minutes`,
              totalDeposits,
              totalWithdrawals,
              percentageMoved: (totalWithdrawals / totalDeposits) * 100,
              gapMinutes,
            },
          };
        }
      }
    }

    return { triggered: false, details: {} };
  }

  /**
   * Evaluate geographic risk rules
   */
  private async evaluateGeographicRule(
    rule: AmlMonitoringRule,
    transaction: TransactionData,
  ): Promise<{ triggered: boolean; details: Record<string, any> }> {
    const params = rule.parameters;
    const targetCountries = params.countries || [];

    if (!transaction.counterpartyCountry) {
      return { triggered: false, details: {} };
    }

    // Check if counterparty country is in high-risk list
    const highRiskCountry = await this.highRiskCountryRepo.findOne({
      where: {
        countryCode: transaction.counterpartyCountry,
        isActive: true,
      },
    });

    if (highRiskCountry) {
      return {
        triggered: true,
        details: {
          reason: `Transaction involves high-risk country: ${highRiskCountry.countryName}`,
          country: transaction.counterpartyCountry,
          countryName: highRiskCountry.countryName,
          riskLevel: highRiskCountry.riskLevel,
          riskCategory: highRiskCountry.riskCategory,
          blocked: highRiskCountry.transactionsBlocked,
        },
      };
    }

    // Check specific countries list from rule
    if (targetCountries.includes(transaction.counterpartyCountry)) {
      return {
        triggered: true,
        details: {
          reason: `Transaction involves restricted country: ${transaction.counterpartyCountry}`,
          country: transaction.counterpartyCountry,
          restrictedCountries: targetCountries,
        },
      };
    }

    return { triggered: false, details: {} };
  }

  /**
   * Evaluate behavioral rules
   */
  private async evaluateBehavioralRule(
    rule: AmlMonitoringRule,
    transaction: TransactionData,
  ): Promise<{ triggered: boolean; details: Record<string, any> }> {
    const params = rule.parameters;

    if (rule.code === 'ROUND_AMOUNTS') {
      const roundThreshold = params.round_threshold || 1000;
      const countInPeriod = params.count_in_period || 5;
      const periodDays = params.period_days || 7;

      // Check if amount is a round number
      if (transaction.amount % roundThreshold !== 0) {
        return { triggered: false, details: {} };
      }

      // Get recent transactions
      const recentTransactions = this.getRecentTransactions(
        transaction.userId,
        periodDays * 24 * 60 * 60 * 1000,
      );

      // Count round amount transactions
      const roundTransactions = recentTransactions.filter(
        tx => tx.amount % roundThreshold === 0,
      );

      if (roundTransactions.length >= countInPeriod) {
        return {
          triggered: true,
          details: {
            reason: `Multiple round amount transactions: ${roundTransactions.length} in ${periodDays} days`,
            transactionCount: roundTransactions.length,
            threshold: countInPeriod,
            roundThreshold,
            periodDays,
          },
        };
      }
    }

    return { triggered: false, details: {} };
  }

  /**
   * Cache transaction for velocity checks
   */
  private cacheTransaction(transaction: TransactionData): void {
    const userId = transaction.userId;
    const cached = this.userTransactionCache.get(userId) || [];

    cached.push(transaction);

    // Keep only last 100 transactions per user
    if (cached.length > 100) {
      cached.shift();
    }

    this.userTransactionCache.set(userId, cached);

    // Clean up old entries periodically (in production, use TTL in Redis)
    this.cleanupOldCacheEntries(userId);
  }

  /**
   * Get recent transactions from cache
   */
  private getRecentTransactions(userId: string, maxAgeMs: number): TransactionData[] {
    const cached = this.userTransactionCache.get(userId) || [];
    const cutoff = new Date(Date.now() - maxAgeMs);

    return cached.filter(tx => new Date(tx.createdAt) >= cutoff);
  }

  /**
   * Clean up old cache entries
   */
  private cleanupOldCacheEntries(userId: string): void {
    const cached = this.userTransactionCache.get(userId) || [];
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days

    const filtered = cached.filter(tx => new Date(tx.createdAt) >= cutoff);
    this.userTransactionCache.set(userId, filtered);
  }

  /**
   * Convert amount to USD (simplified conversion)
   */
  private convertToUsd(amount: number, currency: string): number {
    // Simplified conversion rates (in production, use real-time rates)
    const rates: Record<string, number> = {
      USD: 1,
      SLE: 0.044, // Sierra Leone Leone to USD (approximate)
      EUR: 1.08,
      GBP: 1.27,
      NGN: 0.00065,
    };

    const rate = rates[currency] || 1;
    return amount * rate;
  }

  /**
   * Map rule category to alert type
   */
  private mapRuleCategoryToAlertType(category: string): AlertType {
    const mapping: Record<string, AlertType> = {
      [RuleCategory.STRUCTURING]: AlertType.STRUCTURING,
      [RuleCategory.VELOCITY]: AlertType.VELOCITY,
      [RuleCategory.GEOGRAPHIC]: AlertType.GEOGRAPHIC,
      [RuleCategory.BEHAVIORAL]: AlertType.BEHAVIORAL,
      [RuleCategory.AMOUNT]: AlertType.AML,
    };

    return mapping[category] || AlertType.AML;
  }

  /**
   * Map severity string to enum
   */
  private mapSeverity(severity: string): AlertSeverity {
    const mapping: Record<string, AlertSeverity> = {
      low: AlertSeverity.LOW,
      medium: AlertSeverity.MEDIUM,
      high: AlertSeverity.HIGH,
      critical: AlertSeverity.CRITICAL,
    };

    return mapping[severity] || AlertSeverity.MEDIUM;
  }

  /**
   * Update user's transaction risk score
   */
  private async updateUserTransactionRisk(userId: string, additionalScore: number): Promise<void> {
    let profile = await this.riskProfileRepo.findOne({ where: { userId } });

    if (!profile) {
      profile = this.riskProfileRepo.create({
        userId,
        overallRiskScore: 0,
        riskLevel: 'low',
      });
    }

    // Decay existing score and add new score
    const decayFactor = 0.9;
    profile.transactionRiskScore = Math.min(
      100,
      Math.round(profile.transactionRiskScore * decayFactor + additionalScore),
    );

    // Recalculate overall risk
    profile.overallRiskScore = this.calculateOverallRiskScore(profile);
    profile.riskLevel = this.getRiskLevelFromScore(profile.overallRiskScore);

    await this.riskProfileRepo.save(profile);
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallRiskScore(profile: AmlRiskProfile): number {
    const weights = {
      kyc: 1,
      geographic: 1.5,
      transaction: 1,
      behavior: 1,
      pep: 2,
      sanctions: 3,
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

    const weightedScore =
      (profile.kycRiskScore || 0) * weights.kyc +
      (profile.geographicRiskScore || 0) * weights.geographic +
      (profile.transactionRiskScore || 0) * weights.transaction +
      (profile.behaviorRiskScore || 0) * weights.behavior +
      (profile.pepRiskScore || 0) * weights.pep +
      (profile.sanctionsRiskScore || 0) * weights.sanctions;

    return Math.round(Math.min(100, weightedScore / totalWeight));
  }

  /**
   * Get risk level from score
   */
  private getRiskLevelFromScore(score: number): string {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Get all monitoring rules
   */
  async getMonitoringRules(activeOnly = true): Promise<AmlMonitoringRule[]> {
    const where = activeOnly ? { isActive: true } : {};
    return this.ruleRepo.find({ where, order: { category: 'ASC', name: 'ASC' } });
  }

  /**
   * Toggle rule active status
   */
  async toggleRuleStatus(ruleId: string, isActive: boolean): Promise<AmlMonitoringRule> {
    const rule = await this.ruleRepo.findOne({ where: { id: ruleId } });
    if (!rule) {
      throw new Error('Rule not found');
    }

    rule.isActive = isActive;
    await this.ruleRepo.save(rule);

    this.logger.log(`Rule ${rule.code} ${isActive ? 'activated' : 'deactivated'}`);
    return rule;
  }
}

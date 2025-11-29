import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudRule, FraudRuleType, FraudRuleAction } from '@payment-system/database';

interface RuleEvaluationResult {
  score: number;
  triggeredRules: string[];
  actions: FraudRuleAction[];
}

@Injectable()
export class RulesService {
  private readonly logger = new Logger(RulesService.name);
  private rulesCache: FraudRule[] = [];
  private cacheTime = 0;
  private readonly cacheTtl = 60000; // 1 minute

  constructor(
    @InjectRepository(FraudRule)
    private readonly ruleRepository: Repository<FraudRule>,
  ) {}

  async evaluateRules(transaction: any): Promise<RuleEvaluationResult> {
    const rules = await this.getActiveRules();
    const triggeredRules: string[] = [];
    const actions: FraudRuleAction[] = [];
    let score = 0;

    for (const rule of rules) {
      if (this.evaluateRule(rule, transaction)) {
        triggeredRules.push(rule.name);
        actions.push(rule.action);
        score += rule.scoreImpact;
      }
    }

    return { score, triggeredRules, actions };
  }

  private async getActiveRules(): Promise<FraudRule[]> {
    if (Date.now() - this.cacheTime > this.cacheTtl) {
      this.rulesCache = await this.ruleRepository.find({
        where: { enabled: true },
        order: { priority: 'ASC' },
      });
      this.cacheTime = Date.now();
    }
    return this.rulesCache;
  }

  private evaluateRule(rule: FraudRule, transaction: any): boolean {
    const conditions = rule.conditions;

    switch (rule.ruleType) {
      case FraudRuleType.AMOUNT:
        if (conditions.minAmount && transaction.amount < conditions.minAmount) return false;
        if (conditions.maxAmount && transaction.amount > conditions.maxAmount) return false;
        return true;

      case FraudRuleType.MCC:
        if (conditions.blockedMccs?.includes(transaction.merchantMcc)) return true;
        return false;

      case FraudRuleType.GEO:
        if (conditions.blockedCountries?.includes(transaction.country)) return true;
        return false;

      case FraudRuleType.TIME:
        const hour = new Date().getHours();
        if (conditions.blockedHours?.includes(hour)) return true;
        return false;

      default:
        return false;
    }
  }

  async createRule(data: Partial<FraudRule>): Promise<FraudRule> {
    const rule = this.ruleRepository.create(data);
    await this.ruleRepository.save(rule);
    this.cacheTime = 0; // Invalidate cache
    return rule;
  }

  async updateRule(id: string, data: Partial<FraudRule>): Promise<FraudRule> {
    await this.ruleRepository.update(id, data);
    this.cacheTime = 0;
    return this.ruleRepository.findOneOrFail({ where: { id } });
  }

  async deleteRule(id: string): Promise<void> {
    await this.ruleRepository.delete(id);
    this.cacheTime = 0;
  }

  async getAllRules(): Promise<FraudRule[]> {
    return this.ruleRepository.find({ order: { priority: 'ASC' } });
  }
}

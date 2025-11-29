import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskScore } from '@payment-system/database';
import { VelocityService } from './services/velocity.service';
import { RulesService } from '../rules/rules.service';

interface FraudCheckRequest {
  transactionId: string;
  cardToken: string;
  amount: number;
  currency: string;
  merchantId: string;
  merchantMcc?: string;
  entryMode: string;
  ipAddress?: string;
  deviceId?: string;
  userId?: string;
}

interface FraudCheckResult {
  decision: 'APPROVE' | 'DECLINE' | 'REVIEW';
  riskScore: number;
  triggeredRules: string[];
  processingTimeMs: number;
}

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(
    @InjectRepository(RiskScore)
    private readonly riskScoreRepository: Repository<RiskScore>,
    private readonly velocityService: VelocityService,
    private readonly rulesService: RulesService,
  ) {}

  async checkTransaction(request: FraudCheckRequest): Promise<FraudCheckResult> {
    const startTime = Date.now();
    const triggeredRules: string[] = [];
    let totalScore = 0;

    // 1. Velocity check
    const velocityResult = await this.velocityService.checkVelocity({
      cardToken: request.cardToken,
      userId: request.userId,
      merchantId: request.merchantId,
      amount: request.amount,
    });
    totalScore += velocityResult.score;
    triggeredRules.push(...velocityResult.violations);

    // 2. Amount check
    if (request.amount > 1000) {
      totalScore += 10;
      triggeredRules.push('HIGH_AMOUNT');
    }
    if (request.amount > 5000) {
      totalScore += 20;
      triggeredRules.push('VERY_HIGH_AMOUNT');
    }

    // 3. Rules engine check
    const rulesResult = await this.rulesService.evaluateRules(request);
    totalScore += rulesResult.score;
    triggeredRules.push(...rulesResult.triggeredRules);

    // Normalize score
    totalScore = Math.min(totalScore, 100);

    // Determine decision
    let decision: 'APPROVE' | 'DECLINE' | 'REVIEW';
    if (totalScore >= 80) {
      decision = 'DECLINE';
    } else if (totalScore >= 50) {
      decision = 'REVIEW';
    } else {
      decision = 'APPROVE';
    }

    const processingTimeMs = Date.now() - startTime;

    // Save risk score
    await this.riskScoreRepository.save({
      transactionId: request.transactionId,
      cardToken: request.cardToken,
      userId: request.userId,
      overallScore: totalScore,
      velocityScore: velocityResult.score,
      amountScore: request.amount > 1000 ? 30 : 0,
      decision,
      triggeredRules,
      processingTimeMs,
    });

    this.logger.log(
      `Fraud check: ${request.transactionId} - Score: ${totalScore}, Decision: ${decision}`,
    );

    return { decision, riskScore: totalScore, triggeredRules, processingTimeMs };
  }
}

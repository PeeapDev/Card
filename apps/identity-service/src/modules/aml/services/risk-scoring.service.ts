import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import {
  AmlRiskProfile,
  AmlHighRiskCountry,
  User,
  RiskLevel,
  ReviewFrequency,
  KycStatus,
} from '@payment-system/database';
import { UpdateRiskProfileDto } from '../dto/aml.dto';

@Injectable()
export class RiskScoringService {
  private readonly logger = new Logger(RiskScoringService.name);

  constructor(
    @InjectRepository(AmlRiskProfile)
    private riskProfileRepo: Repository<AmlRiskProfile>,
    @InjectRepository(AmlHighRiskCountry)
    private highRiskCountryRepo: Repository<AmlHighRiskCountry>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Get or create risk profile for a user
   */
  async getOrCreateRiskProfile(userId: string): Promise<AmlRiskProfile> {
    let profile = await this.riskProfileRepo.findOne({ where: { userId } });

    if (!profile) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      profile = this.riskProfileRepo.create({
        userId,
        overallRiskScore: 0,
        riskLevel: RiskLevel.LOW,
        nextReviewAt: this.calculateNextReviewDate(ReviewFrequency.ANNUAL),
        reviewFrequency: ReviewFrequency.ANNUAL,
      });

      await this.riskProfileRepo.save(profile);

      // Calculate initial risk scores
      await this.calculateInitialRiskScores(profile, user);
    }

    return profile;
  }

  /**
   * Get risk profile by user ID
   */
  async getRiskProfile(userId: string): Promise<AmlRiskProfile> {
    const profile = await this.riskProfileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Risk profile not found');
    }
    return profile;
  }

  /**
   * Calculate initial risk scores for a new profile
   */
  private async calculateInitialRiskScores(profile: AmlRiskProfile, user: User): Promise<void> {
    // KYC risk score based on verification status
    profile.kycRiskScore = this.calculateKycRiskScore(user);

    // Geographic risk score
    if ((user as any).nationality || (user.address as any)?.country) {
      const country = (user as any).nationality || (user.address as any)?.country;
      profile.geographicRiskScore = await this.calculateGeographicRiskScore(country);
      profile.residenceCountry = country;
    }

    // Recalculate overall score
    profile.overallRiskScore = this.calculateOverallRiskScore(profile);
    profile.riskLevel = this.getRiskLevelFromScore(profile.overallRiskScore);

    // Set review frequency based on risk
    profile.reviewFrequency = this.getReviewFrequencyForRiskLevel(profile.riskLevel);
    profile.nextReviewAt = this.calculateNextReviewDate(profile.reviewFrequency);

    await this.riskProfileRepo.save(profile);
  }

  /**
   * Calculate KYC risk score based on user verification
   */
  private calculateKycRiskScore(user: User): number {
    let score = 50; // Base score for unverified

    switch (user.kycStatus) {
      case KycStatus.APPROVED:
        score = 10;
        break;
      case KycStatus.PENDING:
        score = 30;
        break;
      case KycStatus.REJECTED:
        score = 70;
        break;
      case KycStatus.EXPIRED:
        score = 60;
        break;
      default:
        score = 50; // NOT_STARTED
    }

    // Adjust based on KYC tier
    if (user.kycTier >= 2) score = Math.max(0, score - 20);
    else if (user.kycTier === 1) score = Math.max(0, score - 10);

    // Email and phone verification
    if (user.emailVerified) score = Math.max(0, score - 5);
    if (user.phoneVerified) score = Math.max(0, score - 5);

    return score;
  }

  /**
   * Calculate geographic risk score based on country
   */
  private async calculateGeographicRiskScore(countryCode: string): Promise<number> {
    if (!countryCode) return 20; // Default low-medium for unknown

    const highRiskCountry = await this.highRiskCountryRepo.findOne({
      where: { countryCode: countryCode.toUpperCase(), isActive: true },
    });

    if (highRiskCountry) {
      switch (highRiskCountry.riskLevel) {
        case 'prohibited':
          return 100;
        case 'high':
          return 80;
        case 'elevated':
          return 50;
        default:
          return 40;
      }
    }

    return 10; // Low risk for unlisted countries
  }

  /**
   * Update risk profile
   */
  async updateRiskProfile(userId: string, dto: UpdateRiskProfileDto): Promise<AmlRiskProfile> {
    const profile = await this.getOrCreateRiskProfile(userId);

    if (dto.kycRiskScore !== undefined) profile.kycRiskScore = dto.kycRiskScore;
    if (dto.geographicRiskScore !== undefined) profile.geographicRiskScore = dto.geographicRiskScore;
    if (dto.transactionRiskScore !== undefined) profile.transactionRiskScore = dto.transactionRiskScore;
    if (dto.behaviorRiskScore !== undefined) profile.behaviorRiskScore = dto.behaviorRiskScore;

    if (dto.isPep !== undefined) {
      profile.isPep = dto.isPep;
      if (dto.isPep) {
        profile.pepRiskScore = 80;
        profile.eddRequired = true;
      }
    }

    if (dto.pepCategory) profile.pepCategory = dto.pepCategory as any;

    if (dto.eddRequired !== undefined) profile.eddRequired = dto.eddRequired;

    if (dto.isRestricted !== undefined) {
      profile.isRestricted = dto.isRestricted;
      if (dto.isRestricted) {
        profile.restrictedAt = new Date();
        profile.restrictionReason = dto.restrictionReason;
      } else {
        profile.restrictedAt = null;
        profile.restrictionReason = null;
      }
    }

    // Recalculate overall score
    profile.overallRiskScore = this.calculateOverallRiskScore(profile);
    profile.riskLevel = this.getRiskLevelFromScore(profile.overallRiskScore);

    // Update review frequency if risk level changed
    profile.reviewFrequency = this.getReviewFrequencyForRiskLevel(profile.riskLevel);
    profile.nextReviewAt = this.calculateNextReviewDate(profile.reviewFrequency);

    await this.riskProfileRepo.save(profile);

    this.logger.log(`Updated risk profile for user ${userId}: score=${profile.overallRiskScore}, level=${profile.riskLevel}`);
    return profile;
  }

  /**
   * Add a risk factor to a user's profile
   */
  async addRiskFactor(
    userId: string,
    factor: string,
    category: string,
    score: number,
    description: string,
  ): Promise<AmlRiskProfile> {
    const profile = await this.getOrCreateRiskProfile(userId);

    const factors = profile.riskFactors || [];
    factors.push({
      factor,
      category,
      score,
      description,
      detectedAt: new Date().toISOString(),
    });

    profile.riskFactors = factors;

    // Update category-specific score
    switch (category) {
      case 'kyc':
        profile.kycRiskScore = Math.min(100, profile.kycRiskScore + score);
        break;
      case 'geographic':
        profile.geographicRiskScore = Math.min(100, profile.geographicRiskScore + score);
        break;
      case 'transaction':
        profile.transactionRiskScore = Math.min(100, profile.transactionRiskScore + score);
        break;
      case 'behavior':
        profile.behaviorRiskScore = Math.min(100, profile.behaviorRiskScore + score);
        break;
      case 'pep':
        profile.pepRiskScore = Math.min(100, profile.pepRiskScore + score);
        break;
      case 'sanctions':
        profile.sanctionsRiskScore = Math.min(100, profile.sanctionsRiskScore + score);
        break;
    }

    // Recalculate overall
    profile.overallRiskScore = this.calculateOverallRiskScore(profile);
    profile.riskLevel = this.getRiskLevelFromScore(profile.overallRiskScore);

    await this.riskProfileRepo.save(profile);
    return profile;
  }

  /**
   * Calculate overall risk score from component scores
   */
  private calculateOverallRiskScore(profile: AmlRiskProfile): number {
    const weights = {
      kyc: 1,
      geographic: 1.5,
      product: 1,
      channel: 1,
      transaction: 1,
      behavior: 1,
      pep: 2,
      sanctions: 3,
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

    const weightedScore =
      (profile.kycRiskScore || 0) * weights.kyc +
      (profile.geographicRiskScore || 0) * weights.geographic +
      (profile.productRiskScore || 0) * weights.product +
      (profile.channelRiskScore || 0) * weights.channel +
      (profile.transactionRiskScore || 0) * weights.transaction +
      (profile.behaviorRiskScore || 0) * weights.behavior +
      (profile.pepRiskScore || 0) * weights.pep +
      (profile.sanctionsRiskScore || 0) * weights.sanctions;

    return Math.round(Math.min(100, weightedScore / totalWeight));
  }

  /**
   * Get risk level from score
   */
  private getRiskLevelFromScore(score: number): RiskLevel {
    if (score >= 80) return RiskLevel.CRITICAL;
    if (score >= 60) return RiskLevel.HIGH;
    if (score >= 40) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Get review frequency based on risk level
   */
  private getReviewFrequencyForRiskLevel(riskLevel: RiskLevel): ReviewFrequency {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return ReviewFrequency.MONTHLY;
      case RiskLevel.HIGH:
        return ReviewFrequency.QUARTERLY;
      case RiskLevel.MEDIUM:
        return ReviewFrequency.SEMI_ANNUAL;
      default:
        return ReviewFrequency.ANNUAL;
    }
  }

  /**
   * Calculate next review date based on frequency
   */
  private calculateNextReviewDate(frequency: ReviewFrequency): Date {
    const now = new Date();
    switch (frequency) {
      case ReviewFrequency.MONTHLY:
        return new Date(now.setMonth(now.getMonth() + 1));
      case ReviewFrequency.QUARTERLY:
        return new Date(now.setMonth(now.getMonth() + 3));
      case ReviewFrequency.SEMI_ANNUAL:
        return new Date(now.setMonth(now.getMonth() + 6));
      default:
        return new Date(now.setFullYear(now.getFullYear() + 1));
    }
  }

  /**
   * Mark EDD as completed
   */
  async completeEdd(userId: string): Promise<AmlRiskProfile> {
    const profile = await this.getRiskProfile(userId);

    profile.eddCompleted = true;
    profile.eddCompletedAt = new Date();
    profile.eddNextReviewAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    await this.riskProfileRepo.save(profile);

    this.logger.log(`EDD completed for user ${userId}`);
    return profile;
  }

  /**
   * Complete risk review
   */
  async completeReview(userId: string): Promise<AmlRiskProfile> {
    const profile = await this.getRiskProfile(userId);

    profile.lastReviewedAt = new Date();
    profile.nextReviewAt = this.calculateNextReviewDate(profile.reviewFrequency);

    await this.riskProfileRepo.save(profile);

    this.logger.log(`Risk review completed for user ${userId}`);
    return profile;
  }

  /**
   * Get high-risk users
   */
  async getHighRiskUsers(page = 1, limit = 20): Promise<{ profiles: AmlRiskProfile[]; total: number }> {
    const [profiles, total] = await this.riskProfileRepo.findAndCount({
      where: {
        riskLevel: In([RiskLevel.HIGH, RiskLevel.CRITICAL]),
      },
      order: { overallRiskScore: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { profiles, total };
  }

  /**
   * Get users requiring EDD
   */
  async getEddRequiredUsers(): Promise<AmlRiskProfile[]> {
    return this.riskProfileRepo.find({
      where: {
        eddRequired: true,
        eddCompleted: false,
      },
      order: { overallRiskScore: 'DESC' },
    });
  }

  /**
   * Get users due for review
   */
  async getUsersDueForReview(): Promise<AmlRiskProfile[]> {
    return this.riskProfileRepo.find({
      where: {
        nextReviewAt: LessThanOrEqual(new Date()),
      },
      order: { nextReviewAt: 'ASC' },
    });
  }

  /**
   * Get PEP users
   */
  async getPepUsers(): Promise<AmlRiskProfile[]> {
    return this.riskProfileRepo.find({
      where: { isPep: true },
      order: { overallRiskScore: 'DESC' },
    });
  }

  /**
   * Get restricted users
   */
  async getRestrictedUsers(): Promise<AmlRiskProfile[]> {
    return this.riskProfileRepo.find({
      where: { isRestricted: true },
      order: { restrictedAt: 'DESC' },
    });
  }

  /**
   * Get risk profile statistics
   */
  async getRiskStats(): Promise<{
    totalProfiles: number;
    byRiskLevel: Record<string, number>;
    highRiskCount: number;
    eddRequired: number;
    eddCompleted: number;
    pepCount: number;
    restrictedCount: number;
    dueForReview: number;
    averageRiskScore: number;
  }> {
    const allProfiles = await this.riskProfileRepo.find();

    const byRiskLevel: Record<string, number> = {};
    Object.values(RiskLevel).forEach(level => {
      byRiskLevel[level] = allProfiles.filter(p => p.riskLevel === level).length;
    });

    const now = new Date();
    const dueForReview = allProfiles.filter(p => p.nextReviewAt && p.nextReviewAt <= now).length;

    const totalScore = allProfiles.reduce((sum, p) => sum + p.overallRiskScore, 0);

    return {
      totalProfiles: allProfiles.length,
      byRiskLevel,
      highRiskCount: allProfiles.filter(p => p.riskLevel === RiskLevel.HIGH || p.riskLevel === RiskLevel.CRITICAL).length,
      eddRequired: allProfiles.filter(p => p.eddRequired && !p.eddCompleted).length,
      eddCompleted: allProfiles.filter(p => p.eddCompleted).length,
      pepCount: allProfiles.filter(p => p.isPep).length,
      restrictedCount: allProfiles.filter(p => p.isRestricted).length,
      dueForReview,
      averageRiskScore: allProfiles.length > 0 ? Math.round(totalScore / allProfiles.length) : 0,
    };
  }

  /**
   * Get all high-risk countries
   */
  async getHighRiskCountries(): Promise<AmlHighRiskCountry[]> {
    return this.highRiskCountryRepo.find({
      where: { isActive: true },
      order: { riskLevel: 'DESC', countryName: 'ASC' },
    });
  }
}

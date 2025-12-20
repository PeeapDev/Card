import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  AmlScreeningResult,
  AmlWatchlist,
  AmlWatchlistEntry,
  AmlRiskProfile,
  User,
  ScreeningStatus,
  ScreeningType,
  RiskLevel,
} from '@payment-system/database';

interface ScreeningMatch {
  watchlistId: string;
  watchlistCode: string;
  entryId: string;
  entryName: string;
  matchScore: number;
  matchType: string;
  matchedFields: string[];
}

@Injectable()
export class ScreeningService {
  private readonly logger = new Logger(ScreeningService.name);

  constructor(
    private dataSource: DataSource,
    @InjectRepository(AmlScreeningResult)
    private screeningResultRepo: Repository<AmlScreeningResult>,
    @InjectRepository(AmlWatchlist)
    private watchlistRepo: Repository<AmlWatchlist>,
    @InjectRepository(AmlWatchlistEntry)
    private watchlistEntryRepo: Repository<AmlWatchlistEntry>,
    @InjectRepository(AmlRiskProfile)
    private riskProfileRepo: Repository<AmlRiskProfile>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Screen a user against all active watchlists
   */
  async screenUser(
    userId: string,
    screeningType: ScreeningType = ScreeningType.ONBOARDING,
    triggeredBy: string = 'system',
    triggeredByUserId?: string,
  ): Promise<AmlScreeningResult> {
    this.logger.log(`Starting screening for user ${userId}, type: ${screeningType}`);

    // Get user details
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prepare screening data
    const screenedName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const screenedDob = user.dateOfBirth;

    // Perform screening against all active watchlists
    const matches = await this.performScreening(screenedName, screenedDob);

    // Calculate risk level based on matches
    const riskLevel = this.calculateRiskLevel(matches);
    const requiresEdd = riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL || matches.length > 0;

    // Create screening result
    const screeningResult = this.screeningResultRepo.create({
      userId,
      screeningType,
      triggeredBy,
      triggeredByUserId,
      screenedName,
      screenedDob,
      screenedNationality: (user as any).nationality || null,
      totalMatches: matches.length,
      highestMatchScore: matches.length > 0 ? Math.max(...matches.map(m => m.matchScore)) : 0,
      matches,
      status: matches.length > 0 ? ScreeningStatus.PENDING : ScreeningStatus.CLEARED,
      riskLevel,
      requiresEdd,
    });

    await this.screeningResultRepo.save(screeningResult);

    // Update risk profile if matches found
    if (matches.length > 0) {
      await this.updateRiskProfileFromScreening(userId, matches, riskLevel);
    }

    this.logger.log(`Screening completed for user ${userId}: ${matches.length} matches found`);
    return screeningResult;
  }

  /**
   * Perform the actual screening against watchlist entries
   */
  private async performScreening(
    name: string,
    dateOfBirth?: Date,
  ): Promise<ScreeningMatch[]> {
    const matches: ScreeningMatch[] = [];

    if (!name) return matches;

    // Get active watchlists
    const watchlists = await this.watchlistRepo.find({
      where: { isActive: true },
    });

    // Generate phonetic codes for the name
    const nameSoundex = this.soundex(name);
    const nameMetaphone = this.metaphone(name);
    const nameLower = name.toLowerCase();
    const nameWords = nameLower.split(/\s+/).filter(w => w.length > 2);

    for (const watchlist of watchlists) {
      // Search entries in this watchlist
      const entries = await this.searchWatchlistEntries(
        watchlist.id,
        nameLower,
        nameSoundex,
        nameMetaphone,
        dateOfBirth,
      );

      for (const entry of entries) {
        const matchResult = this.calculateMatchScore(
          name,
          dateOfBirth,
          entry,
        );

        if (matchResult.score >= 70) {
          matches.push({
            watchlistId: watchlist.id,
            watchlistCode: watchlist.code,
            entryId: entry.id,
            entryName: entry.primaryName,
            matchScore: matchResult.score,
            matchType: matchResult.matchType,
            matchedFields: matchResult.matchedFields,
          });
        }
      }
    }

    // Sort by match score descending
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Search watchlist entries using multiple matching strategies
   */
  private async searchWatchlistEntries(
    watchlistId: string,
    nameLower: string,
    nameSoundex: string,
    nameMetaphone: string,
    dateOfBirth?: Date,
  ): Promise<AmlWatchlistEntry[]> {
    const queryBuilder = this.watchlistEntryRepo
      .createQueryBuilder('entry')
      .where('entry.watchlistId = :watchlistId', { watchlistId })
      .andWhere('entry.isActive = true');

    // Multiple matching strategies combined with OR
    queryBuilder.andWhere(
      `(
        LOWER(entry.primaryName) LIKE :nameLike
        OR entry.nameSoundex = :soundex
        OR entry.nameMetaphone = :metaphone
        OR EXISTS (
          SELECT 1 FROM unnest(entry.aliases) AS alias
          WHERE LOWER(alias) LIKE :nameLike
        )
      )`,
      {
        nameLike: `%${nameLower}%`,
        soundex: nameSoundex,
        metaphone: nameMetaphone,
      },
    );

    // If DOB is provided, add optional DOB matching for higher precision
    if (dateOfBirth) {
      const year = dateOfBirth.getFullYear();
      queryBuilder.addSelect(
        `CASE
          WHEN entry.dateOfBirth = :dob THEN 1
          WHEN entry.yearOfBirth = :year THEN 0.5
          ELSE 0
        END`,
        'dobMatch',
      );
      queryBuilder.setParameter('dob', dateOfBirth);
      queryBuilder.setParameter('year', year);
    }

    return queryBuilder.limit(100).getMany();
  }

  /**
   * Calculate match score between screened name and watchlist entry
   */
  private calculateMatchScore(
    screenedName: string,
    screenedDob: Date | undefined,
    entry: AmlWatchlistEntry,
  ): { score: number; matchType: string; matchedFields: string[] } {
    let score = 0;
    const matchedFields: string[] = [];
    let matchType = 'partial';

    const screenedNameLower = screenedName.toLowerCase();
    const entryNameLower = entry.primaryName.toLowerCase();

    // Exact name match
    if (screenedNameLower === entryNameLower) {
      score += 50;
      matchedFields.push('exact_name');
      matchType = 'exact';
    } else {
      // Fuzzy name matching using Levenshtein
      const nameSimilarity = this.calculateLevenshteinSimilarity(screenedNameLower, entryNameLower);
      if (nameSimilarity >= 0.9) {
        score += 45;
        matchedFields.push('name_high_similarity');
      } else if (nameSimilarity >= 0.8) {
        score += 35;
        matchedFields.push('name_medium_similarity');
      } else if (nameSimilarity >= 0.7) {
        score += 25;
        matchedFields.push('name_low_similarity');
      }

      // Check aliases
      if (entry.aliases) {
        for (const alias of entry.aliases) {
          if (alias.toLowerCase() === screenedNameLower) {
            score += 40;
            matchedFields.push('alias_exact');
            break;
          }
          const aliasSimilarity = this.calculateLevenshteinSimilarity(screenedNameLower, alias.toLowerCase());
          if (aliasSimilarity >= 0.85) {
            score += 30;
            matchedFields.push('alias_similarity');
            break;
          }
        }
      }
    }

    // Phonetic matching
    const screenedSoundex = this.soundex(screenedName);
    if (entry.nameSoundex === screenedSoundex) {
      score += 15;
      matchedFields.push('soundex');
    }

    const screenedMetaphone = this.metaphone(screenedName);
    if (entry.nameMetaphone === screenedMetaphone) {
      score += 15;
      matchedFields.push('metaphone');
    }

    // Date of birth matching
    if (screenedDob && entry.dateOfBirth) {
      const screenedDate = new Date(screenedDob).toISOString().split('T')[0];
      const entryDate = new Date(entry.dateOfBirth).toISOString().split('T')[0];
      if (screenedDate === entryDate) {
        score += 25;
        matchedFields.push('exact_dob');
        matchType = score >= 75 ? 'exact' : matchType;
      }
    } else if (screenedDob && entry.yearOfBirth) {
      if (screenedDob.getFullYear() === entry.yearOfBirth) {
        score += 10;
        matchedFields.push('year_of_birth');
      }
    }

    // Cap score at 100
    score = Math.min(score, 100);

    return { score, matchType, matchedFields };
  }

  /**
   * Calculate Levenshtein similarity (0-1)
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    if (maxLen === 0) return 1;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - distance / maxLen;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Soundex phonetic algorithm
   */
  private soundex(str: string): string {
    const a = str.toLowerCase().split('');
    const f = a.shift() as string;
    const codes: Record<string, string> = {
      a: '', e: '', i: '', o: '', u: '', y: '', h: '', w: '',
      b: '1', f: '1', p: '1', v: '1',
      c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
      d: '3', t: '3',
      l: '4',
      m: '5', n: '5',
      r: '6',
    };

    const r = a
      .map((v) => codes[v])
      .filter((v, i, arr) => v !== arr[i - 1])
      .filter((v) => v !== '')
      .join('');

    return (f + r + '000').slice(0, 4).toUpperCase();
  }

  /**
   * Simple Metaphone implementation
   */
  private metaphone(str: string): string {
    const vowels = 'aeiou';
    let result = '';
    const s = str.toLowerCase().replace(/[^a-z]/g, '');

    for (let i = 0; i < s.length && result.length < 6; i++) {
      const c = s[i];
      const prev = i > 0 ? s[i - 1] : '';
      const next = i < s.length - 1 ? s[i + 1] : '';

      if (vowels.includes(c)) {
        if (i === 0) result += c.toUpperCase();
        continue;
      }

      switch (c) {
        case 'b':
          if (!(i === s.length - 1 && prev === 'm')) result += 'B';
          break;
        case 'c':
          if (next === 'h') result += 'X';
          else if ('iey'.includes(next)) result += 'S';
          else result += 'K';
          break;
        case 'd':
          if (next === 'g' && 'iey'.includes(s[i + 2] || '')) result += 'J';
          else result += 'T';
          break;
        case 'g':
          if (next === 'h') continue;
          if ('iey'.includes(next)) result += 'J';
          else result += 'K';
          break;
        case 'h':
          if (!vowels.includes(prev) && !vowels.includes(next)) continue;
          result += 'H';
          break;
        case 'k':
          if (prev !== 'c') result += 'K';
          break;
        case 'p':
          if (next === 'h') result += 'F';
          else result += 'P';
          break;
        case 's':
          if (next === 'h') result += 'X';
          else result += 'S';
          break;
        case 'w':
        case 'y':
          if (vowels.includes(next)) result += c.toUpperCase();
          break;
        case 'x':
          result += 'KS';
          break;
        default:
          if ('fjlmnr'.includes(c)) result += c.toUpperCase();
          else if (c === 't' && next === 'h') result += '0';
          else if (c === 't') result += 'T';
          else if (c === 'q') result += 'K';
          else if (c === 'v') result += 'F';
          else if (c === 'z') result += 'S';
      }
    }

    return result;
  }

  /**
   * Calculate risk level based on matches
   */
  private calculateRiskLevel(matches: ScreeningMatch[]): RiskLevel {
    if (matches.length === 0) return RiskLevel.LOW;

    const maxScore = Math.max(...matches.map(m => m.matchScore));

    // Check for sanctions matches (highest priority)
    const hasSanctionsMatch = matches.some(
      m => ['OFAC_SDN', 'OFAC_CONS', 'UN_CONSOLIDATED', 'EU_SANCTIONS', 'UK_HMT'].includes(m.watchlistCode)
    );

    if (hasSanctionsMatch && maxScore >= 90) return RiskLevel.CRITICAL;
    if (hasSanctionsMatch && maxScore >= 80) return RiskLevel.HIGH;
    if (maxScore >= 90) return RiskLevel.HIGH;
    if (maxScore >= 80) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Update user's risk profile based on screening results
   */
  private async updateRiskProfileFromScreening(
    userId: string,
    matches: ScreeningMatch[],
    riskLevel: RiskLevel,
  ): Promise<void> {
    let profile = await this.riskProfileRepo.findOne({ where: { userId } });

    if (!profile) {
      profile = this.riskProfileRepo.create({
        userId,
        overallRiskScore: 0,
        riskLevel: RiskLevel.LOW,
      });
    }

    // Calculate sanctions risk score based on matches
    const sanctionsScore = Math.min(100, matches.length * 25 + Math.max(...matches.map(m => m.matchScore)));

    profile.sanctionsRiskScore = sanctionsScore;

    // Check if any match is PEP-related
    const pepMatches = matches.filter(m => ['PEP_GLOBAL', 'PEP_AFRICA'].includes(m.watchlistCode));
    if (pepMatches.length > 0) {
      profile.pepRiskScore = Math.min(100, pepMatches.length * 30 + Math.max(...pepMatches.map(m => m.matchScore)));
      profile.isPep = pepMatches.some(m => m.matchScore >= 85);
    }

    // Add risk factors
    const existingFactors = profile.riskFactors || [];
    const newFactors = matches.map(match => ({
      factor: `Watchlist Match: ${match.watchlistCode}`,
      category: 'sanctions',
      score: match.matchScore,
      description: `Matched against ${match.entryName} with ${match.matchScore}% confidence`,
      detectedAt: new Date().toISOString(),
    }));

    profile.riskFactors = [...existingFactors, ...newFactors];

    // Recalculate overall risk score
    profile.overallRiskScore = this.calculateOverallRiskScore(profile);
    profile.riskLevel = this.getRiskLevelFromScore(profile.overallRiskScore);

    // Set EDD requirement if high risk
    if (profile.riskLevel === RiskLevel.HIGH || profile.riskLevel === RiskLevel.CRITICAL) {
      profile.eddRequired = true;
    }

    await this.riskProfileRepo.save(profile);
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
   * Get screening result by ID
   */
  async getScreeningResult(id: string): Promise<AmlScreeningResult> {
    const result = await this.screeningResultRepo.findOne({ where: { id } });
    if (!result) {
      throw new NotFoundException('Screening result not found');
    }
    return result;
  }

  /**
   * Get all screening results for a user
   */
  async getUserScreeningHistory(userId: string): Promise<AmlScreeningResult[]> {
    return this.screeningResultRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get pending screening results
   */
  async getPendingScreenings(page = 1, limit = 20): Promise<{ results: AmlScreeningResult[]; total: number }> {
    const [results, total] = await this.screeningResultRepo.findAndCount({
      where: { status: ScreeningStatus.PENDING },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { results, total };
  }

  /**
   * Resolve a screening result
   */
  async resolveScreening(
    id: string,
    status: ScreeningStatus,
    resolvedBy: string,
    resolutionNotes?: string,
  ): Promise<AmlScreeningResult> {
    const result = await this.getScreeningResult(id);

    result.status = status;
    result.resolvedBy = resolvedBy;
    result.resolvedAt = new Date();
    result.resolutionNotes = resolutionNotes || null;

    await this.screeningResultRepo.save(result);

    this.logger.log(`Screening ${id} resolved as ${status} by ${resolvedBy}`);
    return result;
  }

  /**
   * Get all active watchlists
   */
  async getWatchlists(): Promise<AmlWatchlist[]> {
    return this.watchlistRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Get watchlist statistics
   */
  async getWatchlistStats(): Promise<{ code: string; name: string; totalEntries: number; lastUpdated: Date }[]> {
    const watchlists = await this.watchlistRepo.find({ where: { isActive: true } });

    return Promise.all(
      watchlists.map(async (wl) => {
        const count = await this.watchlistEntryRepo.count({
          where: { watchlistId: wl.id, isActive: true },
        });

        return {
          code: wl.code,
          name: wl.name,
          totalEntries: count,
          lastUpdated: wl.lastUpdatedAt,
        };
      }),
    );
  }
}

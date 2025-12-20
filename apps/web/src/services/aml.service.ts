/**
 * AML/Compliance Service
 * Handles all AML-related API calls
 */

import { api } from '@/lib/api';

// ==================== Types ====================

export interface AmlDashboardStats {
  pendingScreenings: number;
  openAlerts: number;
  criticalAlerts: number;
  highRiskUsers: number;
  pendingSars: number;
  alertsTodayCount: number;
  alertsResolvedToday: number;
  eddPendingCount: number;
}

export interface ScreeningResult {
  id: string;
  userId: string;
  screeningType: string;
  screenedName: string;
  totalMatches: number;
  highestMatchScore: number;
  matches: ScreeningMatch[];
  status: 'pending' | 'cleared' | 'escalated' | 'blocked';
  riskLevel: string;
  requiresEdd: boolean;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface ScreeningMatch {
  watchlistId: string;
  watchlistCode: string;
  entryId: string;
  entryName: string;
  matchScore: number;
  matchType: string;
  matchedFields: string[];
}

export interface AmlAlert {
  id: string;
  reference: string;
  userId: string;
  transactionId?: string;
  alertType: 'aml' | 'pep' | 'sanctions' | 'velocity' | 'fraud' | 'behavioral' | 'structuring' | 'geographic';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description?: string;
  triggerData: Record<string, any>;
  status: 'open' | 'investigating' | 'escalated' | 'resolved' | 'dismissed' | 'sar_filed';
  assignedTo?: string;
  assignedAt?: string;
  investigationNotes: Array<{ note: string; addedBy: string; addedAt: string }>;
  resolution?: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  sarRequired: boolean;
  riskScoreImpact: number;
  dueDate?: string;
  createdAt: string;
}

export interface AlertStats {
  total: number;
  open: number;
  investigating: number;
  resolved: number;
  dismissed: number;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byType: Record<string, number>;
}

export interface RiskProfile {
  id: string;
  userId: string;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  kycRiskScore: number;
  geographicRiskScore: number;
  transactionRiskScore: number;
  behaviorRiskScore: number;
  pepRiskScore: number;
  sanctionsRiskScore: number;
  riskFactors: Array<{
    factor: string;
    category: string;
    score: number;
    description: string;
    detectedAt: string;
  }>;
  isPep: boolean;
  pepCategory?: string;
  eddRequired: boolean;
  eddCompleted: boolean;
  isRestricted: boolean;
  restrictionReason?: string;
  nextReviewAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskStats {
  totalProfiles: number;
  byRiskLevel: Record<string, number>;
  highRiskCount: number;
  eddRequired: number;
  eddCompleted: number;
  pepCount: number;
  restrictedCount: number;
  dueForReview: number;
  averageRiskScore: number;
}

export interface Sar {
  id: string;
  reference: string;
  reportType: 'SAR' | 'CTR' | 'SAR-SF';
  userId: string;
  subjectSnapshot: {
    name: string;
    dateOfBirth?: string;
    address?: Record<string, any>;
  };
  narrative: string;
  activityCategories: string[];
  totalAmount?: number;
  currency: string;
  status: 'draft' | 'pending_review' | 'approved' | 'filed' | 'acknowledged';
  preparedBy?: string;
  reviewedBy?: string;
  filedAt?: string;
  filingConfirmation?: string;
  dueDate?: string;
  createdAt: string;
}

export interface SarStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  pendingCount: number;
  overdueCount: number;
  filedThisMonth: number;
}

export interface Watchlist {
  id: string;
  code: string;
  name: string;
  description?: string;
  listType: string;
  totalEntries: number;
  lastUpdatedAt?: string;
  isActive: boolean;
}

export interface HighRiskCountry {
  id: string;
  countryCode: string;
  countryName: string;
  riskLevel: string;
  riskCategory?: string;
  transactionsBlocked: boolean;
  requiresEdd: boolean;
  listingAuthority?: string;
}

export interface MonitoringRule {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  ruleType: string;
  parameters: Record<string, any>;
  severity: string;
  actionType: string;
  isActive: boolean;
}

// ==================== Dashboard ====================

export async function getAmlDashboardStats(): Promise<AmlDashboardStats> {
  return api.get<AmlDashboardStats>('/aml/dashboard');
}

// ==================== Screening ====================

export async function screenUser(userId: string, screeningType = 'manual'): Promise<ScreeningResult> {
  return api.post<ScreeningResult>('/aml/screening', { userId, screeningType });
}

export async function getPendingScreenings(page = 1, limit = 20): Promise<{ results: ScreeningResult[]; total: number }> {
  return api.get<{ results: ScreeningResult[]; total: number }>('/aml/screening/pending', {
    params: { page: String(page), limit: String(limit) },
  });
}

export async function getScreeningResult(id: string): Promise<ScreeningResult> {
  return api.get<ScreeningResult>(`/aml/screening/${id}`);
}

export async function getUserScreeningHistory(userId: string): Promise<ScreeningResult[]> {
  return api.get<ScreeningResult[]>(`/aml/screening/user/${userId}`);
}

export async function resolveScreening(
  id: string,
  status: 'cleared' | 'escalated' | 'blocked',
  resolutionNotes?: string,
): Promise<ScreeningResult> {
  return api.put<ScreeningResult>(`/aml/screening/${id}/resolve`, { status, resolutionNotes });
}

export async function getWatchlists(): Promise<Watchlist[]> {
  return api.get<Watchlist[]>('/aml/watchlists');
}

export async function getWatchlistStats(): Promise<Array<{ code: string; name: string; totalEntries: number; lastUpdated: string }>> {
  return api.get('/aml/watchlists/stats');
}

// ==================== Alerts ====================

export async function getAlerts(params?: {
  status?: string;
  severity?: string;
  alertType?: string;
  userId?: string;
  page?: number;
  limit?: number;
}): Promise<{ alerts: AmlAlert[]; total: number; page: number; totalPages: number }> {
  const queryParams: Record<string, string> = {};
  if (params?.status) queryParams.status = params.status;
  if (params?.severity) queryParams.severity = params.severity;
  if (params?.alertType) queryParams.alertType = params.alertType;
  if (params?.userId) queryParams.userId = params.userId;
  if (params?.page) queryParams.page = String(params.page);
  if (params?.limit) queryParams.limit = String(params.limit);

  return api.get('/aml/alerts', { params: queryParams });
}

export async function getOpenAlerts(page = 1, limit = 20): Promise<{ alerts: AmlAlert[]; total: number }> {
  return api.get('/aml/alerts/open', { params: { page: String(page), limit: String(limit) } });
}

export async function getCriticalAlerts(): Promise<AmlAlert[]> {
  return api.get<AmlAlert[]>('/aml/alerts/critical');
}

export async function getOverdueAlerts(): Promise<AmlAlert[]> {
  return api.get<AmlAlert[]>('/aml/alerts/overdue');
}

export async function getAlertStats(): Promise<AlertStats> {
  return api.get<AlertStats>('/aml/alerts/stats');
}

export async function getAlert(id: string): Promise<AmlAlert> {
  return api.get<AmlAlert>(`/aml/alerts/${id}`);
}

export async function getUserAlerts(userId: string): Promise<AmlAlert[]> {
  return api.get<AmlAlert[]>(`/aml/alerts/user/${userId}`);
}

export async function updateAlert(
  id: string,
  data: { status?: string; assignedTo?: string; note?: string },
): Promise<AmlAlert> {
  return api.put<AmlAlert>(`/aml/alerts/${id}`, data);
}

export async function resolveAlert(
  id: string,
  resolution: string,
  resolutionNotes?: string,
  requiresSar?: boolean,
): Promise<AmlAlert> {
  return api.put<AmlAlert>(`/aml/alerts/${id}/resolve`, { resolution, resolutionNotes, requiresSar });
}

export async function dismissAlert(id: string, reason: string): Promise<AmlAlert> {
  return api.put<AmlAlert>(`/aml/alerts/${id}/dismiss`, { reason });
}

// ==================== Risk Profiles ====================

export async function getRiskProfile(userId: string): Promise<RiskProfile> {
  return api.get<RiskProfile>(`/aml/risk/${userId}`);
}

export async function updateRiskProfile(userId: string, data: Partial<RiskProfile>): Promise<RiskProfile> {
  return api.put<RiskProfile>(`/aml/risk/${userId}`, data);
}

export async function completeEdd(userId: string): Promise<RiskProfile> {
  return api.post<RiskProfile>(`/aml/risk/${userId}/edd/complete`);
}

export async function completeRiskReview(userId: string): Promise<RiskProfile> {
  return api.post<RiskProfile>(`/aml/risk/${userId}/review/complete`);
}

export async function getHighRiskUsers(page = 1, limit = 20): Promise<{ profiles: RiskProfile[]; total: number }> {
  return api.get('/aml/risk-profiles/high-risk', { params: { page: String(page), limit: String(limit) } });
}

export async function getEddRequiredUsers(): Promise<RiskProfile[]> {
  return api.get<RiskProfile[]>('/aml/risk-profiles/edd-required');
}

export async function getUsersDueForReview(): Promise<RiskProfile[]> {
  return api.get<RiskProfile[]>('/aml/risk-profiles/due-review');
}

export async function getPepUsers(): Promise<RiskProfile[]> {
  return api.get<RiskProfile[]>('/aml/risk-profiles/pep');
}

export async function getRestrictedUsers(): Promise<RiskProfile[]> {
  return api.get<RiskProfile[]>('/aml/risk-profiles/restricted');
}

export async function getRiskStats(): Promise<RiskStats> {
  return api.get<RiskStats>('/aml/risk-profiles/stats');
}

export async function getHighRiskCountries(): Promise<HighRiskCountry[]> {
  return api.get<HighRiskCountry[]>('/aml/countries/high-risk');
}

// ==================== SARs ====================

export async function getSars(params?: {
  status?: string;
  reportType?: string;
  userId?: string;
  page?: number;
  limit?: number;
}): Promise<{ sars: Sar[]; total: number; page: number; totalPages: number }> {
  const queryParams: Record<string, string> = {};
  if (params?.status) queryParams.status = params.status;
  if (params?.reportType) queryParams.reportType = params.reportType;
  if (params?.userId) queryParams.userId = params.userId;
  if (params?.page) queryParams.page = String(params.page);
  if (params?.limit) queryParams.limit = String(params.limit);

  return api.get('/aml/sars', { params: queryParams });
}

export async function getPendingSars(): Promise<Sar[]> {
  return api.get<Sar[]>('/aml/sars/pending');
}

export async function getSarStats(): Promise<SarStats> {
  return api.get<SarStats>('/aml/sars/stats');
}

export async function getSar(id: string): Promise<Sar> {
  return api.get<Sar>(`/aml/sars/${id}`);
}

export async function getUserSars(userId: string): Promise<Sar[]> {
  return api.get<Sar[]>(`/aml/sars/user/${userId}`);
}

export async function createSar(data: {
  userId: string;
  narrative: string;
  activityCategories?: string[];
  totalAmount?: number;
  currency?: string;
  relatedAlerts?: string[];
}): Promise<Sar> {
  return api.post<Sar>('/aml/sars', data);
}

export async function updateSar(id: string, data: Partial<Sar>): Promise<Sar> {
  return api.put<Sar>(`/aml/sars/${id}`, data);
}

export async function submitSarForReview(id: string): Promise<Sar> {
  return api.post<Sar>(`/aml/sars/${id}/submit`);
}

export async function reviewSar(id: string, action: 'approve' | 'reject', notes?: string): Promise<Sar> {
  return api.put<Sar>(`/aml/sars/${id}/review`, { action, notes });
}

export async function fileSar(id: string): Promise<Sar> {
  return api.post<Sar>(`/aml/sars/${id}/file`);
}

export async function requestSarExtension(id: string, days: number, reason: string): Promise<Sar> {
  return api.post<Sar>(`/aml/sars/${id}/extend`, { days, reason });
}

// ==================== Monitoring Rules ====================

export async function getMonitoringRules(activeOnly = true): Promise<MonitoringRule[]> {
  return api.get<MonitoringRule[]>('/aml/rules', { params: { activeOnly: String(activeOnly) } });
}

export async function toggleRuleStatus(id: string, isActive: boolean): Promise<MonitoringRule> {
  return api.put<MonitoringRule>(`/aml/rules/${id}/toggle`, { isActive });
}

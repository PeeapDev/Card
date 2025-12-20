import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ScreeningService } from './services/screening.service';
import { AlertService } from './services/alert.service';
import { TransactionMonitoringService } from './services/transaction-monitoring.service';
import { RiskScoringService } from './services/risk-scoring.service';
import { SarService } from './services/sar.service';
import {
  ScreenUserDto,
  ResolveScreeningDto,
  CreateAlertDto,
  UpdateAlertDto,
  ResolveAlertDto,
  AlertQueryDto,
  UpdateRiskProfileDto,
  CreateSarDto,
  UpdateSarDto,
  SarQueryDto,
  CreateMonitoringRuleDto,
  UpdateMonitoringRuleDto,
  AmlDashboardStatsDto,
} from './dto/aml.dto';
import { ScreeningType, AlertStatus, AlertSeverity, AlertType } from '@payment-system/database';

@Controller('aml')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AmlController {
  constructor(
    private screeningService: ScreeningService,
    private alertService: AlertService,
    private transactionMonitoringService: TransactionMonitoringService,
    private riskScoringService: RiskScoringService,
    private sarService: SarService,
  ) {}

  // ==================== DASHBOARD ====================

  /**
   * Get AML dashboard statistics
   */
  @Get('dashboard')
  @Roles('admin', 'superadmin', 'compliance')
  async getDashboardStats(): Promise<AmlDashboardStatsDto> {
    const [alertStats, riskStats, sarStats, pendingScreenings, todayAlerts] = await Promise.all([
      this.alertService.getAlertStats(),
      this.riskScoringService.getRiskStats(),
      this.sarService.getSarStats(),
      this.screeningService.getPendingScreenings(1, 1),
      this.alertService.getTodayAlertCount(),
    ]);

    return {
      pendingScreenings: pendingScreenings.total,
      openAlerts: alertStats.open + alertStats.investigating,
      criticalAlerts: alertStats.bySeverity.critical,
      highRiskUsers: riskStats.highRiskCount,
      pendingSars: sarStats.pendingCount,
      alertsTodayCount: todayAlerts.created,
      alertsResolvedToday: todayAlerts.resolved,
      eddPendingCount: riskStats.eddRequired,
    };
  }

  // ==================== SCREENING ====================

  /**
   * Screen a user against watchlists
   */
  @Post('screening')
  @Roles('admin', 'superadmin', 'compliance')
  async screenUser(
    @Body() dto: ScreenUserDto,
    @CurrentUser() user: any,
  ) {
    return this.screeningService.screenUser(
      dto.userId,
      (dto.screeningType as ScreeningType) || ScreeningType.MANUAL,
      dto.triggeredBy || 'admin',
      user.id,
    );
  }

  /**
   * Get pending screenings
   */
  @Get('screening/pending')
  @Roles('admin', 'superadmin', 'compliance')
  async getPendingScreenings(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.screeningService.getPendingScreenings(+page, +limit);
  }

  /**
   * Get screening result by ID
   */
  @Get('screening/:id')
  @Roles('admin', 'superadmin', 'compliance')
  async getScreeningResult(@Param('id') id: string) {
    return this.screeningService.getScreeningResult(id);
  }

  /**
   * Get user's screening history
   */
  @Get('screening/user/:userId')
  @Roles('admin', 'superadmin', 'compliance')
  async getUserScreeningHistory(@Param('userId') userId: string) {
    return this.screeningService.getUserScreeningHistory(userId);
  }

  /**
   * Resolve a screening result
   */
  @Put('screening/:id/resolve')
  @Roles('admin', 'superadmin', 'compliance')
  async resolveScreening(
    @Param('id') id: string,
    @Body() dto: ResolveScreeningDto,
    @CurrentUser() user: any,
  ) {
    return this.screeningService.resolveScreening(
      id,
      dto.status as any,
      user.id,
      dto.resolutionNotes,
    );
  }

  /**
   * Get watchlists
   */
  @Get('watchlists')
  @Roles('admin', 'superadmin', 'compliance')
  async getWatchlists() {
    return this.screeningService.getWatchlists();
  }

  /**
   * Get watchlist statistics
   */
  @Get('watchlists/stats')
  @Roles('admin', 'superadmin', 'compliance')
  async getWatchlistStats() {
    return this.screeningService.getWatchlistStats();
  }

  // ==================== ALERTS ====================

  /**
   * Get alerts with filtering
   */
  @Get('alerts')
  @Roles('admin', 'superadmin', 'compliance')
  async getAlerts(@Query() query: AlertQueryDto) {
    return this.alertService.getAlerts(query);
  }

  /**
   * Get open alerts
   */
  @Get('alerts/open')
  @Roles('admin', 'superadmin', 'compliance')
  async getOpenAlerts(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.alertService.getOpenAlerts(+page, +limit);
  }

  /**
   * Get critical alerts
   */
  @Get('alerts/critical')
  @Roles('admin', 'superadmin', 'compliance')
  async getCriticalAlerts() {
    return this.alertService.getCriticalAlerts();
  }

  /**
   * Get overdue alerts
   */
  @Get('alerts/overdue')
  @Roles('admin', 'superadmin', 'compliance')
  async getOverdueAlerts() {
    return this.alertService.getOverdueAlerts();
  }

  /**
   * Get alert statistics
   */
  @Get('alerts/stats')
  @Roles('admin', 'superadmin', 'compliance')
  async getAlertStats() {
    return this.alertService.getAlertStats();
  }

  /**
   * Get alert by ID
   */
  @Get('alerts/:id')
  @Roles('admin', 'superadmin', 'compliance')
  async getAlert(@Param('id') id: string) {
    return this.alertService.getAlert(id);
  }

  /**
   * Get alerts for a user
   */
  @Get('alerts/user/:userId')
  @Roles('admin', 'superadmin', 'compliance')
  async getUserAlerts(@Param('userId') userId: string) {
    return this.alertService.getUserAlerts(userId);
  }

  /**
   * Create an alert manually
   */
  @Post('alerts')
  @Roles('admin', 'superadmin', 'compliance')
  async createAlert(@Body() dto: CreateAlertDto) {
    return this.alertService.createAlert(dto);
  }

  /**
   * Update alert (assign, add notes, etc.)
   */
  @Put('alerts/:id')
  @Roles('admin', 'superadmin', 'compliance')
  async updateAlert(
    @Param('id') id: string,
    @Body() dto: UpdateAlertDto,
    @CurrentUser() user: any,
  ) {
    return this.alertService.updateAlert(id, dto, user.id);
  }

  /**
   * Resolve an alert
   */
  @Put('alerts/:id/resolve')
  @Roles('admin', 'superadmin', 'compliance')
  async resolveAlert(
    @Param('id') id: string,
    @Body() dto: ResolveAlertDto,
    @CurrentUser() user: any,
  ) {
    return this.alertService.resolveAlert(id, dto, user.id);
  }

  /**
   * Dismiss an alert
   */
  @Put('alerts/:id/dismiss')
  @Roles('admin', 'superadmin', 'compliance')
  async dismissAlert(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.alertService.dismissAlert(id, reason, user.id);
  }

  // ==================== RISK PROFILES ====================

  /**
   * Get risk profile for a user
   */
  @Get('risk/:userId')
  @Roles('admin', 'superadmin', 'compliance')
  async getRiskProfile(@Param('userId') userId: string) {
    return this.riskScoringService.getOrCreateRiskProfile(userId);
  }

  /**
   * Update risk profile
   */
  @Put('risk/:userId')
  @Roles('admin', 'superadmin', 'compliance')
  async updateRiskProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateRiskProfileDto,
  ) {
    return this.riskScoringService.updateRiskProfile(userId, dto);
  }

  /**
   * Complete EDD for a user
   */
  @Post('risk/:userId/edd/complete')
  @Roles('admin', 'superadmin', 'compliance')
  async completeEdd(@Param('userId') userId: string) {
    return this.riskScoringService.completeEdd(userId);
  }

  /**
   * Complete risk review for a user
   */
  @Post('risk/:userId/review/complete')
  @Roles('admin', 'superadmin', 'compliance')
  async completeReview(@Param('userId') userId: string) {
    return this.riskScoringService.completeReview(userId);
  }

  /**
   * Get high-risk users
   */
  @Get('risk-profiles/high-risk')
  @Roles('admin', 'superadmin', 'compliance')
  async getHighRiskUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.riskScoringService.getHighRiskUsers(+page, +limit);
  }

  /**
   * Get users requiring EDD
   */
  @Get('risk-profiles/edd-required')
  @Roles('admin', 'superadmin', 'compliance')
  async getEddRequiredUsers() {
    return this.riskScoringService.getEddRequiredUsers();
  }

  /**
   * Get users due for review
   */
  @Get('risk-profiles/due-review')
  @Roles('admin', 'superadmin', 'compliance')
  async getUsersDueForReview() {
    return this.riskScoringService.getUsersDueForReview();
  }

  /**
   * Get PEP users
   */
  @Get('risk-profiles/pep')
  @Roles('admin', 'superadmin', 'compliance')
  async getPepUsers() {
    return this.riskScoringService.getPepUsers();
  }

  /**
   * Get restricted users
   */
  @Get('risk-profiles/restricted')
  @Roles('admin', 'superadmin', 'compliance')
  async getRestrictedUsers() {
    return this.riskScoringService.getRestrictedUsers();
  }

  /**
   * Get risk statistics
   */
  @Get('risk-profiles/stats')
  @Roles('admin', 'superadmin', 'compliance')
  async getRiskStats() {
    return this.riskScoringService.getRiskStats();
  }

  /**
   * Get high-risk countries
   */
  @Get('countries/high-risk')
  @Roles('admin', 'superadmin', 'compliance')
  async getHighRiskCountries() {
    return this.riskScoringService.getHighRiskCountries();
  }

  // ==================== SARS ====================

  /**
   * Get SARs with filtering
   */
  @Get('sars')
  @Roles('admin', 'superadmin', 'compliance')
  async getSars(@Query() query: SarQueryDto) {
    return this.sarService.getSars(query);
  }

  /**
   * Get pending SARs
   */
  @Get('sars/pending')
  @Roles('admin', 'superadmin', 'compliance')
  async getPendingSars() {
    return this.sarService.getPendingSars();
  }

  /**
   * Get SAR statistics
   */
  @Get('sars/stats')
  @Roles('admin', 'superadmin', 'compliance')
  async getSarStats() {
    return this.sarService.getSarStats();
  }

  /**
   * Get SAR by ID
   */
  @Get('sars/:id')
  @Roles('admin', 'superadmin', 'compliance')
  async getSar(@Param('id') id: string) {
    return this.sarService.getSar(id);
  }

  /**
   * Get SARs for a user
   */
  @Get('sars/user/:userId')
  @Roles('admin', 'superadmin', 'compliance')
  async getUserSars(@Param('userId') userId: string) {
    return this.sarService.getUserSars(userId);
  }

  /**
   * Create a new SAR
   */
  @Post('sars')
  @Roles('admin', 'superadmin', 'compliance')
  async createSar(
    @Body() dto: CreateSarDto,
    @CurrentUser() user: any,
  ) {
    return this.sarService.createSar(dto, user.id);
  }

  /**
   * Update SAR
   */
  @Put('sars/:id')
  @Roles('admin', 'superadmin', 'compliance')
  async updateSar(
    @Param('id') id: string,
    @Body() dto: UpdateSarDto,
  ) {
    return this.sarService.updateSar(id, dto);
  }

  /**
   * Submit SAR for review
   */
  @Post('sars/:id/submit')
  @Roles('admin', 'superadmin', 'compliance')
  async submitSarForReview(@Param('id') id: string) {
    return this.sarService.submitForReview(id);
  }

  /**
   * Review SAR (approve/reject)
   */
  @Put('sars/:id/review')
  @Roles('admin', 'superadmin', 'compliance')
  async reviewSar(
    @Param('id') id: string,
    @Body('action') action: 'approve' | 'reject',
    @Body('notes') notes: string,
    @CurrentUser() user: any,
  ) {
    return this.sarService.reviewSar(id, action, user.id, notes);
  }

  /**
   * File SAR with regulator
   */
  @Post('sars/:id/file')
  @Roles('admin', 'superadmin', 'compliance')
  async fileSar(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.sarService.fileSar(id, user.id);
  }

  /**
   * Request SAR deadline extension
   */
  @Post('sars/:id/extend')
  @Roles('admin', 'superadmin', 'compliance')
  async requestSarExtension(
    @Param('id') id: string,
    @Body('days') days: number,
    @Body('reason') reason: string,
  ) {
    return this.sarService.requestExtension(id, days, reason);
  }

  // ==================== MONITORING RULES ====================

  /**
   * Get monitoring rules
   */
  @Get('rules')
  @Roles('admin', 'superadmin', 'compliance')
  async getMonitoringRules(@Query('activeOnly') activeOnly = 'true') {
    return this.transactionMonitoringService.getMonitoringRules(activeOnly === 'true');
  }

  /**
   * Toggle rule status
   */
  @Put('rules/:id/toggle')
  @Roles('admin', 'superadmin', 'compliance')
  async toggleRuleStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.transactionMonitoringService.toggleRuleStatus(id, isActive);
  }
}

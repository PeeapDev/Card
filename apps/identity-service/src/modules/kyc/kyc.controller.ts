import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { SLVerificationService } from './sl-verification.service';
import { MonimeKycService } from './monime-kyc.service';
import { SubmitKycDto, ReviewKycDto } from './dto/kyc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuthenticatedUser {
  userId: string;
  sessionId: string;
  email: string;
  roles: string[];
}

class SierraLeoneVerificationDto {
  idCardFrontBase64: string;
  idCardBackBase64?: string;
  mimeType?: string;
  phoneNumber: string;
}

class ProviderKycDto {
  phoneNumber: string;
  provider?: string;
}

class MatchNamesDto {
  idFirstName: string;
  idLastName: string;
  simRegisteredName: string;
}

class InitiatePhoneOtpDto {
  phoneNumber: string;
}

class VerifyPhoneOtpDto {
  phoneNumber: string;
  otp: string;
  requestId: string;
}

@ApiTags('KYC')
@Controller('kyc')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KycController {
  constructor(
    private readonly kycService: KycService,
    private readonly slVerificationService: SLVerificationService,
    private readonly monimeKycService: MonimeKycService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current user KYC status' })
  @ApiResponse({ status: 200, description: 'KYC status' })
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.kycService.getKycStatus(user.userId);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit KYC application' })
  @ApiResponse({ status: 201, description: 'KYC application submitted' })
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitKycDto,
  ) {
    const application = await this.kycService.submitKyc(user.userId, dto);
    return {
      applicationId: application.id,
      status: application.status,
      submittedAt: application.submittedAt,
    };
  }

  @Post('resubmit')
  @ApiOperation({ summary: 'Resubmit KYC after rejection' })
  @ApiResponse({ status: 201, description: 'KYC application resubmitted' })
  async resubmit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitKycDto,
  ) {
    const application = await this.kycService.resubmitKyc(user.userId, dto);
    return {
      applicationId: application.id,
      status: application.status,
      submittedAt: application.submittedAt,
    };
  }

  @Delete('cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel pending KYC application' })
  @ApiResponse({ status: 204, description: 'Application cancelled' })
  async cancel(@CurrentUser() user: AuthenticatedUser) {
    await this.kycService.cancelApplication(user.userId);
  }

  // Sierra Leone Verification Endpoints
  @Get('verification/status')
  @ApiOperation({ summary: 'Get Sierra Leone verification status' })
  @ApiResponse({ status: 200, description: 'Verification status' })
  async getVerificationStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.slVerificationService.getVerificationStatus(user.userId);
  }

  @Get('verification/required')
  @ApiOperation({ summary: 'Check if verification is required' })
  @ApiResponse({ status: 200, description: 'Verification requirement status' })
  async checkVerificationRequired(@CurrentUser() user: AuthenticatedUser) {
    return this.slVerificationService.checkVerificationRequired(user.userId);
  }

  @Post('verification/sierra-leone')
  @ApiOperation({ summary: 'Submit Sierra Leone ID verification' })
  @ApiResponse({ status: 201, description: 'Verification result' })
  @ApiBody({ type: SierraLeoneVerificationDto })
  async verifySierraLeoneId(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SierraLeoneVerificationDto,
  ) {
    return this.slVerificationService.verifySierraLeoneId({
      userId: user.userId,
      idCardFrontBase64: dto.idCardFrontBase64,
      idCardBackBase64: dto.idCardBackBase64,
      mimeType: dto.mimeType,
      phoneNumber: dto.phoneNumber,
    });
  }

  @Post('verification/provider-kyc')
  @ApiOperation({ summary: 'Get SIM registered name from Monime' })
  @ApiResponse({ status: 200, description: 'Provider KYC result' })
  @ApiBody({ type: ProviderKycDto })
  async getProviderKyc(@Body() dto: ProviderKycDto) {
    return this.monimeKycService.getProviderKyc(dto.phoneNumber, dto.provider);
  }

  @Post('verification/match-names')
  @ApiOperation({ summary: 'Check if names match' })
  @ApiResponse({ status: 200, description: 'Name match result' })
  @ApiBody({ type: MatchNamesDto })
  async matchNames(@Body() dto: MatchNamesDto) {
    return this.monimeKycService.matchNames(dto.idFirstName, dto.idLastName, dto.simRegisteredName);
  }

  @Post('verification/phone/initiate')
  @ApiOperation({ summary: 'Initiate phone OTP verification' })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  @ApiBody({ type: InitiatePhoneOtpDto })
  async initiatePhoneOtp(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InitiatePhoneOtpDto,
  ) {
    return this.slVerificationService.initiatePhoneVerification(user.userId, dto.phoneNumber);
  }

  @Post('verification/phone/verify')
  @ApiOperation({ summary: 'Verify phone with OTP' })
  @ApiResponse({ status: 200, description: 'OTP verification result' })
  @ApiBody({ type: VerifyPhoneOtpDto })
  async verifyPhoneOtp(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyPhoneOtpDto,
  ) {
    return this.slVerificationService.completePhoneVerification(
      user.userId,
      dto.phoneNumber,
      dto.otp,
      dto.requestId,
    );
  }

  // Admin endpoints
  @Get('admin/pending')
  @UseGuards(RolesGuard)
  @Roles('admin', 'compliance')
  @ApiOperation({ summary: 'Get pending KYC applications (admin)' })
  @ApiResponse({ status: 200, description: 'List of pending applications' })
  async getPendingApplications() {
    return this.kycService.getPendingApplications();
  }

  @Get('admin/:applicationId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'compliance')
  @ApiOperation({ summary: 'Get KYC application details (admin)' })
  @ApiResponse({ status: 200, description: 'Application details' })
  async getApplication(@Param('applicationId') applicationId: string) {
    return this.kycService.getApplication(applicationId);
  }

  @Put('admin/:applicationId/review')
  @UseGuards(RolesGuard)
  @Roles('admin', 'compliance')
  @ApiOperation({ summary: 'Review KYC application (admin)' })
  @ApiResponse({ status: 200, description: 'Application reviewed' })
  async reviewApplication(
    @Param('applicationId') applicationId: string,
    @Body() dto: ReviewKycDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kycService.reviewApplication(applicationId, dto, user.userId);
  }

  @Get('admin/:applicationId/verification')
  @UseGuards(RolesGuard)
  @Roles('admin', 'compliance')
  @ApiOperation({ summary: 'Get OCR verification result for application (admin)' })
  @ApiResponse({ status: 200, description: 'OCR verification result' })
  async getVerificationResult(@Param('applicationId') applicationId: string) {
    const result = await this.kycService.getVerificationResult(applicationId);
    if (!result) {
      return { message: 'No OCR verification result available yet' };
    }
    return result;
  }

  @Post('admin/:applicationId/reprocess-ocr')
  @UseGuards(RolesGuard)
  @Roles('admin', 'compliance')
  @ApiOperation({ summary: 'Manually trigger OCR reprocessing (admin)' })
  @ApiResponse({ status: 200, description: 'OCR reprocessing result' })
  async reprocessOcr(@Param('applicationId') applicationId: string) {
    return this.kycService.reprocessOcr(applicationId);
  }
}

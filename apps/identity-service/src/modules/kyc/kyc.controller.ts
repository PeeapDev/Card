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
} from '@nestjs/swagger';
import { KycService } from './kyc.service';
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

@ApiTags('KYC')
@Controller('kyc')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KycController {
  constructor(private readonly kycService: KycService) {}

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

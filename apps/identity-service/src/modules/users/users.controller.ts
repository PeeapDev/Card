import {
  Controller,
  Get,
  Put,
  Post,
  Body,
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
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthenticatedUser {
  userId: string;
  sessionId: string;
  email: string;
  roles: string[];
}

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.usersService.getProfile(user.userId);
    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      dateOfBirth: profile.dateOfBirth,
      address: profile.address,
      emailVerified: profile.emailVerified,
      phoneVerified: profile.phoneVerified,
      kycStatus: profile.kycStatus,
      mfaEnabled: profile.mfaEnabled,
      createdAt: profile.createdAt,
    };
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Post('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 204, description: 'Password changed' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(user.userId, dto);
  }

  @Post('me/verify-email')
  @ApiOperation({ summary: 'Request email verification' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async requestEmailVerification(@CurrentUser() user: AuthenticatedUser) {
    await this.usersService.requestEmailVerification(user.userId);
    return { message: 'Verification email sent' };
  }

  @Post('me/verify-email/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirm email verification' })
  @ApiResponse({ status: 204, description: 'Email verified' })
  async verifyEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body('code') code: string,
  ) {
    await this.usersService.verifyEmail(user.userId, code);
  }

  @Post('me/verify-phone')
  @ApiOperation({ summary: 'Request phone verification' })
  @ApiResponse({ status: 200, description: 'Verification SMS sent' })
  async requestPhoneVerification(@CurrentUser() user: AuthenticatedUser) {
    await this.usersService.requestPhoneVerification(user.userId);
    return { message: 'Verification SMS sent' };
  }

  @Post('me/verify-phone/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirm phone verification' })
  @ApiResponse({ status: 204, description: 'Phone verified' })
  async verifyPhone(
    @CurrentUser() user: AuthenticatedUser,
    @Body('code') code: string,
  ) {
    await this.usersService.verifyPhone(user.userId, code);
  }

  @Post('me/mfa/enable')
  @ApiOperation({ summary: 'Enable MFA' })
  @ApiResponse({ status: 200, description: 'MFA secret and QR code' })
  async enableMfa(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.enableMfa(user.userId);
  }

  @Post('me/mfa/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirm MFA setup' })
  @ApiResponse({ status: 204, description: 'MFA enabled' })
  async confirmMfa(
    @CurrentUser() user: AuthenticatedUser,
    @Body('code') code: string,
  ) {
    await this.usersService.confirmMfa(user.userId, code);
  }

  @Post('me/mfa/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable MFA' })
  @ApiResponse({ status: 204, description: 'MFA disabled' })
  async disableMfa(
    @CurrentUser() user: AuthenticatedUser,
    @Body('password') password: string,
  ) {
    await this.usersService.disableMfa(user.userId, password);
  }
}

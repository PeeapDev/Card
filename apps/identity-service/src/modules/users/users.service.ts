import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '@payment-system/database';
import { hashPassword, verifyPassword } from '@payment-system/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.getProfile(userId);

    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.phone) user.phone = dto.phone;
    if (dto.dateOfBirth) user.dateOfBirth = dto.dateOfBirth;
    if (dto.address) user.address = dto.address;

    await this.userRepository.save(user);
    this.logger.log(`Profile updated for user: ${userId}`);

    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.getProfile(userId);

    const isCurrentPasswordValid = await verifyPassword(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    user.passwordHash = await hashPassword(dto.newPassword);
    user.passwordChangedAt = new Date();
    await this.userRepository.save(user);

    this.logger.log(`Password changed for user: ${userId}`);
  }

  async requestEmailVerification(userId: string): Promise<string> {
    const user = await this.getProfile(userId);

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate verification token (6-digit code)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store verification token with expiry
    user.verificationToken = verificationCode;
    user.verificationTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await this.userRepository.save(user);

    // TODO: Send verification email via notification service
    this.logger.log(`Email verification requested for user: ${userId}`);

    return verificationCode; // In production, don't return this
  }

  async verifyEmail(userId: string, code: string): Promise<void> {
    const user = await this.getProfile(userId);

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (
      !user.verificationToken ||
      user.verificationToken !== code ||
      !user.verificationTokenExpiresAt ||
      user.verificationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.verificationToken = null as any;
    user.verificationTokenExpiresAt = null as any;
    await this.userRepository.save(user);

    this.logger.log(`Email verified for user: ${userId}`);
  }

  async requestPhoneVerification(userId: string): Promise<string> {
    const user = await this.getProfile(userId);

    if (!user.phone) {
      throw new BadRequestException('No phone number on file');
    }

    if (user.phoneVerified) {
      throw new BadRequestException('Phone already verified');
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    user.phoneVerificationCode = verificationCode;
    user.phoneVerificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await this.userRepository.save(user);

    // TODO: Send SMS via notification service
    this.logger.log(`Phone verification requested for user: ${userId}`);

    return verificationCode; // In production, don't return this
  }

  async verifyPhone(userId: string, code: string): Promise<void> {
    const user = await this.getProfile(userId);

    if (user.phoneVerified) {
      throw new BadRequestException('Phone already verified');
    }

    if (
      !user.phoneVerificationCode ||
      user.phoneVerificationCode !== code ||
      !user.phoneVerificationExpiresAt ||
      user.phoneVerificationExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    user.phoneVerified = true;
    user.phoneVerifiedAt = new Date();
    user.phoneVerificationCode = null as any;
    user.phoneVerificationExpiresAt = null as any;
    await this.userRepository.save(user);

    this.logger.log(`Phone verified for user: ${userId}`);
  }

  async enableMfa(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await this.getProfile(userId);

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    // Generate TOTP secret
    // TODO: Implement proper TOTP secret generation
    const secret = 'PLACEHOLDER_SECRET';
    const qrCodeUrl = `otpauth://totp/PaymentSystem:${user.email}?secret=${secret}&issuer=PaymentSystem`;

    user.mfaSecret = secret;
    await this.userRepository.save(user);

    return { secret, qrCodeUrl };
  }

  async confirmMfa(userId: string, code: string): Promise<void> {
    const user = await this.getProfile(userId);

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    if (!user.mfaSecret) {
      throw new BadRequestException('MFA setup not initiated');
    }

    // TODO: Verify TOTP code
    const isValid = true; // Placeholder

    if (!isValid) {
      throw new BadRequestException('Invalid MFA code');
    }

    user.mfaEnabled = true;
    await this.userRepository.save(user);

    this.logger.log(`MFA enabled for user: ${userId}`);
  }

  async disableMfa(userId: string, password: string): Promise<void> {
    const user = await this.getProfile(userId);

    if (!user.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid password');
    }

    user.mfaEnabled = false;
    user.mfaSecret = null as any;
    await this.userRepository.save(user);

    this.logger.log(`MFA disabled for user: ${userId}`);
  }

  async suspendUser(userId: string, reason: string, suspendedBy: string): Promise<void> {
    const user = await this.getProfile(userId);

    user.status = UserStatus.SUSPENDED;
    user.suspendedAt = new Date();
    user.suspendedReason = reason;
    await this.userRepository.save(user);

    this.logger.warn(`User suspended: ${userId} by ${suspendedBy}. Reason: ${reason}`);
  }

  async reactivateUser(userId: string, reactivatedBy: string): Promise<void> {
    const user = await this.getProfile(userId);

    user.status = UserStatus.ACTIVE;
    user.suspendedAt = null as any;
    user.suspendedReason = null as any;
    await this.userRepository.save(user);

    this.logger.log(`User reactivated: ${userId} by ${reactivatedBy}`);
  }
}

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserStatus, KycStatus } from '@payment-system/database';
import { hashPassword, verifyPassword } from '@payment-system/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, RefreshTokenDto } from './dto/login.dto';
import { AuthResponseDto, AuthTokensDto, UserResponseDto } from './dto/auth-response.dto';
import { SessionsService } from '../sessions/sessions.service';

interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  sessionId: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sessionsService: SessionsService,
  ) {}

  async register(dto: RegisterDto, ipAddress: string, userAgent: string): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(dto.password);

    // Create user
    const user = this.userRepository.create({
      externalId: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      status: UserStatus.ACTIVE,
      kycStatus: KycStatus.NOT_STARTED,
      roles: ['user'],
      emailVerified: false,
      phoneVerified: false,
      mfaEnabled: false,
    });

    await this.userRepository.save(user);

    this.logger.log(`New user registered: ${user.id}`);

    // Create session and tokens
    const session = await this.sessionsService.createSession(
      user.id,
      ipAddress,
      userAgent,
    );

    const tokens = await this.generateTokens(user, session.id);

    return {
      user: this.mapUserToResponse(user),
      tokens,
    };
  }

  async login(dto: LoginDto, ipAddress: string, userAgent: string): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.recordFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is locked
    if (user.status === UserStatus.LOCKED) {
      throw new UnauthorizedException('Account is locked. Please contact support.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }

    // Check MFA if enabled
    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        // Return MFA required response
        const mfaToken = await this.generateMfaToken(user.id);
        return {
          user: null as any,
          tokens: {
            accessToken: '',
            refreshToken: '',
            expiresIn: 0,
            tokenType: 'mfa_required',
          },
        };
      }

      const isMfaValid = await this.verifyMfaCode(user, dto.mfaCode);
      if (!isMfaValid) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // Reset failed login attempts
    if (user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0;
      await this.userRepository.save(user);
    }

    // Create session
    const session = await this.sessionsService.createSession(
      user.id,
      ipAddress,
      userAgent,
      dto.deviceId,
    );

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const tokens = await this.generateTokens(user, session.id);

    this.logger.log(`User logged in: ${user.id}`);

    return {
      user: this.mapUserToResponse(user),
      tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthTokensDto> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify session is still valid
      const isSessionValid = await this.sessionsService.isSessionValid(payload.sessionId);
      if (!isSessionValid) {
        throw new UnauthorizedException('Session expired');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Refresh the session
      await this.sessionsService.refreshSession(payload.sessionId);

      return this.generateTokens(user, payload.sessionId);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, sessionId: string, logoutAll: boolean = false): Promise<void> {
    if (logoutAll) {
      await this.sessionsService.terminateAllSessions(userId);
    } else {
      await this.sessionsService.terminateSession(sessionId);
    }

    this.logger.log(`User logged out: ${userId}, logoutAll: ${logoutAll}`);
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId, status: UserStatus.ACTIVE },
    });
  }

  private async generateTokens(user: User, sessionId: string): Promise<AuthTokensDto> {
    const payload: Omit<JwtPayload, 'type'> = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      sessionId,
    };

    const accessTokenExpiresIn = this.configService.get('JWT_EXPIRES_IN', '15m');
    const refreshTokenExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, type: 'access' },
        { expiresIn: accessTokenExpiresIn },
      ),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh' },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET', 'default-refresh-secret-change-in-production'),
          expiresIn: refreshTokenExpiresIn,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresIn(accessTokenExpiresIn),
      tokenType: 'Bearer',
    };
  }

  private async recordFailedLogin(user: User): Promise<void> {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    const maxAttempts = this.configService.get('MAX_LOGIN_ATTEMPTS', 5);
    if (user.failedLoginAttempts >= maxAttempts) {
      user.status = UserStatus.LOCKED;
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      this.logger.warn(`User account locked: ${user.id}`);
    }

    await this.userRepository.save(user);
  }

  private async generateMfaToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, type: 'mfa' },
      { expiresIn: '5m' },
    );
  }

  private async verifyMfaCode(user: User, code: string): Promise<boolean> {
    // TODO: Implement TOTP verification using user's MFA secret
    // For now, return false as placeholder
    return false;
  }

  private mapUserToResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      kycStatus: user.kycStatus,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }
}

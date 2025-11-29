import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthenticatedUser {
  userId: string;
  sessionId: string;
  email: string;
  roles: string[];
}

@ApiTags('Sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  @ApiResponse({ status: 200, description: 'List of active sessions' })
  async getUserSessions(@CurrentUser() user: AuthenticatedUser) {
    const sessions = await this.sessionsService.getUserSessions(user.userId);
    return sessions.map(session => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      deviceId: session.deviceId,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      isCurrent: session.id === user.sessionId,
    }));
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Terminate a specific session' })
  @ApiResponse({ status: 204, description: 'Session terminated' })
  @ApiResponse({ status: 403, description: 'Cannot terminate session of another user' })
  async terminateSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    const session = await this.sessionsService.getSessionById(sessionId);

    if (!session || session.userId !== user.userId) {
      throw new ForbiddenException('Cannot terminate this session');
    }

    await this.sessionsService.terminateSession(sessionId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Terminate all other sessions' })
  @ApiResponse({ status: 204, description: 'All other sessions terminated' })
  async terminateOtherSessions(@CurrentUser() user: AuthenticatedUser) {
    await this.sessionsService.terminateAllSessions(user.userId, user.sessionId);
  }
}

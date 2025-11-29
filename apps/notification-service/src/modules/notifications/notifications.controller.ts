import { Controller, Get, Post, Body, Param, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationChannel } from '@payment-system/database';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send notification' })
  async send(@Body() dto: any) {
    return this.notificationsService.send(dto);
  }

  @Get('history/:userId')
  @ApiOperation({ summary: 'Get notification history' })
  async getHistory(@Param('userId') userId: string) {
    return this.notificationsService.getNotificationHistory(userId);
  }

  @Get('health/live')
  liveness() {
    return { status: 'ok' };
  }
}

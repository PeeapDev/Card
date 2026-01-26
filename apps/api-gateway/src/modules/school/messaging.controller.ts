import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { SchoolService } from './school.service';
import { MessagingService } from './messaging.service';

@ApiTags('School Messaging')
@Controller('messages')
export class MessagingController {
  constructor(
    private readonly schoolService: SchoolService,
    private readonly messagingService: MessagingService,
  ) {}

  private extractToken(authHeader: string): string {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header',
        },
      });
    }
    return authHeader.substring(7);
  }

  private async validateToken(authHeader: string): Promise<{ userId: string; clientId: string }> {
    const token = this.extractToken(authHeader);
    const result = await this.schoolService.validateAccessToken(token);

    if (!result.valid) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Access token is invalid or expired',
        },
      });
    }

    return { userId: result.userId!, clientId: result.clientId! };
  }

  /**
   * Send a message to a user
   */
  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message to a user' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessage(
    @Body() body: {
      school_id: string;
      recipient_user_id: string;
      type: 'receipt' | 'fee_notice' | 'salary_slip' | 'message' | 'reminder';
      content: string;
      metadata?: Record<string, any>;
    },
    @Headers('authorization') authHeader: string,
  ) {
    await this.validateToken(authHeader);

    const message = await this.messagingService.sendMessage({
      schoolId: body.school_id,
      recipientUserId: body.recipient_user_id,
      type: body.type,
      content: body.content,
      metadata: body.metadata,
    });

    return {
      success: true,
      data: message,
    };
  }

  /**
   * Send a payment receipt
   */
  @Post('receipt')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a payment receipt' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Receipt sent' })
  async sendReceipt(
    @Body() body: {
      school_id: string;
      recipient_user_id: string;
      transaction_id: string;
      receipt_number: string;
      amount: number;
      currency: string;
      description: string;
      student_name?: string;
      fee_name?: string;
      paid_at: string;
    },
    @Headers('authorization') authHeader: string,
  ) {
    await this.validateToken(authHeader);

    const message = await this.messagingService.sendReceipt({
      schoolId: body.school_id,
      recipientUserId: body.recipient_user_id,
      transactionId: body.transaction_id,
      receiptNumber: body.receipt_number,
      amount: body.amount,
      currency: body.currency,
      description: body.description,
      studentName: body.student_name,
      feeName: body.fee_name,
      paidAt: body.paid_at,
    });

    return {
      success: true,
      data: message,
    };
  }

  /**
   * Send a fee notice
   */
  @Post('fee-notice')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a fee notice' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Fee notice sent' })
  async sendFeeNotice(
    @Body() body: {
      school_id: string;
      recipient_user_id: string;
      student_name: string;
      fee_name: string;
      amount: number;
      currency: string;
      due_date: string;
      invoice_id?: string;
    },
    @Headers('authorization') authHeader: string,
  ) {
    await this.validateToken(authHeader);

    const message = await this.messagingService.sendFeeNotice({
      schoolId: body.school_id,
      recipientUserId: body.recipient_user_id,
      studentName: body.student_name,
      feeName: body.fee_name,
      amount: body.amount,
      currency: body.currency,
      dueDate: body.due_date,
      invoiceId: body.invoice_id,
    });

    return {
      success: true,
      data: message,
    };
  }

  /**
   * Send a salary slip
   */
  @Post('salary-slip')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a salary slip' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Salary slip sent' })
  async sendSalarySlip(
    @Body() body: {
      school_id: string;
      recipient_user_id: string;
      staff_name: string;
      month: string;
      year: number;
      gross_amount: number;
      deductions: number;
      net_amount: number;
      currency: string;
      breakdown?: Record<string, number>;
    },
    @Headers('authorization') authHeader: string,
  ) {
    await this.validateToken(authHeader);

    const message = await this.messagingService.sendSalarySlip({
      schoolId: body.school_id,
      recipientUserId: body.recipient_user_id,
      staffName: body.staff_name,
      month: body.month,
      year: body.year,
      grossAmount: body.gross_amount,
      deductions: body.deductions,
      netAmount: body.net_amount,
      currency: body.currency,
      breakdown: body.breakdown,
    });

    return {
      success: true,
      data: message,
    };
  }

  /**
   * Send a payment reminder
   */
  @Post('reminder')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a payment reminder' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Reminder sent' })
  async sendReminder(
    @Body() body: {
      school_id: string;
      recipient_user_id: string;
      student_name: string;
      fee_name: string;
      outstanding_amount: number;
      currency: string;
      original_due_date: string;
      invoice_number?: string;
    },
    @Headers('authorization') authHeader: string,
  ) {
    await this.validateToken(authHeader);

    const message = await this.messagingService.sendReminder({
      schoolId: body.school_id,
      recipientUserId: body.recipient_user_id,
      studentName: body.student_name,
      feeName: body.fee_name,
      outstandingAmount: body.outstanding_amount,
      currency: body.currency,
      originalDueDate: body.original_due_date,
      invoiceNumber: body.invoice_number,
    });

    return {
      success: true,
      data: message,
    };
  }

  /**
   * Get messages for authenticated user
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get messages for authenticated user' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Messages retrieved' })
  async getMessages(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Headers('authorization') authHeader?: string,
  ) {
    const { userId } = await this.validateToken(authHeader || '');

    const messages = await this.messagingService.getMessagesForUser(
      userId,
      limit ? parseInt(String(limit), 10) : undefined,
      offset ? parseInt(String(offset), 10) : undefined,
    );

    return {
      success: true,
      data: messages,
    };
  }

  /**
   * Mark message as read
   */
  @Post(':id/read')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markAsRead(
    @Param('id') messageId: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.validateToken(authHeader);

    await this.messagingService.markAsRead(messageId);

    return {
      success: true,
      message: 'Message marked as read',
    };
  }
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly schoolService: SchoolService,
    private readonly messagingService: MessagingService,
  ) {}

  private extractToken(authHeader: string): string {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header',
        },
      });
    }
    return authHeader.substring(7);
  }

  private async validateToken(authHeader: string): Promise<{ userId: string; clientId: string }> {
    const token = this.extractToken(authHeader);
    const result = await this.schoolService.validateAccessToken(token);

    if (!result.valid) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Access token is invalid or expired',
        },
      });
    }

    return { userId: result.userId!, clientId: result.clientId! };
  }

  /**
   * Register a new webhook
   */
  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a webhook' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Webhook registered' })
  async registerWebhook(
    @Body() body: {
      school_id: string;
      url: string;
      events: string[];
    },
    @Headers('authorization') authHeader: string,
  ) {
    const { userId } = await this.validateToken(authHeader);

    const webhook = await this.messagingService.registerWebhook({
      schoolId: body.school_id,
      url: body.url,
      events: body.events,
      userId,
    });

    return {
      success: true,
      data: webhook,
    };
  }

  /**
   * List webhooks for a school
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'List webhooks for a school' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Webhooks retrieved' })
  async listWebhooks(
    @Query('school_id') schoolId: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.validateToken(authHeader);

    const webhooks = await this.messagingService.listWebhooks(schoolId);

    return {
      success: true,
      data: webhooks,
    };
  }

  /**
   * Delete a webhook
   */
  @Delete(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Webhook deleted' })
  async deleteWebhook(
    @Param('id') webhookId: string,
    @Query('school_id') schoolId: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.validateToken(authHeader);

    await this.messagingService.deleteWebhook(webhookId, schoolId);

    return {
      success: true,
      message: 'Webhook deleted',
    };
  }
}

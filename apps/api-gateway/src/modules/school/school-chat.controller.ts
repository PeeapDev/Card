import {
  Controller,
  Get,
  Post,
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
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SchoolChatService } from './school-chat.service';
import { SchoolService } from './school.service';
import { Public } from '../auth/decorators/public.decorator';

// ============================================
// DTOs
// ============================================

class CreateParentConnectionDto {
  peeap_user_id: string;
  peeap_wallet_id?: string;
  school_id: string;
  peeap_school_id?: string;
  school_name: string;
  school_logo_url?: string;
  school_domain?: string;
  school_parent_id: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  children: Array<{
    nsi: string;
    name: string;
    student_id?: string;
    class_id?: string;
    class_name?: string;
    section_name?: string;
    profile_photo_url?: string;
    peeap_wallet_id?: string;
  }>;
}

class SendMessageDto {
  content: string;
  reply_to_message_id?: string;
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
    size?: number;
  }>;
}

class SendSchoolMessageDto {
  parent_connection_id?: string;
  parent_nsi_list?: string[];
  message_type: string;
  content: string;
  rich_content?: any;
  sender_name?: string;
  sender_role?: string;
}

class SendInvoiceDto {
  student_nsi: string;
  invoice: {
    invoice_id: string;
    invoice_number?: string;
    items: Array<{ name: string; amount: number }>;
    subtotal?: number;
    total: number;
    due_date: string;
    status?: string;
  };
}

class SendAnnouncementDto {
  class_id?: string;
  school_wide?: boolean;
  title: string;
  content: string;
  event_date?: string;
  attachments?: any[];
}

// ============================================
// Parent-facing Chat Controller
// ============================================

@ApiTags('School Chat - Parent')
@Controller('api/school')
export class SchoolChatParentController {
  constructor(
    private readonly chatService: SchoolChatService,
    private readonly schoolService: SchoolService,
  ) {}

  /**
   * Extract and validate user token
   */
  private async validateUserToken(authHeader: string): Promise<string> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);
    const result = await this.schoolService.validateAccessToken(token);

    if (!result.valid || !result.userId) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return result.userId;
  }

  /**
   * Get all school connections for the logged-in parent
   */
  @Get('connections')
  @Public()
  @ApiOperation({
    summary: 'Get parent school connections',
    description: 'Returns all schools the parent is connected to via SSO',
  })
  @ApiBearerAuth()
  async getConnections(
    @Headers('authorization') authHeader: string,
  ): Promise<{ success: boolean; data: { connections: any[] } }> {
    const userId = await this.validateUserToken(authHeader);
    const connections = await this.chatService.getParentConnections(userId);

    return {
      success: true,
      data: { connections },
    };
  }

  /**
   * Get all chat threads for the logged-in parent
   */
  @Get('threads')
  @Public()
  @ApiOperation({
    summary: 'Get parent chat threads',
    description: 'Returns all chat threads from connected schools',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'List of chat threads',
  })
  async getThreads(
    @Headers('authorization') authHeader: string,
  ): Promise<{
    success: boolean;
    data: {
      threads: Array<{
        id: string;
        school_name: string;
        school_logo_url?: string;
        is_verified: boolean;
        thread_type: string;
        last_message?: string;
        last_message_at?: string;
        unread_count: number;
        children: Array<{ nsi: string; name: string }>;
      }>;
    };
  }> {
    const userId = await this.validateUserToken(authHeader);
    const { threads } = await this.chatService.getParentThreads(userId);

    // Format response
    const formattedThreads = threads.map((t) => ({
      id: t.id,
      school_name: t.school_name,
      school_logo_url: t.school_logo_url,
      is_verified: true, // All school messages are verified
      thread_type: t.thread_type,
      last_message: t.last_message_preview,
      last_message_at: t.last_message_at,
      unread_count: t.parent_unread_count,
      children: (t as any).children || [],
    }));

    return {
      success: true,
      data: { threads: formattedThreads },
    };
  }

  /**
   * Get messages in a thread
   */
  @Get('threads/:threadId/messages')
  @Public()
  @ApiOperation({
    summary: 'Get thread messages',
    description: 'Returns messages in a chat thread',
  })
  @ApiBearerAuth()
  @ApiParam({ name: 'threadId', description: 'Thread ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of messages to return' })
  @ApiQuery({ name: 'before', required: false, description: 'Get messages before this timestamp' })
  @ApiQuery({ name: 'after', required: false, description: 'Get messages after this timestamp' })
  async getMessages(
    @Param('threadId') threadId: string,
    @Headers('authorization') authHeader: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
    @Query('after') after?: string,
  ): Promise<{
    success: boolean;
    data: {
      messages: Array<{
        id: string;
        sender_type: string;
        sender_name?: string;
        sender_role?: string;
        message_type: string;
        content?: string;
        rich_content?: any;
        created_at: string;
        is_verified: boolean;
      }>;
      has_more: boolean;
    };
  }> {
    const userId = await this.validateUserToken(authHeader);

    const { messages, has_more } = await this.chatService.getThreadMessages(
      threadId,
      userId,
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        before,
        after,
      },
    );

    // Format messages
    const formattedMessages = messages.map((m) => ({
      id: m.id,
      sender_type: m.sender_type,
      sender_name: m.sender_name,
      sender_role: m.sender_role,
      message_type: m.message_type,
      content: m.content,
      rich_content: m.rich_content,
      attachments: m.attachments,
      reply_to_message_id: m.reply_to_message_id,
      created_at: m.created_at,
      is_verified: m.sender_type === 'school', // School messages are verified
    }));

    return {
      success: true,
      data: { messages: formattedMessages, has_more },
    };
  }

  /**
   * Send a message (parent reply)
   */
  @Post('threads/:threadId/messages')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send message to school',
    description: 'Parent sends a message in the chat thread',
  })
  @ApiBearerAuth()
  @ApiParam({ name: 'threadId', description: 'Thread ID' })
  async sendMessage(
    @Param('threadId') threadId: string,
    @Body() body: SendMessageDto,
    @Headers('authorization') authHeader: string,
  ): Promise<{
    success: boolean;
    data: {
      message_id: string;
      sent_at: string;
    };
  }> {
    const userId = await this.validateUserToken(authHeader);

    const message = await this.chatService.sendParentMessage(threadId, userId, {
      content: body.content,
      replyToMessageId: body.reply_to_message_id,
      attachments: body.attachments,
    });

    return {
      success: true,
      data: {
        message_id: message.id,
        sent_at: message.created_at,
      },
    };
  }

  /**
   * Mark messages as read
   */
  @Post('threads/:threadId/read')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark messages as read',
    description: 'Marks all messages in the thread as read',
  })
  @ApiBearerAuth()
  @ApiParam({ name: 'threadId', description: 'Thread ID' })
  async markAsRead(
    @Param('threadId') threadId: string,
    @Headers('authorization') authHeader: string,
  ): Promise<{ success: boolean }> {
    const userId = await this.validateUserToken(authHeader);
    await this.chatService.markMessagesAsRead(threadId, userId);

    return { success: true };
  }

  /**
   * Get total unread count
   */
  @Get('unread-count')
  @Public()
  @ApiOperation({
    summary: 'Get unread message count',
    description: 'Returns total unread messages across all threads',
  })
  @ApiBearerAuth()
  async getUnreadCount(
    @Headers('authorization') authHeader: string,
  ): Promise<{ success: boolean; data: { unread_count: number } }> {
    const userId = await this.validateUserToken(authHeader);
    const count = await this.chatService.getUnreadCount(userId);

    return {
      success: true,
      data: { unread_count: count },
    };
  }
}

// ============================================
// School-facing Chat Controller (API for SaaS)
// ============================================

@ApiTags('School Chat - School API')
@Controller('school/chat')
export class SchoolChatSchoolController {
  constructor(
    private readonly chatService: SchoolChatService,
    private readonly schoolService: SchoolService,
  ) {}

  /**
   * Extract Bearer token from Authorization header
   */
  private extractToken(authHeader: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

  /**
   * Create parent connection (called during OAuth flow)
   */
  @Post('parent-connection')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create parent connection',
    description: 'Creates a connection between a Peeap user and school parent after OAuth',
  })
  @ApiBearerAuth()
  async createParentConnection(
    @Body() body: CreateParentConnectionDto,
    @Headers('authorization') authHeader: string,
  ): Promise<{
    success: boolean;
    data: {
      connection_id: string;
      chat_enabled: boolean;
      thread_id?: string;
      children: Array<{ nsi: string; name: string; wallet_id?: string }>;
    };
  }> {
    // Validate token (either school or user token)
    const token = this.extractToken(authHeader);
    await this.schoolService.validateAccessToken(token);

    const result = await this.chatService.createParentConnection({
      peeapUserId: body.peeap_user_id,
      peeapWalletId: body.peeap_wallet_id,
      schoolId: body.school_id,
      peeapSchoolId: body.peeap_school_id,
      schoolName: body.school_name,
      schoolLogoUrl: body.school_logo_url,
      schoolDomain: body.school_domain,
      schoolParentId: body.school_parent_id,
      parentName: body.parent_name,
      parentEmail: body.parent_email,
      parentPhone: body.parent_phone,
      children: body.children,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Send message to parent(s)
   */
  @Post('send')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send message to parent',
    description: 'School sends a message to one or more parents',
  })
  @ApiBearerAuth()
  async sendMessage(
    @Body() body: SendSchoolMessageDto,
    @Headers('authorization') authHeader: string,
  ): Promise<{
    success: boolean;
    data: {
      message_ids: string[];
      sent_to: number;
    };
  }> {
    const token = this.extractToken(authHeader);

    const result = await this.chatService.sendSchoolMessage({
      schoolAccessToken: token,
      parentConnectionId: body.parent_connection_id,
      parentNsiList: body.parent_nsi_list,
      messageType: body.message_type,
      content: body.content,
      richContent: body.rich_content,
      senderName: body.sender_name,
      senderRole: body.sender_role,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Send invoice notification
   */
  @Post('invoice')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send invoice notification',
    description: 'Sends a fee invoice notification to a parent via chat',
  })
  @ApiBearerAuth()
  async sendInvoice(
    @Body() body: SendInvoiceDto,
    @Headers('authorization') authHeader: string,
  ): Promise<{
    success: boolean;
    data: {
      message_id?: string;
      sent: boolean;
    };
  }> {
    const token = this.extractToken(authHeader);

    const result = await this.chatService.sendInvoiceNotification({
      schoolAccessToken: token,
      studentNsi: body.student_nsi,
      invoice: body.invoice,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Send announcement
   */
  @Post('announcement')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send announcement',
    description: 'Sends an announcement to a class or school-wide',
  })
  @ApiBearerAuth()
  async sendAnnouncement(
    @Body() body: SendAnnouncementDto,
    @Headers('authorization') authHeader: string,
  ): Promise<{
    success: boolean;
    data: {
      message_ids: string[];
      sent_to: number;
    };
  }> {
    const token = this.extractToken(authHeader);

    const result = await this.chatService.sendAnnouncement({
      schoolAccessToken: token,
      classId: body.class_id,
      schoolWide: body.school_wide,
      title: body.title,
      content: body.content,
      eventDate: body.event_date,
      attachments: body.attachments,
    });

    return {
      success: true,
      data: result,
    };
  }
}

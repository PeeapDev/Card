import {
  Controller,
  Post,
  Get,
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
import { SchoolWalletService } from './school-wallet.service';

@ApiTags('School Wallets')
@Controller('school-wallets')
export class SchoolWalletController {
  constructor(
    private readonly schoolService: SchoolService,
    private readonly schoolWalletService: SchoolWalletService,
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
   * Create a new school wallet
   */
  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a school wallet' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Wallet created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createSchoolWallet(
    @Body() body: {
      school_id: string;
      school_name: string;
      currency?: string;
    },
    @Headers('authorization') authHeader: string,
  ) {
    const { userId } = await this.validateToken(authHeader);

    const wallet = await this.schoolWalletService.createSchoolWallet({
      schoolId: body.school_id,
      schoolName: body.school_name,
      ownerUserId: userId,
      currency: body.currency,
    });

    return {
      success: true,
      data: wallet,
    };
  }

  /**
   * Get school wallet details
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get school wallet details' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Wallet details retrieved' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getSchoolWallet(
    @Param('id') walletId: string,
    @Headers('authorization') authHeader: string,
  ) {
    const { userId } = await this.validateToken(authHeader);

    const wallet = await this.schoolWalletService.getSchoolWallet(walletId, userId);

    return {
      success: true,
      data: wallet,
    };
  }

  /**
   * Get school wallet by school ID
   */
  @Get('by-school/:schoolId')
  @Public()
  @ApiOperation({ summary: 'Get school wallet by school ID' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Wallet details retrieved' })
  async getWalletBySchoolId(
    @Param('schoolId') schoolId: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.validateToken(authHeader);

    const wallet = await this.schoolWalletService.getWalletBySchoolId(schoolId);

    return {
      success: true,
      data: wallet,
    };
  }

  /**
   * Update wallet permissions
   */
  @Post(':id/permissions')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add or update wallet permission' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Permission updated' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async updatePermission(
    @Param('id') walletId: string,
    @Body() body: {
      user_id: string;
      role: 'owner' | 'accountant' | 'staff' | 'viewer';
      permissions: string[];
    },
    @Headers('authorization') authHeader: string,
  ) {
    const { userId } = await this.validateToken(authHeader);

    const permission = await this.schoolWalletService.updatePermission({
      walletId,
      requestingUserId: userId,
      targetUserId: body.user_id,
      role: body.role,
      permissions: body.permissions,
    });

    return {
      success: true,
      data: permission,
    };
  }

  /**
   * Transfer funds to personal wallet
   */
  @Post(':id/transfer')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer funds from school wallet to personal wallet' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Transfer completed' })
  @ApiResponse({ status: 400, description: 'Insufficient balance' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async transferToPersonal(
    @Param('id') walletId: string,
    @Body() body: {
      target_wallet_id: string;
      amount: number;
      currency?: string;
      description?: string;
      pin: string;
    },
    @Headers('authorization') authHeader: string,
  ) {
    const { userId } = await this.validateToken(authHeader);

    const transaction = await this.schoolWalletService.transferToPersonal({
      schoolWalletId: walletId,
      targetWalletId: body.target_wallet_id,
      amount: body.amount,
      currency: body.currency || 'SLE',
      description: body.description,
      requestingUserId: userId,
      pin: body.pin,
    });

    return {
      success: true,
      data: transaction,
    };
  }

  /**
   * Initiate bank transfer
   */
  @Post(':id/bank-transfer')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate bank transfer from school wallet' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Bank transfer initiated' })
  @ApiResponse({ status: 400, description: 'Insufficient balance' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async initiateBankTransfer(
    @Param('id') walletId: string,
    @Body() body: {
      bank_code: string;
      account_number: string;
      account_name: string;
      amount: number;
      currency?: string;
      description?: string;
      pin: string;
    },
    @Headers('authorization') authHeader: string,
  ) {
    const { userId } = await this.validateToken(authHeader);

    const transaction = await this.schoolWalletService.initiateBankTransfer({
      schoolWalletId: walletId,
      bankCode: body.bank_code,
      accountNumber: body.account_number,
      accountName: body.account_name,
      amount: body.amount,
      currency: body.currency || 'SLE',
      description: body.description,
      requestingUserId: userId,
      pin: body.pin,
    });

    return {
      success: true,
      data: transaction,
    };
  }

  /**
   * Get wallet transactions
   */
  @Get(':id/transactions')
  @Public()
  @ApiOperation({ summary: 'Get school wallet transactions' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Transactions retrieved' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getTransactions(
    @Param('id') walletId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const { userId } = await this.validateToken(authHeader || '');

    const result = await this.schoolWalletService.getWalletTransactions({
      walletId,
      userId,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      offset: offset ? parseInt(String(offset), 10) : undefined,
      type,
      status,
    });

    return {
      success: true,
      data: result.transactions,
      pagination: {
        total: result.total,
        limit: limit || 50,
        offset: offset || 0,
      },
    };
  }

  /**
   * Credit school wallet (internal API for payment processing)
   * This endpoint is called when a payment is received for the school
   */
  @Post('credit')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Credit school wallet (internal)' })
  @ApiHeader({ name: 'X-Internal-API-Key', required: true })
  @ApiResponse({ status: 200, description: 'Wallet credited' })
  async creditWallet(
    @Body() body: {
      school_id: string;
      amount: number;
      currency?: string;
      description: string;
      reference: string;
      metadata?: Record<string, any>;
    },
    @Headers('x-internal-api-key') apiKey: string,
  ) {
    // Validate internal API key
    const internalKey = process.env.INTERNAL_API_KEY || 'internal-secret-key';
    if (apiKey !== internalKey) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid internal API key',
        },
      });
    }

    const transaction = await this.schoolWalletService.creditSchoolWallet({
      schoolId: body.school_id,
      amount: body.amount,
      currency: body.currency || 'SLE',
      description: body.description,
      reference: body.reference,
      metadata: body.metadata,
    });

    return {
      success: true,
      data: transaction,
    };
  }
}

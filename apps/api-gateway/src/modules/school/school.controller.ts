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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SchoolService } from './school.service';
import { Public } from '../auth/decorators/public.decorator';

// DTOs
class WalletBalanceResponse {
  success: boolean;
  data: {
    wallet_id: string;
    owner_name: string;
    owner_type: string;
    index_number?: string;
    balance: number;
    currency: string;
    daily_limit: number;
    daily_spent: number;
    available_today: number;
    status: string;
    last_transaction_at?: string;
  };
}

class AuthorizePaymentDto {
  session_id: string;
  wallet_id: string;
  amount: number;
  currency: string;
  pin: string;
  vendor_id: string;
  vendor_name: string;
  description?: string;
  items?: {
    name: string;
    quantity: number;
    price: number;
  }[];
  metadata?: {
    school_id?: number;
    payer_type?: string;
    payer_id?: number;
  };
}

class PaymentResponse {
  success: boolean;
  data: {
    transaction_id: string;
    session_id: string;
    status: string;
    amount: number;
    currency: string;
    balance_before: number;
    balance_after: number;
    completed_at: string;
    receipt: {
      number: string;
      url: string;
    };
  };
}

class LinkStudentDto {
  school_id: number;
  student_id: number;
  index_number: string;
  peeap_user_id: string;
  wallet_id: string;
}

@ApiTags('School Integration')
@Controller('school')
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

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
   * Validate the access token
   */
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
   * Get wallet balance by student identifier (index number)
   *
   * This endpoint is called by school systems to check a student's wallet balance
   * before initiating a payment.
   */
  @Get('wallets/:identifier/balance')
  @Public() // Public but requires OAuth token
  @ApiOperation({
    summary: 'Get wallet balance by student identifier',
    description: 'Returns the wallet balance for a student identified by their index number. Requires OAuth access token.',
  })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-School-ID',
    description: 'Optional school ID for multi-school queries',
    required: false,
  })
  @ApiParam({
    name: 'identifier',
    description: 'Student index number (e.g., SL-2025-02-00368)',
    example: 'SL-2025-02-00368',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet balance retrieved successfully',
    type: WalletBalanceResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or missing access token',
  })
  @ApiResponse({
    status: 404,
    description: 'Wallet not found for this identifier',
  })
  async getWalletBalance(
    @Param('identifier') identifier: string,
    @Headers('authorization') authHeader: string,
    @Headers('x-school-id') schoolIdHeader?: string,
  ): Promise<WalletBalanceResponse> {
    // Validate access token
    await this.validateToken(authHeader);

    const schoolId = schoolIdHeader ? parseInt(schoolIdHeader, 10) : undefined;
    const balance = await this.schoolService.getWalletBalance(identifier, schoolId);

    return {
      success: true,
      data: balance,
    };
  }

  /**
   * Authorize a payment with PIN verification
   *
   * This endpoint is called by school systems to process a payment.
   * It verifies the student's PIN and debits the wallet.
   */
  @Post('payments/authorize')
  @Public() // Public but requires OAuth token
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authorize and process a payment',
    description: 'Verifies PIN and processes a payment from student wallet. Requires OAuth access token.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Payment authorized and completed',
    type: PaymentResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance or daily limit exceeded',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid PIN or access token',
  })
  @ApiResponse({
    status: 403,
    description: 'Account locked',
  })
  async authorizePayment(
    @Body() body: AuthorizePaymentDto,
    @Headers('authorization') authHeader: string,
  ): Promise<PaymentResponse> {
    // Validate access token
    await this.validateToken(authHeader);

    const result = await this.schoolService.authorizePayment({
      sessionId: body.session_id,
      walletId: body.wallet_id,
      amount: body.amount,
      currency: body.currency,
      pin: body.pin,
      vendorId: body.vendor_id,
      vendorName: body.vendor_name,
      description: body.description,
      items: body.items,
      metadata: body.metadata,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Link a student to their Peeap wallet
   *
   * Called after a student authorizes their Peeap account through OAuth.
   */
  @Post('students/link')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Link student to Peeap wallet',
    description: 'Links a student index number to their Peeap wallet after OAuth authorization.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Student wallet linked successfully',
  })
  async linkStudent(
    @Body() body: LinkStudentDto,
    @Headers('authorization') authHeader: string,
  ): Promise<{ success: boolean; data: { linked: boolean; wallet_id: string; linked_at: string } }> {
    await this.validateToken(authHeader);

    const result = await this.schoolService.linkStudentWallet({
      schoolId: body.school_id,
      studentId: body.student_id,
      indexNumber: body.index_number,
      peeapUserId: body.peeap_user_id,
      walletId: body.wallet_id,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get vendors for a school
   */
  @Get('vendors')
  @Public()
  @ApiOperation({ summary: 'Get school vendors' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'school_id', required: false })
  async getVendors(
    @Headers('authorization') authHeader: string,
    @Query('school_id') schoolId?: string,
  ): Promise<{ success: boolean; data: { vendors: any[] } }> {
    await this.validateToken(authHeader);

    const vendors = await this.schoolService.getVendors(
      schoolId ? parseInt(schoolId, 10) : 1,
    );

    return {
      success: true,
      data: { vendors },
    };
  }

  /**
   * Get products for a vendor
   */
  @Get('vendors/:vendorId/products')
  @Public()
  @ApiOperation({ summary: 'Get vendor products' })
  @ApiBearerAuth()
  async getVendorProducts(
    @Param('vendorId') vendorId: string,
    @Headers('authorization') authHeader: string,
  ): Promise<{ success: boolean; data: { products: any[] } }> {
    await this.validateToken(authHeader);

    const products = await this.schoolService.getVendorProducts(vendorId);

    return {
      success: true,
      data: { products },
    };
  }
}

/**
 * Additional payments controller for the /payments/authorize endpoint
 * (alternative route as per integration guide)
 */
@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly schoolService: SchoolService) {}

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
   * Authorize payment - alternative endpoint at /payments/authorize
   */
  @Post('authorize')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authorize and process a payment (alternative endpoint)',
    description: 'Same as /school/payments/authorize but at /payments/authorize',
  })
  @ApiBearerAuth()
  async authorizePayment(
    @Body() body: AuthorizePaymentDto,
    @Headers('authorization') authHeader: string,
  ): Promise<PaymentResponse> {
    await this.validateToken(authHeader);

    const result = await this.schoolService.authorizePayment({
      sessionId: body.session_id,
      walletId: body.wallet_id,
      amount: body.amount,
      currency: body.currency,
      pin: body.pin,
      vendorId: body.vendor_id,
      vendorName: body.vendor_name,
      description: body.description,
      items: body.items,
      metadata: body.metadata,
    });

    return {
      success: true,
      data: result,
    };
  }
}

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

// Quick Access DTOs
class VerifyTokenDto {
  token: string;
}

class VerifyPinDto {
  token: string;
  pin: string;
  user_id: string;
}

// Wallet Creation DTOs
class CreateWalletDto {
  index_number: string;
  student_name: string;
  student_phone?: string;
  student_email?: string;
  class?: string;
  section?: string;
  school_id: number;
  pin: string;
  daily_limit?: number;
  parent_phone?: string;
  parent_email?: string;
}

class LinkWalletDto {
  phone_or_email: string;
  pin: string;
  index_number: string;
  student_id: number;
  school_id: number;
}

class TopupWalletDto {
  wallet_id: string;
  amount: number;
  currency: string;
  source: string;
  payment_method: string;
  reference?: string;
  initiated_by: string;
}

// Student Fee Payment DTO (for student self-service inside SaaS)
class PayFeeDto {
  student_index_number: string;
  fee_id: string;
  fee_name: string;
  amount: number;
  currency: string;
  pin: string;
  school_id: number;
  academic_year?: string;
  term?: string;
}

class PayFeeResponse {
  success: boolean;
  data: {
    transaction_id: string;
    fee_id: string;
    amount_paid: number;
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

// Student wallet balance for SaaS (get balance by index number without auth)
class StudentWalletInfoDto {
  student_index_number: string;
  school_id: number;
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

  // ============================================
  // Quick Access Authentication (Flow 2)
  // ============================================

  /**
   * Verify JWT token from SaaS for quick dashboard access
   */
  @Post('auth/verify-token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify SaaS JWT token',
    description: 'Verifies a JWT token from the school SaaS system for quick dashboard access',
  })
  async verifyQuickAccessToken(
    @Body() body: VerifyTokenDto,
  ): Promise<{ success: boolean; payload: any }> {
    const payload = await this.schoolService.verifyQuickAccessToken(body.token);

    return {
      success: true,
      payload,
    };
  }

  /**
   * Verify PIN for quick access authentication
   */
  @Post('auth/verify-pin')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify PIN for quick access',
    description: 'Verifies user PIN and returns session tokens for dashboard access',
  })
  async verifyQuickAccessPin(
    @Body() body: VerifyPinDto,
  ): Promise<{ success: boolean; access_token: string; refresh_token: string; expires_in: number }> {
    const result = await this.schoolService.verifyQuickAccessPin(body.token, body.pin, body.user_id);

    return {
      success: true,
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      expires_in: result.expiresIn,
    };
  }

  // ============================================
  // Wallet Management (Flow 3)
  // ============================================

  /**
   * Create a new wallet for a student
   */
  @Post('wallets/create')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create student wallet',
    description: 'Creates a new Peeap wallet for a student using their index number as primary identifier',
  })
  @ApiBearerAuth()
  async createStudentWallet(
    @Body() body: CreateWalletDto,
    @Headers('authorization') authHeader: string,
  ): Promise<{ success: boolean; data: { peeap_user_id: string; wallet_id: string } }> {
    await this.validateToken(authHeader);

    const result = await this.schoolService.createStudentWallet({
      indexNumber: body.index_number,
      studentName: body.student_name,
      studentPhone: body.student_phone,
      studentEmail: body.student_email,
      className: body.class,
      section: body.section,
      schoolId: body.school_id,
      pin: body.pin,
      dailyLimit: body.daily_limit || 50000,
      parentPhone: body.parent_phone,
      parentEmail: body.parent_email,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Link an existing Peeap wallet to a student
   */
  @Post('wallets/link')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Link existing wallet to student',
    description: 'Links an existing Peeap account to a student using phone/email and PIN verification',
  })
  @ApiBearerAuth()
  async linkExistingWallet(
    @Body() body: LinkWalletDto,
    @Headers('authorization') authHeader: string,
  ): Promise<{ success: boolean; data: { peeap_user_id: string; wallet_id: string } }> {
    await this.validateToken(authHeader);

    const result = await this.schoolService.linkExistingWallet({
      phoneOrEmail: body.phone_or_email,
      pin: body.pin,
      indexNumber: body.index_number,
      studentId: body.student_id,
      schoolId: body.school_id,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Top up a student wallet
   */
  @Post('wallets/topup')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Top up student wallet',
    description: 'Adds funds to a student wallet (school admin initiated)',
  })
  @ApiBearerAuth()
  async topupWallet(
    @Body() body: TopupWalletDto,
    @Headers('authorization') authHeader: string,
  ): Promise<{ success: boolean; data: { transaction_id: string; new_balance: number } }> {
    await this.validateToken(authHeader);

    const result = await this.schoolService.topupWallet({
      walletId: body.wallet_id,
      amount: body.amount,
      currency: body.currency,
      source: body.source,
      paymentMethod: body.payment_method,
      reference: body.reference,
      initiatedBy: body.initiated_by,
    });

    return {
      success: true,
      data: result,
    };
  }

  // ============================================
  // Student Self-Service Fee Payment (Flow 4)
  // ============================================

  /**
   * Get student wallet info by index number
   * Used by SaaS to show wallet balance before fee payment
   */
  @Post('students/wallet-info')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get student wallet info',
    description: 'Returns student wallet balance for fee payment UI in SaaS',
  })
  @ApiBearerAuth()
  async getStudentWalletInfo(
    @Body() body: StudentWalletInfoDto,
    @Headers('authorization') authHeader: string,
  ): Promise<{
    success: boolean;
    data: {
      wallet_id: string;
      balance: number;
      currency: string;
      student_name: string;
      username?: string;
    };
  }> {
    await this.validateToken(authHeader);

    const result = await this.schoolService.getStudentWalletInfo({
      indexNumber: body.student_index_number,
      schoolId: body.school_id,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Student pays fee using wallet balance
   * Called from inside the SaaS website when student clicks "Pay with Wallet"
   */
  @Post('students/pay-fee')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pay fee from student wallet',
    description: 'Allows student to pay school fees using their PeEAP wallet balance. Requires PIN verification.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Fee paid successfully',
    type: PayFeeResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid PIN or access token',
  })
  async payFeeFromWallet(
    @Body() body: PayFeeDto,
    @Headers('authorization') authHeader: string,
  ): Promise<PayFeeResponse> {
    await this.validateToken(authHeader);

    const result = await this.schoolService.payFeeFromWallet({
      studentIndexNumber: body.student_index_number,
      feeId: body.fee_id,
      feeName: body.fee_name,
      amount: body.amount,
      currency: body.currency,
      pin: body.pin,
      schoolId: body.school_id,
      academicYear: body.academic_year,
      term: body.term,
    });

    return {
      success: true,
      data: result,
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

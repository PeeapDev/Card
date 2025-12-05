import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { CardType } from '@payment-system/database';

class IssueCardDto {
  walletId: string;
  type: CardType;
  cardholderName?: string;
  shippingAddress?: {
    recipientName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phoneNumber?: string;
  };
}

class UpdateLimitsDto {
  dailyLimit?: number;
  monthlyLimit?: number;
  singleTransactionLimit?: number;
}

class UpdateFeaturesDto {
  nfcEnabled?: boolean;
  onlineEnabled?: boolean;
  internationalEnabled?: boolean;
  atmEnabled?: boolean;
}

@ApiTags('Cards')
@Controller('cards')
@ApiBearerAuth()
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post('tokenize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lookup card token by PAN + expiry (closed-loop)' })
  @ApiResponse({ status: 200, description: 'Returns cardToken for an active card' })
  async tokenizeCard(
    @Body() body: { pan: string; expiryMonth: number; expiryYear: number },
  ) {
    const token = await this.cardsService.lookupTokenByPan(
      body.pan,
      Number(body.expiryMonth),
      Number(body.expiryYear),
    );
    return { cardToken: token };
  }

  @Post()
  @ApiOperation({ summary: 'Issue a new card' })
  @ApiResponse({ status: 201, description: 'Card issued' })
  async issueCard(
    @Headers('x-user-id') userId: string,
    @Body() dto: IssueCardDto,
  ) {
    const card = await this.cardsService.issueCard({
      userId,
      ...dto,
    });

    return {
      id: card.id,
      token: card.token,
      lastFour: card.lastFour,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      type: card.type,
      status: card.status,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all cards for current user' })
  @ApiResponse({ status: 200, description: 'List of cards' })
  async getUserCards(@Headers('x-user-id') userId: string) {
    const cards = await this.cardsService.getUserCards(userId);
    return cards.map(card => ({
      id: card.id,
      lastFour: card.lastFour,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      type: card.type,
      status: card.status,
      cardholderName: card.cardholderName,
      dailyLimit: card.dailyLimit,
      monthlyLimit: card.monthlyLimit,
      features: {
        nfcEnabled: card.nfcEnabled,
        onlineEnabled: card.onlineEnabled,
        internationalEnabled: card.internationalEnabled,
        atmEnabled: card.atmEnabled,
      },
    }));
  }

  @Get(':cardId')
  @ApiOperation({ summary: 'Get card details' })
  @ApiResponse({ status: 200, description: 'Card details' })
  async getCard(@Param('cardId') cardId: string) {
    const card = await this.cardsService.getCard(cardId);
    return {
      id: card.id,
      lastFour: card.lastFour,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      type: card.type,
      status: card.status,
      cardholderName: card.cardholderName,
      dailyLimit: card.dailyLimit,
      monthlyLimit: card.monthlyLimit,
      singleTransactionLimit: card.singleTransactionLimit,
      features: {
        nfcEnabled: card.nfcEnabled,
        onlineEnabled: card.onlineEnabled,
        internationalEnabled: card.internationalEnabled,
        atmEnabled: card.atmEnabled,
      },
      createdAt: card.createdAt,
    };
  }

  @Post(':cardId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a card' })
  @ApiResponse({ status: 200, description: 'Card activated' })
  async activateCard(@Param('cardId') cardId: string) {
    const card = await this.cardsService.activateCard(cardId);
    return { status: card.status, activatedAt: card.activatedAt };
  }

  @Post(':cardId/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block a card' })
  @ApiResponse({ status: 200, description: 'Card blocked' })
  async blockCard(
    @Param('cardId') cardId: string,
    @Body('reason') reason: string,
  ) {
    const card = await this.cardsService.blockCard(cardId, reason, 'USER');
    return { status: card.status, blockedAt: card.blockedAt };
  }

  @Post(':cardId/unblock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a card' })
  @ApiResponse({ status: 200, description: 'Card unblocked' })
  async unblockCard(@Param('cardId') cardId: string) {
    const card = await this.cardsService.unblockCard(cardId);
    return { status: card.status };
  }

  @Delete(':cardId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate a card' })
  @ApiResponse({ status: 200, description: 'Card terminated' })
  async terminateCard(
    @Param('cardId') cardId: string,
    @Body('reason') reason: string,
  ) {
    const card = await this.cardsService.terminateCard(cardId, reason);
    return { status: card.status, terminatedAt: card.terminatedAt };
  }

  @Put(':cardId/limits')
  @ApiOperation({ summary: 'Update card limits' })
  @ApiResponse({ status: 200, description: 'Limits updated' })
  async updateLimits(
    @Param('cardId') cardId: string,
    @Body() dto: UpdateLimitsDto,
  ) {
    const card = await this.cardsService.updateLimits(cardId, dto);
    return {
      dailyLimit: card.dailyLimit,
      monthlyLimit: card.monthlyLimit,
      singleTransactionLimit: card.singleTransactionLimit,
    };
  }

  @Put(':cardId/features')
  @ApiOperation({ summary: 'Update card features' })
  @ApiResponse({ status: 200, description: 'Features updated' })
  async updateFeatures(
    @Param('cardId') cardId: string,
    @Body() dto: UpdateFeaturesDto,
  ) {
    const card = await this.cardsService.updateFeatures(cardId, dto);
    return {
      nfcEnabled: card.nfcEnabled,
      onlineEnabled: card.onlineEnabled,
      internationalEnabled: card.internationalEnabled,
      atmEnabled: card.atmEnabled,
    };
  }

  // Internal endpoint for transaction service
  @Post('verify')
  @ApiOperation({ summary: 'Verify card for transaction' })
  async verifyCard(
    @Body() dto: {
      cardToken: string;
      amount?: number;
      checkExpiry?: boolean;
      checkStatus?: boolean;
      checkLimits?: boolean;
    },
  ) {
    return this.cardsService.verifyCard(dto.cardToken, {
      amount: dto.amount,
      checkExpiry: dto.checkExpiry,
      checkStatus: dto.checkStatus,
      checkLimits: dto.checkLimits,
    });
  }
}

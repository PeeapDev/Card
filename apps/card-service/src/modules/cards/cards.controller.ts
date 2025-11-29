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
import { CardType, CardTier } from '@payment-system/database';

class IssueCardDto {
  walletId: string;
  type: CardType;
  tier?: CardTier;
  nickname?: string;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

class UpdateLimitsDto {
  dailyLimit?: number;
  monthlyLimit?: number;
  perTransactionLimit?: number;
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
      cardToken: card.cardToken,
      lastFour: card.lastFour,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      type: card.type,
      tier: card.tier,
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
      tier: card.tier,
      status: card.status,
      nickname: card.nickname,
      dailyLimit: card.dailyLimit,
      monthlyLimit: card.monthlyLimit,
      dailySpent: card.dailySpent,
      monthlySpent: card.monthlySpent,
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
      tier: card.tier,
      status: card.status,
      nickname: card.nickname,
      dailyLimit: card.dailyLimit,
      monthlyLimit: card.monthlyLimit,
      perTransactionLimit: card.perTransactionLimit,
      dailySpent: card.dailySpent,
      monthlySpent: card.monthlySpent,
      features: {
        nfcEnabled: card.nfcEnabled,
        onlineEnabled: card.onlineEnabled,
        internationalEnabled: card.internationalEnabled,
        atmEnabled: card.atmEnabled,
      },
      lastUsedAt: card.lastUsedAt,
      createdAt: card.createdAt,
    };
  }

  @Post(':cardId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a card' })
  @ApiResponse({ status: 200, description: 'Card activated' })
  async activateCard(
    @Param('cardId') cardId: string,
    @Body('activationCode') activationCode?: string,
  ) {
    const card = await this.cardsService.activateCard(cardId, activationCode);
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
  @ApiOperation({ summary: 'Cancel a card' })
  @ApiResponse({ status: 200, description: 'Card cancelled' })
  async cancelCard(
    @Param('cardId') cardId: string,
    @Body('reason') reason: string,
  ) {
    const card = await this.cardsService.cancelCard(cardId, reason);
    return { status: card.status, cancelledAt: card.cancelledAt };
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
      perTransactionLimit: card.perTransactionLimit,
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

  @Post(':cardId/pin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set card PIN' })
  @ApiResponse({ status: 204, description: 'PIN set' })
  async setPin(
    @Param('cardId') cardId: string,
    @Body('pinHash') pinHash: string,
  ) {
    await this.cardsService.setPin(cardId, pinHash);
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

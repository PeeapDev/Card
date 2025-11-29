import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthorizationsService } from './authorizations.service';

@ApiTags('Authorizations')
@Controller('authorizations')
@ApiBearerAuth()
export class AuthorizationsController {
  constructor(private readonly authorizationsService: AuthorizationsService) {}

  @Get(':transactionId')
  @ApiOperation({ summary: 'Get authorization for transaction' })
  async getAuthorization(@Param('transactionId') transactionId: string) {
    return this.authorizationsService.getActiveAuthorization(transactionId);
  }
}

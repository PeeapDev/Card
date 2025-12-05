import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout } from 'rxjs';

@ApiTags('Checkout')
@Controller('checkout')
export class TokenizeController {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Post('tokenize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lookup Peeap card token by PAN + expiry' })
  async tokenize(
    @Body()
    body: {
      pan: string;
      expiryMonth: number | string;
      expiryYear: number | string;
    },
  ) {
    if (!body?.pan) {
      throw new HttpException('pan is required', HttpStatus.BAD_REQUEST);
    }

    const cardServiceUrl = this.configService.get('CARD_SERVICE_URL', 'http://localhost:3003');
    try {
      const response = await firstValueFrom(
        this.httpService
          .post(`${cardServiceUrl}/cards/tokenize`, {
            pan: body.pan,
            expiryMonth: Number(body.expiryMonth),
            expiryYear: Number(body.expiryYear),
          })
          .pipe(timeout(8000)),
      );

      return response.data;
    } catch (error: any) {
      const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.response?.data?.message || error.message || 'Tokenization failed';
      throw new HttpException(message, status);
    }
  }
}

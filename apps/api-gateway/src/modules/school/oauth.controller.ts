import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { OAuthService } from './oauth.service';
import { Public } from '../auth/decorators/public.decorator';

class TokenRequestDto {
  grant_type: string;
  client_id: string;
  client_secret: string;
  code?: string;
  redirect_uri?: string;
  refresh_token?: string;
}

class TokenResponseDto {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  user?: {
    peeap_id: string;
    email?: string;
  };
  school_connection?: {
    peeap_school_id?: string;
  };
}

class TokenErrorDto {
  error: string;
  error_description: string;
}

@ApiTags('OAuth')
@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  /**
   * OAuth 2.0 Token Endpoint
   *
   * Supports:
   * - authorization_code grant type (exchange code for token)
   * - refresh_token grant type (refresh existing token)
   *
   * Used by school systems to:
   * 1. Exchange authorization code for access token after user authorizes
   * 2. Refresh expired access tokens
   */
  @Post('token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange authorization code for access token',
    description: 'OAuth 2.0 token endpoint for school integration. Supports authorization_code and refresh_token grant types.',
  })
  @ApiBody({ type: TokenRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Token generated successfully',
    type: TokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
    type: TokenErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or grant',
    type: TokenErrorDto,
  })
  async token(@Body() body: TokenRequestDto): Promise<TokenResponseDto> {
    const { grant_type, client_id, client_secret, code, redirect_uri, refresh_token } = body;

    // Handle authorization_code grant
    if (grant_type === 'authorization_code') {
      if (!code || !redirect_uri) {
        throw new UnauthorizedException({
          error: 'invalid_request',
          error_description: 'Missing code or redirect_uri for authorization_code grant',
        });
      }

      return this.oauthService.exchangeCodeForToken({
        grantType: grant_type,
        code,
        clientId: client_id,
        clientSecret: client_secret,
        redirectUri: redirect_uri,
      });
    }

    // Handle refresh_token grant
    if (grant_type === 'refresh_token') {
      if (!refresh_token) {
        throw new UnauthorizedException({
          error: 'invalid_request',
          error_description: 'Missing refresh_token for refresh_token grant',
        });
      }

      return this.oauthService.refreshToken({
        grantType: grant_type,
        refreshToken: refresh_token,
        clientId: client_id,
        clientSecret: client_secret,
      });
    }

    // Unsupported grant type
    throw new UnauthorizedException({
      error: 'unsupported_grant_type',
      error_description: `Grant type '${grant_type}' is not supported. Use 'authorization_code' or 'refresh_token'.`,
    });
  }

  /**
   * Token Introspection Endpoint (optional, for debugging)
   */
  @Post('introspect')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate and introspect an access token' })
  async introspect(
    @Body() body: { token: string },
  ): Promise<{ active: boolean; user_id?: string; client_id?: string; scope?: string }> {
    const result = await this.oauthService.validateAccessToken(body.token);

    return {
      active: result.valid,
      user_id: result.userId,
      client_id: result.clientId,
      scope: result.scope,
    };
  }

  /**
   * Token Revocation Endpoint
   */
  @Post('revoke')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an access token' })
  async revoke(@Body() body: { token: string }): Promise<{ success: boolean }> {
    const success = await this.oauthService.revokeToken(body.token);
    return { success };
  }
}

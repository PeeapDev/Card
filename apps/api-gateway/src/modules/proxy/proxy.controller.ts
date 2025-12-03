import {
  Controller,
  All,
  Req,
  Res,
  Param,
  Next,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Public } from '../auth/decorators/public.decorator';

// Routes that should not be proxied (handled by other controllers)
const SKIP_ROUTES = ['health', 'docs'];

// Route mapping configuration
const SERVICE_ROUTES: Record<string, { service: string; requiresAuth: boolean }> = {
  // Identity Service
  'auth': { service: 'identity', requiresAuth: false },
  'users': { service: 'identity', requiresAuth: true },
  'sessions': { service: 'identity', requiresAuth: true },
  'kyc': { service: 'identity', requiresAuth: true },

  // Account Service
  'wallets': { service: 'account', requiresAuth: true },
  'ledger': { service: 'account', requiresAuth: true },
  'monime': { service: 'account', requiresAuth: true },

  // Card Service
  'cards': { service: 'card', requiresAuth: true },
  'tokens': { service: 'card', requiresAuth: true },

  // Transaction Service
  'transactions': { service: 'transaction', requiresAuth: true },
  'authorizations': { service: 'transaction', requiresAuth: true },

  // Merchant Service
  'merchants': { service: 'merchant', requiresAuth: true },
  'checkout': { service: 'merchant', requiresAuth: true },
  'terminals': { service: 'merchant', requiresAuth: true },

  // Settlement Service
  'settlements': { service: 'settlement', requiresAuth: true },

  // Developer Service
  'api-keys': { service: 'developer', requiresAuth: true },
  'webhooks': { service: 'developer', requiresAuth: true },

  // Fraud Service (internal only via API key)
  'fraud': { service: 'fraud', requiresAuth: true },
};

@ApiTags('Proxy')
@Controller()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All(':resource')
  @UseGuards(JwtAuthGuard, ApiKeyGuard)
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyRoot(
    @Param('resource') resource: string,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    // Skip routes handled by other controllers
    if (SKIP_ROUTES.includes(resource)) {
      return next();
    }
    return this.handleProxy(resource, '', req, res);
  }

  @All(':resource/*')
  @UseGuards(JwtAuthGuard, ApiKeyGuard)
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyWithPath(
    @Param('resource') resource: string,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    // Skip routes handled by other controllers
    if (SKIP_ROUTES.includes(resource)) {
      return next();
    }
    // Extract the path after the resource
    const fullPath = req.url.replace(/^\/api\/v1/, '');
    const resourcePath = fullPath.replace(`/${resource}`, '');

    return this.handleProxy(resource, resourcePath, req, res);
  }

  private async handleProxy(
    resource: string,
    path: string,
    req: Request,
    res: Response,
  ) {
    const routeConfig = SERVICE_ROUTES[resource];

    if (!routeConfig) {
      return res.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Resource '${resource}' not found`,
        error: 'Not Found',
      });
    }

    const targetPath = `/${resource}${path}`;

    const result = await this.proxyService.proxyRequest(
      routeConfig.service,
      targetPath,
      req,
    );

    // Copy response headers
    if (result.headers) {
      const headersToForward = ['content-type', 'x-request-id', 'x-correlation-id'];
      for (const header of headersToForward) {
        if (result.headers[header]) {
          res.setHeader(header, result.headers[header]);
        }
      }
    }

    return res.status(result.status).json(result.data);
  }
}

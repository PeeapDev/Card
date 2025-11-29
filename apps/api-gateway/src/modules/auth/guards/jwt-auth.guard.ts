import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Public routes by path pattern
    const publicPaths = ['/api/v1/health', '/api/v1/auth', '/api/docs'];
    const requestPath = request.path || request.url;
    if (publicPaths.some(p => requestPath.startsWith(p))) {
      return true;
    }

    // Check if request has API key - if so, skip JWT auth
    if (request.headers['x-api-key']) {
      return true; // Let ApiKeyGuard handle it
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Check if this is an API key request
    const request = context.switchToHttp().getRequest();
    if (request.headers['x-api-key']) {
      return null; // API key requests don't need JWT user
    }

    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}

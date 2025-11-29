import { Role } from '../constants/roles.constant';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  roles: Role[];
  sessionId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface JwtTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

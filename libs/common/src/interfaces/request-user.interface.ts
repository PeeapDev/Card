import { Role } from '../constants/roles.constant';

export interface RequestUser {
  id: string;
  email: string;
  roles: Role[];
  sessionId: string;
  kycStatus?: KycStatus;
  merchantId?: string; // For merchant users
}

export enum KycStatus {
  NOT_STARTED = 'NOT_STARTED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

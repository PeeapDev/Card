export interface UserRegisteredEvent {
  userId: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
}

export interface UserVerifiedEvent {
  userId: string;
  verificationType: 'EMAIL' | 'PHONE';
  verifiedAt: Date;
}

export interface KycSubmittedEvent {
  userId: string;
  applicationId: string;
  documentTypes: string[];
  submittedAt: Date;
}

export interface KycApprovedEvent {
  userId: string;
  applicationId: string;
  tier: string;
  approvedAt: Date;
  approvedBy?: string;
}

export interface KycRejectedEvent {
  userId: string;
  applicationId: string;
  reason: string;
  rejectedAt: Date;
  rejectedBy?: string;
}

export interface UserSuspendedEvent {
  userId: string;
  reason: string;
  suspendedBy: string;
  suspendedAt: Date;
}

export interface UserReactivatedEvent {
  userId: string;
  reactivatedBy: string;
  reactivatedAt: Date;
}

export interface SessionCreatedEvent {
  sessionId: string;
  userId: string;
  deviceId?: string;
  ipAddress: string;
  userAgent: string;
}

export interface SessionTerminatedEvent {
  sessionId: string;
  userId: string;
  reason: 'LOGOUT' | 'EXPIRED' | 'REVOKED';
}

export const IDENTITY_EVENT_TYPES = {
  USER_REGISTERED: 'identity.user.registered',
  USER_VERIFIED: 'identity.user.verified',
  KYC_SUBMITTED: 'identity.kyc.submitted',
  KYC_APPROVED: 'identity.kyc.approved',
  KYC_REJECTED: 'identity.kyc.rejected',
  USER_SUSPENDED: 'identity.user.suspended',
  USER_REACTIVATED: 'identity.user.reactivated',
  SESSION_CREATED: 'identity.session.created',
  SESSION_TERMINATED: 'identity.session.terminated',
} as const;

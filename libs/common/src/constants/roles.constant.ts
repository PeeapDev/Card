export enum Role {
  USER = 'USER',
  MERCHANT = 'MERCHANT',
  DEVELOPER = 'DEVELOPER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  SYSTEM = 'SYSTEM',
}

export const PERMISSIONS = {
  // User permissions
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',

  // Wallet permissions
  WALLET_READ: 'wallet:read',
  WALLET_TOPUP: 'wallet:topup',
  WALLET_TRANSFER: 'wallet:transfer',
  WALLET_WITHDRAW: 'wallet:withdraw',

  // Card permissions
  CARD_READ: 'card:read',
  CARD_CREATE: 'card:create',
  CARD_UPDATE: 'card:update',
  CARD_FREEZE: 'card:freeze',
  CARD_TERMINATE: 'card:terminate',

  // Transaction permissions
  TRANSACTION_READ: 'transaction:read',
  TRANSACTION_CREATE: 'transaction:create',
  TRANSACTION_AUTHORIZE: 'transaction:authorize',
  TRANSACTION_CAPTURE: 'transaction:capture',
  TRANSACTION_REFUND: 'transaction:refund',
  TRANSACTION_VOID: 'transaction:void',

  // Merchant permissions
  MERCHANT_READ: 'merchant:read',
  MERCHANT_MANAGE: 'merchant:manage',
  MERCHANT_SETTLE: 'merchant:settle',

  // API permissions
  API_KEY_READ: 'api_key:read',
  API_KEY_MANAGE: 'api_key:manage',
  WEBHOOK_MANAGE: 'webhook:manage',

  // Admin permissions
  ADMIN_USER_MANAGE: 'admin:user:manage',
  ADMIN_MERCHANT_MANAGE: 'admin:merchant:manage',
  ADMIN_SYSTEM_CONFIG: 'admin:system:config',
  ADMIN_AUDIT_VIEW: 'admin:audit:view',
  ADMIN_KEY_ROTATE: 'admin:key:rotate',

  // Vault permissions (restricted)
  VAULT_TOKENIZE: 'vault:tokenize',
  VAULT_DETOKENIZE: 'vault:detokenize',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.USER]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.WALLET_READ,
    PERMISSIONS.WALLET_TOPUP,
    PERMISSIONS.WALLET_TRANSFER,
    PERMISSIONS.CARD_READ,
    PERMISSIONS.CARD_CREATE,
    PERMISSIONS.CARD_UPDATE,
    PERMISSIONS.CARD_FREEZE,
    PERMISSIONS.TRANSACTION_READ,
  ],
  [Role.MERCHANT]: [
    PERMISSIONS.MERCHANT_READ,
    PERMISSIONS.TRANSACTION_READ,
    PERMISSIONS.TRANSACTION_AUTHORIZE,
    PERMISSIONS.TRANSACTION_CAPTURE,
    PERMISSIONS.TRANSACTION_REFUND,
    PERMISSIONS.TRANSACTION_VOID,
  ],
  [Role.DEVELOPER]: [
    PERMISSIONS.API_KEY_READ,
    PERMISSIONS.API_KEY_MANAGE,
    PERMISSIONS.WEBHOOK_MANAGE,
    PERMISSIONS.TRANSACTION_READ,
  ],
  [Role.ADMIN]: [
    ...Object.values(PERMISSIONS).filter(
      (p) => !p.startsWith('vault:') && !p.startsWith('admin:key:'),
    ),
  ],
  [Role.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [Role.SYSTEM]: [PERMISSIONS.VAULT_TOKENIZE, PERMISSIONS.VAULT_DETOKENIZE],
};

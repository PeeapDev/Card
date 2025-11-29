# Closed-Loop Card Payment System - Project Context

## Project Overview
A complete closed-loop card payment system where we act as the payment processor (no Visa/Mastercard). Built with NestJS microservices architecture.

## Technology Stack
- **Backend**: NestJS (TypeScript) Monorepo with Nx
- **Database**: PostgreSQL 15
- **Cache/Sessions**: Redis 7
- **Message Queue**: RabbitMQ 3
- **Deployment**: Docker Compose

## Project Location
```
/Users/local_server/soft-touch2/project/card/
```

## Microservices Architecture (10 Services)

| Service | Port | Database | Purpose |
|---------|------|----------|---------|
| API Gateway | 3000 | - | Routing, rate limiting, auth |
| Identity Service | 3001 | identity_db | Auth, users, KYC |
| Account Service | 3002 | account_db | Wallets, double-entry ledger |
| Card Service | 3003 | card_db | Card issuance, token vault |
| Transaction Service | 3004 | transaction_db | Payment processing |
| Fraud Service | 3005 | fraud_db | Risk scoring, rules engine |
| Merchant Service | 3006 | merchant_db | Onboarding, checkout |
| Settlement Service | 3007 | settlement_db | Batch processing |
| Developer Service | 3008 | developer_db | API keys, webhooks |
| Notification Service | 3009 | notification_db | Email, SMS, push |

## Project Structure
```
/Users/local_server/soft-touch2/project/card/
├── apps/
│   ├── api-gateway/
│   ├── identity-service/
│   ├── account-service/
│   ├── card-service/
│   ├── transaction-service/
│   ├── fraud-service/
│   ├── merchant-service/
│   ├── settlement-service/
│   ├── developer-service/
│   └── notification-service/
├── libs/
│   ├── common/              # Utilities, guards, decorators, encryption
│   ├── database/            # TypeORM entities, enums
│   └── events/              # RabbitMQ event types, publishers
├── infrastructure/
│   ├── postgres/init/       # Database init scripts
│   └── rabbitmq/            # RabbitMQ definitions
├── docker-compose.yml
├── package.json
├── nx.json
└── tsconfig.base.json
```

## Key Features Implemented

### 1. Identity Service
- JWT RS256 authentication
- Session management with Redis
- MFA support (TOTP)
- KYC workflow with document upload (encrypted)
- User roles and permissions

### 2. Account Service
- Wallet management with optimistic locking
- Double-entry ledger accounting
- Fund holds, captures, refunds
- Trial balance verification

### 3. Card Service
- PCI-compliant token vault (AES-256-GCM with DEK/KEK)
- Virtual and physical card issuance
- Luhn-valid PAN generation
- Card limits (daily, monthly, per-transaction)
- NFC, online, international controls

### 4. Transaction Service
- Authorization → Capture → Settlement flow
- Transaction state machine with valid transitions
- Event sourcing for audit trail
- Fraud check integration

### 5. Fraud Service
- Velocity checking (Redis-based)
- Configurable rules engine
- Risk scoring (0-100)
- Decision: APPROVE/DECLINE/REVIEW

### 6. Merchant Service
- Merchant onboarding
- Terminal registration
- Checkout sessions for e-commerce

### 7. Settlement Service
- Daily batch processing (2 AM cron)
- Merchant grouping
- Ledger integration for payouts

### 8. Developer Service
- API key management (live/test environments)
- Key rolling with deprecation period
- Webhook endpoints with retry logic
- HMAC signature verification

### 9. Notification Service
- Email, SMS, Push channels
- Template system with variable substitution
- Event-driven via RabbitMQ

## Current Status (Updated: 2025-11-29)
✅ All services code implemented
✅ npm packages installed
✅ Docker infrastructure running (PostgreSQL, Redis, RabbitMQ healthy)
✅ API Gateway builds successfully
⏳ Other services have TypeScript compilation errors to fix

### Infrastructure Status
```
payment-postgres   Up (healthy)   0.0.0.0:5432->5432/tcp
payment-redis      Up (healthy)   0.0.0.0:6379->6379/tcp
payment-rabbitmq   Up (healthy)   0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
```

### Build Status
- `api-gateway`: ✅ Builds successfully
- `identity-service`: ⏳ TypeScript errors (User entity missing fields)
- Other services: ⏳ Need entity/type fixes

## Commands to Run

### Start Infrastructure (Already Running)
```bash
# If containers are stopped:
docker-compose up -d postgres redis rabbitmq
```

### Build Project
```bash
# Build API Gateway only (works):
npx nx build api-gateway

# Build all (some services have errors):
npm run build
```

### Start Services (Development)
```bash
npm run start:dev
```

### Fix npm cache (if needed)
```bash
sudo chown -R $(id -u):$(id -g) "/Users/local_server/.npm"
# Or use: npm install --cache /tmp/npm-cache
```

## Known Issues & Fixes

### 1. TypeScript Compilation Errors
The services use strict TypeScript. Entity properties need to match service usage:
- User entity in `libs/database/src/entities/identity/user.entity.ts` needs fields like:
  - `phoneVerifiedAt`, `emailVerifiedAt`
  - `phoneVerificationCode`, `emailVerificationCode`
  - `phoneVerificationExpiresAt`, `emailVerificationExpiresAt`
  - `suspendedAt`, `suspendedReason`

Fix: Add missing columns to the entity files to match service requirements.

### 2. Colima/Docker (FIXED)
Previously Colima had issues. Fixed by:
```bash
colima delete --force
colima start --cpu 4 --memory 8
```

### 3. RabbitMQ Definitions (FIXED)
Removed user definitions from `infrastructure/rabbitmq/definitions.json` - user is created via docker-compose environment variables.

## Database Credentials (Development)
- **PostgreSQL**
  - User: payment_admin
  - Password: payment_secret_password
  - Host: localhost:5432

- **Redis**
  - Host: localhost:6379
  - Password: redis_secret_password

- **RabbitMQ**:
  - Host: localhost:5672
  - Management: localhost:15672
  - User: payment_mq
  - Password: rabbitmq_secret_password

## Payment Flow

```
1. User → Card Issuance → Token Vault stores encrypted PAN
2. Merchant → Create Checkout Session
3. User → Submit Card Token to Checkout
4. Transaction Service:
   a. Verify card (Card Service)
   b. Check fraud (Fraud Service)
   c. Hold funds (Account Service)
   d. Return authorization code
5. Merchant → Capture transaction
6. Settlement Service → Daily batch to merchant
```

## Security Features
- AES-256-GCM encryption for sensitive data
- Argon2id password hashing
- HMAC-SHA256 for API signatures
- JWT RS256 for authentication
- Rate limiting by tier (basic/standard/premium/enterprise)
- IP whitelisting for API keys

## Next Steps (If Continuing)

### Immediate (Build Fixes)
1. Fix TypeScript errors in entity files - add missing columns to match service usage
2. Build and test each service: `npx nx build <service-name>`
3. Once all services build, run: `npm run build`

### After Build Passes
4. Run database migrations (TypeORM sync or migrations)
5. Seed initial data (system accounts, templates)
6. Test payment flow end-to-end
7. Add unit tests
8. Set up CI/CD pipeline

### Quick Fix Strategy
The tsconfig has been relaxed (strict: false). To quickly get services running:
1. For any TypeScript errors about missing entity properties, add them to the entity file
2. Most errors are just missing fields in entities that services expect

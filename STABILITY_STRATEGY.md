# Stability Strategy for Peeap Platform

## Problem Statement
Changes to one part of the codebase break other parts because of:
1. Tight coupling between services
2. No automated tests
3. Monolithic API router (11,000+ lines)
4. Inconsistent API URL configuration
5. Auto-deployments from Git triggering unintended changes

## Fixes Implemented

### 1. Smart Deployment with ignoreCommand
**Files:** All `vercel.json` files

Added `ignoreCommand` to each project so it only deploys when relevant files change.

**How it works:**
- Push to Git → Vercel runs `ignoreCommand` for each project
- Exit 0 (no changes) → Skip deployment
- Exit 1 (has changes) → Proceed with deployment

**What triggers each domain:**

| Domain             | Triggered By                          |
|--------------------|---------------------------------------|
| my.peeap.com       | apps/web/*, package.json, vercel.json |
| api.peeap.com      | api-deploy/* only                     |
| plus.peeap.com     | apps/plus/* only                      |
| checkout.peeap.com | apps/web/* (same as my.peeap.com)     |

**Effect:** Change API code → only API deploys. Change web code → only web deploys.

### 2. API Routing Fix
**Files:**
- `vercel.json` (root)
- `apps/web/vite.config.ts`

Added Vercel rewrites to proxy `/api/*` from `my.peeap.com` to `api.peeap.com`.

**Effect:** Frontend API calls now correctly reach the API server in production.

### 3. Missing Endpoint Added
**File:** `api-deploy/api/router.ts`

Added `/monime/banks` endpoint (alias for `/payouts/banks`).

**Effect:** `bankAccountService.getAvailableBanks()` now works correctly.

### 4. Smoke Tests
**Files:**
- `tests/smoke/test-api.js` - General API health checks
- `tests/smoke/test-bank-list.js` - Bank list debugging

**Usage:**
```bash
# Test production API
node tests/smoke/test-api.js prod

# Test locally
node tests/smoke/test-api.js local

# Debug bank list issues
node tests/smoke/test-bank-list.js
```

### 5. Deploy Script with Validation
**File:** `deploy.sh`

Now runs:
1. Pre-deployment validation (for API)
2. Deployment to Vercel
3. Post-deployment smoke tests

## Deployment Workflow

### Before ANY Deployment:
```bash
# Run smoke tests first
node tests/smoke/test-api.js prod
```

### Deploy Specific Projects:
```bash
# Deploy web app (my.peeap.com)
./deploy.sh web

# Deploy API (api.peeap.com) - includes validation + smoke tests
./deploy.sh api

# Deploy checkout (checkout.peeap.com)
./deploy.sh checkout

# Deploy plus (plus.peeap.com)
./deploy.sh plus

# Deploy ALL (uses 4 Vercel deployments)
./deploy.sh all
```

## Critical Rules

### 1. Smart Auto-Deploy
With `ignoreCommand` set up, each project only deploys when its files change:
- Change `api-deploy/` → only API deploys
- Change `apps/web/` → only web app deploys
- Change `apps/plus/` → only plus deploys

### 2. Test Before Deploying
```bash
# Always run this before deploying
node tests/smoke/test-api.js prod
```

### 3. One Change at a Time
Don't batch multiple unrelated changes. Deploy and verify each change separately.

### 4. Check API Response Type
If `api.peeap.com` returns HTML instead of JSON, the deployment is broken:
```bash
curl -I https://api.peeap.com/payouts/banks
# Should return: Content-Type: application/json
```

## Monitoring

### Quick Health Check:
```bash
curl https://api.peeap.com/
# Should return JSON: {"name":"Peeap API","version":"1.0.0"...}
```

### Bank List Check:
```bash
curl https://api.peeap.com/payouts/banks?country=SL
# Should return: {"banks":[...]}
```

### Debug Issues:
```bash
node tests/smoke/test-bank-list.js
```

## Next Steps (Gradual Improvement)

1. **Add more smoke tests** for checkout, deposits, KYC
2. **Split router.ts** into modular files (handlers/)
3. **Add unit tests** for critical business logic
4. **Add monitoring** - alerts when endpoints fail
5. **Add staging environment** - test changes before production

## Architecture Issues to Fix Later

1. **Monolithic Router** - Split into modules
2. **No TypeScript strict mode** - Enable for type safety
3. **Inconsistent API URLs** - Centralize to `config/urls.ts`
4. **No CI/CD** - Add GitHub Actions for automated testing
5. **No staging** - Add staging environment for testing

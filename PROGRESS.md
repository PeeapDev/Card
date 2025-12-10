# Peeap Development Progress

**Last Updated:** December 10, 2025

## Current Status

All code changes are committed to git and ready. The main issue is **Vercel deployment limits** (100/day exceeded).

---

## What's Working

1. **api.peeap.com** - Deployed and working with the latest code including:
   - Router with all checkout endpoints
   - Mobile money payout API
   - P2P checkout support

2. **Git Repository** - All changes committed:
   - Latest commit: `8af1025` (Revert SDK URL - kept api.peeap.com)
   - Previous commit: `f86c29c` (Mobile Money Payout, QR fix, checkout improvements)

---

## Features Completed (in codebase)

### 1. Mobile Money Payout Page
- **File:** `apps/web/src/pages/PayoutPage.tsx`
- **Route:** `/payout`
- Supports Orange Money and Afrimoney payouts via Monime API
- Full UI with phone number validation and wallet selection

### 2. QR Code Scanning Fix
- **Files:**
  - `apps/web/src/services/qr-engine.ts` - Added `parseURLQR()` method
  - `apps/web/src/components/payment/ScanToPayModal.tsx` - Handle checkout redirects
- Now handles URL-based QR codes (e.g., `https://checkout.peeap.com/pay/{sessionId}`)
- Redirects to hosted checkout when scanning checkout QR codes

### 3. Web NFC Support
- **File:** `apps/web/src/types/web-nfc.d.ts`
- TypeScript declarations for Web NFC API
- Ready for NFC payment implementation

### 4. Sidebar Navigation Order
- **File:** `apps/web/src/components/layout/MainLayout.tsx`
- Order: Dashboard > Wallets > Send > Receive > Payout > ...

### 5. Pay Page Updates
- **File:** `apps/web/src/pages/PayPage.tsx`
- `/pay?to=` URLs now create checkout sessions and redirect to hosted checkout
- Supports P2P payments through checkout flow

### 6. P2P Checkout Support
- **File:** `api/router.ts` - `handleCheckoutSessions()`
- Checkout sessions now support `recipientId` for P2P payments
- Falls back to merchant flow if `merchantId` is provided

### 7. Demo Button Removed
- **File:** `apps/web/src/pages/auth/LoginPage.tsx`
- No demo credentials shown on login page

---

## Vercel Projects Configuration

| Domain | Project | Status |
|--------|---------|--------|
| api.peeap.com | peeap-api | DEPLOYED with latest code |
| checkout.peeap.com | peeap-checkout | Needs deployment (hit limit) |
| my.peeap.com | card | Needs `my.peeap.com` domain configured |

---

## What Needs To Be Done

### 1. Deploy to checkout.peeap.com
When deployment limit resets (in ~11 hours from Dec 10, 7:20 AM UTC):
```bash
npx vercel link --project peeap-checkout --yes
npx vercel --prod --yes
```

### 2. Configure my.peeap.com Domain
The `my.peeap.com` domain needs to be added to the `card` project in Vercel dashboard:
- Go to Vercel Dashboard > card project > Settings > Domains
- Add `my.peeap.com` as a domain
- Or deploy to the card project:
```bash
npx vercel link --project card --yes
npx vercel --prod --yes
```

### 3. Link Card Project for Future Work
After deployments, link back to card project:
```bash
npx vercel link --project card --yes
```

---

## SDK Configuration
- **File:** `apps/web/public/embed/peeap-sdk.js`
- API URL: `https://api.peeap.com` (correct)
- Checkout URL: `https://checkout.peeap.com`
- Endpoint: `/api/checkout/create`

---

## Quick Commands

### Check Deployment Status
```bash
npx vercel ls
```

### Deploy to Specific Project
```bash
npx vercel link --project PROJECT_NAME --yes
npx vercel --prod --yes
```

### Verify API Working
```bash
curl https://api.peeap.com/api/router
```

---

## Files Modified (Not Yet on Production)

These files are in git but need deployment to my.peeap.com and checkout.peeap.com:

1. `apps/web/src/pages/PayoutPage.tsx` - NEW
2. `apps/web/src/types/web-nfc.d.ts` - NEW
3. `apps/web/src/services/qr-engine.ts` - MODIFIED
4. `apps/web/src/components/payment/ScanToPayModal.tsx` - MODIFIED
5. `apps/web/src/pages/PayPage.tsx` - MODIFIED
6. `apps/web/src/components/layout/MainLayout.tsx` - MODIFIED
7. `apps/web/src/pages/auth/LoginPage.tsx` - MODIFIED (demo removed)
8. `api/router.ts` - MODIFIED (P2P checkout support)

---

## Git History (Recent)
```
8af1025 Revert "Fix SDK CORS error - update API endpoint URL"
32c9f35 Fix SDK CORS error - update API endpoint URL
95c6193 Add missing page components
f86c29c Add Mobile Money Payout, fix QR scanning, and improve checkout flow
a078021 Fix success/cancel URLs to use checkout.peeap.com
```

---

## Known Issues

1. **Vercel Deployment Limit** - Hit 100 deployments/day. Resets in ~11 hours.
2. **my.peeap.com** - Domain not properly configured for card project. Shows older deployment.
3. **checkout.peeap.com** - Couldn't deploy due to limit. Existing deployment may work but missing latest features.

---

## Next Session Checklist

1. [ ] Check if deployment limit reset: `npx vercel ls`
2. [ ] Deploy to peeap-checkout: `npx vercel link --project peeap-checkout --yes && npx vercel --prod --yes`
3. [ ] Deploy to card (for my.peeap.com): `npx vercel link --project card --yes && npx vercel --prod --yes`
4. [ ] Verify all domains working:
   - `curl https://api.peeap.com/api/router`
   - `curl https://checkout.peeap.com`
   - `curl https://my.peeap.com`
5. [ ] Test QR scanning on hosted checkout
6. [ ] Test mobile money payout flow
7. [ ] Link back to card project for future development

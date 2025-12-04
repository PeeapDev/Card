# Three-Domain Deployment Guide

This guide walks you through deploying your Peeap payment platform across three separate domains:

- **checkout.peeap.com** - Hosted checkout pages (customer-facing)
- **api.peeap.com** - API and serverless functions
- **my.peeap.com** - Merchant dashboard and main app

## Architecture Overview

```
┌──────────────────────┐
│  checkout.peeap.com  │ ← Customers see this
│  (Checkout Pages)    │
└─────────┬────────────┘
          │
          │ API Calls
          ▼
┌──────────────────────┐     ┌──────────────────────┐
│   api.peeap.com      │────▶│   Supabase Database  │
│   (API/Functions)    │     │   (Single Instance)  │
└─────────┬────────────┘     └──────────────────────┘
          ▲                            ▲
          │                            │
          │ API Calls                  │
┌─────────┴────────────┐               │
│   my.peeap.com       │───────────────┘
│   (Merchant App)     │
└──────────────────────┘
```

---

## Prerequisites

1. **Vercel Account** - Sign up at https://vercel.com
2. **Supabase Database** - Already set up (single shared database)
3. **GitHub Repository** - Your code repository
4. **Domain Access** - Ability to configure DNS for peeap.com

---

## Step 1: Database Migration

Before deploying, add the required columns to your Supabase database:

```sql
-- Connect to your Supabase database and run:

ALTER TABLE checkout_sessions
ADD COLUMN IF NOT EXISTS merchant_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS merchant_logo_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS brand_color VARCHAR(7) DEFAULT '#4F46E5',
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{"qr": true, "card": true, "mobile": true}'::jsonb;
```

**How to run:**
1. Go to your Supabase dashboard
2. Click "SQL Editor" in the left sidebar
3. Paste the SQL above
4. Click "Run"

---

## Step 2: Deploy API (api.peeap.com)

This is the backend API that both checkout and merchant apps will use.

### 2.1 Create Vercel Project

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. **Project Name:** `peeap-api`
4. Click **"Configure Project"**

### 2.2 Configure Build Settings

```
Root Directory: ./
Framework Preset: Other
Build Command: (leave empty)
Output Directory: (leave empty)
Install Command: npm install
```

### 2.3 Set Environment Variables

Click **"Environment Variables"** and add these (replace with your actual values):

```bash
# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# Frontend URLs
FRONTEND_URL=https://checkout.peeap.com
MERCHANT_APP_URL=https://my.peeap.com
CORS_ORIGIN=https://checkout.peeap.com,https://my.peeap.com

# API Configuration
MERCHANT_SERVICE_URL=https://api.peeap.com
PORT=3006

# Payment Providers (Optional - add if using)
MONIME_API_KEY=your-monime-api-key
MONIME_API_SECRET=your-monime-secret
```

### 2.4 Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete (2-3 minutes)
3. You'll get a URL like `peeap-api.vercel.app`

### 2.5 Add Custom Domain

1. Go to **Project Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter: `api.peeap.com`
4. Follow instructions to add DNS records:
   - Type: `CNAME`
   - Name: `api`
   - Value: `cname.vercel-dns.com`
5. Wait for DNS propagation (5-30 minutes)

---

## Step 3: Deploy Checkout Pages (checkout.peeap.com)

This is the customer-facing checkout interface.

### 3.1 Create Second Vercel Project

1. Go to https://vercel.com/new
2. Import the **SAME** GitHub repository
3. **Project Name:** `peeap-checkout`
4. Click **"Configure Project"**

### 3.2 Configure Build Settings

```
Root Directory: apps/web
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 3.3 Set Environment Variables

```bash
# API Configuration
VITE_API_URL=https://api.peeap.com
VITE_MERCHANT_SERVICE_URL=https://api.peeap.com

# Frontend URL
VITE_FRONTEND_URL=https://checkout.peeap.com
FRONTEND_URL=https://checkout.peeap.com

# Supabase (SAME as API project)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait for build and deployment
3. You'll get a URL like `peeap-checkout.vercel.app`

### 3.5 Add Custom Domain

1. Go to **Project Settings** → **Domains**
2. Add: `checkout.peeap.com`
3. Add DNS record:
   - Type: `CNAME`
   - Name: `checkout`
   - Value: `cname.vercel-dns.com`

---

## Step 4: Deploy Merchant App (my.peeap.com)

This is the merchant dashboard and management interface.

### 4.1 Create Third Vercel Project

1. Go to https://vercel.com/new
2. Import the **SAME** GitHub repository again
3. **Project Name:** `peeap-merchant`
4. Click **"Configure Project"**

### 4.2 Configure Build Settings

```
Root Directory: apps/web
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 4.3 Set Environment Variables

```bash
# API Configuration
VITE_API_URL=https://api.peeap.com
VITE_MERCHANT_SERVICE_URL=https://api.peeap.com

# Frontend URLs
VITE_FRONTEND_URL=https://my.peeap.com
FRONTEND_URL=https://my.peeap.com
VITE_CHECKOUT_URL=https://checkout.peeap.com

# Supabase (SAME as other projects)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4.4 Deploy

1. Click **"Deploy"**
2. Wait for completion
3. You'll get a URL like `peeap-merchant.vercel.app`

### 4.5 Add Custom Domain

1. Go to **Project Settings** → **Domains**
2. Add: `my.peeap.com`
3. Add DNS record:
   - Type: `CNAME`
   - Name: `my`
   - Value: `cname.vercel-dns.com`

---

## Step 5: DNS Configuration Summary

Add these records to your domain registrar (e.g., Namecheap, GoDaddy, Cloudflare):

| Type  | Name     | Value                  | TTL  |
|-------|----------|------------------------|------|
| CNAME | api      | cname.vercel-dns.com   | Auto |
| CNAME | checkout | cname.vercel-dns.com   | Auto |
| CNAME | my       | cname.vercel-dns.com   | Auto |

**Note:** DNS changes can take 5 minutes to 24 hours to propagate globally.

---

## Step 6: Test the Integration

### Test 1: API Health Check

```bash
curl https://api.peeap.com/health
# Should return: {"status": "ok"}
```

### Test 2: Create Checkout Session

```bash
curl -X POST https://api.peeap.com/checkout/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "your-merchant-id",
    "amount": 50000,
    "currency": "SLE",
    "merchantName": "Test Merchant",
    "description": "Test Payment"
  }'
```

**Expected Response:**
```json
{
  "sessionId": "cs_abc123...",
  "url": "https://checkout.peeap.com/checkout/pay/cs_abc123...",
  "expiresAt": "2024-01-01T12:30:00Z"
}
```

### Test 3: Open Checkout Page

1. Visit the URL from Test 2
2. You should see the checkout page with 3 payment methods
3. Try selecting each method (QR, Card, Mobile)

### Test 4: Access Merchant Dashboard

1. Visit `https://my.peeap.com`
2. Login with your merchant credentials
3. Navigate to Developer → Integration
4. You should see the QuickIntegrationGuide with code snippets

---

## Step 7: Connect Projects to GitHub (Auto-Deploy)

For each Vercel project:

1. Go to **Project Settings** → **Git**
2. Connect to your GitHub repository
3. Set **Production Branch:** `main`
4. Enable **"Automatically deploy new commits"**

Now, whenever you push to GitHub:
- All three projects will auto-deploy
- No manual deployment needed

---

## Troubleshooting

### Issue: "CORS Error" when calling API

**Solution:** Check that:
1. API project has correct `CORS_ORIGIN` environment variable
2. The origin in the error matches one of the allowed origins
3. Redeploy API project after changing env vars

### Issue: Checkout page shows "Session not found"

**Solution:**
1. Check API logs: `https://vercel.com/[your-username]/peeap-api/logs`
2. Verify Supabase connection: Check `SUPABASE_URL` and keys
3. Ensure database migration (Step 1) was completed

### Issue: DNS not resolving

**Solution:**
1. Wait longer (DNS can take 24 hours)
2. Check DNS propagation: https://dnschecker.org
3. Verify CNAME records are correct
4. Remove any conflicting A records

### Issue: Build fails on Vercel

**Solution:**
1. Check build logs in Vercel dashboard
2. Verify `Root Directory` is correct:
   - API: `./` (root)
   - Checkout: `apps/web`
   - Merchant: `apps/web`
3. Ensure all environment variables are set

---

## Updating the Code

### Method 1: Push to GitHub (Recommended)

```bash
# Make your changes locally
git add .
git commit -m "Update checkout page"
git push origin main

# All three projects auto-deploy in ~2 minutes
```

### Method 2: Manual Redeploy

1. Go to Vercel dashboard
2. Select project
3. Click **"Deployments"** → **"Redeploy"**

---

## Monitoring

### Check Deployment Status

- API: https://vercel.com/[username]/peeap-api
- Checkout: https://vercel.com/[username]/peeap-checkout
- Merchant: https://vercel.com/[username]/peeap-merchant

### View Logs

Each project has real-time logs:
1. Go to project dashboard
2. Click **"Functions"** or **"Logs"**
3. Filter by time range or search

### Alerts

Set up alerts in Vercel:
1. Go to **Project Settings** → **Notifications**
2. Add email or Slack webhook
3. Choose events: Deployment failures, errors, etc.

---

## Cost Estimates

**Vercel:**
- Free tier: 100GB bandwidth/month
- Pro: $20/month per user (unlimited projects)

**Supabase:**
- Free tier: 500MB database, 2GB bandwidth
- Pro: $25/month (8GB database, 250GB bandwidth)

**Total estimated cost:** $0-$45/month depending on usage

---

## Security Checklist

- [ ] Environment variables set in Vercel (not in code)
- [ ] CORS configured to only allow specific domains
- [ ] Supabase Row Level Security (RLS) enabled
- [ ] API keys never exposed in frontend
- [ ] HTTPS enforced on all domains
- [ ] Database backups enabled in Supabase

---

## Support

If you encounter issues:

1. Check Vercel logs first
2. Review this guide's Troubleshooting section
3. Check Supabase logs and connection
4. Verify DNS configuration

---

## Quick Reference

### Vercel Project URLs (After Deployment)

- API: https://api.peeap.com
- Checkout: https://checkout.peeap.com
- Merchant: https://my.peeap.com

### Important Files

- API Config: `vercel.api.json`
- Checkout Config: `vercel.checkout.json`
- Merchant Config: `vercel.merchant.json`
- Environment Files: `.env.api`, `.env.checkout`, `.env.merchant`

### Common Commands

```bash
# Test API locally
npm run dev:api

# Test checkout locally
cd apps/web && npm run dev

# Build for production
npm run build

# Deploy all (via Git)
git push origin main
```

---

## Next Steps After Deployment

1. **Test all payment methods** (QR, Card, Mobile)
2. **Set up monitoring** (Vercel analytics + Sentry)
3. **Configure webhooks** for payment events
4. **Add custom domain email** (e.g., support@peeap.com)
5. **Set up backups** (Supabase automated backups)
6. **Add status page** (e.g., status.peeap.com)

---

**Deployment Date:** _________
**Deployed By:** _________
**Version:** 1.0.0

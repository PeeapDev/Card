# Three-Domain Architecture - Quick Summary

## ✅ What's Been Set Up

Your Peeap payment platform is now configured for a three-domain deployment:

```
checkout.peeap.com  →  Customer-facing checkout pages
api.peeap.com       →  Backend API and serverless functions
my.peeap.com        →  Merchant dashboard and management
```

All three domains share a **single Supabase database** (no need for multiple databases).

---

## 📁 Files Created

### Documentation (READ THESE FIRST!)
1. **QUICK_DEPLOY.md** ⭐ **START HERE**
   - Step-by-step checklist
   - Deploy in the correct order
   - Quick testing steps

2. **DEPLOYMENT_GUIDE.md**
   - Complete detailed guide
   - Troubleshooting section
   - Security checklist

3. **ENV_FILES_README.md**
   - Environment variables explained
   - How to get Supabase credentials
   - Security best practices

### Configuration Files
4. **vercel.api.json** - Vercel config for API project
5. **vercel.checkout.json** - Vercel config for checkout project
6. **vercel.merchant.json** - Vercel config for merchant app
7. **.env.api** - Template env vars for API
8. **.env.checkout** - Template env vars for checkout
9. **.env.merchant** - Template env vars for merchant app

### Code Updates
10. **api/router.ts** - Updated CORS for multiple domains

---

## 🚀 Next Steps (In Order!)

### 1. Read the Quick Deploy Guide
```bash
cat QUICK_DEPLOY.md
```

### 2. Get Your Supabase Credentials Ready

You need these from https://app.supabase.com:
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- SUPABASE_ANON_KEY
- DATABASE_URL

See **ENV_FILES_README.md** for detailed instructions on where to find each.

### 3. Run Database Migration

In your Supabase SQL Editor, run:
```sql
ALTER TABLE checkout_sessions
ADD COLUMN IF NOT EXISTS merchant_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS merchant_logo_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS brand_color VARCHAR(7) DEFAULT '#4F46E5',
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{"qr": true, "card": true, "mobile": true}'::jsonb;
```

### 4. Deploy to Vercel (in this order!)

**Deploy Order Matters!** Follow this sequence:

1. **First:** Deploy API (api.peeap.com)
   - Others depend on this
   - See QUICK_DEPLOY.md "Deploy 1"

2. **Second:** Deploy Checkout (checkout.peeap.com)
   - Needs API to be live
   - See QUICK_DEPLOY.md "Deploy 2"

3. **Third:** Deploy Merchant (my.peeap.com)
   - Needs both API and Checkout
   - See QUICK_DEPLOY.md "Deploy 3"

### 5. Configure DNS

Add these CNAME records to peeap.com:
```
api      → cname.vercel-dns.com
checkout → cname.vercel-dns.com
my       → cname.vercel-dns.com
```

### 6. Test End-to-End

Follow the test section in QUICK_DEPLOY.md to verify everything works.

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│         Customer clicks "Pay Now"               │
│         on merchant's website                   │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   JavaScript creates  │
        │   checkout session    │
        └───────────┬───────────┘
                    │
                    │ POST /api/checkout/sessions
                    ▼
        ┌───────────────────────┐
        │   api.peeap.com       │◄───┐
        │   (Creates session    │    │
        │    in Supabase)       │    │
        └───────────┬───────────┘    │
                    │                 │
                    │ Returns URL     │
                    ▼                 │
        ┌───────────────────────┐    │
        │  checkout.peeap.com   │    │
        │  /checkout/pay/:id    │    │ GET session
        │  (Shows QR, Card,     │────┘
        │   Mobile Money)       │
        └───────────┬───────────┘
                    │
                    │ Complete payment
                    ▼
        ┌───────────────────────┐
        │   api.peeap.com       │
        │   /complete           │
        │   (Process payment)   │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ Success! Redirect to  │
        │ merchant's success URL│
        └───────────────────────┘
```

---

## 🎯 What Merchants Will Do

After deployment, merchants can integrate in 3 easy steps:

### Step 1: Visit Developer Page
```
https://my.peeap.com/merchant/integration
```

### Step 2: Copy the Code
They'll see 4 integration methods:
- HTML Button (simplest)
- JavaScript (dynamic amounts)
- HTML Form (user inputs)
- Direct API (backend)

### Step 3: Paste on Their Website
Works with:
- WordPress
- Wix
- Squarespace
- Shopify
- Any HTML website
- Any website builder

---

## 🔧 Configuration Summary

### API Project (api.peeap.com)
**Purpose:** Handle all API requests, database operations
**Root Directory:** `./`
**Key Env Vars:** SUPABASE_*, DATABASE_URL, CORS_ORIGIN

### Checkout Project (checkout.peeap.com)
**Purpose:** Customer-facing checkout pages
**Root Directory:** `apps/web`
**Key Env Vars:** VITE_API_URL, VITE_SUPABASE_*

### Merchant Project (my.peeap.com)
**Purpose:** Merchant dashboard and management
**Root Directory:** `apps/web`
**Key Env Vars:** VITE_API_URL, VITE_CHECKOUT_URL

---

## 🔒 Security Features

✅ CORS restricted to specific domains
✅ Environment variables not in code
✅ Separate frontend/backend
✅ HTTPS enforced on all domains
✅ Service role key only in API (backend)
✅ Anon key in frontends (safe to expose)

---

## 💰 Cost Estimate

**Vercel:** Free tier supports this!
- 100GB bandwidth/month
- Unlimited deployments
- 3 projects (all free)

**Supabase:** Free tier likely sufficient
- 500MB database
- 2GB bandwidth/month

**Upgrade if needed:**
- Vercel Pro: $20/month (unlimited)
- Supabase Pro: $25/month (8GB DB)

**Total: $0-$45/month**

---

## 📞 Support Docs

| Question | See This File |
|----------|---------------|
| How do I deploy? | QUICK_DEPLOY.md |
| Detailed setup? | DEPLOYMENT_GUIDE.md |
| Environment variables? | ENV_FILES_README.md |
| Troubleshooting? | DEPLOYMENT_GUIDE.md (bottom) |

---

## ✨ Key Benefits of This Architecture

### Independent Scaling
- Checkout pages can scale separately from admin
- API can handle high load independently

### Security Isolation
- Checkout is sandboxed
- Admin is separate
- API is the only thing with database access

### Professional Structure
- Clean subdomain organization
- Easy to explain to merchants
- Looks enterprise-grade

### Developer Friendly
- One git push deploys all three
- Shared database = no sync issues
- Clear separation of concerns

---

## 🎉 You're Ready!

Everything is configured and pushed to GitHub.

**Next:** Open **QUICK_DEPLOY.md** and follow the steps to deploy!

```bash
# Start here
cat QUICK_DEPLOY.md

# Or for detailed guide
cat DEPLOYMENT_GUIDE.md
```

Good luck with your deployment! 🚀

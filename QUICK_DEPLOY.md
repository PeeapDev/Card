# Quick Deploy Checklist

Follow these steps in order for a successful three-domain deployment.

## ✅ Pre-Deployment Checklist

### 1. Database Setup
- [ ] Run migration SQL in Supabase (see DEPLOYMENT_GUIDE.md Step 1)
- [ ] Copy Supabase URL and keys
- [ ] Test database connection

### 2. Get Your Credentials Ready

You'll need these for all three deployments:

```bash
# Supabase (from https://app.supabase.com/project/[your-project]/settings/api)
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...  # Settings → API → service_role
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...     # Settings → API → anon public

# Database URL (from Settings → Database → Connection string → URI)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

---

## 🚀 Deploy in This Order

### Deploy 1: API (api.peeap.com) - FIRST!

**Why first?** The other two apps need the API running.

1. **Vercel:** New Project → Import repo → Name: `peeap-api`
2. **Settings:**
   - Root: `./`
   - Build: (empty)
   - Output: (empty)
3. **Environment Variables:** (Copy from `.env.api` file)
   ```bash
   SUPABASE_URL=https://[your-project].supabase.co
   SUPABASE_SERVICE_KEY=eyJ...
   SUPABASE_ANON_KEY=eyJ...
   DATABASE_URL=postgresql://postgres:...
   FRONTEND_URL=https://checkout.peeap.com
   MERCHANT_APP_URL=https://my.peeap.com
   CORS_ORIGIN=https://checkout.peeap.com,https://my.peeap.com
   ```
4. **Deploy** → Wait 2-3 minutes
5. **Add Domain:** `api.peeap.com`
6. **Test:** `curl https://api.peeap.com/health`

✅ **Success:** You should get `{"status": "ok"}` or similar

---

### Deploy 2: Checkout (checkout.peeap.com)

**Dependencies:** API must be deployed first.

1. **Vercel:** New Project → Same repo → Name: `peeap-checkout`
2. **Settings:**
   - Root: `apps/web`
   - Framework: `Vite`
   - Build: `npm run build`
   - Output: `dist`
3. **Environment Variables:** (Copy from `.env.checkout`)
   ```bash
   VITE_API_URL=https://api.peeap.com
   VITE_MERCHANT_SERVICE_URL=https://api.peeap.com
   VITE_FRONTEND_URL=https://checkout.peeap.com
   FRONTEND_URL=https://checkout.peeap.com
   VITE_SUPABASE_URL=https://[your-project].supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. **Deploy** → Wait 2-3 minutes
5. **Add Domain:** `checkout.peeap.com`
6. **Test:** Open `https://checkout.peeap.com` in browser

✅ **Success:** You should see the checkout page (may show "Invalid session" - that's OK!)

---

### Deploy 3: Merchant App (my.peeap.com)

**Dependencies:** API and Checkout must be deployed first.

1. **Vercel:** New Project → Same repo → Name: `peeap-merchant`
2. **Settings:**
   - Root: `apps/web`
   - Framework: `Vite`
   - Build: `npm run build`
   - Output: `dist`
3. **Environment Variables:** (Copy from `.env.merchant`)
   ```bash
   VITE_API_URL=https://api.peeap.com
   VITE_MERCHANT_SERVICE_URL=https://api.peeap.com
   VITE_FRONTEND_URL=https://my.peeap.com
   FRONTEND_URL=https://my.peeap.com
   VITE_CHECKOUT_URL=https://checkout.peeap.com
   VITE_SUPABASE_URL=https://[your-project].supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. **Deploy** → Wait 2-3 minutes
5. **Add Domain:** `my.peeap.com`
6. **Test:** Login at `https://my.peeap.com`

✅ **Success:** You should be able to login and access the merchant dashboard

---

## 🌐 DNS Configuration

Add these records to your domain (peeap.com):

| Type  | Name     | Value                |
|-------|----------|----------------------|
| CNAME | api      | cname.vercel-dns.com |
| CNAME | checkout | cname.vercel-dns.com |
| CNAME | my       | cname.vercel-dns.com |

**Wait:** 5-30 minutes for DNS to propagate

**Check:** https://dnschecker.org

---

## 🧪 End-to-End Test

### Test the Complete Flow

1. **Go to merchant app:**
   ```
   https://my.peeap.com/merchant/integration
   ```

2. **Copy the HTML button code** from QuickIntegrationGuide

3. **Create a test HTML file:**
   ```html
   <!DOCTYPE html>
   <html>
   <body>
     <!-- Paste the button code here -->
   </body>
   </html>
   ```

4. **Open the HTML file** → Click the button

5. **You should be redirected to:**
   ```
   https://checkout.peeap.com/checkout/pay/cs_xxxxx
   ```

6. **Try each payment method:**
   - [ ] QR Code - Should show dynamic QR
   - [ ] Card - Should show card form
   - [ ] Mobile Money - Should show login/register

✅ **Success:** All three payment methods work!

---

## ⚠️ Common Issues

### Issue 1: "CORS Error"
**Fix:** Redeploy API project after setting `CORS_ORIGIN` env var

### Issue 2: "Session not found"
**Fix:** Run database migration SQL (Step 1)

### Issue 3: Domain not loading
**Fix:** Wait longer (DNS takes time) or check DNS records

### Issue 4: Build failed
**Fix:** Check "Root Directory" setting in Vercel

---

## 📊 Verify All Three Projects

| Project  | URL                       | Status |
|----------|---------------------------|--------|
| API      | https://api.peeap.com     | [ ]    |
| Checkout | https://checkout.peeap.com| [ ]    |
| Merchant | https://my.peeap.com      | [ ]    |

---

## 🔄 Auto-Deploy Setup

For each project in Vercel:
1. Settings → Git
2. Production Branch: `main`
3. ✅ Enable auto-deploy

Now: `git push` → Auto deploys all three projects!

---

## 📝 Save These URLs

After successful deployment, save these for your team:

```
Production URLs:
- API: https://api.peeap.com
- Checkout: https://checkout.peeap.com
- Merchant: https://my.peeap.com

Vercel Dashboards:
- API: https://vercel.com/[your-team]/peeap-api
- Checkout: https://vercel.com/[your-team]/peeap-checkout
- Merchant: https://vercel.com/[your-team]/peeap-merchant

Database:
- Supabase: https://app.supabase.com/project/[project-id]
```

---

## ✨ Done!

Your three-domain architecture is live!

**Next:**
1. Test payment flow end-to-end
2. Share integration guide with merchants
3. Set up monitoring/alerts
4. Configure production payment keys

For detailed information, see **DEPLOYMENT_GUIDE.md**

# Environment Files Guide

This project has **three separate environment files** for the three-domain deployment architecture.

## File Overview

| File             | Used For                  | Domain              |
|------------------|---------------------------|---------------------|
| `.env.checkout`  | Checkout pages            | checkout.peeap.com  |
| `.env.api`       | API / Serverless functions| api.peeap.com       |
| `.env.merchant`  | Merchant dashboard        | my.peeap.com        |

**Important:** These files are for **reference only**. The actual environment variables must be set in **Vercel dashboard** for each project.

---

## How to Use These Files

### Option 1: Manual Copy-Paste (Recommended)

1. Open the appropriate `.env.*` file
2. Go to Vercel project → Settings → Environment Variables
3. Copy each variable from the file to Vercel
4. Replace placeholder values with real credentials

**Example:**
```bash
# In .env.checkout, you see:
VITE_SUPABASE_URL=your-supabase-project-url

# In Vercel, add:
Key: VITE_SUPABASE_URL
Value: https://akiecgwcxadcpqlvntmf.supabase.co
Environment: Production, Preview, Development
```

### Option 2: Vercel CLI (Advanced)

If you have Vercel CLI installed:

```bash
# For checkout project
cd /path/to/project
vercel env pull .env.checkout.local
# Then manually copy to Vercel dashboard

# Repeat for other projects
```

---

## Variable Mapping

### Shared Variables (Same for All Three)

These use the **SAME values** across all projects:

```bash
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

**Why?** All three projects connect to the same Supabase database.

### Project-Specific Variables

These are **different** for each project:

#### Checkout (.env.checkout)
```bash
VITE_FRONTEND_URL=https://checkout.peeap.com
FRONTEND_URL=https://checkout.peeap.com
```

#### API (.env.api)
```bash
FRONTEND_URL=https://checkout.peeap.com
MERCHANT_APP_URL=https://my.peeap.com
CORS_ORIGIN=https://checkout.peeap.com,https://my.peeap.com
```

#### Merchant (.env.merchant)
```bash
VITE_FRONTEND_URL=https://my.peeap.com
FRONTEND_URL=https://my.peeap.com
VITE_CHECKOUT_URL=https://checkout.peeap.com
```

---

## Getting Your Actual Values

### Supabase Credentials

1. Go to https://app.supabase.com
2. Select your project
3. Click **Settings** (left sidebar)
4. Click **API**

You'll find:
- `SUPABASE_URL` - Under "Project URL"
- `SUPABASE_ANON_KEY` - Under "Project API keys" → `anon` `public`
- `SUPABASE_SERVICE_KEY` - Under "Project API keys" → `service_role` `secret`

### Database URL

1. Still in Supabase Settings
2. Click **Database** (left sidebar)
3. Click **Connection string** tab
4. Select **URI**
5. Copy the connection string
6. Replace `[YOUR-PASSWORD]` with your actual database password

Example:
```bash
postgresql://postgres:your-password@db.akiecgwcxadcpqlvntmf.supabase.co:5432/postgres
```

### Payment Provider Keys

Add your payment provider credentials:

```bash
# Monime (if using)
MONIME_API_KEY=your-api-key-from-monime
MONIME_API_SECRET=your-secret-from-monime
```

---

## Security Best Practices

### ✅ DO:
- Set environment variables in Vercel dashboard
- Use different Supabase keys for different environments
- Rotate keys regularly
- Use service role key only in API project (backend)
- Use anon key in frontend projects (checkout, merchant)

### ❌ DON'T:
- Commit actual credentials to Git
- Share `.env` files with real values
- Use production keys in development
- Expose service role key in frontend

---

## Local Development

For local development, create these files (they're in `.gitignore`):

```bash
# For local checkout testing
.env.local

# Add:
VITE_API_URL=http://localhost:3006
VITE_FRONTEND_URL=http://localhost:5173
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Environment Variable Checklist

Use this checklist when deploying each project:

### API Project (api.peeap.com)
- [ ] SUPABASE_URL
- [ ] SUPABASE_SERVICE_KEY
- [ ] SUPABASE_ANON_KEY
- [ ] DATABASE_URL
- [ ] FRONTEND_URL
- [ ] MERCHANT_APP_URL
- [ ] CORS_ORIGIN
- [ ] MERCHANT_SERVICE_URL
- [ ] Payment provider keys (if applicable)

### Checkout Project (checkout.peeap.com)
- [ ] VITE_API_URL
- [ ] VITE_MERCHANT_SERVICE_URL
- [ ] VITE_FRONTEND_URL
- [ ] FRONTEND_URL
- [ ] VITE_SUPABASE_URL
- [ ] VITE_SUPABASE_ANON_KEY

### Merchant Project (my.peeap.com)
- [ ] VITE_API_URL
- [ ] VITE_MERCHANT_SERVICE_URL
- [ ] VITE_FRONTEND_URL
- [ ] FRONTEND_URL
- [ ] VITE_CHECKOUT_URL
- [ ] VITE_SUPABASE_URL
- [ ] VITE_SUPABASE_ANON_KEY

---

## Troubleshooting

### "Cannot connect to database"
**Fix:** Check `DATABASE_URL` format and password

### "CORS error"
**Fix:** Verify `CORS_ORIGIN` includes both domains (comma-separated)

### "Environment variable not found"
**Fix:** Make sure to add variables to ALL environments in Vercel:
- Production
- Preview
- Development

### "Supabase client error"
**Fix:** Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct

---

## Quick Reference

### Where to Set Variables

```
Vercel Dashboard → Select Project → Settings → Environment Variables
```

### Variable Prefixes

- `VITE_*` - Frontend variables (accessible in browser)
- No prefix - Backend variables (API only, not exposed)

**Important:** Only `VITE_*` variables are accessible in React/Vite apps!

---

## Need Help?

1. Check DEPLOYMENT_GUIDE.md for detailed setup
2. See QUICK_DEPLOY.md for step-by-step checklist
3. Review Vercel docs: https://vercel.com/docs/environment-variables

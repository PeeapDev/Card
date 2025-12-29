// Create hybrid subscription tables using Supabase REST API
const fs = require('fs');

const SUPABASE_URL = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

async function executeSql(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql_query: sql }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL execution failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function createTables() {
  console.log('Creating hybrid subscription tables...\n');

  // Table creation SQL (simpler version without functions/triggers)
  const tables = [
    {
      name: 'apps',
      sql: `
        CREATE TABLE IF NOT EXISTS apps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          icon VARCHAR(50),
          category VARCHAR(50),
          is_active BOOLEAN DEFAULT true,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
        CREATE POLICY IF NOT EXISTS "apps_public_read" ON apps FOR SELECT USING (true);
      `
    },
    {
      name: 'app_pricing',
      sql: `
        CREATE TABLE IF NOT EXISTS app_pricing (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
          tier VARCHAR(20) NOT NULL CHECK (tier IN ('starter', 'pro')),
          price_monthly DECIMAL(10,2) NOT NULL,
          price_yearly DECIMAL(10,2),
          currency VARCHAR(3) DEFAULT 'NLE',
          trial_days INTEGER DEFAULT 7,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(app_id, tier)
        );
        ALTER TABLE app_pricing ENABLE ROW LEVEL SECURITY;
        CREATE POLICY IF NOT EXISTS "app_pricing_public_read" ON app_pricing FOR SELECT USING (true);
      `
    },
    {
      name: 'app_feature_limits',
      sql: `
        CREATE TABLE IF NOT EXISTS app_feature_limits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
          tier VARCHAR(20) NOT NULL CHECK (tier IN ('starter', 'pro')),
          limit_key VARCHAR(50) NOT NULL,
          limit_value INTEGER NOT NULL,
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(app_id, tier, limit_key)
        );
        ALTER TABLE app_feature_limits ENABLE ROW LEVEL SECURITY;
        CREATE POLICY IF NOT EXISTS "app_feature_limits_public_read" ON app_feature_limits FOR SELECT USING (true);
      `
    },
    {
      name: 'subscription_bundles',
      sql: `
        CREATE TABLE IF NOT EXISTS subscription_bundles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          bundle_type VARCHAR(20) NOT NULL CHECK (bundle_type IN ('fixed', 'pick_n', 'all_access')),
          max_apps INTEGER,
          app_tier VARCHAR(20) DEFAULT 'starter' CHECK (app_tier IN ('starter', 'pro')),
          price_monthly DECIMAL(10,2) NOT NULL,
          price_yearly DECIMAL(10,2),
          currency VARCHAR(3) DEFAULT 'NLE',
          trial_days INTEGER DEFAULT 7,
          discount_percentage INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE subscription_bundles ENABLE ROW LEVEL SECURITY;
        CREATE POLICY IF NOT EXISTS "subscription_bundles_public_read" ON subscription_bundles FOR SELECT USING (true);
      `
    },
    {
      name: 'bundle_apps',
      sql: `
        CREATE TABLE IF NOT EXISTS bundle_apps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          bundle_id UUID NOT NULL REFERENCES subscription_bundles(id) ON DELETE CASCADE,
          app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(bundle_id, app_id)
        );
        ALTER TABLE bundle_apps ENABLE ROW LEVEL SECURITY;
        CREATE POLICY IF NOT EXISTS "bundle_apps_public_read" ON bundle_apps FOR SELECT USING (true);
      `
    },
    {
      name: 'user_app_subscriptions',
      sql: `
        CREATE TABLE IF NOT EXISTS user_app_subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          business_id UUID,
          subscription_type VARCHAR(20) NOT NULL CHECK (subscription_type IN ('app', 'bundle')),
          app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
          app_tier VARCHAR(20) CHECK (app_tier IN ('starter', 'pro')),
          bundle_id UUID REFERENCES subscription_bundles(id) ON DELETE SET NULL,
          selected_apps UUID[],
          price_monthly DECIMAL(10,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'NLE',
          status VARCHAR(20) NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
          trial_started_at TIMESTAMPTZ,
          trial_ends_at TIMESTAMPTZ,
          current_period_start TIMESTAMPTZ,
          current_period_end TIMESTAMPTZ,
          next_billing_date DATE,
          cancelled_at TIMESTAMPTZ,
          cancel_reason TEXT,
          cancel_at_period_end BOOLEAN DEFAULT false,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_user_app_subscriptions_user_id ON user_app_subscriptions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_app_subscriptions_status ON user_app_subscriptions(status);
        ALTER TABLE user_app_subscriptions ENABLE ROW LEVEL SECURITY;
      `
    },
    {
      name: 'user_app_subscription_invoices',
      sql: `
        CREATE TABLE IF NOT EXISTS user_app_subscription_invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          subscription_id UUID NOT NULL REFERENCES user_app_subscriptions(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          invoice_number VARCHAR(50),
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'NLE',
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
          period_start TIMESTAMPTZ,
          period_end TIMESTAMPTZ,
          paid_at TIMESTAMPTZ,
          payment_method VARCHAR(50),
          payment_reference VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_user_app_subscription_invoices_subscription_id ON user_app_subscription_invoices(subscription_id);
        ALTER TABLE user_app_subscription_invoices ENABLE ROW LEVEL SECURITY;
      `
    }
  ];

  // Try to use exec_sql RPC function if it exists
  try {
    for (const table of tables) {
      console.log(`Creating ${table.name} table...`);
      try {
        await executeSql(table.sql);
        console.log(`✓ ${table.name} created`);
      } catch (err) {
        if (err.message.includes('does not exist') || err.message.includes('not found')) {
          throw new Error('exec_sql function not available');
        }
        console.log(`  Warning: ${err.message}`);
      }
    }
    console.log('\n✅ All tables created successfully!');
  } catch (err) {
    console.log('\n⚠️  Cannot execute SQL directly via API.');
    console.log('   Please run the migration manually:\n');
    console.log('   1. Open Supabase SQL Editor:');
    console.log('      https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql\n');
    console.log('   2. Copy and paste this SQL:\n');

    // Output the combined SQL
    console.log('-- ============ HYBRID SUBSCRIPTION TABLES ============');
    console.log(fs.readFileSync('./scripts/migrations/080_hybrid_app_subscriptions.sql', 'utf8'));
    console.log('\n   3. Click "Run" to execute');
    console.log('   4. Then run: node run-hybrid-subscription-migration.js');
  }
}

createTables().catch(console.error);

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/web/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSubscriptionTables() {
  console.log('Creating subscription tables...\n');

  // 1. Merchant Subscription Plans
  const createPlansTable = `
    CREATE TABLE IF NOT EXISTS merchant_subscription_plans (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      merchant_id UUID NOT NULL,

      name VARCHAR(255) NOT NULL,
      description TEXT,
      features JSONB DEFAULT '[]',

      amount DECIMAL(12,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'SLE',
      interval VARCHAR(20) NOT NULL DEFAULT 'monthly',
      interval_count INTEGER DEFAULT 1,

      trial_days INTEGER DEFAULT 0,

      is_active BOOLEAN DEFAULT true,

      metadata JSONB DEFAULT '{}',

      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // 2. Customer Payment Methods
  const createPaymentMethodsTable = `
    CREATE TABLE IF NOT EXISTS customer_payment_methods (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      customer_id UUID,
      customer_email VARCHAR(255),
      customer_phone VARCHAR(50),

      type VARCHAR(20) NOT NULL,

      card_token TEXT,
      card_last_four VARCHAR(4),
      card_brand VARCHAR(20),
      card_exp_month INTEGER,
      card_exp_year INTEGER,

      wallet_id UUID,

      mobile_network VARCHAR(50),
      mobile_number VARCHAR(20),

      consent_given BOOLEAN DEFAULT false,
      consent_text TEXT,
      consented_at TIMESTAMP WITH TIME ZONE,
      consent_ip VARCHAR(45),

      is_default BOOLEAN DEFAULT true,
      is_active BOOLEAN DEFAULT true,

      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // 3. Customer Subscriptions
  const createSubscriptionsTable = `
    CREATE TABLE IF NOT EXISTS customer_subscriptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      plan_id UUID NOT NULL,
      merchant_id UUID NOT NULL,

      customer_id UUID,
      customer_email VARCHAR(255),
      customer_phone VARCHAR(50),
      customer_name VARCHAR(255),

      default_payment_method_id UUID,

      status VARCHAR(20) DEFAULT 'pending',

      current_period_start TIMESTAMP WITH TIME ZONE,
      current_period_end TIMESTAMP WITH TIME ZONE,

      trial_start TIMESTAMP WITH TIME ZONE,
      trial_end TIMESTAMP WITH TIME ZONE,

      next_billing_date DATE,

      canceled_at TIMESTAMP WITH TIME ZONE,
      cancel_reason TEXT,

      paused_at TIMESTAMP WITH TIME ZONE,
      resume_at TIMESTAMP WITH TIME ZONE,

      metadata JSONB DEFAULT '{}',

      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // 4. Subscription Invoices
  const createInvoicesTable = `
    CREATE TABLE IF NOT EXISTS subscription_invoices (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      subscription_id UUID NOT NULL,
      merchant_id UUID NOT NULL,

      invoice_number VARCHAR(50),

      amount DECIMAL(12,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'SLE',

      status VARCHAR(20) DEFAULT 'draft',

      billing_period_start TIMESTAMP WITH TIME ZONE,
      billing_period_end TIMESTAMP WITH TIME ZONE,

      due_date DATE,
      paid_at TIMESTAMP WITH TIME ZONE,

      payment_method_id UUID,
      payment_reference VARCHAR(255),
      payment_attempt_count INTEGER DEFAULT 0,
      last_payment_attempt TIMESTAMP WITH TIME ZONE,
      last_payment_error TEXT,

      show_pending_from DATE,

      metadata JSONB DEFAULT '{}',

      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // 5. Subscription Events (Audit Log)
  const createEventsTable = `
    CREATE TABLE IF NOT EXISTS subscription_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      subscription_id UUID NOT NULL,

      event_type VARCHAR(50) NOT NULL,

      data JSONB DEFAULT '{}',

      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // Execute all table creations
  const tables = [
    { name: 'merchant_subscription_plans', sql: createPlansTable },
    { name: 'customer_payment_methods', sql: createPaymentMethodsTable },
    { name: 'customer_subscriptions', sql: createSubscriptionsTable },
    { name: 'subscription_invoices', sql: createInvoicesTable },
    { name: 'subscription_events', sql: createEventsTable },
  ];

  for (const table of tables) {
    console.log(`Creating table: ${table.name}...`);
    const { error } = await supabase.rpc('exec_sql', { sql: table.sql });

    if (error) {
      // Try direct query if RPC doesn't exist
      const { error: directError } = await supabase.from('_migrations').select('id').limit(1);
      if (directError) {
        console.log(`  Note: Cannot create via RPC, trying alternative...`);
      }
      console.log(`  Error: ${error.message}`);
    } else {
      console.log(`  ✓ Created ${table.name}`);
    }
  }

  // Create indexes
  console.log('\nCreating indexes...');

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_subscription_plans_merchant ON merchant_subscription_plans(merchant_id)',
    'CREATE INDEX IF NOT EXISTS idx_payment_methods_customer ON customer_payment_methods(customer_email)',
    'CREATE INDEX IF NOT EXISTS idx_subscriptions_merchant ON customer_subscriptions(merchant_id)',
    'CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON customer_subscriptions(customer_email)',
    'CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON customer_subscriptions(status)',
    'CREATE INDEX IF NOT EXISTS idx_subscriptions_billing ON customer_subscriptions(next_billing_date)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON subscription_invoices(subscription_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_status ON subscription_invoices(status)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_due ON subscription_invoices(due_date)',
    'CREATE INDEX IF NOT EXISTS idx_events_subscription ON subscription_events(subscription_id)',
  ];

  for (const idx of indexes) {
    const { error } = await supabase.rpc('exec_sql', { sql: idx });
    if (!error) {
      console.log(`  ✓ Index created`);
    }
  }

  console.log('\n✅ Subscription tables setup complete!');
  console.log('\nRun this SQL in Supabase Dashboard if tables were not created:\n');

  // Print full SQL for manual execution
  console.log('='.repeat(60));
  console.log(createPlansTable + ';\n');
  console.log(createPaymentMethodsTable + ';\n');
  console.log(createSubscriptionsTable + ';\n');
  console.log(createInvoicesTable + ';\n');
  console.log(createEventsTable + ';');
  console.log('='.repeat(60));
}

createSubscriptionTables().catch(console.error);

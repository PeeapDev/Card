const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Starting hybrid subscription migration...\n');

  try {
    // 1. Seed apps
    console.log('Seeding apps...');
    const apps = [
      { slug: 'pos', name: 'Point of Sale', description: 'Complete POS system with inventory, sales tracking, and staff management', icon: 'shopping-cart', category: 'sales', sort_order: 1 },
      { slug: 'invoicing', name: 'Invoicing', description: 'Create and send professional invoices to customers', icon: 'file-text', category: 'payments', sort_order: 2 },
      { slug: 'events', name: 'Events & Tickets', description: 'Manage events, sell tickets, and track attendance', icon: 'calendar', category: 'marketing', sort_order: 3 },
      { slug: 'driver_wallet', name: 'Driver Wallet', description: 'Collect payments from drivers and agents in the field', icon: 'truck', category: 'logistics', sort_order: 4 },
      { slug: 'payment_links', name: 'Payment Links', description: 'Create shareable payment links for quick collections', icon: 'link', category: 'payments', sort_order: 5 },
      { slug: 'subscriptions', name: 'Subscriptions', description: 'Create recurring subscription plans for customers', icon: 'repeat', category: 'payments', sort_order: 6 },
      { slug: 'inventory', name: 'Inventory Management', description: 'Track stock levels, set alerts, and manage suppliers', icon: 'package', category: 'sales', sort_order: 7 },
      { slug: 'reports', name: 'Advanced Reports', description: 'Detailed analytics and business intelligence reports', icon: 'bar-chart', category: 'sales', sort_order: 8 },
      { slug: 'loyalty', name: 'Loyalty Program', description: 'Customer loyalty points and rewards program', icon: 'gift', category: 'marketing', sort_order: 9 },
      { slug: 'multi_location', name: 'Multi-Location', description: 'Manage multiple business locations from one dashboard', icon: 'map-pin', category: 'sales', sort_order: 10 }
    ];

    for (const app of apps) {
      const { error } = await supabase.from('apps').upsert(app, { onConflict: 'slug' });
      if (error && !error.message.includes('does not exist')) {
        console.log(`  Warning for ${app.slug}:`, error.message);
      }
    }
    console.log('✓ Apps seeded');

    // Get app IDs for pricing
    const { data: appData } = await supabase.from('apps').select('id, slug');
    const appMap = {};
    if (appData) {
      appData.forEach(a => appMap[a.slug] = a.id);
    }

    // 2. Seed app pricing
    console.log('Seeding app pricing...');
    const pricing = [
      { slug: 'pos', starter: 25, pro: 60 },
      { slug: 'invoicing', starter: 15, pro: 40 },
      { slug: 'events', starter: 20, pro: 50 },
      { slug: 'driver_wallet', starter: 20, pro: 50 },
      { slug: 'payment_links', starter: 10, pro: 30 },
      { slug: 'subscriptions', starter: 15, pro: 40 },
      { slug: 'inventory', starter: 15, pro: 35 },
      { slug: 'reports', starter: 20, pro: 45 },
      { slug: 'loyalty', starter: 15, pro: 40 },
      { slug: 'multi_location', starter: 30, pro: 80 }
    ];

    for (const p of pricing) {
      if (appMap[p.slug]) {
        await supabase.from('app_pricing').upsert([
          { app_id: appMap[p.slug], tier: 'starter', price_monthly: p.starter, price_yearly: p.starter * 10, trial_days: 7 },
          { app_id: appMap[p.slug], tier: 'pro', price_monthly: p.pro, price_yearly: p.pro * 10, trial_days: 7 }
        ], { onConflict: 'app_id,tier' });
      }
    }
    console.log('✓ App pricing seeded');

    // 3. Seed feature limits
    console.log('Seeding feature limits...');
    const limits = [
      { slug: 'pos', limits: [
        { key: 'max_products', starter: 15, pro: -1 },
        { key: 'max_staff', starter: 1, pro: -1 },
        { key: 'max_categories', starter: 3, pro: -1 }
      ]},
      { slug: 'driver_wallet', limits: [
        { key: 'max_collections_per_day', starter: 25, pro: -1 },
        { key: 'max_drivers', starter: 3, pro: -1 }
      ]},
      { slug: 'events', limits: [
        { key: 'max_events', starter: 5, pro: -1 },
        { key: 'max_staff', starter: 0, pro: -1 },
        { key: 'max_ticket_types', starter: 2, pro: -1 }
      ]},
      { slug: 'invoicing', limits: [
        { key: 'max_invoices_per_month', starter: 20, pro: -1 },
        { key: 'max_recurring', starter: 0, pro: -1 }
      ]},
      { slug: 'payment_links', limits: [
        { key: 'max_active_links', starter: 10, pro: -1 }
      ]},
      { slug: 'multi_location', limits: [
        { key: 'max_locations', starter: 2, pro: -1 }
      ]}
    ];

    for (const item of limits) {
      if (appMap[item.slug]) {
        for (const limit of item.limits) {
          await supabase.from('app_feature_limits').upsert([
            { app_id: appMap[item.slug], tier: 'starter', limit_key: limit.key, limit_value: limit.starter },
            { app_id: appMap[item.slug], tier: 'pro', limit_key: limit.key, limit_value: limit.pro }
          ], { onConflict: 'app_id,tier,limit_key' });
        }
      }
    }
    console.log('✓ Feature limits seeded');

    // 4. Seed bundles
    console.log('Seeding bundles...');
    const bundles = [
      { slug: 'starter_bundle', name: 'Starter Bundle', description: 'Pick any 2 apps at a discounted rate', bundle_type: 'pick_n', max_apps: 2, app_tier: 'starter', price_monthly: 35, price_yearly: 350, discount_percentage: 15, trial_days: 7, sort_order: 1 },
      { slug: 'growth_bundle', name: 'Growth Bundle', description: 'Pick any 3 apps with Pro features', bundle_type: 'pick_n', max_apps: 3, app_tier: 'pro', price_monthly: 120, price_yearly: 1200, discount_percentage: 20, trial_days: 10, sort_order: 2 },
      { slug: 'business_bundle', name: 'Business Bundle', description: 'Pick any 5 apps with Pro features', bundle_type: 'pick_n', max_apps: 5, app_tier: 'pro', price_monthly: 180, price_yearly: 1800, discount_percentage: 30, trial_days: 10, sort_order: 3 },
      { slug: 'all_access', name: 'All Access', description: 'Unlimited access to all apps with Pro features', bundle_type: 'all_access', max_apps: null, app_tier: 'pro', price_monthly: 350, price_yearly: 3500, discount_percentage: 40, trial_days: 14, sort_order: 4 }
    ];

    for (const bundle of bundles) {
      const { error } = await supabase.from('subscription_bundles').upsert(bundle, { onConflict: 'slug' });
      if (error && !error.message.includes('does not exist')) {
        console.log(`  Warning for ${bundle.slug}:`, error.message);
      }
    }
    console.log('✓ Bundles seeded');

    console.log('\n✅ Hybrid subscription migration complete!');

    // Verify
    console.log('\nVerifying...');
    const { data: appsResult, count: appsCount } = await supabase.from('apps').select('*', { count: 'exact', head: true });
    const { data: pricingResult, count: pricingCount } = await supabase.from('app_pricing').select('*', { count: 'exact', head: true });
    const { data: bundlesResult, count: bundlesCount } = await supabase.from('subscription_bundles').select('*', { count: 'exact', head: true });

    console.log(`  Apps: ${appsCount || 'table may not exist'}`);
    console.log(`  Pricing entries: ${pricingCount || 'table may not exist'}`);
    console.log(`  Bundles: ${bundlesCount || 'table may not exist'}`);

    // If tables don't exist, show instructions
    if (!appsCount) {
      console.log('\n⚠️  Tables do not exist yet. Please run the SQL migration first:');
      console.log('   1. Go to https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql');
      console.log('   2. Copy and run scripts/migrations/080_hybrid_app_subscriptions.sql');
      console.log('   3. Then run this script again to seed the data');
    }

  } catch (error) {
    console.error('Migration failed:', error.message);

    if (error.message.includes('does not exist')) {
      console.log('\n⚠️  Tables need to be created first!');
      console.log('   Please run the SQL migration in Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql');
      console.log('   Copy and paste: scripts/migrations/080_hybrid_app_subscriptions.sql');
    }
  }
}

runMigration().catch(console.error);

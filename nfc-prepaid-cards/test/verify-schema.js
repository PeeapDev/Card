/**
 * Quick schema verification script
 * Run with: node nfc-prepaid-cards/test/verify-schema.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nRun with: source .env && node nfc-prepaid-cards/test/verify-schema.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = [
  'nfc_card_programs',
  'nfc_card_batches',
  'nfc_card_vendors',
  'nfc_vendor_inventory',
  'nfc_prepaid_cards',
  'nfc_card_transactions',
  'nfc_card_reloads',
  'nfc_vendor_sales',
  'nfc_vendor_settlements',
  'nfc_key_management',
  'nfc_terminals',
  'nfc_audit_log',
  'nfc_fraud_rules',
  'nfc_card_replacements',
];

async function verifySchema() {
  console.log('\n📋 Verifying NFC Prepaid Card Schema\n');
  console.log('='.repeat(50));

  let allPassed = true;

  for (const table of TABLES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
        allPassed = false;
      } else {
        console.log(`✅ ${table}`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
      allPassed = false;
    }
  }

  console.log('='.repeat(50));

  if (allPassed) {
    console.log('\n✅ All tables exist! Schema is ready.\n');

    // Check default programs
    const { data: programs } = await supabase
      .from('nfc_card_programs')
      .select('program_code, program_name, card_price, initial_balance')
      .order('card_price');

    if (programs && programs.length > 0) {
      console.log('📦 Default Card Programs:');
      console.log('-'.repeat(50));
      programs.forEach(p => {
        console.log(`   ${p.program_code}: ${p.program_name}`);
        console.log(`      Price: Le ${p.card_price.toLocaleString()}, Balance: Le ${p.initial_balance.toLocaleString()}`);
      });
    }

    // Check fraud rules
    const { data: rules } = await supabase
      .from('nfc_fraud_rules')
      .select('rule_code, rule_name, rule_type')
      .eq('is_active', true);

    if (rules && rules.length > 0) {
      console.log('\n🛡️  Active Fraud Rules:');
      console.log('-'.repeat(50));
      rules.forEach(r => {
        console.log(`   ${r.rule_code}: ${r.rule_name} (${r.rule_type})`);
      });
    }

  } else {
    console.log('\n❌ Some tables are missing. Please run the migrations:\n');
    console.log('   psql $DATABASE_URL -f nfc-prepaid-cards/migrations/001_nfc_prepaid_cards_schema.sql');
    console.log('   psql $DATABASE_URL -f nfc-prepaid-cards/migrations/002_nfc_helper_functions.sql');
  }

  console.log('\n');
}

verifySchema();

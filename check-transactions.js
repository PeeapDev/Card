const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== Checking Transactions ===\n');

  // Check all recent transactions
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (txError) {
    console.log('Transaction query error:', txError);
  } else {
    console.log('Recent transactions count:', transactions?.length || 0);
    if (transactions && transactions.length > 0) {
      transactions.forEach(tx => {
        console.log(`  - ${tx.id}: ${tx.type} ${tx.amount} ${tx.currency} - ${tx.status} - ${tx.reference}`);
      });
    } else {
      console.log('  NO TRANSACTIONS FOUND!');
    }
  }

  // Check transactions table structure
  console.log('\n=== Checking Table Structure ===\n');
  const { data: columns, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'transactions' });

  if (colError) {
    console.log('Could not get columns via RPC, trying direct query...');

    // Try inserting a test transaction to see what fields are available
    const testInsert = await supabase.from('transactions').insert({
      wallet_id: '00000000-0000-0000-0000-000000000000',
      type: 'TEST',
      amount: 0,
      currency: 'SLE',
      status: 'TEST',
      description: 'Test to check schema',
      reference: 'TEST-SCHEMA-CHECK',
    }).select();

    console.log('Test insert result:', testInsert);

    if (testInsert.error) {
      console.log('Insert error details:', JSON.stringify(testInsert.error, null, 2));
    }

    // Delete test if it was created
    if (testInsert.data) {
      await supabase.from('transactions').delete().eq('reference', 'TEST-SCHEMA-CHECK');
    }
  } else {
    console.log('Table columns:', columns);
  }

  // Check specific transaction reference
  console.log('\n=== Checking Specific Reference ===\n');
  const { data: specific, error: specError } = await supabase
    .from('transactions')
    .select('*')
    .eq('reference', 'SCAN-1765427110794-gr8nkcai6');

  console.log('Transaction with ref SCAN-1765427110794-gr8nkcai6:', specific || 'NOT FOUND');
  if (specError) console.log('Error:', specError);

  // Check wallets for the merchant
  console.log('\n=== Checking Merchant Wallet ===\n');
  const { data: merchantBiz } = await supabase
    .from('merchant_businesses')
    .select('id, name, merchant_id')
    .eq('id', 'f0c164b7-b608-4ca3-88d9-bc576d765160')
    .single();

  console.log('Merchant business:', merchantBiz);

  if (merchantBiz) {
    const { data: merchantWallet } = await supabase
      .from('wallets')
      .select('id, balance, user_id, wallet_type')
      .eq('user_id', merchantBiz.merchant_id);

    console.log('Merchant wallets:', merchantWallet);
  }

  // Check payer wallet
  console.log('\n=== Checking Payer Wallet ===\n');
  const { data: payerWallet } = await supabase
    .from('wallets')
    .select('id, balance, user_id, wallet_type')
    .eq('user_id', '900e6e7f-f698-410a-8c78-53bbaa44ffa5');

  console.log('Payer wallets:', payerWallet);
}

main().catch(console.error);

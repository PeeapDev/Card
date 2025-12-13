// Update payment_settings with correct URLs
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePaymentUrls() {
  const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

  // First check current values
  const { data: current, error: readError } = await supabase
    .from('payment_settings')
    .select('backend_url, frontend_url')
    .eq('id', SETTINGS_ID)
    .single();

  console.log('Current settings:', current);

  if (readError) {
    console.error('Error reading settings:', readError);
    return;
  }

  // Update with correct URLs
  const { data, error } = await supabase
    .from('payment_settings')
    .update({
      backend_url: 'https://api.peeap.com',
      frontend_url: 'https://my.peeap.com',
      updated_at: new Date().toISOString()
    })
    .eq('id', SETTINGS_ID)
    .select();

  if (error) {
    console.error('Error updating settings:', error);
  } else {
    console.log('Updated settings:', data);
    console.log('\nPayment URLs configured:');
    console.log('  Backend URL: https://api.peeap.com');
    console.log('  Frontend URL: https://my.peeap.com');
  }
}

updatePaymentUrls();

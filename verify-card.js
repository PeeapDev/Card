const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://akiecgwcxadcpqlvntmf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs'
);

async function verifyCard() {
  const cardId = '426a2ba3-ae29-4063-9691-70a224db37a6';
  
  const { data, error } = await supabase
    .from('cards')
    .select('id, wallet_id, cardholder_name, transaction_pin, status')
    .eq('id', cardId)
    .single();

  console.log('Card by ID lookup:', { data, error });
  
  if (data) {
    console.log('Transaction PIN set?', !!data.transaction_pin);
    console.log('PIN value:', data.transaction_pin);
  }
}

verifyCard();

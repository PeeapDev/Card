const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://akiecgwcxadcpqlvntmf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs'
);

async function checkColumns() {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', '426a2ba3-ae29-4063-9691-70a224db37a6')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Card columns:', Object.keys(data));
  console.log('Card data:', data);
}

checkColumns();

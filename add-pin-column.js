const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://akiecgwcxadcpqlvntmf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs'
);

async function addPinColumn() {
  // Add transaction_pin column to cards table
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE cards 
      ADD COLUMN IF NOT EXISTS transaction_pin VARCHAR(4);
    `
  });

  if (error) {
    console.error('Error adding column:', error);
    
    // Try direct SQL via postgres
    const { error: error2 } = await supabase
      .from('cards')
      .update({ transaction_pin: null })
      .eq('id', '00000000-0000-0000-0000-000000000000'); // This will fail but might create column
      
    console.log('Alternative attempt:', error2);
    return;
  }
  
  console.log('Column added successfully');
}

addPinColumn();

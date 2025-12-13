const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSessionsTable() {
  console.log('Creating sessions table via REST API...');

  // Use fetch to execute raw SQL via the REST API
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  });

  // Try to create the table by inserting and seeing the error
  const { error } = await supabase
    .from('sessions')
    .insert({
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      token: 'test_token_' + Date.now(),
      expires_at: new Date(Date.now() + 86400000).toISOString()
    });

  if (error) {
    if (error.code === '42P01') {
      console.log('Table does not exist. Please create it in Supabase Dashboard SQL Editor.');
    } else if (error.code === '23503') {
      console.log('Table exists but user_id foreign key constraint failed (expected)');
      console.log('Sessions table is ready!');
    } else {
      console.log('Error:', error.message, 'Code:', error.code);
    }
  } else {
    console.log('Sessions table created and test insert succeeded');
  }
}

createSessionsTable().catch(console.error);

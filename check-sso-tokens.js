const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://akiecgwcxadcpqlvntmf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs');

async function checkTokens() {
  // Get a real user ID first
  const { data: users } = await supabase.from('users').select('id').limit(1);
  if (!users || users.length === 0) {
    console.log('No users found');
    return;
  }

  const userId = users[0].id;
  console.log('Testing with user:', userId);

  // Try inserting a session token
  const testToken = 'test_session_' + Date.now() + '_' + Math.random().toString(36).substr(2);

  const { data, error } = await supabase
    .from('sso_tokens')
    .insert({
      user_id: userId,
      token: testToken,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      target_app: 'peeap-pay'
    })
    .select()
    .single();

  if (error) {
    console.log('Insert error:', error.message);
  } else {
    console.log('Token created:', data);
    console.log('Columns:', Object.keys(data).join(', '));

    // Clean up test token
    await supabase.from('sso_tokens').delete().eq('token', testToken);
    console.log('Test token cleaned up');
  }
}
checkTokens();

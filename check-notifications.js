// Check and test notifications table
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wnxgjpsicbxnxwmyigsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndueGdqcHNpY2J4bnh3bXlpZ3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2Njg5NDcsImV4cCI6MjA2MzI0NDk0N30.sUvG8JHqcTfJwHOIl8O3rlP0UD3dRPYfvqULppKLWKA'
);

async function checkNotifications() {
  console.log('Checking notifications table...\n');

  // First check if table exists by trying to select
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .limit(10);

  if (error) {
    console.log('❌ Error accessing notifications table:', error.message);
    console.log('\nPlease run the SQL in create-notifications-table.sql in Supabase SQL Editor first.');
    return;
  }

  console.log('✅ Notifications table exists');
  console.log(`📊 Found ${data.length} notifications\n`);

  if (data.length > 0) {
    console.log('Recent notifications:');
    data.forEach(n => {
      console.log(`  - [${n.type}] ${n.title} (user: ${n.user_id.substring(0, 8)}...)`);
    });
  } else {
    console.log('No notifications in database yet.');
  }
}

checkNotifications().catch(console.error);

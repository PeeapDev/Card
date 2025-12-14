// Check notifications and send a test one
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wnxgjpsicbxnxwmyigsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndueGdqcHNpY2J4bnh3bXlpZ3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2Njg5NDcsImV4cCI6MjA2MzI0NDk0N30.sUvG8JHqcTfJwHOIl8O3rlP0UD3dRPYfvqULppKLWKA'
);

async function main() {
  console.log('=== Checking Notifications System ===\n');

  // 1. Check if notifications table exists and has data
  console.log('1. Checking notifications table...');
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .limit(10);

  if (notifError) {
    console.log('   ERROR:', notifError.message);
    console.log('   Make sure you ran create-notifications-table.sql');
    return;
  }
  console.log(`   Found ${notifications.length} notifications in database`);
  if (notifications.length > 0) {
    console.log('   Recent notifications:');
    notifications.forEach(n => {
      console.log(`   - [${n.type}] "${n.title}" for user ${n.user_id.substring(0, 8)}...`);
    });
  }

  // 2. Check pos_staff table for linked users
  console.log('\n2. Checking pos_staff table...');
  const { data: staff, error: staffError } = await supabase
    .from('pos_staff')
    .select('*')
    .not('user_id', 'is', null)
    .limit(10);

  if (staffError) {
    console.log('   ERROR:', staffError.message);
    return;
  }
  console.log(`   Found ${staff.length} staff members with linked user accounts`);

  if (staff.length > 0) {
    console.log('\n   Staff with user accounts:');
    for (const s of staff) {
      console.log(`   - ${s.name} (${s.role})`);
      console.log(`     Staff ID: ${s.id}`);
      console.log(`     User ID: ${s.user_id}`);
      console.log(`     Invitation Status: ${s.invitation_status || 'not set'}`);

      // Check if there's a notification for this staff
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', s.user_id)
        .eq('type', 'staff_invitation')
        .limit(1);

      if (existingNotif && existingNotif.length > 0) {
        console.log(`     Has notification: YES (responded: ${existingNotif[0].action_data?.responded || false})`);
      } else {
        console.log(`     Has notification: NO`);

        // Create notification for this staff member
        console.log(`\n   Creating notification for ${s.name}...`);

        // Get merchant info
        const { data: merchant } = await supabase
          .from('merchants')
          .select('business_name')
          .eq('id', s.merchant_id)
          .single();

        const merchantName = merchant?.business_name || 'A business';

        const { data: newNotif, error: createError } = await supabase
          .from('notifications')
          .insert({
            user_id: s.user_id,
            type: 'staff_invitation',
            title: 'Staff Invitation',
            message: `You've been invited to join ${merchantName} as a ${s.role}. Accept or decline the invitation below.`,
            icon: 'UserPlus',
            action_url: `/dashboard/staff/setup-pin?merchant=${s.merchant_id}`,
            action_data: {
              staffId: s.id,
              merchantId: s.merchant_id,
              merchantName: merchantName,
              role: s.role,
              responded: false,
            },
            source_service: 'pos',
            source_id: s.id,
            priority: 'high',
            is_read: false,
          })
          .select()
          .single();

        if (createError) {
          console.log(`   ERROR creating notification:`, createError.message);
        } else {
          console.log(`   SUCCESS! Notification created with ID: ${newNotif.id}`);
        }
      }
    }
  }

  // 3. List all users to help identify the correct user
  console.log('\n3. Checking users table for reference...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name')
    .limit(10);

  if (!usersError && users) {
    console.log('   Users in system:');
    users.forEach(u => {
      console.log(`   - ${u.first_name} ${u.last_name} (${u.email}) - ID: ${u.id.substring(0, 8)}...`);
    });
  }

  console.log('\n=== Done ===');
  console.log('\nIf notification was created, refresh the user dashboard and click the bell icon.');
}

main().catch(console.error);

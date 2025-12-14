// Run checkout sessions RLS migration for driver collection
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running checkout sessions RLS migration for driver collection...');

  const sql = `
    -- Allow authenticated users to INSERT checkout sessions (for driver collection)
    DROP POLICY IF EXISTS "Users can create checkout sessions" ON checkout_sessions;
    CREATE POLICY "Users can create checkout sessions"
        ON checkout_sessions
        FOR INSERT
        TO authenticated
        WITH CHECK (true);

    -- Allow authenticated users to view their own created sessions (by metadata->driverId)
    DROP POLICY IF EXISTS "Users can view own checkout sessions" ON checkout_sessions;
    CREATE POLICY "Users can view own checkout sessions"
        ON checkout_sessions
        FOR SELECT
        TO authenticated
        USING (
            metadata->>'driverId' = auth.uid()::text
            OR merchant_id IN (SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid())
        );

    -- Allow authenticated users to update their own sessions (for cancellation)
    DROP POLICY IF EXISTS "Users can update own checkout sessions" ON checkout_sessions;
    CREATE POLICY "Users can update own checkout sessions"
        ON checkout_sessions
        FOR UPDATE
        TO authenticated
        USING (metadata->>'driverId' = auth.uid()::text)
        WITH CHECK (metadata->>'driverId' = auth.uid()::text);
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // If exec_sql doesn't exist, try raw query approach
      console.log('exec_sql not available, using direct approach...');

      // Split into individual statements and run them
      const statements = [
        `DROP POLICY IF EXISTS "Users can create checkout sessions" ON checkout_sessions`,
        `CREATE POLICY "Users can create checkout sessions" ON checkout_sessions FOR INSERT TO authenticated WITH CHECK (true)`,
        `DROP POLICY IF EXISTS "Users can view own checkout sessions" ON checkout_sessions`,
        `CREATE POLICY "Users can view own checkout sessions" ON checkout_sessions FOR SELECT TO authenticated USING (metadata->>'driverId' = auth.uid()::text OR merchant_id IN (SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid()))`,
        `DROP POLICY IF EXISTS "Users can update own checkout sessions" ON checkout_sessions`,
        `CREATE POLICY "Users can update own checkout sessions" ON checkout_sessions FOR UPDATE TO authenticated USING (metadata->>'driverId' = auth.uid()::text) WITH CHECK (metadata->>'driverId' = auth.uid()::text)`
      ];

      console.log('Please run these SQL statements in the Supabase dashboard SQL Editor:');
      console.log('');
      console.log(sql);
      console.log('');
      console.log('Or go to: https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql');
      return;
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err.message);
    console.log('');
    console.log('Please run this SQL manually in the Supabase dashboard:');
    console.log('https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql');
    console.log('');
    console.log(sql);
  }
}

runMigration();

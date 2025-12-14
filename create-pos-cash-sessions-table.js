/**
 * Create POS Cash Sessions Table
 *
 * Tracks daily opening and closing balances for cash drawer management
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createCashSessionsTable() {
  console.log('Creating POS Cash Sessions table...\n');

  const sql = `
    -- POS Cash Sessions Table
    CREATE TABLE IF NOT EXISTS pos_cash_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_date DATE NOT NULL,

      -- Opening
      opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
      opened_by UUID REFERENCES users(id),
      opened_at TIMESTAMPTZ,

      -- Closing
      closing_balance DECIMAL(15,2),
      expected_balance DECIMAL(15,2),
      cash_sales_total DECIMAL(15,2) DEFAULT 0,
      difference DECIMAL(15,2),
      closed_by UUID REFERENCES users(id),
      closed_at TIMESTAMPTZ,

      -- Cash In/Out during the day
      cash_in DECIMAL(15,2) DEFAULT 0,
      cash_out DECIMAL(15,2) DEFAULT 0,

      -- Status
      status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, closed
      notes TEXT,

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),

      -- Ensure only one session per merchant per day
      UNIQUE(merchant_id, session_date)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_merchant ON pos_cash_sessions(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_date ON pos_cash_sessions(session_date DESC);
    CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_status ON pos_cash_sessions(status);

    -- Enable RLS
    ALTER TABLE pos_cash_sessions ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Users can manage their own cash sessions" ON pos_cash_sessions;

    -- Create policy - users can only access their own cash sessions
    CREATE POLICY "Users can manage their own cash sessions" ON pos_cash_sessions
      FOR ALL USING (merchant_id = auth.uid());
  `;

  // Try to run via REST API
  console.log('Executing SQL...');

  // Split SQL into individual statements and execute one by one
  const statements = sql.split(';').filter(s => s.trim().length > 0);

  for (const statement of statements) {
    const trimmedStmt = statement.trim();
    if (!trimmedStmt) continue;

    console.log(`  Running: ${trimmedStmt.substring(0, 50)}...`);

    try {
      // Use raw SQL via the REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sql: trimmedStmt + ';' }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`    Note: ${errorText.substring(0, 100)}`);
      } else {
        console.log('    ✓ Done');
      }
    } catch (err) {
      console.log(`    Note: ${err.message}`);
    }
  }

  console.log('\n---\nIf the above failed, run this SQL in Supabase SQL Editor:\n');
  console.log(sql);
}

// Main execution
async function main() {
  try {
    // First, check if table already exists
    const { data, error } = await supabase
      .from('pos_cash_sessions')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('pos_cash_sessions table already exists!');

      // Show sample data
      const { data: sessions, error: listError } = await supabase
        .from('pos_cash_sessions')
        .select('*')
        .limit(5);

      if (!listError && sessions) {
        console.log(`Found ${sessions.length} existing sessions`);
      }
      return;
    }

    // Table doesn't exist, create it
    await createCashSessionsTable();

    console.log('\n✓ pos_cash_sessions table created successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

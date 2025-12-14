const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyODMwNjg4NywiZXhwIjoyMDQzODgyODg3fQ.UVKBA-ULJZJ4poLXNBXLaXtKFmLHfdPFMfWpSRwqGE4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createCashSessionsTable() {
  console.log('Creating pos_cash_sessions table...');

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Create pos_cash_sessions table for cash management
      CREATE TABLE IF NOT EXISTS pos_cash_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_date DATE NOT NULL DEFAULT CURRENT_DATE,
        opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
        closing_balance DECIMAL(15,2),
        expected_balance DECIMAL(15,2),
        cash_sales_total DECIMAL(15,2) DEFAULT 0,
        cash_in DECIMAL(15,2) DEFAULT 0,
        cash_out DECIMAL(15,2) DEFAULT 0,
        difference DECIMAL(15,2),
        status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        opened_by UUID REFERENCES users(id),
        opened_at TIMESTAMPTZ DEFAULT NOW(),
        closed_by UUID REFERENCES users(id),
        closed_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(merchant_id, session_date)
      );

      -- Create index for faster lookups
      CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_merchant ON pos_cash_sessions(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_date ON pos_cash_sessions(session_date);
      CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_status ON pos_cash_sessions(status);

      -- Enable RLS
      ALTER TABLE pos_cash_sessions ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view own cash sessions" ON pos_cash_sessions;
      DROP POLICY IF EXISTS "Users can insert own cash sessions" ON pos_cash_sessions;
      DROP POLICY IF EXISTS "Users can update own cash sessions" ON pos_cash_sessions;

      -- Create RLS policies
      CREATE POLICY "Users can view own cash sessions" ON pos_cash_sessions
        FOR SELECT USING (merchant_id = auth.uid());

      CREATE POLICY "Users can insert own cash sessions" ON pos_cash_sessions
        FOR INSERT WITH CHECK (merchant_id = auth.uid());

      CREATE POLICY "Users can update own cash sessions" ON pos_cash_sessions
        FOR UPDATE USING (merchant_id = auth.uid());
    `
  });

  if (error) {
    console.error('Error with RPC, trying direct SQL approach...');

    // Try creating table directly
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS pos_cash_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id UUID NOT NULL,
        session_date DATE NOT NULL DEFAULT CURRENT_DATE,
        opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
        closing_balance DECIMAL(15,2),
        expected_balance DECIMAL(15,2),
        cash_sales_total DECIMAL(15,2) DEFAULT 0,
        cash_in DECIMAL(15,2) DEFAULT 0,
        cash_out DECIMAL(15,2) DEFAULT 0,
        difference DECIMAL(15,2),
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        opened_by UUID,
        opened_at TIMESTAMPTZ DEFAULT NOW(),
        closed_by UUID,
        closed_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('Please run the following SQL in Supabase SQL Editor:');
    console.log('');
    console.log(`
-- Create pos_cash_sessions table for cash management
CREATE TABLE IF NOT EXISTS pos_cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(15,2),
  expected_balance DECIMAL(15,2),
  cash_sales_total DECIMAL(15,2) DEFAULT 0,
  cash_in DECIMAL(15,2) DEFAULT 0,
  cash_out DECIMAL(15,2) DEFAULT 0,
  difference DECIMAL(15,2),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_by UUID REFERENCES users(id),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_by UUID REFERENCES users(id),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, session_date)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_merchant ON pos_cash_sessions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_date ON pos_cash_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_status ON pos_cash_sessions(status);

-- Enable RLS
ALTER TABLE pos_cash_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own cash sessions" ON pos_cash_sessions
  FOR SELECT USING (merchant_id = auth.uid());

CREATE POLICY "Users can insert own cash sessions" ON pos_cash_sessions
  FOR INSERT WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Users can update own cash sessions" ON pos_cash_sessions
  FOR UPDATE USING (merchant_id = auth.uid());
`);
    return;
  }

  console.log('Table created successfully!');
}

createCashSessionsTable().catch(console.error);

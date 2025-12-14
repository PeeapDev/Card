// Run subscription migration using postgres client
const { Client } = require('pg');
const fs = require('fs');

// Connection string - using pooler for better connectivity
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.akiecgwcxadcpqlvntmf:YourPassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    // Read the SQL file
    const sql = fs.readFileSync('./scripts/migrations/036_merchant_subscriptions.sql', 'utf8');

    console.log('Running merchant subscriptions migration...');
    await client.query(sql);

    console.log('Migration completed successfully!');

    // Verify the tables were created
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('merchant_subscriptions', 'merchant_subscription_invoices')
    `);

    console.log('Created tables:', result.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error('Migration error:', err.message);

    if (err.message.includes('password authentication failed')) {
      console.log('\nPlease update the password in the connection string.');
      console.log('Or run the migration manually in Supabase Dashboard > SQL Editor');
    }
  } finally {
    await client.end();
  }
}

runMigration();

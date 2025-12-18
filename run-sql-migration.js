// Run SQL migration using postgres client
const { Client } = require('pg');
const fs = require('fs');

// Connection string - using pooler for better connectivity
const connectionString = 'postgresql://postgres.akiecgwcxadcpqlvntmf:YourPassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    // Read the SQL file from command line argument or default
    const migrationFile = process.argv[2] || './scripts/migrations/048_checkout_sessions_test_mode.sql';
    console.log('Running migration file:', migrationFile);
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('Running migration...');
    await client.query(sql);

    console.log('Migration completed successfully!');
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

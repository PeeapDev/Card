/**
 * Supabase Schema Setup
 * Run: npx tsx scripts/supabase-schema.ts
 *
 * Creates all necessary tables in Supabase PostgreSQL
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function createSchema() {
  // Supabase direct connection (non-pooler)
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'db.akiecgwcxadcpqlvntmf.supabase.co',
    port: 5432,
    username: 'postgres',
    password: 'peeapcard##',
    database: 'postgres',
    synchronize: false,
    logging: true,
    ssl: {
      rejectUnauthorized: false
    }
  });

  await dataSource.initialize();
  console.log('Connected to Supabase PostgreSQL\n');

  const queryRunner = dataSource.createQueryRunner();

  console.log('Creating tables...\n');

  // Users table
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_id VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(20),
      date_of_birth DATE,
      status VARCHAR(20) DEFAULT 'PENDING_VERIFICATION',
      kyc_status VARCHAR(20) DEFAULT 'NOT_STARTED',
      email_verified BOOLEAN DEFAULT false,
      phone_verified BOOLEAN DEFAULT false,
      two_factor_enabled BOOLEAN DEFAULT false,
      two_factor_secret VARCHAR(100),
      roles VARCHAR(100) DEFAULT 'user',
      kyc_tier INTEGER DEFAULT 0,
      last_login_at TIMESTAMP,
      password_changed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✓ Created users table');

  // Sessions table
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      refresh_token_hash VARCHAR(255) NOT NULL,
      device_info JSONB,
      ip_address VARCHAR(45),
      user_agent TEXT,
      expires_at TIMESTAMP NOT NULL,
      last_activity_at TIMESTAMP DEFAULT NOW(),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✓ Created sessions table');

  // Wallets table
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_id VARCHAR(100) UNIQUE NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      currency VARCHAR(3) DEFAULT 'USD',
      balance DECIMAL(18, 2) DEFAULT 0,
      available_balance DECIMAL(18, 2) DEFAULT 0,
      pending_balance DECIMAL(18, 2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'ACTIVE',
      type VARCHAR(20) DEFAULT 'PERSONAL',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✓ Created wallets table');

  // Cards table
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS cards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_id VARCHAR(100) UNIQUE NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      wallet_id UUID REFERENCES wallets(id),
      card_number_masked VARCHAR(20),
      card_type VARCHAR(20) DEFAULT 'VIRTUAL',
      card_brand VARCHAR(20) DEFAULT 'VISA',
      status VARCHAR(20) DEFAULT 'INACTIVE',
      expiry_month INTEGER,
      expiry_year INTEGER,
      spending_limit DECIMAL(18, 2),
      daily_limit DECIMAL(18, 2),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✓ Created cards table');

  // Transactions table
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_id VARCHAR(100) UNIQUE NOT NULL,
      user_id UUID REFERENCES users(id),
      wallet_id UUID REFERENCES wallets(id),
      card_id UUID REFERENCES cards(id),
      type VARCHAR(30) NOT NULL,
      status VARCHAR(20) DEFAULT 'PENDING',
      amount DECIMAL(18, 2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      fee DECIMAL(18, 2) DEFAULT 0,
      description TEXT,
      merchant_name VARCHAR(255),
      merchant_category VARCHAR(100),
      reference VARCHAR(100),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✓ Created transactions table');

  // Merchants table
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS merchants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_id VARCHAR(100) UNIQUE NOT NULL,
      user_id UUID REFERENCES users(id),
      business_name VARCHAR(255) NOT NULL,
      business_type VARCHAR(100),
      status VARCHAR(20) DEFAULT 'PENDING',
      mcc VARCHAR(10),
      website VARCHAR(255),
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✓ Created merchants table');

  // API Keys table
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      key_hash VARCHAR(255) NOT NULL,
      key_prefix VARCHAR(20) NOT NULL,
      environment VARCHAR(10) DEFAULT 'test',
      permissions JSONB DEFAULT '[]',
      last_used_at TIMESTAMP,
      expires_at TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✓ Created api_keys table');

  // Webhook Endpoints table
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS webhook_endpoints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      url VARCHAR(500) NOT NULL,
      secret VARCHAR(255) NOT NULL,
      events JSONB DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✓ Created webhook_endpoints table');

  // KYC Applications table
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS kyc_applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      tier INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'PENDING',
      documents JSONB,
      verification_data JSONB,
      notes TEXT,
      reviewed_by UUID REFERENCES users(id),
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✓ Created kyc_applications table');

  // Create indexes
  await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id)`);
  await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id)`);
  await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id)`);
  await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`);
  await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id)`);
  console.log('✓ Created indexes');

  console.log('\n✅ Schema created successfully!\n');

  await dataSource.destroy();
}

createSchema().catch(console.error);

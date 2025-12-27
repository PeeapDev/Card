const { Client } = require('pg');

const databaseUrl = 'postgresql://postgres:YourPassword@db.akiecgwcxadcpqlvntmf.supabase.co:5432/postgres';

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('Connecting to database...');

  try {
    await client.connect();
    console.log('Connected!');

    // Create AI Providers table
    console.log('Creating ai_providers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_providers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        api_key TEXT,
        base_url VARCHAR(255),
        models JSONB DEFAULT '[]'::jsonb,
        default_model VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        is_default BOOLEAN DEFAULT false,
        rate_limit_rpm INTEGER DEFAULT 60,
        rate_limit_tpm INTEGER DEFAULT 100000,
        usage_stats JSONB DEFAULT '{}'::jsonb,
        settings JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('ai_providers table created!');

    // Create AI Chat Sessions table
    console.log('Creating ai_chat_sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES profiles(id),
        session_type VARCHAR(50) DEFAULT 'support',
        status VARCHAR(20) DEFAULT 'active',
        context JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('ai_chat_sessions table created!');

    // Create AI Chat Messages table
    console.log('Creating ai_chat_messages table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('ai_chat_messages table created!');

    // Create AI Fraud Alerts table
    console.log('Creating ai_fraud_alerts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_fraud_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID,
        user_id UUID REFERENCES profiles(id),
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) DEFAULT 'medium',
        risk_score DECIMAL(5,2),
        description TEXT,
        details JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(20) DEFAULT 'pending',
        reviewed_by UUID REFERENCES profiles(id),
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('ai_fraud_alerts table created!');

    // Create AI Risk Scores table
    console.log('Creating ai_risk_scores table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_risk_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        risk_score DECIMAL(5,2) NOT NULL,
        risk_level VARCHAR(20),
        factors JSONB DEFAULT '[]'::jsonb,
        model_version VARCHAR(50),
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(entity_type, entity_id)
      )
    `);
    console.log('ai_risk_scores table created!');

    // Create AI Predictions table
    console.log('Creating ai_predictions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_predictions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        prediction_type VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        prediction_date DATE,
        predicted_value DECIMAL(15,2),
        confidence DECIMAL(5,2),
        details JSONB DEFAULT '{}'::jsonb,
        actual_value DECIMAL(15,2),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('ai_predictions table created!');

    // Create indexes
    console.log('Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user ON ai_chat_sessions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_fraud_alerts_user ON ai_fraud_alerts(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_fraud_alerts_status ON ai_fraud_alerts(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_risk_scores_entity ON ai_risk_scores(entity_type, entity_id)`);
    console.log('Indexes created!');

    // Insert default Groq provider
    console.log('Inserting default Groq provider...');
    await client.query(`
      INSERT INTO ai_providers (name, display_name, base_url, models, default_model, is_default)
      VALUES (
        'groq',
        'Groq (Fast Inference)',
        'https://api.groq.com/openai/v1',
        '["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"]'::jsonb,
        'llama-3.3-70b-versatile',
        true
      ) ON CONFLICT DO NOTHING
    `);
    console.log('Default Groq provider inserted!');

    console.log('\n✅ All AI tables created successfully!');
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

runMigration().then(success => {
  process.exit(success ? 0 : 1);
});

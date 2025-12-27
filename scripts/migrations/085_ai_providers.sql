-- Migration: AI Providers and AI Features
-- Stores API keys for AI services (Groq, OpenAI, etc.) and AI-related data

-- AI Providers table (stores API keys and configuration)
CREATE TABLE IF NOT EXISTS ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL, -- 'groq', 'openai', 'anthropic', 'local'
  display_name VARCHAR(100) NOT NULL,
  api_key TEXT, -- encrypted in production
  base_url VARCHAR(255),
  models JSONB DEFAULT '[]'::jsonb, -- available models
  default_model VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  rate_limit_rpm INTEGER DEFAULT 60, -- requests per minute
  rate_limit_tpm INTEGER DEFAULT 100000, -- tokens per minute
  usage_stats JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb, -- provider-specific settings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Chat Sessions (for chatbot conversations)
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  session_type VARCHAR(50) DEFAULT 'support', -- 'support', 'assistant', 'dispute'
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'escalated'
  context JSONB DEFAULT '{}'::jsonb, -- conversation context
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Chat Messages
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- tokens used, model, latency, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Fraud Alerts (detected suspicious activity)
CREATE TABLE IF NOT EXISTS ai_fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID,
  user_id UUID REFERENCES profiles(id),
  alert_type VARCHAR(50) NOT NULL, -- 'suspicious_amount', 'unusual_location', 'velocity', 'pattern'
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  risk_score DECIMAL(5,2), -- 0.00 to 100.00
  description TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'confirmed', 'dismissed'
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Risk Scores (cached risk assessments)
CREATE TABLE IF NOT EXISTS ai_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL, -- 'user', 'merchant', 'transaction', 'business'
  entity_id UUID NOT NULL,
  risk_score DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
  risk_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  factors JSONB DEFAULT '[]'::jsonb, -- contributing factors
  model_version VARCHAR(50),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);

-- AI Predictions (forecasts, insights)
CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_type VARCHAR(50) NOT NULL, -- 'revenue', 'cashflow', 'churn', 'demand'
  entity_type VARCHAR(50), -- 'user', 'merchant', 'business', 'system'
  entity_id UUID,
  prediction_date DATE,
  predicted_value DECIMAL(15,2),
  confidence DECIMAL(5,2),
  details JSONB DEFAULT '{}'::jsonb,
  actual_value DECIMAL(15,2), -- filled in later for accuracy tracking
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Dispute Analysis (AI-powered dispute resolution assistance)
CREATE TABLE IF NOT EXISTS ai_dispute_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL, -- references disputes table

  -- Analysis scores
  merchant_likelihood DECIMAL(5,2), -- 0-100: likelihood merchant wins
  customer_likelihood DECIMAL(5,2), -- 0-100: likelihood customer wins
  confidence_score DECIMAL(5,2), -- 0-100: AI confidence in analysis

  -- AI assessment
  recommendation VARCHAR(50), -- 'favor_merchant', 'favor_customer', 'needs_review', 'insufficient_data'
  reasoning TEXT, -- AI explanation for the recommendation

  -- Risk assessment
  fraud_risk_score DECIMAL(5,2), -- 0-100: likelihood dispute is fraudulent
  customer_dispute_history JSONB DEFAULT '{}'::jsonb, -- past disputes by customer
  merchant_dispute_history JSONB DEFAULT '{}'::jsonb, -- past disputes against merchant

  -- Evidence analysis
  evidence_strength VARCHAR(20), -- 'strong', 'moderate', 'weak', 'none'
  missing_evidence JSONB DEFAULT '[]'::jsonb, -- list of evidence that would help

  -- Similar cases
  similar_cases JSONB DEFAULT '[]'::jsonb, -- past similar disputes and outcomes

  -- Suggestions
  suggested_merchant_response TEXT, -- AI-generated response suggestion
  suggested_resolution TEXT, -- AI suggestion for admin
  suggested_compensation DECIMAL(15,2), -- if partial refund recommended

  -- Metadata
  model_used VARCHAR(100),
  tokens_used INTEGER,
  analysis_version VARCHAR(20) DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(dispute_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_fraud_alerts_user ON ai_fraud_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_fraud_alerts_status ON ai_fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_ai_risk_scores_entity ON ai_risk_scores(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_dispute_analysis_dispute ON ai_dispute_analysis(dispute_id);

-- Insert default Groq provider (without API key - to be added via UI)
INSERT INTO ai_providers (name, display_name, base_url, models, default_model, is_default)
VALUES (
  'groq',
  'Groq (Fast Inference)',
  'https://api.groq.com/openai/v1',
  '["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"]'::jsonb,
  'llama-3.3-70b-versatile',
  true
) ON CONFLICT DO NOTHING;

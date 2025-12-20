-- AML/KYC Compliance System Enhancement Migration
-- Creates comprehensive AML monitoring, sanctions screening, and risk scoring tables
-- Designed for financial regulatory compliance (FinCEN, FATF guidelines)

-- =====================================================
-- WATCHLISTS / SANCTIONS LISTS
-- =====================================================
-- Master list of all watchlists integrated into the system
CREATE TABLE IF NOT EXISTS aml_watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- List identification
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'OFAC_SDN', 'UN_CONSOLIDATED', 'EU_SANCTIONS'
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Source information
    source_url TEXT,
    source_organization VARCHAR(255),

    -- List type: sanctions, pep, adverse_media, law_enforcement
    list_type VARCHAR(50) NOT NULL DEFAULT 'sanctions',

    -- Update tracking
    last_updated_at TIMESTAMPTZ,
    update_frequency VARCHAR(50) DEFAULT 'daily', -- daily, weekly, monthly
    total_entries INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default watchlists
INSERT INTO aml_watchlists (code, name, description, list_type, source_organization, update_frequency) VALUES
    ('OFAC_SDN', 'OFAC Specially Designated Nationals', 'US Treasury OFAC SDN List', 'sanctions', 'US Department of Treasury', 'daily'),
    ('OFAC_CONS', 'OFAC Consolidated Sanctions', 'US Treasury Consolidated Sanctions List', 'sanctions', 'US Department of Treasury', 'daily'),
    ('UN_CONSOLIDATED', 'UN Security Council Consolidated List', 'United Nations Security Council sanctions', 'sanctions', 'United Nations', 'daily'),
    ('EU_SANCTIONS', 'EU Consolidated Sanctions', 'European Union consolidated financial sanctions', 'sanctions', 'European Union', 'daily'),
    ('UK_HMT', 'UK HM Treasury Sanctions', 'UK financial sanctions list', 'sanctions', 'HM Treasury UK', 'daily'),
    ('INTERPOL_RED', 'INTERPOL Red Notices', 'INTERPOL wanted persons', 'law_enforcement', 'INTERPOL', 'daily'),
    ('FBI_MOST_WANTED', 'FBI Most Wanted', 'FBI most wanted fugitives', 'law_enforcement', 'FBI', 'weekly'),
    ('WORLD_BANK_DEBARRED', 'World Bank Debarred Firms', 'World Bank debarred entities', 'sanctions', 'World Bank', 'monthly'),
    ('PEP_GLOBAL', 'Global PEP Database', 'Politically Exposed Persons worldwide', 'pep', 'Aggregated Sources', 'weekly'),
    ('PEP_AFRICA', 'African PEP Database', 'African Politically Exposed Persons', 'pep', 'Regional Sources', 'weekly'),
    ('ADVERSE_MEDIA', 'Adverse Media Screening', 'Negative news and adverse media mentions', 'adverse_media', 'Media Aggregators', 'daily')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- WATCHLIST ENTRIES
-- =====================================================
-- Individual entries from watchlists (names, aliases, identifiers)
CREATE TABLE IF NOT EXISTS aml_watchlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to parent watchlist
    watchlist_id UUID NOT NULL REFERENCES aml_watchlists(id) ON DELETE CASCADE,

    -- Entry identification
    external_id VARCHAR(255), -- ID from the source list

    -- Entity type: individual, entity, vessel, aircraft
    entity_type VARCHAR(50) DEFAULT 'individual',

    -- Primary name
    primary_name VARCHAR(500) NOT NULL,

    -- Name variations for matching
    aliases TEXT[], -- Array of alternative names
    name_soundex VARCHAR(50), -- Soundex for phonetic matching
    name_metaphone VARCHAR(50), -- Metaphone for phonetic matching

    -- Identification details
    date_of_birth DATE,
    year_of_birth INTEGER,
    place_of_birth VARCHAR(255),
    nationality VARCHAR(100)[],

    -- Identifiers
    passport_numbers TEXT[],
    national_ids TEXT[],
    tax_ids TEXT[],

    -- Address information
    addresses JSONB DEFAULT '[]'::jsonb,

    -- Listing details
    listed_on DATE,
    delisted_on DATE,
    listing_reason TEXT,
    programs TEXT[], -- Sanctions programs (e.g., 'IRAN', 'SYRIA', 'NORTH_KOREA')

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata from source
    source_data JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient screening
CREATE INDEX IF NOT EXISTS idx_watchlist_entries_watchlist ON aml_watchlist_entries(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_entries_name ON aml_watchlist_entries(primary_name);
CREATE INDEX IF NOT EXISTS idx_watchlist_entries_soundex ON aml_watchlist_entries(name_soundex);
CREATE INDEX IF NOT EXISTS idx_watchlist_entries_metaphone ON aml_watchlist_entries(name_metaphone);
CREATE INDEX IF NOT EXISTS idx_watchlist_entries_dob ON aml_watchlist_entries(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_watchlist_entries_active ON aml_watchlist_entries(is_active);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_watchlist_entries_fts ON aml_watchlist_entries
    USING gin(to_tsvector('english', primary_name || ' ' || COALESCE(array_to_string(aliases, ' '), '')));


-- =====================================================
-- USER SCREENING RESULTS
-- =====================================================
-- Records of user screening against watchlists
CREATE TABLE IF NOT EXISTS aml_screening_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User being screened
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Screening context
    screening_type VARCHAR(50) NOT NULL DEFAULT 'onboarding', -- onboarding, periodic, transaction, manual
    triggered_by VARCHAR(50) DEFAULT 'system', -- system, admin, transaction
    triggered_by_user_id UUID REFERENCES users(id),

    -- Screened data
    screened_name VARCHAR(500),
    screened_dob DATE,
    screened_nationality VARCHAR(100),
    screened_id_number VARCHAR(255),

    -- Results summary
    total_matches INTEGER DEFAULT 0,
    highest_match_score DECIMAL(5, 2) DEFAULT 0,

    -- Match details
    matches JSONB DEFAULT '[]'::jsonb,
    -- Format: [{ watchlist_id, entry_id, match_score, match_type, matched_fields }]

    -- Resolution
    status VARCHAR(50) DEFAULT 'pending', -- pending, cleared, escalated, blocked
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,

    -- Risk assessment
    risk_level VARCHAR(20), -- low, medium, high, critical
    requires_edd BOOLEAN DEFAULT false, -- Enhanced Due Diligence required

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screening_results_user ON aml_screening_results(user_id);
CREATE INDEX IF NOT EXISTS idx_screening_results_status ON aml_screening_results(status);
CREATE INDEX IF NOT EXISTS idx_screening_results_risk ON aml_screening_results(risk_level);
CREATE INDEX IF NOT EXISTS idx_screening_results_created ON aml_screening_results(created_at DESC);


-- =====================================================
-- USER RISK PROFILES
-- =====================================================
-- Comprehensive risk scoring for each user
CREATE TABLE IF NOT EXISTS aml_risk_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User reference
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Overall risk score (0-100)
    overall_risk_score INTEGER DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical

    -- Component scores (0-100 each)
    kyc_risk_score INTEGER DEFAULT 0,           -- Based on KYC verification level
    geographic_risk_score INTEGER DEFAULT 0,    -- Based on country/region
    product_risk_score INTEGER DEFAULT 0,       -- Based on products used
    channel_risk_score INTEGER DEFAULT 0,       -- Based on access channels
    transaction_risk_score INTEGER DEFAULT 0,   -- Based on transaction patterns
    behavior_risk_score INTEGER DEFAULT 0,      -- Based on account behavior
    pep_risk_score INTEGER DEFAULT 0,           -- PEP association
    sanctions_risk_score INTEGER DEFAULT 0,     -- Sanctions screening results

    -- Risk factors breakdown
    risk_factors JSONB DEFAULT '[]'::jsonb,
    -- Format: [{ factor, category, score, description, detected_at }]

    -- Geographic risk details
    residence_country VARCHAR(3),
    residence_risk_level VARCHAR(20),
    citizenship_countries VARCHAR(3)[],
    high_risk_country_connections BOOLEAN DEFAULT false,

    -- PEP status
    is_pep BOOLEAN DEFAULT false,
    pep_category VARCHAR(50), -- domestic_pep, foreign_pep, international_org, rca
    pep_details JSONB,

    -- Enhanced Due Diligence
    edd_required BOOLEAN DEFAULT false,
    edd_completed BOOLEAN DEFAULT false,
    edd_completed_at TIMESTAMPTZ,
    edd_next_review_at TIMESTAMPTZ,

    -- Periodic review schedule
    next_review_at TIMESTAMPTZ,
    last_reviewed_at TIMESTAMPTZ,
    review_frequency VARCHAR(50) DEFAULT 'annual', -- monthly, quarterly, semi_annual, annual

    -- Account restrictions
    is_restricted BOOLEAN DEFAULT false,
    restriction_reason TEXT,
    restricted_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_profiles_user ON aml_risk_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_profiles_level ON aml_risk_profiles(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_profiles_score ON aml_risk_profiles(overall_risk_score);
CREATE INDEX IF NOT EXISTS idx_risk_profiles_edd ON aml_risk_profiles(edd_required);
CREATE INDEX IF NOT EXISTS idx_risk_profiles_review ON aml_risk_profiles(next_review_at);


-- =====================================================
-- TRANSACTION MONITORING RULES
-- =====================================================
-- Configurable rules for detecting suspicious transactions
CREATE TABLE IF NOT EXISTS aml_monitoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Rule identification
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- structuring, velocity, geographic, behavioral, amount

    -- Rule configuration
    rule_type VARCHAR(50) NOT NULL, -- threshold, pattern, ml_model, aggregate

    -- Thresholds and parameters
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Examples:
    -- { "amount_threshold": 10000, "currency": "USD" }
    -- { "daily_count_limit": 10, "daily_amount_limit": 50000 }
    -- { "countries": ["IR", "KP", "SY"], "action": "block" }

    -- Time windows for aggregate rules
    time_window_minutes INTEGER,

    -- Risk impact
    risk_score_impact INTEGER DEFAULT 10, -- How much to add to risk score
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical

    -- Actions
    action_type VARCHAR(50) DEFAULT 'alert', -- alert, block, review, notify
    auto_escalate BOOLEAN DEFAULT false,
    requires_sar BOOLEAN DEFAULT false,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Seed default monitoring rules
INSERT INTO aml_monitoring_rules (code, name, description, category, rule_type, parameters, severity, action_type) VALUES
    -- Amount-based rules
    ('LARGE_TX_SINGLE', 'Large Single Transaction', 'Single transaction exceeding reporting threshold', 'amount', 'threshold',
     '{"amount_threshold": 10000, "currency": "USD"}', 'medium', 'alert'),
    ('LARGE_TX_CASH', 'Large Cash Transaction', 'Cash transaction exceeding CTR threshold', 'amount', 'threshold',
     '{"amount_threshold": 10000, "currency": "USD", "type": "cash"}', 'high', 'alert'),

    -- Structuring detection
    ('STRUCTURING_DAILY', 'Daily Structuring Detection', 'Multiple transactions just below threshold in 24h', 'structuring', 'pattern',
     '{"amount_below": 9500, "count_threshold": 3, "time_window_hours": 24}', 'high', 'alert'),
    ('STRUCTURING_WEEKLY', 'Weekly Structuring Detection', 'Aggregate transactions suggesting structuring', 'structuring', 'aggregate',
     '{"total_threshold": 30000, "time_window_days": 7, "avg_below": 9000}', 'high', 'alert'),

    -- Velocity rules
    ('HIGH_VELOCITY_COUNT', 'High Transaction Velocity', 'Unusual number of transactions in short period', 'velocity', 'threshold',
     '{"max_count": 20, "time_window_hours": 24}', 'medium', 'alert'),
    ('HIGH_VELOCITY_AMOUNT', 'High Volume Velocity', 'Unusual transaction volume in short period', 'velocity', 'threshold',
     '{"max_amount": 50000, "time_window_hours": 24}', 'medium', 'alert'),
    ('RAPID_MOVEMENT', 'Rapid Fund Movement', 'Funds moved out quickly after deposit', 'velocity', 'pattern',
     '{"deposit_withdrawal_gap_minutes": 30, "percentage_moved": 80}', 'high', 'alert'),

    -- Geographic rules
    ('HIGH_RISK_COUNTRY', 'High Risk Country Transaction', 'Transaction involving high-risk jurisdiction', 'geographic', 'pattern',
     '{"countries": ["AF", "BY", "CF", "CU", "CD", "IR", "IQ", "LY", "KP", "SO", "SS", "SD", "SY", "VE", "YE", "ZW"]}', 'high', 'alert'),
    ('SANCTIONS_COUNTRY', 'Sanctioned Country Transaction', 'Transaction involving sanctioned country', 'geographic', 'pattern',
     '{"countries": ["CU", "IR", "KP", "SY", "RU"], "action": "block"}', 'critical', 'block'),

    -- Behavioral rules
    ('NEW_ACCOUNT_HIGH_ACTIVITY', 'New Account High Activity', 'High activity on newly opened account', 'behavioral', 'pattern',
     '{"account_age_days": 30, "activity_threshold": 10000}', 'medium', 'alert'),
    ('DORMANT_REACTIVATION', 'Dormant Account Reactivation', 'Sudden activity on dormant account', 'behavioral', 'pattern',
     '{"dormant_days": 180, "activity_threshold": 5000}', 'medium', 'alert'),
    ('UNUSUAL_PATTERN', 'Unusual Transaction Pattern', 'Pattern deviates significantly from normal behavior', 'behavioral', 'pattern',
     '{"deviation_threshold": 3}', 'medium', 'alert'),

    -- Round amounts
    ('ROUND_AMOUNTS', 'Suspicious Round Amounts', 'Multiple transactions with round amounts', 'behavioral', 'pattern',
     '{"round_threshold": 1000, "count_in_period": 5, "period_days": 7}', 'low', 'alert')
ON CONFLICT (code) DO NOTHING;


-- =====================================================
-- AML ALERTS
-- =====================================================
-- Alerts generated by monitoring rules
CREATE TABLE IF NOT EXISTS aml_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Alert identification
    reference VARCHAR(50) UNIQUE NOT NULL,

    -- Source
    rule_id UUID REFERENCES aml_monitoring_rules(id),
    rule_code VARCHAR(50),

    -- Subject
    user_id UUID NOT NULL REFERENCES users(id),
    transaction_id UUID REFERENCES transactions(id),

    -- Alert details
    alert_type VARCHAR(50) NOT NULL, -- aml, pep, sanctions, velocity, fraud, behavioral
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, critical

    -- Description
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Trigger details
    trigger_data JSONB DEFAULT '{}'::jsonb,
    -- Contains: matched_values, thresholds, transactions_involved, etc.

    -- Status workflow
    status VARCHAR(50) DEFAULT 'open', -- open, investigating, escalated, resolved, dismissed, sar_filed

    -- Assignment
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ,

    -- Investigation notes
    investigation_notes JSONB DEFAULT '[]'::jsonb,
    -- Format: [{ note, added_by, added_at }]

    -- Resolution
    resolution VARCHAR(50), -- false_positive, true_positive, inconclusive, sar_filed
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,

    -- SAR filing
    sar_required BOOLEAN DEFAULT false,
    sar_id UUID, -- Reference to filed SAR

    -- Risk impact
    risk_score_impact INTEGER DEFAULT 0,

    -- Timing
    due_date TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aml_alerts_user ON aml_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_status ON aml_alerts(status);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_severity ON aml_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_type ON aml_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_created ON aml_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_assigned ON aml_alerts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_due ON aml_alerts(due_date);


-- =====================================================
-- SUSPICIOUS ACTIVITY REPORTS (SAR)
-- =====================================================
-- Regulatory reports filed with authorities
CREATE TABLE IF NOT EXISTS aml_suspicious_activity_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- SAR identification
    reference VARCHAR(50) UNIQUE NOT NULL,

    -- Report type
    report_type VARCHAR(50) NOT NULL DEFAULT 'SAR', -- SAR, CTR, SAR-SF (simplified)

    -- Subject information
    user_id UUID NOT NULL REFERENCES users(id),

    -- Subject details snapshot (at time of filing)
    subject_snapshot JSONB NOT NULL,
    -- Contains: name, dob, address, id_documents, account_info

    -- Financial institution info
    filing_institution JSONB DEFAULT '{}'::jsonb,
    -- Contains: name, address, regulatory_ids

    -- Suspicious activity details
    activity_start_date DATE,
    activity_end_date DATE,
    total_amount DECIMAL(18, 2),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Activity categories (FinCEN categories)
    activity_categories TEXT[],
    -- Examples: structuring, money_laundering, terrorist_financing, fraud, identity_theft

    -- Narrative
    narrative TEXT NOT NULL, -- Detailed description of suspicious activity

    -- Supporting evidence
    related_alerts UUID[], -- References to aml_alerts
    related_transactions UUID[], -- References to transactions
    supporting_documents JSONB DEFAULT '[]'::jsonb,

    -- Filing status
    status VARCHAR(50) DEFAULT 'draft', -- draft, pending_review, approved, filed, acknowledged

    -- Internal workflow
    prepared_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),

    -- Filing information
    filed_at TIMESTAMPTZ,
    filing_confirmation VARCHAR(255), -- BSA ID or regulatory confirmation number
    regulator_response JSONB,

    -- Deadlines
    due_date TIMESTAMPTZ, -- Regulatory deadline
    extended_due_date TIMESTAMPTZ,
    extension_reason TEXT,

    -- Follow-up
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date TIMESTAMPTZ,
    follow_up_notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sar_user ON aml_suspicious_activity_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_sar_status ON aml_suspicious_activity_reports(status);
CREATE INDEX IF NOT EXISTS idx_sar_type ON aml_suspicious_activity_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_sar_filed ON aml_suspicious_activity_reports(filed_at);
CREATE INDEX IF NOT EXISTS idx_sar_due ON aml_suspicious_activity_reports(due_date);


-- =====================================================
-- CURRENCY TRANSACTION REPORTS (CTR)
-- =====================================================
-- Reports for large cash transactions (>$10,000)
CREATE TABLE IF NOT EXISTS aml_currency_transaction_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- CTR identification
    reference VARCHAR(50) UNIQUE NOT NULL,

    -- Subject
    user_id UUID NOT NULL REFERENCES users(id),
    transaction_id UUID REFERENCES transactions(id),

    -- Transaction details
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- deposit, withdrawal, exchange
    amount DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Subject snapshot
    subject_snapshot JSONB NOT NULL,

    -- Filing status
    status VARCHAR(50) DEFAULT 'pending', -- pending, filed, acknowledged

    -- Filing
    filed_by UUID REFERENCES users(id),
    filed_at TIMESTAMPTZ,
    filing_confirmation VARCHAR(255),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctr_user ON aml_currency_transaction_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_ctr_status ON aml_currency_transaction_reports(status);
CREATE INDEX IF NOT EXISTS idx_ctr_date ON aml_currency_transaction_reports(transaction_date);


-- =====================================================
-- ENHANCED DUE DILIGENCE (EDD) RECORDS
-- =====================================================
-- Records for high-risk customers requiring enhanced review
CREATE TABLE IF NOT EXISTS aml_enhanced_due_diligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Subject
    user_id UUID NOT NULL REFERENCES users(id),

    -- EDD trigger
    trigger_reason VARCHAR(100) NOT NULL,
    -- pep_identified, high_risk_country, high_risk_industry, suspicious_activity, regulatory_request

    trigger_alert_id UUID REFERENCES aml_alerts(id),

    -- Source of wealth
    source_of_wealth TEXT,
    source_of_wealth_verified BOOLEAN DEFAULT false,
    source_of_wealth_documents JSONB DEFAULT '[]'::jsonb,

    -- Source of funds
    source_of_funds TEXT,
    source_of_funds_verified BOOLEAN DEFAULT false,
    source_of_funds_documents JSONB DEFAULT '[]'::jsonb,

    -- Business relationship purpose
    purpose_of_account TEXT,
    expected_activity JSONB DEFAULT '{}'::jsonb,
    -- { monthly_volume, transaction_count, counterparty_types }

    -- Additional verification
    additional_id_verified BOOLEAN DEFAULT false,
    address_verified BOOLEAN DEFAULT false,
    employer_verified BOOLEAN DEFAULT false,
    reference_checks_completed BOOLEAN DEFAULT false,

    -- Beneficial ownership (for entities)
    beneficial_owners JSONB DEFAULT '[]'::jsonb,

    -- Senior management approval
    approved_by UUID REFERENCES users(id),
    approval_notes TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, rejected
    completed_at TIMESTAMPTZ,

    -- Review schedule
    next_review_date DATE,
    review_frequency_months INTEGER DEFAULT 12,

    -- Risk assessment
    risk_assessment TEXT,
    risk_accepted BOOLEAN DEFAULT false,
    risk_mitigants TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edd_user ON aml_enhanced_due_diligence(user_id);
CREATE INDEX IF NOT EXISTS idx_edd_status ON aml_enhanced_due_diligence(status);
CREATE INDEX IF NOT EXISTS idx_edd_review ON aml_enhanced_due_diligence(next_review_date);


-- =====================================================
-- TRANSACTION MONITORING EVENTS
-- =====================================================
-- Log of all transactions evaluated by monitoring rules
CREATE TABLE IF NOT EXISTS aml_transaction_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Transaction reference
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    user_id UUID NOT NULL REFERENCES users(id),

    -- Transaction snapshot
    amount DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SLE',
    transaction_type VARCHAR(50),
    counterparty_id UUID,

    -- Monitoring results
    rules_evaluated INTEGER DEFAULT 0,
    rules_triggered INTEGER DEFAULT 0,
    triggered_rules JSONB DEFAULT '[]'::jsonb,
    -- Format: [{ rule_id, rule_code, severity, details }]

    -- Risk scoring
    transaction_risk_score INTEGER DEFAULT 0,

    -- Alerts generated
    alerts_generated UUID[],

    -- Processing
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    processing_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tx_events_transaction ON aml_transaction_events(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_events_user ON aml_transaction_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_events_processed ON aml_transaction_events(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_events_risk ON aml_transaction_events(transaction_risk_score);


-- =====================================================
-- HIGH-RISK COUNTRIES
-- =====================================================
-- Configurable list of high-risk jurisdictions
CREATE TABLE IF NOT EXISTS aml_high_risk_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Country identification
    country_code VARCHAR(3) NOT NULL UNIQUE, -- ISO 3166-1 alpha-2 or alpha-3
    country_name VARCHAR(255) NOT NULL,

    -- Risk categorization
    risk_level VARCHAR(20) NOT NULL DEFAULT 'high', -- elevated, high, prohibited
    risk_category VARCHAR(50), -- fatf_grey, fatf_black, sanctions, corruption, terrorism

    -- Restrictions
    transactions_blocked BOOLEAN DEFAULT false,
    requires_edd BOOLEAN DEFAULT true,
    max_transaction_amount DECIMAL(18, 2),

    -- Regulatory basis
    listing_authority VARCHAR(100), -- FATF, OFAC, EU, etc.
    listing_date DATE,
    listing_reason TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed high-risk countries (FATF grey/black list + major sanctions)
INSERT INTO aml_high_risk_countries (country_code, country_name, risk_level, risk_category, transactions_blocked, listing_authority) VALUES
    -- FATF Black List (Call for Action)
    ('KP', 'North Korea', 'prohibited', 'fatf_black', true, 'FATF'),
    ('IR', 'Iran', 'prohibited', 'fatf_black', true, 'FATF'),
    ('MM', 'Myanmar', 'high', 'fatf_black', false, 'FATF'),

    -- Comprehensive Sanctions
    ('CU', 'Cuba', 'prohibited', 'sanctions', true, 'OFAC'),
    ('SY', 'Syria', 'prohibited', 'sanctions', true, 'OFAC'),
    ('RU', 'Russia', 'high', 'sanctions', false, 'OFAC'),
    ('BY', 'Belarus', 'high', 'sanctions', false, 'OFAC'),

    -- FATF Grey List (Increased Monitoring)
    ('BF', 'Burkina Faso', 'elevated', 'fatf_grey', false, 'FATF'),
    ('CM', 'Cameroon', 'elevated', 'fatf_grey', false, 'FATF'),
    ('CD', 'Democratic Republic of Congo', 'high', 'fatf_grey', false, 'FATF'),
    ('HT', 'Haiti', 'elevated', 'fatf_grey', false, 'FATF'),
    ('KE', 'Kenya', 'elevated', 'fatf_grey', false, 'FATF'),
    ('ML', 'Mali', 'elevated', 'fatf_grey', false, 'FATF'),
    ('MZ', 'Mozambique', 'elevated', 'fatf_grey', false, 'FATF'),
    ('NG', 'Nigeria', 'elevated', 'fatf_grey', false, 'FATF'),
    ('PH', 'Philippines', 'elevated', 'fatf_grey', false, 'FATF'),
    ('SN', 'Senegal', 'elevated', 'fatf_grey', false, 'FATF'),
    ('ZA', 'South Africa', 'elevated', 'fatf_grey', false, 'FATF'),
    ('SS', 'South Sudan', 'high', 'fatf_grey', false, 'FATF'),
    ('TZ', 'Tanzania', 'elevated', 'fatf_grey', false, 'FATF'),
    ('VE', 'Venezuela', 'high', 'sanctions', false, 'FATF'),
    ('VN', 'Vietnam', 'elevated', 'fatf_grey', false, 'FATF'),
    ('YE', 'Yemen', 'high', 'fatf_grey', false, 'FATF')
ON CONFLICT (country_code) DO NOTHING;


-- =====================================================
-- AUDIT LOG FOR COMPLIANCE ACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS aml_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Action details
    action_type VARCHAR(100) NOT NULL,
    -- screening_performed, alert_created, alert_resolved, sar_filed, edd_completed, risk_updated

    -- Subject
    user_id UUID REFERENCES users(id),
    target_table VARCHAR(100),
    target_id UUID,

    -- Actor
    performed_by UUID REFERENCES users(id),
    performed_by_system BOOLEAN DEFAULT false,

    -- Details
    action_details JSONB DEFAULT '{}'::jsonb,

    -- Before/After for changes
    previous_state JSONB,
    new_state JSONB,

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON aml_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON aml_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON aml_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON aml_audit_log(performed_by);


-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE aml_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_watchlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_screening_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_monitoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_suspicious_activity_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_currency_transaction_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_enhanced_due_diligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_transaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_high_risk_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_audit_log ENABLE ROW LEVEL SECURITY;

-- Watchlists - Read-only for compliance, managed by system
CREATE POLICY watchlists_read_compliance ON aml_watchlists
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'superadmin', 'compliance')
        )
    );

-- Watchlist entries - Read-only for compliance
CREATE POLICY watchlist_entries_read_compliance ON aml_watchlist_entries
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'superadmin', 'compliance')
        )
    );

-- Screening results - Compliance can read all, users can't see their own (security)
CREATE POLICY screening_results_compliance ON aml_screening_results
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'superadmin', 'compliance')
        )
    );

-- Risk profiles - Compliance can read/update
CREATE POLICY risk_profiles_compliance ON aml_risk_profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'superadmin', 'compliance')
        )
    );

-- Monitoring rules - Admin/Compliance can manage
CREATE POLICY monitoring_rules_compliance ON aml_monitoring_rules
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'superadmin', 'compliance')
        )
    );

-- AML Alerts - Compliance can manage
CREATE POLICY alerts_compliance ON aml_alerts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'superadmin', 'compliance')
        )
    );

-- SAR - Only compliance and admin
CREATE POLICY sar_compliance ON aml_suspicious_activity_reports
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'superadmin', 'compliance')
        )
    );

-- CTR - Only compliance and admin
CREATE POLICY ctr_compliance ON aml_currency_transaction_reports
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'superadmin', 'compliance')
        )
    );

-- EDD - Only compliance and admin
CREATE POLICY edd_compliance ON aml_enhanced_due_diligence
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'superadmin', 'compliance')
        )
    );

-- Transaction events - Compliance can read
CREATE POLICY tx_events_compliance ON aml_transaction_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'superadmin', 'compliance')
        )
    );

-- High-risk countries - All authenticated can read
CREATE POLICY high_risk_countries_read ON aml_high_risk_countries
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY high_risk_countries_manage ON aml_high_risk_countries
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'superadmin', 'compliance')
        )
    );

-- Audit log - Compliance can read, system inserts
CREATE POLICY audit_log_read ON aml_audit_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'superadmin', 'compliance')
        )
    );


-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate overall risk score
CREATE OR REPLACE FUNCTION calculate_user_risk_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_kyc_score INTEGER := 0;
    v_geo_score INTEGER := 0;
    v_tx_score INTEGER := 0;
    v_behavior_score INTEGER := 0;
    v_pep_score INTEGER := 0;
    v_sanctions_score INTEGER := 0;
    v_total_score INTEGER := 0;
BEGIN
    -- Get current profile scores
    SELECT
        COALESCE(kyc_risk_score, 0),
        COALESCE(geographic_risk_score, 0),
        COALESCE(transaction_risk_score, 0),
        COALESCE(behavior_risk_score, 0),
        COALESCE(pep_risk_score, 0),
        COALESCE(sanctions_risk_score, 0)
    INTO v_kyc_score, v_geo_score, v_tx_score, v_behavior_score, v_pep_score, v_sanctions_score
    FROM aml_risk_profiles
    WHERE user_id = p_user_id;

    -- Weighted average (sanctions and PEP have higher weight)
    v_total_score := (
        (v_kyc_score * 1) +
        (v_geo_score * 1.5) +
        (v_tx_score * 1) +
        (v_behavior_score * 1) +
        (v_pep_score * 2) +
        (v_sanctions_score * 3)
    ) / 9.5;

    -- Cap at 100
    IF v_total_score > 100 THEN
        v_total_score := 100;
    END IF;

    RETURN v_total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to determine risk level from score
CREATE OR REPLACE FUNCTION get_risk_level(p_score INTEGER)
RETURNS VARCHAR AS $$
BEGIN
    RETURN CASE
        WHEN p_score >= 80 THEN 'critical'
        WHEN p_score >= 60 THEN 'high'
        WHEN p_score >= 40 THEN 'medium'
        ELSE 'low'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate alert reference
CREATE OR REPLACE FUNCTION generate_alert_reference()
RETURNS VARCHAR AS $$
BEGIN
    RETURN 'ALT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
           UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Function to generate SAR reference
CREATE OR REPLACE FUNCTION generate_sar_reference()
RETURNS VARCHAR AS $$
BEGIN
    RETURN 'SAR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
           UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Function to generate CTR reference
CREATE OR REPLACE FUNCTION generate_ctr_reference()
RETURNS VARCHAR AS $$
BEGIN
    RETURN 'CTR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
           UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_aml_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_aml_watchlists_updated_at
    BEFORE UPDATE ON aml_watchlists
    FOR EACH ROW EXECUTE FUNCTION update_aml_updated_at();

CREATE TRIGGER update_aml_watchlist_entries_updated_at
    BEFORE UPDATE ON aml_watchlist_entries
    FOR EACH ROW EXECUTE FUNCTION update_aml_updated_at();

CREATE TRIGGER update_aml_screening_results_updated_at
    BEFORE UPDATE ON aml_screening_results
    FOR EACH ROW EXECUTE FUNCTION update_aml_updated_at();

CREATE TRIGGER update_aml_risk_profiles_updated_at
    BEFORE UPDATE ON aml_risk_profiles
    FOR EACH ROW EXECUTE FUNCTION update_aml_updated_at();

CREATE TRIGGER update_aml_monitoring_rules_updated_at
    BEFORE UPDATE ON aml_monitoring_rules
    FOR EACH ROW EXECUTE FUNCTION update_aml_updated_at();

CREATE TRIGGER update_aml_alerts_updated_at
    BEFORE UPDATE ON aml_alerts
    FOR EACH ROW EXECUTE FUNCTION update_aml_updated_at();

CREATE TRIGGER update_aml_sar_updated_at
    BEFORE UPDATE ON aml_suspicious_activity_reports
    FOR EACH ROW EXECUTE FUNCTION update_aml_updated_at();

CREATE TRIGGER update_aml_ctr_updated_at
    BEFORE UPDATE ON aml_currency_transaction_reports
    FOR EACH ROW EXECUTE FUNCTION update_aml_updated_at();

CREATE TRIGGER update_aml_edd_updated_at
    BEFORE UPDATE ON aml_enhanced_due_diligence
    FOR EACH ROW EXECUTE FUNCTION update_aml_updated_at();

-- Auto-generate alert reference
CREATE OR REPLACE FUNCTION set_alert_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference IS NULL OR NEW.reference = '' THEN
        NEW.reference := generate_alert_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_aml_alert_reference
    BEFORE INSERT ON aml_alerts
    FOR EACH ROW EXECUTE FUNCTION set_alert_reference();

-- Auto-generate SAR reference
CREATE OR REPLACE FUNCTION set_sar_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference IS NULL OR NEW.reference = '' THEN
        NEW.reference := generate_sar_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sar_reference
    BEFORE INSERT ON aml_suspicious_activity_reports
    FOR EACH ROW EXECUTE FUNCTION set_sar_reference();

-- Auto-generate CTR reference
CREATE OR REPLACE FUNCTION set_ctr_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference IS NULL OR NEW.reference = '' THEN
        NEW.reference := generate_ctr_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ctr_reference
    BEFORE INSERT ON aml_currency_transaction_reports
    FOR EACH ROW EXECUTE FUNCTION set_ctr_reference();


-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Add AML-specific permissions to the permissions table
INSERT INTO permissions (name, description, category) VALUES
    ('aml.screening.view', 'View AML screening results', 'aml'),
    ('aml.screening.perform', 'Perform AML screenings', 'aml'),
    ('aml.alerts.view', 'View AML alerts', 'aml'),
    ('aml.alerts.manage', 'Manage and resolve AML alerts', 'aml'),
    ('aml.sar.view', 'View Suspicious Activity Reports', 'aml'),
    ('aml.sar.create', 'Create Suspicious Activity Reports', 'aml'),
    ('aml.sar.file', 'File SARs with regulators', 'aml'),
    ('aml.edd.view', 'View Enhanced Due Diligence records', 'aml'),
    ('aml.edd.manage', 'Manage EDD processes', 'aml'),
    ('aml.risk.view', 'View risk profiles', 'aml'),
    ('aml.risk.manage', 'Manage risk profiles and scores', 'aml'),
    ('aml.rules.view', 'View monitoring rules', 'aml'),
    ('aml.rules.manage', 'Create and manage monitoring rules', 'aml'),
    ('aml.watchlists.manage', 'Manage watchlist entries', 'aml'),
    ('aml.countries.manage', 'Manage high-risk country list', 'aml'),
    ('aml.audit.view', 'View AML audit logs', 'aml')
ON CONFLICT (name) DO NOTHING;

-- Grant AML permissions to compliance role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'compliance'
AND p.name IN (
    'aml.screening.view', 'aml.screening.perform',
    'aml.alerts.view', 'aml.alerts.manage',
    'aml.sar.view', 'aml.sar.create',
    'aml.edd.view', 'aml.edd.manage',
    'aml.risk.view', 'aml.risk.manage',
    'aml.rules.view',
    'aml.audit.view'
)
ON CONFLICT DO NOTHING;

-- Grant full AML permissions to admin and superadmin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('admin', 'superadmin')
AND p.category = 'aml'
ON CONFLICT DO NOTHING;


-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE aml_watchlists IS 'Master list of sanctions and watchlists integrated for screening';
COMMENT ON TABLE aml_watchlist_entries IS 'Individual entries from watchlists for name matching';
COMMENT ON TABLE aml_screening_results IS 'Results of screening users against watchlists';
COMMENT ON TABLE aml_risk_profiles IS 'Comprehensive risk scoring for each user';
COMMENT ON TABLE aml_monitoring_rules IS 'Configurable rules for transaction monitoring';
COMMENT ON TABLE aml_alerts IS 'Alerts generated by monitoring rules';
COMMENT ON TABLE aml_suspicious_activity_reports IS 'SARs filed with regulatory authorities';
COMMENT ON TABLE aml_currency_transaction_reports IS 'CTRs for large cash transactions';
COMMENT ON TABLE aml_enhanced_due_diligence IS 'EDD records for high-risk customers';
COMMENT ON TABLE aml_transaction_events IS 'Log of transactions evaluated by monitoring';
COMMENT ON TABLE aml_high_risk_countries IS 'High-risk jurisdictions requiring enhanced scrutiny';
COMMENT ON TABLE aml_audit_log IS 'Audit trail for all compliance actions';

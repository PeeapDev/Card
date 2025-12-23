-- ============================================================================
-- NFC PREPAID CARD SYSTEM - CLOSED LOOP
-- Migration: 001_nfc_prepaid_cards_schema.sql
-- Description: Complete schema for physical NFC prepaid cards with secure elements
--
-- This system is SEPARATE from existing card systems:
-- - Card Products (module-based marketplace)
-- - Card Programs (order-based with features)
-- - Issued Virtual Cards (user-generated)
--
-- This system handles:
-- - Physical NFC cards with DESFire EV2/EV3 secure elements
-- - Vendor street sales distribution
-- - User activation via mobile app NFC tap
-- - Tap-to-pay at merchant POS terminals
-- - Full key management with HSM integration
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. NFC CARD PROGRAMS (Types/Templates)
-- ============================================================================
-- Defines the types of NFC prepaid cards available in the system

CREATE TABLE IF NOT EXISTS nfc_card_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Program Identity
    program_code VARCHAR(20) UNIQUE NOT NULL,           -- e.g., 'NFC-ANON-50', 'NFC-NAMED-500'
    program_name VARCHAR(100) NOT NULL,                 -- Display name
    description TEXT,

    -- Card Classification
    card_category VARCHAR(30) NOT NULL DEFAULT 'ANONYMOUS',  -- ANONYMOUS, NAMED, CORPORATE
    is_reloadable BOOLEAN NOT NULL DEFAULT FALSE,
    requires_kyc BOOLEAN NOT NULL DEFAULT FALSE,
    kyc_level_required INTEGER DEFAULT 0,              -- 0=none, 1=basic, 2=full

    -- Pricing (CRITICAL: Each card has an integrated price)
    card_price DECIMAL(15,2) NOT NULL,                 -- Price to purchase the card
    initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0,  -- Pre-loaded amount (can be 0)
    currency VARCHAR(3) NOT NULL DEFAULT 'SLE',

    -- Balance Limits
    max_balance DECIMAL(15,2) NOT NULL DEFAULT 1000000,
    min_reload_amount DECIMAL(15,2) DEFAULT 10000,
    max_reload_amount DECIMAL(15,2) DEFAULT 500000,

    -- Transaction Limits
    daily_transaction_limit DECIMAL(15,2) NOT NULL DEFAULT 500000,
    weekly_transaction_limit DECIMAL(15,2) DEFAULT 2000000,
    monthly_transaction_limit DECIMAL(15,2) DEFAULT 5000000,
    per_transaction_limit DECIMAL(15,2) NOT NULL DEFAULT 200000,
    daily_transaction_count INTEGER DEFAULT 20,

    -- Fees
    reload_fee_percentage DECIMAL(5,2) DEFAULT 0,
    reload_fee_fixed DECIMAL(15,2) DEFAULT 0,
    transaction_fee_percentage DECIMAL(5,2) DEFAULT 1.5,
    transaction_fee_fixed DECIMAL(15,2) DEFAULT 0,
    monthly_maintenance_fee DECIMAL(15,2) DEFAULT 0,
    inactivity_fee DECIMAL(15,2) DEFAULT 0,            -- After inactivity_days
    inactivity_days INTEGER DEFAULT 90,

    -- Card Design
    card_design_template VARCHAR(50),
    card_color_primary VARCHAR(7) DEFAULT '#1A1A2E',
    card_color_secondary VARCHAR(7) DEFAULT '#E94560',
    card_image_url TEXT,

    -- Validity
    validity_months INTEGER NOT NULL DEFAULT 36,        -- Card expires after this

    -- Security Requirements
    chip_type VARCHAR(20) NOT NULL DEFAULT 'DESFIRE_EV3',  -- DESFIRE_EV1, DESFIRE_EV2, DESFIRE_EV3
    requires_pin BOOLEAN DEFAULT TRUE,
    max_pin_attempts INTEGER DEFAULT 3,

    -- Allowed Merchant Categories (NULL = all allowed)
    allowed_mcc_codes TEXT[],                          -- e.g., ['5411', '5812'] - groceries, restaurants
    blocked_mcc_codes TEXT[],

    -- Online/Offline Behavior
    allow_offline_transactions BOOLEAN DEFAULT FALSE,
    offline_transaction_limit DECIMAL(15,2) DEFAULT 0,
    offline_daily_limit DECIMAL(15,2) DEFAULT 0,
    offline_transaction_count INTEGER DEFAULT 0,

    -- Program Status
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',      -- ACTIVE, SUSPENDED, DISCONTINUED
    is_visible BOOLEAN DEFAULT TRUE,                   -- Show in admin/vendor lists

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,

    -- Constraints
    CONSTRAINT valid_chip_type CHECK (chip_type IN ('UID_ONLY', 'DESFIRE_EV1', 'DESFIRE_EV2', 'DESFIRE_EV3')),
    CONSTRAINT valid_category CHECK (card_category IN ('ANONYMOUS', 'NAMED', 'CORPORATE', 'GIFT')),
    CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DISCONTINUED')),
    CONSTRAINT valid_limits CHECK (per_transaction_limit <= daily_transaction_limit),
    CONSTRAINT valid_price CHECK (card_price >= 0),
    CONSTRAINT valid_initial_balance CHECK (initial_balance >= 0)
);

-- ============================================================================
-- 2. NFC CARD BATCHES (Manufacturing & Distribution)
-- ============================================================================
-- Tracks card manufacturing batches for inventory and reconciliation

CREATE TABLE IF NOT EXISTS nfc_card_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Batch Identity
    batch_code VARCHAR(30) UNIQUE NOT NULL,            -- e.g., 'BATCH-2024-001'
    program_id UUID NOT NULL REFERENCES nfc_card_programs(id),

    -- Manufacturing Details
    card_count INTEGER NOT NULL,
    manufacturer VARCHAR(100),
    manufacture_date DATE,
    manufacture_order_number VARCHAR(50),

    -- Key Management
    master_key_id UUID,                                -- Reference to HSM master key
    key_derivation_method VARCHAR(30) DEFAULT 'AES_CMAC',  -- How per-card keys are derived
    key_version INTEGER DEFAULT 1,

    -- Card Number Range (BIN + sequence)
    bin_prefix VARCHAR(8) NOT NULL DEFAULT '62000001', -- Issuer BIN for this batch
    sequence_start INTEGER NOT NULL,
    sequence_end INTEGER NOT NULL,

    -- Distribution Status
    status VARCHAR(30) NOT NULL DEFAULT 'MANUFACTURED',
    -- MANUFACTURED -> QUALITY_CHECKED -> IN_WAREHOUSE -> DISTRIBUTED -> FULLY_SOLD

    -- Inventory Tracking
    cards_in_warehouse INTEGER DEFAULT 0,
    cards_distributed INTEGER DEFAULT 0,
    cards_sold INTEGER DEFAULT 0,
    cards_activated INTEGER DEFAULT 0,
    cards_defective INTEGER DEFAULT 0,

    -- Quality Control
    qc_passed BOOLEAN DEFAULT FALSE,
    qc_date DATE,
    qc_notes TEXT,

    -- Pricing at batch level (can override program price)
    unit_cost DECIMAL(15,2),                           -- Manufacturing cost per card
    wholesale_price DECIMAL(15,2),                     -- Price to vendors
    retail_price DECIMAL(15,2),                        -- Suggested retail price

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    distributed_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_sequence CHECK (sequence_end >= sequence_start),
    CONSTRAINT valid_batch_status CHECK (status IN (
        'MANUFACTURED', 'QUALITY_CHECKED', 'IN_WAREHOUSE', 'DISTRIBUTED', 'FULLY_SOLD', 'RECALLED'
    ))
);

-- ============================================================================
-- 3. NFC CARD VENDORS (Street Distribution Partners)
-- ============================================================================
-- Vendors who sell cards on the street

CREATE TABLE IF NOT EXISTS nfc_card_vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Vendor Identity
    vendor_code VARCHAR(20) UNIQUE NOT NULL,           -- e.g., 'VND-001'
    business_name VARCHAR(150) NOT NULL,
    contact_name VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),

    -- Location
    region VARCHAR(50),
    district VARCHAR(50),
    address TEXT,
    gps_latitude DECIMAL(10,7),
    gps_longitude DECIMAL(10,7),

    -- Commission Structure
    commission_type VARCHAR(20) DEFAULT 'PERCENTAGE',  -- PERCENTAGE, FIXED, TIERED
    commission_rate DECIMAL(5,2) DEFAULT 5.00,         -- 5% of card price
    commission_fixed DECIMAL(15,2) DEFAULT 0,

    -- Settlement
    settlement_account_type VARCHAR(20) DEFAULT 'WALLET',  -- WALLET, BANK
    settlement_wallet_id UUID,
    settlement_bank_name VARCHAR(100),
    settlement_account_number VARCHAR(30),
    settlement_frequency VARCHAR(20) DEFAULT 'WEEKLY', -- DAILY, WEEKLY, MONTHLY

    -- Inventory Limits
    max_inventory_value DECIMAL(15,2) DEFAULT 10000000,  -- Max cards value vendor can hold
    current_inventory_value DECIMAL(15,2) DEFAULT 0,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- PENDING -> APPROVED -> ACTIVE -> SUSPENDED -> TERMINATED
    approved_at TIMESTAMPTZ,
    approved_by UUID,

    -- Security
    pin_hash VARCHAR(255),                             -- For vendor authentication
    device_ids TEXT[],                                 -- Registered devices

    -- Performance Metrics
    total_cards_sold INTEGER DEFAULT 0,
    total_sales_value DECIMAL(15,2) DEFAULT 0,
    last_sale_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_vendor_status CHECK (status IN ('PENDING', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'TERMINATED')),
    CONSTRAINT valid_commission_type CHECK (commission_type IN ('PERCENTAGE', 'FIXED', 'TIERED'))
);

-- ============================================================================
-- 4. VENDOR CARD INVENTORY (Batch Assignment to Vendors)
-- ============================================================================
-- Tracks which batches/cards are assigned to which vendors

CREATE TABLE IF NOT EXISTS nfc_vendor_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    vendor_id UUID NOT NULL REFERENCES nfc_card_vendors(id),
    batch_id UUID NOT NULL REFERENCES nfc_card_batches(id),

    -- Assignment Details
    cards_assigned INTEGER NOT NULL,
    cards_sold INTEGER DEFAULT 0,
    cards_returned INTEGER DEFAULT 0,
    cards_damaged INTEGER DEFAULT 0,

    -- Card Range (from batch)
    sequence_start INTEGER NOT NULL,
    sequence_end INTEGER NOT NULL,

    -- Financial
    assigned_value DECIMAL(15,2) NOT NULL,             -- Total value of cards assigned
    sales_value DECIMAL(15,2) DEFAULT 0,               -- Value of cards sold
    commission_earned DECIMAL(15,2) DEFAULT 0,
    commission_paid DECIMAL(15,2) DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'ASSIGNED',
    -- ASSIGNED -> ACTIVE -> RECONCILED -> RETURNED

    -- Timestamps
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reconciled_at TIMESTAMPTZ,

    CONSTRAINT valid_inventory_status CHECK (status IN ('ASSIGNED', 'ACTIVE', 'RECONCILED', 'RETURNED'))
);

-- ============================================================================
-- 5. NFC PREPAID CARDS (Individual Cards)
-- ============================================================================
-- The core card table - each physical NFC card

CREATE TABLE IF NOT EXISTS nfc_prepaid_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Card Identity
    card_number VARCHAR(16) UNIQUE NOT NULL,           -- Masked PAN for display
    card_uid VARCHAR(32) UNIQUE NOT NULL,              -- NFC UID (7 or 14 bytes hex)
    card_uid_hash VARCHAR(64) NOT NULL,                -- SHA256 of UID for lookups

    -- Program & Batch
    program_id UUID NOT NULL REFERENCES nfc_card_programs(id),
    batch_id UUID NOT NULL REFERENCES nfc_card_batches(id),

    -- Key Reference (NO ACTUAL KEYS STORED - HSM only)
    key_slot_id VARCHAR(50) NOT NULL,                  -- Reference to HSM key slot
    key_version INTEGER NOT NULL DEFAULT 1,
    diversification_data VARCHAR(64),                  -- Data used for key diversification

    -- Card Lifecycle State
    state VARCHAR(30) NOT NULL DEFAULT 'CREATED',
    -- CREATED -> ISSUED -> SOLD -> INACTIVE -> ACTIVATED -> SUSPENDED -> BLOCKED -> REPLACED

    -- Vendor Assignment
    vendor_id UUID REFERENCES nfc_card_vendors(id),
    vendor_inventory_id UUID REFERENCES nfc_vendor_inventory(id),

    -- User Binding (after activation)
    user_id UUID,                                      -- References users table
    wallet_id UUID,                                    -- References wallets table
    activation_code VARCHAR(20),                       -- One-time activation code (hashed)
    activation_code_hash VARCHAR(64),

    -- Balance (Card-stored value - NOT in wallet)
    balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    pending_balance DECIMAL(15,2) DEFAULT 0,           -- Pending settlements
    currency VARCHAR(3) NOT NULL DEFAULT 'SLE',

    -- Spending Trackers
    daily_spent DECIMAL(15,2) DEFAULT 0,
    weekly_spent DECIMAL(15,2) DEFAULT 0,
    monthly_spent DECIMAL(15,2) DEFAULT 0,
    daily_transaction_count INTEGER DEFAULT 0,
    last_spending_reset_daily DATE,
    last_spending_reset_weekly DATE,
    last_spending_reset_monthly DATE,

    -- Card Limits (inherited from program, can be overridden)
    per_transaction_limit DECIMAL(15,2),
    daily_limit DECIMAL(15,2),
    weekly_limit DECIMAL(15,2),
    monthly_limit DECIMAL(15,2),

    -- Security
    pin_hash VARCHAR(255),
    pin_attempts INTEGER DEFAULT 0,
    pin_blocked_until TIMESTAMPTZ,

    -- Card Name/Label (user-defined after activation)
    card_label VARCHAR(50),

    -- Validity
    manufactured_at DATE,
    expires_at DATE NOT NULL,

    -- Lifecycle Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    issued_at TIMESTAMPTZ,                             -- Assigned to vendor
    sold_at TIMESTAMPTZ,                               -- Vendor marked as sold
    activated_at TIMESTAMPTZ,                          -- User activated
    suspended_at TIMESTAMPTZ,
    blocked_at TIMESTAMPTZ,
    replaced_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,

    -- Replacement Tracking
    replaced_by_card_id UUID REFERENCES nfc_prepaid_cards(id),
    replaces_card_id UUID REFERENCES nfc_prepaid_cards(id),

    -- Fraud & Risk
    fraud_score INTEGER DEFAULT 0,
    fraud_flags TEXT[],
    last_location_lat DECIMAL(10,7),
    last_location_lng DECIMAL(10,7),
    last_device_fingerprint VARCHAR(255),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Constraints
    CONSTRAINT valid_card_state CHECK (state IN (
        'CREATED', 'ISSUED', 'SOLD', 'INACTIVE', 'ACTIVATED',
        'SUSPENDED', 'BLOCKED', 'REPLACED', 'EXPIRED', 'DESTROYED'
    )),
    CONSTRAINT valid_balance CHECK (balance >= 0)
);

-- Index for NFC UID lookups (critical for tap transactions)
CREATE INDEX IF NOT EXISTS idx_nfc_cards_uid_hash ON nfc_prepaid_cards(card_uid_hash);
CREATE INDEX IF NOT EXISTS idx_nfc_cards_state ON nfc_prepaid_cards(state);
CREATE INDEX IF NOT EXISTS idx_nfc_cards_user ON nfc_prepaid_cards(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nfc_cards_vendor ON nfc_prepaid_cards(vendor_id);

-- ============================================================================
-- 6. NFC CARD TRANSACTIONS
-- ============================================================================
-- All transactions on NFC prepaid cards

CREATE TABLE IF NOT EXISTS nfc_card_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Transaction Identity
    transaction_reference VARCHAR(30) UNIQUE NOT NULL,
    authorization_code VARCHAR(12),

    -- Card Reference
    card_id UUID NOT NULL REFERENCES nfc_prepaid_cards(id),
    card_number_masked VARCHAR(19),                    -- ****-****-****-1234

    -- Transaction Type
    transaction_type VARCHAR(30) NOT NULL,
    -- PURCHASE, RELOAD, REFUND, REVERSAL, ADJUSTMENT, FEE, TRANSFER_OUT, TRANSFER_IN

    -- Amount
    amount DECIMAL(15,2) NOT NULL,
    fee_amount DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL,                 -- amount - fee (for purchases)
    currency VARCHAR(3) NOT NULL DEFAULT 'SLE',

    -- Balance Tracking
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,

    -- Transaction State
    state VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- PENDING -> AUTHORIZED -> CAPTURED -> SETTLED | DECLINED | REVERSED | FAILED

    -- Merchant Details (for purchases)
    merchant_id UUID,
    merchant_name VARCHAR(150),
    merchant_mcc VARCHAR(4),
    merchant_location TEXT,

    -- POS/Terminal Details
    terminal_id VARCHAR(30),
    terminal_type VARCHAR(20),                         -- NFC_POS, MOBILE_POS, ONLINE

    -- Cryptographic Validation
    challenge_sent VARCHAR(32),
    response_received VARCHAR(32),
    crypto_validation_result VARCHAR(20),              -- VALID, INVALID, TIMEOUT

    -- Online/Offline
    is_offline BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,

    -- Location
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),

    -- Decline/Failure Details
    decline_reason VARCHAR(50),
    decline_code VARCHAR(10),
    error_message TEXT,

    -- Settlement
    settlement_batch_id UUID,
    settled_at TIMESTAMPTZ,

    -- Refund Tracking
    original_transaction_id UUID REFERENCES nfc_card_transactions(id),
    refund_amount DECIMAL(15,2) DEFAULT 0,
    refund_status VARCHAR(20),                         -- NONE, PARTIAL, FULL

    -- Fraud
    fraud_score INTEGER DEFAULT 0,
    fraud_check_result VARCHAR(20),                    -- PASS, FLAG, BLOCK
    fraud_flags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    authorized_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ,

    -- Device Info
    device_fingerprint VARCHAR(255),
    user_agent TEXT,
    ip_address INET,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    CONSTRAINT valid_transaction_type CHECK (transaction_type IN (
        'PURCHASE', 'RELOAD', 'REFUND', 'REVERSAL', 'ADJUSTMENT',
        'FEE', 'TRANSFER_OUT', 'TRANSFER_IN', 'ACTIVATION_CREDIT', 'BALANCE_TRANSFER'
    )),
    CONSTRAINT valid_transaction_state CHECK (state IN (
        'PENDING', 'AUTHORIZED', 'CAPTURED', 'SETTLED', 'DECLINED', 'REVERSED', 'FAILED', 'EXPIRED'
    ))
);

CREATE INDEX IF NOT EXISTS idx_nfc_transactions_card ON nfc_card_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_nfc_transactions_merchant ON nfc_card_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_nfc_transactions_state ON nfc_card_transactions(state);
CREATE INDEX IF NOT EXISTS idx_nfc_transactions_date ON nfc_card_transactions(created_at);

-- ============================================================================
-- 7. NFC CARD RELOAD HISTORY
-- ============================================================================
-- Tracks all reload operations

CREATE TABLE IF NOT EXISTS nfc_card_reloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    card_id UUID NOT NULL REFERENCES nfc_prepaid_cards(id),
    transaction_id UUID REFERENCES nfc_card_transactions(id),

    -- Reload Details
    reload_amount DECIMAL(15,2) NOT NULL,
    fee_amount DECIMAL(15,2) DEFAULT 0,
    total_charged DECIMAL(15,2) NOT NULL,

    -- Source
    reload_source VARCHAR(30) NOT NULL,                -- WALLET, CASH, BANK_TRANSFER, AGENT
    source_wallet_id UUID,
    source_reference VARCHAR(100),

    -- Balance
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- PENDING -> COMPLETED | FAILED | REVERSED

    -- Agent/Vendor Details (for cash reloads)
    agent_id UUID,
    agent_type VARCHAR(20),                            -- VENDOR, AGENT, BRANCH

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    CONSTRAINT valid_reload_source CHECK (reload_source IN ('WALLET', 'CASH', 'BANK_TRANSFER', 'AGENT', 'SYSTEM')),
    CONSTRAINT valid_reload_status CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED'))
);

-- ============================================================================
-- 8. VENDOR SALES LOG
-- ============================================================================
-- Records each card sale by vendors

CREATE TABLE IF NOT EXISTS nfc_vendor_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    vendor_id UUID NOT NULL REFERENCES nfc_card_vendors(id),
    card_id UUID NOT NULL REFERENCES nfc_prepaid_cards(id),

    -- Sale Details
    sale_price DECIMAL(15,2) NOT NULL,
    commission_amount DECIMAL(15,2) NOT NULL,
    net_amount DECIMAL(15,2) NOT NULL,                 -- sale_price - commission

    -- Payment Method at vendor
    payment_method VARCHAR(20) DEFAULT 'CASH',         -- CASH, MOBILE_MONEY

    -- Receipt
    receipt_number VARCHAR(30),

    -- Timestamps
    sold_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Reconciliation
    reconciled BOOLEAN DEFAULT FALSE,
    reconciled_at TIMESTAMPTZ,
    settlement_id UUID
);

CREATE INDEX IF NOT EXISTS idx_vendor_sales_vendor ON nfc_vendor_sales(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_sales_date ON nfc_vendor_sales(sold_at);

-- ============================================================================
-- 9. VENDOR SETTLEMENTS
-- ============================================================================
-- Settlement batches for vendors

CREATE TABLE IF NOT EXISTS nfc_vendor_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    vendor_id UUID NOT NULL REFERENCES nfc_card_vendors(id),

    -- Settlement Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Amounts
    gross_sales DECIMAL(15,2) NOT NULL,
    total_commission DECIMAL(15,2) NOT NULL,
    net_payable DECIMAL(15,2) NOT NULL,                -- Amount owed to issuer

    -- Card Counts
    cards_sold INTEGER NOT NULL,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- PENDING -> APPROVED -> PAID | DISPUTED

    -- Payment Details
    payment_method VARCHAR(30),
    payment_reference VARCHAR(100),
    paid_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID,

    CONSTRAINT valid_settlement_status CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'DISPUTED', 'CANCELLED'))
);

-- ============================================================================
-- 10. NFC KEY MANAGEMENT (HSM References)
-- ============================================================================
-- NO ACTUAL KEYS STORED - Only references to HSM slots

CREATE TABLE IF NOT EXISTS nfc_key_management (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Key Identity
    key_id VARCHAR(50) UNIQUE NOT NULL,                -- HSM key identifier
    key_alias VARCHAR(100),

    -- Key Type
    key_type VARCHAR(30) NOT NULL,
    -- ISSUER_MASTER, BATCH_MASTER, CARD_AUTH, CARD_MAC, CARD_ENC

    -- Key Hierarchy
    parent_key_id UUID REFERENCES nfc_key_management(id),

    -- Batch Association
    batch_id UUID REFERENCES nfc_card_batches(id),

    -- Key Metadata (NO ACTUAL KEY VALUES)
    algorithm VARCHAR(20) NOT NULL DEFAULT 'AES-256',
    key_version INTEGER NOT NULL DEFAULT 1,

    -- Key Lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    -- ACTIVE, SUSPENDED, REVOKED, EXPIRED

    -- HSM Details
    hsm_slot_id VARCHAR(50) NOT NULL,
    hsm_provider VARCHAR(50),                          -- THALES, SAFENET, AWS_CLOUDHSM

    -- Validity
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,

    -- Audit
    created_by UUID,

    CONSTRAINT valid_key_type CHECK (key_type IN (
        'ISSUER_MASTER', 'BATCH_MASTER', 'CARD_AUTH', 'CARD_MAC', 'CARD_ENC', 'SESSION'
    )),
    CONSTRAINT valid_key_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED'))
);

-- ============================================================================
-- 11. NFC TERMINAL REGISTRY
-- ============================================================================
-- Registered POS terminals for tap-to-pay

CREATE TABLE IF NOT EXISTS nfc_terminals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Terminal Identity
    terminal_id VARCHAR(30) UNIQUE NOT NULL,
    terminal_name VARCHAR(100),

    -- Merchant Association
    merchant_id UUID NOT NULL,                         -- References merchant_businesses

    -- Terminal Type
    terminal_type VARCHAR(30) NOT NULL,
    -- DEDICATED_POS, MOBILE_POS, SOFTPOS, KIOSK

    -- Technical Details
    device_model VARCHAR(100),
    firmware_version VARCHAR(30),
    nfc_chip_type VARCHAR(30),

    -- Security
    terminal_key_id UUID REFERENCES nfc_key_management(id),
    last_key_injection TIMESTAMPTZ,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- PENDING -> ACTIVE -> SUSPENDED -> DECOMMISSIONED

    -- Location
    location_name VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),

    -- Capabilities
    supports_offline BOOLEAN DEFAULT FALSE,
    offline_limit DECIMAL(15,2) DEFAULT 0,
    supports_pin BOOLEAN DEFAULT TRUE,
    supports_contactless BOOLEAN DEFAULT TRUE,

    -- Activity Tracking
    last_transaction_at TIMESTAMPTZ,
    total_transactions INTEGER DEFAULT 0,

    -- Timestamps
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ,

    CONSTRAINT valid_terminal_type CHECK (terminal_type IN ('DEDICATED_POS', 'MOBILE_POS', 'SOFTPOS', 'KIOSK')),
    CONSTRAINT valid_terminal_status CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'DECOMMISSIONED'))
);

-- ============================================================================
-- 12. AUDIT LOG
-- ============================================================================
-- Comprehensive audit trail for all NFC card operations

CREATE TABLE IF NOT EXISTS nfc_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Event Details
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(30) NOT NULL,
    -- CARD_LIFECYCLE, TRANSACTION, VENDOR, KEY_MANAGEMENT, ADMIN, SECURITY

    -- Entity Reference
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID NOT NULL,

    -- Actor
    actor_type VARCHAR(20) NOT NULL,                   -- USER, ADMIN, SYSTEM, VENDOR, TERMINAL
    actor_id UUID,

    -- Details
    action VARCHAR(50) NOT NULL,
    description TEXT,
    old_values JSONB,
    new_values JSONB,

    -- Context
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),

    -- Location
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Indexes for common queries
    CONSTRAINT valid_event_category CHECK (event_category IN (
        'CARD_LIFECYCLE', 'TRANSACTION', 'VENDOR', 'KEY_MANAGEMENT', 'ADMIN', 'SECURITY', 'FRAUD'
    ))
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON nfc_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON nfc_audit_log(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON nfc_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_event ON nfc_audit_log(event_type);

-- ============================================================================
-- 13. FRAUD DETECTION RULES
-- ============================================================================
-- Configurable fraud detection rules

CREATE TABLE IF NOT EXISTS nfc_fraud_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    rule_code VARCHAR(30) UNIQUE NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Rule Configuration
    rule_type VARCHAR(30) NOT NULL,
    -- VELOCITY, GEO_FENCE, AMOUNT, PATTERN, TIME_BASED

    rule_config JSONB NOT NULL,
    -- Examples:
    -- {"max_transactions_per_hour": 10, "action": "FLAG"}
    -- {"max_distance_km": 100, "time_window_minutes": 30, "action": "BLOCK"}

    -- Actions
    action_on_trigger VARCHAR(20) NOT NULL,            -- FLAG, BLOCK, DECLINE, ALERT
    score_impact INTEGER DEFAULT 0,                    -- Add to fraud score

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 100,                      -- Lower = higher priority

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_rule_type CHECK (rule_type IN ('VELOCITY', 'GEO_FENCE', 'AMOUNT', 'PATTERN', 'TIME_BASED', 'DEVICE'))
);

-- ============================================================================
-- 14. CARD REPLACEMENT REQUESTS
-- ============================================================================
-- Track lost/stolen/damaged card replacements

CREATE TABLE IF NOT EXISTS nfc_card_replacements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    original_card_id UUID NOT NULL REFERENCES nfc_prepaid_cards(id),
    replacement_card_id UUID REFERENCES nfc_prepaid_cards(id),

    -- Request Details
    reason VARCHAR(30) NOT NULL,
    -- LOST, STOLEN, DAMAGED, EXPIRED, UPGRADE

    description TEXT,

    -- Balance Transfer
    original_balance DECIMAL(15,2) NOT NULL,
    balance_transferred DECIMAL(15,2),
    replacement_fee DECIMAL(15,2) DEFAULT 0,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    -- REQUESTED -> APPROVED -> ISSUED -> COMPLETED | REJECTED

    -- Processing
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    completed_at TIMESTAMPTZ,

    -- Delivery (if physical replacement)
    delivery_address TEXT,
    tracking_number VARCHAR(50),

    CONSTRAINT valid_replacement_reason CHECK (reason IN ('LOST', 'STOLEN', 'DAMAGED', 'EXPIRED', 'UPGRADE')),
    CONSTRAINT valid_replacement_status CHECK (status IN ('REQUESTED', 'APPROVED', 'ISSUED', 'COMPLETED', 'REJECTED', 'CANCELLED'))
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to generate card number with Luhn check digit
CREATE OR REPLACE FUNCTION generate_nfc_card_number(p_bin_prefix VARCHAR(8), p_sequence INTEGER)
RETURNS VARCHAR(16) AS $$
DECLARE
    v_partial VARCHAR(15);
    v_check_digit INTEGER;
    v_sum INTEGER := 0;
    v_digit INTEGER;
    v_doubled INTEGER;
    v_position INTEGER;
BEGIN
    -- Create partial number: BIN (8) + sequence (7) = 15 digits
    v_partial := p_bin_prefix || LPAD(p_sequence::TEXT, 7, '0');

    -- Calculate Luhn check digit
    FOR v_position IN REVERSE 15..1 LOOP
        v_digit := SUBSTRING(v_partial FROM v_position FOR 1)::INTEGER;

        IF (16 - v_position) % 2 = 0 THEN
            v_doubled := v_digit * 2;
            IF v_doubled > 9 THEN
                v_doubled := v_doubled - 9;
            END IF;
            v_sum := v_sum + v_doubled;
        ELSE
            v_sum := v_sum + v_digit;
        END IF;
    END LOOP;

    v_check_digit := (10 - (v_sum % 10)) % 10;

    RETURN v_partial || v_check_digit::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to mask card number
CREATE OR REPLACE FUNCTION mask_card_number(p_card_number VARCHAR(16))
RETURNS VARCHAR(19) AS $$
BEGIN
    RETURN SUBSTRING(p_card_number FROM 1 FOR 4) || '-****-****-' || SUBSTRING(p_card_number FROM 13 FOR 4);
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily spending (run via cron)
CREATE OR REPLACE FUNCTION reset_nfc_daily_spending()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE nfc_prepaid_cards
    SET
        daily_spent = 0,
        daily_transaction_count = 0,
        last_spending_reset_daily = CURRENT_DATE
    WHERE state = 'ACTIVATED'
      AND (last_spending_reset_daily IS NULL OR last_spending_reset_daily < CURRENT_DATE);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to reset weekly spending
CREATE OR REPLACE FUNCTION reset_nfc_weekly_spending()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE nfc_prepaid_cards
    SET
        weekly_spent = 0,
        last_spending_reset_weekly = DATE_TRUNC('week', CURRENT_DATE)::DATE
    WHERE state = 'ACTIVATED'
      AND (last_spending_reset_weekly IS NULL
           OR last_spending_reset_weekly < DATE_TRUNC('week', CURRENT_DATE)::DATE);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly spending
CREATE OR REPLACE FUNCTION reset_nfc_monthly_spending()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE nfc_prepaid_cards
    SET
        monthly_spent = 0,
        last_spending_reset_monthly = DATE_TRUNC('month', CURRENT_DATE)::DATE
    WHERE state = 'ACTIVATED'
      AND (last_spending_reset_monthly IS NULL
           OR last_spending_reset_monthly < DATE_TRUNC('month', CURRENT_DATE)::DATE);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE nfc_prepaid_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_card_reloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_card_replacements ENABLE ROW LEVEL SECURITY;

-- Users can only see their own cards (admins can see all)
-- Note: roles column is a comma-separated string (TypeORM simple-array)
CREATE POLICY nfc_cards_user_policy ON nfc_prepaid_cards
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.roles LIKE '%admin%' OR users.roles LIKE '%superadmin%')
        )
    );

-- Users can only see their own transactions (admins can see all)
CREATE POLICY nfc_transactions_user_policy ON nfc_card_transactions
    FOR SELECT
    USING (
        card_id IN (SELECT id FROM nfc_prepaid_cards WHERE user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.roles LIKE '%admin%' OR users.roles LIKE '%superadmin%')
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_nfc_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nfc_programs_updated
    BEFORE UPDATE ON nfc_card_programs
    FOR EACH ROW EXECUTE FUNCTION update_nfc_timestamp();

CREATE TRIGGER trg_nfc_batches_updated
    BEFORE UPDATE ON nfc_card_batches
    FOR EACH ROW EXECUTE FUNCTION update_nfc_timestamp();

CREATE TRIGGER trg_nfc_vendors_updated
    BEFORE UPDATE ON nfc_card_vendors
    FOR EACH ROW EXECUTE FUNCTION update_nfc_timestamp();

-- Audit trigger for card state changes
CREATE OR REPLACE FUNCTION audit_nfc_card_state_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.state IS DISTINCT FROM NEW.state THEN
        INSERT INTO nfc_audit_log (
            event_type, event_category, entity_type, entity_id,
            actor_type, action, old_values, new_values
        ) VALUES (
            'CARD_STATE_CHANGE', 'CARD_LIFECYCLE', 'nfc_prepaid_cards', NEW.id,
            'SYSTEM', 'STATE_TRANSITION',
            jsonb_build_object('state', OLD.state),
            jsonb_build_object('state', NEW.state)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nfc_card_state_audit
    AFTER UPDATE ON nfc_prepaid_cards
    FOR EACH ROW EXECUTE FUNCTION audit_nfc_card_state_change();

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default card programs
INSERT INTO nfc_card_programs (
    program_code, program_name, description, card_category,
    is_reloadable, requires_kyc, card_price, initial_balance,
    daily_transaction_limit, per_transaction_limit, chip_type, validity_months
) VALUES
-- Anonymous prepaid cards (no KYC, lower limits)
('NFC-ANON-25', 'Basic Prepaid 25', 'Entry-level anonymous NFC card with Le 25,000 preloaded',
 'ANONYMOUS', FALSE, FALSE, 30000, 25000, 100000, 50000, 'DESFIRE_EV3', 24),

('NFC-ANON-50', 'Basic Prepaid 50', 'Anonymous NFC card with Le 50,000 preloaded',
 'ANONYMOUS', FALSE, FALSE, 55000, 50000, 200000, 100000, 'DESFIRE_EV3', 24),

('NFC-ANON-100', 'Basic Prepaid 100', 'Anonymous NFC card with Le 100,000 preloaded',
 'ANONYMOUS', FALSE, FALSE, 105000, 100000, 300000, 150000, 'DESFIRE_EV3', 24),

-- Reloadable cards (KYC required, higher limits)
('NFC-RELOAD-STD', 'Reloadable Standard', 'Reloadable NFC card with KYC - Standard tier',
 'NAMED', TRUE, TRUE, 25000, 0, 500000, 200000, 'DESFIRE_EV3', 36),

('NFC-RELOAD-PRO', 'Reloadable Pro', 'Reloadable NFC card with KYC - Professional tier',
 'NAMED', TRUE, TRUE, 50000, 0, 1000000, 500000, 'DESFIRE_EV3', 36),

-- Gift cards
('NFC-GIFT-50', 'Gift Card 50', 'Gift card with Le 50,000 preloaded - non-reloadable',
 'GIFT', FALSE, FALSE, 52500, 50000, 200000, 100000, 'DESFIRE_EV3', 12),

('NFC-GIFT-100', 'Gift Card 100', 'Gift card with Le 100,000 preloaded - non-reloadable',
 'GIFT', FALSE, FALSE, 105000, 100000, 300000, 150000, 'DESFIRE_EV3', 12)
ON CONFLICT (program_code) DO NOTHING;

-- Insert default fraud rules
INSERT INTO nfc_fraud_rules (rule_code, rule_name, rule_type, rule_config, action_on_trigger, score_impact)
VALUES
('VEL-HOUR-10', 'Velocity: Max 10 txns/hour', 'VELOCITY',
 '{"max_transactions": 10, "time_window_minutes": 60}', 'FLAG', 20),

('VEL-DAY-30', 'Velocity: Max 30 txns/day', 'VELOCITY',
 '{"max_transactions": 30, "time_window_minutes": 1440}', 'FLAG', 15),

('GEO-IMPOSSIBLE', 'Impossible Travel', 'GEO_FENCE',
 '{"max_distance_km": 500, "time_window_minutes": 60}', 'BLOCK', 50),

('AMT-HIGH', 'High Amount Alert', 'AMOUNT',
 '{"threshold_percentage": 80, "of_limit": "per_transaction_limit"}', 'FLAG', 10),

('TIME-NIGHT', 'Night Time Transactions', 'TIME_BASED',
 '{"start_hour": 0, "end_hour": 5, "timezone": "Africa/Freetown"}', 'FLAG', 5),

('DEVICE-NEW', 'New Device Detection', 'DEVICE',
 '{"require_known_device": true, "grace_period_hours": 24}', 'FLAG', 15)
ON CONFLICT (rule_code) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE nfc_card_programs IS 'Card program definitions - templates for NFC prepaid cards';
COMMENT ON TABLE nfc_card_batches IS 'Manufacturing batches for inventory and key management';
COMMENT ON TABLE nfc_card_vendors IS 'Street vendors who distribute and sell cards';
COMMENT ON TABLE nfc_vendor_inventory IS 'Card batch assignments to vendors';
COMMENT ON TABLE nfc_prepaid_cards IS 'Individual NFC prepaid cards with lifecycle tracking';
COMMENT ON TABLE nfc_card_transactions IS 'All transactions on NFC cards';
COMMENT ON TABLE nfc_key_management IS 'HSM key references - NO actual keys stored';
COMMENT ON TABLE nfc_terminals IS 'Registered POS terminals for tap-to-pay';
COMMENT ON TABLE nfc_audit_log IS 'Comprehensive audit trail';
COMMENT ON TABLE nfc_fraud_rules IS 'Configurable fraud detection rules';

COMMENT ON COLUMN nfc_prepaid_cards.card_uid IS 'NFC UID from chip - used for identification only, NOT for auth';
COMMENT ON COLUMN nfc_prepaid_cards.key_slot_id IS 'Reference to HSM key slot - actual keys never in database';
COMMENT ON COLUMN nfc_card_programs.card_price IS 'Price to purchase the card - REQUIRED for all programs';

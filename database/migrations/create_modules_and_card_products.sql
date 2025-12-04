-- ============================================================================
-- MODULE SYSTEM TABLES
-- ============================================================================

-- System modules that can be enabled/disabled
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL, -- Unique identifier (e.g., 'kyc_advanced', 'loyalty_program')
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- e.g., 'payment', 'security', 'feature'
    version VARCHAR(20),
    is_enabled BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false, -- System modules cannot be deleted
    icon VARCHAR(255), -- Icon/image URL
    config JSONB DEFAULT '{}', -- Module-specific configuration
    dependencies TEXT[], -- Array of module codes this depends on
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    enabled_at TIMESTAMP WITH TIME ZONE,
    enabled_by UUID REFERENCES users(id)
);

-- Module settings/configuration history
CREATE TABLE IF NOT EXISTS module_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CARD PRODUCT SYSTEM TABLES
-- ============================================================================

-- Card products/templates (created by superadmin)
CREATE TABLE IF NOT EXISTS card_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'basic', 'premium', 'platinum'
    name VARCHAR(255) NOT NULL, -- e.g., 'Basic Card', 'Premium Card'
    description TEXT,
    tier INTEGER NOT NULL DEFAULT 1, -- 1=Basic, 2=Premium, 3=Platinum, etc.

    -- Card appearance
    card_design_url VARCHAR(500), -- URL to card design image
    card_color VARCHAR(7) DEFAULT '#1A1A1A', -- Hex color
    card_text_color VARCHAR(7) DEFAULT '#FFFFFF',

    -- Pricing
    purchase_price DECIMAL(15, 2) NOT NULL DEFAULT 0, -- One-time card purchase fee
    annual_fee DECIMAL(15, 2) DEFAULT 0, -- Yearly maintenance fee
    currency VARCHAR(3) DEFAULT 'SLE',

    -- Card limits
    daily_transaction_limit DECIMAL(15, 2),
    monthly_transaction_limit DECIMAL(15, 2),
    max_balance DECIMAL(15, 2),
    min_balance DECIMAL(15, 2) DEFAULT 0,

    -- Transaction fees
    transaction_fee_percent DECIMAL(5, 2) DEFAULT 0, -- % fee per transaction
    transaction_fee_flat DECIMAL(10, 2) DEFAULT 0, -- Flat fee per transaction
    atm_withdrawal_fee DECIMAL(10, 2) DEFAULT 0,
    foreign_transaction_fee_percent DECIMAL(5, 2) DEFAULT 0,

    -- Features
    is_online_enabled BOOLEAN DEFAULT true,
    is_atm_enabled BOOLEAN DEFAULT false,
    is_contactless_enabled BOOLEAN DEFAULT false,
    is_international_enabled BOOLEAN DEFAULT false,
    cashback_percent DECIMAL(5, 2) DEFAULT 0,

    -- BIN configuration
    bin_prefix VARCHAR(8) NOT NULL, -- First 6-8 digits of card number (Bank Identification Number)
    card_length INTEGER DEFAULT 16, -- Total card number length

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_visible BOOLEAN DEFAULT true, -- Show in user dashboard
    stock_limit INTEGER, -- NULL = unlimited, number = limited stock
    cards_issued INTEGER DEFAULT 0, -- Counter for issued cards

    -- Metadata
    features JSONB DEFAULT '[]', -- Array of feature descriptions for display
    terms_and_conditions TEXT,
    sort_order INTEGER DEFAULT 0, -- Display order

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Track individual card instances issued to users
-- Extends the existing 'cards' table with product relationship
ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_product_id UUID REFERENCES card_products(id);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS purchase_amount DECIMAL(15, 2);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS annual_fee_due_date DATE;

-- Card purchase transactions
CREATE TABLE IF NOT EXISTS card_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    card_product_id UUID NOT NULL REFERENCES card_products(id),
    card_id UUID REFERENCES cards(id), -- Linked after card is issued

    -- Payment details
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SLE',
    payment_method VARCHAR(50), -- 'wallet', 'mobile_money', 'bank_transfer'
    payment_reference VARCHAR(255),

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_reason TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_modules_code ON modules(code);
CREATE INDEX IF NOT EXISTS idx_modules_enabled ON modules(is_enabled);
CREATE INDEX IF NOT EXISTS idx_card_products_tier ON card_products(tier);
CREATE INDEX IF NOT EXISTS idx_card_products_active ON card_products(is_active, is_visible);
CREATE INDEX IF NOT EXISTS idx_card_purchases_user ON card_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_card_purchases_status ON card_purchases(status);
CREATE INDEX IF NOT EXISTS idx_cards_product ON cards(card_product_id);

-- ============================================================================
-- SEED DATA - DEFAULT MODULES
-- ============================================================================

INSERT INTO modules (code, name, description, category, is_enabled, is_system, icon)
VALUES
    ('card_issuance', 'Card Issuance', 'Enable users to purchase and own virtual/physical payment cards', 'feature', true, true, '💳'),
    ('loyalty_rewards', 'Loyalty & Rewards', 'Cashback and rewards program for transactions', 'feature', false, false, '🎁'),
    ('multi_currency', 'Multi-Currency Wallets', 'Allow users to hold multiple currency wallets', 'feature', false, false, '💱'),
    ('merchant_api', 'Merchant API Access', 'Enable merchant payment acceptance APIs', 'feature', true, true, '🔌'),
    ('kyc_advanced', 'Advanced KYC', 'Enhanced identity verification with biometrics', 'security', false, false, '🔐'),
    ('recurring_payments', 'Recurring Payments', 'Subscription and recurring payment support', 'feature', false, false, '🔄'),
    ('bill_payments', 'Bill Payments', 'Utility bills, airtime, and service payments', 'feature', false, false, '📱'),
    ('savings_goals', 'Savings Goals', 'Help users set and track savings targets', 'feature', false, false, '🎯')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SEED DATA - DEFAULT CARD PRODUCTS
-- ============================================================================

INSERT INTO card_products (
    code, name, description, tier,
    purchase_price, annual_fee, currency,
    daily_transaction_limit, monthly_transaction_limit, max_balance,
    transaction_fee_percent, transaction_fee_flat,
    bin_prefix, card_length,
    is_online_enabled, is_atm_enabled, is_contactless_enabled, is_international_enabled,
    features, sort_order
)
VALUES
    (
        'basic',
        'Basic Card',
        'Perfect for everyday spending with essential features',
        1,
        5000, 0, 'SLE',
        50000, 500000, 1000000,
        1.5, 50,
        '520010', 16,
        true, false, false, false,
        '["Online payments", "Daily spending limit: Le 500", "1.5% transaction fee", "Free to maintain"]'::jsonb,
        1
    ),
    (
        'premium',
        'Premium Card',
        'Enhanced limits and features for power users',
        2,
        15000, 5000, 'SLE',
        200000, 2000000, 5000000,
        1.0, 0,
        '520011', 16,
        true, true, true, false,
        '["Online & ATM payments", "Higher spending limits", "1% transaction fee", "Contactless payments", "Le 50 annual fee"]'::jsonb,
        2
    ),
    (
        'platinum',
        'Platinum Card',
        'Premium features with international support and cashback',
        3,
        50000, 10000, 'SLE',
        1000000, 10000000, 20000000,
        0.5, 0,
        '520012', 16,
        true, true, true, true,
        '["All payment methods", "Highest limits", "0.5% transaction fee", "International payments", "1% cashback", "Airport lounge access", "Le 100 annual fee"]'::jsonb,
        3
    )
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate unique card number with Luhn check digit
CREATE OR REPLACE FUNCTION generate_card_number(bin_prefix VARCHAR, card_length INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    account_number VARCHAR;
    full_number VARCHAR;
    check_digit INTEGER;
    digit_sum INTEGER := 0;
    digit INTEGER;
    i INTEGER;
BEGIN
    -- Generate random account number (length - BIN length - 1 for check digit)
    account_number := '';
    FOR i IN 1..(card_length - LENGTH(bin_prefix) - 1) LOOP
        account_number := account_number || FLOOR(RANDOM() * 10)::VARCHAR;
    END LOOP;

    -- Combine BIN + account number
    full_number := bin_prefix || account_number;

    -- Calculate Luhn check digit
    FOR i IN 1..LENGTH(full_number) LOOP
        digit := SUBSTRING(full_number FROM i FOR 1)::INTEGER;

        -- Double every second digit from right
        IF (LENGTH(full_number) - i + 1) % 2 = 0 THEN
            digit := digit * 2;
            IF digit > 9 THEN
                digit := digit - 9;
            END IF;
        END IF;

        digit_sum := digit_sum + digit;
    END LOOP;

    -- Check digit makes the sum divisible by 10
    check_digit := (10 - (digit_sum % 10)) % 10;

    RETURN full_number || check_digit::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- Function to validate card number using Luhn algorithm
CREATE OR REPLACE FUNCTION validate_card_number(card_number VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    digit_sum INTEGER := 0;
    digit INTEGER;
    i INTEGER;
BEGIN
    -- Remove spaces and dashes
    card_number := REGEXP_REPLACE(card_number, '[^0-9]', '', 'g');

    -- Must be numeric and reasonable length
    IF card_number !~ '^[0-9]{12,19}$' THEN
        RETURN FALSE;
    END IF;

    -- Calculate Luhn checksum
    FOR i IN 1..LENGTH(card_number) LOOP
        digit := SUBSTRING(card_number FROM i FOR 1)::INTEGER;

        IF (LENGTH(card_number) - i + 1) % 2 = 0 THEN
            digit := digit * 2;
            IF digit > 9 THEN
                digit := digit - 9;
            END IF;
        END IF;

        digit_sum := digit_sum + digit;
    END LOOP;

    RETURN (digit_sum % 10) = 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE modules IS 'System modules that can be enabled/disabled to extend platform features';
COMMENT ON TABLE card_products IS 'Card product templates created by superadmin with tiers and pricing';
COMMENT ON TABLE card_purchases IS 'Track user purchases of card products';

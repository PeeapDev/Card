-- Migration: Create nfc_tags table for NFC payment links
-- This table stores NFC tag configurations linked to cards/wallets

-- Create nfc_tags table
CREATE TABLE IF NOT EXISTS nfc_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id VARCHAR(50) UNIQUE NOT NULL, -- Unique NFC tag identifier (e.g., NFC_ABC123)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL, -- User-friendly name (e.g., "My Business Card")
    payment_url TEXT NOT NULL, -- Full payment URL for this tag
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Stats
    total_transactions INTEGER NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    scan_count INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    hardware_written_at TIMESTAMPTZ, -- When the tag was written to NFC hardware
    last_scanned_at TIMESTAMPTZ, -- Last time the tag was scanned
    last_transaction_at TIMESTAMPTZ, -- Last successful transaction

    -- Limits and settings
    daily_limit DECIMAL(15,2), -- Optional daily spending limit
    single_transaction_limit DECIMAL(15,2), -- Optional per-transaction limit
    requires_pin BOOLEAN NOT NULL DEFAULT false, -- Require PIN for payments

    -- Metadata
    metadata JSONB DEFAULT '{}', -- Additional data (cardholder_name, card_last_four, etc.)

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_nfc_tags_tag_id ON nfc_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_nfc_tags_user_id ON nfc_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_nfc_tags_wallet_id ON nfc_tags(wallet_id);
CREATE INDEX IF NOT EXISTS idx_nfc_tags_card_id ON nfc_tags(card_id);
CREATE INDEX IF NOT EXISTS idx_nfc_tags_is_active ON nfc_tags(is_active);
CREATE INDEX IF NOT EXISTS idx_nfc_tags_created_at ON nfc_tags(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_nfc_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nfc_tags_updated_at ON nfc_tags;
CREATE TRIGGER nfc_tags_updated_at
    BEFORE UPDATE ON nfc_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_nfc_tags_updated_at();

-- Enable RLS
ALTER TABLE nfc_tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role full access on nfc_tags" ON nfc_tags;
DROP POLICY IF EXISTS "Users view own nfc_tags" ON nfc_tags;
DROP POLICY IF EXISTS "Users create own nfc_tags" ON nfc_tags;
DROP POLICY IF EXISTS "Users update own nfc_tags" ON nfc_tags;
DROP POLICY IF EXISTS "Users delete own nfc_tags" ON nfc_tags;
DROP POLICY IF EXISTS "Public read active nfc_tags by tag_id" ON nfc_tags;
DROP POLICY IF EXISTS "Admins view all nfc_tags" ON nfc_tags;
DROP POLICY IF EXISTS "Admins update nfc_tags" ON nfc_tags;

-- RLS Policies
-- Service role can do everything
CREATE POLICY "Service role full access on nfc_tags"
    ON nfc_tags
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Users can view their own NFC tags
CREATE POLICY "Users view own nfc_tags"
    ON nfc_tags
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can create their own NFC tags
CREATE POLICY "Users create own nfc_tags"
    ON nfc_tags
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own NFC tags
CREATE POLICY "Users update own nfc_tags"
    ON nfc_tags
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own NFC tags
CREATE POLICY "Users delete own nfc_tags"
    ON nfc_tags
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Allow public read of active NFC tags (for payment lookup by tag_id)
CREATE POLICY "Public read active nfc_tags by tag_id"
    ON nfc_tags
    FOR SELECT
    TO anon
    USING (is_active = true);

-- Admins can view all NFC tags
CREATE POLICY "Admins view all nfc_tags"
    ON nfc_tags
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.roles LIKE '%admin%' OR users.roles LIKE '%superadmin%')
        )
    );

-- Admins can update any NFC tag
CREATE POLICY "Admins update nfc_tags"
    ON nfc_tags
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.roles LIKE '%admin%' OR users.roles LIKE '%superadmin%')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.roles LIKE '%admin%' OR users.roles LIKE '%superadmin%')
        )
    );

-- Create NFC transaction log table
CREATE TABLE IF NOT EXISTS nfc_tag_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nfc_tag_id UUID NOT NULL REFERENCES nfc_tags(id) ON DELETE CASCADE,
    transaction_id VARCHAR(100) NOT NULL, -- Reference to main transactions table
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_name VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'completed', -- completed, failed, refunded
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nfc_tag_transactions_nfc_tag_id ON nfc_tag_transactions(nfc_tag_id);
CREATE INDEX IF NOT EXISTS idx_nfc_tag_transactions_transaction_id ON nfc_tag_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_nfc_tag_transactions_created_at ON nfc_tag_transactions(created_at DESC);

-- Enable RLS on transaction log
ALTER TABLE nfc_tag_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role full access on nfc_tag_transactions" ON nfc_tag_transactions;
DROP POLICY IF EXISTS "Users view own nfc_tag_transactions" ON nfc_tag_transactions;

-- Service role full access
CREATE POLICY "Service role full access on nfc_tag_transactions"
    ON nfc_tag_transactions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Users can view transactions for their NFC tags
CREATE POLICY "Users view own nfc_tag_transactions"
    ON nfc_tag_transactions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM nfc_tags
            WHERE nfc_tags.id = nfc_tag_transactions.nfc_tag_id
            AND nfc_tags.user_id = auth.uid()
        )
    );

-- Function to record NFC transaction and update stats
CREATE OR REPLACE FUNCTION record_nfc_transaction(
    p_nfc_tag_id UUID,
    p_transaction_id VARCHAR(100),
    p_amount DECIMAL(15,2),
    p_currency VARCHAR(10),
    p_sender_id UUID,
    p_sender_name VARCHAR(200),
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_log_id UUID;
BEGIN
    -- Insert transaction log
    INSERT INTO nfc_tag_transactions (
        nfc_tag_id,
        transaction_id,
        amount,
        currency,
        sender_id,
        sender_name,
        status,
        metadata
    ) VALUES (
        p_nfc_tag_id,
        p_transaction_id,
        p_amount,
        p_currency,
        p_sender_id,
        p_sender_name,
        'completed',
        p_metadata
    )
    RETURNING id INTO v_transaction_log_id;

    -- Update NFC tag stats
    UPDATE nfc_tags
    SET
        total_transactions = total_transactions + 1,
        total_amount = total_amount + p_amount,
        last_transaction_at = NOW()
    WHERE id = p_nfc_tag_id;

    RETURN v_transaction_log_id;
END;
$$;

-- Add comments
COMMENT ON TABLE nfc_tags IS 'NFC payment tags linked to cards/wallets for tap-to-pay functionality';
COMMENT ON COLUMN nfc_tags.tag_id IS 'Unique identifier for the NFC tag (used in payment URLs)';
COMMENT ON COLUMN nfc_tags.payment_url IS 'Full URL that is written to the NFC tag';
COMMENT ON COLUMN nfc_tags.hardware_written_at IS 'Timestamp when the tag was written to physical NFC hardware';
COMMENT ON COLUMN nfc_tags.metadata IS 'Additional context like cardholder name, card last four digits';
COMMENT ON TABLE nfc_tag_transactions IS 'Transaction log for NFC tag payments';

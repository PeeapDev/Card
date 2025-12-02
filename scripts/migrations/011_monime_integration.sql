-- Monime Payment Gateway Integration Migration
-- Creates table for tracking Monime deposits and withdrawals

-- Connect to account_db
\c account_db;

-- Create enum types
DO $$ BEGIN
    CREATE TYPE monime_transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE monime_transaction_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'DELAYED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE monime_deposit_method AS ENUM ('CHECKOUT_SESSION', 'PAYMENT_CODE', 'MOBILE_MONEY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE monime_withdraw_method AS ENUM ('MOBILE_MONEY', 'BANK_TRANSFER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create monime_transactions table
CREATE TABLE IF NOT EXISTS monime_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    type monime_transaction_type NOT NULL,
    status monime_transaction_status NOT NULL DEFAULT 'PENDING',

    -- Monime reference
    monime_reference VARCHAR(100),
    monime_event_id VARCHAR(100),

    -- User and wallet
    wallet_id UUID NOT NULL,
    user_id UUID NOT NULL,

    -- Amount info
    amount DECIMAL(19, 4) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'SLE',
    fee DECIMAL(19, 4),
    net_amount DECIMAL(19, 4),

    -- Deposit specific
    deposit_method monime_deposit_method,
    payment_url VARCHAR(500),
    ussd_code VARCHAR(50),

    -- Withdrawal specific
    withdraw_method monime_withdraw_method,
    destination_phone VARCHAR(20),
    destination_bank_code VARCHAR(50),
    destination_account_number VARCHAR(50),
    destination_account_name VARCHAR(100),

    -- Description and status
    description VARCHAR(255),
    failure_reason VARCHAR(255),
    delay_reason VARCHAR(255),

    -- Timestamps
    expires_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- JSON fields
    metadata JSONB,
    monime_response JSONB,
    webhook_history JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_monime_transactions_monime_reference ON monime_transactions(monime_reference);
CREATE INDEX IF NOT EXISTS idx_monime_transactions_wallet_id_type ON monime_transactions(wallet_id, type);
CREATE INDEX IF NOT EXISTS idx_monime_transactions_user_id_created ON monime_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monime_transactions_status_type ON monime_transactions(status, type);
CREATE INDEX IF NOT EXISTS idx_monime_transactions_idempotency ON monime_transactions(idempotency_key);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_monime_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_monime_transactions_updated_at ON monime_transactions;
CREATE TRIGGER trigger_monime_transactions_updated_at
    BEFORE UPDATE ON monime_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_monime_transactions_updated_at();

-- Add comments
COMMENT ON TABLE monime_transactions IS 'Tracks all Monime payment gateway transactions (deposits and withdrawals)';
COMMENT ON COLUMN monime_transactions.idempotency_key IS 'Unique key to prevent duplicate transactions';
COMMENT ON COLUMN monime_transactions.monime_reference IS 'Monime transaction/session ID';
COMMENT ON COLUMN monime_transactions.monime_event_id IS 'Last processed webhook event ID for idempotency';
COMMENT ON COLUMN monime_transactions.payment_url IS 'Checkout session URL for deposits';
COMMENT ON COLUMN monime_transactions.ussd_code IS 'USSD payment code for mobile deposits';
COMMENT ON COLUMN monime_transactions.webhook_history IS 'Array of all webhook events received';

GRANT ALL ON monime_transactions TO account_user;

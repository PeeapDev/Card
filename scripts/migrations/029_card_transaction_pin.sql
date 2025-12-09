-- Migration: Add transaction PIN to cards table
-- This enables card-based checkout payments with PIN verification

-- Add transaction_pin column to cards table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cards'
        AND column_name = 'transaction_pin'
    ) THEN
        ALTER TABLE cards ADD COLUMN transaction_pin VARCHAR(4);
        COMMENT ON COLUMN cards.transaction_pin IS '4-digit PIN for transaction authorization';
    END IF;
END $$;

-- Add index for faster card number lookups
CREATE INDEX IF NOT EXISTS idx_cards_card_number ON cards(card_number);

-- Grant necessary permissions
GRANT SELECT ON cards TO authenticated;
GRANT SELECT ON wallets TO authenticated;

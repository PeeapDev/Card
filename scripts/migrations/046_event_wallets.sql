-- Event Wallets Migration
-- Adds wallet functionality to events for managing revenue and staff payments

-- Event Wallets Table
CREATE TABLE IF NOT EXISTS event_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'SLE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event Wallet Transactions Table
CREATE TABLE IF NOT EXISTS event_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES event_wallets(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'ticket_sale', 'transfer_to_staff', 'transfer_to_main', 'refund', 'adjustment'
    amount DECIMAL(15, 2) NOT NULL,
    fee DECIMAL(15, 2) DEFAULT 0.00,
    net_amount DECIMAL(15, 2) NOT NULL,
    direction VARCHAR(10) NOT NULL, -- 'credit' or 'debit'
    recipient_id UUID REFERENCES users(id), -- For staff transfers
    recipient_wallet_id UUID, -- Main wallet ID for transfers
    reference VARCHAR(255),
    description TEXT,
    ticket_id UUID REFERENCES event_tickets(id), -- For ticket sales
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'reversed'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff Payment Requests Table (for tracking staff payment requests)
CREATE TABLE IF NOT EXISTS event_staff_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES event_wallets(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SLE',
    payment_type VARCHAR(50) DEFAULT 'bonus', -- 'bonus', 'salary', 'commission', 'reimbursement'
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'completed', 'rejected'
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    transaction_id UUID REFERENCES event_wallet_transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_wallets_event_id ON event_wallets(event_id);
CREATE INDEX IF NOT EXISTS idx_event_wallets_merchant_id ON event_wallets(merchant_id);
CREATE INDEX IF NOT EXISTS idx_event_wallet_transactions_wallet_id ON event_wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_event_wallet_transactions_event_id ON event_wallet_transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_wallet_transactions_type ON event_wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_event_wallet_transactions_created_at ON event_wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_staff_payments_event_id ON event_staff_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_payments_staff_id ON event_staff_payments(staff_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_payments_status ON event_staff_payments(status);

-- RLS Policies
ALTER TABLE event_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Merchants can view their event wallets" ON event_wallets;
DROP POLICY IF EXISTS "Merchants can create event wallets" ON event_wallets;
DROP POLICY IF EXISTS "Merchants can update their event wallets" ON event_wallets;
DROP POLICY IF EXISTS "Merchants can view their wallet transactions" ON event_wallet_transactions;
DROP POLICY IF EXISTS "Merchants can create wallet transactions" ON event_wallet_transactions;
DROP POLICY IF EXISTS "Staff can view their received payments" ON event_wallet_transactions;
DROP POLICY IF EXISTS "Merchants can manage staff payments for their events" ON event_staff_payments;
DROP POLICY IF EXISTS "Staff can view their own payment requests" ON event_staff_payments;

-- Event Wallets Policies
CREATE POLICY "Merchants can view their event wallets"
    ON event_wallets FOR SELECT
    USING (merchant_id = auth.uid());

CREATE POLICY "Merchants can create event wallets"
    ON event_wallets FOR INSERT
    WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Merchants can update their event wallets"
    ON event_wallets FOR UPDATE
    USING (merchant_id = auth.uid());

-- Event Wallet Transactions Policies
CREATE POLICY "Merchants can view their wallet transactions"
    ON event_wallet_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM event_wallets
            WHERE event_wallets.id = event_wallet_transactions.wallet_id
            AND event_wallets.merchant_id = auth.uid()
        )
    );

CREATE POLICY "Merchants can create wallet transactions"
    ON event_wallet_transactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_wallets
            WHERE event_wallets.id = event_wallet_transactions.wallet_id
            AND event_wallets.merchant_id = auth.uid()
        )
    );

-- Staff can view transactions where they are recipients
CREATE POLICY "Staff can view their received payments"
    ON event_wallet_transactions FOR SELECT
    USING (recipient_id = auth.uid());

-- Event Staff Payments Policies
CREATE POLICY "Merchants can manage staff payments for their events"
    ON event_staff_payments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = event_staff_payments.event_id
            AND events.merchant_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view their own payment requests"
    ON event_staff_payments FOR SELECT
    USING (staff_id = auth.uid());

-- Function to create wallet when event is created
CREATE OR REPLACE FUNCTION create_event_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO event_wallets (event_id, merchant_id, currency)
    VALUES (NEW.id, NEW.merchant_id, 'SLE');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create wallet for new events
DROP TRIGGER IF EXISTS trigger_create_event_wallet ON events;
CREATE TRIGGER trigger_create_event_wallet
    AFTER INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION create_event_wallet();

-- Function to update wallet balance on ticket sale
CREATE OR REPLACE FUNCTION update_event_wallet_on_ticket_sale()
RETURNS TRIGGER AS $$
DECLARE
    v_wallet_id UUID;
    v_ticket_type RECORD;
BEGIN
    -- Only process completed ticket sales
    IF NEW.status = 'sold' AND (OLD.status IS NULL OR OLD.status != 'sold') THEN
        -- Get the wallet
        SELECT id INTO v_wallet_id FROM event_wallets WHERE event_id = NEW.event_id;

        -- Get ticket type info
        SELECT * INTO v_ticket_type FROM event_ticket_types WHERE id = NEW.ticket_type_id;

        IF v_wallet_id IS NOT NULL AND v_ticket_type.price > 0 THEN
            -- Update wallet balance
            UPDATE event_wallets
            SET balance = balance + v_ticket_type.price,
                updated_at = NOW()
            WHERE id = v_wallet_id;

            -- Record transaction
            INSERT INTO event_wallet_transactions (
                wallet_id, event_id, type, amount, fee, net_amount,
                direction, ticket_id, reference, description, status
            ) VALUES (
                v_wallet_id, NEW.event_id, 'ticket_sale', v_ticket_type.price, 0, v_ticket_type.price,
                'credit', NEW.id, NEW.ticket_number,
                'Ticket sale: ' || v_ticket_type.name, 'completed'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ticket sales
DROP TRIGGER IF EXISTS trigger_update_wallet_on_ticket_sale ON event_tickets;
CREATE TRIGGER trigger_update_wallet_on_ticket_sale
    AFTER INSERT OR UPDATE ON event_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_event_wallet_on_ticket_sale();

-- Create wallets for existing events that don't have one
INSERT INTO event_wallets (event_id, merchant_id, currency)
SELECT e.id, e.merchant_id, 'SLE'
FROM events e
WHERE NOT EXISTS (
    SELECT 1 FROM event_wallets ew WHERE ew.event_id = e.id
);

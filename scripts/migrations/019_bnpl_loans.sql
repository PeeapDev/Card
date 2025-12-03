-- ============================================
-- BNPL (Buy Now Pay Later) System Migration
-- Run this in Supabase SQL Editor
-- ============================================
--
-- This creates:
-- 1. bnpl_loans table to track installment purchases
-- 2. bnpl_payments table to track scheduled/completed payments
-- 3. Functions for BNPL operations
-- ============================================

-- 1. Create bnpl_loans table
CREATE TABLE IF NOT EXISTS bnpl_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES transactions(id),

    -- Loan details
    principal_amount DECIMAL(18,2) NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL,
    interest_amount DECIMAL(18,2) DEFAULT 0,
    interest_rate DECIMAL(5,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'SLE',

    -- Installment info
    num_installments INTEGER NOT NULL DEFAULT 3,
    installment_amount DECIMAL(18,2) NOT NULL,
    installments_paid INTEGER DEFAULT 0,
    amount_paid DECIMAL(18,2) DEFAULT 0,
    amount_remaining DECIMAL(18,2) NOT NULL,

    -- Status
    status VARCHAR(30) DEFAULT 'ACTIVE', -- ACTIVE, PAID_OFF, OVERDUE, DEFAULTED, CANCELLED
    next_payment_date DATE,
    last_payment_date DATE,

    -- Purchase info
    merchant_name VARCHAR(255),
    description TEXT,
    metadata JSONB DEFAULT '{}',

    -- Dates
    started_at TIMESTAMPTZ DEFAULT NOW(),
    due_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create bnpl_payments table (scheduled and actual payments)
CREATE TABLE IF NOT EXISTS bnpl_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES bnpl_loans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Payment details
    amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SLE',
    installment_number INTEGER NOT NULL,

    -- Schedule
    due_date DATE NOT NULL,
    paid_date DATE,

    -- Status
    status VARCHAR(30) DEFAULT 'SCHEDULED', -- SCHEDULED, PAID, OVERDUE, MISSED
    transaction_id UUID REFERENCES transactions(id),

    -- Auto-debit
    auto_debit_enabled BOOLEAN DEFAULT true,
    auto_debit_attempted BOOLEAN DEFAULT false,
    auto_debit_failed_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_bnpl_loans_user_id ON bnpl_loans(user_id);
CREATE INDEX IF NOT EXISTS idx_bnpl_loans_status ON bnpl_loans(status);
CREATE INDEX IF NOT EXISTS idx_bnpl_loans_card_id ON bnpl_loans(card_id);
CREATE INDEX IF NOT EXISTS idx_bnpl_loans_next_payment ON bnpl_loans(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_bnpl_payments_loan_id ON bnpl_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_bnpl_payments_user_id ON bnpl_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_bnpl_payments_due_date ON bnpl_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_bnpl_payments_status ON bnpl_payments(status);

-- 4. Create function to initialize a BNPL purchase
CREATE OR REPLACE FUNCTION create_bnpl_loan(
    p_user_id UUID,
    p_card_id UUID,
    p_amount DECIMAL,
    p_num_installments INTEGER DEFAULT 3,
    p_interest_rate DECIMAL DEFAULT 0,
    p_merchant_name VARCHAR DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_currency VARCHAR DEFAULT 'SLE'
)
RETURNS UUID AS $$
DECLARE
    v_loan_id UUID;
    v_interest_amount DECIMAL;
    v_total_amount DECIMAL;
    v_installment_amount DECIMAL;
    v_due_date DATE;
    v_payment_date DATE;
    v_i INTEGER;
BEGIN
    -- Calculate amounts
    v_interest_amount := ROUND(p_amount * (p_interest_rate / 100), 2);
    v_total_amount := p_amount + v_interest_amount;
    v_installment_amount := ROUND(v_total_amount / p_num_installments, 2);

    -- Set due date (final payment date)
    v_due_date := CURRENT_DATE + (p_num_installments * INTERVAL '1 month');

    -- Create the loan
    INSERT INTO bnpl_loans (
        user_id,
        card_id,
        principal_amount,
        total_amount,
        interest_amount,
        interest_rate,
        currency,
        num_installments,
        installment_amount,
        amount_remaining,
        status,
        next_payment_date,
        merchant_name,
        description,
        due_date
    ) VALUES (
        p_user_id,
        p_card_id,
        p_amount,
        v_total_amount,
        v_interest_amount,
        p_interest_rate,
        p_currency,
        p_num_installments,
        v_installment_amount,
        v_total_amount,
        'ACTIVE',
        CURRENT_DATE + INTERVAL '1 month',
        p_merchant_name,
        p_description,
        v_due_date
    )
    RETURNING id INTO v_loan_id;

    -- Create scheduled payments for each installment
    FOR v_i IN 1..p_num_installments LOOP
        v_payment_date := CURRENT_DATE + (v_i * INTERVAL '1 month');

        INSERT INTO bnpl_payments (
            loan_id,
            user_id,
            amount,
            currency,
            installment_number,
            due_date,
            status
        ) VALUES (
            v_loan_id,
            p_user_id,
            v_installment_amount,
            p_currency,
            v_i,
            v_payment_date,
            'SCHEDULED'
        );
    END LOOP;

    RETURN v_loan_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to make a BNPL payment
CREATE OR REPLACE FUNCTION make_bnpl_payment(
    p_payment_id UUID,
    p_wallet_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    loan_status VARCHAR
) AS $$
DECLARE
    v_payment RECORD;
    v_loan RECORD;
    v_transaction_id UUID;
    v_new_paid INTEGER;
    v_new_amount_paid DECIMAL;
    v_new_remaining DECIMAL;
    v_new_status VARCHAR;
    v_next_due DATE;
BEGIN
    -- Get payment details
    SELECT * INTO v_payment FROM bnpl_payments WHERE id = p_payment_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Payment not found'::TEXT, NULL::VARCHAR;
        RETURN;
    END IF;

    IF v_payment.status = 'PAID' THEN
        RETURN QUERY SELECT false, 'Payment already made'::TEXT, NULL::VARCHAR;
        RETURN;
    END IF;

    -- Get loan details
    SELECT * INTO v_loan FROM bnpl_loans WHERE id = v_payment.loan_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Loan not found'::TEXT, NULL::VARCHAR;
        RETURN;
    END IF;

    -- Check wallet balance
    PERFORM 1 FROM wallets WHERE id = p_wallet_id AND balance >= v_payment.amount;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Insufficient wallet balance'::TEXT, v_loan.status;
        RETURN;
    END IF;

    -- Deduct from wallet
    UPDATE wallets
    SET balance = balance - v_payment.amount,
        updated_at = NOW()
    WHERE id = p_wallet_id;

    -- Create transaction record
    INSERT INTO transactions (
        wallet_id,
        type,
        amount,
        status,
        description,
        metadata
    ) VALUES (
        p_wallet_id,
        'BNPL_PAYMENT',
        -v_payment.amount,
        'COMPLETED',
        'BNPL installment payment #' || v_payment.installment_number,
        jsonb_build_object('loan_id', v_loan.id, 'payment_id', p_payment_id)
    )
    RETURNING id INTO v_transaction_id;

    -- Update payment status
    UPDATE bnpl_payments
    SET status = 'PAID',
        paid_date = CURRENT_DATE,
        transaction_id = v_transaction_id,
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- Calculate new loan state
    v_new_paid := v_loan.installments_paid + 1;
    v_new_amount_paid := v_loan.amount_paid + v_payment.amount;
    v_new_remaining := v_loan.amount_remaining - v_payment.amount;

    -- Determine new status
    IF v_new_paid >= v_loan.num_installments THEN
        v_new_status := 'PAID_OFF';
        v_next_due := NULL;
    ELSE
        v_new_status := 'ACTIVE';
        -- Get next scheduled payment date
        SELECT due_date INTO v_next_due
        FROM bnpl_payments
        WHERE loan_id = v_loan.id AND status = 'SCHEDULED'
        ORDER BY installment_number
        LIMIT 1;
    END IF;

    -- Update loan
    UPDATE bnpl_loans
    SET installments_paid = v_new_paid,
        amount_paid = v_new_amount_paid,
        amount_remaining = v_new_remaining,
        status = v_new_status,
        next_payment_date = v_next_due,
        last_payment_date = CURRENT_DATE,
        completed_at = CASE WHEN v_new_status = 'PAID_OFF' THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE id = v_loan.id;

    RETURN QUERY SELECT true, 'Payment successful'::TEXT, v_new_status;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to check for overdue payments
CREATE OR REPLACE FUNCTION mark_overdue_bnpl_payments()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Mark payments as overdue
    UPDATE bnpl_payments
    SET status = 'OVERDUE',
        updated_at = NOW()
    WHERE status = 'SCHEDULED'
      AND due_date < CURRENT_DATE;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Update loans with overdue payments
    UPDATE bnpl_loans l
    SET status = 'OVERDUE',
        updated_at = NOW()
    WHERE status = 'ACTIVE'
      AND EXISTS (
          SELECT 1 FROM bnpl_payments p
          WHERE p.loan_id = l.id AND p.status = 'OVERDUE'
      );

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Create view for user BNPL summary
CREATE OR REPLACE VIEW user_bnpl_summary AS
SELECT
    user_id,
    COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_loans,
    COUNT(*) FILTER (WHERE status = 'OVERDUE') as overdue_loans,
    COALESCE(SUM(amount_remaining) FILTER (WHERE status IN ('ACTIVE', 'OVERDUE')), 0) as total_outstanding,
    COALESCE(SUM(total_amount), 0) as lifetime_borrowed,
    COALESCE(SUM(amount_paid), 0) as total_repaid
FROM bnpl_loans
GROUP BY user_id;

-- 8. RLS Policies
ALTER TABLE bnpl_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE bnpl_payments ENABLE ROW LEVEL SECURITY;

-- BNPL loans policies
DROP POLICY IF EXISTS "bnpl_loans_select_own" ON bnpl_loans;
CREATE POLICY "bnpl_loans_select_own" ON bnpl_loans
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    ));

DROP POLICY IF EXISTS "bnpl_loans_insert_system" ON bnpl_loans;
CREATE POLICY "bnpl_loans_insert_system" ON bnpl_loans
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "bnpl_loans_update_system" ON bnpl_loans;
CREATE POLICY "bnpl_loans_update_system" ON bnpl_loans
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

-- BNPL payments policies
DROP POLICY IF EXISTS "bnpl_payments_select_own" ON bnpl_payments;
CREATE POLICY "bnpl_payments_select_own" ON bnpl_payments
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    ));

DROP POLICY IF EXISTS "bnpl_payments_insert_system" ON bnpl_payments;
CREATE POLICY "bnpl_payments_insert_system" ON bnpl_payments
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "bnpl_payments_update_system" ON bnpl_payments;
CREATE POLICY "bnpl_payments_update_system" ON bnpl_payments
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION create_bnpl_loan(UUID, UUID, DECIMAL, INTEGER, DECIMAL, VARCHAR, TEXT, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION make_bnpl_payment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_overdue_bnpl_payments() TO authenticated;

-- 10. Verify setup
SELECT 'BNPL loans table created' as status;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bnpl_loans' ORDER BY ordinal_position;

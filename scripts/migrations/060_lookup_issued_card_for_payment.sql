-- Migration: 060_lookup_issued_card_for_payment
-- Description: Add RPC function to look up issued cards for payment with CVV verification
-- Created: 2024-12-20

-- Function to look up an issued card for payment
-- Verifies card number and CVV hash, returns card info for checkout
CREATE OR REPLACE FUNCTION lookup_issued_card_for_payment(
    p_card_number VARCHAR(16),
    p_cvv VARCHAR(3)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_card RECORD;
    v_wallet RECORD;
BEGIN
    -- Look up card by number
    SELECT
        ic.id,
        ic.user_id,
        ic.wallet_id,
        ic.card_number,
        ic.card_last_four,
        ic.card_name,
        ic.cvv_hash,
        ic.card_status,
        ic.expiry_month,
        ic.expiry_year,
        ic.online_payments_enabled
    INTO v_card
    FROM issued_cards ic
    WHERE ic.card_number = p_card_number;

    -- Card not found
    IF v_card IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Card not found'
        );
    END IF;

    -- Verify CVV using bcrypt comparison
    IF v_card.cvv_hash != crypt(p_cvv, v_card.cvv_hash) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Invalid CVV. Please check your card details.'
        );
    END IF;

    -- Check card status (frozen cards have status 'frozen')
    IF v_card.card_status != 'active' THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', format('Card is %s. Please use an active card.', v_card.card_status)
        );
    END IF;

    -- Check if online payments are enabled
    IF NOT v_card.online_payments_enabled THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Online payments are disabled for this card. Please enable them in the app.'
        );
    END IF;

    -- Get wallet info
    SELECT
        w.id,
        w.balance,
        w.currency
    INTO v_wallet
    FROM wallets w
    WHERE w.id = v_card.wallet_id;

    IF v_wallet IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Card wallet not found'
        );
    END IF;

    -- Return card info for payment (no sensitive data)
    RETURN json_build_object(
        'success', TRUE,
        'cardId', v_card.id,
        'maskedNumber', '****' || v_card.card_last_four,
        'cardholderName', v_card.card_name,
        'walletId', v_card.wallet_id,
        'walletBalance', v_wallet.balance,
        'currency', v_wallet.currency,
        'status', v_card.card_status,
        'expiryMonth', v_card.expiry_month,
        'expiryYear', v_card.expiry_year
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION lookup_issued_card_for_payment TO authenticated, anon;

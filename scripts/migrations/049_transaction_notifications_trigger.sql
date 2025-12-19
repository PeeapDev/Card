-- Migration: Add trigger to create notifications when transactions are inserted
-- This ensures notifications are created server-side, not dependent on client being open

-- Create function to handle transaction notifications
CREATE OR REPLACE FUNCTION create_transaction_notification()
RETURNS TRIGGER AS $$
DECLARE
    notif_type TEXT;
    notif_title TEXT;
    notif_message TEXT;
    abs_amount NUMERIC;
BEGIN
    -- Calculate absolute amount
    abs_amount := ABS(NEW.amount);

    -- Determine notification type and message based on transaction type
    CASE NEW.type
        WHEN 'PAYMENT_RECEIVED' THEN
            notif_type := 'payment_received';
            notif_title := 'Payment Received';
            notif_message := NEW.currency || ' ' || abs_amount::TEXT || ' received' ||
                COALESCE(' from ' || NEW.merchant_name, '');

        WHEN 'TRANSFER' THEN
            IF NEW.amount > 0 THEN
                notif_type := 'transfer_received';
                notif_title := 'Transfer Received';
                notif_message := NEW.currency || ' ' || abs_amount::TEXT || ' received';
            ELSE
                notif_type := 'transfer_sent';
                notif_title := 'Transfer Sent';
                notif_message := NEW.currency || ' ' || abs_amount::TEXT || ' sent';
            END IF;

        WHEN 'PAYMENT' THEN
            notif_type := 'payment_sent';
            notif_title := 'Payment Sent';
            notif_message := NEW.currency || ' ' || abs_amount::TEXT || ' sent' ||
                COALESCE(' to ' || NEW.merchant_name, '');

        WHEN 'MOBILE_MONEY_SEND' THEN
            notif_type := 'withdrawal_completed';
            notif_title := 'Mobile Money Sent';
            notif_message := NEW.currency || ' ' || abs_amount::TEXT || ' sent to mobile money';

        WHEN 'REFUND' THEN
            notif_type := 'refund_processed';
            notif_title := 'Refund Received';
            notif_message := NEW.currency || ' ' || abs_amount::TEXT || ' refunded' ||
                COALESCE(' from ' || NEW.merchant_name, '');

        ELSE
            -- Unknown type, don't create notification
            RETURN NEW;
    END CASE;

    -- Insert notification
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        action_url,
        action_data,
        source_service,
        source_id,
        priority,
        is_read
    ) VALUES (
        NEW.user_id,
        notif_type,
        notif_title,
        notif_message,
        '/dashboard/transactions',
        jsonb_build_object(
            'transactionId', NEW.id,
            'amount', abs_amount,
            'currency', NEW.currency,
            'type', NEW.type,
            'merchantName', NEW.merchant_name
        ),
        'wallet',
        NEW.id,
        CASE
            WHEN NEW.type IN ('PAYMENT_RECEIVED', 'REFUND') AND abs_amount >= 1000 THEN 'high'
            ELSE 'normal'
        END,
        false
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to create transaction notification: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS transaction_notification_trigger ON transactions;

-- Create trigger for new transactions
CREATE TRIGGER transaction_notification_trigger
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION create_transaction_notification();

-- Add comment
COMMENT ON FUNCTION create_transaction_notification() IS 'Automatically creates notifications when transactions are inserted';

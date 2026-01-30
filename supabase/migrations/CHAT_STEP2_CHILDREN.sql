-- STEP 2: Run this second
CREATE TABLE IF NOT EXISTS school_parent_children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL,
    nsi VARCHAR(50) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    student_id_in_school VARCHAR(100),
    class_id VARCHAR(100),
    class_name VARCHAR(100),
    section_name VARCHAR(100),
    profile_photo_url TEXT,
    student_account_id UUID,
    student_wallet_id UUID,
    relationship VARCHAR(50) DEFAULT 'parent',
    is_primary_guardian BOOLEAN DEFAULT false,
    can_pay_fees BOOLEAN DEFAULT true,
    can_topup_wallet BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

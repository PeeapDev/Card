-- Migration: Create business_categories table for merchant categorization
-- Similar to PayPal's business category selection

-- Create business_categories table
CREATE TABLE IF NOT EXISTS business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- Icon name for frontend display (e.g., 'Store', 'Utensils', 'Car')
    parent_id UUID REFERENCES business_categories(id) ON DELETE SET NULL, -- For subcategories
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add business_category_id column to users table (for merchants)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'business_category_id'
    ) THEN
        ALTER TABLE users ADD COLUMN business_category_id UUID REFERENCES business_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_categories_parent_id ON business_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_business_categories_status ON business_categories(status);
CREATE INDEX IF NOT EXISTS idx_users_business_category_id ON users(business_category_id) WHERE business_category_id IS NOT NULL;

-- Insert default business categories (similar to PayPal)
INSERT INTO business_categories (name, description, icon, sort_order) VALUES
    ('Retail & Shopping', 'General retail stores, supermarkets, and shopping', 'ShoppingCart', 1),
    ('Food & Restaurants', 'Restaurants, cafes, food delivery, and catering', 'Utensils', 2),
    ('Professional Services', 'Consulting, legal, accounting, and business services', 'Briefcase', 3),
    ('Health & Wellness', 'Healthcare, pharmacies, gyms, and wellness services', 'Heart', 4),
    ('Education & Training', 'Schools, tutoring, online courses, and training', 'GraduationCap', 5),
    ('Technology & Software', 'IT services, software development, and tech products', 'Monitor', 6),
    ('Transportation & Logistics', 'Delivery services, taxi, car rentals, and logistics', 'Truck', 7),
    ('Entertainment & Media', 'Events, gaming, streaming, and media services', 'Film', 8),
    ('Real Estate & Property', 'Property sales, rentals, and management', 'Building2', 9),
    ('Financial Services', 'Insurance, loans, and financial consulting', 'Landmark', 10),
    ('Travel & Tourism', 'Hotels, travel agencies, and tourism services', 'Plane', 11),
    ('Agriculture & Farming', 'Farming, livestock, and agricultural products', 'Wheat', 12),
    ('Manufacturing', 'Production, factories, and industrial goods', 'Factory', 13),
    ('Construction', 'Building, contracting, and construction services', 'HardHat', 14),
    ('Telecommunications', 'Phone services, internet, and communication', 'Wifi', 15),
    ('Non-Profit & Charity', 'NGOs, charities, and non-profit organizations', 'HandHeart', 16),
    ('Government & Public Sector', 'Government services and public institutions', 'Landmark', 17),
    ('Other', 'Other business types not listed above', 'MoreHorizontal', 99)
ON CONFLICT DO NOTHING;

-- Create RLS policies for business_categories
ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active categories
CREATE POLICY "Anyone can view active business categories"
    ON business_categories
    FOR SELECT
    USING (status = 'ACTIVE' OR current_setting('request.jwt.claims', true)::json->>'role' IN ('superadmin', 'admin'));

-- Only superadmin and admin can manage categories
CREATE POLICY "Admins can manage business categories"
    ON business_categories
    FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' IN ('superadmin', 'admin'));

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_business_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_business_categories_timestamp ON business_categories;
CREATE TRIGGER update_business_categories_timestamp
    BEFORE UPDATE ON business_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_business_categories_updated_at();

-- Comments
COMMENT ON TABLE business_categories IS 'Business categories for merchant classification (similar to PayPal)';
COMMENT ON COLUMN business_categories.parent_id IS 'Optional parent category for subcategories';
COMMENT ON COLUMN business_categories.icon IS 'Lucide icon name for frontend display';
COMMENT ON COLUMN users.business_category_id IS 'Business category for merchant accounts';

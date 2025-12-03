-- Migration: Create junction table for merchant-to-business-categories (many-to-many)
-- This allows merchants to select multiple business categories/subcategories

-- Create merchant_business_categories junction table
CREATE TABLE IF NOT EXISTS merchant_business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_category_id UUID NOT NULL REFERENCES business_categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false, -- Mark one as the primary category
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure a merchant can only have each category once
    UNIQUE(user_id, business_category_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_merchant_business_categories_user_id ON merchant_business_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_business_categories_category_id ON merchant_business_categories(business_category_id);
CREATE INDEX IF NOT EXISTS idx_merchant_business_categories_primary ON merchant_business_categories(user_id) WHERE is_primary = true;

-- Add some subcategories to existing parent categories
-- First, get parent category IDs and insert subcategories

-- Retail & Shopping subcategories
INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Clothing & Apparel', 'Fashion, clothing, shoes, and accessories', 'Shirt', id, 1
FROM business_categories WHERE name = 'Retail & Shopping' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Electronics', 'Phones, computers, gadgets, and accessories', 'Monitor', id, 2
FROM business_categories WHERE name = 'Retail & Shopping' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Home & Garden', 'Furniture, decor, and garden supplies', 'Home', id, 3
FROM business_categories WHERE name = 'Retail & Shopping' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Grocery & Supermarket', 'Food, beverages, and household items', 'ShoppingCart', id, 4
FROM business_categories WHERE name = 'Retail & Shopping' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Food & Restaurants subcategories
INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Restaurants & Dining', 'Sit-down restaurants and eateries', 'Utensils', id, 1
FROM business_categories WHERE name = 'Food & Restaurants' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Fast Food', 'Quick service restaurants and takeaway', 'Utensils', id, 2
FROM business_categories WHERE name = 'Food & Restaurants' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Cafes & Coffee Shops', 'Coffee, tea, and light snacks', 'Coffee', id, 3
FROM business_categories WHERE name = 'Food & Restaurants' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Bakery & Pastry', 'Bread, cakes, and baked goods', 'Cake', id, 4
FROM business_categories WHERE name = 'Food & Restaurants' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Food Delivery', 'Food delivery and catering services', 'Truck', id, 5
FROM business_categories WHERE name = 'Food & Restaurants' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Professional Services subcategories
INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Legal Services', 'Law firms and legal consultants', 'Scale', id, 1
FROM business_categories WHERE name = 'Professional Services' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Accounting & Finance', 'Accountants, bookkeepers, and financial advisors', 'Calculator', id, 2
FROM business_categories WHERE name = 'Professional Services' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Consulting', 'Business and management consulting', 'Briefcase', id, 3
FROM business_categories WHERE name = 'Professional Services' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Marketing & Advertising', 'Marketing agencies and advertising services', 'Megaphone', id, 4
FROM business_categories WHERE name = 'Professional Services' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Health & Wellness subcategories
INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Pharmacy', 'Pharmacies and drugstores', 'Pill', id, 1
FROM business_categories WHERE name = 'Health & Wellness' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Clinics & Hospitals', 'Medical clinics and healthcare facilities', 'Stethoscope', id, 2
FROM business_categories WHERE name = 'Health & Wellness' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Gym & Fitness', 'Gyms, fitness centers, and personal training', 'Dumbbell', id, 3
FROM business_categories WHERE name = 'Health & Wellness' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO business_categories (name, description, icon, parent_id, sort_order)
SELECT 'Spa & Beauty', 'Spas, salons, and beauty services', 'Sparkles', id, 4
FROM business_categories WHERE name = 'Health & Wellness' AND parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Comment for documentation
COMMENT ON TABLE merchant_business_categories IS 'Junction table allowing merchants to have multiple business categories. One category can be marked as primary.';

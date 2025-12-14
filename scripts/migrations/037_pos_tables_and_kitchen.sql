-- Migration: 037_pos_tables_and_kitchen.sql
-- Description: Create tables for Restaurant Table Management and Kitchen Display System
-- Created: 2024-12-14

-- =====================================================
-- TABLE SECTIONS (Grouping for tables)
-- =====================================================
CREATE TABLE IF NOT EXISTS pos_table_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pos_table_sections_merchant ON pos_table_sections(merchant_id);

-- Enable RLS
ALTER TABLE pos_table_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Merchants can view their own sections"
  ON pos_table_sections FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can manage their own sections"
  ON pos_table_sections FOR ALL
  USING (auth.uid() = merchant_id);

-- =====================================================
-- RESTAURANT TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS pos_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_id UUID REFERENCES pos_table_sections(id) ON DELETE SET NULL,

  -- Table info
  table_number VARCHAR(20) NOT NULL,
  name VARCHAR(100),
  capacity INTEGER DEFAULT 4,
  shape VARCHAR(20) DEFAULT 'square', -- square, round, rectangle, bar

  -- Status
  status VARCHAR(20) DEFAULT 'available', -- available, occupied, reserved, cleaning, blocked

  -- Position for floor plan
  position_x INTEGER,
  position_y INTEGER,

  -- Current order/reservation
  current_order_id UUID REFERENCES pos_sales(id) ON DELETE SET NULL,
  current_guests INTEGER,
  occupied_at TIMESTAMPTZ,

  -- Reservation info
  reserved_at TIMESTAMPTZ,
  reserved_name VARCHAR(100),
  reserved_phone VARCHAR(50),

  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique table number per merchant
  UNIQUE(merchant_id, table_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pos_tables_merchant ON pos_tables(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_tables_section ON pos_tables(section_id);
CREATE INDEX IF NOT EXISTS idx_pos_tables_status ON pos_tables(status);

-- Enable RLS
ALTER TABLE pos_tables ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Merchants can view their own tables"
  ON pos_tables FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can manage their own tables"
  ON pos_tables FOR ALL
  USING (auth.uid() = merchant_id);

-- =====================================================
-- ADD KITCHEN/TABLE COLUMNS TO POS_SALES
-- =====================================================
DO $$
BEGIN
  -- Kitchen status for KDS
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_sales' AND column_name = 'kitchen_status') THEN
    ALTER TABLE pos_sales ADD COLUMN kitchen_status VARCHAR(20) DEFAULT 'new';
  END IF;

  -- Kitchen timestamps
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_sales' AND column_name = 'kitchen_started_at') THEN
    ALTER TABLE pos_sales ADD COLUMN kitchen_started_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_sales' AND column_name = 'kitchen_completed_at') THEN
    ALTER TABLE pos_sales ADD COLUMN kitchen_completed_at TIMESTAMPTZ;
  END IF;

  -- Order priority
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_sales' AND column_name = 'priority') THEN
    ALTER TABLE pos_sales ADD COLUMN priority VARCHAR(20) DEFAULT 'normal';
  END IF;

  -- Estimated prep time
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_sales' AND column_name = 'estimated_time') THEN
    ALTER TABLE pos_sales ADD COLUMN estimated_time INTEGER; -- in minutes
  END IF;

  -- Order type (dine-in, takeaway, delivery)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_sales' AND column_name = 'order_type') THEN
    ALTER TABLE pos_sales ADD COLUMN order_type VARCHAR(20) DEFAULT 'dine_in';
  END IF;

  -- Table reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_sales' AND column_name = 'table_id') THEN
    ALTER TABLE pos_sales ADD COLUMN table_id UUID REFERENCES pos_tables(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_sales' AND column_name = 'table_number') THEN
    ALTER TABLE pos_sales ADD COLUMN table_number VARCHAR(20);
  END IF;

  -- Delivery info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_sales' AND column_name = 'delivery_address') THEN
    ALTER TABLE pos_sales ADD COLUMN delivery_address TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_sales' AND column_name = 'delivery_phone') THEN
    ALTER TABLE pos_sales ADD COLUMN delivery_phone VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_sales' AND column_name = 'delivery_notes') THEN
    ALTER TABLE pos_sales ADD COLUMN delivery_notes TEXT;
  END IF;
END $$;

-- Index for kitchen display queries
CREATE INDEX IF NOT EXISTS idx_pos_sales_kitchen_status ON pos_sales(kitchen_status);
CREATE INDEX IF NOT EXISTS idx_pos_sales_order_type ON pos_sales(order_type);
CREATE INDEX IF NOT EXISTS idx_pos_sales_table_id ON pos_sales(table_id);

-- =====================================================
-- ADD NOTES/MODIFIERS TO POS_SALE_ITEMS
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_sale_items' AND column_name = 'notes') THEN
    ALTER TABLE pos_sale_items ADD COLUMN notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_sale_items' AND column_name = 'modifiers') THEN
    ALTER TABLE pos_sale_items ADD COLUMN modifiers JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- =====================================================
-- TABLE RESERVATIONS (Optional detailed tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS pos_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  table_id UUID REFERENCES pos_tables(id) ON DELETE SET NULL,

  -- Reservation details
  guest_name VARCHAR(100) NOT NULL,
  guest_phone VARCHAR(50),
  guest_email VARCHAR(255),
  party_size INTEGER DEFAULT 2,

  -- Timing
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 90,

  -- Status
  status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, seated, completed, cancelled, no_show

  -- Notes
  special_requests TEXT,
  internal_notes TEXT,

  -- Tracking
  confirmed_at TIMESTAMPTZ,
  seated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pos_reservations_merchant ON pos_reservations(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_reservations_table ON pos_reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_pos_reservations_date ON pos_reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_pos_reservations_status ON pos_reservations(status);

-- Enable RLS
ALTER TABLE pos_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Merchants can view their own reservations"
  ON pos_reservations FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can manage their own reservations"
  ON pos_reservations FOR ALL
  USING (auth.uid() = merchant_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pos_table_sections_updated_at ON pos_table_sections;
CREATE TRIGGER trigger_pos_table_sections_updated_at
  BEFORE UPDATE ON pos_table_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_pos_tables_updated_at ON pos_tables;
CREATE TRIGGER trigger_pos_tables_updated_at
  BEFORE UPDATE ON pos_tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_pos_reservations_updated_at ON pos_reservations;
CREATE TRIGGER trigger_pos_reservations_updated_at
  BEFORE UPDATE ON pos_reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get available tables for a merchant
CREATE OR REPLACE FUNCTION get_available_tables(
  p_merchant_id UUID,
  p_capacity INTEGER DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  table_number VARCHAR,
  name VARCHAR,
  capacity INTEGER,
  section_name VARCHAR,
  section_color VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.table_number,
    t.name,
    t.capacity,
    s.name AS section_name,
    s.color AS section_color
  FROM pos_tables t
  LEFT JOIN pos_table_sections s ON s.id = t.section_id
  WHERE t.merchant_id = p_merchant_id
    AND t.status = 'available'
    AND t.is_active = true
    AND t.capacity >= p_capacity
  ORDER BY t.table_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to seat guests at a table
CREATE OR REPLACE FUNCTION seat_table(
  p_table_id UUID,
  p_guests INTEGER,
  p_order_id UUID DEFAULT NULL
)
RETURNS pos_tables AS $$
DECLARE
  v_table pos_tables;
BEGIN
  UPDATE pos_tables
  SET
    status = 'occupied',
    current_guests = p_guests,
    current_order_id = p_order_id,
    occupied_at = NOW()
  WHERE id = p_table_id
  RETURNING * INTO v_table;

  RETURN v_table;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear/free a table
CREATE OR REPLACE FUNCTION clear_table(
  p_table_id UUID,
  p_mark_cleaning BOOLEAN DEFAULT false
)
RETURNS pos_tables AS $$
DECLARE
  v_table pos_tables;
BEGIN
  UPDATE pos_tables
  SET
    status = CASE WHEN p_mark_cleaning THEN 'cleaning' ELSE 'available' END,
    current_guests = NULL,
    current_order_id = NULL,
    occupied_at = NULL,
    reserved_at = NULL,
    reserved_name = NULL,
    reserved_phone = NULL
  WHERE id = p_table_id
  RETURNING * INTO v_table;

  RETURN v_table;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_available_tables TO authenticated;
GRANT EXECUTE ON FUNCTION seat_table TO authenticated;
GRANT EXECUTE ON FUNCTION clear_table TO authenticated;

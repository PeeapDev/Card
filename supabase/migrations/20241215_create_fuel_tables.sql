-- =============================================
-- PEEAP PLUS - FUEL STATION CRM TABLES
-- =============================================

-- 1. FUEL TYPES (Global fuel type definitions)
CREATE TABLE IF NOT EXISTS fuel_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES plus_businesses(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,                        -- "Petrol", "Diesel", "Premium"
  code VARCHAR(10) NOT NULL,                        -- "PMS", "AGO", "DPK"
  color VARCHAR(20) DEFAULT '#6B7280',              -- For UI display
  unit VARCHAR(10) DEFAULT 'liters',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, code)
);

-- 2. FUEL STATIONS
CREATE TABLE IF NOT EXISTS fuel_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES plus_businesses(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,                        -- Station code (e.g., "FS001")
  address TEXT,
  city VARCHAR(100),
  region VARCHAR(100),
  country VARCHAR(50) DEFAULT 'Sierra Leone',
  coordinates JSONB,                                -- {lat, lng}
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  manager_staff_id UUID REFERENCES plus_staff(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active',              -- active, inactive, maintenance
  operating_hours JSONB DEFAULT '{}',               -- {mon: {open: "06:00", close: "22:00"}, ...}
  settings JSONB DEFAULT '{}',                      -- Station-specific settings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, code)
);

-- 3. FUEL PUMPS
CREATE TABLE IF NOT EXISTS fuel_pumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES fuel_stations(id) ON DELETE CASCADE,
  pump_number INTEGER NOT NULL,
  name VARCHAR(50),                                 -- "Pump 1", "Diesel Bay"
  fuel_type_id UUID REFERENCES fuel_types(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active',              -- active, maintenance, offline
  current_meter_reading DECIMAL(15,3) DEFAULT 0,
  last_calibration_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(station_id, pump_number)
);

-- 4. FUEL PRICES
CREATE TABLE IF NOT EXISTS fuel_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES fuel_stations(id) ON DELETE CASCADE,
  fuel_type_id UUID NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
  price_per_unit DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SLE',
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  set_by UUID REFERENCES plus_staff(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for current price lookup
CREATE INDEX IF NOT EXISTS idx_fuel_prices_current ON fuel_prices(station_id, fuel_type_id, effective_from DESC);

-- 5. FUEL TANKS
CREATE TABLE IF NOT EXISTS fuel_tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES fuel_stations(id) ON DELETE CASCADE,
  fuel_type_id UUID NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,                        -- "Tank 1", "Underground Diesel"
  capacity_liters DECIMAL(15,3) NOT NULL,
  current_level_liters DECIMAL(15,3) DEFAULT 0,
  minimum_level_liters DECIMAL(15,3) DEFAULT 0,     -- Reorder threshold
  last_dip_reading DECIMAL(15,3),
  last_dip_at TIMESTAMP WITH TIME ZONE,
  last_dip_by UUID REFERENCES plus_staff(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active',              -- active, maintenance, empty
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. FUEL DELIVERIES
CREATE TABLE IF NOT EXISTS fuel_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES fuel_stations(id) ON DELETE CASCADE,
  tank_id UUID NOT NULL REFERENCES fuel_tanks(id) ON DELETE CASCADE,
  fuel_type_id UUID NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
  quantity_liters DECIMAL(15,3) NOT NULL,
  supplier_name VARCHAR(100),
  delivery_note_number VARCHAR(50),
  driver_name VARCHAR(100),
  vehicle_number VARCHAR(50),
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(15,2),
  tank_level_before DECIMAL(15,3),
  tank_level_after DECIMAL(15,3),
  received_by UUID REFERENCES plus_staff(id) ON DELETE SET NULL,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TANK DIPPINGS (Stock readings)
CREATE TABLE IF NOT EXISTS tank_dippings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES fuel_stations(id) ON DELETE CASCADE,
  tank_id UUID NOT NULL REFERENCES fuel_tanks(id) ON DELETE CASCADE,
  reading_liters DECIMAL(15,3) NOT NULL,
  reading_type VARCHAR(20) DEFAULT 'manual',        -- manual, automatic
  dipped_by UUID REFERENCES plus_staff(id) ON DELETE SET NULL,
  dipped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. FLEET CUSTOMERS
CREATE TABLE IF NOT EXISTS fleet_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES plus_businesses(id) ON DELETE CASCADE,
  company_name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  tax_id VARCHAR(50),
  credit_limit DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,          -- Outstanding amount owed
  payment_terms INTEGER DEFAULT 30,                 -- Days
  discount_percent DECIMAL(5,2) DEFAULT 0,          -- Volume discount
  status VARCHAR(20) DEFAULT 'active',              -- active, suspended, closed
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. FLEET VEHICLES
CREATE TABLE IF NOT EXISTS fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_customer_id UUID NOT NULL REFERENCES fleet_customers(id) ON DELETE CASCADE,
  registration_number VARCHAR(20) NOT NULL,
  vehicle_type VARCHAR(50),                         -- Car, Truck, Bus, Motorcycle
  make VARCHAR(50),
  model VARCHAR(50),
  year INTEGER,
  fuel_type_id UUID REFERENCES fuel_types(id) ON DELETE SET NULL,
  tank_capacity_liters DECIMAL(10,2),
  odometer_reading INTEGER DEFAULT 0,
  monthly_limit_liters DECIMAL(10,2),
  monthly_limit_amount DECIMAL(15,2),
  current_month_usage_liters DECIMAL(10,2) DEFAULT 0,
  current_month_usage_amount DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(fleet_customer_id, registration_number)
);

-- 10. FLEET DRIVERS
CREATE TABLE IF NOT EXISTS fleet_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_customer_id UUID NOT NULL REFERENCES fleet_customers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  license_number VARCHAR(50),
  pin_hash VARCHAR(255),                            -- For authorization at pump
  assigned_vehicles UUID[] DEFAULT '{}',            -- Array of vehicle IDs
  daily_limit DECIMAL(15,2),
  is_active BOOLEAN DEFAULT true,
  last_transaction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. FUEL CARDS (Prepaid/Fleet)
CREATE TABLE IF NOT EXISTS fuel_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES plus_businesses(id) ON DELETE CASCADE,
  card_number VARCHAR(20) NOT NULL UNIQUE,
  card_type VARCHAR(20) NOT NULL,                   -- 'prepaid', 'fleet', 'staff'
  holder_name VARCHAR(100),
  holder_type VARCHAR(20),                          -- 'individual', 'fleet_customer', 'fleet_driver', 'staff'
  holder_id UUID,                                   -- Reference to holder based on type

  -- Linked Peeap user (optional)
  peeap_user_id UUID,

  -- Security
  pin_hash VARCHAR(255),

  -- Balance & Limits
  balance DECIMAL(15,2) DEFAULT 0,
  credit_limit DECIMAL(15,2) DEFAULT 0,
  daily_limit DECIMAL(15,2),
  monthly_limit DECIMAL(15,2),
  single_transaction_limit DECIMAL(15,2),

  -- Restrictions
  fuel_type_restrictions UUID[],                    -- NULL = all fuels allowed
  station_restrictions UUID[],                      -- NULL = all stations allowed

  -- Status
  status VARCHAR(20) DEFAULT 'active',              -- active, blocked, expired, cancelled
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  blocked_at TIMESTAMP WITH TIME ZONE,
  blocked_reason TEXT,

  -- Metadata
  issued_by UUID REFERENCES plus_staff(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. FUEL CARD TRANSACTIONS
CREATE TABLE IF NOT EXISTS fuel_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES fuel_cards(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,                        -- 'topup', 'purchase', 'refund', 'adjustment'
  amount DECIMAL(15,2) NOT NULL,
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  reference VARCHAR(50),
  fuel_sale_id UUID,                                -- Link to fuel_sales if purchase
  description TEXT,
  created_by UUID REFERENCES plus_staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. STAFF SHIFTS
CREATE TABLE IF NOT EXISTS staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES fuel_stations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES plus_staff(id) ON DELETE CASCADE,
  shift_type VARCHAR(20),                           -- 'morning', 'afternoon', 'night', 'custom'
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,

  -- Pump assignments
  assigned_pumps UUID[] DEFAULT '{}',

  -- Cash handling
  opening_cash DECIMAL(15,2) DEFAULT 0,
  closing_cash DECIMAL(15,2),
  expected_cash DECIMAL(15,2),
  cash_difference DECIMAL(15,2),

  -- Totals (calculated)
  total_sales DECIMAL(15,2) DEFAULT 0,
  total_liters DECIMAL(15,3) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,

  -- By payment method
  cash_sales DECIMAL(15,2) DEFAULT 0,
  card_sales DECIMAL(15,2) DEFAULT 0,
  qr_sales DECIMAL(15,2) DEFAULT 0,
  fleet_sales DECIMAL(15,2) DEFAULT 0,
  prepaid_sales DECIMAL(15,2) DEFAULT 0,
  mobile_sales DECIMAL(15,2) DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'active',              -- active, closed, reconciled
  closed_at TIMESTAMP WITH TIME ZONE,
  reconciled_by UUID REFERENCES plus_staff(id) ON DELETE SET NULL,
  reconciled_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. FUEL SALES (Main transaction table)
CREATE TABLE IF NOT EXISTS fuel_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES fuel_stations(id) ON DELETE CASCADE,
  pump_id UUID REFERENCES fuel_pumps(id) ON DELETE SET NULL,
  fuel_type_id UUID NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,

  -- Sale number
  sale_number VARCHAR(50) NOT NULL,

  -- Quantity & Pricing
  quantity_liters DECIMAL(10,3) NOT NULL,
  price_per_liter DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SLE',

  -- Payment
  payment_method VARCHAR(20) NOT NULL,              -- 'cash', 'qr', 'peeap_card', 'fleet', 'prepaid', 'mobile'
  payment_status VARCHAR(20) DEFAULT 'completed',   -- pending, completed, failed, refunded
  payment_reference VARCHAR(100),

  -- Peeap integration
  peeap_transaction_id UUID,                        -- Link to Peeap transactions table
  peeap_checkout_session_id VARCHAR(100),

  -- Customer info
  customer_type VARCHAR(20) DEFAULT 'walkin',       -- 'walkin', 'fleet', 'prepaid', 'registered'
  customer_user_id UUID,                            -- Peeap user ID if QR/card payment
  customer_name VARCHAR(100),
  customer_phone VARCHAR(50),

  -- Fleet info
  fleet_customer_id UUID REFERENCES fleet_customers(id) ON DELETE SET NULL,
  fleet_vehicle_id UUID REFERENCES fleet_vehicles(id) ON DELETE SET NULL,
  fleet_driver_id UUID REFERENCES fleet_drivers(id) ON DELETE SET NULL,

  -- Fuel card
  fuel_card_id UUID REFERENCES fuel_cards(id) ON DELETE SET NULL,

  -- Staff & Shift
  attendant_id UUID REFERENCES plus_staff(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES staff_shifts(id) ON DELETE SET NULL,

  -- Meter readings
  pump_meter_start DECIMAL(15,3),
  pump_meter_end DECIMAL(15,3),

  -- Vehicle info (manual entry or from fleet)
  vehicle_registration VARCHAR(20),
  odometer_reading INTEGER,

  -- Receipt
  receipt_number VARCHAR(50),
  receipt_printed BOOLEAN DEFAULT false,

  notes TEXT,
  voided BOOLEAN DEFAULT false,
  voided_at TIMESTAMP WITH TIME ZONE,
  voided_by UUID REFERENCES plus_staff(id) ON DELETE SET NULL,
  voided_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. DAILY RECONCILIATION
CREATE TABLE IF NOT EXISTS daily_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES fuel_stations(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Sales summary
  total_sales DECIMAL(15,2) DEFAULT 0,
  total_liters DECIMAL(15,3) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,

  -- By fuel type
  sales_by_fuel_type JSONB DEFAULT '{}',            -- {fuel_type_id: {liters, amount}, ...}

  -- By payment method
  cash_sales DECIMAL(15,2) DEFAULT 0,
  card_sales DECIMAL(15,2) DEFAULT 0,
  qr_sales DECIMAL(15,2) DEFAULT 0,
  fleet_sales DECIMAL(15,2) DEFAULT 0,
  prepaid_sales DECIMAL(15,2) DEFAULT 0,
  mobile_sales DECIMAL(15,2) DEFAULT 0,

  -- Cash reconciliation
  expected_cash DECIMAL(15,2) DEFAULT 0,
  actual_cash DECIMAL(15,2),
  cash_variance DECIMAL(15,2),

  -- Inventory
  opening_stock JSONB DEFAULT '{}',                 -- {tank_id: liters, ...}
  closing_stock JSONB DEFAULT '{}',
  deliveries_total JSONB DEFAULT '{}',              -- {fuel_type_id: liters, ...}
  theoretical_usage JSONB DEFAULT '{}',             -- Based on sales
  actual_usage JSONB DEFAULT '{}',                  -- Based on dipping
  stock_variance JSONB DEFAULT '{}',                -- Difference (loss/gain)

  -- Status
  status VARCHAR(20) DEFAULT 'draft',               -- draft, submitted, approved, rejected
  prepared_by UUID REFERENCES plus_staff(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES plus_staff(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(station_id, date)
);

-- 16. FLEET INVOICES
CREATE TABLE IF NOT EXISTS fleet_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES plus_businesses(id) ON DELETE CASCADE,
  fleet_customer_id UUID NOT NULL REFERENCES fleet_customers(id) ON DELETE CASCADE,

  invoice_number VARCHAR(50) NOT NULL,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Amounts
  subtotal DECIMAL(15,2) NOT NULL,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  balance_due DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SLE',

  -- Due date
  due_date DATE NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'draft',               -- draft, sent, paid, partially_paid, overdue, cancelled
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Line items summary
  total_liters DECIMAL(15,3) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  line_items JSONB DEFAULT '[]',                    -- Summary by fuel type/vehicle

  notes TEXT,
  created_by UUID REFERENCES plus_staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(business_id, invoice_number)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_fuel_stations_business ON fuel_stations(business_id);
CREATE INDEX IF NOT EXISTS idx_fuel_pumps_station ON fuel_pumps(station_id);
CREATE INDEX IF NOT EXISTS idx_fuel_tanks_station ON fuel_tanks(station_id);
CREATE INDEX IF NOT EXISTS idx_fuel_deliveries_station ON fuel_deliveries(station_id);
CREATE INDEX IF NOT EXISTS idx_tank_dippings_tank ON tank_dippings(tank_id);
CREATE INDEX IF NOT EXISTS idx_fleet_customers_business ON fleet_customers(business_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_customer ON fleet_vehicles(fleet_customer_id);
CREATE INDEX IF NOT EXISTS idx_fleet_drivers_customer ON fleet_drivers(fleet_customer_id);
CREATE INDEX IF NOT EXISTS idx_fuel_cards_business ON fuel_cards(business_id);
CREATE INDEX IF NOT EXISTS idx_fuel_cards_number ON fuel_cards(card_number);
CREATE INDEX IF NOT EXISTS idx_fuel_card_transactions_card ON fuel_card_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_station ON staff_shifts(station_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff ON staff_shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_fuel_sales_station ON fuel_sales(station_id);
CREATE INDEX IF NOT EXISTS idx_fuel_sales_date ON fuel_sales(created_at);
CREATE INDEX IF NOT EXISTS idx_fuel_sales_shift ON fuel_sales(shift_id);
CREATE INDEX IF NOT EXISTS idx_fuel_sales_fleet ON fuel_sales(fleet_customer_id);
CREATE INDEX IF NOT EXISTS idx_fuel_sales_card ON fuel_sales(fuel_card_id);
CREATE INDEX IF NOT EXISTS idx_daily_reconciliation_station ON daily_reconciliation(station_id);
CREATE INDEX IF NOT EXISTS idx_daily_reconciliation_date ON daily_reconciliation(date);
CREATE INDEX IF NOT EXISTS idx_fleet_invoices_customer ON fleet_invoices(fleet_customer_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE fuel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_pumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tank_dippings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_invoices ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (allow all for now, can be restricted later)
CREATE POLICY "Allow all fuel_types" ON fuel_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all fuel_stations" ON fuel_stations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all fuel_pumps" ON fuel_pumps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all fuel_prices" ON fuel_prices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all fuel_tanks" ON fuel_tanks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all fuel_deliveries" ON fuel_deliveries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all tank_dippings" ON tank_dippings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all fleet_customers" ON fleet_customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all fleet_vehicles" ON fleet_vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all fleet_drivers" ON fleet_drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all fuel_cards" ON fuel_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all fuel_card_transactions" ON fuel_card_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all staff_shifts" ON staff_shifts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all fuel_sales" ON fuel_sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all daily_reconciliation" ON daily_reconciliation FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all fleet_invoices" ON fleet_invoices FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- SEED DATA - DEFAULT FUEL TYPES
-- =============================================

-- This will be inserted per-business when they set up their fuel station
-- Example seed for reference:
-- INSERT INTO fuel_types (business_id, name, code, color) VALUES
--   (business_id, 'Petrol', 'PMS', '#22C55E'),
--   (business_id, 'Diesel', 'AGO', '#F59E0B'),
--   (business_id, 'Kerosene', 'DPK', '#3B82F6'),
--   (business_id, 'Premium', 'PREM', '#A855F7');

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to generate sale number
CREATE OR REPLACE FUNCTION generate_sale_number(station_code VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  today_date VARCHAR;
  sequence_num INTEGER;
  sale_num VARCHAR;
BEGIN
  today_date := TO_CHAR(NOW(), 'YYMMDD');

  -- Get count of sales today for this station
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM fuel_sales
  WHERE station_id IN (SELECT id FROM fuel_stations WHERE code = station_code)
    AND DATE(created_at) = CURRENT_DATE;

  sale_num := station_code || '-' || today_date || '-' || LPAD(sequence_num::VARCHAR, 4, '0');

  RETURN sale_num;
END;
$$ LANGUAGE plpgsql;

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS VARCHAR AS $$
BEGIN
  RETURN 'RCP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::VARCHAR, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate fuel card number
CREATE OR REPLACE FUNCTION generate_fuel_card_number(card_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  prefix VARCHAR;
  card_num VARCHAR;
BEGIN
  CASE card_type
    WHEN 'prepaid' THEN prefix := 'FC';
    WHEN 'fleet' THEN prefix := 'FL';
    WHEN 'staff' THEN prefix := 'ST';
    ELSE prefix := 'XX';
  END CASE;

  card_num := prefix || LPAD(FLOOR(RANDOM() * 10000000000)::VARCHAR, 10, '0');

  RETURN card_num;
END;
$$ LANGUAGE plpgsql;

-- Function to update shift totals when a sale is made
CREATE OR REPLACE FUNCTION update_shift_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.shift_id IS NOT NULL THEN
    UPDATE staff_shifts
    SET
      total_sales = total_sales + NEW.total_amount,
      total_liters = total_liters + NEW.quantity_liters,
      transaction_count = transaction_count + 1,
      cash_sales = CASE WHEN NEW.payment_method = 'cash' THEN cash_sales + NEW.total_amount ELSE cash_sales END,
      card_sales = CASE WHEN NEW.payment_method = 'peeap_card' THEN card_sales + NEW.total_amount ELSE card_sales END,
      qr_sales = CASE WHEN NEW.payment_method = 'qr' THEN qr_sales + NEW.total_amount ELSE qr_sales END,
      fleet_sales = CASE WHEN NEW.payment_method = 'fleet' THEN fleet_sales + NEW.total_amount ELSE fleet_sales END,
      prepaid_sales = CASE WHEN NEW.payment_method = 'prepaid' THEN prepaid_sales + NEW.total_amount ELSE prepaid_sales END,
      mobile_sales = CASE WHEN NEW.payment_method = 'mobile' THEN mobile_sales + NEW.total_amount ELSE mobile_sales END,
      updated_at = NOW()
    WHERE id = NEW.shift_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shift_totals
  AFTER INSERT ON fuel_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_totals();

-- Function to update tank level after delivery
CREATE OR REPLACE FUNCTION update_tank_after_delivery()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE fuel_tanks
  SET
    current_level_liters = current_level_liters + NEW.quantity_liters,
    updated_at = NOW()
  WHERE id = NEW.tank_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tank_after_delivery
  AFTER INSERT ON fuel_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_tank_after_delivery();

-- Function to update tank level after dipping
CREATE OR REPLACE FUNCTION update_tank_after_dipping()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE fuel_tanks
  SET
    current_level_liters = NEW.reading_liters,
    last_dip_reading = NEW.reading_liters,
    last_dip_at = NEW.dipped_at,
    last_dip_by = NEW.dipped_by,
    updated_at = NOW()
  WHERE id = NEW.tank_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tank_after_dipping
  AFTER INSERT ON tank_dippings
  FOR EACH ROW
  EXECUTE FUNCTION update_tank_after_dipping();

-- =============================================
-- ADD FUEL PERMISSIONS
-- =============================================

INSERT INTO plus_permissions (code, name, description, category, min_tier) VALUES
  -- Fuel Stations
  ('fuel.stations.view', 'View Fuel Stations', 'View fuel station list and details', 'fuel', 'business'),
  ('fuel.stations.create', 'Create Fuel Stations', 'Add new fuel stations', 'fuel', 'business'),
  ('fuel.stations.edit', 'Edit Fuel Stations', 'Modify fuel station settings', 'fuel', 'business'),
  ('fuel.stations.delete', 'Delete Fuel Stations', 'Remove fuel stations', 'fuel', 'business'),

  -- Sales
  ('fuel.sales.view', 'View Sales', 'View fuel sales transactions', 'fuel', 'business'),
  ('fuel.sales.create', 'Create Sales', 'Record fuel sales', 'fuel', 'business'),
  ('fuel.sales.void', 'Void Sales', 'Cancel/void fuel sales', 'fuel', 'business'),
  ('fuel.sales.refund', 'Refund Sales', 'Process refunds', 'fuel', 'business'),

  -- Inventory
  ('fuel.inventory.view', 'View Inventory', 'View tank levels and stock', 'fuel', 'business'),
  ('fuel.inventory.manage', 'Manage Inventory', 'Record dippings and deliveries', 'fuel', 'business'),

  -- Pricing
  ('fuel.pricing.view', 'View Pricing', 'View fuel prices', 'fuel', 'business'),
  ('fuel.pricing.manage', 'Manage Pricing', 'Set and update fuel prices', 'fuel', 'business'),

  -- Shifts
  ('fuel.shifts.view', 'View Shifts', 'View shift schedules and reports', 'fuel', 'business'),
  ('fuel.shifts.manage', 'Manage Shifts', 'Start/end shifts, reconcile', 'fuel', 'business'),

  -- Fleet
  ('fuel.fleet.view', 'View Fleet Accounts', 'View fleet customers and vehicles', 'fuel', 'business'),
  ('fuel.fleet.manage', 'Manage Fleet Accounts', 'Add/edit fleet customers', 'fuel', 'business'),
  ('fuel.fleet.billing', 'Fleet Billing', 'Generate invoices, record payments', 'fuel', 'business'),

  -- Cards
  ('fuel.cards.view', 'View Fuel Cards', 'View fuel cards list', 'fuel', 'business'),
  ('fuel.cards.issue', 'Issue Fuel Cards', 'Create new fuel cards', 'fuel', 'business'),
  ('fuel.cards.manage', 'Manage Fuel Cards', 'Block, unblock, adjust cards', 'fuel', 'business'),
  ('fuel.cards.topup', 'Top-up Fuel Cards', 'Add balance to prepaid cards', 'fuel', 'business'),

  -- Reports
  ('fuel.reports.view', 'View Reports', 'Access fuel reports', 'fuel', 'business'),
  ('fuel.reports.export', 'Export Reports', 'Export fuel reports to CSV/PDF', 'fuel', 'business'),

  -- Reconciliation
  ('fuel.reconciliation.view', 'View Reconciliation', 'View daily reconciliation', 'fuel', 'business'),
  ('fuel.reconciliation.submit', 'Submit Reconciliation', 'Prepare and submit daily reports', 'fuel', 'business'),
  ('fuel.reconciliation.approve', 'Approve Reconciliation', 'Approve or reject daily reports', 'fuel', 'business')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- RELOAD SCHEMA CACHE
-- =============================================

SELECT pg_notify('pgrst', 'reload schema');

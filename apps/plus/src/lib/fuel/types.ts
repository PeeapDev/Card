/**
 * Fuel Station CRM - TypeScript Type Definitions
 */

// =============================================
// ENUMS
// =============================================

export type FuelStationStatus = 'active' | 'inactive' | 'maintenance';
export type PumpStatus = 'active' | 'maintenance' | 'offline';
export type TankStatus = 'active' | 'maintenance' | 'empty';
export type ShiftType = 'morning' | 'afternoon' | 'night' | 'custom';
export type ShiftStatus = 'active' | 'closed' | 'reconciled';
export type PaymentMethod = 'cash' | 'qr' | 'peeap_card' | 'fleet' | 'prepaid' | 'mobile';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type CustomerType = 'walkin' | 'fleet' | 'prepaid' | 'registered';
export type FuelCardType = 'prepaid' | 'fleet' | 'staff';
export type FuelCardStatus = 'active' | 'blocked' | 'expired' | 'cancelled';
export type FleetCustomerStatus = 'active' | 'suspended' | 'closed';
export type ReconciliationStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

// =============================================
// CORE ENTITIES
// =============================================

export interface FuelType {
  id: string;
  business_id: string;
  name: string;
  code: string;
  color: string;
  unit: string;
  is_active: boolean;
  created_at: string;
}

export interface FuelStation {
  id: string;
  business_id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  region?: string;
  country: string;
  coordinates?: { lat: number; lng: number };
  contact_phone?: string;
  contact_email?: string;
  manager_staff_id?: string;
  status: FuelStationStatus;
  operating_hours?: Record<string, { open: string; close: string }>;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields
  manager?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  };
  pumps?: FuelPump[];
  tanks?: FuelTank[];
}

export interface FuelPump {
  id: string;
  station_id: string;
  pump_number: number;
  name?: string;
  fuel_type_id?: string;
  status: PumpStatus;
  current_meter_reading: number;
  last_calibration_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  fuel_type?: FuelType;
}

export interface FuelPrice {
  id: string;
  station_id: string;
  fuel_type_id: string;
  price_per_unit: number;
  currency: string;
  effective_from: string;
  effective_to?: string;
  set_by?: string;
  notes?: string;
  created_at: string;
  // Joined fields
  fuel_type?: FuelType;
  set_by_staff?: { first_name?: string; last_name?: string };
}

export interface FuelTank {
  id: string;
  station_id: string;
  fuel_type_id: string;
  name: string;
  capacity_liters: number;
  current_level_liters: number;
  minimum_level_liters: number;
  last_dip_reading?: number;
  last_dip_at?: string;
  last_dip_by?: string;
  status: TankStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  fuel_type?: FuelType;
  fuel_station?: FuelStation;
  // Computed
  fill_percentage?: number;
  is_low?: boolean;
}

export interface FuelDelivery {
  id: string;
  station_id: string;
  tank_id: string;
  fuel_type_id: string;
  quantity_liters: number;
  supplier_name?: string;
  delivery_note_number?: string;
  driver_name?: string;
  vehicle_number?: string;
  unit_cost?: number;
  total_cost?: number;
  tank_level_before?: number;
  tank_level_after?: number;
  received_by?: string;
  delivered_at: string;
  notes?: string;
  created_at: string;
  // Joined fields
  fuel_type?: FuelType;
  fuel_tank?: FuelTank;
  fuel_station?: FuelStation;
  received_by_staff?: { first_name?: string; last_name?: string };
}

export interface TankDipping {
  id: string;
  station_id: string;
  tank_id: string;
  reading_liters: number;
  reading_type: 'manual' | 'automatic';
  dipped_by?: string;
  dipped_at: string;
  notes?: string;
  created_at: string;
  // Joined fields
  tank?: FuelTank;
  dipped_by_staff?: { first_name?: string; last_name?: string };
}

// =============================================
// FLEET MANAGEMENT
// =============================================

export interface FleetCustomer {
  id: string;
  business_id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  tax_id?: string;
  credit_limit: number;
  current_balance: number;
  payment_terms: number;
  discount_percent: number;
  status: FleetCustomerStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined/computed
  vehicles?: FleetVehicle[];
  drivers?: FleetDriver[];
  vehicle_count?: number;
  driver_count?: number;
  available_credit?: number;
}

export interface FleetVehicle {
  id: string;
  fleet_customer_id: string;
  registration_number: string;
  vehicle_type?: string;
  make?: string;
  model?: string;
  year?: number;
  fuel_type_id?: string;
  tank_capacity_liters?: number;
  odometer_reading: number;
  monthly_limit_liters?: number;
  monthly_limit_amount?: number;
  current_month_usage_liters: number;
  current_month_usage_amount: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  fuel_type?: FuelType;
  fleet_customer?: FleetCustomer;
}

export interface FleetDriver {
  id: string;
  fleet_customer_id: string;
  name: string;
  phone?: string;
  email?: string;
  license_number?: string;
  pin_hash?: string;
  assigned_vehicles: string[];
  daily_limit?: number;
  is_active: boolean;
  last_transaction_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  fleet_customer?: FleetCustomer;
  vehicles?: FleetVehicle[];
}

// =============================================
// FUEL CARDS
// =============================================

export interface FuelCard {
  id: string;
  business_id: string;
  card_number: string;
  card_type: FuelCardType;
  holder_name?: string;
  holder_type?: 'individual' | 'fleet_customer' | 'fleet_driver' | 'staff';
  holder_id?: string;
  peeap_user_id?: string;
  balance: number;
  credit_limit: number;
  daily_limit?: number;
  monthly_limit?: number;
  single_transaction_limit?: number;
  fuel_type_restrictions?: string[];
  station_restrictions?: string[];
  status: FuelCardStatus;
  issued_at: string;
  expires_at?: string;
  blocked_at?: string;
  blocked_reason?: string;
  issued_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  holder?: { name: string; type: string };
}

export interface FuelCardTransaction {
  id: string;
  card_id: string;
  type: 'topup' | 'purchase' | 'refund' | 'adjustment';
  amount: number;
  balance_before: number;
  balance_after: number;
  reference?: string;
  fuel_sale_id?: string;
  description?: string;
  created_by?: string;
  created_at: string;
  // Joined fields
  card?: FuelCard;
}

// =============================================
// SHIFTS
// =============================================

export interface StaffShift {
  id: string;
  station_id: string;
  staff_id: string;
  shift_type?: ShiftType;
  start_time: string;
  end_time?: string;
  assigned_pumps: string[];
  opening_cash: number;
  closing_cash?: number;
  expected_cash?: number;
  cash_difference?: number;
  total_sales: number;
  total_liters: number;
  transaction_count: number;
  cash_sales: number;
  card_sales: number;
  qr_sales: number;
  fleet_sales: number;
  prepaid_sales: number;
  mobile_sales: number;
  status: ShiftStatus;
  closed_at?: string;
  reconciled_by?: string;
  reconciled_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  station?: FuelStation;
  staff?: { id: string; first_name?: string; last_name?: string; email: string };
  pumps?: FuelPump[];
}

// =============================================
// SALES
// =============================================

export interface FuelSale {
  id: string;
  station_id: string;
  pump_id?: string;
  fuel_type_id: string;
  sale_number: string;
  quantity_liters: number;
  price_per_liter: number;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_reference?: string;
  peeap_transaction_id?: string;
  peeap_checkout_session_id?: string;
  customer_type: CustomerType;
  customer_user_id?: string;
  customer_name?: string;
  customer_phone?: string;
  fleet_customer_id?: string;
  fleet_vehicle_id?: string;
  fleet_driver_id?: string;
  fuel_card_id?: string;
  attendant_id?: string;
  shift_id?: string;
  pump_meter_start?: number;
  pump_meter_end?: number;
  vehicle_registration?: string;
  odometer_reading?: number;
  receipt_number?: string;
  receipt_printed: boolean;
  notes?: string;
  voided: boolean;
  voided_at?: string;
  voided_by?: string;
  voided_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  station?: FuelStation;
  pump?: FuelPump;
  fuel_type?: FuelType;
  attendant?: { id: string; first_name?: string; last_name?: string };
  fleet_customer?: FleetCustomer;
  fleet_vehicle?: FleetVehicle;
  fleet_driver?: FleetDriver;
  fuel_card?: FuelCard;
}

// =============================================
// RECONCILIATION
// =============================================

export interface DailyReconciliation {
  id: string;
  station_id: string;
  date: string;
  total_sales: number;
  total_liters: number;
  transaction_count: number;
  sales_by_fuel_type: Record<string, { liters: number; amount: number }>;
  cash_sales: number;
  card_sales: number;
  qr_sales: number;
  fleet_sales: number;
  prepaid_sales: number;
  mobile_sales: number;
  expected_cash: number;
  actual_cash?: number;
  cash_variance?: number;
  opening_stock: Record<string, number>;
  closing_stock: Record<string, number>;
  deliveries_total: Record<string, number>;
  theoretical_usage: Record<string, number>;
  actual_usage: Record<string, number>;
  stock_variance: Record<string, number>;
  status: ReconciliationStatus;
  prepared_by?: string;
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  station?: FuelStation;
}

// =============================================
// INVOICES
// =============================================

export interface FleetInvoice {
  id: string;
  business_id: string;
  fleet_customer_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  due_date: string;
  status: InvoiceStatus;
  sent_at?: string;
  paid_at?: string;
  total_liters: number;
  transaction_count: number;
  line_items: Array<{
    fuel_type: string;
    liters: number;
    amount: number;
    vehicle?: string;
  }>;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  fleet_customer?: FleetCustomer;
}

// =============================================
// DTOs (Data Transfer Objects)
// =============================================

export interface CreateStationDto {
  name: string;
  code: string;
  address?: string;
  city?: string;
  region?: string;
  contact_phone?: string;
  contact_email?: string;
  manager_staff_id?: string;
  operating_hours?: Record<string, { open: string; close: string }>;
}

export interface UpdateStationDto extends Partial<CreateStationDto> {
  status?: FuelStationStatus;
}

export interface CreatePumpDto {
  station_id: string;
  pump_number: number;
  name?: string;
  fuel_type_id?: string;
  current_meter_reading?: number;
}

export interface CreateTankDto {
  station_id: string;
  fuel_type_id: string;
  name: string;
  capacity_liters: number;
  current_level_liters?: number;
  minimum_level_liters?: number;
}

export interface CreateFuelTypeDto {
  name: string;
  code: string;
  color?: string;
  unit?: string;
}

export interface SetPriceDto {
  station_id: string;
  fuel_type_id: string;
  price_per_unit: number;
  notes?: string;
}

export interface RecordDeliveryDto {
  station_id: string;
  tank_id: string;
  fuel_type_id: string;
  quantity_liters: number;
  supplier_name?: string;
  delivery_note_number?: string;
  driver_name?: string;
  vehicle_number?: string;
  unit_cost?: number;
  delivered_at?: string;
  notes?: string;
}

export interface RecordDippingDto {
  station_id: string;
  tank_id: string;
  reading_liters: number;
  notes?: string;
}

export interface CreateFleetCustomerDto {
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  tax_id?: string;
  credit_limit?: number;
  payment_terms?: number;
  discount_percent?: number;
}

export interface CreateFleetVehicleDto {
  fleet_customer_id: string;
  registration_number: string;
  vehicle_type?: string;
  make?: string;
  model?: string;
  year?: number;
  fuel_type_id?: string;
  tank_capacity_liters?: number;
  monthly_limit_liters?: number;
  monthly_limit_amount?: number;
}

export interface CreateFleetDriverDto {
  fleet_customer_id: string;
  name: string;
  phone?: string;
  email?: string;
  license_number?: string;
  pin?: string; // Will be hashed
  assigned_vehicles?: string[];
  daily_limit?: number;
}

export interface IssueFuelCardDto {
  card_type: FuelCardType;
  holder_name?: string;
  holder_type?: string;
  holder_id?: string;
  peeap_user_id?: string;
  initial_balance?: number;
  credit_limit?: number;
  daily_limit?: number;
  monthly_limit?: number;
  single_transaction_limit?: number;
  fuel_type_restrictions?: string[];
  station_restrictions?: string[];
  expires_at?: string;
  pin?: string; // Will be hashed
}

export interface TopUpFuelCardDto {
  card_id: string;
  amount: number;
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
}

export interface StartShiftDto {
  station_id: string;
  shift_type?: ShiftType;
  assigned_pumps?: string[];
  opening_cash: number;
  notes?: string;
}

export interface EndShiftDto {
  shift_id: string;
  closing_cash: number;
  notes?: string;
}

export interface RecordSaleDto {
  station_id: string;
  pump_id?: string;
  fuel_type_id: string;
  quantity_liters: number;
  price_per_liter: number;
  discount_amount?: number;
  discount_percent?: number;
  payment_method: PaymentMethod;
  payment_reference?: string;
  customer_type?: CustomerType;
  customer_name?: string;
  customer_phone?: string;
  fleet_customer_id?: string;
  fleet_vehicle_id?: string;
  fleet_driver_id?: string;
  fuel_card_id?: string;
  shift_id?: string;
  pump_meter_start?: number;
  pump_meter_end?: number;
  vehicle_registration?: string;
  odometer_reading?: number;
  notes?: string;
}

// =============================================
// DASHBOARD & REPORTING
// =============================================

export interface StationDashboardStats {
  today_sales: number;
  today_liters: number;
  today_transactions: number;
  active_shifts: number;
  active_pumps: number;
  low_tanks: number;
  low_stock_tanks: number;
  sales_by_fuel_type: Array<{
    fuel_type: string;
    fuel_type_id: string;
    color: string;
    liters: number;
    amount: number;
  }>;
  sales_by_payment: Array<{
    method: PaymentMethod;
    amount: number;
    count: number;
  }>;
  recent_sales: FuelSale[];
  tank_levels: Array<{
    tank_id: string;
    name: string;
    fuel_type: string;
    color: string;
    current: number;
    capacity: number;
    percentage: number;
    is_low: boolean;
  }>;
}

export interface MultiStationDashboard {
  total_stations: number;
  active_stations: number;
  total_today_sales: number;
  total_today_liters: number;
  stations: Array<{
    id: string;
    name: string;
    code: string;
    status: FuelStationStatus;
    today_sales: number;
    today_liters: number;
    active_shifts: number;
    low_tanks: boolean;
  }>;
  sales_trend: Array<{
    date: string;
    sales: number;
    liters: number;
  }>;
}

export interface SalesReportFilters {
  station_id?: string;
  fuel_type_id?: string;
  payment_method?: PaymentMethod;
  customer_type?: CustomerType;
  fleet_customer_id?: string;
  attendant_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface SalesReport {
  filters: SalesReportFilters;
  summary: {
    total_sales: number;
    total_liters: number;
    transaction_count: number;
    average_sale: number;
  };
  by_fuel_type: Array<{
    fuel_type: string;
    liters: number;
    amount: number;
    percentage: number;
  }>;
  by_payment_method: Array<{
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  by_station?: Array<{
    station: string;
    amount: number;
    liters: number;
  }>;
  daily_breakdown: Array<{
    date: string;
    sales: number;
    liters: number;
    transactions: number;
  }>;
}

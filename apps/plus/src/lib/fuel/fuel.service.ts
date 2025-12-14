/**
 * Fuel Station CRM - Main Service
 * Handles all fuel station operations
 */

import { supabase } from '../supabase';
import type {
  FuelStation,
  FuelPump,
  FuelTank,
  FuelType,
  FuelPrice,
  FuelSale,
  FuelDelivery,
  TankDipping,
  StaffShift,
  FuelCard,
  FleetCustomer,
  FleetVehicle,
  FleetDriver,
  DailyReconciliation,
  StationDashboardStats,
  CreateStationDto,
  UpdateStationDto,
  CreatePumpDto,
  CreateTankDto,
  CreateFuelTypeDto,
  SetPriceDto,
  RecordDeliveryDto,
  RecordDippingDto,
  RecordSaleDto,
  StartShiftDto,
  EndShiftDto,
  IssueFuelCardDto,
  TopUpFuelCardDto,
  CreateFleetCustomerDto,
  CreateFleetVehicleDto,
  CreateFleetDriverDto,
} from './types';

// =============================================
// FUEL TYPES
// =============================================

export async function getFuelTypes(businessId: string): Promise<FuelType[]> {
  const { data, error } = await supabase
    .from('fuel_types')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createFuelType(businessId: string, dto: CreateFuelTypeDto): Promise<FuelType> {
  const { data, error } = await supabase
    .from('fuel_types')
    .insert({
      business_id: businessId,
      name: dto.name,
      code: dto.code.toUpperCase(),
      color: dto.color || '#6B7280',
      unit: dto.unit || 'liters',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// STATIONS
// =============================================

export async function getStations(businessId: string): Promise<FuelStation[]> {
  const { data, error } = await supabase
    .from('fuel_stations')
    .select(`
      *,
      manager:plus_staff!manager_staff_id(id, first_name, last_name, email)
    `)
    .eq('business_id', businessId)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getStation(stationId: string): Promise<FuelStation | null> {
  const { data, error } = await supabase
    .from('fuel_stations')
    .select(`
      *,
      manager:plus_staff!manager_staff_id(id, first_name, last_name, email),
      pumps:fuel_pumps(*),
      tanks:fuel_tanks(*)
    `)
    .eq('id', stationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createStation(businessId: string, dto: CreateStationDto): Promise<FuelStation> {
  const { data, error } = await supabase
    .from('fuel_stations')
    .insert({
      business_id: businessId,
      name: dto.name,
      code: dto.code.toUpperCase(),
      address: dto.address,
      city: dto.city,
      region: dto.region,
      contact_phone: dto.contact_phone,
      contact_email: dto.contact_email,
      manager_staff_id: dto.manager_staff_id,
      operating_hours: dto.operating_hours || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateStation(stationId: string, dto: UpdateStationDto): Promise<FuelStation> {
  const { data, error } = await supabase
    .from('fuel_stations')
    .update({
      ...dto,
      updated_at: new Date().toISOString(),
    })
    .eq('id', stationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteStation(stationId: string): Promise<void> {
  const { error } = await supabase
    .from('fuel_stations')
    .delete()
    .eq('id', stationId);

  if (error) throw error;
}

// =============================================
// PUMPS
// =============================================

export async function getPumps(stationId: string): Promise<FuelPump[]> {
  const { data, error } = await supabase
    .from('fuel_pumps')
    .select(`
      *,
      fuel_type:fuel_types(*)
    `)
    .eq('station_id', stationId)
    .order('pump_number');

  if (error) throw error;
  return data || [];
}

export async function createPump(dto: CreatePumpDto): Promise<FuelPump> {
  const { data, error } = await supabase
    .from('fuel_pumps')
    .insert({
      station_id: dto.station_id,
      pump_number: dto.pump_number,
      name: dto.name || `Pump ${dto.pump_number}`,
      fuel_type_id: dto.fuel_type_id,
      current_meter_reading: dto.current_meter_reading || 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePump(pumpId: string, updates: Partial<FuelPump>): Promise<FuelPump> {
  const { data, error } = await supabase
    .from('fuel_pumps')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pumpId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// TANKS
// =============================================

export async function getTanks(stationId: string): Promise<FuelTank[]> {
  const { data, error } = await supabase
    .from('fuel_tanks')
    .select(`
      *,
      fuel_type:fuel_types(*)
    `)
    .eq('station_id', stationId)
    .order('name');

  if (error) throw error;

  // Calculate fill percentage and low status
  return (data || []).map(tank => ({
    ...tank,
    fill_percentage: tank.capacity_liters > 0
      ? Math.round((tank.current_level_liters / tank.capacity_liters) * 100)
      : 0,
    is_low: tank.current_level_liters <= tank.minimum_level_liters,
  }));
}

export async function createTank(dto: CreateTankDto): Promise<FuelTank> {
  const { data, error } = await supabase
    .from('fuel_tanks')
    .insert({
      station_id: dto.station_id,
      fuel_type_id: dto.fuel_type_id,
      name: dto.name,
      capacity_liters: dto.capacity_liters,
      current_level_liters: dto.current_level_liters || 0,
      minimum_level_liters: dto.minimum_level_liters || 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// PRICING
// =============================================

export async function getCurrentPrices(stationId: string): Promise<FuelPrice[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('fuel_prices')
    .select(`
      *,
      fuel_type:fuel_types(*)
    `)
    .eq('station_id', stationId)
    .lte('effective_from', now)
    .or(`effective_to.is.null,effective_to.gt.${now}`)
    .order('effective_from', { ascending: false });

  if (error) throw error;

  // Get only the latest price for each fuel type
  const latestPrices: Record<string, FuelPrice> = {};
  for (const price of data || []) {
    if (!latestPrices[price.fuel_type_id]) {
      latestPrices[price.fuel_type_id] = price;
    }
  }

  return Object.values(latestPrices);
}

export async function setPrice(staffId: string, dto: SetPriceDto): Promise<FuelPrice> {
  // End the current price
  const now = new Date().toISOString();

  await supabase
    .from('fuel_prices')
    .update({ effective_to: now })
    .eq('station_id', dto.station_id)
    .eq('fuel_type_id', dto.fuel_type_id)
    .is('effective_to', null);

  // Create new price
  const { data, error } = await supabase
    .from('fuel_prices')
    .insert({
      station_id: dto.station_id,
      fuel_type_id: dto.fuel_type_id,
      price_per_unit: dto.price_per_unit,
      set_by: staffId,
      notes: dto.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// INVENTORY - DELIVERIES
// =============================================

export async function getDeliveries(stationId: string, limit = 50): Promise<FuelDelivery[]> {
  const { data, error } = await supabase
    .from('fuel_deliveries')
    .select(`
      *,
      fuel_type:fuel_types(*),
      tank:fuel_tanks(*),
      received_by_staff:plus_staff!received_by(first_name, last_name)
    `)
    .eq('station_id', stationId)
    .order('delivered_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function recordDelivery(staffId: string, dto: RecordDeliveryDto): Promise<FuelDelivery> {
  // Get current tank level
  const { data: tank } = await supabase
    .from('fuel_tanks')
    .select('current_level_liters')
    .eq('id', dto.tank_id)
    .single();

  const tankLevelBefore = tank?.current_level_liters || 0;

  const { data, error } = await supabase
    .from('fuel_deliveries')
    .insert({
      station_id: dto.station_id,
      tank_id: dto.tank_id,
      fuel_type_id: dto.fuel_type_id,
      quantity_liters: dto.quantity_liters,
      supplier_name: dto.supplier_name,
      delivery_note_number: dto.delivery_note_number,
      driver_name: dto.driver_name,
      vehicle_number: dto.vehicle_number,
      unit_cost: dto.unit_cost,
      total_cost: dto.unit_cost ? dto.unit_cost * dto.quantity_liters : null,
      tank_level_before: tankLevelBefore,
      tank_level_after: tankLevelBefore + dto.quantity_liters,
      received_by: staffId,
      delivered_at: dto.delivered_at || new Date().toISOString(),
      notes: dto.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// INVENTORY - DIPPING
// =============================================

export async function getDippings(tankId: string, limit = 30): Promise<TankDipping[]> {
  const { data, error } = await supabase
    .from('tank_dippings')
    .select(`
      *,
      tank:fuel_tanks(*),
      dipped_by_staff:plus_staff!dipped_by(first_name, last_name)
    `)
    .eq('tank_id', tankId)
    .order('dipped_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function recordDipping(staffId: string, dto: RecordDippingDto): Promise<TankDipping> {
  const { data, error } = await supabase
    .from('tank_dippings')
    .insert({
      station_id: dto.station_id,
      tank_id: dto.tank_id,
      reading_liters: dto.reading_liters,
      dipped_by: staffId,
      dipped_at: new Date().toISOString(),
      notes: dto.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// SHIFTS
// =============================================

export async function getActiveShift(stationId: string, staffId: string): Promise<StaffShift | null> {
  const { data, error } = await supabase
    .from('staff_shifts')
    .select('*')
    .eq('station_id', stationId)
    .eq('staff_id', staffId)
    .eq('status', 'active')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function getStationShifts(stationId: string, date?: string): Promise<StaffShift[]> {
  let query = supabase
    .from('staff_shifts')
    .select(`
      *,
      staff:plus_staff!staff_id(id, first_name, last_name, email)
    `)
    .eq('station_id', stationId)
    .order('start_time', { ascending: false });

  if (date) {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;
    query = query.gte('start_time', startOfDay).lte('start_time', endOfDay);
  }

  const { data, error } = await query.limit(50);

  if (error) throw error;
  return data || [];
}

export async function startShift(staffId: string, dto: StartShiftDto): Promise<StaffShift> {
  // Check for existing active shift
  const existing = await getActiveShift(dto.station_id, staffId);
  if (existing) {
    throw new Error('You already have an active shift at this station');
  }

  const { data, error } = await supabase
    .from('staff_shifts')
    .insert({
      station_id: dto.station_id,
      staff_id: staffId,
      shift_type: dto.shift_type,
      start_time: new Date().toISOString(),
      assigned_pumps: dto.assigned_pumps || [],
      opening_cash: dto.opening_cash,
      notes: dto.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function endShift(staffId: string, dto: EndShiftDto): Promise<StaffShift> {
  const { data: shift } = await supabase
    .from('staff_shifts')
    .select('*')
    .eq('id', dto.shift_id)
    .eq('staff_id', staffId)
    .single();

  if (!shift) {
    throw new Error('Shift not found or not yours');
  }

  if (shift.status !== 'active') {
    throw new Error('Shift is not active');
  }

  // Calculate expected cash (opening + cash sales)
  const expectedCash = (shift.opening_cash || 0) + (shift.cash_sales || 0);
  const cashDifference = dto.closing_cash - expectedCash;

  const { data, error } = await supabase
    .from('staff_shifts')
    .update({
      end_time: new Date().toISOString(),
      closing_cash: dto.closing_cash,
      expected_cash: expectedCash,
      cash_difference: cashDifference,
      status: 'closed',
      closed_at: new Date().toISOString(),
      notes: dto.notes ? `${shift.notes || ''}\n${dto.notes}` : shift.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dto.shift_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// SALES
// =============================================

export async function getSales(stationId?: string, filters?: {
  date_from?: string;
  date_to?: string;
  fuel_type_id?: string;
  payment_method?: string;
  shift_id?: string;
  limit?: number;
}): Promise<FuelSale[]> {
  let query = supabase
    .from('fuel_sales')
    .select(`
      *,
      station:fuel_stations(id, name, code),
      fuel_type:fuel_types(*),
      pump:fuel_pumps(*),
      attendant:plus_staff!attendant_id(id, first_name, last_name),
      fleet_customer:fleet_customers(*),
      fleet_vehicle:fleet_vehicles(*),
      fuel_card:fuel_cards(*)
    `)
    .eq('voided', false)
    .order('created_at', { ascending: false });

  // Filter by station if provided
  if (stationId) {
    query = query.eq('station_id', stationId);
  }

  if (filters?.date_from) {
    query = query.gte('created_at', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('created_at', filters.date_to);
  }
  if (filters?.fuel_type_id) {
    query = query.eq('fuel_type_id', filters.fuel_type_id);
  }
  if (filters?.payment_method) {
    query = query.eq('payment_method', filters.payment_method);
  }
  if (filters?.shift_id) {
    query = query.eq('shift_id', filters.shift_id);
  }

  const { data, error } = await query.limit(filters?.limit || 100);

  if (error) throw error;
  return data || [];
}

export async function recordSale(staffId: string, dto: RecordSaleDto): Promise<FuelSale> {
  // Get station code for sale number
  const { data: station } = await supabase
    .from('fuel_stations')
    .select('code')
    .eq('id', dto.station_id)
    .single();

  if (!station) throw new Error('Station not found');

  // Calculate totals
  const subtotal = dto.quantity_liters * dto.price_per_liter;
  const discountAmount = dto.discount_amount || (dto.discount_percent ? subtotal * (dto.discount_percent / 100) : 0);
  const totalAmount = subtotal - discountAmount;

  // Generate sale number
  const today = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const { count } = await supabase
    .from('fuel_sales')
    .select('*', { count: 'exact', head: true })
    .eq('station_id', dto.station_id)
    .gte('created_at', new Date().toISOString().slice(0, 10));

  const saleNumber = `${station.code}-${today}-${String((count || 0) + 1).padStart(4, '0')}`;
  const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const { data, error } = await supabase
    .from('fuel_sales')
    .insert({
      station_id: dto.station_id,
      pump_id: dto.pump_id,
      fuel_type_id: dto.fuel_type_id,
      sale_number: saleNumber,
      quantity_liters: dto.quantity_liters,
      price_per_liter: dto.price_per_liter,
      subtotal,
      discount_amount: discountAmount,
      discount_percent: dto.discount_percent || 0,
      total_amount: totalAmount,
      payment_method: dto.payment_method,
      payment_reference: dto.payment_reference,
      customer_type: dto.customer_type || 'walkin',
      customer_name: dto.customer_name,
      customer_phone: dto.customer_phone,
      fleet_customer_id: dto.fleet_customer_id,
      fleet_vehicle_id: dto.fleet_vehicle_id,
      fleet_driver_id: dto.fleet_driver_id,
      fuel_card_id: dto.fuel_card_id,
      attendant_id: staffId,
      shift_id: dto.shift_id,
      pump_meter_start: dto.pump_meter_start,
      pump_meter_end: dto.pump_meter_end,
      vehicle_registration: dto.vehicle_registration,
      odometer_reading: dto.odometer_reading,
      receipt_number: receiptNumber,
      notes: dto.notes,
    })
    .select()
    .single();

  if (error) throw error;

  // Update pump meter reading if provided
  if (dto.pump_id && dto.pump_meter_end) {
    await supabase
      .from('fuel_pumps')
      .update({
        current_meter_reading: dto.pump_meter_end,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dto.pump_id);
  }

  // Update fleet balance if fleet payment
  if (dto.payment_method === 'fleet' && dto.fleet_customer_id) {
    await supabase.rpc('increment_fleet_balance', {
      customer_id: dto.fleet_customer_id,
      amount: totalAmount,
    });
  }

  // Update fuel card balance if prepaid
  if (dto.payment_method === 'prepaid' && dto.fuel_card_id) {
    // This should be handled by a proper transaction
    // For now, just create the card transaction record
    const { data: card } = await supabase
      .from('fuel_cards')
      .select('balance')
      .eq('id', dto.fuel_card_id)
      .single();

    if (card) {
      const newBalance = card.balance - totalAmount;
      await supabase
        .from('fuel_cards')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', dto.fuel_card_id);

      await supabase
        .from('fuel_card_transactions')
        .insert({
          card_id: dto.fuel_card_id,
          type: 'purchase',
          amount: -totalAmount,
          balance_before: card.balance,
          balance_after: newBalance,
          fuel_sale_id: data.id,
          description: `Fuel purchase - ${dto.quantity_liters}L`,
          created_by: staffId,
        });
    }
  }

  return data;
}

export async function voidSale(staffId: string, saleId: string, reason: string): Promise<FuelSale> {
  const { data, error } = await supabase
    .from('fuel_sales')
    .update({
      voided: true,
      voided_at: new Date().toISOString(),
      voided_by: staffId,
      voided_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', saleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// DASHBOARD
// =============================================

export async function getStationDashboard(stationId: string): Promise<StationDashboardStats> {
  const today = new Date().toISOString().slice(0, 10);
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  // Get today's sales
  const { data: todaySales } = await supabase
    .from('fuel_sales')
    .select('*')
    .eq('station_id', stationId)
    .eq('voided', false)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay);

  // Get active shifts
  const { data: activeShifts } = await supabase
    .from('staff_shifts')
    .select('*')
    .eq('station_id', stationId)
    .eq('status', 'active');

  // Get pumps
  const { data: pumps } = await supabase
    .from('fuel_pumps')
    .select('*')
    .eq('station_id', stationId)
    .eq('status', 'active');

  // Get tanks with fuel types
  const { data: tanks } = await supabase
    .from('fuel_tanks')
    .select(`
      *,
      fuel_type:fuel_types(*)
    `)
    .eq('station_id', stationId);

  // Get fuel types for grouping
  const { data: fuelTypes } = await supabase
    .from('fuel_types')
    .select('*');

  const fuelTypeMap = new Map(fuelTypes?.map(ft => [ft.id, ft]) || []);

  // Calculate sales by fuel type
  const salesByFuelType: Record<string, { liters: number; amount: number }> = {};
  const salesByPayment: Record<string, { amount: number; count: number }> = {};

  let totalSales = 0;
  let totalLiters = 0;

  for (const sale of todaySales || []) {
    totalSales += sale.total_amount;
    totalLiters += sale.quantity_liters;

    if (!salesByFuelType[sale.fuel_type_id]) {
      salesByFuelType[sale.fuel_type_id] = { liters: 0, amount: 0 };
    }
    salesByFuelType[sale.fuel_type_id].liters += sale.quantity_liters;
    salesByFuelType[sale.fuel_type_id].amount += sale.total_amount;

    if (!salesByPayment[sale.payment_method]) {
      salesByPayment[sale.payment_method] = { amount: 0, count: 0 };
    }
    salesByPayment[sale.payment_method].amount += sale.total_amount;
    salesByPayment[sale.payment_method].count += 1;
  }

  // Format tank levels
  const tankLevels = (tanks || []).map(tank => ({
    tank_id: tank.id,
    name: tank.name,
    fuel_type: tank.fuel_type?.name || 'Unknown',
    color: tank.fuel_type?.color || '#6B7280',
    current: tank.current_level_liters,
    capacity: tank.capacity_liters,
    percentage: tank.capacity_liters > 0
      ? Math.round((tank.current_level_liters / tank.capacity_liters) * 100)
      : 0,
    is_low: tank.current_level_liters <= tank.minimum_level_liters,
  }));

  const lowTanksCount = tankLevels.filter(t => t.is_low).length;

  return {
    today_sales: totalSales,
    today_liters: totalLiters,
    today_transactions: todaySales?.length || 0,
    active_shifts: activeShifts?.length || 0,
    active_pumps: pumps?.length || 0,
    low_tanks: lowTanksCount,
    low_stock_tanks: lowTanksCount,
    sales_by_fuel_type: Object.entries(salesByFuelType).map(([id, data]) => {
      const ft = fuelTypeMap.get(id);
      return {
        fuel_type: ft?.name || 'Unknown',
        fuel_type_id: id,
        color: ft?.color || '#6B7280',
        ...data,
      };
    }),
    sales_by_payment: Object.entries(salesByPayment).map(([method, data]) => ({
      method: method as any,
      ...data,
    })),
    recent_sales: (todaySales || []).slice(0, 10),
    tank_levels: tankLevels,
  };
}

// =============================================
// FLEET CUSTOMERS
// =============================================

export async function getFleetCustomers(businessId: string): Promise<FleetCustomer[]> {
  const { data, error } = await supabase
    .from('fleet_customers')
    .select(`
      *,
      vehicles:fleet_vehicles(count),
      drivers:fleet_drivers(count)
    `)
    .eq('business_id', businessId)
    .order('company_name');

  if (error) throw error;

  return (data || []).map(c => ({
    ...c,
    vehicle_count: c.vehicles?.[0]?.count || 0,
    driver_count: c.drivers?.[0]?.count || 0,
    available_credit: c.credit_limit - c.current_balance,
  }));
}

export async function getFleetCustomer(customerId: string): Promise<FleetCustomer | null> {
  const { data, error } = await supabase
    .from('fleet_customers')
    .select(`
      *,
      vehicles:fleet_vehicles(*),
      drivers:fleet_drivers(*)
    `)
    .eq('id', customerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return {
    ...data,
    vehicle_count: data.vehicles?.length || 0,
    driver_count: data.drivers?.length || 0,
    available_credit: data.credit_limit - data.current_balance,
  };
}

export async function createFleetCustomer(businessId: string, dto: CreateFleetCustomerDto): Promise<FleetCustomer> {
  const { data, error } = await supabase
    .from('fleet_customers')
    .insert({
      business_id: businessId,
      ...dto,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// FLEET VEHICLES
// =============================================

export async function createFleetVehicle(dto: CreateFleetVehicleDto): Promise<FleetVehicle> {
  const { data, error } = await supabase
    .from('fleet_vehicles')
    .insert(dto)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// FLEET DRIVERS
// =============================================

export async function createFleetDriver(dto: CreateFleetDriverDto): Promise<FleetDriver> {
  const { data, error } = await supabase
    .from('fleet_drivers')
    .insert({
      fleet_customer_id: dto.fleet_customer_id,
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      license_number: dto.license_number,
      pin_hash: dto.pin, // TODO: Hash this properly
      assigned_vehicles: dto.assigned_vehicles || [],
      daily_limit: dto.daily_limit,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// FUEL CARDS
// =============================================

export async function getFuelCards(businessId: string): Promise<FuelCard[]> {
  const { data, error } = await supabase
    .from('fuel_cards')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function issueFuelCard(businessId: string, staffId: string, dto: IssueFuelCardDto): Promise<FuelCard> {
  // Generate card number
  const prefix = dto.card_type === 'prepaid' ? 'FC' : dto.card_type === 'fleet' ? 'FL' : 'ST';
  const cardNumber = `${prefix}${String(Math.floor(Math.random() * 10000000000)).padStart(10, '0')}`;

  const { data, error } = await supabase
    .from('fuel_cards')
    .insert({
      business_id: businessId,
      card_number: cardNumber,
      card_type: dto.card_type,
      holder_name: dto.holder_name,
      holder_type: dto.holder_type,
      holder_id: dto.holder_id,
      peeap_user_id: dto.peeap_user_id,
      pin_hash: dto.pin, // TODO: Hash this
      balance: dto.initial_balance || 0,
      credit_limit: dto.credit_limit || 0,
      daily_limit: dto.daily_limit,
      monthly_limit: dto.monthly_limit,
      single_transaction_limit: dto.single_transaction_limit,
      fuel_type_restrictions: dto.fuel_type_restrictions,
      station_restrictions: dto.station_restrictions,
      expires_at: dto.expires_at,
      issued_by: staffId,
    })
    .select()
    .single();

  if (error) throw error;

  // Record initial balance as topup if > 0
  if (dto.initial_balance && dto.initial_balance > 0) {
    await supabase
      .from('fuel_card_transactions')
      .insert({
        card_id: data.id,
        type: 'topup',
        amount: dto.initial_balance,
        balance_before: 0,
        balance_after: dto.initial_balance,
        description: 'Initial balance',
        created_by: staffId,
      });
  }

  return data;
}

export async function topUpFuelCard(staffId: string, dto: TopUpFuelCardDto): Promise<FuelCard> {
  // Get current balance
  const { data: card } = await supabase
    .from('fuel_cards')
    .select('balance')
    .eq('id', dto.card_id)
    .single();

  if (!card) throw new Error('Card not found');

  const newBalance = card.balance + dto.amount;

  // Update card balance
  const { data, error } = await supabase
    .from('fuel_cards')
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dto.card_id)
    .select()
    .single();

  if (error) throw error;

  // Record transaction
  await supabase
    .from('fuel_card_transactions')
    .insert({
      card_id: dto.card_id,
      type: 'topup',
      amount: dto.amount,
      balance_before: card.balance,
      balance_after: newBalance,
      reference: dto.payment_reference,
      description: dto.notes || 'Top-up',
      created_by: staffId,
    });

  return data;
}

export async function getFuelCardBalance(cardNumber: string): Promise<{ balance: number; status: string } | null> {
  const { data, error } = await supabase
    .from('fuel_cards')
    .select('balance, status')
    .eq('card_number', cardNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

// Helper to get business ID from localStorage
function getBusinessId(): string {
  if (typeof window === 'undefined') {
    // Return empty string for server-side rendering - will be replaced on client
    return '';
  }
  const businessId = localStorage.getItem('plusBusinessId');
  if (!businessId) {
    // Return empty string - will trigger async lookup
    return '';
  }
  return businessId;
}

// Helper to get or create business ID
async function ensureBusinessId(): Promise<string> {
  if (typeof window === 'undefined') {
    return '';
  }

  // Check if already cached - but verify it's valid
  const cachedId = localStorage.getItem('plusBusinessId');
  if (cachedId) {
    // Verify the cached ID exists in the database
    const { data: existingBusiness } = await supabase
      .from('plus_businesses')
      .select('id')
      .eq('id', cachedId)
      .single();

    if (existingBusiness) {
      return cachedId;
    }
    // Cached ID is invalid, clear it
    localStorage.removeItem('plusBusinessId');
    console.warn('Cleared invalid cached business ID');
  }

  // Get user ID
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    console.warn('No user found in localStorage');
    return '';
  }

  let userId: string;
  let userName: string = 'My Business';
  try {
    const user = JSON.parse(userStr);
    userId = user.id;
    userName = user.name || user.email || 'My Business';
    if (!userId) {
      console.warn('No user ID found');
      return '';
    }
  } catch {
    return '';
  }

  // Look up business by user_id (correct column name per schema)
  const { data: business, error } = await supabase
    .from('plus_businesses')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (business && !error) {
    localStorage.setItem('plusBusinessId', business.id);
    return business.id;
  }

  // Business doesn't exist - create one
  // Schema: user_id, tier, source, business_info (JSONB), etc.
  console.log('Creating new business for user:', userId);
  const { data: newBusiness, error: createError } = await supabase
    .from('plus_businesses')
    .insert({
      user_id: userId,
      tier: 'business',
      source: 'new',
      business_info: { name: userName },
    })
    .select('id')
    .single();

  if (createError) {
    console.error('Failed to create business:', createError);
    return '';
  }

  if (!newBusiness) {
    console.error('No business returned after create');
    return '';
  }

  console.log('Created new business:', newBusiness.id);
  localStorage.setItem('plusBusinessId', newBusiness.id);
  return newBusiness.id;
}

// Helper to get staff ID from localStorage
function getStaffId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const staffId = localStorage.getItem('plusStaffId');
  if (!staffId) {
    // Try to get from user object
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.id) {
          localStorage.setItem('plusStaffId', user.id);
          return user.id;
        }
      } catch {}
    }
    console.warn('No staff ID found in localStorage. Shift operations may not work correctly.');
    return '';
  }
  return staffId;
}

// Check if we have valid credentials for fuel operations
export function hasFuelCredentials(): boolean {
  if (typeof window === 'undefined') return false;
  const businessId = localStorage.getItem('plusBusinessId');
  return !!businessId;
}

// Wrapper to handle empty businessId gracefully
async function withBusinessId<T>(fn: (businessId: string) => Promise<T>, defaultValue: T): Promise<T> {
  const businessId = getBusinessId();
  if (!businessId) {
    console.warn('No business ID available - returning empty result');
    return defaultValue;
  }
  return fn(businessId);
}

// Facade with auto business ID injection where needed
export const fuelService = {
  // Fuel Types
  getFuelTypes: () => withBusinessId(getFuelTypes, []),
  createFuelType: async (dto: CreateFuelTypeDto) => {
    const businessId = await ensureBusinessId();
    if (!businessId) throw new Error('Business ID required to create fuel type');
    return createFuelType(businessId, dto);
  },
  // Stations
  getStations: () => withBusinessId(getStations, []),
  getStation,
  createStation: async (dto: CreateStationDto) => {
    const businessId = await ensureBusinessId();
    if (!businessId) throw new Error('Business ID required to create station');
    return createStation(businessId, dto);
  },
  updateStation,
  deleteStation,
  // Pumps
  getPumps,
  createPump,
  updatePump,
  // Tanks
  getTanks,
  createTank,
  // Pricing
  getCurrentPrices,
  setPrice: (dto: SetPriceDto) => {
    const staffId = getStaffId();
    if (!staffId) throw new Error('Staff ID required to set price');
    return setPrice(staffId, dto);
  },
  // Inventory
  getDeliveries,
  recordDelivery: (dto: RecordDeliveryDto) => {
    const staffId = getStaffId();
    if (!staffId) throw new Error('Staff ID required to record delivery');
    return recordDelivery(staffId, dto);
  },
  getDippings,
  recordDipping: (dto: RecordDippingDto) => {
    const staffId = getStaffId();
    if (!staffId) throw new Error('Staff ID required to record dipping');
    return recordDipping(staffId, dto);
  },
  // Shifts
  getActiveShift,
  getStationShifts,
  startShift: (dto: StartShiftDto) => {
    const staffId = getStaffId();
    if (!staffId) throw new Error('Staff ID required to start shift');
    return startShift(staffId, dto);
  },
  endShift: (dto: EndShiftDto) => {
    const staffId = getStaffId();
    if (!staffId) throw new Error('Staff ID required to end shift');
    return endShift(staffId, dto);
  },
  // Sales
  getSales,
  recordSale: (dto: RecordSaleDto) => {
    const staffId = getStaffId();
    if (!staffId) throw new Error('Staff ID required to record sale');
    return recordSale(staffId, dto);
  },
  voidSale: (saleId: string, reason: string) => {
    const staffId = getStaffId();
    if (!staffId) throw new Error('Staff ID required to void sale');
    return voidSale(staffId, saleId, reason);
  },
  // Dashboard
  getStationDashboard,
  // Fleet
  getFleetCustomers: () => withBusinessId(getFleetCustomers, []),
  getFleetCustomer,
  createFleetCustomer: async (dto: CreateFleetCustomerDto) => {
    const businessId = await ensureBusinessId();
    if (!businessId) throw new Error('Business ID required to create fleet customer');
    return createFleetCustomer(businessId, dto);
  },
  createFleetVehicle,
  createFleetDriver,
  // Fuel Cards
  getFuelCards: () => withBusinessId(getFuelCards, []),
  issueFuelCard: async (dto: IssueFuelCardDto) => {
    const businessId = await ensureBusinessId();
    const staffId = getStaffId();
    if (!businessId || !staffId) throw new Error('Business ID and Staff ID required to issue fuel card');
    return issueFuelCard(businessId, staffId, dto);
  },
  topUpFuelCard: (dto: TopUpFuelCardDto) => {
    const staffId = getStaffId();
    if (!staffId) throw new Error('Staff ID required to top up fuel card');
    return topUpFuelCard(staffId, dto);
  },
  getFuelCardBalance,
  // Credentials check
  hasFuelCredentials,
};

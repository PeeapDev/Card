/**
 * POS Service - Handle all POS operations
 */

import { supabase } from '@/lib/supabase';

// Types
export interface POSCategory {
  id: string;
  merchant_id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface POSProduct {
  id: string;
  merchant_id: string;
  category_id?: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  price: number;
  cost_price: number;
  image_url?: string;
  track_inventory: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  has_variants: boolean;
  variants: any[];
  is_active: boolean;
  is_featured: boolean;
  tax_rate: number;
  created_at: string;
  updated_at: string;
  category?: POSCategory;
}

export interface POSSaleItem {
  id?: string;
  sale_id?: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  total_price: number;
  notes?: string;
}

export interface POSSale {
  id?: string;
  merchant_id: string;
  sale_number?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: 'cash' | 'mobile_money' | 'card' | 'qr' | 'split';
  payment_status: 'pending' | 'completed' | 'refunded' | 'partial_refund';
  payment_reference?: string;
  payment_details?: any;
  payments?: any[];
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  cashier_id?: string;
  cashier_name?: string;
  status: 'completed' | 'voided' | 'refunded';
  notes?: string;
  items: POSSaleItem[];
  created_at?: string;
}

export interface CartItem {
  product: POSProduct;
  quantity: number;
  discount: number;
  discountType?: 'percentage' | 'fixed';
}

// Customer for credit/tab system
export interface POSCustomer {
  id?: string;
  merchant_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit: number;
  credit_balance: number; // Amount owed
  total_purchases: number;
  total_paid: number;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Customer credit transaction
export interface POSCreditTransaction {
  id?: string;
  merchant_id: string;
  customer_id: string;
  sale_id?: string;
  type: 'credit' | 'payment';
  amount: number;
  balance_before: number;
  balance_after: number;
  payment_method?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

// Held/Parked Order
export interface POSHeldOrder {
  id?: string;
  merchant_id: string;
  hold_number?: string;
  customer_name?: string;
  customer_phone?: string;
  items: CartItem[];
  subtotal: number;
  discount_amount: number;
  notes?: string;
  held_by?: string;
  held_at?: string;
  expires_at?: string;
  status: 'held' | 'resumed' | 'expired';
  created_at?: string;
}

// Refund
export interface POSRefund {
  id?: string;
  merchant_id: string;
  sale_id: string;
  refund_number?: string;
  refund_type: 'full' | 'partial';
  refund_amount: number;
  refund_method: 'cash' | 'original' | 'store_credit';
  items?: POSSaleItem[];
  reason: string;
  refunded_by?: string;
  created_at?: string;
}

// Discount
export interface POSDiscount {
  id?: string;
  merchant_id: string;
  name: string;
  code?: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_purchase?: number;
  max_discount?: number;
  applies_to: 'cart' | 'item' | 'category';
  category_ids?: string[];
  product_ids?: string[];
  start_date?: string;
  end_date?: string;
  usage_limit?: number;
  usage_count: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Cash Session / Daily Balance
export interface POSCashSession {
  id?: string;
  merchant_id: string;
  session_date: string;
  opening_balance: number;
  closing_balance?: number;
  expected_balance?: number;
  cash_sales_total?: number;
  cash_in?: number;
  cash_out?: number;
  difference?: number;
  status: 'open' | 'closed';
  opened_by?: string;
  opened_at?: string;
  closed_by?: string;
  closed_at?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Product Variant
export interface POSProductVariant {
  id?: string;
  product_id: string;
  name: string; // e.g., "Small", "Red", "32GB"
  sku?: string;
  barcode?: string;
  price_adjustment: number; // Can be positive or negative
  stock_quantity: number;
  is_active: boolean;
  attributes: Record<string, string>; // e.g., { size: "Small", color: "Red" }
}

// Staff Member
export interface POSStaff {
  id?: string;
  merchant_id: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  pin?: string; // 4-6 digit PIN for terminal login
  role: 'admin' | 'manager' | 'cashier';
  permissions: string[];
  is_active: boolean;
  invitation_status?: 'pending' | 'accepted' | 'declined';
  invited_at?: string;
  accepted_at?: string;
  declined_at?: string;
  created_at?: string;
  updated_at?: string;
}

// Customer Loyalty
export interface POSLoyaltyProgram {
  id?: string;
  merchant_id: string;
  name: string;
  points_per_currency: number; // e.g., 1 point per 1000 SLE
  points_value: number; // e.g., 100 points = 1000 SLE
  min_redeem_points: number;
  max_redeem_percent?: number; // Max % of transaction payable with points
  is_active: boolean;
  created_at?: string;
}

export interface POSLoyaltyPoints {
  id?: string;
  merchant_id: string;
  customer_id: string;
  points_balance: number;
  total_earned: number;
  total_redeemed: number;
  created_at?: string;
  updated_at?: string;
}

// Split Payment
export interface POSSplitPayment {
  method: 'cash' | 'mobile_money' | 'card' | 'qr' | 'credit';
  amount: number;
  reference?: string;
  customer_id?: string; // For credit payments
}

// Inventory Alert
export interface POSInventoryAlert {
  id?: string;
  merchant_id: string;
  product_id: string;
  product_name: string;
  current_stock: number;
  threshold: number;
  alert_type: 'low_stock' | 'out_of_stock';
  is_acknowledged: boolean;
  created_at?: string;
}

// Sales Report
export interface POSSalesReport {
  period: 'daily' | 'weekly' | 'monthly' | 'custom';
  start_date: string;
  end_date: string;
  total_sales: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  profit_margin: number;
  total_items_sold: number;
  average_ticket: number;
  sales_by_category: { category: string; sales: number; revenue: number }[];
  sales_by_payment: { method: string; count: number; amount: number }[];
  sales_by_hour: { hour: number; count: number; amount: number }[];
  top_products: { id: string; name: string; quantity: number; revenue: number; profit: number }[];
  sales_trend: { date: string; sales: number; revenue: number }[];
}

// Categories
export const getCategories = async (businessId: string): Promise<POSCategory[]> => {
  const { data, error } = await supabase
    .from('pos_categories')
    .select('*')
    .eq('merchant_id', businessId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const createCategory = async (category: Partial<POSCategory>): Promise<POSCategory> => {
  const { data, error } = await supabase
    .from('pos_categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateCategory = async (id: string, updates: Partial<POSCategory>): Promise<POSCategory> => {
  const { data, error } = await supabase
    .from('pos_categories')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('pos_categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Products
export const getProducts = async (businessId: string, categoryId?: string): Promise<POSProduct[]> => {
  let query = supabase
    .from('pos_products')
    .select('*, category:pos_categories(*)')
    .eq('merchant_id', businessId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

export const getProductByBarcode = async (businessId: string, barcode: string): Promise<POSProduct | null> => {
  const { data, error } = await supabase
    .from('pos_products')
    .select('*, category:pos_categories(*)')
    .eq('merchant_id', businessId)
    .eq('barcode', barcode)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const createProduct = async (product: Partial<POSProduct>): Promise<POSProduct> => {
  const { data, error } = await supabase
    .from('pos_products')
    .insert(product)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProduct = async (id: string, updates: Partial<POSProduct>): Promise<POSProduct> => {
  const { data, error } = await supabase
    .from('pos_products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('pos_products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

// Sales
export const createSale = async (sale: Omit<POSSale, 'id' | 'sale_number' | 'created_at'>, items: POSSaleItem[]): Promise<POSSale> => {
  // Generate sale number
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await supabase
    .from('pos_sales')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', sale.merchant_id)
    .gte('created_at', new Date().toISOString().slice(0, 10));

  const saleNumber = `S${today}-${String((count || 0) + 1).padStart(4, '0')}`;

  // Create sale
  const { data: saleData, error: saleError } = await supabase
    .from('pos_sales')
    .insert({
      ...sale,
      sale_number: saleNumber,
    })
    .select()
    .single();

  if (saleError) throw saleError;

  // Create sale items
  const itemsWithSaleId = items.map(item => ({
    ...item,
    sale_id: saleData.id,
  }));

  const { error: itemsError } = await supabase
    .from('pos_sale_items')
    .insert(itemsWithSaleId);

  if (itemsError) throw itemsError;

  // Update inventory for tracked products
  for (const item of items) {
    const { data: product } = await supabase
      .from('pos_products')
      .select('track_inventory, stock_quantity')
      .eq('id', item.product_id)
      .single();

    if (product?.track_inventory) {
      await supabase
        .from('pos_products')
        .update({
          stock_quantity: product.stock_quantity - item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.product_id);

      // Log inventory change
      await supabase
        .from('pos_inventory_log')
        .insert({
          merchant_id: sale.merchant_id,
          product_id: item.product_id,
          type: 'sale',
          quantity_change: -item.quantity,
          quantity_before: product.stock_quantity,
          quantity_after: product.stock_quantity - item.quantity,
          reference_type: 'sale',
          reference_id: saleData.id,
        });
    }
  }

  return { ...saleData, items };
};

export const getSales = async (
  businessId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ sales: POSSale[]; total: number }> => {
  let query = supabase
    .from('pos_sales')
    .select('*, items:pos_sale_items(*)', { count: 'exact' })
    .eq('merchant_id', businessId)
    .order('created_at', { ascending: false });

  if (options?.startDate) {
    query = query.gte('created_at', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('created_at', options.endDate);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { sales: data || [], total: count || 0 };
};

export const getSaleById = async (saleId: string): Promise<POSSale | null> => {
  const { data, error } = await supabase
    .from('pos_sales')
    .select('*, items:pos_sale_items(*)')
    .eq('id', saleId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const voidSale = async (saleId: string, reason: string, voidedBy: string): Promise<void> => {
  const { error } = await supabase
    .from('pos_sales')
    .update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      voided_by: voidedBy,
      void_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', saleId);

  if (error) throw error;

  // Restore inventory for voided sale
  const { data: sale } = await supabase
    .from('pos_sales')
    .select('merchant_id, items:pos_sale_items(*)')
    .eq('id', saleId)
    .single();

  if (sale) {
    for (const item of sale.items) {
      const { data: product } = await supabase
        .from('pos_products')
        .select('track_inventory, stock_quantity')
        .eq('id', item.product_id)
        .single();

      if (product?.track_inventory) {
        await supabase
          .from('pos_products')
          .update({
            stock_quantity: product.stock_quantity + item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.product_id);

        // Log inventory restoration
        await supabase
          .from('pos_inventory_log')
          .insert({
            merchant_id: sale.merchant_id,
            product_id: item.product_id,
            type: 'return',
            quantity_change: item.quantity,
            quantity_before: product.stock_quantity,
            quantity_after: product.stock_quantity + item.quantity,
            reference_type: 'sale',
            reference_id: saleId,
            notes: `Void: ${reason}`,
          });
      }
    }
  }
};

// Reports
export const getDailySummary = async (businessId: string, date?: string): Promise<{
  totalSales: number;
  totalAmount: number;
  averageTicket: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  paymentBreakdown: { method: string; count: number; amount: number }[];
}> => {
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const { data: sales } = await supabase
    .from('pos_sales')
    .select('*, items:pos_sale_items(*)')
    .eq('merchant_id', businessId)
    .eq('status', 'completed')
    .gte('created_at', `${targetDate}T00:00:00`)
    .lte('created_at', `${targetDate}T23:59:59`);

  if (!sales || sales.length === 0) {
    return {
      totalSales: 0,
      totalAmount: 0,
      averageTicket: 0,
      topProducts: [],
      paymentBreakdown: [],
    };
  }

  const totalSales = sales.length;
  const totalAmount = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const averageTicket = totalAmount / totalSales;

  // Top products
  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const existing = productMap.get(item.product_name) || { name: item.product_name, quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += Number(item.total_price);
      productMap.set(item.product_name, existing);
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Payment breakdown
  const paymentMap = new Map<string, { method: string; count: number; amount: number }>();
  for (const sale of sales) {
    const existing = paymentMap.get(sale.payment_method) || { method: sale.payment_method, count: 0, amount: 0 };
    existing.count += 1;
    existing.amount += Number(sale.total_amount);
    paymentMap.set(sale.payment_method, existing);
  }
  const paymentBreakdown = Array.from(paymentMap.values());

  return {
    totalSales,
    totalAmount,
    averageTicket,
    topProducts,
    paymentBreakdown,
  };
};

// Inventory
export const updateStock = async (
  businessId: string,
  productId: string,
  quantity: number,
  type: 'restock' | 'adjustment' | 'damage',
  notes?: string,
  userId?: string
): Promise<void> => {
  const { data: product } = await supabase
    .from('pos_products')
    .select('stock_quantity')
    .eq('id', productId)
    .single();

  if (!product) throw new Error('Product not found');

  const newQuantity = type === 'adjustment' ? quantity : product.stock_quantity + quantity;

  await supabase
    .from('pos_products')
    .update({
      stock_quantity: newQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId);

  await supabase
    .from('pos_inventory_log')
    .insert({
      merchant_id: businessId,
      product_id: productId,
      type,
      quantity_change: type === 'adjustment' ? quantity - product.stock_quantity : quantity,
      quantity_before: product.stock_quantity,
      quantity_after: newQuantity,
      reference_type: 'manual',
      notes,
      created_by: userId,
    });
};

export const getLowStockProducts = async (businessId: string): Promise<POSProduct[]> => {
  const { data, error } = await supabase
    .from('pos_products')
    .select('*')
    .eq('merchant_id', businessId)
    .eq('track_inventory', true)
    .eq('is_active', true)
    .filter('stock_quantity', 'lte', 'low_stock_threshold');

  if (error) throw error;

  // Filter in JS since Supabase doesn't support column comparison in filters
  return (data || []).filter(p => p.stock_quantity <= p.low_stock_threshold);
};

// ================== Cash Session / Daily Balance ==================

// Get today's cash session
export const getTodayCashSession = async (merchantId: string): Promise<POSCashSession | null> => {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('pos_cash_sessions')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('session_date', today)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// Get cash session by date
export const getCashSessionByDate = async (merchantId: string, date: string): Promise<POSCashSession | null> => {
  const { data, error } = await supabase
    .from('pos_cash_sessions')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('session_date', date)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// Get cash session history
export const getCashSessionHistory = async (
  merchantId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ sessions: POSCashSession[]; total: number }> => {
  let query = supabase
    .from('pos_cash_sessions')
    .select('*', { count: 'exact' })
    .eq('merchant_id', merchantId)
    .order('session_date', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { sessions: data || [], total: count || 0 };
};

// Open cash session (set opening balance)
export const openCashSession = async (
  merchantId: string,
  openingBalance: number,
  userId?: string,
  notes?: string
): Promise<POSCashSession> => {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  // Check if session already exists for today
  const existing = await getTodayCashSession(merchantId);
  if (existing) {
    throw new Error('A cash session already exists for today');
  }

  const { data, error } = await supabase
    .from('pos_cash_sessions')
    .insert({
      merchant_id: merchantId,
      session_date: today,
      opening_balance: openingBalance,
      status: 'open',
      opened_by: userId,
      opened_at: now,
      notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Close cash session (set closing balance)
export const closeCashSession = async (
  sessionId: string,
  closingBalance: number,
  userId?: string,
  notes?: string
): Promise<POSCashSession> => {
  const now = new Date().toISOString();

  // Get the session first
  const { data: session, error: fetchError } = await supabase
    .from('pos_cash_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (fetchError) throw fetchError;
  if (!session) throw new Error('Cash session not found');
  if (session.status === 'closed') throw new Error('Cash session is already closed');

  // Calculate cash sales for the session date
  const { data: sales } = await supabase
    .from('pos_sales')
    .select('total_amount, payment_method')
    .eq('merchant_id', session.merchant_id)
    .eq('status', 'completed')
    .eq('payment_method', 'cash')
    .gte('created_at', `${session.session_date}T00:00:00`)
    .lte('created_at', `${session.session_date}T23:59:59`);

  const cashSalesTotal = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const expectedBalance = session.opening_balance + cashSalesTotal + (session.cash_in || 0) - (session.cash_out || 0);
  const difference = closingBalance - expectedBalance;

  const { data, error } = await supabase
    .from('pos_cash_sessions')
    .update({
      closing_balance: closingBalance,
      expected_balance: expectedBalance,
      cash_sales_total: cashSalesTotal,
      difference,
      status: 'closed',
      closed_by: userId,
      closed_at: now,
      notes: notes ? `${session.notes || ''}\n${notes}`.trim() : session.notes,
      updated_at: now,
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Add cash in/out transaction
export const addCashTransaction = async (
  sessionId: string,
  type: 'in' | 'out',
  amount: number,
  reason?: string
): Promise<POSCashSession> => {
  const now = new Date().toISOString();

  // Get current session
  const { data: session, error: fetchError } = await supabase
    .from('pos_cash_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (fetchError) throw fetchError;
  if (!session) throw new Error('Cash session not found');
  if (session.status === 'closed') throw new Error('Cannot modify a closed session');

  const updates: Partial<POSCashSession> = {
    updated_at: now,
  };

  if (type === 'in') {
    updates.cash_in = (session.cash_in || 0) + amount;
  } else {
    updates.cash_out = (session.cash_out || 0) + amount;
  }

  if (reason) {
    updates.notes = `${session.notes || ''}\n[${type.toUpperCase()}] SLE ${amount}: ${reason}`.trim();
  }

  const { data, error } = await supabase
    .from('pos_cash_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update opening balance (only if session is still open and no sales yet)
export const updateOpeningBalance = async (
  sessionId: string,
  newOpeningBalance: number
): Promise<POSCashSession> => {
  const { data: session, error: fetchError } = await supabase
    .from('pos_cash_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (fetchError) throw fetchError;
  if (!session) throw new Error('Cash session not found');
  if (session.status === 'closed') throw new Error('Cannot modify a closed session');

  const { data, error } = await supabase
    .from('pos_cash_sessions')
    .update({
      opening_balance: newOpeningBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ================== Customer Management (Credit/Tab System) ==================

export const getCustomers = async (merchantId: string, search?: string): Promise<POSCustomer[]> => {
  let query = supabase
    .from('pos_customers')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const getCustomerById = async (customerId: string): Promise<POSCustomer | null> => {
  const { data, error } = await supabase
    .from('pos_customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const createCustomer = async (customer: Partial<POSCustomer>): Promise<POSCustomer> => {
  const { data, error } = await supabase
    .from('pos_customers')
    .insert({
      ...customer,
      credit_balance: 0,
      total_purchases: 0,
      total_paid: 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateCustomer = async (id: string, updates: Partial<POSCustomer>): Promise<POSCustomer> => {
  const { data, error } = await supabase
    .from('pos_customers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Add credit to customer (they owe more)
export const addCustomerCredit = async (
  merchantId: string,
  customerId: string,
  amount: number,
  saleId?: string,
  notes?: string,
  userId?: string
): Promise<POSCreditTransaction> => {
  // Get current customer balance
  const customer = await getCustomerById(customerId);
  if (!customer) throw new Error('Customer not found');

  // Check credit limit
  if (customer.credit_balance + amount > customer.credit_limit) {
    throw new Error(`Credit limit exceeded. Available credit: SLE ${customer.credit_limit - customer.credit_balance}`);
  }

  const balanceBefore = customer.credit_balance;
  const balanceAfter = balanceBefore + amount;

  // Create transaction record
  const { data: transaction, error: txError } = await supabase
    .from('pos_credit_transactions')
    .insert({
      merchant_id: merchantId,
      customer_id: customerId,
      sale_id: saleId,
      type: 'credit',
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      notes,
      created_by: userId,
    })
    .select()
    .single();

  if (txError) throw txError;

  // Update customer balance
  await supabase
    .from('pos_customers')
    .update({
      credit_balance: balanceAfter,
      total_purchases: customer.total_purchases + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId);

  return transaction;
};

// Record payment from customer (reduce what they owe)
export const recordCustomerPayment = async (
  merchantId: string,
  customerId: string,
  amount: number,
  paymentMethod: string,
  notes?: string,
  userId?: string
): Promise<POSCreditTransaction> => {
  const customer = await getCustomerById(customerId);
  if (!customer) throw new Error('Customer not found');

  const balanceBefore = customer.credit_balance;
  const balanceAfter = Math.max(0, balanceBefore - amount);

  const { data: transaction, error: txError } = await supabase
    .from('pos_credit_transactions')
    .insert({
      merchant_id: merchantId,
      customer_id: customerId,
      type: 'payment',
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      payment_method: paymentMethod,
      notes,
      created_by: userId,
    })
    .select()
    .single();

  if (txError) throw txError;

  await supabase
    .from('pos_customers')
    .update({
      credit_balance: balanceAfter,
      total_paid: customer.total_paid + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId);

  return transaction;
};

export const getCustomerTransactions = async (
  customerId: string,
  limit?: number
): Promise<POSCreditTransaction[]> => {
  let query = supabase
    .from('pos_credit_transactions')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// ================== Held/Parked Orders ==================

export const holdOrder = async (
  merchantId: string,
  items: CartItem[],
  subtotal: number,
  discountAmount: number,
  customerName?: string,
  customerPhone?: string,
  notes?: string,
  userId?: string
): Promise<POSHeldOrder> => {
  // Generate hold number
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await supabase
    .from('pos_held_orders')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .gte('created_at', new Date().toISOString().slice(0, 10));

  const holdNumber = `H${today}-${String((count || 0) + 1).padStart(3, '0')}`;

  // Set expiry to 24 hours from now
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // Convert items to storable format (without circular references)
  const storableItems = items.map(item => ({
    product_id: item.product.id,
    product_name: item.product.name,
    product_price: item.product.price,
    product_sku: item.product.sku,
    quantity: item.quantity,
    discount: item.discount,
    discountType: item.discountType,
  }));

  const { data, error } = await supabase
    .from('pos_held_orders')
    .insert({
      merchant_id: merchantId,
      hold_number: holdNumber,
      customer_name: customerName,
      customer_phone: customerPhone,
      items: storableItems,
      subtotal,
      discount_amount: discountAmount,
      notes,
      held_by: userId,
      held_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'held',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getHeldOrders = async (merchantId: string): Promise<POSHeldOrder[]> => {
  const { data, error } = await supabase
    .from('pos_held_orders')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('status', 'held')
    .order('held_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const resumeHeldOrder = async (orderId: string): Promise<POSHeldOrder> => {
  const { data, error } = await supabase
    .from('pos_held_orders')
    .update({ status: 'resumed', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteHeldOrder = async (orderId: string): Promise<void> => {
  const { error } = await supabase
    .from('pos_held_orders')
    .delete()
    .eq('id', orderId);

  if (error) throw error;
};

// ================== Refunds ==================

export const processRefund = async (
  merchantId: string,
  saleId: string,
  refundType: 'full' | 'partial',
  refundAmount: number,
  refundMethod: 'cash' | 'original' | 'store_credit',
  reason: string,
  items?: POSSaleItem[],
  userId?: string
): Promise<POSRefund> => {
  // Get the original sale
  const sale = await getSaleById(saleId);
  if (!sale) throw new Error('Sale not found');
  if (sale.status === 'refunded') throw new Error('Sale already fully refunded');

  // Generate refund number
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await supabase
    .from('pos_refunds')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .gte('created_at', new Date().toISOString().slice(0, 10));

  const refundNumber = `R${today}-${String((count || 0) + 1).padStart(4, '0')}`;

  // Create refund record
  const { data: refund, error: refundError } = await supabase
    .from('pos_refunds')
    .insert({
      merchant_id: merchantId,
      sale_id: saleId,
      refund_number: refundNumber,
      refund_type: refundType,
      refund_amount: refundAmount,
      refund_method: refundMethod,
      items: items || null,
      reason,
      refunded_by: userId,
    })
    .select()
    .single();

  if (refundError) throw refundError;

  // Update sale status
  const newStatus = refundType === 'full' ? 'refunded' : sale.status;
  const newPaymentStatus = refundType === 'full' ? 'refunded' : 'partial_refund';

  await supabase
    .from('pos_sales')
    .update({
      status: newStatus,
      payment_status: newPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', saleId);

  // Restore inventory for refunded items
  const itemsToRestore = items || sale.items;
  for (const item of itemsToRestore) {
    const { data: product } = await supabase
      .from('pos_products')
      .select('track_inventory, stock_quantity')
      .eq('id', item.product_id)
      .single();

    if (product?.track_inventory) {
      await supabase
        .from('pos_products')
        .update({
          stock_quantity: product.stock_quantity + item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.product_id);

      // Log inventory restoration
      await supabase
        .from('pos_inventory_log')
        .insert({
          merchant_id: merchantId,
          product_id: item.product_id,
          type: 'return',
          quantity_change: item.quantity,
          quantity_before: product.stock_quantity,
          quantity_after: product.stock_quantity + item.quantity,
          reference_type: 'refund',
          reference_id: refund.id,
          notes: `Refund: ${reason}`,
        });
    }
  }

  return refund;
};

export const getRefunds = async (
  merchantId: string,
  options?: { startDate?: string; endDate?: string; limit?: number }
): Promise<POSRefund[]> => {
  let query = supabase
    .from('pos_refunds')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (options?.startDate) {
    query = query.gte('created_at', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('created_at', options.endDate);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// ================== Discounts ==================

export const getDiscounts = async (merchantId: string, activeOnly = true): Promise<POSDiscount[]> => {
  let query = supabase
    .from('pos_discounts')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('name', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const getDiscountByCode = async (merchantId: string, code: string): Promise<POSDiscount | null> => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('pos_discounts')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  // Check validity period
  if (data.start_date && new Date(data.start_date) > new Date(now)) {
    throw new Error('This discount is not yet active');
  }
  if (data.end_date && new Date(data.end_date) < new Date(now)) {
    throw new Error('This discount has expired');
  }

  // Check usage limit
  if (data.usage_limit && data.usage_count >= data.usage_limit) {
    throw new Error('This discount has reached its usage limit');
  }

  return data;
};

export const createDiscount = async (discount: Partial<POSDiscount>): Promise<POSDiscount> => {
  const { data, error } = await supabase
    .from('pos_discounts')
    .insert({
      ...discount,
      code: discount.code?.toUpperCase(),
      usage_count: 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateDiscount = async (id: string, updates: Partial<POSDiscount>): Promise<POSDiscount> => {
  const { data, error } = await supabase
    .from('pos_discounts')
    .update({
      ...updates,
      code: updates.code?.toUpperCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteDiscount = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('pos_discounts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

export const incrementDiscountUsage = async (discountId: string): Promise<void> => {
  const { data: discount } = await supabase
    .from('pos_discounts')
    .select('usage_count')
    .eq('id', discountId)
    .single();

  if (discount) {
    await supabase
      .from('pos_discounts')
      .update({
        usage_count: discount.usage_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', discountId);
  }
};

// Calculate discount amount
export const calculateDiscount = (
  discount: POSDiscount,
  subtotal: number,
  items?: CartItem[]
): number => {
  // Check minimum purchase
  if (discount.min_purchase && subtotal < discount.min_purchase) {
    return 0;
  }

  let discountAmount = 0;

  if (discount.type === 'percentage') {
    discountAmount = (subtotal * discount.value) / 100;
  } else {
    discountAmount = discount.value;
  }

  // Apply max discount cap
  if (discount.max_discount && discountAmount > discount.max_discount) {
    discountAmount = discount.max_discount;
  }

  // Don't exceed subtotal
  return Math.min(discountAmount, subtotal);
};

// ================== Receipt Sharing ==================

export const generateReceiptText = (
  sale: POSSale,
  businessName: string,
  businessPhone?: string,
  footerMessage?: string
): string => {
  const lines: string[] = [];
  const divider = '--------------------------------';

  // Header
  lines.push(businessName.toUpperCase());
  if (businessPhone) lines.push(`Tel: ${businessPhone}`);
  lines.push(divider);

  // Sale info
  lines.push(`Receipt: ${sale.sale_number}`);
  lines.push(`Date: ${new Date(sale.created_at!).toLocaleString()}`);
  if (sale.cashier_name) lines.push(`Cashier: ${sale.cashier_name}`);
  lines.push(divider);

  // Items
  for (const item of sale.items) {
    const itemTotal = item.quantity * item.unit_price - item.discount_amount;
    lines.push(`${item.product_name}`);
    lines.push(`  ${item.quantity} x SLE ${item.unit_price.toLocaleString()} = SLE ${itemTotal.toLocaleString()}`);
    if (item.discount_amount > 0) {
      lines.push(`  Discount: -SLE ${item.discount_amount.toLocaleString()}`);
    }
  }

  lines.push(divider);

  // Totals
  lines.push(`Subtotal: SLE ${sale.subtotal.toLocaleString()}`);
  if (sale.discount_amount > 0) {
    lines.push(`Discount: -SLE ${sale.discount_amount.toLocaleString()}`);
  }
  if (sale.tax_amount > 0) {
    lines.push(`Tax: SLE ${sale.tax_amount.toLocaleString()}`);
  }
  lines.push(`TOTAL: SLE ${sale.total_amount.toLocaleString()}`);
  lines.push(divider);

  // Payment info
  lines.push(`Paid by: ${sale.payment_method.replace('_', ' ').toUpperCase()}`);
  if (sale.payment_method === 'cash' && sale.payment_details?.received) {
    lines.push(`Received: SLE ${sale.payment_details.received.toLocaleString()}`);
    lines.push(`Change: SLE ${sale.payment_details.change.toLocaleString()}`);
  }

  // Customer info
  if (sale.customer_name) {
    lines.push(divider);
    lines.push(`Customer: ${sale.customer_name}`);
    if (sale.customer_phone) lines.push(`Phone: ${sale.customer_phone}`);
  }

  // Footer
  lines.push(divider);
  lines.push(footerMessage || 'Thank you for your purchase!');
  lines.push('');

  return lines.join('\n');
};

export const shareReceiptViaSMS = async (
  phone: string,
  receiptText: string
): Promise<boolean> => {
  // This would integrate with an SMS API
  // For now, we'll use the Web Share API or SMS link
  const smsUrl = `sms:${phone}?body=${encodeURIComponent(receiptText)}`;
  window.open(smsUrl, '_blank');
  return true;
};

export const shareReceiptViaWhatsApp = async (
  phone: string,
  receiptText: string
): Promise<boolean> => {
  // Format phone number (remove spaces, add country code if needed)
  let formattedPhone = phone.replace(/\s+/g, '').replace(/^0/, '232'); // Sierra Leone code
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = formattedPhone;
  }

  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(receiptText)}`;
  window.open(whatsappUrl, '_blank');
  return true;
};

// ================== Advanced Sales Reports ==================

export const getSalesReport = async (
  merchantId: string,
  startDate: string,
  endDate: string
): Promise<POSSalesReport> => {
  // Get all sales in the period
  const { data: sales } = await supabase
    .from('pos_sales')
    .select('*, items:pos_sale_items(*)')
    .eq('merchant_id', merchantId)
    .eq('status', 'completed')
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`);

  // Get products with cost prices
  const { data: products } = await supabase
    .from('pos_products')
    .select('id, name, cost_price, category_id')
    .eq('merchant_id', merchantId);

  const productMap = new Map(products?.map(p => [p.id, p]) || []);

  // Get categories
  const { data: categories } = await supabase
    .from('pos_categories')
    .select('id, name')
    .eq('merchant_id', merchantId);

  const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);

  if (!sales || sales.length === 0) {
    return {
      period: 'custom',
      start_date: startDate,
      end_date: endDate,
      total_sales: 0,
      total_revenue: 0,
      total_cost: 0,
      gross_profit: 0,
      profit_margin: 0,
      total_items_sold: 0,
      average_ticket: 0,
      sales_by_category: [],
      sales_by_payment: [],
      sales_by_hour: [],
      top_products: [],
      sales_trend: [],
    };
  }

  let totalRevenue = 0;
  let totalCost = 0;
  let totalItemsSold = 0;
  const categoryStats = new Map<string, { sales: number; revenue: number }>();
  const paymentStats = new Map<string, { count: number; amount: number }>();
  const hourStats = new Map<number, { count: number; amount: number }>();
  const productStats = new Map<string, { id: string; name: string; quantity: number; revenue: number; cost: number }>();
  const dailyStats = new Map<string, { sales: number; revenue: number }>();

  for (const sale of sales) {
    totalRevenue += Number(sale.total_amount);

    // Payment breakdown
    const paymentMethod = sale.payment_method;
    const existing = paymentStats.get(paymentMethod) || { count: 0, amount: 0 };
    existing.count += 1;
    existing.amount += Number(sale.total_amount);
    paymentStats.set(paymentMethod, existing);

    // Hour breakdown
    const saleHour = new Date(sale.created_at).getHours();
    const hourStat = hourStats.get(saleHour) || { count: 0, amount: 0 };
    hourStat.count += 1;
    hourStat.amount += Number(sale.total_amount);
    hourStats.set(saleHour, hourStat);

    // Daily trend
    const saleDate = sale.created_at.slice(0, 10);
    const dailyStat = dailyStats.get(saleDate) || { sales: 0, revenue: 0 };
    dailyStat.sales += 1;
    dailyStat.revenue += Number(sale.total_amount);
    dailyStats.set(saleDate, dailyStat);

    // Process items
    for (const item of sale.items) {
      totalItemsSold += item.quantity;
      const product = productMap.get(item.product_id);
      const itemCost = (product?.cost_price || 0) * item.quantity;
      totalCost += itemCost;

      // Category stats
      const categoryId = product?.category_id;
      const categoryName = categoryId ? categoryMap.get(categoryId) || 'Uncategorized' : 'Uncategorized';
      const catStat = categoryStats.get(categoryName) || { sales: 0, revenue: 0 };
      catStat.sales += item.quantity;
      catStat.revenue += Number(item.total_price);
      categoryStats.set(categoryName, catStat);

      // Product stats
      const prodStat = productStats.get(item.product_id) || {
        id: item.product_id,
        name: item.product_name,
        quantity: 0,
        revenue: 0,
        cost: 0,
      };
      prodStat.quantity += item.quantity;
      prodStat.revenue += Number(item.total_price);
      prodStat.cost += itemCost;
      productStats.set(item.product_id, prodStat);
    }
  }

  const grossProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  return {
    period: 'custom',
    start_date: startDate,
    end_date: endDate,
    total_sales: sales.length,
    total_revenue: totalRevenue,
    total_cost: totalCost,
    gross_profit: grossProfit,
    profit_margin: Math.round(profitMargin * 100) / 100,
    total_items_sold: totalItemsSold,
    average_ticket: sales.length > 0 ? totalRevenue / sales.length : 0,
    sales_by_category: Array.from(categoryStats.entries())
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.revenue - a.revenue),
    sales_by_payment: Array.from(paymentStats.entries())
      .map(([method, stats]) => ({ method, ...stats })),
    sales_by_hour: Array.from(hourStats.entries())
      .map(([hour, stats]) => ({ hour, ...stats }))
      .sort((a, b) => a.hour - b.hour),
    top_products: Array.from(productStats.values())
      .map(p => ({ ...p, profit: p.revenue - p.cost }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    sales_trend: Array.from(dailyStats.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
};

// End of Day Report
export const getEndOfDayReport = async (
  merchantId: string,
  date?: string
): Promise<{
  date: string;
  cashSession: POSCashSession | null;
  salesSummary: {
    totalSales: number;
    totalRevenue: number;
    totalRefunds: number;
    netRevenue: number;
  };
  paymentBreakdown: { method: string; count: number; amount: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  lowStockAlerts: POSProduct[];
  staffPerformance: { name: string; sales: number; revenue: number }[];
}> => {
  const targetDate = date || new Date().toISOString().slice(0, 10);

  // Get cash session
  const cashSession = await getCashSessionByDate(merchantId, targetDate);

  // Get sales
  const { data: sales } = await supabase
    .from('pos_sales')
    .select('*, items:pos_sale_items(*)')
    .eq('merchant_id', merchantId)
    .eq('status', 'completed')
    .gte('created_at', `${targetDate}T00:00:00`)
    .lte('created_at', `${targetDate}T23:59:59`);

  // Get refunds
  const { data: refunds } = await supabase
    .from('pos_refunds')
    .select('refund_amount')
    .eq('merchant_id', merchantId)
    .gte('created_at', `${targetDate}T00:00:00`)
    .lte('created_at', `${targetDate}T23:59:59`);

  const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const totalRefunds = refunds?.reduce((sum, r) => sum + Number(r.refund_amount), 0) || 0;

  // Payment breakdown
  const paymentMap = new Map<string, { count: number; amount: number }>();
  for (const sale of sales || []) {
    const existing = paymentMap.get(sale.payment_method) || { count: 0, amount: 0 };
    existing.count += 1;
    existing.amount += Number(sale.total_amount);
    paymentMap.set(sale.payment_method, existing);
  }

  // Top products
  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const sale of sales || []) {
    for (const item of sale.items) {
      const existing = productMap.get(item.product_name) || { name: item.product_name, quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += Number(item.total_price);
      productMap.set(item.product_name, existing);
    }
  }

  // Staff performance
  const staffMap = new Map<string, { name: string; sales: number; revenue: number }>();
  for (const sale of sales || []) {
    const staffName = sale.cashier_name || 'Unknown';
    const existing = staffMap.get(staffName) || { name: staffName, sales: 0, revenue: 0 };
    existing.sales += 1;
    existing.revenue += Number(sale.total_amount);
    staffMap.set(staffName, existing);
  }

  // Low stock alerts
  const lowStockProducts = await getLowStockProducts(merchantId);

  return {
    date: targetDate,
    cashSession,
    salesSummary: {
      totalSales: sales?.length || 0,
      totalRevenue,
      totalRefunds,
      netRevenue: totalRevenue - totalRefunds,
    },
    paymentBreakdown: Array.from(paymentMap.entries())
      .map(([method, stats]) => ({ method, ...stats })),
    topProducts: Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    lowStockAlerts: lowStockProducts,
    staffPerformance: Array.from(staffMap.values())
      .sort((a, b) => b.revenue - a.revenue),
  };
};

// ================== Inventory Alerts ==================

export const getInventoryAlerts = async (merchantId: string): Promise<POSInventoryAlert[]> => {
  const lowStockProducts = await getLowStockProducts(merchantId);

  return lowStockProducts.map(product => ({
    merchant_id: merchantId,
    product_id: product.id,
    product_name: product.name,
    current_stock: product.stock_quantity,
    threshold: product.low_stock_threshold,
    alert_type: product.stock_quantity === 0 ? 'out_of_stock' : 'low_stock',
    is_acknowledged: false,
    created_at: new Date().toISOString(),
  }));
};

// ================== Split Payment ==================

export const createSaleWithSplitPayment = async (
  sale: Omit<POSSale, 'id' | 'sale_number' | 'created_at'>,
  items: POSSaleItem[],
  payments: POSSplitPayment[]
): Promise<POSSale> => {
  // Validate total payments match sale amount
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  if (Math.abs(totalPayments - sale.total_amount) > 0.01) {
    throw new Error(`Payment total (${totalPayments}) doesn't match sale total (${sale.total_amount})`);
  }

  // Create the sale with split payment method
  const saleWithPayments = {
    ...sale,
    payment_method: 'split' as const,
    payments: payments,
    payment_details: {
      payments: payments.map(p => ({
        method: p.method,
        amount: p.amount,
        reference: p.reference,
      })),
    },
  };

  const createdSale = await createSale(saleWithPayments, items);

  // Handle credit payments (add to customer tab)
  for (const payment of payments) {
    if (payment.method === 'credit' && payment.customer_id) {
      await addCustomerCredit(
        sale.merchant_id,
        payment.customer_id,
        payment.amount,
        createdSale.id,
        `Split payment for sale ${createdSale.sale_number}`,
        sale.cashier_id
      );
    }
  }

  return createdSale;
};

// ================== Barcode Generation ==================

export const generateBarcode = (productId: string, sku?: string): string => {
  // Generate EAN-13 compatible barcode
  // Format: 200 (in-store prefix) + 9 digits from product ID + check digit
  const prefix = '200';
  const productDigits = productId.replace(/[^0-9]/g, '').slice(0, 9).padStart(9, '0');
  const baseCode = prefix + productDigits;

  // Calculate check digit (EAN-13)
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(baseCode[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  return baseCode + checkDigit;
};

export const assignBarcodeToProduct = async (
  productId: string,
  barcode?: string
): Promise<POSProduct> => {
  const barcodeToAssign = barcode || generateBarcode(productId);

  const { data, error } = await supabase
    .from('pos_products')
    .update({
      barcode: barcodeToAssign,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ================== Staff Management ==================

export const getStaff = async (merchantId: string): Promise<POSStaff[]> => {
  const { data, error } = await supabase
    .from('pos_staff')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const createStaff = async (staff: Partial<POSStaff>): Promise<POSStaff> => {
  const { data, error } = await supabase
    .from('pos_staff')
    .insert({
      ...staff,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateStaff = async (id: string, updates: Partial<POSStaff>): Promise<POSStaff> => {
  const { data, error } = await supabase
    .from('pos_staff')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteStaff = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('pos_staff')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

export const verifyStaffPin = async (
  merchantId: string,
  pin: string
): Promise<POSStaff | null> => {
  const { data, error } = await supabase
    .from('pos_staff')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('pin', pin)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// Get pending staff invitations for a user
export const getPendingInvitations = async (userId: string): Promise<POSStaff[]> => {
  const { data, error } = await supabase
    .from('pos_staff')
    .select('*')
    .eq('user_id', userId)
    .eq('invitation_status', 'pending')
    .eq('is_active', true);

  if (error) throw error;
  return data || [];
};

// Accept staff invitation with PIN setup
export const acceptStaffInvitation = async (staffId: string, userId: string, pin?: string): Promise<POSStaff> => {
  // Verify the invitation belongs to this user
  const { data: staff, error: fetchError } = await supabase
    .from('pos_staff')
    .select('*')
    .eq('id', staffId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !staff) {
    throw new Error('Invitation not found');
  }

  if (staff.invitation_status !== 'pending') {
    throw new Error('Invitation has already been processed');
  }

  const updateData: Record<string, any> = {
    invitation_status: 'accepted',
    accepted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Add PIN if provided
  if (pin) {
    updateData.pin = pin;
  }

  const { data, error } = await supabase
    .from('pos_staff')
    .update(updateData)
    .eq('id', staffId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Decline staff invitation
export const declineStaffInvitation = async (staffId: string, userId: string): Promise<void> => {
  // Verify the invitation belongs to this user
  const { data: staff, error: fetchError } = await supabase
    .from('pos_staff')
    .select('*')
    .eq('id', staffId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !staff) {
    throw new Error('Invitation not found');
  }

  if (staff.invitation_status !== 'pending') {
    throw new Error('Invitation has already been processed');
  }

  const { error } = await supabase
    .from('pos_staff')
    .update({
      invitation_status: 'declined',
      declined_at: new Date().toISOString(),
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', staffId);

  if (error) throw error;
};

// Default permissions by role
export const DEFAULT_PERMISSIONS = {
  admin: [
    'view_sales', 'create_sales', 'void_sales', 'refund_sales',
    'view_products', 'manage_products',
    'view_inventory', 'manage_inventory',
    'view_customers', 'manage_customers',
    'view_reports', 'view_staff', 'manage_staff',
    'manage_discounts', 'manage_settings',
    'open_close_day', 'cash_management',
  ],
  manager: [
    'view_sales', 'create_sales', 'void_sales', 'refund_sales',
    'view_products', 'manage_products',
    'view_inventory', 'manage_inventory',
    'view_customers', 'manage_customers',
    'view_reports', 'view_staff',
    'manage_discounts',
    'open_close_day', 'cash_management',
  ],
  cashier: [
    'view_sales', 'create_sales',
    'view_products',
    'view_inventory',
    'view_customers',
  ],
};

// ================== Product Variants ==================

export const getProductVariants = async (productId: string): Promise<POSProductVariant[]> => {
  const { data, error } = await supabase
    .from('pos_product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const createProductVariant = async (variant: Partial<POSProductVariant>): Promise<POSProductVariant> => {
  const { data, error } = await supabase
    .from('pos_product_variants')
    .insert({
      ...variant,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProductVariant = async (id: string, updates: Partial<POSProductVariant>): Promise<POSProductVariant> => {
  const { data, error } = await supabase
    .from('pos_product_variants')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteProductVariant = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('pos_product_variants')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
};

// ================== Customer Loyalty ==================

export const getLoyaltyProgram = async (merchantId: string): Promise<POSLoyaltyProgram | null> => {
  const { data, error } = await supabase
    .from('pos_loyalty_programs')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const createLoyaltyProgram = async (program: Partial<POSLoyaltyProgram>): Promise<POSLoyaltyProgram> => {
  const { data, error } = await supabase
    .from('pos_loyalty_programs')
    .insert({
      ...program,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateLoyaltyProgram = async (id: string, updates: Partial<POSLoyaltyProgram>): Promise<POSLoyaltyProgram> => {
  const { data, error } = await supabase
    .from('pos_loyalty_programs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getCustomerLoyaltyPoints = async (
  merchantId: string,
  customerId: string
): Promise<POSLoyaltyPoints | null> => {
  const { data, error } = await supabase
    .from('pos_loyalty_points')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('customer_id', customerId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const addLoyaltyPoints = async (
  merchantId: string,
  customerId: string,
  purchaseAmount: number,
  saleId?: string
): Promise<POSLoyaltyPoints> => {
  // Get loyalty program
  const program = await getLoyaltyProgram(merchantId);
  if (!program) throw new Error('No loyalty program configured');

  // Calculate points (e.g., 1 point per 1000 SLE)
  const pointsEarned = Math.floor(purchaseAmount / program.points_per_currency);
  if (pointsEarned === 0) {
    throw new Error('Purchase amount too low to earn points');
  }

  // Get or create customer points record
  let points = await getCustomerLoyaltyPoints(merchantId, customerId);

  if (points) {
    // Update existing
    const { data, error } = await supabase
      .from('pos_loyalty_points')
      .update({
        points_balance: points.points_balance + pointsEarned,
        total_earned: points.total_earned + pointsEarned,
        updated_at: new Date().toISOString(),
      })
      .eq('id', points.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('pos_loyalty_points')
      .insert({
        merchant_id: merchantId,
        customer_id: customerId,
        points_balance: pointsEarned,
        total_earned: pointsEarned,
        total_redeemed: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export const redeemLoyaltyPoints = async (
  merchantId: string,
  customerId: string,
  pointsToRedeem: number
): Promise<{ points: POSLoyaltyPoints; discountAmount: number }> => {
  // Get loyalty program
  const program = await getLoyaltyProgram(merchantId);
  if (!program) throw new Error('No loyalty program configured');

  // Get customer points
  const points = await getCustomerLoyaltyPoints(merchantId, customerId);
  if (!points) throw new Error('Customer has no loyalty points');

  // Validate
  if (pointsToRedeem > points.points_balance) {
    throw new Error(`Insufficient points. Available: ${points.points_balance}`);
  }
  if (pointsToRedeem < program.min_redeem_points) {
    throw new Error(`Minimum ${program.min_redeem_points} points required to redeem`);
  }

  // Calculate discount (e.g., 100 points = 1000 SLE)
  const discountAmount = (pointsToRedeem / 100) * program.points_value;

  // Update points
  const { data, error } = await supabase
    .from('pos_loyalty_points')
    .update({
      points_balance: points.points_balance - pointsToRedeem,
      total_redeemed: points.total_redeemed + pointsToRedeem,
      updated_at: new Date().toISOString(),
    })
    .eq('id', points.id)
    .select()
    .single();

  if (error) throw error;

  return { points: data, discountAmount };
};

// Log inventory change
export const logInventoryChange = async (
  productId: string,
  merchantId: string,
  quantityChange: number,
  changeType: 'sale' | 'restock' | 'adjustment' | 'return',
  notes?: string
): Promise<void> => {
  const { error } = await supabase
    .from('pos_inventory_log')
    .insert({
      product_id: productId,
      merchant_id: merchantId,
      quantity_change: quantityChange,
      change_type: changeType,
      notes: notes || null,
    });

  if (error) {
    console.error('Error logging inventory change:', error);
    // Don't throw - this is a non-critical operation
  }
};

export const posService = {
  // Categories
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  // Products
  getProducts,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  // Sales
  createSale,
  getSales,
  getSaleById,
  voidSale,
  // Reports
  getDailySummary,
  getSalesReport,
  getEndOfDayReport,
  // Inventory
  updateStock,
  getLowStockProducts,
  getInventoryAlerts,
  // Cash Sessions
  getTodayCashSession,
  getCashSessionByDate,
  getCashSessionHistory,
  openCashSession,
  closeCashSession,
  addCashTransaction,
  updateOpeningBalance,
  // Customers
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  addCustomerCredit,
  recordCustomerPayment,
  getCustomerTransactions,
  // Held Orders
  holdOrder,
  getHeldOrders,
  resumeHeldOrder,
  deleteHeldOrder,
  // Refunds
  processRefund,
  getRefunds,
  // Discounts
  getDiscounts,
  getDiscountByCode,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  incrementDiscountUsage,
  calculateDiscount,
  // Receipt
  generateReceiptText,
  shareReceiptViaSMS,
  shareReceiptViaWhatsApp,
  // Split Payment
  createSaleWithSplitPayment,
  // Barcode
  generateBarcode,
  assignBarcodeToProduct,
  // Staff Management
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  verifyStaffPin,
  getPendingInvitations,
  acceptStaffInvitation,
  declineStaffInvitation,
  DEFAULT_PERMISSIONS,
  // Product Variants
  getProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  // Loyalty Program
  getLoyaltyProgram,
  createLoyaltyProgram,
  updateLoyaltyProgram,
  getCustomerLoyaltyPoints,
  addLoyaltyPoints,
  redeemLoyaltyPoints,
  // Inventory
  logInventoryChange,
};

export default posService;

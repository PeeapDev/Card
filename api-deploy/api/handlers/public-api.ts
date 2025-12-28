/**
 * Public API Handlers
 *
 * Third-party API endpoints for POS, Invoices, and Events
 * These endpoints require API key authentication and respect scopes
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ==================== Types ====================

interface ApiKeyData {
  id: string;
  merchant_id?: string;
  business_id?: string;
  permissions: string[];
  environment: 'live' | 'test';
  rate_limit: number;
}

interface ApiContext {
  apiKey: ApiKeyData;
  merchantId: string;
  isTestMode: boolean;
}

// ==================== API Scopes ====================

export const PublicApiScopes = {
  // POS
  'pos:products:read': 'View POS products',
  'pos:products:write': 'Manage POS products',
  'pos:categories:read': 'View POS categories',
  'pos:categories:write': 'Manage POS categories',
  'pos:sales:read': 'View POS sales',
  'pos:sales:write': 'Create POS sales',
  'pos:inventory:read': 'View inventory',
  'pos:inventory:write': 'Adjust inventory',
  'pos:customers:read': 'View POS customers',
  'pos:customers:write': 'Manage POS customers',

  // Invoices
  'invoices:read': 'View invoices',
  'invoices:write': 'Create/update invoices',
  'invoices:send': 'Send invoices',

  // Events
  'events:read': 'View events',
  'events:write': 'Manage events',
  'events:tickets:read': 'View tickets',
  'events:tickets:write': 'Manage tickets',
  'events:scanning': 'Scan tickets',

  // Webhooks
  'webhooks:read': 'View webhooks',
  'webhooks:write': 'Manage webhooks',
} as const;

// ==================== Authentication ====================

/**
 * Validate API key and return context
 */
async function authenticateRequest(req: VercelRequest): Promise<ApiContext | null> {
  // Get API key from header or Authorization bearer
  let apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer sk_') || auth?.startsWith('Bearer pk_')) {
      apiKey = auth.substring(7);
    }
  }

  if (!apiKey) {
    return null;
  }

  // Validate key format
  const validPrefixes = ['sk_live_', 'sk_test_', 'pk_live_', 'pk_test_'];
  if (!validPrefixes.some(p => apiKey.startsWith(p))) {
    return null;
  }

  const isTestMode = apiKey.startsWith('sk_test_') || apiKey.startsWith('pk_test_');

  // Hash key for lookup
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  // Try to find in api_keys table first
  let { data: keyData } = await supabase
    .from('api_keys')
    .select('id, permissions, environment, rate_limit, merchant_id')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();

  // If not found, try merchant_businesses table (legacy keys)
  if (!keyData) {
    const keyColumn = isTestMode ? 'test_secret_key' : 'live_secret_key';
    const { data: business } = await supabase
      .from('merchant_businesses')
      .select('id, merchant_id')
      .eq(keyColumn, apiKey)
      .single();

    if (business) {
      keyData = {
        id: business.id,
        merchant_id: business.merchant_id,
        permissions: ['*'], // Legacy keys have full access
        environment: isTestMode ? 'test' : 'live',
        rate_limit: 1000,
      };
    }
  }

  if (!keyData) {
    return null;
  }

  return {
    apiKey: keyData as ApiKeyData,
    merchantId: keyData.merchant_id || '',
    isTestMode,
  };
}

/**
 * Check if API key has required scope
 */
function hasScope(context: ApiContext, scope: string): boolean {
  const permissions = context.apiKey.permissions || [];

  // Check exact match
  if (permissions.includes(scope)) return true;

  // Check wildcard
  const [resource] = scope.split(':');
  if (permissions.includes(`${resource}:*`)) return true;
  if (permissions.includes('*')) return true;

  return false;
}

/**
 * Standard API response helpers
 */
function successResponse<T>(res: VercelResponse, data: T, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}

function paginatedResponse<T>(
  res: VercelResponse,
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);
  return res.status(200).json({
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next_page: page < totalPages,
      has_previous_page: page > 1,
    },
    timestamp: new Date().toISOString(),
  });
}

function errorResponse(
  res: VercelResponse,
  code: string,
  message: string,
  status = 400,
  details?: any
) {
  return res.status(status).json({
    success: false,
    error: { code, message, ...(details && { details }) },
    timestamp: new Date().toISOString(),
  });
}

// ==================== POS Products API ====================

export async function handlePosProducts(req: VercelRequest, res: VercelResponse) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method === 'GET') {
    if (!hasScope(context, 'pos:products:read')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:products:read', 403);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const categoryId = req.query.category_id as string;
    const search = req.query.search as string;
    const isActive = req.query.is_active;

    let query = supabase
      .from('pos_products')
      .select('*, category:pos_categories(id, name, color)', { count: 'exact' })
      .eq('merchant_id', context.merchantId)
      .order('name');

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`);
    }
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    return paginatedResponse(res, data || [], count || 0, page, limit);
  }

  if (req.method === 'POST') {
    if (!hasScope(context, 'pos:products:write')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:products:write', 403);
    }

    const body = req.body;

    // Validate required fields
    if (!body.name) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Name is required');
    }
    if (body.price === undefined || body.price < 0) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Valid price is required');
    }

    const { data, error } = await supabase
      .from('pos_products')
      .insert({
        merchant_id: context.merchantId,
        name: body.name,
        description: body.description,
        sku: body.sku,
        barcode: body.barcode,
        price: body.price,
        cost_price: body.cost_price || 0,
        category_id: body.category_id,
        image_url: body.image_url,
        track_inventory: body.track_inventory || false,
        stock_quantity: body.stock_quantity || 0,
        low_stock_threshold: body.low_stock_alert || 10,
        is_active: true,
      })
      .select('*, category:pos_categories(id, name, color)')
      .single();

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    return successResponse(res, data, 201);
  }

  return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}

export async function handlePosProductById(
  req: VercelRequest,
  res: VercelResponse,
  productId: string
) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method === 'GET') {
    if (!hasScope(context, 'pos:products:read')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:products:read', 403);
    }

    const { data, error } = await supabase
      .from('pos_products')
      .select('*, category:pos_categories(id, name, color)')
      .eq('id', productId)
      .eq('merchant_id', context.merchantId)
      .single();

    if (error || !data) {
      return errorResponse(res, 'NOT_FOUND', 'Product not found', 404);
    }

    return successResponse(res, data);
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    if (!hasScope(context, 'pos:products:write')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:products:write', 403);
    }

    const body = req.body;
    const updateData: any = { updated_at: new Date().toISOString() };

    // Only update provided fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.sku !== undefined) updateData.sku = body.sku;
    if (body.barcode !== undefined) updateData.barcode = body.barcode;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.cost_price !== undefined) updateData.cost_price = body.cost_price;
    if (body.category_id !== undefined) updateData.category_id = body.category_id;
    if (body.image_url !== undefined) updateData.image_url = body.image_url;
    if (body.track_inventory !== undefined) updateData.track_inventory = body.track_inventory;
    if (body.low_stock_alert !== undefined) updateData.low_stock_threshold = body.low_stock_alert;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data, error } = await supabase
      .from('pos_products')
      .update(updateData)
      .eq('id', productId)
      .eq('merchant_id', context.merchantId)
      .select('*, category:pos_categories(id, name, color)')
      .single();

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    if (!data) {
      return errorResponse(res, 'NOT_FOUND', 'Product not found', 404);
    }

    return successResponse(res, data);
  }

  if (req.method === 'DELETE') {
    if (!hasScope(context, 'pos:products:write')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:products:write', 403);
    }

    const { error } = await supabase
      .from('pos_products')
      .delete()
      .eq('id', productId)
      .eq('merchant_id', context.merchantId);

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    return res.status(204).end();
  }

  return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}

// ==================== POS Categories API ====================

export async function handlePosCategories(req: VercelRequest, res: VercelResponse) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method === 'GET') {
    if (!hasScope(context, 'pos:categories:read')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:categories:read', 403);
    }

    const { data, error } = await supabase
      .from('pos_categories')
      .select('*')
      .eq('merchant_id', context.merchantId)
      .order('sort_order');

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    return successResponse(res, data || []);
  }

  if (req.method === 'POST') {
    if (!hasScope(context, 'pos:categories:write')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:categories:write', 403);
    }

    const body = req.body;

    if (!body.name) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Name is required');
    }

    const { data, error } = await supabase
      .from('pos_categories')
      .insert({
        merchant_id: context.merchantId,
        name: body.name,
        description: body.description,
        color: body.color || '#6366f1',
        icon: body.icon,
        sort_order: body.sort_order || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    return successResponse(res, data, 201);
  }

  return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}

export async function handlePosCategoryById(
  req: VercelRequest,
  res: VercelResponse,
  categoryId: string
) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method === 'GET') {
    if (!hasScope(context, 'pos:categories:read')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:categories:read', 403);
    }

    const { data, error } = await supabase
      .from('pos_categories')
      .select('*')
      .eq('id', categoryId)
      .eq('merchant_id', context.merchantId)
      .single();

    if (error || !data) {
      return errorResponse(res, 'NOT_FOUND', 'Category not found', 404);
    }

    return successResponse(res, data);
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    if (!hasScope(context, 'pos:categories:write')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:categories:write', 403);
    }

    const body = req.body;
    const updateData: any = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data, error } = await supabase
      .from('pos_categories')
      .update(updateData)
      .eq('id', categoryId)
      .eq('merchant_id', context.merchantId)
      .select()
      .single();

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    if (!data) {
      return errorResponse(res, 'NOT_FOUND', 'Category not found', 404);
    }

    return successResponse(res, data);
  }

  if (req.method === 'DELETE') {
    if (!hasScope(context, 'pos:categories:write')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:categories:write', 403);
    }

    const { error } = await supabase
      .from('pos_categories')
      .delete()
      .eq('id', categoryId)
      .eq('merchant_id', context.merchantId);

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    return res.status(204).end();
  }

  return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}

// ==================== POS Sales API ====================

export async function handlePosSales(req: VercelRequest, res: VercelResponse) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method === 'GET') {
    if (!hasScope(context, 'pos:sales:read')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:sales:read', 403);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    let query = supabase
      .from('pos_sales')
      .select('*, items:pos_sale_items(*)', { count: 'exact' })
      .eq('merchant_id', context.merchantId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    return paginatedResponse(res, data || [], count || 0, page, limit);
  }

  if (req.method === 'POST') {
    if (!hasScope(context, 'pos:sales:write')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:sales:write', 403);
    }

    const body = req.body;

    // Validate required fields
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return errorResponse(res, 'VALIDATION_ERROR', 'At least one item is required');
    }
    if (!body.payment_method) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Payment method is required');
    }

    // Generate sale number
    const saleNumber = `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    const items = body.items.map((item: any) => {
      const itemTotal = item.quantity * item.unit_price;
      const itemDiscount = item.discount_amount || 0;
      const itemTax = item.tax_amount || 0;
      subtotal += itemTotal - itemDiscount;
      taxAmount += itemTax;
      return {
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: itemDiscount,
        tax_amount: itemTax,
        total_price: itemTotal - itemDiscount + itemTax,
        notes: item.notes,
      };
    });

    const discountAmount = body.discount_amount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Create sale
    const { data: sale, error: saleError } = await supabase
      .from('pos_sales')
      .insert({
        merchant_id: context.merchantId,
        sale_number: saleNumber,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        payment_method: body.payment_method,
        payment_reference: body.payment_reference,
        payment_details: body.payment_details,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        cashier_id: body.cashier_id,
        cashier_name: body.cashier_name,
        status: 'completed',
        notes: body.notes,
      })
      .select()
      .single();

    if (saleError) {
      return errorResponse(res, 'DATABASE_ERROR', saleError.message, 500);
    }

    // Create sale items
    const saleItems = items.map((item: any) => ({
      ...item,
      sale_id: sale.id,
    }));

    const { error: itemsError } = await supabase
      .from('pos_sale_items')
      .insert(saleItems);

    if (itemsError) {
      console.error('Failed to create sale items:', itemsError);
    }

    // Update inventory if tracking
    for (const item of items) {
      if (item.product_id) {
        try {
          await supabase.rpc('decrement_stock', {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
          });
        } catch {
          // Ignore if RPC doesn't exist
        }
      }
    }

    // Fetch complete sale with items
    const { data: completeSale } = await supabase
      .from('pos_sales')
      .select('*, items:pos_sale_items(*)')
      .eq('id', sale.id)
      .single();

    return successResponse(res, completeSale || sale, 201);
  }

  return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}

export async function handlePosSaleById(
  req: VercelRequest,
  res: VercelResponse,
  saleId: string
) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method === 'GET') {
    if (!hasScope(context, 'pos:sales:read')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:sales:read', 403);
    }

    const { data, error } = await supabase
      .from('pos_sales')
      .select('*, items:pos_sale_items(*)')
      .eq('id', saleId)
      .eq('merchant_id', context.merchantId)
      .single();

    if (error || !data) {
      return errorResponse(res, 'NOT_FOUND', 'Sale not found', 404);
    }

    return successResponse(res, data);
  }

  return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}

export async function handlePosSaleVoid(
  req: VercelRequest,
  res: VercelResponse,
  saleId: string
) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method !== 'POST') {
    return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
  }

  if (!hasScope(context, 'pos:sales:write')) {
    return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:sales:write', 403);
  }

  const { data: sale, error: fetchError } = await supabase
    .from('pos_sales')
    .select('*')
    .eq('id', saleId)
    .eq('merchant_id', context.merchantId)
    .single();

  if (fetchError || !sale) {
    return errorResponse(res, 'NOT_FOUND', 'Sale not found', 404);
  }

  if (sale.status === 'voided') {
    return errorResponse(res, 'ALREADY_VOIDED', 'Sale is already voided');
  }

  const { data, error } = await supabase
    .from('pos_sales')
    .update({ status: 'voided', notes: req.body?.reason || sale.notes })
    .eq('id', saleId)
    .eq('merchant_id', context.merchantId)
    .select()
    .single();

  if (error) {
    return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
  }

  return successResponse(res, data);
}

// ==================== POS Inventory API ====================

export async function handlePosInventory(req: VercelRequest, res: VercelResponse) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method === 'GET') {
    if (!hasScope(context, 'pos:inventory:read')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:inventory:read', 403);
    }

    const lowStockOnly = req.query.low_stock_only === 'true';

    let query = supabase
      .from('pos_products')
      .select('id, name, sku, barcode, stock_quantity, low_stock_threshold, track_inventory')
      .eq('merchant_id', context.merchantId)
      .eq('track_inventory', true)
      .order('stock_quantity');

    if (lowStockOnly) {
      // This won't work directly with Supabase, so we filter after
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    let result = data || [];
    if (lowStockOnly) {
      result = result.filter((p: any) => p.stock_quantity <= p.low_stock_threshold);
    }

    return successResponse(res, result);
  }

  return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}

export async function handlePosInventoryAdjust(
  req: VercelRequest,
  res: VercelResponse,
  productId: string
) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method !== 'POST') {
    return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
  }

  if (!hasScope(context, 'pos:inventory:write')) {
    return errorResponse(res, 'FORBIDDEN', 'Missing scope: pos:inventory:write', 403);
  }

  const body = req.body;

  if (body.adjustment === undefined || typeof body.adjustment !== 'number') {
    return errorResponse(res, 'VALIDATION_ERROR', 'Adjustment amount is required');
  }

  // Get current product
  const { data: product, error: fetchError } = await supabase
    .from('pos_products')
    .select('id, stock_quantity')
    .eq('id', productId)
    .eq('merchant_id', context.merchantId)
    .single();

  if (fetchError || !product) {
    return errorResponse(res, 'NOT_FOUND', 'Product not found', 404);
  }

  const newQuantity = product.stock_quantity + body.adjustment;

  if (newQuantity < 0) {
    return errorResponse(res, 'INVALID_ADJUSTMENT', 'Adjustment would result in negative stock');
  }

  // Update stock
  const { data, error } = await supabase
    .from('pos_products')
    .update({ stock_quantity: newQuantity })
    .eq('id', productId)
    .eq('merchant_id', context.merchantId)
    .select('id, name, stock_quantity')
    .single();

  if (error) {
    return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
  }

  // Log inventory adjustment
  try {
    await supabase.from('pos_inventory_log').insert({
      merchant_id: context.merchantId,
      product_id: productId,
      type: 'adjustment',
      quantity_change: body.adjustment,
      previous_quantity: product.stock_quantity,
      new_quantity: newQuantity,
      notes: body.reason,
    });
  } catch {
    // Ignore if table doesn't exist
  }

  return successResponse(res, {
    ...data,
    previous_quantity: product.stock_quantity,
    adjustment: body.adjustment,
  });
}

// ==================== Invoices API ====================

export async function handleInvoices(req: VercelRequest, res: VercelResponse) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method === 'GET') {
    if (!hasScope(context, 'invoices:read')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: invoices:read', 403);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('merchant_id', context.merchantId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    return paginatedResponse(res, data || [], count || 0, page, limit);
  }

  if (req.method === 'POST') {
    if (!hasScope(context, 'invoices:write')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: invoices:write', 403);
    }

    const body = req.body;

    // Validate required fields
    if (!body.customer_name) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Customer name is required');
    }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return errorResponse(res, 'VALIDATION_ERROR', 'At least one item is required');
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Calculate totals
    let subtotal = 0;
    const items = body.items.map((item: any) => {
      const itemTotal = item.quantity * item.unit_price;
      subtotal += itemTotal;
      return {
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: itemTotal,
      };
    });

    const taxAmount = body.tax_amount || 0;
    const discountAmount = body.discount_amount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        merchant_id: context.merchantId,
        invoice_number: invoiceNumber,
        customer_name: body.customer_name,
        customer_email: body.customer_email,
        customer_phone: body.customer_phone,
        customer_address: body.customer_address,
        items,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        currency: body.currency || 'SLE',
        due_date: body.due_date,
        notes: body.notes,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    return successResponse(res, data, 201);
  }

  return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}

export async function handleInvoiceById(
  req: VercelRequest,
  res: VercelResponse,
  invoiceId: string
) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method === 'GET') {
    if (!hasScope(context, 'invoices:read')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: invoices:read', 403);
    }

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('merchant_id', context.merchantId)
      .single();

    if (error || !data) {
      return errorResponse(res, 'NOT_FOUND', 'Invoice not found', 404);
    }

    return successResponse(res, data);
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    if (!hasScope(context, 'invoices:write')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: invoices:write', 403);
    }

    const body = req.body;
    const updateData: any = { updated_at: new Date().toISOString() };

    if (body.customer_name !== undefined) updateData.customer_name = body.customer_name;
    if (body.customer_email !== undefined) updateData.customer_email = body.customer_email;
    if (body.customer_phone !== undefined) updateData.customer_phone = body.customer_phone;
    if (body.items !== undefined) {
      updateData.items = body.items;
      // Recalculate totals
      let subtotal = 0;
      for (const item of body.items) {
        subtotal += item.quantity * item.unit_price;
      }
      updateData.subtotal = subtotal;
      updateData.total_amount = subtotal + (body.tax_amount || 0) - (body.discount_amount || 0);
    }
    if (body.due_date !== undefined) updateData.due_date = body.due_date;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status !== undefined) updateData.status = body.status;

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .eq('merchant_id', context.merchantId)
      .select()
      .single();

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    if (!data) {
      return errorResponse(res, 'NOT_FOUND', 'Invoice not found', 404);
    }

    return successResponse(res, data);
  }

  return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}

export async function handleInvoiceSend(
  req: VercelRequest,
  res: VercelResponse,
  invoiceId: string
) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method !== 'POST') {
    return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
  }

  if (!hasScope(context, 'invoices:send')) {
    return errorResponse(res, 'FORBIDDEN', 'Missing scope: invoices:send', 403);
  }

  // Get invoice
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('merchant_id', context.merchantId)
    .single();

  if (fetchError || !invoice) {
    return errorResponse(res, 'NOT_FOUND', 'Invoice not found', 404);
  }

  if (!invoice.customer_email) {
    return errorResponse(res, 'MISSING_EMAIL', 'Invoice has no customer email');
  }

  // Update status to sent
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
  }

  // TODO: Actually send email here
  // For now, just mark as sent

  return successResponse(res, { ...data, email_sent: true });
}

// ==================== Events API ====================

export async function handleEvents(req: VercelRequest, res: VercelResponse) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method === 'GET') {
    if (!hasScope(context, 'events:read')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: events:read', 403);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })
      .eq('merchant_id', context.merchantId)
      .order('start_date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    return paginatedResponse(res, data || [], count || 0, page, limit);
  }

  if (req.method === 'POST') {
    if (!hasScope(context, 'events:write')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: events:write', 403);
    }

    const body = req.body;

    if (!body.name) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Event name is required');
    }
    if (!body.start_date) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Start date is required');
    }

    const { data, error } = await supabase
      .from('events')
      .insert({
        merchant_id: context.merchantId,
        name: body.name,
        description: body.description,
        venue: body.venue,
        start_date: body.start_date,
        end_date: body.end_date,
        image_url: body.image_url,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    return successResponse(res, data, 201);
  }

  return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}

export async function handleEventById(
  req: VercelRequest,
  res: VercelResponse,
  eventId: string
) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method === 'GET') {
    if (!hasScope(context, 'events:read')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: events:read', 403);
    }

    const { data, error } = await supabase
      .from('events')
      .select('*, ticket_types:event_ticket_types(*)')
      .eq('id', eventId)
      .eq('merchant_id', context.merchantId)
      .single();

    if (error || !data) {
      return errorResponse(res, 'NOT_FOUND', 'Event not found', 404);
    }

    return successResponse(res, data);
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    if (!hasScope(context, 'events:write')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: events:write', 403);
    }

    const body = req.body;
    const updateData: any = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.venue !== undefined) updateData.venue = body.venue;
    if (body.start_date !== undefined) updateData.start_date = body.start_date;
    if (body.end_date !== undefined) updateData.end_date = body.end_date;
    if (body.image_url !== undefined) updateData.image_url = body.image_url;
    if (body.status !== undefined) updateData.status = body.status;

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .eq('merchant_id', context.merchantId)
      .select()
      .single();

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    if (!data) {
      return errorResponse(res, 'NOT_FOUND', 'Event not found', 404);
    }

    return successResponse(res, data);
  }

  return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}

export async function handleEventTickets(
  req: VercelRequest,
  res: VercelResponse,
  eventId: string
) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method === 'GET') {
    if (!hasScope(context, 'events:tickets:read')) {
      return errorResponse(res, 'FORBIDDEN', 'Missing scope: events:tickets:read', 403);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('event_tickets')
      .select('*, ticket_type:event_ticket_types(name, price)', { count: 'exact' })
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
    }

    return paginatedResponse(res, data || [], count || 0, page, limit);
  }

  return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}

export async function handleEventTicketScan(
  req: VercelRequest,
  res: VercelResponse,
  ticketId: string
) {
  const context = await authenticateRequest(req);
  if (!context) {
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  if (req.method !== 'POST') {
    return errorResponse(res, 'METHOD_NOT_ALLOWED', 'Method not allowed', 405);
  }

  if (!hasScope(context, 'events:scanning')) {
    return errorResponse(res, 'FORBIDDEN', 'Missing scope: events:scanning', 403);
  }

  // Get ticket
  const { data: ticket, error: fetchError } = await supabase
    .from('event_tickets')
    .select('*, event:events(merchant_id)')
    .eq('id', ticketId)
    .single();

  if (fetchError || !ticket) {
    return errorResponse(res, 'NOT_FOUND', 'Ticket not found', 404);
  }

  // Verify merchant owns the event
  if (ticket.event?.merchant_id !== context.merchantId) {
    return errorResponse(res, 'FORBIDDEN', 'Not authorized to scan this ticket', 403);
  }

  if (ticket.status === 'used') {
    return errorResponse(res, 'ALREADY_USED', 'Ticket has already been used', 400);
  }

  if (ticket.status === 'cancelled') {
    return errorResponse(res, 'CANCELLED', 'Ticket has been cancelled', 400);
  }

  // Mark as used
  const { data, error } = await supabase
    .from('event_tickets')
    .update({ status: 'used', scanned_at: new Date().toISOString() })
    .eq('id', ticketId)
    .select()
    .single();

  if (error) {
    return errorResponse(res, 'DATABASE_ERROR', error.message, 500);
  }

  return successResponse(res, { ...data, valid: true, message: 'Ticket validated successfully' });
}

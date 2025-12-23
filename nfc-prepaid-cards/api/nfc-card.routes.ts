/**
 * NFC PREPAID CARD API ROUTES
 *
 * RESTful API endpoints for the NFC prepaid card system.
 * These routes handle:
 * - Card program management (Admin)
 * - Batch management (Admin)
 * - Vendor management (Admin)
 * - Card activation (User)
 * - Tap-to-pay transactions (Terminal)
 * - Card management (User)
 * - Dashboard stats (Admin/Vendor)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import NFCCardService from '../services/nfc-card.service';
import {
  NFCCardCategory,
  NFCChipType,
  NFCVendorStatus,
  NFCBatchStatus,
  NFCReplacementReason,
} from '../types/nfc-card.types';

// Initialize service
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const nfcCardService = new NFCCardService(supabaseUrl, supabaseServiceKey);

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

interface AuthContext {
  userId: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN' | 'VENDOR';
  vendorId?: string;
}

async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  // Get user role
  const { data: userRole } = await supabase
    .from('users')
    .select('roles')
    .eq('id', user.id)
    .single();

  const roles = userRole?.roles || ['USER'];
  let role: AuthContext['role'] = 'USER';

  if (roles.includes('SUPERADMIN')) role = 'SUPERADMIN';
  else if (roles.includes('ADMIN')) role = 'ADMIN';
  else if (roles.includes('VENDOR')) role = 'VENDOR';

  // Get vendor ID if vendor
  let vendorId: string | undefined;
  if (role === 'VENDOR') {
    const { data: vendor } = await supabase
      .from('nfc_card_vendors')
      .select('id')
      .eq('user_id', user.id)
      .single();
    vendorId = vendor?.id;
  }

  return { userId: user.id, role, vendorId };
}

function requireAuth(roles: AuthContext['role'][] = ['USER', 'ADMIN', 'SUPERADMIN', 'VENDOR']) {
  return async (request: NextRequest): Promise<AuthContext> => {
    const auth = await getAuthContext(request);
    if (!auth) {
      throw new Error('Unauthorized');
    }
    if (!roles.includes(auth.role)) {
      throw new Error('Forbidden');
    }
    return auth;
  };
}

function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ============================================================================
// CARD PROGRAMS API (Admin Only)
// ============================================================================

/**
 * GET /api/nfc-cards/programs
 * List all card programs
 */
export async function GET_programs(request: NextRequest) {
  try {
    const auth = await requireAuth(['ADMIN', 'SUPERADMIN'])(request);
    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';

    const programs = await nfcCardService.getCardPrograms(includeInactive);
    return jsonResponse({ programs });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * POST /api/nfc-cards/programs
 * Create a new card program
 */
export async function POST_programs(request: NextRequest) {
  try {
    const auth = await requireAuth(['SUPERADMIN'])(request);
    const body = await request.json();

    const program = await nfcCardService.createCardProgram({
      programCode: body.programCode,
      programName: body.programName,
      description: body.description,
      cardCategory: body.cardCategory as NFCCardCategory,
      isReloadable: body.isReloadable,
      requiresKyc: body.requiresKyc,
      cardPrice: body.cardPrice,
      initialBalance: body.initialBalance,
      dailyTransactionLimit: body.dailyTransactionLimit,
      perTransactionLimit: body.perTransactionLimit,
      chipType: body.chipType as NFCChipType,
      validityMonths: body.validityMonths,
    }, auth.userId);

    return jsonResponse({ program }, 201);
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * GET /api/nfc-cards/programs/:id
 * Get a single card program
 */
export async function GET_program(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(['ADMIN', 'SUPERADMIN'])(request);

    const program = await nfcCardService.getCardProgram(params.id);
    if (!program) {
      return errorResponse('Program not found', 404);
    }

    return jsonResponse({ program });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * PATCH /api/nfc-cards/programs/:id/status
 * Update program status
 */
export async function PATCH_program_status(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(['SUPERADMIN'])(request);
    const body = await request.json();

    await nfcCardService.updateProgramStatus(params.id, body.status, auth.userId);

    return jsonResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

// ============================================================================
// CARD BATCHES API (Admin Only)
// ============================================================================

/**
 * GET /api/nfc-cards/batches
 * List all batches
 */
export async function GET_batches(request: NextRequest) {
  try {
    await requireAuth(['ADMIN', 'SUPERADMIN'])(request);
    const programId = request.nextUrl.searchParams.get('programId') || undefined;

    const batches = await nfcCardService.getBatches(programId);
    return jsonResponse({ batches });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * POST /api/nfc-cards/batches
 * Create a new batch
 */
export async function POST_batches(request: NextRequest) {
  try {
    const auth = await requireAuth(['SUPERADMIN'])(request);
    const body = await request.json();

    const batch = await nfcCardService.createBatch({
      programId: body.programId,
      cardCount: body.cardCount,
      manufacturer: body.manufacturer,
      binPrefix: body.binPrefix,
      sequenceStart: body.sequenceStart,
      wholesalePrice: body.wholesalePrice,
      retailPrice: body.retailPrice,
    }, auth.userId);

    return jsonResponse({ batch }, 201);
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * PATCH /api/nfc-cards/batches/:id/status
 * Update batch status
 */
export async function PATCH_batch_status(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(['ADMIN', 'SUPERADMIN'])(request);
    const body = await request.json();

    await nfcCardService.updateBatchStatus(params.id, body.status as NFCBatchStatus, auth.userId);

    return jsonResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

// ============================================================================
// VENDORS API (Admin Only)
// ============================================================================

/**
 * GET /api/nfc-cards/vendors
 * List all vendors
 */
export async function GET_vendors(request: NextRequest) {
  try {
    await requireAuth(['ADMIN', 'SUPERADMIN'])(request);
    const status = request.nextUrl.searchParams.get('status') as NFCVendorStatus | null;

    const vendors = await nfcCardService.getVendors(status || undefined);
    return jsonResponse({ vendors });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * POST /api/nfc-cards/vendors
 * Create a new vendor
 */
export async function POST_vendors(request: NextRequest) {
  try {
    await requireAuth(['ADMIN', 'SUPERADMIN'])(request);
    const body = await request.json();

    const vendor = await nfcCardService.createVendor({
      businessName: body.businessName,
      contactName: body.contactName,
      phone: body.phone,
      email: body.email,
      region: body.region,
      district: body.district,
      address: body.address,
      commissionType: body.commissionType,
      commissionRate: body.commissionRate,
      maxInventoryValue: body.maxInventoryValue,
    });

    return jsonResponse({ vendor }, 201);
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * POST /api/nfc-cards/vendors/:id/approve
 * Approve a vendor
 */
export async function POST_vendor_approve(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(['ADMIN', 'SUPERADMIN'])(request);

    await nfcCardService.approveVendor(params.id, auth.userId);

    return jsonResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * POST /api/nfc-cards/vendors/:id/inventory
 * Assign inventory to vendor
 */
export async function POST_vendor_inventory(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(['ADMIN', 'SUPERADMIN'])(request);
    const body = await request.json();

    const inventory = await nfcCardService.assignInventoryToVendor({
      vendorId: params.id,
      batchId: body.batchId,
      sequenceStart: body.sequenceStart,
      sequenceEnd: body.sequenceEnd,
    }, auth.userId);

    return jsonResponse({ inventory }, 201);
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

// ============================================================================
// VENDOR SALES API (Vendor Only)
// ============================================================================

/**
 * POST /api/nfc-cards/vendor/sales
 * Record a vendor sale
 */
export async function POST_vendor_sale(request: NextRequest) {
  try {
    const auth = await requireAuth(['VENDOR'])(request);
    if (!auth.vendorId) {
      return errorResponse('Vendor not found', 403);
    }

    const body = await request.json();

    await nfcCardService.recordVendorSale({
      vendorId: auth.vendorId,
      cardId: body.cardId,
      salePrice: body.salePrice,
      paymentMethod: body.paymentMethod,
    });

    return jsonResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * GET /api/nfc-cards/vendor/dashboard
 * Get vendor dashboard stats
 */
export async function GET_vendor_dashboard(request: NextRequest) {
  try {
    const auth = await requireAuth(['VENDOR'])(request);
    if (!auth.vendorId) {
      return errorResponse('Vendor not found', 403);
    }

    const stats = await nfcCardService.getVendorDashboardStats(auth.vendorId);
    return jsonResponse({ stats });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

// ============================================================================
// CARD ACTIVATION API (User)
// ============================================================================

/**
 * POST /api/nfc-cards/activate
 * Activate a physical NFC card
 */
export async function POST_activate(request: NextRequest) {
  try {
    const auth = await requireAuth(['USER', 'ADMIN', 'SUPERADMIN'])(request);
    const body = await request.json();

    const result = await nfcCardService.activateCard({
      userId: auth.userId,
      cardUid: body.cardUid,
      activationCode: body.activationCode,
      cryptoChallenge: body.cryptoChallenge,
      cryptoResponse: body.cryptoResponse,
      deviceFingerprint: body.deviceFingerprint,
      latitude: body.latitude,
      longitude: body.longitude,
    });

    if (!result.success) {
      return errorResponse(result.error || 'Activation failed', 400);
    }

    return jsonResponse(result);
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * POST /api/nfc-cards/challenge
 * Generate a cryptographic challenge for NFC authentication
 */
export async function POST_challenge(request: NextRequest) {
  try {
    // This endpoint can be called by terminals without user auth
    // but should be rate-limited and monitored

    const body = await request.json();
    const { cardUid } = body;

    if (!cardUid) {
      return errorResponse('Card UID required', 400);
    }

    // Generate challenge (in production, this would use the HSM)
    const challenge = require('crypto').randomBytes(16).toString('hex');

    // Store challenge with expiry (30 seconds)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from('nfc_challenges').insert({
      challenge_id: require('crypto').randomUUID(),
      challenge,
      card_uid_hash: require('crypto').createHash('sha256').update(cardUid).digest('hex'),
      expires_at: new Date(Date.now() + 30000).toISOString(),
    });

    return jsonResponse({ challenge });
  } catch (error: any) {
    return errorResponse(error.message, 400);
  }
}

/**
 * POST /api/nfc-cards/:id/pin
 * Set card PIN
 */
export async function POST_set_pin(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(['USER', 'ADMIN', 'SUPERADMIN'])(request);
    const body = await request.json();

    await nfcCardService.setCardPin({
      cardId: params.id,
      userId: auth.userId,
      pin: body.pin,
      confirmPin: body.confirmPin,
    });

    return jsonResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

// ============================================================================
// TAP-TO-PAY API (Terminal)
// ============================================================================

/**
 * POST /api/nfc-cards/tap-to-pay
 * Process a tap-to-pay transaction
 */
export async function POST_tap_to_pay(request: NextRequest) {
  try {
    // Terminal authentication via API key
    const apiKey = request.headers.get('X-Terminal-API-Key');
    if (!apiKey) {
      return errorResponse('Terminal authentication required', 401);
    }

    // Verify terminal API key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: terminal } = await supabase
      .from('nfc_terminals')
      .select('id, merchant_id, status')
      .eq('api_key', apiKey)
      .single();

    if (!terminal || terminal.status !== 'ACTIVE') {
      return errorResponse('Invalid terminal', 403);
    }

    const body = await request.json();

    const result = await nfcCardService.processTapToPay({
      cardUid: body.cardUid,
      terminalId: terminal.id,
      merchantId: terminal.merchant_id,
      amount: body.amount,
      currency: body.currency,
      cryptoChallenge: body.cryptoChallenge,
      cryptoResponse: body.cryptoResponse,
      pin: body.pin,
      latitude: body.latitude,
      longitude: body.longitude,
      isOffline: body.isOffline,
    });

    if (!result.success) {
      return jsonResponse({
        success: false,
        declineCode: result.declineCode,
        declineReason: result.declineReason,
      }, 200); // Return 200 for declined transactions (business logic, not error)
    }

    return jsonResponse(result);
  } catch (error: any) {
    return errorResponse(error.message, 400);
  }
}

// ============================================================================
// USER CARD MANAGEMENT API
// ============================================================================

/**
 * GET /api/nfc-cards/my-cards
 * Get user's NFC cards
 */
export async function GET_my_cards(request: NextRequest) {
  try {
    const auth = await requireAuth(['USER', 'ADMIN', 'SUPERADMIN'])(request);

    const cards = await nfcCardService.getUserCards(auth.userId);
    return jsonResponse({ cards });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * POST /api/nfc-cards/:id/freeze
 * Freeze a card
 */
export async function POST_freeze(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(['USER', 'ADMIN', 'SUPERADMIN'])(request);
    const body = await request.json();

    await nfcCardService.freezeCard({
      cardId: params.id,
      userId: auth.userId,
      reason: body.reason,
    });

    return jsonResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * POST /api/nfc-cards/:id/unfreeze
 * Unfreeze a card
 */
export async function POST_unfreeze(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(['USER', 'ADMIN', 'SUPERADMIN'])(request);

    await nfcCardService.unfreezeCard(params.id, auth.userId);

    return jsonResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * POST /api/nfc-cards/:id/block
 * Block a card (for lost/stolen)
 */
export async function POST_block(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(['USER', 'ADMIN', 'SUPERADMIN'])(request);
    const body = await request.json();

    await nfcCardService.blockCard(params.id, auth.userId, body.reason);

    return jsonResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * POST /api/nfc-cards/:id/replacement
 * Request card replacement
 */
export async function POST_replacement(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(['USER', 'ADMIN', 'SUPERADMIN'])(request);
    const body = await request.json();

    const replacementId = await nfcCardService.requestReplacement({
      cardId: params.id,
      userId: auth.userId,
      reason: body.reason as NFCReplacementReason,
      description: body.description,
      deliveryAddress: body.deliveryAddress,
    });

    return jsonResponse({ replacementId }, 201);
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * POST /api/nfc-cards/:id/reload
 * Reload card balance
 */
export async function POST_reload(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(['USER', 'ADMIN', 'SUPERADMIN'])(request);
    const body = await request.json();

    const result = await nfcCardService.reloadCard({
      cardId: params.id,
      userId: auth.userId,
      amount: body.amount,
      sourceWalletId: body.sourceWalletId,
      sourceType: body.sourceType,
      agentId: body.agentId,
    });

    return jsonResponse(result);
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * GET /api/nfc-cards/:id/transactions
 * Get card transaction history
 */
export async function GET_transactions(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(['USER', 'ADMIN', 'SUPERADMIN'])(request);
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

    const transactions = await nfcCardService.getCardTransactions(
      params.id,
      auth.userId,
      limit,
      offset
    );

    return jsonResponse({ transactions });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

// ============================================================================
// ADMIN DASHBOARD API
// ============================================================================

/**
 * GET /api/nfc-cards/admin/dashboard
 * Get admin dashboard statistics
 */
export async function GET_admin_dashboard(request: NextRequest) {
  try {
    await requireAuth(['ADMIN', 'SUPERADMIN'])(request);

    const stats = await nfcCardService.getDashboardStats();
    return jsonResponse({ stats });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * GET /api/nfc-cards/admin/cards
 * List all cards with filters
 */
export async function GET_admin_cards(request: NextRequest) {
  try {
    await requireAuth(['ADMIN', 'SUPERADMIN'])(request);

    const state = request.nextUrl.searchParams.get('state');
    const programId = request.nextUrl.searchParams.get('programId');
    const batchId = request.nextUrl.searchParams.get('batchId');
    const vendorId = request.nextUrl.searchParams.get('vendorId');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from('nfc_prepaid_cards')
      .select('*, nfc_card_programs(*), nfc_card_vendors(*)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (state) query = query.eq('state', state);
    if (programId) query = query.eq('program_id', programId);
    if (batchId) query = query.eq('batch_id', batchId);
    if (vendorId) query = query.eq('vendor_id', vendorId);

    const { data: cards, error } = await query;

    if (error) throw new Error(error.message);

    return jsonResponse({ cards });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * GET /api/nfc-cards/admin/transactions
 * List all transactions with filters
 */
export async function GET_admin_transactions(request: NextRequest) {
  try {
    await requireAuth(['ADMIN', 'SUPERADMIN'])(request);

    const state = request.nextUrl.searchParams.get('state');
    const cardId = request.nextUrl.searchParams.get('cardId');
    const merchantId = request.nextUrl.searchParams.get('merchantId');
    const fromDate = request.nextUrl.searchParams.get('fromDate');
    const toDate = request.nextUrl.searchParams.get('toDate');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from('nfc_card_transactions')
      .select('*, nfc_prepaid_cards(card_number, user_id)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (state) query = query.eq('state', state);
    if (cardId) query = query.eq('card_id', cardId);
    if (merchantId) query = query.eq('merchant_id', merchantId);
    if (fromDate) query = query.gte('created_at', fromDate);
    if (toDate) query = query.lte('created_at', toDate);

    const { data: transactions, error } = await query;

    if (error) throw new Error(error.message);

    return jsonResponse({ transactions });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

/**
 * GET /api/nfc-cards/admin/audit
 * Get audit log
 */
export async function GET_admin_audit(request: NextRequest) {
  try {
    await requireAuth(['SUPERADMIN'])(request);

    const eventType = request.nextUrl.searchParams.get('eventType');
    const eventCategory = request.nextUrl.searchParams.get('eventCategory');
    const entityType = request.nextUrl.searchParams.get('entityType');
    const entityId = request.nextUrl.searchParams.get('entityId');
    const fromDate = request.nextUrl.searchParams.get('fromDate');
    const toDate = request.nextUrl.searchParams.get('toDate');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from('nfc_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (eventType) query = query.eq('event_type', eventType);
    if (eventCategory) query = query.eq('event_category', eventCategory);
    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);
    if (fromDate) query = query.gte('created_at', fromDate);
    if (toDate) query = query.lte('created_at', toDate);

    const { data: auditLogs, error } = await query;

    if (error) throw new Error(error.message);

    return jsonResponse({ auditLogs });
  } catch (error: any) {
    return errorResponse(error.message, error.message === 'Unauthorized' ? 401 : 400);
  }
}

// ============================================================================
// EXPORT ALL HANDLERS
// ============================================================================

export const nfcCardRoutes = {
  // Programs
  'GET /api/nfc-cards/programs': GET_programs,
  'POST /api/nfc-cards/programs': POST_programs,
  'GET /api/nfc-cards/programs/:id': GET_program,
  'PATCH /api/nfc-cards/programs/:id/status': PATCH_program_status,

  // Batches
  'GET /api/nfc-cards/batches': GET_batches,
  'POST /api/nfc-cards/batches': POST_batches,
  'PATCH /api/nfc-cards/batches/:id/status': PATCH_batch_status,

  // Vendors
  'GET /api/nfc-cards/vendors': GET_vendors,
  'POST /api/nfc-cards/vendors': POST_vendors,
  'POST /api/nfc-cards/vendors/:id/approve': POST_vendor_approve,
  'POST /api/nfc-cards/vendors/:id/inventory': POST_vendor_inventory,

  // Vendor Operations
  'POST /api/nfc-cards/vendor/sales': POST_vendor_sale,
  'GET /api/nfc-cards/vendor/dashboard': GET_vendor_dashboard,

  // Card Activation
  'POST /api/nfc-cards/activate': POST_activate,
  'POST /api/nfc-cards/challenge': POST_challenge,
  'POST /api/nfc-cards/:id/pin': POST_set_pin,

  // Tap-to-Pay
  'POST /api/nfc-cards/tap-to-pay': POST_tap_to_pay,

  // User Card Management
  'GET /api/nfc-cards/my-cards': GET_my_cards,
  'POST /api/nfc-cards/:id/freeze': POST_freeze,
  'POST /api/nfc-cards/:id/unfreeze': POST_unfreeze,
  'POST /api/nfc-cards/:id/block': POST_block,
  'POST /api/nfc-cards/:id/replacement': POST_replacement,
  'POST /api/nfc-cards/:id/reload': POST_reload,
  'GET /api/nfc-cards/:id/transactions': GET_transactions,

  // Admin Dashboard
  'GET /api/nfc-cards/admin/dashboard': GET_admin_dashboard,
  'GET /api/nfc-cards/admin/cards': GET_admin_cards,
  'GET /api/nfc-cards/admin/transactions': GET_admin_transactions,
  'GET /api/nfc-cards/admin/audit': GET_admin_audit,
};

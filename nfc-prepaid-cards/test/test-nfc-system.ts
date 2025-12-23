/**
 * NFC PREPAID CARD SYSTEM - TEST SCRIPT
 *
 * This script tests the complete flow:
 * 1. Create a card program
 * 2. Create a batch of cards
 * 3. Create and approve a vendor
 * 4. Assign inventory to vendor
 * 5. Record a vendor sale
 * 6. Activate a card (simulated)
 * 7. Process a tap-to-pay transaction (simulated)
 *
 * Run with: npx ts-node nfc-prepaid-cards/test/test-nfc-system.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// Configuration - Update these with your values
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test data
let testProgramId: string;
let testBatchId: string;
let testVendorId: string;
let testCardId: string;
let testUserId: string;

async function log(message: string, data?: any) {
  console.log(`\n✅ ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

async function error(message: string, err?: any) {
  console.error(`\n❌ ${message}`);
  if (err) console.error(err);
}

// ============================================================================
// TEST 1: Create Card Program
// ============================================================================
async function testCreateProgram() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Creating Card Program');
  console.log('='.repeat(60));

  const programData = {
    program_code: `TEST-${Date.now()}`,
    program_name: 'Test Prepaid Card',
    description: 'Test card program for development',
    card_category: 'ANONYMOUS',
    is_reloadable: false,
    requires_kyc: false,
    card_price: 55000,
    initial_balance: 50000,
    currency: 'SLE',
    daily_transaction_limit: 200000,
    per_transaction_limit: 100000,
    chip_type: 'DESFIRE_EV3',
    validity_months: 24,
    status: 'ACTIVE',
  };

  const { data, error: err } = await supabase
    .from('nfc_card_programs')
    .insert(programData)
    .select()
    .single();

  if (err) {
    error('Failed to create program', err);
    return false;
  }

  testProgramId = data.id;
  log('Created card program', { id: data.id, code: data.program_code, price: data.card_price });
  return true;
}

// ============================================================================
// TEST 2: Create Card Batch
// ============================================================================
async function testCreateBatch() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Creating Card Batch');
  console.log('='.repeat(60));

  const batchData = {
    batch_code: `BATCH-TEST-${Date.now()}`,
    program_id: testProgramId,
    card_count: 10,
    manufacturer: 'Test Manufacturer',
    bin_prefix: '62000099',
    sequence_start: 1,
    sequence_end: 10,
    status: 'MANUFACTURED',
    cards_in_warehouse: 10,
  };

  const { data, error: err } = await supabase
    .from('nfc_card_batches')
    .insert(batchData)
    .select()
    .single();

  if (err) {
    error('Failed to create batch', err);
    return false;
  }

  testBatchId = data.id;
  log('Created card batch', { id: data.id, code: data.batch_code, count: data.card_count });

  // Create test cards for the batch
  await createTestCards();
  return true;
}

async function createTestCards() {
  console.log('\n  Creating test cards...');

  const program = await supabase
    .from('nfc_card_programs')
    .select('*')
    .eq('id', testProgramId)
    .single();

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 24);

  const cards = [];
  for (let i = 1; i <= 10; i++) {
    const cardNumber = `6200009900000000${i.toString().padStart(2, '0')}`.slice(0, 16);
    const cardUid = crypto.randomBytes(7).toString('hex').toUpperCase();
    const activationCode = crypto.randomBytes(6).toString('hex').toUpperCase();

    cards.push({
      card_number: cardNumber,
      card_uid: cardUid,
      card_uid_hash: crypto.createHash('sha256').update(cardUid).digest('hex'),
      program_id: testProgramId,
      batch_id: testBatchId,
      key_slot_id: `SLOT-TEST-${i}`,
      key_version: 1,
      state: 'CREATED',
      balance: 0,
      currency: 'SLE',
      activation_code: activationCode,
      activation_code_hash: crypto.createHash('sha256').update(activationCode).digest('hex'),
      expires_at: expiresAt.toISOString(),
    });
  }

  const { data, error: err } = await supabase
    .from('nfc_prepaid_cards')
    .insert(cards)
    .select();

  if (err) {
    error('Failed to create cards', err);
    return;
  }

  testCardId = data[0].id;
  log(`Created ${data.length} test cards`, { firstCardId: testCardId, firstCardUid: data[0].card_uid });
}

// ============================================================================
// TEST 3: Create Vendor
// ============================================================================
async function testCreateVendor() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Creating Vendor');
  console.log('='.repeat(60));

  const vendorData = {
    vendor_code: `VND-TEST-${Date.now().toString().slice(-6)}`,
    business_name: 'Test Street Vendor',
    contact_name: 'John Test',
    phone: '+232-123-4567',
    email: 'test@vendor.com',
    region: 'Western Area',
    district: 'Freetown',
    commission_type: 'PERCENTAGE',
    commission_rate: 5.0,
    max_inventory_value: 10000000,
    status: 'APPROVED',
    approved_at: new Date().toISOString(),
  };

  const { data, error: err } = await supabase
    .from('nfc_card_vendors')
    .insert(vendorData)
    .select()
    .single();

  if (err) {
    error('Failed to create vendor', err);
    return false;
  }

  testVendorId = data.id;
  log('Created vendor', { id: data.id, code: data.vendor_code, name: data.business_name });
  return true;
}

// ============================================================================
// TEST 4: Assign Inventory to Vendor
// ============================================================================
async function testAssignInventory() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Assigning Inventory to Vendor');
  console.log('='.repeat(60));

  const inventoryData = {
    vendor_id: testVendorId,
    batch_id: testBatchId,
    cards_assigned: 5,
    sequence_start: 1,
    sequence_end: 5,
    assigned_value: 275000, // 5 cards * 55000
    status: 'ASSIGNED',
  };

  const { data, error: err } = await supabase
    .from('nfc_vendor_inventory')
    .insert(inventoryData)
    .select()
    .single();

  if (err) {
    error('Failed to assign inventory', err);
    return false;
  }

  // Update cards to ISSUED state
  await supabase
    .from('nfc_prepaid_cards')
    .update({
      state: 'ISSUED',
      vendor_id: testVendorId,
      vendor_inventory_id: data.id,
      issued_at: new Date().toISOString(),
    })
    .eq('batch_id', testBatchId)
    .limit(5);

  log('Assigned inventory', {
    inventoryId: data.id,
    cardsAssigned: data.cards_assigned,
    value: data.assigned_value
  });
  return true;
}

// ============================================================================
// TEST 5: Record Vendor Sale
// ============================================================================
async function testVendorSale() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: Recording Vendor Sale');
  console.log('='.repeat(60));

  // Get a card that's in ISSUED state
  const { data: card } = await supabase
    .from('nfc_prepaid_cards')
    .select('*')
    .eq('state', 'ISSUED')
    .eq('vendor_id', testVendorId)
    .limit(1)
    .single();

  if (!card) {
    error('No issued card found for sale');
    return false;
  }

  testCardId = card.id;

  // Record the sale
  const saleData = {
    vendor_id: testVendorId,
    card_id: card.id,
    sale_price: 55000,
    commission_amount: 2750, // 5% of 55000
    net_amount: 52250,
    payment_method: 'CASH',
    receipt_number: `RCP-${Date.now()}`,
  };

  const { data: sale, error: err } = await supabase
    .from('nfc_vendor_sales')
    .insert(saleData)
    .select()
    .single();

  if (err) {
    error('Failed to record sale', err);
    return false;
  }

  // Update card state to SOLD
  await supabase
    .from('nfc_prepaid_cards')
    .update({ state: 'SOLD', sold_at: new Date().toISOString() })
    .eq('id', card.id);

  log('Recorded vendor sale', {
    saleId: sale.id,
    cardId: card.id,
    receipt: sale.receipt_number,
    price: sale.sale_price,
    commission: sale.commission_amount,
  });
  return true;
}

// ============================================================================
// TEST 6: Simulate Card Activation
// ============================================================================
async function testCardActivation() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 6: Simulating Card Activation');
  console.log('='.repeat(60));

  // Get a test user or create reference
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (!users || users.length === 0) {
    console.log('  ⚠️  No users found - using mock user ID');
    testUserId = crypto.randomUUID();
  } else {
    testUserId = users[0].id;
  }

  // Get the sold card
  const { data: card } = await supabase
    .from('nfc_prepaid_cards')
    .select('*, nfc_card_programs(*)')
    .eq('id', testCardId)
    .single();

  if (!card) {
    error('Card not found');
    return false;
  }

  // Simulate activation (normally this would involve NFC crypto validation)
  const { error: err } = await supabase
    .from('nfc_prepaid_cards')
    .update({
      state: 'ACTIVATED',
      user_id: testUserId,
      balance: card.nfc_card_programs.initial_balance,
      activated_at: new Date().toISOString(),
      activation_code: null,
    })
    .eq('id', testCardId);

  if (err) {
    error('Failed to activate card', err);
    return false;
  }

  // Create activation transaction
  await supabase.from('nfc_card_transactions').insert({
    transaction_reference: `ACT-${Date.now()}`,
    card_id: testCardId,
    transaction_type: 'ACTIVATION_CREDIT',
    amount: card.nfc_card_programs.initial_balance,
    fee_amount: 0,
    net_amount: card.nfc_card_programs.initial_balance,
    currency: 'SLE',
    balance_before: 0,
    balance_after: card.nfc_card_programs.initial_balance,
    state: 'CAPTURED',
    captured_at: new Date().toISOString(),
  });

  log('Card activated', {
    cardId: testCardId,
    userId: testUserId,
    initialBalance: card.nfc_card_programs.initial_balance,
  });
  return true;
}

// ============================================================================
// TEST 7: Simulate Tap-to-Pay Transaction
// ============================================================================
async function testTapToPay() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 7: Simulating Tap-to-Pay Transaction');
  console.log('='.repeat(60));

  // Get the activated card
  const { data: card } = await supabase
    .from('nfc_prepaid_cards')
    .select('*')
    .eq('id', testCardId)
    .single();

  if (!card || card.state !== 'ACTIVATED') {
    error('Card not activated');
    return false;
  }

  const purchaseAmount = 15000;
  const fee = 225; // 1.5% of 15000
  const totalDebit = purchaseAmount + fee;
  const newBalance = card.balance - totalDebit;
  const authCode = crypto.randomBytes(6).toString('hex').toUpperCase();

  // Update card balance
  const { error: updateErr } = await supabase
    .from('nfc_prepaid_cards')
    .update({
      balance: newBalance,
      daily_spent: card.daily_spent + purchaseAmount,
      daily_transaction_count: card.daily_transaction_count + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', testCardId);

  if (updateErr) {
    error('Failed to update card balance', updateErr);
    return false;
  }

  // Create transaction record
  const { data: txn, error: txnErr } = await supabase
    .from('nfc_card_transactions')
    .insert({
      transaction_reference: `TXN-${Date.now()}`,
      authorization_code: authCode,
      card_id: testCardId,
      transaction_type: 'PURCHASE',
      amount: purchaseAmount,
      fee_amount: fee,
      net_amount: purchaseAmount - fee,
      currency: 'SLE',
      balance_before: card.balance,
      balance_after: newBalance,
      state: 'CAPTURED',
      merchant_name: 'Test Merchant',
      merchant_mcc: '5411',
      terminal_id: 'TERM-TEST-001',
      crypto_validation_result: 'VALID',
      authorized_at: new Date().toISOString(),
      captured_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (txnErr) {
    error('Failed to create transaction', txnErr);
    return false;
  }

  log('Tap-to-pay transaction completed', {
    transactionId: txn.id,
    authCode: txn.authorization_code,
    amount: purchaseAmount,
    fee: fee,
    balanceBefore: card.balance,
    balanceAfter: newBalance,
  });
  return true;
}

// ============================================================================
// TEST 8: Check Final State
// ============================================================================
async function testFinalState() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 8: Checking Final State');
  console.log('='.repeat(60));

  // Get card final state
  const { data: card } = await supabase
    .from('nfc_prepaid_cards')
    .select('*')
    .eq('id', testCardId)
    .single();

  // Get transaction count
  const { count: txnCount } = await supabase
    .from('nfc_card_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('card_id', testCardId);

  // Get vendor stats
  const { data: vendor } = await supabase
    .from('nfc_card_vendors')
    .select('*')
    .eq('id', testVendorId)
    .single();

  log('Final card state', {
    cardId: card?.id,
    state: card?.state,
    balance: card?.balance,
    dailySpent: card?.daily_spent,
    transactionCount: txnCount,
  });

  log('Vendor stats', {
    vendorId: vendor?.id,
    totalCardsSold: vendor?.total_cards_sold,
    totalSalesValue: vendor?.total_sales_value,
  });

  return true;
}

// ============================================================================
// CLEANUP (Optional)
// ============================================================================
async function cleanup() {
  console.log('\n' + '='.repeat(60));
  console.log('CLEANUP: Removing test data');
  console.log('='.repeat(60));

  // Delete in order (respecting foreign keys)
  await supabase.from('nfc_card_transactions').delete().eq('card_id', testCardId);
  await supabase.from('nfc_vendor_sales').delete().eq('vendor_id', testVendorId);
  await supabase.from('nfc_prepaid_cards').delete().eq('batch_id', testBatchId);
  await supabase.from('nfc_vendor_inventory').delete().eq('vendor_id', testVendorId);
  await supabase.from('nfc_card_vendors').delete().eq('id', testVendorId);
  await supabase.from('nfc_card_batches').delete().eq('id', testBatchId);
  await supabase.from('nfc_card_programs').delete().eq('id', testProgramId);

  log('Test data cleaned up');
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       NFC PREPAID CARD SYSTEM - TEST SUITE                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Run tests
    if (!await testCreateProgram()) return;
    if (!await testCreateBatch()) return;
    if (!await testCreateVendor()) return;
    if (!await testAssignInventory()) return;
    if (!await testVendorSale()) return;
    if (!await testCardActivation()) return;
    if (!await testTapToPay()) return;
    await testFinalState();

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              ALL TESTS PASSED! ✅                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // Uncomment to clean up test data:
    // await cleanup();

  } catch (err) {
    console.error('\n❌ Test suite failed:', err);
    process.exit(1);
  }
}

main();

/**
 * NFC PREPAID CARD SYSTEM
 *
 * Closed-loop NFC prepaid card system for large-scale, low-cost distribution
 * through street vendors. This system follows bank-grade and transport-grade
 * security principles.
 *
 * IMPORTANT: This system is SEPARATE from existing card systems:
 * - Card Products (module-based marketplace)
 * - Card Programs (order-based with features)
 * - Issued Virtual Cards (user-generated)
 *
 * Key Features:
 * - Physical NFC cards with DESFire EV2/EV3 secure elements
 * - Vendor street sales distribution
 * - User activation via mobile app NFC tap
 * - Tap-to-pay at merchant POS terminals
 * - Full key management with HSM integration
 * - Fraud detection and anti-cloning protection
 *
 * Security Principles:
 * - No balance stored on card
 * - No secrets exposed to POS terminals
 * - No UID-only authorization (cryptographic auth required)
 * - All final decisions made server-side
 *
 * @module nfc-prepaid-cards
 */

// Export types
export * from './types/nfc-card.types';

// Export service
export { NFCCardService, default as NFCCardServiceDefault } from './services/nfc-card.service';

// Export API routes
export { nfcCardRoutes } from './api/nfc-card.routes';

/**
 * Quick Start Guide:
 *
 * 1. Run migrations:
 *    - 001_nfc_prepaid_cards_schema.sql
 *    - 002_nfc_helper_functions.sql
 *
 * 2. Initialize the service:
 *    ```typescript
 *    import { NFCCardService } from './nfc-prepaid-cards';
 *
 *    const nfcService = new NFCCardService(
 *      process.env.SUPABASE_URL,
 *      process.env.SUPABASE_SERVICE_KEY
 *    );
 *    ```
 *
 * 3. Create a card program:
 *    ```typescript
 *    const program = await nfcService.createCardProgram({
 *      programCode: 'NFC-CUSTOM-50',
 *      programName: 'Custom Card 50',
 *      cardCategory: 'ANONYMOUS',
 *      isReloadable: false,
 *      requiresKyc: false,
 *      cardPrice: 55000,
 *      initialBalance: 50000,
 *      dailyTransactionLimit: 200000,
 *      perTransactionLimit: 100000,
 *      chipType: 'DESFIRE_EV3',
 *      validityMonths: 24,
 *    }, adminUserId);
 *    ```
 *
 * 4. Create a batch of cards:
 *    ```typescript
 *    const batch = await nfcService.createBatch({
 *      programId: program.id,
 *      cardCount: 1000,
 *      binPrefix: '62000001',
 *      sequenceStart: 1,
 *    }, adminUserId);
 *    ```
 *
 * 5. Create and approve a vendor:
 *    ```typescript
 *    const vendor = await nfcService.createVendor({
 *      businessName: 'Street Corner Shop',
 *      phone: '+232-123-4567',
 *      region: 'Western Area',
 *    });
 *
 *    await nfcService.approveVendor(vendor.id, adminUserId);
 *    ```
 *
 * 6. Assign inventory to vendor:
 *    ```typescript
 *    await nfcService.assignInventoryToVendor({
 *      vendorId: vendor.id,
 *      batchId: batch.id,
 *      sequenceStart: 1,
 *      sequenceEnd: 100,
 *    }, adminUserId);
 *    ```
 *
 * 7. Vendor records a sale:
 *    ```typescript
 *    await nfcService.recordVendorSale({
 *      vendorId: vendor.id,
 *      cardId: cardId,
 *      salePrice: 55000,
 *    });
 *    ```
 *
 * 8. User activates card:
 *    ```typescript
 *    const result = await nfcService.activateCard({
 *      userId: userId,
 *      cardUid: '04A1B2C3D4E5F6',
 *      cryptoChallenge: challenge,
 *      cryptoResponse: response,
 *      deviceFingerprint: fingerprint,
 *    });
 *    ```
 *
 * 9. Process tap-to-pay:
 *    ```typescript
 *    const txnResult = await nfcService.processTapToPay({
 *      cardUid: '04A1B2C3D4E5F6',
 *      terminalId: 'TERM-001',
 *      merchantId: merchantId,
 *      amount: 25000,
 *      cryptoChallenge: challenge,
 *      cryptoResponse: response,
 *    });
 *    ```
 *
 * For complete documentation, see:
 * - docs/ARCHITECTURE.md - System architecture and security design
 * - docs/API_REFERENCE.md - Complete API documentation
 */

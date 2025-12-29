/**
 * POS Sync Service
 * Handles synchronization between IndexedDB and Supabase
 */

import { supabaseAdmin } from '@/lib/supabase';
import posOfflineService, {
  POSProduct,
  POSCategory,
  OfflineSale,
  TerminalConfig
} from './pos-offline.service';

// Sync status types
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncResult {
  success: boolean;
  productsSync: number;
  categoriesSync: number;
  salesPushed: number;
  errors: string[];
}

export const posSyncService = {
  // ============================================================================
  // TERMINAL REGISTRATION
  // ============================================================================

  /**
   * Register this device as a POS terminal
   */
  async registerTerminal(
    merchantId: string,
    terminalCode: string,
    name: string,
    location?: string
  ): Promise<TerminalConfig | null> {
    // Verify terminal code exists and belongs to this merchant
    const { data: terminal, error } = await supabaseAdmin
      .from('pos_terminals')
      .select('*')
      .eq('terminal_code', terminalCode)
      .eq('merchant_id', merchantId)
      .single();

    if (error || !terminal) {
      console.error('[Sync] Terminal not found:', error);
      return null;
    }

    // Update terminal as registered
    const { error: updateError } = await supabaseAdmin
      .from('pos_terminals')
      .update({
        is_registered: true,
        registered_at: new Date().toISOString(),
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
        },
      })
      .eq('id', terminal.id);

    if (updateError) {
      console.error('[Sync] Failed to update terminal:', updateError);
      return null;
    }

    // Save config to IndexedDB
    const config: TerminalConfig = {
      terminal_id: terminal.id,
      terminal_code: terminal.terminal_code,
      merchant_id: terminal.merchant_id,
      business_id: terminal.business_id,
      name: terminal.name,
      location: terminal.location,
      settings: terminal.settings || {
        auto_logout_minutes: 15,
        require_pin_for_void: true,
        require_pin_for_discount: true,
        allow_offline_sales: true,
        max_offline_sales: 100,
      },
      registered_at: new Date().toISOString(),
    };

    await posOfflineService.saveTerminalConfig(config);
    return config;
  },

  /**
   * Unregister this terminal
   */
  async unregisterTerminal(): Promise<void> {
    const config = await posOfflineService.getTerminalConfig();
    if (config) {
      await supabaseAdmin
        .from('pos_terminals')
        .update({ is_registered: false })
        .eq('id', config.terminal_id);
    }
    await posOfflineService.clearAllData();
  },

  // ============================================================================
  // STAFF AUTHENTICATION
  // ============================================================================

  /**
   * Authenticate staff with PIN
   */
  async authenticateStaff(
    merchantId: string,
    staffCode: string,
    pin: string
  ): Promise<{ success: boolean; staff?: any; error?: string }> {
    // First check online
    const { data: staff, error } = await supabaseAdmin
      .from('merchant_staff')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('staff_code', staffCode)
      .eq('status', 'active')
      .single();

    if (error || !staff) {
      return { success: false, error: 'Staff not found or inactive' };
    }

    // Check if account is locked
    if (staff.locked_until && new Date(staff.locked_until) > new Date()) {
      return { success: false, error: 'Account is temporarily locked' };
    }

    // Verify PIN - in production, this would be hashed
    // For now, we'll do a simple comparison (should use bcrypt on server)
    const pinHash = await this.hashPin(pin);

    if (staff.pin_hash !== pinHash) {
      // Increment failed attempts
      const newAttempts = (staff.failed_pin_attempts || 0) + 1;
      const updateData: any = { failed_pin_attempts: newAttempts };

      // Lock account after 5 failed attempts for 30 minutes
      if (newAttempts >= 5) {
        updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      }

      await supabaseAdmin
        .from('merchant_staff')
        .update(updateData)
        .eq('id', staff.id);

      return { success: false, error: `Invalid PIN. ${5 - newAttempts} attempts remaining` };
    }

    // Reset failed attempts on success
    await supabaseAdmin
      .from('merchant_staff')
      .update({
        failed_pin_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
      })
      .eq('id', staff.id);

    // Save session to IndexedDB for offline auth
    await posOfflineService.saveStaffSession({
      staff_id: staff.id,
      staff_code: staff.staff_code,
      name: staff.name,
      role: staff.role,
      permissions: staff.permissions,
      pin_hash: pinHash, // Store for offline auth
      logged_in_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    });

    return { success: true, staff };
  },

  /**
   * Hash PIN (simple hash for demo - use bcrypt in production)
   */
  async hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'peeap-salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // ============================================================================
  // DATA SYNC - PULL
  // ============================================================================

  /**
   * Pull products from server to IndexedDB
   */
  async pullProducts(merchantId: string): Promise<number> {
    const { data: products, error } = await supabaseAdmin
      .from('pos_products')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_active', true);

    if (error) {
      console.error('[Sync] Failed to pull products:', error);
      throw new Error('Failed to sync products');
    }

    if (products && products.length > 0) {
      const offlineProducts: POSProduct[] = products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category_id: p.category_id,
        sku: p.sku,
        barcode: p.barcode,
        image_url: p.image_url,
        stock_quantity: p.stock_quantity,
        track_inventory: p.track_inventory,
        is_active: p.is_active,
        merchant_id: p.merchant_id,
        synced_at: new Date().toISOString(),
      }));

      await posOfflineService.saveProducts(offlineProducts);
      await posOfflineService.logSync('products', 'pull', 'success', `Synced ${products.length} products`);
    }

    return products?.length || 0;
  },

  /**
   * Pull categories from server to IndexedDB
   */
  async pullCategories(merchantId: string): Promise<number> {
    const { data: categories, error } = await supabaseAdmin
      .from('pos_categories')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_active', true);

    if (error) {
      console.error('[Sync] Failed to pull categories:', error);
      throw new Error('Failed to sync categories');
    }

    if (categories && categories.length > 0) {
      const offlineCategories: POSCategory[] = categories.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        merchant_id: c.merchant_id,
        synced_at: new Date().toISOString(),
      }));

      await posOfflineService.saveCategories(offlineCategories);
      await posOfflineService.logSync('categories', 'pull', 'success', `Synced ${categories.length} categories`);
    }

    return categories?.length || 0;
  },

  // ============================================================================
  // DATA SYNC - PUSH
  // ============================================================================

  /**
   * Push pending offline sales to server
   */
  async pushPendingSales(): Promise<number> {
    const config = await posOfflineService.getTerminalConfig();
    if (!config) {
      throw new Error('Terminal not registered');
    }

    const pendingSales = await posOfflineService.getPendingSales(config.terminal_id);
    let syncedCount = 0;
    const errors: string[] = [];

    for (const sale of pendingSales) {
      try {
        await posOfflineService.updateSaleStatus(sale.offline_id, 'syncing');

        // Create the sale in Supabase
        const { data: createdSale, error } = await supabaseAdmin
          .from('pos_sales')
          .insert({
            merchant_id: config.merchant_id,
            business_id: config.business_id,
            terminal_id: config.terminal_id,
            staff_id: sale.staff_id,
            staff_name: sale.staff_name,
            items: sale.items,
            subtotal: sale.subtotal,
            tax: sale.tax,
            discount: sale.discount,
            total: sale.total,
            payment_method: sale.payment_method,
            payment_status: sale.payment_status,
            customer_name: sale.customer_name,
            notes: sale.notes,
            offline_id: sale.offline_id,
            created_at: sale.created_at,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Mark as synced
        await posOfflineService.updateSaleStatus(sale.offline_id, 'synced');
        syncedCount++;

        // Also update inventory if tracking is enabled
        for (const item of sale.items) {
          if (item.product_id) {
            await supabaseAdmin.rpc('decrement_stock', {
              p_product_id: item.product_id,
              p_quantity: item.quantity,
            });
          }
        }
      } catch (err: any) {
        console.error('[Sync] Failed to sync sale:', sale.offline_id, err);
        await posOfflineService.updateSaleStatus(sale.offline_id, 'failed', err.message);
        errors.push(`Sale ${sale.offline_id}: ${err.message}`);
      }
    }

    // Update terminal sync status
    await supabaseAdmin
      .from('pos_terminals')
      .update({
        last_sync_at: new Date().toISOString(),
        pending_sync_count: pendingSales.length - syncedCount,
      })
      .eq('id', config.terminal_id);

    await posOfflineService.logSync('sales', 'push', syncedCount > 0 ? 'success' : 'failed',
      `Synced ${syncedCount}/${pendingSales.length} sales`);

    // Clean up synced sales (keep last 100 for history)
    await posOfflineService.deleteSyncedSales();

    return syncedCount;
  },

  // ============================================================================
  // FULL SYNC
  // ============================================================================

  /**
   * Perform full sync (pull and push)
   */
  async fullSync(merchantId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      productsSync: 0,
      categoriesSync: 0,
      salesPushed: 0,
      errors: [],
    };

    try {
      // Pull products
      result.productsSync = await this.pullProducts(merchantId);
    } catch (err: any) {
      result.errors.push(`Products: ${err.message}`);
      result.success = false;
    }

    try {
      // Pull categories
      result.categoriesSync = await this.pullCategories(merchantId);
    } catch (err: any) {
      result.errors.push(`Categories: ${err.message}`);
      result.success = false;
    }

    try {
      // Push pending sales
      result.salesPushed = await this.pushPendingSales();
    } catch (err: any) {
      result.errors.push(`Sales: ${err.message}`);
      result.success = false;
    }

    // Update last sync time
    const config = await posOfflineService.getTerminalConfig();
    if (config) {
      config.last_sync_at = new Date().toISOString();
      await posOfflineService.saveTerminalConfig(config);
    }

    return result;
  },

  // ============================================================================
  // AUTO SYNC
  // ============================================================================

  /**
   * Start auto sync when online
   */
  startAutoSync(merchantId: string, intervalMs: number = 60000): () => void {
    let intervalId: NodeJS.Timeout | null = null;

    const sync = async () => {
      if (posOfflineService.isOnline()) {
        try {
          await this.fullSync(merchantId);
          console.log('[Sync] Auto sync completed');
        } catch (err) {
          console.error('[Sync] Auto sync failed:', err);
        }
      }
    };

    // Initial sync
    sync();

    // Set up interval
    intervalId = setInterval(sync, intervalMs);

    // Return cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  },

  // ============================================================================
  // SERVICE WORKER INTEGRATION
  // ============================================================================

  /**
   * Register for background sync
   */
  async registerBackgroundSync(): Promise<boolean> {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-sales');
        return true;
      } catch (err) {
        console.error('[Sync] Background sync registration failed:', err);
        return false;
      }
    }
    return false;
  },

  /**
   * Request notification permission for sync alerts
   */
  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  },
};

export default posSyncService;

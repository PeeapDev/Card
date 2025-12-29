/**
 * POS Offline Service
 * Handles IndexedDB storage for offline POS functionality
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// ============================================================================
// TYPES
// ============================================================================

export interface POSProduct {
  id: string;
  name: string;
  price: number;
  category_id: string;
  sku?: string;
  barcode?: string;
  image_url?: string;
  stock_quantity?: number;
  track_inventory: boolean;
  is_active: boolean;
  merchant_id: string;
  synced_at: string;
}

export interface POSCategory {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  merchant_id: string;
  synced_at: string;
}

export interface OfflineSale {
  offline_id: string;
  terminal_id: string;
  staff_id?: string;
  staff_name?: string;
  items: Array<{
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
    discount?: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: string;
  payment_status: 'COMPLETED' | 'PENDING';
  customer_name?: string;
  notes?: string;
  created_at: string;
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  sync_attempts: number;
  sync_error?: string;
}

export interface TerminalConfig {
  terminal_id: string;
  terminal_code: string;
  merchant_id: string;
  business_id?: string;
  name: string;
  location?: string;
  settings: {
    auto_logout_minutes: number;
    require_pin_for_void: boolean;
    require_pin_for_discount: boolean;
    allow_offline_sales: boolean;
    max_offline_sales: number;
  };
  registered_at: string;
  last_sync_at?: string;
}

export interface StaffSession {
  staff_id: string;
  staff_code: string;
  name: string;
  role: 'cashier' | 'supervisor' | 'manager' | 'admin';
  permissions: {
    can_void_sale: boolean;
    can_apply_discount: boolean;
    can_view_reports: boolean;
    can_manage_inventory: boolean;
    can_open_drawer: boolean;
    can_process_refund: boolean;
    max_discount_percent: number;
  };
  pin_hash?: string; // Stored locally for offline auth
  logged_in_at: string;
  last_activity_at: string;
}

// ============================================================================
// INDEXEDDB SCHEMA
// ============================================================================

interface POSOfflineDB extends DBSchema {
  products: {
    key: string;
    value: POSProduct;
    indexes: {
      'by-category': string;
      'by-barcode': string;
      'by-sku': string;
      'by-merchant': string;
    };
  };
  categories: {
    key: string;
    value: POSCategory;
    indexes: {
      'by-merchant': string;
    };
  };
  offline_sales: {
    key: string;
    value: OfflineSale;
    indexes: {
      'by-terminal': string;
      'by-status': string;
      'by-date': string;
    };
  };
  terminal_config: {
    key: string;
    value: TerminalConfig;
  };
  staff_session: {
    key: string;
    value: StaffSession;
  };
  sync_log: {
    key: string;
    value: {
      id: string;
      type: 'products' | 'categories' | 'sales' | 'config';
      action: 'sync' | 'push' | 'pull';
      status: 'success' | 'failed';
      timestamp: string;
      details?: string;
    };
  };
}

// ============================================================================
// SERVICE
// ============================================================================

const DB_NAME = 'peeap-pos-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<POSOfflineDB> | null = null;

async function getDB(): Promise<IDBPDatabase<POSOfflineDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<POSOfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Products store
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-category', 'category_id');
        productStore.createIndex('by-barcode', 'barcode');
        productStore.createIndex('by-sku', 'sku');
        productStore.createIndex('by-merchant', 'merchant_id');
      }

      // Categories store
      if (!db.objectStoreNames.contains('categories')) {
        const categoryStore = db.createObjectStore('categories', { keyPath: 'id' });
        categoryStore.createIndex('by-merchant', 'merchant_id');
      }

      // Offline sales store
      if (!db.objectStoreNames.contains('offline_sales')) {
        const salesStore = db.createObjectStore('offline_sales', { keyPath: 'offline_id' });
        salesStore.createIndex('by-terminal', 'terminal_id');
        salesStore.createIndex('by-status', 'sync_status');
        salesStore.createIndex('by-date', 'created_at');
      }

      // Terminal config store (single record)
      if (!db.objectStoreNames.contains('terminal_config')) {
        db.createObjectStore('terminal_config', { keyPath: 'terminal_id' });
      }

      // Staff session store (single active session)
      if (!db.objectStoreNames.contains('staff_session')) {
        db.createObjectStore('staff_session', { keyPath: 'staff_id' });
      }

      // Sync log store
      if (!db.objectStoreNames.contains('sync_log')) {
        db.createObjectStore('sync_log', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

export const posOfflineService = {
  // ============================================================================
  // TERMINAL CONFIG
  // ============================================================================

  async getTerminalConfig(): Promise<TerminalConfig | undefined> {
    const db = await getDB();
    const configs = await db.getAll('terminal_config');
    return configs[0]; // Only one terminal per device
  },

  async saveTerminalConfig(config: TerminalConfig): Promise<void> {
    const db = await getDB();
    await db.put('terminal_config', config);
  },

  async clearTerminalConfig(): Promise<void> {
    const db = await getDB();
    await db.clear('terminal_config');
  },

  async isTerminalRegistered(): Promise<boolean> {
    const config = await this.getTerminalConfig();
    return !!config?.terminal_id;
  },

  // ============================================================================
  // STAFF SESSION
  // ============================================================================

  async getCurrentStaff(): Promise<StaffSession | undefined> {
    const db = await getDB();
    const sessions = await db.getAll('staff_session');
    return sessions[0];
  },

  async saveStaffSession(session: StaffSession): Promise<void> {
    const db = await getDB();
    // Clear any existing session first
    await db.clear('staff_session');
    await db.put('staff_session', session);
  },

  async clearStaffSession(): Promise<void> {
    const db = await getDB();
    await db.clear('staff_session');
  },

  async updateStaffActivity(): Promise<void> {
    const staff = await this.getCurrentStaff();
    if (staff) {
      staff.last_activity_at = new Date().toISOString();
      await this.saveStaffSession(staff);
    }
  },

  async verifyPinOffline(pinHash: string): Promise<boolean> {
    const staff = await this.getCurrentStaff();
    return staff?.pin_hash === pinHash;
  },

  // ============================================================================
  // PRODUCTS
  // ============================================================================

  async getProducts(merchantId?: string): Promise<POSProduct[]> {
    const db = await getDB();
    if (merchantId) {
      return db.getAllFromIndex('products', 'by-merchant', merchantId);
    }
    return db.getAll('products');
  },

  async getProductById(id: string): Promise<POSProduct | undefined> {
    const db = await getDB();
    return db.get('products', id);
  },

  async getProductByBarcode(barcode: string): Promise<POSProduct | undefined> {
    const db = await getDB();
    return db.getFromIndex('products', 'by-barcode', barcode);
  },

  async getProductsBySku(sku: string): Promise<POSProduct | undefined> {
    const db = await getDB();
    return db.getFromIndex('products', 'by-sku', sku);
  },

  async getProductsByCategory(categoryId: string): Promise<POSProduct[]> {
    const db = await getDB();
    return db.getAllFromIndex('products', 'by-category', categoryId);
  },

  async saveProducts(products: POSProduct[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('products', 'readwrite');
    await Promise.all([
      ...products.map(p => tx.store.put(p)),
      tx.done,
    ]);
  },

  async clearProducts(): Promise<void> {
    const db = await getDB();
    await db.clear('products');
  },

  // ============================================================================
  // CATEGORIES
  // ============================================================================

  async getCategories(merchantId?: string): Promise<POSCategory[]> {
    const db = await getDB();
    if (merchantId) {
      return db.getAllFromIndex('categories', 'by-merchant', merchantId);
    }
    return db.getAll('categories');
  },

  async getCategoryById(id: string): Promise<POSCategory | undefined> {
    const db = await getDB();
    return db.get('categories', id);
  },

  async saveCategories(categories: POSCategory[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('categories', 'readwrite');
    await Promise.all([
      ...categories.map(c => tx.store.put(c)),
      tx.done,
    ]);
  },

  async clearCategories(): Promise<void> {
    const db = await getDB();
    await db.clear('categories');
  },

  // ============================================================================
  // OFFLINE SALES
  // ============================================================================

  async saveSale(sale: OfflineSale): Promise<void> {
    const db = await getDB();
    await db.put('offline_sales', sale);
  },

  async getSaleById(offlineId: string): Promise<OfflineSale | undefined> {
    const db = await getDB();
    return db.get('offline_sales', offlineId);
  },

  async getPendingSales(terminalId?: string): Promise<OfflineSale[]> {
    const db = await getDB();
    let sales = await db.getAllFromIndex('offline_sales', 'by-status', 'pending');
    if (terminalId) {
      sales = sales.filter(s => s.terminal_id === terminalId);
    }
    return sales;
  },

  async getAllSales(terminalId?: string): Promise<OfflineSale[]> {
    const db = await getDB();
    let sales = await db.getAll('offline_sales');
    if (terminalId) {
      sales = sales.filter(s => s.terminal_id === terminalId);
    }
    return sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async updateSaleStatus(offlineId: string, status: OfflineSale['sync_status'], error?: string): Promise<void> {
    const db = await getDB();
    const sale = await db.get('offline_sales', offlineId);
    if (sale) {
      sale.sync_status = status;
      sale.sync_attempts = (sale.sync_attempts || 0) + 1;
      if (error) sale.sync_error = error;
      await db.put('offline_sales', sale);
    }
  },

  async deleteSyncedSales(): Promise<number> {
    const db = await getDB();
    const synced = await db.getAllFromIndex('offline_sales', 'by-status', 'synced');
    const tx = db.transaction('offline_sales', 'readwrite');
    await Promise.all([
      ...synced.map(s => tx.store.delete(s.offline_id)),
      tx.done,
    ]);
    return synced.length;
  },

  async getPendingSalesCount(): Promise<number> {
    const sales = await this.getPendingSales();
    return sales.length;
  },

  // ============================================================================
  // SYNC OPERATIONS
  // ============================================================================

  async logSync(type: 'products' | 'categories' | 'sales' | 'config', action: 'sync' | 'push' | 'pull', status: 'success' | 'failed', details?: string): Promise<void> {
    const db = await getDB();
    await db.put('sync_log', {
      id: `${type}-${Date.now()}`,
      type,
      action,
      status,
      timestamp: new Date().toISOString(),
      details,
    });
  },

  async getLastSync(type: 'products' | 'categories' | 'sales' | 'config'): Promise<string | undefined> {
    const db = await getDB();
    const logs = await db.getAll('sync_log');
    const typeLogs = logs
      .filter(l => l.type === type && l.status === 'success')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return typeLogs[0]?.timestamp;
  },

  // ============================================================================
  // UTILITY
  // ============================================================================

  generateOfflineId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  async clearAllData(): Promise<void> {
    const db = await getDB();
    await Promise.all([
      db.clear('products'),
      db.clear('categories'),
      db.clear('offline_sales'),
      db.clear('terminal_config'),
      db.clear('staff_session'),
      db.clear('sync_log'),
    ]);
  },

  async getStorageStats(): Promise<{
    products: number;
    categories: number;
    pendingSales: number;
    totalSales: number;
  }> {
    const db = await getDB();
    const [products, categories, pendingSales, allSales] = await Promise.all([
      db.count('products'),
      db.count('categories'),
      this.getPendingSalesCount(),
      db.count('offline_sales'),
    ]);
    return { products, categories, pendingSales, totalSales: allSales };
  },

  // Check if online
  isOnline(): boolean {
    return navigator.onLine;
  },

  // Listen for online/offline events
  onConnectionChange(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
};

export default posOfflineService;

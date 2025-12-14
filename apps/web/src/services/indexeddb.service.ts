/**
 * IndexedDB Service for Offline Support
 *
 * Stores:
 * - Products (for offline POS)
 * - Categories
 * - Pending Sales (to sync when online)
 * - Cart State
 * - User Settings
 * - General cache
 * - Support tickets
 */

import type { SupportTicket } from './support.service';
import type {
  POSProduct,
  POSCategory,
  POSSale,
  POSSaleItem,
  POSStaff,
  POSCustomer,
  POSLoyaltyProgram,
  POSLoyaltyPoints,
  POSInventoryAlert,
  CartItem,
} from './pos.service';

// Re-export types for consumers
export type {
  POSProduct,
  POSCategory,
  POSSale,
  POSSaleItem,
  POSStaff,
  POSCustomer,
  POSLoyaltyProgram,
  POSLoyaltyPoints,
  POSInventoryAlert,
  CartItem,
};

// Sync queue operation type
export interface SyncQueueOperation {
  id?: number;
  type: string;
  data: Record<string, unknown>;
  endpoint: string;
  method: string;
  created_at?: string;
  retries?: number;
}

// Setting type
export interface StoredSetting<T = unknown> {
  key: string;
  value: T;
  updated_at?: string;
}

// Pending sale type (extends POSSale with offline fields)
export interface PendingSale extends Omit<POSSale, 'id'> {
  local_id?: number;
  synced: boolean;
  server_id?: string;
  synced_at?: string;
}

// Cart storage type
export interface StoredCart {
  merchant_id: string;
  items: CartItem[];
  updated_at: string;
}

// Offline product with sync metadata
export interface OfflineProduct extends POSProduct {
  synced_at?: string;
  pending_sync?: boolean;
}

// Offline staff with sync metadata
export interface OfflineStaff extends POSStaff {
  synced_at?: string;
  pending_sync?: boolean;
}

// Offline customer with sync metadata
export interface OfflineCustomer extends POSCustomer {
  synced_at?: string;
  pending_sync?: boolean;
}

// Inventory log entry
export interface InventoryLogEntry {
  id?: string;
  merchant_id: string;
  product_id: string;
  quantity_change: number;
  new_quantity?: number;
  change_type?: string;
  reason?: string;
  created_at?: string;
  synced_at?: string;
  pending_sync?: boolean;
}

// Sales report type
export interface LocalSalesReport {
  total_sales: number;
  total_revenue: number;
  total_tax: number;
  total_discount: number;
  average_sale: number;
  sales_by_payment_method: Record<string, { count: number; total: number }>;
  sales_by_day: Record<string, { count: number; total: number }>;
  is_offline_data: boolean;
}

const DB_NAME = 'peeap_pos_db';
const DB_VERSION = 4; // Bumped to 4 for general caching stores

// Store names
export const STORES = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  PENDING_SALES: 'pending_sales',
  CART: 'cart',
  SETTINGS: 'settings',
  SYNC_QUEUE: 'sync_queue',
  // New stores for full offline support
  STAFF: 'staff',
  CUSTOMERS: 'customers',
  LOYALTY_PROGRAMS: 'loyalty_programs',
  LOYALTY_POINTS: 'loyalty_points',
  INVENTORY_ALERTS: 'inventory_alerts',
  INVENTORY_LOGS: 'inventory_logs',
  SALES: 'sales',
  // General caching stores
  CACHE: 'cache',
  SUPPORT_TICKETS: 'support_tickets',
} as const;

let db: IDBDatabase | null = null;

// Initialize the database
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Products store
      if (!database.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productStore = database.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        productStore.createIndex('merchant_id', 'merchant_id', { unique: false });
        productStore.createIndex('category_id', 'category_id', { unique: false });
        productStore.createIndex('barcode', 'barcode', { unique: false });
        productStore.createIndex('sku', 'sku', { unique: false });
        productStore.createIndex('synced_at', 'synced_at', { unique: false });
      }

      // Categories store
      if (!database.objectStoreNames.contains(STORES.CATEGORIES)) {
        const categoryStore = database.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
        categoryStore.createIndex('merchant_id', 'merchant_id', { unique: false });
      }

      // Pending sales store (for offline sales)
      if (!database.objectStoreNames.contains(STORES.PENDING_SALES)) {
        const salesStore = database.createObjectStore(STORES.PENDING_SALES, { keyPath: 'local_id', autoIncrement: true });
        salesStore.createIndex('merchant_id', 'merchant_id', { unique: false });
        salesStore.createIndex('created_at', 'created_at', { unique: false });
        salesStore.createIndex('synced', 'synced', { unique: false });
      }

      // Cart store (for persisting cart state)
      if (!database.objectStoreNames.contains(STORES.CART)) {
        database.createObjectStore(STORES.CART, { keyPath: 'merchant_id' });
      }

      // Settings store
      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }

      // Sync queue for any pending operations
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Staff store
      if (!database.objectStoreNames.contains(STORES.STAFF)) {
        const staffStore = database.createObjectStore(STORES.STAFF, { keyPath: 'id' });
        staffStore.createIndex('merchant_id', 'merchant_id', { unique: false });
        staffStore.createIndex('email', 'email', { unique: false });
        staffStore.createIndex('role', 'role', { unique: false });
      }

      // Customers store
      if (!database.objectStoreNames.contains(STORES.CUSTOMERS)) {
        const customerStore = database.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
        customerStore.createIndex('merchant_id', 'merchant_id', { unique: false });
        customerStore.createIndex('phone', 'phone', { unique: false });
        customerStore.createIndex('email', 'email', { unique: false });
      }

      // Loyalty programs store
      if (!database.objectStoreNames.contains(STORES.LOYALTY_PROGRAMS)) {
        const loyaltyStore = database.createObjectStore(STORES.LOYALTY_PROGRAMS, { keyPath: 'id' });
        loyaltyStore.createIndex('merchant_id', 'merchant_id', { unique: false });
      }

      // Loyalty points store
      if (!database.objectStoreNames.contains(STORES.LOYALTY_POINTS)) {
        const pointsStore = database.createObjectStore(STORES.LOYALTY_POINTS, { keyPath: 'id' });
        pointsStore.createIndex('merchant_id', 'merchant_id', { unique: false });
        pointsStore.createIndex('customer_id', 'customer_id', { unique: false });
      }

      // Inventory alerts store
      if (!database.objectStoreNames.contains(STORES.INVENTORY_ALERTS)) {
        const alertStore = database.createObjectStore(STORES.INVENTORY_ALERTS, { keyPath: 'id' });
        alertStore.createIndex('merchant_id', 'merchant_id', { unique: false });
        alertStore.createIndex('product_id', 'product_id', { unique: false });
        alertStore.createIndex('alert_type', 'alert_type', { unique: false });
      }

      // Inventory logs store
      if (!database.objectStoreNames.contains(STORES.INVENTORY_LOGS)) {
        const logStore = database.createObjectStore(STORES.INVENTORY_LOGS, { keyPath: 'id' });
        logStore.createIndex('merchant_id', 'merchant_id', { unique: false });
        logStore.createIndex('product_id', 'product_id', { unique: false });
        logStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Sales store (completed sales for offline reports)
      if (!database.objectStoreNames.contains(STORES.SALES)) {
        const salesStore = database.createObjectStore(STORES.SALES, { keyPath: 'id' });
        salesStore.createIndex('merchant_id', 'merchant_id', { unique: false });
        salesStore.createIndex('created_at', 'created_at', { unique: false });
        salesStore.createIndex('payment_method', 'payment_method', { unique: false });
        salesStore.createIndex('status', 'status', { unique: false });
      }

      // General cache store (for API responses, user data, etc.)
      if (!database.objectStoreNames.contains(STORES.CACHE)) {
        const cacheStore = database.createObjectStore(STORES.CACHE, { keyPath: 'key' });
        cacheStore.createIndex('expires_at', 'expires_at', { unique: false });
      }

      // Support tickets store (for offline viewing)
      if (!database.objectStoreNames.contains(STORES.SUPPORT_TICKETS)) {
        const ticketStore = database.createObjectStore(STORES.SUPPORT_TICKETS, { keyPath: 'id' });
        ticketStore.createIndex('user_id', 'user_id', { unique: false });
        ticketStore.createIndex('status', 'status', { unique: false });
        ticketStore.createIndex('created_at', 'created_at', { unique: false });
      }

    };
  });
};

// Generic get all from store
export const getAll = async <T>(storeName: string, indexName?: string, indexValue?: IDBValidKey): Promise<T[]> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);

    let request: IDBRequest;
    if (indexName && indexValue !== undefined) {
      const index = store.index(indexName);
      request = index.getAll(indexValue);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// Generic get by key
export const getByKey = async <T>(storeName: string, key: IDBValidKey): Promise<T | undefined> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Generic put (add or update)
export const put = async <T>(storeName: string, data: T): Promise<IDBValidKey> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Generic put many
export const putMany = async <T>(storeName: string, items: T[]): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    items.forEach(item => store.put(item));

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// Generic delete
export const deleteByKey = async (storeName: string, key: IDBValidKey): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Clear a store
export const clearStore = async (storeName: string): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// ================== POS-Specific Functions ==================

// Products
export const saveProducts = async (products: POSProduct[], merchantId: string): Promise<void> => {
  const productsWithMeta: OfflineProduct[] = products.map(p => ({
    ...p,
    merchant_id: merchantId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.PRODUCTS, productsWithMeta);
};

export const getProducts = async (merchantId: string): Promise<OfflineProduct[]> => {
  return getAll<OfflineProduct>(STORES.PRODUCTS, 'merchant_id', merchantId);
};

export const getProductByBarcode = async (merchantId: string, barcode: string): Promise<OfflineProduct | undefined> => {
  const products = await getProducts(merchantId);
  return products.find(p => p.barcode === barcode);
};

// Categories
export const saveCategories = async (categories: POSCategory[], merchantId: string): Promise<void> => {
  const categoriesWithMeta = categories.map(c => ({
    ...c,
    merchant_id: merchantId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.CATEGORIES, categoriesWithMeta);
};

export const getCategories = async (merchantId: string): Promise<POSCategory[]> => {
  return getAll<POSCategory>(STORES.CATEGORIES, 'merchant_id', merchantId);
};

// Cart
export const saveCart = async (merchantId: string, cart: CartItem[]): Promise<void> => {
  const storedCart: StoredCart = { merchant_id: merchantId, items: cart, updated_at: new Date().toISOString() };
  await put(STORES.CART, storedCart);
};

export const getCart = async (merchantId: string): Promise<CartItem[]> => {
  const cartData = await getByKey<StoredCart>(STORES.CART, merchantId);
  return cartData?.items || [];
};

export const clearCart = async (merchantId: string): Promise<void> => {
  await deleteByKey(STORES.CART, merchantId);
};

// Pending Sales (offline sales to sync)
export const savePendingSale = async (sale: Omit<PendingSale, 'local_id' | 'synced'>): Promise<number> => {
  const saleWithMeta: PendingSale = {
    ...sale,
    synced: false,
    created_at: new Date().toISOString(),
  };
  const key = await put(STORES.PENDING_SALES, saleWithMeta);
  return key as number;
};

export const getPendingSales = async (merchantId: string): Promise<PendingSale[]> => {
  const allSales = await getAll<PendingSale>(STORES.PENDING_SALES, 'merchant_id', merchantId);
  return allSales.filter(s => !s.synced);
};

export const markSaleAsSynced = async (localId: number, serverId: string): Promise<void> => {
  const sale = await getByKey<PendingSale>(STORES.PENDING_SALES, localId);
  if (sale) {
    sale.synced = true;
    sale.server_id = serverId;
    sale.synced_at = new Date().toISOString();
    await put(STORES.PENDING_SALES, sale);
  }
};

export const deleteSyncedSales = async (): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.PENDING_SALES, 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_SALES);
    const index = store.index('synced');
    const request = index.openCursor(IDBKeyRange.only(true));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// Sync Queue
export const addToSyncQueue = async (operation: Omit<SyncQueueOperation, 'id' | 'created_at' | 'retries'>): Promise<void> => {
  const queueItem: SyncQueueOperation = {
    ...operation,
    created_at: new Date().toISOString(),
    retries: 0,
  };
  await put(STORES.SYNC_QUEUE, queueItem);
};

export const getSyncQueue = async (): Promise<SyncQueueOperation[]> => {
  return getAll<SyncQueueOperation>(STORES.SYNC_QUEUE);
};

export const removeFromSyncQueue = async (id: number): Promise<void> => {
  await deleteByKey(STORES.SYNC_QUEUE, id);
};

// Settings
export const saveSetting = async <T>(key: string, value: T): Promise<void> => {
  const setting: StoredSetting<T> = { key, value, updated_at: new Date().toISOString() };
  await put(STORES.SETTINGS, setting);
};

export const getSetting = async <T>(key: string, defaultValue?: T): Promise<T> => {
  const setting = await getByKey<{ value: T }>(STORES.SETTINGS, key);
  return setting?.value ?? defaultValue as T;
};

// Check if we have offline data
export const hasOfflineData = async (merchantId: string): Promise<boolean> => {
  const products = await getProducts(merchantId);
  return products.length > 0;
};

// Get last sync time
export const getLastSyncTime = async (merchantId: string): Promise<string | null> => {
  return getSetting(`last_sync_${merchantId}`, null);
};

export const setLastSyncTime = async (merchantId: string): Promise<void> => {
  await saveSetting(`last_sync_${merchantId}`, new Date().toISOString());
};

// ================== Staff Functions ==================

export const saveStaff = async (staff: POSStaff[], merchantId: string): Promise<void> => {
  const staffWithMeta: OfflineStaff[] = staff.map(s => ({
    ...s,
    merchant_id: merchantId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.STAFF, staffWithMeta);
};

export const getStaff = async (merchantId: string): Promise<OfflineStaff[]> => {
  return getAll<OfflineStaff>(STORES.STAFF, 'merchant_id', merchantId);
};

export const getStaffById = async (staffId: string): Promise<OfflineStaff | undefined> => {
  return getByKey<OfflineStaff>(STORES.STAFF, staffId);
};

export const saveStaffMember = async (staff: Partial<OfflineStaff>): Promise<void> => {
  const staffWithMeta: OfflineStaff = {
    ...staff as OfflineStaff,
    synced_at: new Date().toISOString(),
    pending_sync: true,
  };
  await put(STORES.STAFF, staffWithMeta);
};

export const deleteStaffMember = async (staffId: string): Promise<void> => {
  await deleteByKey(STORES.STAFF, staffId);
};

// ================== Customer Functions ==================

export const saveCustomers = async (customers: POSCustomer[], merchantId: string): Promise<void> => {
  const customersWithMeta: OfflineCustomer[] = customers.map(c => ({
    ...c,
    merchant_id: merchantId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.CUSTOMERS, customersWithMeta);
};

export const getCustomers = async (merchantId: string): Promise<OfflineCustomer[]> => {
  return getAll<OfflineCustomer>(STORES.CUSTOMERS, 'merchant_id', merchantId);
};

export const getCustomerById = async (customerId: string): Promise<OfflineCustomer | undefined> => {
  return getByKey<OfflineCustomer>(STORES.CUSTOMERS, customerId);
};

export const getCustomerByPhone = async (merchantId: string, phone: string): Promise<OfflineCustomer | undefined> => {
  const customers = await getCustomers(merchantId);
  return customers.find(c => c.phone === phone);
};

export const saveCustomer = async (customer: Partial<OfflineCustomer>): Promise<void> => {
  const customerWithMeta: OfflineCustomer = {
    ...customer as OfflineCustomer,
    synced_at: new Date().toISOString(),
    pending_sync: true,
  };
  await put(STORES.CUSTOMERS, customerWithMeta);
};

// ================== Loyalty Program Functions ==================

export const saveLoyaltyPrograms = async (programs: POSLoyaltyProgram[], merchantId: string): Promise<void> => {
  const programsWithMeta = programs.map(p => ({
    ...p,
    merchant_id: merchantId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.LOYALTY_PROGRAMS, programsWithMeta);
};

export const getLoyaltyPrograms = async (merchantId: string): Promise<POSLoyaltyProgram[]> => {
  return getAll<POSLoyaltyProgram>(STORES.LOYALTY_PROGRAMS, 'merchant_id', merchantId);
};

export const getLoyaltyProgram = async (merchantId: string): Promise<POSLoyaltyProgram | undefined> => {
  const programs = await getLoyaltyPrograms(merchantId);
  return programs[0]; // Usually just one program per merchant
};

export const saveLoyaltyProgram = async (program: Partial<POSLoyaltyProgram>): Promise<void> => {
  await put(STORES.LOYALTY_PROGRAMS, {
    ...program,
    synced_at: new Date().toISOString(),
    pending_sync: true,
  });
};

// ================== Loyalty Points Functions ==================

export const saveLoyaltyPoints = async (points: POSLoyaltyPoints[], merchantId: string): Promise<void> => {
  const pointsWithMeta = points.map(p => ({
    ...p,
    merchant_id: merchantId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.LOYALTY_POINTS, pointsWithMeta);
};

export const getLoyaltyPointsList = async (merchantId: string): Promise<POSLoyaltyPoints[]> => {
  return getAll<POSLoyaltyPoints>(STORES.LOYALTY_POINTS, 'merchant_id', merchantId);
};

export const getCustomerLoyaltyPoints = async (customerId: string): Promise<POSLoyaltyPoints | undefined> => {
  const allPoints = await getAll<POSLoyaltyPoints>(STORES.LOYALTY_POINTS, 'customer_id', customerId);
  return allPoints[0];
};

export const updateLoyaltyPoints = async (points: Partial<POSLoyaltyPoints>): Promise<void> => {
  await put(STORES.LOYALTY_POINTS, {
    ...points,
    synced_at: new Date().toISOString(),
    pending_sync: true,
  });
};

// ================== Inventory Functions ==================

export const saveInventoryAlerts = async (alerts: POSInventoryAlert[], merchantId: string): Promise<void> => {
  const alertsWithMeta = alerts.map(a => ({
    ...a,
    merchant_id: merchantId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.INVENTORY_ALERTS, alertsWithMeta);
};

export const getInventoryAlerts = async (merchantId: string): Promise<POSInventoryAlert[]> => {
  return getAll<POSInventoryAlert>(STORES.INVENTORY_ALERTS, 'merchant_id', merchantId);
};

export const saveInventoryLogs = async (logs: InventoryLogEntry[], merchantId: string): Promise<void> => {
  const logsWithMeta: InventoryLogEntry[] = logs.map(l => ({
    ...l,
    merchant_id: merchantId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.INVENTORY_LOGS, logsWithMeta);
};

export const getInventoryLogs = async (merchantId: string): Promise<InventoryLogEntry[]> => {
  return getAll<InventoryLogEntry>(STORES.INVENTORY_LOGS, 'merchant_id', merchantId);
};

export const addInventoryLog = async (log: Partial<InventoryLogEntry>): Promise<void> => {
  const logWithMeta: InventoryLogEntry = {
    ...log as InventoryLogEntry,
    id: log.id || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: log.created_at || new Date().toISOString(),
    synced_at: new Date().toISOString(),
    pending_sync: true,
  };
  await put(STORES.INVENTORY_LOGS, logWithMeta);
};

// Update product stock locally
export const updateProductStock = async (productId: string, newQuantity: number): Promise<void> => {
  const product = await getByKey<OfflineProduct>(STORES.PRODUCTS, productId);
  if (product) {
    product.stock_quantity = newQuantity;
    product.pending_sync = true;
    await put(STORES.PRODUCTS, product);
  }
};

// ================== Sales/Reports Functions ==================

export const saveSales = async (sales: POSSale[], merchantId: string): Promise<void> => {
  const salesWithMeta = sales.map(s => ({
    ...s,
    merchant_id: merchantId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.SALES, salesWithMeta);
};

export const getSales = async (merchantId: string): Promise<POSSale[]> => {
  return getAll<POSSale>(STORES.SALES, 'merchant_id', merchantId);
};

export const getSalesByDateRange = async (merchantId: string, startDate: string, endDate: string): Promise<POSSale[]> => {
  const allSales = await getSales(merchantId);
  return allSales.filter(sale => {
    const saleDate = new Date(sale.created_at || '');
    return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
  });
};

// Calculate sales report from local data
export const calculateLocalSalesReport = async (merchantId: string, startDate: string, endDate: string): Promise<LocalSalesReport> => {
  const sales = await getSalesByDateRange(merchantId, startDate, endDate);

  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  const totalTax = sales.reduce((sum, sale) => sum + (sale.tax_amount || 0), 0);
  const totalDiscount = sales.reduce((sum, sale) => sum + (sale.discount_amount || 0), 0);

  // Group by payment method
  const salesByPaymentMethod: Record<string, { count: number; total: number }> = {};
  sales.forEach(sale => {
    const method = sale.payment_method || 'unknown';
    if (!salesByPaymentMethod[method]) {
      salesByPaymentMethod[method] = { count: 0, total: 0 };
    }
    salesByPaymentMethod[method].count++;
    salesByPaymentMethod[method].total += sale.total_amount || 0;
  });

  // Group by day
  const salesByDay: Record<string, { count: number; total: number }> = {};
  sales.forEach(sale => {
    const day = new Date(sale.created_at || '').toISOString().split('T')[0];
    if (!salesByDay[day]) {
      salesByDay[day] = { count: 0, total: 0 };
    }
    salesByDay[day].count++;
    salesByDay[day].total += sale.total_amount || 0;
  });

  return {
    total_sales: totalSales,
    total_revenue: totalRevenue,
    total_tax: totalTax,
    total_discount: totalDiscount,
    average_sale: totalSales > 0 ? totalRevenue / totalSales : 0,
    sales_by_payment_method: salesByPaymentMethod,
    sales_by_day: salesByDay,
    is_offline_data: true,
  };
};

// ================== General Caching Functions ==================

// Cache entry type
export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  expires_at: string;
  created_at: string;
}

// Set cache with TTL (time to live in seconds)
export const setCache = async <T>(key: string, data: T, ttlSeconds: number = 3600): Promise<void> => {
  const entry: CacheEntry<T> = {
    key,
    data,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  };
  await put(STORES.CACHE, entry);
};

// Get cache entry (returns undefined if expired or not found)
export const getCache = async <T>(key: string): Promise<T | undefined> => {
  const entry = await getByKey<CacheEntry<T>>(STORES.CACHE, key);
  if (!entry) return undefined;

  // Check if expired
  if (new Date(entry.expires_at) < new Date()) {
    await deleteByKey(STORES.CACHE, key);
    return undefined;
  }

  return entry.data;
};

// Delete cache entry
export const deleteCache = async (key: string): Promise<void> => {
  await deleteByKey(STORES.CACHE, key);
};

// Clear expired cache entries
export const clearExpiredCache = async (): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.CACHE, 'readwrite');
    const store = transaction.objectStore(STORES.CACHE);
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const entry = cursor.value as CacheEntry;
        if (new Date(entry.expires_at) < new Date()) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// ================== Support Ticket Caching Functions ==================

// Save support tickets to cache
export const saveSupportTickets = async (tickets: SupportTicket[], userId: string): Promise<void> => {
  const ticketsWithMeta = tickets.map(t => ({
    ...t,
    user_id: userId,
    cached_at: new Date().toISOString(),
  }));
  await putMany(STORES.SUPPORT_TICKETS, ticketsWithMeta);
};

// Get cached support tickets
export const getCachedSupportTickets = async (userId: string): Promise<SupportTicket[]> => {
  return getAll<SupportTicket>(STORES.SUPPORT_TICKETS, 'user_id', userId);
};

// Clear support ticket cache
export const clearSupportTicketsCache = async (): Promise<void> => {
  await clearStore(STORES.SUPPORT_TICKETS);
};

// Export the service
export const indexedDBService = {
  initDB,
  getAll,
  getByKey,
  put,
  putMany,
  deleteByKey,
  clearStore,
  // POS specific
  saveProducts,
  getProducts,
  getProductByBarcode,
  saveCategories,
  getCategories,
  saveCart,
  getCart,
  clearCart,
  savePendingSale,
  getPendingSales,
  markSaleAsSynced,
  deleteSyncedSales,
  addToSyncQueue,
  getSyncQueue,
  removeFromSyncQueue,
  saveSetting,
  getSetting,
  hasOfflineData,
  getLastSyncTime,
  setLastSyncTime,
  // Staff
  saveStaff,
  getStaff,
  getStaffById,
  saveStaffMember,
  deleteStaffMember,
  // Customers
  saveCustomers,
  getCustomers,
  getCustomerById,
  getCustomerByPhone,
  saveCustomer,
  // Loyalty Programs
  saveLoyaltyPrograms,
  getLoyaltyPrograms,
  getLoyaltyProgram,
  saveLoyaltyProgram,
  // Loyalty Points
  saveLoyaltyPoints,
  getLoyaltyPointsList,
  getCustomerLoyaltyPoints,
  updateLoyaltyPoints,
  // Inventory
  saveInventoryAlerts,
  getInventoryAlerts,
  saveInventoryLogs,
  getInventoryLogs,
  addInventoryLog,
  updateProductStock,
  // Sales/Reports
  saveSales,
  getSales,
  getSalesByDateRange,
  calculateLocalSalesReport,
  // General caching
  setCache,
  getCache,
  deleteCache,
  clearExpiredCache,
  // Support ticket caching
  saveSupportTickets,
  getCachedSupportTickets,
  clearSupportTicketsCache,
};

export default indexedDBService;

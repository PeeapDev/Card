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
const DB_VERSION = 7; // Bumped to 7 for admin notifications

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
  // POS Management stores
  SUPPLIERS: 'suppliers',
  DISCOUNTS: 'discounts',
  PURCHASE_ORDERS: 'purchase_orders',
  // Event Management stores
  EVENTS: 'events',
  EVENT_TICKET_TYPES: 'event_ticket_types',
  EVENT_TICKETS: 'event_tickets',
  EVENT_STAFF: 'event_staff',
  EVENT_SCANS: 'event_scans',
  // Admin Notifications store
  ADMIN_NOTIFICATIONS: 'admin_notifications',
} as const;

let db: IDBDatabase | null = null;

// Initialize the database with timeout
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.warn('IndexedDB initialization timed out');
      reject(new Error('IndexedDB timeout'));
    }, 5000);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      clearTimeout(timeout);
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      clearTimeout(timeout);
      db = request.result;
      resolve(db);
    };

    // Handle blocked event (when another tab has the db open with old version)
    request.onblocked = () => {
      clearTimeout(timeout);
      console.warn('IndexedDB upgrade blocked - close other tabs');
      reject(new Error('IndexedDB blocked'));
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

      // Suppliers store
      if (!database.objectStoreNames.contains(STORES.SUPPLIERS)) {
        const supplierStore = database.createObjectStore(STORES.SUPPLIERS, { keyPath: 'id' });
        supplierStore.createIndex('merchant_id', 'merchant_id', { unique: false });
        supplierStore.createIndex('status', 'status', { unique: false });
      }

      // Discounts store
      if (!database.objectStoreNames.contains(STORES.DISCOUNTS)) {
        const discountStore = database.createObjectStore(STORES.DISCOUNTS, { keyPath: 'id' });
        discountStore.createIndex('merchant_id', 'merchant_id', { unique: false });
        discountStore.createIndex('is_active', 'is_active', { unique: false });
        discountStore.createIndex('code', 'code', { unique: false });
      }

      // Purchase orders store
      if (!database.objectStoreNames.contains(STORES.PURCHASE_ORDERS)) {
        const poStore = database.createObjectStore(STORES.PURCHASE_ORDERS, { keyPath: 'id' });
        poStore.createIndex('merchant_id', 'merchant_id', { unique: false });
        poStore.createIndex('supplier_id', 'supplier_id', { unique: false });
        poStore.createIndex('status', 'status', { unique: false });
        poStore.createIndex('order_date', 'order_date', { unique: false });
      }

      // ================== Event Management Stores ==================

      // Events store
      if (!database.objectStoreNames.contains(STORES.EVENTS)) {
        const eventStore = database.createObjectStore(STORES.EVENTS, { keyPath: 'id' });
        eventStore.createIndex('merchant_id', 'merchant_id', { unique: false });
        eventStore.createIndex('status', 'status', { unique: false });
        eventStore.createIndex('start_date', 'start_date', { unique: false });
        eventStore.createIndex('end_date', 'end_date', { unique: false });
      }

      // Event ticket types store
      if (!database.objectStoreNames.contains(STORES.EVENT_TICKET_TYPES)) {
        const ticketTypeStore = database.createObjectStore(STORES.EVENT_TICKET_TYPES, { keyPath: 'id' });
        ticketTypeStore.createIndex('event_id', 'event_id', { unique: false });
        ticketTypeStore.createIndex('merchant_id', 'merchant_id', { unique: false });
      }

      // Event tickets (purchased) store
      if (!database.objectStoreNames.contains(STORES.EVENT_TICKETS)) {
        const ticketStore = database.createObjectStore(STORES.EVENT_TICKETS, { keyPath: 'id' });
        ticketStore.createIndex('event_id', 'event_id', { unique: false });
        ticketStore.createIndex('ticket_type_id', 'ticket_type_id', { unique: false });
        ticketStore.createIndex('user_id', 'user_id', { unique: false });
        ticketStore.createIndex('qr_code', 'qr_code', { unique: false });
        ticketStore.createIndex('status', 'status', { unique: false });
      }

      // Event staff store
      if (!database.objectStoreNames.contains(STORES.EVENT_STAFF)) {
        const eventStaffStore = database.createObjectStore(STORES.EVENT_STAFF, { keyPath: 'id' });
        eventStaffStore.createIndex('event_id', 'event_id', { unique: false });
        eventStaffStore.createIndex('merchant_id', 'merchant_id', { unique: false });
        eventStaffStore.createIndex('user_id', 'user_id', { unique: false });
        eventStaffStore.createIndex('invitation_status', 'invitation_status', { unique: false });
      }

      // Event scans store (for analytics)
      if (!database.objectStoreNames.contains(STORES.EVENT_SCANS)) {
        const scanStore = database.createObjectStore(STORES.EVENT_SCANS, { keyPath: 'id' });
        scanStore.createIndex('event_id', 'event_id', { unique: false });
        scanStore.createIndex('ticket_id', 'ticket_id', { unique: false });
        scanStore.createIndex('staff_id', 'staff_id', { unique: false });
        scanStore.createIndex('scanned_at', 'scanned_at', { unique: false });
      }

      // ================== Admin Notifications Store ==================
      if (!database.objectStoreNames.contains(STORES.ADMIN_NOTIFICATIONS)) {
        const adminNotifStore = database.createObjectStore(STORES.ADMIN_NOTIFICATIONS, { keyPath: 'id' });
        adminNotifStore.createIndex('type', 'type', { unique: false });
        adminNotifStore.createIndex('status', 'status', { unique: false });
        adminNotifStore.createIndex('priority', 'priority', { unique: false });
        adminNotifStore.createIndex('created_at', 'created_at', { unique: false });
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

// ================== Supplier Types and Functions ==================

export interface OfflineSupplier {
  id: string;
  merchant_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  credit_limit?: number;
  bank_name?: string;
  account_number?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'blocked';
  created_at?: string;
  updated_at?: string;
  synced_at?: string;
  pending_sync?: boolean;
}

export const saveSuppliers = async (suppliers: OfflineSupplier[], merchantId: string): Promise<void> => {
  const suppliersWithMeta: OfflineSupplier[] = suppliers.map(s => ({
    ...s,
    merchant_id: merchantId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.SUPPLIERS, suppliersWithMeta);
};

export const getSuppliers = async (merchantId: string): Promise<OfflineSupplier[]> => {
  return getAll<OfflineSupplier>(STORES.SUPPLIERS, 'merchant_id', merchantId);
};

export const getSupplierById = async (supplierId: string): Promise<OfflineSupplier | undefined> => {
  return getByKey<OfflineSupplier>(STORES.SUPPLIERS, supplierId);
};

export const saveSupplier = async (supplier: Partial<OfflineSupplier>): Promise<void> => {
  const supplierWithMeta: OfflineSupplier = {
    ...supplier as OfflineSupplier,
    synced_at: new Date().toISOString(),
    pending_sync: true,
  };
  await put(STORES.SUPPLIERS, supplierWithMeta);
};

export const deleteSupplier = async (supplierId: string): Promise<void> => {
  await deleteByKey(STORES.SUPPLIERS, supplierId);
};

// ================== Discount Types and Functions ==================

export interface OfflineDiscount {
  id: string;
  merchant_id: string;
  name: string;
  code?: string;
  type: 'percentage' | 'fixed' | 'bogo' | 'bundle';
  value: number;
  min_purchase?: number;
  max_discount?: number;
  usage_limit?: number;
  usage_count?: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  applies_to?: 'all' | 'category' | 'product';
  category_ids?: string[];
  product_ids?: string[];
  created_at?: string;
  updated_at?: string;
  synced_at?: string;
  pending_sync?: boolean;
}

export const saveDiscounts = async (discounts: OfflineDiscount[], merchantId: string): Promise<void> => {
  const discountsWithMeta: OfflineDiscount[] = discounts.map(d => ({
    ...d,
    merchant_id: merchantId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.DISCOUNTS, discountsWithMeta);
};

export const getDiscounts = async (merchantId: string): Promise<OfflineDiscount[]> => {
  return getAll<OfflineDiscount>(STORES.DISCOUNTS, 'merchant_id', merchantId);
};

export const getDiscountById = async (discountId: string): Promise<OfflineDiscount | undefined> => {
  return getByKey<OfflineDiscount>(STORES.DISCOUNTS, discountId);
};

export const getDiscountByCode = async (merchantId: string, code: string): Promise<OfflineDiscount | undefined> => {
  const discounts = await getDiscounts(merchantId);
  return discounts.find(d => d.code?.toLowerCase() === code.toLowerCase());
};

export const saveDiscount = async (discount: Partial<OfflineDiscount>): Promise<void> => {
  const discountWithMeta: OfflineDiscount = {
    ...discount as OfflineDiscount,
    synced_at: new Date().toISOString(),
    pending_sync: true,
  };
  await put(STORES.DISCOUNTS, discountWithMeta);
};

export const deleteDiscount = async (discountId: string): Promise<void> => {
  await deleteByKey(STORES.DISCOUNTS, discountId);
};

// ================== Purchase Order Types and Functions ==================

export interface PurchaseOrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  tax_rate?: number;
  total: number;
}

export interface OfflinePurchaseOrder {
  id: string;
  merchant_id: string;
  supplier_id: string;
  supplier_name?: string;
  order_number: string;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  order_date: string;
  expected_date?: string;
  received_date?: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  synced_at?: string;
  pending_sync?: boolean;
}

export const savePurchaseOrders = async (orders: OfflinePurchaseOrder[], merchantId: string): Promise<void> => {
  const ordersWithMeta: OfflinePurchaseOrder[] = orders.map(o => ({
    ...o,
    merchant_id: merchantId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.PURCHASE_ORDERS, ordersWithMeta);
};

export const getPurchaseOrders = async (merchantId: string): Promise<OfflinePurchaseOrder[]> => {
  return getAll<OfflinePurchaseOrder>(STORES.PURCHASE_ORDERS, 'merchant_id', merchantId);
};

export const getPurchaseOrderById = async (orderId: string): Promise<OfflinePurchaseOrder | undefined> => {
  return getByKey<OfflinePurchaseOrder>(STORES.PURCHASE_ORDERS, orderId);
};

export const getPurchaseOrdersBySupplier = async (merchantId: string, supplierId: string): Promise<OfflinePurchaseOrder[]> => {
  const orders = await getPurchaseOrders(merchantId);
  return orders.filter(o => o.supplier_id === supplierId);
};

export const savePurchaseOrder = async (order: Partial<OfflinePurchaseOrder>): Promise<void> => {
  const orderWithMeta: OfflinePurchaseOrder = {
    ...order as OfflinePurchaseOrder,
    synced_at: new Date().toISOString(),
    pending_sync: true,
  };
  await put(STORES.PURCHASE_ORDERS, orderWithMeta);
};

export const deletePurchaseOrder = async (orderId: string): Promise<void> => {
  await deleteByKey(STORES.PURCHASE_ORDERS, orderId);
};

// ================== Event Management Types ==================

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type EventStaffInvitationStatus = 'pending' | 'accepted' | 'declined';
export type EventTicketStatus = 'valid' | 'used' | 'cancelled' | 'refunded';

export interface OfflineEvent {
  id: string;
  merchant_id: string;
  title: string;
  description?: string;
  location?: string;
  venue_name?: string;
  address?: string;
  city?: string;
  country?: string;
  start_date: string;
  end_date: string;
  timezone?: string;
  cover_image?: string;
  status: EventStatus;
  is_free: boolean;
  capacity?: number;
  tickets_sold?: number;
  total_revenue?: number;
  settings?: {
    require_approval?: boolean;
    allow_refunds?: boolean;
    refund_deadline_hours?: number;
    max_tickets_per_order?: number;
    show_remaining_tickets?: boolean;
  };
  created_at?: string;
  updated_at?: string;
  synced_at?: string;
  pending_sync?: boolean;
}

export interface OfflineEventTicketType {
  id: string;
  event_id: string;
  merchant_id: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  quantity_available: number;
  quantity_sold?: number;
  max_per_order?: number;
  sale_start_date?: string;
  sale_end_date?: string;
  is_active: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  synced_at?: string;
  pending_sync?: boolean;
}

export interface OfflineEventTicket {
  id: string;
  event_id: string;
  ticket_type_id: string;
  user_id?: string;
  merchant_id: string;
  ticket_number: string;
  qr_code: string;
  status: EventTicketStatus;
  purchaser_name?: string;
  purchaser_email?: string;
  purchaser_phone?: string;
  attendee_name?: string;
  price_paid: number;
  currency?: string;
  payment_reference?: string;
  scanned_at?: string;
  scanned_by?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  synced_at?: string;
  pending_sync?: boolean;
}

export interface OfflineEventStaff {
  id: string;
  event_id: string;
  merchant_id: string;
  user_id: string;
  invitation_status: EventStaffInvitationStatus;
  wizard_completed: boolean;
  invited_at?: string;
  accepted_at?: string;
  declined_at?: string;
  scan_count?: number;
  last_scan_at?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  synced_at?: string;
  pending_sync?: boolean;
}

export interface OfflineEventScan {
  id: string;
  event_id: string;
  ticket_id: string;
  staff_id: string;
  scanned_at: string;
  scan_result: 'valid' | 'invalid' | 'already_used' | 'cancelled';
  ticket_number?: string;
  attendee_name?: string;
  notes?: string;
  synced_at?: string;
  pending_sync?: boolean;
}

// ================== Event Management Functions ==================

// Events
export const saveEvents = async (events: OfflineEvent[], merchantId: string): Promise<void> => {
  const eventsWithMeta: OfflineEvent[] = events.map(e => ({
    ...e,
    merchant_id: merchantId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.EVENTS, eventsWithMeta);
};

export const getEvents = async (merchantId: string): Promise<OfflineEvent[]> => {
  return getAll<OfflineEvent>(STORES.EVENTS, 'merchant_id', merchantId);
};

export const getEventById = async (eventId: string): Promise<OfflineEvent | undefined> => {
  return getByKey<OfflineEvent>(STORES.EVENTS, eventId);
};

export const getEventsByStatus = async (merchantId: string, status: EventStatus): Promise<OfflineEvent[]> => {
  const events = await getEvents(merchantId);
  return events.filter(e => e.status === status);
};

export const getUpcomingEvents = async (merchantId: string): Promise<OfflineEvent[]> => {
  const events = await getEvents(merchantId);
  const now = new Date().toISOString();
  return events.filter(e => e.start_date > now && e.status === 'published');
};

export const saveEvent = async (event: Partial<OfflineEvent>): Promise<void> => {
  const eventWithMeta: OfflineEvent = {
    ...event as OfflineEvent,
    synced_at: new Date().toISOString(),
    pending_sync: true,
  };
  await put(STORES.EVENTS, eventWithMeta);
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  await deleteByKey(STORES.EVENTS, eventId);
};

// Event Ticket Types
export const saveEventTicketTypes = async (ticketTypes: OfflineEventTicketType[], eventId: string): Promise<void> => {
  const typesWithMeta: OfflineEventTicketType[] = ticketTypes.map(t => ({
    ...t,
    event_id: eventId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.EVENT_TICKET_TYPES, typesWithMeta);
};

export const getEventTicketTypes = async (eventId: string): Promise<OfflineEventTicketType[]> => {
  return getAll<OfflineEventTicketType>(STORES.EVENT_TICKET_TYPES, 'event_id', eventId);
};

export const getEventTicketTypeById = async (ticketTypeId: string): Promise<OfflineEventTicketType | undefined> => {
  return getByKey<OfflineEventTicketType>(STORES.EVENT_TICKET_TYPES, ticketTypeId);
};

export const saveEventTicketType = async (ticketType: Partial<OfflineEventTicketType>): Promise<void> => {
  const typeWithMeta: OfflineEventTicketType = {
    ...ticketType as OfflineEventTicketType,
    synced_at: new Date().toISOString(),
    pending_sync: true,
  };
  await put(STORES.EVENT_TICKET_TYPES, typeWithMeta);
};

export const deleteEventTicketType = async (ticketTypeId: string): Promise<void> => {
  await deleteByKey(STORES.EVENT_TICKET_TYPES, ticketTypeId);
};

// Event Tickets (Purchased)
export const saveEventTickets = async (tickets: OfflineEventTicket[], eventId: string): Promise<void> => {
  const ticketsWithMeta: OfflineEventTicket[] = tickets.map(t => ({
    ...t,
    event_id: eventId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.EVENT_TICKETS, ticketsWithMeta);
};

export const getEventTickets = async (eventId: string): Promise<OfflineEventTicket[]> => {
  return getAll<OfflineEventTicket>(STORES.EVENT_TICKETS, 'event_id', eventId);
};

export const getEventTicketById = async (ticketId: string): Promise<OfflineEventTicket | undefined> => {
  return getByKey<OfflineEventTicket>(STORES.EVENT_TICKETS, ticketId);
};

export const getEventTicketByQRCode = async (qrCode: string): Promise<OfflineEventTicket | undefined> => {
  const allTickets = await getAll<OfflineEventTicket>(STORES.EVENT_TICKETS);
  return allTickets.find(t => t.qr_code === qrCode);
};

export const getUserEventTickets = async (userId: string): Promise<OfflineEventTicket[]> => {
  return getAll<OfflineEventTicket>(STORES.EVENT_TICKETS, 'user_id', userId);
};

export const saveEventTicket = async (ticket: Partial<OfflineEventTicket>): Promise<void> => {
  const ticketWithMeta: OfflineEventTicket = {
    ...ticket as OfflineEventTicket,
    synced_at: new Date().toISOString(),
    pending_sync: true,
  };
  await put(STORES.EVENT_TICKETS, ticketWithMeta);
};

export const updateEventTicketStatus = async (ticketId: string, status: EventTicketStatus, scannedBy?: string): Promise<void> => {
  const ticket = await getEventTicketById(ticketId);
  if (ticket) {
    ticket.status = status;
    if (status === 'used' && scannedBy) {
      ticket.scanned_at = new Date().toISOString();
      ticket.scanned_by = scannedBy;
    }
    ticket.pending_sync = true;
    await put(STORES.EVENT_TICKETS, ticket);
  }
};

// Event Staff
export const saveEventStaffList = async (staff: OfflineEventStaff[], eventId: string): Promise<void> => {
  const staffWithMeta: OfflineEventStaff[] = staff.map(s => ({
    ...s,
    event_id: eventId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.EVENT_STAFF, staffWithMeta);
};

export const getEventStaff = async (eventId: string): Promise<OfflineEventStaff[]> => {
  return getAll<OfflineEventStaff>(STORES.EVENT_STAFF, 'event_id', eventId);
};

export const getEventStaffById = async (staffId: string): Promise<OfflineEventStaff | undefined> => {
  return getByKey<OfflineEventStaff>(STORES.EVENT_STAFF, staffId);
};

export const getEventStaffByUserId = async (userId: string): Promise<OfflineEventStaff[]> => {
  return getAll<OfflineEventStaff>(STORES.EVENT_STAFF, 'user_id', userId);
};

export const getAcceptedEventStaffForUser = async (userId: string): Promise<OfflineEventStaff[]> => {
  const allStaff = await getEventStaffByUserId(userId);
  return allStaff.filter(s => s.invitation_status === 'accepted' && s.is_active);
};

export const saveEventStaffMember = async (staff: Partial<OfflineEventStaff>): Promise<void> => {
  const staffWithMeta: OfflineEventStaff = {
    ...staff as OfflineEventStaff,
    synced_at: new Date().toISOString(),
    pending_sync: true,
  };
  await put(STORES.EVENT_STAFF, staffWithMeta);
};

export const updateEventStaffWizardCompleted = async (staffId: string): Promise<void> => {
  const staff = await getEventStaffById(staffId);
  if (staff) {
    staff.wizard_completed = true;
    staff.pending_sync = true;
    await put(STORES.EVENT_STAFF, staff);
  }
};

export const deleteEventStaffMember = async (staffId: string): Promise<void> => {
  await deleteByKey(STORES.EVENT_STAFF, staffId);
};

// Event Scans (Analytics)
export const saveEventScans = async (scans: OfflineEventScan[], eventId: string): Promise<void> => {
  const scansWithMeta: OfflineEventScan[] = scans.map(s => ({
    ...s,
    event_id: eventId,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.EVENT_SCANS, scansWithMeta);
};

export const getEventScans = async (eventId: string): Promise<OfflineEventScan[]> => {
  return getAll<OfflineEventScan>(STORES.EVENT_SCANS, 'event_id', eventId);
};

export const getEventScansByStaff = async (staffId: string): Promise<OfflineEventScan[]> => {
  return getAll<OfflineEventScan>(STORES.EVENT_SCANS, 'staff_id', staffId);
};

export const addEventScan = async (scan: Partial<OfflineEventScan>): Promise<void> => {
  const scanWithMeta: OfflineEventScan = {
    ...scan as OfflineEventScan,
    id: scan.id || `offline_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    scanned_at: scan.scanned_at || new Date().toISOString(),
    synced_at: new Date().toISOString(),
    pending_sync: true,
  };
  await put(STORES.EVENT_SCANS, scanWithMeta);
};

export const getEventAnalytics = async (eventId: string): Promise<{
  totalTickets: number;
  ticketsScanned: number;
  ticketsByType: Record<string, { sold: number; scanned: number }>;
  scansByStaff: Record<string, number>;
  scansByHour: Record<string, number>;
}> => {
  const tickets = await getEventTickets(eventId);
  const scans = await getEventScans(eventId);
  const ticketTypes = await getEventTicketTypes(eventId);

  const ticketsByType: Record<string, { sold: number; scanned: number }> = {};
  ticketTypes.forEach(type => {
    ticketsByType[type.id] = { sold: 0, scanned: 0 };
  });

  tickets.forEach(ticket => {
    if (ticketsByType[ticket.ticket_type_id]) {
      ticketsByType[ticket.ticket_type_id].sold++;
      if (ticket.status === 'used') {
        ticketsByType[ticket.ticket_type_id].scanned++;
      }
    }
  });

  const scansByStaff: Record<string, number> = {};
  const scansByHour: Record<string, number> = {};

  scans.forEach(scan => {
    // By staff
    scansByStaff[scan.staff_id] = (scansByStaff[scan.staff_id] || 0) + 1;
    // By hour
    const hour = new Date(scan.scanned_at).toISOString().slice(0, 13);
    scansByHour[hour] = (scansByHour[hour] || 0) + 1;
  });

  return {
    totalTickets: tickets.length,
    ticketsScanned: tickets.filter(t => t.status === 'used').length,
    ticketsByType,
    scansByStaff,
    scansByHour,
  };
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
  // Suppliers
  saveSuppliers,
  getSuppliers,
  getSupplierById,
  saveSupplier,
  deleteSupplier,
  // Discounts
  saveDiscounts,
  getDiscounts,
  getDiscountById,
  getDiscountByCode,
  saveDiscount,
  deleteDiscount,
  // Purchase Orders
  savePurchaseOrders,
  getPurchaseOrders,
  getPurchaseOrderById,
  getPurchaseOrdersBySupplier,
  savePurchaseOrder,
  deletePurchaseOrder,
  // Events
  saveEvents,
  getEvents,
  getEventById,
  getEventsByStatus,
  getUpcomingEvents,
  saveEvent,
  deleteEvent,
  // Event Ticket Types
  saveEventTicketTypes,
  getEventTicketTypes,
  getEventTicketTypeById,
  saveEventTicketType,
  deleteEventTicketType,
  // Event Tickets
  saveEventTickets,
  getEventTickets,
  getEventTicketById,
  getEventTicketByQRCode,
  getUserEventTickets,
  saveEventTicket,
  updateEventTicketStatus,
  // Event Staff
  saveEventStaffList,
  getEventStaff,
  getEventStaffById,
  getEventStaffByUserId,
  getAcceptedEventStaffForUser,
  saveEventStaffMember,
  updateEventStaffWizardCompleted,
  deleteEventStaffMember,
  // Event Scans
  saveEventScans,
  getEventScans,
  getEventScansByStaff,
  addEventScan,
  getEventAnalytics,
};

// ================== Admin Notification Types ==================

export type AdminNotificationType =
  | 'card_order'
  | 'kyc_request'
  | 'dispute'
  | 'system'
  | 'user_registration'
  | 'transaction_flagged'
  | 'support_ticket'
  | 'business_verification'
  | 'deposit'
  | 'payout'
  | 'withdrawal'
  | 'transfer';

export type AdminNotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AdminNotificationStatus = 'unread' | 'read' | 'archived';

export interface OfflineAdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  priority: AdminNotificationPriority;
  status: AdminNotificationStatus;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, unknown>;
  action_url?: string;
  read_by?: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
  synced_at?: string;
  pending_sync?: boolean;
}

// ================== Admin Notification Functions ==================

export const saveAdminNotifications = async (notifications: OfflineAdminNotification[]): Promise<void> => {
  const notifsWithMeta: OfflineAdminNotification[] = notifications.map(n => ({
    ...n,
    synced_at: new Date().toISOString(),
  }));
  await putMany(STORES.ADMIN_NOTIFICATIONS, notifsWithMeta);
};

export const getAdminNotifications = async (): Promise<OfflineAdminNotification[]> => {
  const all = await getAll<OfflineAdminNotification>(STORES.ADMIN_NOTIFICATIONS);
  // Sort by created_at descending
  return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const getAdminNotificationById = async (id: string): Promise<OfflineAdminNotification | undefined> => {
  return getByKey<OfflineAdminNotification>(STORES.ADMIN_NOTIFICATIONS, id);
};

export const getUnreadAdminNotifications = async (): Promise<OfflineAdminNotification[]> => {
  const all = await getAdminNotifications();
  return all.filter(n => n.status === 'unread');
};

export const getAdminNotificationsByType = async (type: AdminNotificationType): Promise<OfflineAdminNotification[]> => {
  const all = await getAdminNotifications();
  return all.filter(n => n.type === type);
};

export const saveAdminNotification = async (notification: Partial<OfflineAdminNotification>): Promise<void> => {
  const notifWithMeta: OfflineAdminNotification = {
    ...notification as OfflineAdminNotification,
    synced_at: new Date().toISOString(),
    pending_sync: true,
  };
  await put(STORES.ADMIN_NOTIFICATIONS, notifWithMeta);
};

export const markAdminNotificationAsRead = async (id: string, readBy?: string): Promise<void> => {
  const notification = await getAdminNotificationById(id);
  if (notification) {
    notification.status = 'read';
    notification.read_at = new Date().toISOString();
    notification.read_by = readBy;
    notification.pending_sync = true;
    await put(STORES.ADMIN_NOTIFICATIONS, notification);
  }
};

export const markAllAdminNotificationsAsRead = async (readBy?: string): Promise<void> => {
  const unread = await getUnreadAdminNotifications();
  const updated = unread.map(n => ({
    ...n,
    status: 'read' as const,
    read_at: new Date().toISOString(),
    read_by: readBy,
    pending_sync: true,
  }));
  await putMany(STORES.ADMIN_NOTIFICATIONS, updated);
};

export const deleteAdminNotification = async (id: string): Promise<void> => {
  await deleteByKey(STORES.ADMIN_NOTIFICATIONS, id);
};

export const clearAdminNotifications = async (): Promise<void> => {
  await clearStore(STORES.ADMIN_NOTIFICATIONS);
};

export const getAdminNotificationUnreadCount = async (): Promise<number> => {
  const unread = await getUnreadAdminNotifications();
  return unread.length;
};

export default indexedDBService;

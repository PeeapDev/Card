/**
 * IndexedDB Service
 * Provides persistent storage for the Plus app
 */

const DB_NAME = 'peeap_plus_db';
const DB_VERSION = 1;

// Store names
export const STORES = {
  NOTIFICATIONS: 'notifications',
  STAFF_MEMBERS: 'staff_members',
  STAFF_INVITATIONS: 'staff_invitations',
  FUEL_SALES: 'fuel_sales',
  FUEL_STATIONS: 'fuel_stations',
  FUEL_INVENTORY: 'fuel_inventory',
  FLEET_CUSTOMERS: 'fleet_customers',
  SHIFTS: 'shifts',
  SETTINGS: 'settings',
} as const;

type StoreName = typeof STORES[keyof typeof STORES];

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize the database
 */
function initDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available on server'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create notifications store
      if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
        const notifStore = db.createObjectStore(STORES.NOTIFICATIONS, { keyPath: 'id' });
        notifStore.createIndex('createdAt', 'createdAt', { unique: false });
        notifStore.createIndex('category', 'category', { unique: false });
        notifStore.createIndex('userId', 'userId', { unique: false });
      }

      // Create staff members store
      if (!db.objectStoreNames.contains(STORES.STAFF_MEMBERS)) {
        const staffStore = db.createObjectStore(STORES.STAFF_MEMBERS, { keyPath: 'id' });
        staffStore.createIndex('businessId', 'businessId', { unique: false });
        staffStore.createIndex('userId', 'userId', { unique: false });
        staffStore.createIndex('status', 'status', { unique: false });
      }

      // Create staff invitations store
      if (!db.objectStoreNames.contains(STORES.STAFF_INVITATIONS)) {
        const inviteStore = db.createObjectStore(STORES.STAFF_INVITATIONS, { keyPath: 'id' });
        inviteStore.createIndex('userId', 'userId', { unique: false });
        inviteStore.createIndex('businessId', 'businessId', { unique: false });
        inviteStore.createIndex('status', 'status', { unique: false });
      }

      // Create fuel sales store
      if (!db.objectStoreNames.contains(STORES.FUEL_SALES)) {
        const salesStore = db.createObjectStore(STORES.FUEL_SALES, { keyPath: 'id' });
        salesStore.createIndex('stationId', 'stationId', { unique: false });
        salesStore.createIndex('createdAt', 'createdAt', { unique: false });
        salesStore.createIndex('shiftId', 'shiftId', { unique: false });
      }

      // Create fuel stations store
      if (!db.objectStoreNames.contains(STORES.FUEL_STATIONS)) {
        const stationsStore = db.createObjectStore(STORES.FUEL_STATIONS, { keyPath: 'id' });
        stationsStore.createIndex('businessId', 'businessId', { unique: false });
      }

      // Create fuel inventory store
      if (!db.objectStoreNames.contains(STORES.FUEL_INVENTORY)) {
        const inventoryStore = db.createObjectStore(STORES.FUEL_INVENTORY, { keyPath: 'id' });
        inventoryStore.createIndex('stationId', 'stationId', { unique: false });
        inventoryStore.createIndex('fuelType', 'fuelType', { unique: false });
      }

      // Create fleet customers store
      if (!db.objectStoreNames.contains(STORES.FLEET_CUSTOMERS)) {
        const fleetStore = db.createObjectStore(STORES.FLEET_CUSTOMERS, { keyPath: 'id' });
        fleetStore.createIndex('businessId', 'businessId', { unique: false });
      }

      // Create shifts store
      if (!db.objectStoreNames.contains(STORES.SHIFTS)) {
        const shiftsStore = db.createObjectStore(STORES.SHIFTS, { keyPath: 'id' });
        shiftsStore.createIndex('stationId', 'stationId', { unique: false });
        shiftsStore.createIndex('staffId', 'staffId', { unique: false });
        shiftsStore.createIndex('status', 'status', { unique: false });
      }

      // Create settings store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };
  });

  return dbPromise;
}

/**
 * Get the database instance
 */
export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  return initDB();
}

/**
 * Generic CRUD operations
 */

// Get all items from a store
export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Error getting all from ${storeName}:`, error);
    return [];
  }
}

// Get item by ID
export async function getById<T>(storeName: StoreName, id: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Error getting by id from ${storeName}:`, error);
    return null;
  }
}

// Get items by index
export async function getByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Error getting by index from ${storeName}:`, error);
    return [];
  }
}

// Add item
export async function add<T>(storeName: StoreName, item: T): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(item);

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error(`Error adding to ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error(`Error adding to ${storeName}:`, error);
    return false;
  }
}

// Put (add or update) item
export async function put<T>(storeName: StoreName, item: T): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error(`Error putting to ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error(`Error putting to ${storeName}:`, error);
    return false;
  }
}

// Delete item by ID
export async function remove(storeName: StoreName, id: string): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error(`Error deleting from ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error(`Error deleting from ${storeName}:`, error);
    return false;
  }
}

// Clear all items from a store
export async function clearStore(storeName: StoreName): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error(`Error clearing ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error(`Error clearing ${storeName}:`, error);
    return false;
  }
}

// Bulk add items
export async function bulkAdd<T>(storeName: StoreName, items: T[]): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      let completed = 0;
      const total = items.length;

      if (total === 0) {
        resolve(true);
        return;
      }

      items.forEach((item) => {
        const request = store.put(item);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve(true);
        };
        request.onerror = () => reject(request.error);
      });
    });
  } catch (error) {
    console.error(`Error bulk adding to ${storeName}:`, error);
    return false;
  }
}

// Count items in store
export async function count(storeName: StoreName): Promise<number> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Error counting ${storeName}:`, error);
    return 0;
  }
}

// Get setting by key
export async function getSetting<T>(key: string): Promise<T | null> {
  try {
    const result = await getById<{ key: string; value: T }>(STORES.SETTINGS, key);
    return result?.value || null;
  } catch {
    return null;
  }
}

// Set setting
export async function setSetting<T>(key: string, value: T): Promise<boolean> {
  return put(STORES.SETTINGS, { key, value });
}

/**
 * useOfflineSync Hook
 *
 * Manages online/offline status and data synchronization
 * Extended for full POS offline support including:
 * - Products & Categories
 * - Staff management
 * - Customers & Loyalty
 * - Inventory & Alerts
 * - Sales & Reports
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import indexedDBService from '@/services/indexeddb.service';
import posService from '@/services/pos.service';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingSalesCount: number;
  hasOfflineData: boolean;
  pendingChangesCount: number;
}

export function useOfflineSync(businessId: string | undefined) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    pendingSalesCount: 0,
    hasOfflineData: false,
    pendingChangesCount: 0,
  });

  const syncInProgress = useRef(false);

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      // Auto-sync when coming back online
      if (businessId) {
        syncData();
      }
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [businessId]);

  // Check offline data status
  useEffect(() => {
    if (!businessId) return;

    const checkOfflineStatus = async () => {
      try {
        const hasData = await indexedDBService.hasOfflineData(businessId);
        const lastSync = await indexedDBService.getLastSyncTime(businessId);
        const pendingSales = await indexedDBService.getPendingSales(businessId);

        setSyncStatus(prev => ({
          ...prev,
          hasOfflineData: hasData,
          lastSyncTime: lastSync,
          pendingSalesCount: pendingSales.length,
        }));
      } catch (error) {
        console.error('Error checking offline status:', error);
      }
    };

    checkOfflineStatus();
  }, [businessId]);

  // Sync all POS data from server to IndexedDB
  const syncFromServer = useCallback(async () => {
    if (!businessId || !navigator.onLine) return;

    try {
      // Fetch all data from server in parallel
      const [products, categories, staff, sales] = await Promise.all([
        posService.getProducts(businessId),
        posService.getCategories(businessId),
        posService.getStaff(businessId).catch(() => []),
        posService.getSales(businessId).catch(() => []),
      ]);

      // Fetch additional data that may not exist yet
      let customers: any[] = [];
      let loyaltyProgram: any = null;

      try {
        customers = await posService.getCustomers(businessId);
      } catch (e) {
        console.warn('No customers data available');
      }

      try {
        loyaltyProgram = await posService.getLoyaltyProgram(businessId);
      } catch (e) {
        console.warn('No loyalty program available');
      }

      // Extract sales array from response
      const salesArray = Array.isArray(sales) ? sales : (sales?.sales || []);

      // Save all data to IndexedDB
      await Promise.all([
        indexedDBService.saveProducts(products, businessId),
        indexedDBService.saveCategories(categories, businessId),
        staff.length > 0 ? indexedDBService.saveStaff(staff, businessId) : Promise.resolve(),
        salesArray.length > 0 ? indexedDBService.saveSales(salesArray, businessId) : Promise.resolve(),
        customers.length > 0 ? indexedDBService.saveCustomers(customers, businessId) : Promise.resolve(),
        loyaltyProgram ? indexedDBService.saveLoyaltyPrograms([loyaltyProgram], businessId) : Promise.resolve(),
      ]);

      await indexedDBService.setLastSyncTime(businessId);

      console.log(`Synced: ${products.length} products, ${categories.length} categories, ${staff.length} staff, ${salesArray.length} sales, ${customers.length} customers`);

      setSyncStatus(prev => ({
        ...prev,
        hasOfflineData: true,
        lastSyncTime: new Date().toISOString(),
      }));

      return { products, categories, staff, sales: salesArray, customers, loyaltyProgram };
    } catch (error) {
      console.error('Error syncing from server:', error);
      throw error;
    }
  }, [businessId]);

  // Sync pending sales to server
  const syncPendingSales = useCallback(async () => {
    if (!businessId || !navigator.onLine) return;

    try {
      const pendingSales = await indexedDBService.getPendingSales(businessId);

      if (pendingSales.length === 0) {
        console.log('No pending sales to sync');
        return;
      }

      console.log(`Syncing ${pendingSales.length} pending sales...`);

      for (const sale of pendingSales) {
        try {
          // Create sale on server
          const serverSale = await posService.createSale(
            {
              merchant_id: sale.merchant_id,
              subtotal: sale.subtotal,
              tax_amount: sale.tax_amount,
              discount_amount: sale.discount_amount,
              total_amount: sale.total_amount,
              payment_method: sale.payment_method,
              payment_status: sale.payment_status,
              payment_details: sale.payment_details,
              cashier_id: sale.cashier_id,
              cashier_name: sale.cashier_name,
              customer_name: sale.customer_name,
              customer_phone: sale.customer_phone,
              status: sale.status,
              notes: `[Offline Sale] ${sale.notes || ''}`,
              items: sale.items,
            },
            sale.items
          );

          // Mark as synced
          await indexedDBService.markSaleAsSynced(sale.local_id, serverSale.id!);
          console.log(`Synced sale ${sale.local_id} -> ${serverSale.id}`);
        } catch (error) {
          console.error(`Failed to sync sale ${sale.local_id}:`, error);
        }
      }

      // Update pending count
      const remainingPending = await indexedDBService.getPendingSales(businessId);
      setSyncStatus(prev => ({
        ...prev,
        pendingSalesCount: remainingPending.length,
      }));

      // Clean up old synced sales
      await indexedDBService.deleteSyncedSales();
    } catch (error) {
      console.error('Error syncing pending sales:', error);
      throw error;
    }
  }, [businessId]);

  // Full sync (both directions)
  const syncData = useCallback(async () => {
    if (!businessId || syncInProgress.current) return;

    syncInProgress.current = true;
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      // First, sync pending sales to server (upload)
      await syncPendingSales();

      // Then, sync from server (download)
      await syncFromServer();

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      syncInProgress.current = false;
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [businessId, syncFromServer, syncPendingSales]);

  // Get products (from IndexedDB if offline, with fallback to server)
  const getProducts = useCallback(async () => {
    if (!businessId) return [];

    if (navigator.onLine) {
      try {
        // Try server first
        const products = await posService.getProducts(businessId);
        // Save to IndexedDB for offline use
        await indexedDBService.saveProducts(products, businessId);
        return products;
      } catch (error) {
        console.warn('Server fetch failed, using offline data:', error);
      }
    }

    // Fallback to IndexedDB
    return indexedDBService.getProducts(businessId);
  }, [businessId]);

  // Get categories (same pattern)
  const getCategories = useCallback(async () => {
    if (!businessId) return [];

    if (navigator.onLine) {
      try {
        const categories = await posService.getCategories(businessId);
        await indexedDBService.saveCategories(categories, businessId);
        return categories;
      } catch (error) {
        console.warn('Server fetch failed, using offline data:', error);
      }
    }

    return indexedDBService.getCategories(businessId);
  }, [businessId]);

  // Create sale (saves locally if offline)
  const createSale = useCallback(async (saleData: any, items: any[]) => {
    if (!businessId) throw new Error('Business ID required');

    if (navigator.onLine) {
      try {
        // Try server first
        const sale = await posService.createSale(saleData, items);

        // Update local inventory
        await syncFromServer();

        return { ...sale, isOffline: false };
      } catch (error) {
        console.warn('Server sale failed, saving offline:', error);
      }
    }

    // Save offline
    const localId = await indexedDBService.savePendingSale({
      ...saleData,
      items,
      merchant_id: businessId,
    });

    // Update local inventory in IndexedDB
    for (const item of items) {
      const product = await indexedDBService.getByKey<any>('products', item.product_id);
      if (product && product.track_inventory) {
        product.stock_quantity -= item.quantity;
        await indexedDBService.put('products', product);
      }
    }

    setSyncStatus(prev => ({
      ...prev,
      pendingSalesCount: prev.pendingSalesCount + 1,
    }));

    return {
      id: `offline_${localId}`,
      local_id: localId,
      sale_number: `OFF-${Date.now()}`,
      isOffline: true,
      ...saleData,
      items,
    };
  }, [businessId, syncFromServer]);

  // Save cart to IndexedDB
  const saveCart = useCallback(async (cart: any[]) => {
    if (!businessId) return;
    await indexedDBService.saveCart(businessId, cart);
  }, [businessId]);

  // Load cart from IndexedDB
  const loadCart = useCallback(async () => {
    if (!businessId) return [];
    return indexedDBService.getCart(businessId);
  }, [businessId]);

  // Clear cart
  const clearCart = useCallback(async () => {
    if (!businessId) return;
    await indexedDBService.clearCart(businessId);
  }, [businessId]);

  // ================== Staff Functions (offline-first) ==================

  const getStaff = useCallback(async () => {
    if (!businessId) return [];

    if (navigator.onLine) {
      try {
        const staff = await posService.getStaff(businessId);
        await indexedDBService.saveStaff(staff, businessId);
        return staff;
      } catch (error) {
        console.warn('Server fetch failed, using offline staff data:', error);
      }
    }

    return indexedDBService.getStaff(businessId);
  }, [businessId]);

  const createStaff = useCallback(async (staffData: any) => {
    if (!businessId) throw new Error('Business ID required');

    if (navigator.onLine) {
      try {
        const staff = await posService.createStaff(staffData);
        await indexedDBService.saveStaffMember({ ...staff, merchant_id: businessId });
        return { ...staff, isOffline: false };
      } catch (error) {
        console.warn('Server create failed, saving offline:', error);
      }
    }

    // Save offline with temp ID
    const offlineStaff = {
      ...staffData,
      id: `offline_${Date.now()}`,
      merchant_id: businessId,
      created_at: new Date().toISOString(),
      pending_sync: true,
    };
    await indexedDBService.saveStaffMember(offlineStaff);
    return { ...offlineStaff, isOffline: true };
  }, [businessId]);

  const updateStaff = useCallback(async (staffId: string, updates: any) => {
    if (!businessId) throw new Error('Business ID required');

    if (navigator.onLine) {
      try {
        const staff = await posService.updateStaff(staffId, updates);
        await indexedDBService.saveStaffMember({ ...staff, merchant_id: businessId });
        return { ...staff, isOffline: false };
      } catch (error) {
        console.warn('Server update failed, saving offline:', error);
      }
    }

    // Update in IndexedDB
    const existingStaff = await indexedDBService.getStaffById(staffId);
    const updatedStaff = { ...existingStaff, ...updates, pending_sync: true };
    await indexedDBService.saveStaffMember(updatedStaff);
    return { ...updatedStaff, isOffline: true };
  }, [businessId]);

  const deleteStaff = useCallback(async (staffId: string) => {
    if (!businessId) throw new Error('Business ID required');

    if (navigator.onLine) {
      try {
        await posService.deleteStaff(staffId);
        await indexedDBService.deleteStaffMember(staffId);
        return { success: true, isOffline: false };
      } catch (error) {
        console.warn('Server delete failed, marking for offline delete:', error);
      }
    }

    // Mark for deletion in sync queue and remove locally
    await indexedDBService.addToSyncQueue({
      type: 'DELETE_STAFF',
      data: { staffId },
      endpoint: `/api/pos/staff/${staffId}`,
      method: 'DELETE',
    });
    await indexedDBService.deleteStaffMember(staffId);
    return { success: true, isOffline: true };
  }, [businessId]);

  // ================== Customer Functions (offline-first) ==================

  const getCustomers = useCallback(async () => {
    if (!businessId) return [];

    if (navigator.onLine) {
      try {
        const customers = await posService.getCustomers(businessId);
        await indexedDBService.saveCustomers(customers, businessId);
        return customers;
      } catch (error) {
        console.warn('Server fetch failed, using offline customer data:', error);
      }
    }

    return indexedDBService.getCustomers(businessId);
  }, [businessId]);

  const getCustomerByPhone = useCallback(async (phone: string) => {
    if (!businessId) return null;

    if (navigator.onLine) {
      try {
        // Search customers by phone
        const customers = await posService.getCustomers(businessId, phone);
        const customer = customers.find(c => c.phone === phone);
        if (customer) {
          await indexedDBService.saveCustomer({ ...customer, merchant_id: businessId });
        }
        return customer || null;
      } catch (error) {
        console.warn('Server fetch failed, using offline data:', error);
      }
    }

    return indexedDBService.getCustomerByPhone(businessId, phone);
  }, [businessId]);

  const createCustomer = useCallback(async (customerData: any) => {
    if (!businessId) throw new Error('Business ID required');

    if (navigator.onLine) {
      try {
        const customer = await posService.createCustomer(customerData);
        await indexedDBService.saveCustomer({ ...customer, merchant_id: businessId });
        return { ...customer, isOffline: false };
      } catch (error) {
        console.warn('Server create failed, saving offline:', error);
      }
    }

    const offlineCustomer = {
      ...customerData,
      id: `offline_${Date.now()}`,
      merchant_id: businessId,
      created_at: new Date().toISOString(),
      pending_sync: true,
    };
    await indexedDBService.saveCustomer(offlineCustomer);
    return { ...offlineCustomer, isOffline: true };
  }, [businessId]);

  // ================== Loyalty Functions (offline-first) ==================

  const getLoyaltyProgram = useCallback(async () => {
    if (!businessId) return null;

    if (navigator.onLine) {
      try {
        const program = await posService.getLoyaltyProgram(businessId);
        if (program) {
          await indexedDBService.saveLoyaltyProgram({ ...program, merchant_id: businessId });
        }
        return program;
      } catch (error) {
        console.warn('Server fetch failed, using offline data:', error);
      }
    }

    return indexedDBService.getLoyaltyProgram(businessId);
  }, [businessId]);

  const updateLoyaltyProgram = useCallback(async (programId: string, updates: any) => {
    if (!businessId) throw new Error('Business ID required');

    if (navigator.onLine) {
      try {
        const program = await posService.updateLoyaltyProgram(programId, updates);
        await indexedDBService.saveLoyaltyProgram({ ...program, merchant_id: businessId });
        return { ...program, isOffline: false };
      } catch (error) {
        console.warn('Server update failed, saving offline:', error);
      }
    }

    const existingProgram = await indexedDBService.getLoyaltyProgram(businessId);
    const updatedProgram = { ...existingProgram, ...updates, pending_sync: true };
    await indexedDBService.saveLoyaltyProgram(updatedProgram);
    return { ...updatedProgram, isOffline: true };
  }, [businessId]);

  const addLoyaltyPoints = useCallback(async (customerId: string, points: number, reason?: string) => {
    if (!businessId) throw new Error('Business ID required');

    if (navigator.onLine) {
      try {
        // purchaseAmount is used to calculate points internally, pass points as amount
        const result = await posService.addLoyaltyPoints(businessId, customerId, points);
        // Update local cache
        await indexedDBService.updateLoyaltyPoints({ ...result, merchant_id: businessId });
        return { ...result, isOffline: false };
      } catch (error) {
        console.warn('Server add points failed, saving offline:', error);
      }
    }

    // Update locally
    const existingPoints = await indexedDBService.getCustomerLoyaltyPoints(customerId);
    const newPoints = {
      ...existingPoints,
      id: existingPoints?.id || `offline_${Date.now()}`,
      customer_id: customerId,
      merchant_id: businessId,
      current_points: (existingPoints?.current_points || 0) + points,
      lifetime_points: (existingPoints?.lifetime_points || 0) + points,
      pending_sync: true,
    };
    await indexedDBService.updateLoyaltyPoints(newPoints);

    // Queue for sync
    await indexedDBService.addToSyncQueue({
      type: 'ADD_LOYALTY_POINTS',
      data: { customerId, points, reason },
      endpoint: `/api/pos/loyalty/points/add`,
      method: 'POST',
    });

    return { ...newPoints, isOffline: true };
  }, [businessId]);

  const redeemLoyaltyPoints = useCallback(async (customerId: string, points: number, reason?: string) => {
    if (!businessId) throw new Error('Business ID required');

    if (navigator.onLine) {
      try {
        const result = await posService.redeemLoyaltyPoints(businessId, customerId, points);
        await indexedDBService.updateLoyaltyPoints({ ...result.points, merchant_id: businessId });
        return { ...result, isOffline: false };
      } catch (error) {
        console.warn('Server redeem failed, saving offline:', error);
      }
    }

    // Update locally
    const existingPoints = await indexedDBService.getCustomerLoyaltyPoints(customerId);
    if (!existingPoints || existingPoints.current_points < points) {
      throw new Error('Insufficient points');
    }

    const newPoints = {
      ...existingPoints,
      current_points: existingPoints.current_points - points,
      pending_sync: true,
    };
    await indexedDBService.updateLoyaltyPoints(newPoints);

    await indexedDBService.addToSyncQueue({
      type: 'REDEEM_LOYALTY_POINTS',
      data: { customerId, points, reason },
      endpoint: `/api/pos/loyalty/points/redeem`,
      method: 'POST',
    });

    return { ...newPoints, isOffline: true };
  }, [businessId]);

  // ================== Inventory Functions (offline-first) ==================

  const getInventoryAlerts = useCallback(async () => {
    if (!businessId) return [];

    if (navigator.onLine) {
      try {
        const alerts = await posService.getInventoryAlerts(businessId);
        await indexedDBService.saveInventoryAlerts(alerts, businessId);
        return alerts;
      } catch (error) {
        console.warn('Server fetch failed, computing offline alerts:', error);
      }
    }

    // Compute alerts from local products
    const products = await indexedDBService.getProducts(businessId);
    return products
      .filter(p => p.track_inventory && p.stock_quantity <= (p.low_stock_threshold || 10))
      .map(p => ({
        id: `local_${p.id}`,
        product_id: p.id,
        product_name: p.name,
        current_stock: p.stock_quantity,
        threshold: p.low_stock_threshold || 10,
        alert_type: p.stock_quantity === 0 ? 'out_of_stock' : 'low_stock',
        is_offline_computed: true,
      }));
  }, [businessId]);

  const adjustInventory = useCallback(async (productId: string, adjustment: number, reason: string) => {
    if (!businessId) throw new Error('Business ID required');

    // Get current product
    const product = await indexedDBService.getByKey<any>('products', productId);
    if (!product) throw new Error('Product not found');

    const newQuantity = product.stock_quantity + adjustment;
    if (newQuantity < 0) throw new Error('Insufficient stock');

    if (navigator.onLine) {
      try {
        await posService.logInventoryChange(productId, businessId, adjustment, 'adjustment', reason);
        // Update local product
        await indexedDBService.updateProductStock(productId, newQuantity);
        return { success: true, newQuantity, isOffline: false };
      } catch (error) {
        console.warn('Server adjust failed, saving offline:', error);
      }
    }

    // Update locally
    await indexedDBService.updateProductStock(productId, newQuantity);

    // Log the change
    await indexedDBService.addInventoryLog({
      merchant_id: businessId,
      product_id: productId,
      quantity_change: adjustment,
      new_quantity: newQuantity,
      reason,
      change_type: 'manual',
    });

    // Queue for sync
    await indexedDBService.addToSyncQueue({
      type: 'INVENTORY_ADJUST',
      data: { productId, adjustment, reason },
      endpoint: `/api/pos/inventory/adjust`,
      method: 'POST',
    });

    return { success: true, newQuantity, isOffline: true };
  }, [businessId]);

  // ================== Reports Functions (offline-first) ==================

  const getSalesReport = useCallback(async (startDate: string, endDate: string) => {
    if (!businessId) return null;

    if (navigator.onLine) {
      try {
        const report = await posService.getSalesReport(businessId, startDate, endDate);
        return { ...report, isOffline: false };
      } catch (error) {
        console.warn('Server report failed, computing offline:', error);
      }
    }

    // Calculate from local data
    const report = await indexedDBService.calculateLocalSalesReport(businessId, startDate, endDate);
    return { ...report, isOffline: true };
  }, [businessId]);

  const getSales = useCallback(async (startDate?: string, endDate?: string) => {
    if (!businessId) return [];

    if (navigator.onLine) {
      try {
        const result = await posService.getSales(businessId);
        // getSales returns { sales, total } - extract the sales array
        const salesArray = result?.sales || [];
        await indexedDBService.saveSales(salesArray, businessId);

        if (startDate && endDate) {
          return salesArray.filter((sale: any) => {
            const saleDate = new Date(sale.created_at);
            return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
          });
        }
        return salesArray;
      } catch (error) {
        console.warn('Server fetch failed, using offline data:', error);
      }
    }

    if (startDate && endDate) {
      return indexedDBService.getSalesByDateRange(businessId, startDate, endDate);
    }
    return indexedDBService.getSales(businessId);
  }, [businessId]);

  return {
    ...syncStatus,
    syncData,
    syncFromServer,
    syncPendingSales,
    // Products & Categories
    getProducts,
    getCategories,
    createSale,
    saveCart,
    loadCart,
    clearCart,
    // Staff
    getStaff,
    createStaff,
    updateStaff,
    deleteStaff,
    // Customers
    getCustomers,
    getCustomerByPhone,
    createCustomer,
    // Loyalty
    getLoyaltyProgram,
    updateLoyaltyProgram,
    addLoyaltyPoints,
    redeemLoyaltyPoints,
    // Inventory
    getInventoryAlerts,
    adjustInventory,
    // Reports
    getSalesReport,
    getSales,
  };
}

export default useOfflineSync;

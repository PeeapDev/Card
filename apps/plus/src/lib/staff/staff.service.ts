/**
 * Staff Service
 * Manages staff members, permissions, and PIN authentication using IndexedDB
 */

import { contactService, type Contact } from '../contacts';
import { getAll, put, remove, getById, STORES } from '../db/indexed-db';

export type StaffRole = 'admin' | 'manager' | 'attendant' | 'accountant' | 'viewer';

export type PermissionModule =
  | 'dashboard'
  | 'fuel_sales'
  | 'fuel_inventory'
  | 'fuel_shifts'
  | 'fuel_stations'
  | 'fleet_accounts'
  | 'invoices'
  | 'subscriptions'
  | 'batch_payments'
  | 'cards'
  | 'reports'
  | 'hr_employees'
  | 'hr_roles'
  | 'accounting'
  | 'settings';

export interface Permission {
  module: PermissionModule;
  label: string;
  description: string;
  actions: ('view' | 'create' | 'edit' | 'delete')[];
}

export interface StaffMember {
  id: string;
  userId: string;
  businessId: string;
  user: Contact;
  role: StaffRole;
  department?: string;
  permissions: PermissionModule[];
  stations?: string[];  // For station-specific access
  pinSet: boolean;
  pinHash?: string;
  status: 'pending' | 'active' | 'suspended';
  invitedAt: string;
  activatedAt?: string;
  lastActiveAt?: string;
}

export interface StaffInvitation {
  id: string;
  businessId: string;
  businessName: string;
  userId: string;
  role: StaffRole;
  permissions: PermissionModule[];
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
}

// Available permissions by module
export const PERMISSIONS: Permission[] = [
  { module: 'dashboard', label: 'Dashboard', description: 'View main dashboard', actions: ['view'] },
  { module: 'fuel_sales', label: 'Fuel Sales', description: 'Record and manage fuel sales', actions: ['view', 'create', 'edit'] },
  { module: 'fuel_inventory', label: 'Fuel Inventory', description: 'Manage tanks and deliveries', actions: ['view', 'create', 'edit'] },
  { module: 'fuel_shifts', label: 'Shifts', description: 'Manage staff shifts', actions: ['view', 'create', 'edit'] },
  { module: 'fuel_stations', label: 'Stations', description: 'Manage fuel stations', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'fleet_accounts', label: 'Fleet Accounts', description: 'Manage fleet customers', actions: ['view', 'create', 'edit'] },
  { module: 'invoices', label: 'Invoices', description: 'Create and manage invoices', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'subscriptions', label: 'Subscriptions', description: 'Manage subscriptions', actions: ['view', 'create', 'edit'] },
  { module: 'batch_payments', label: 'Batch Payments', description: 'Process batch payments', actions: ['view', 'create'] },
  { module: 'cards', label: 'Cards', description: 'Manage employee cards', actions: ['view', 'create', 'edit'] },
  { module: 'reports', label: 'Reports', description: 'View and export reports', actions: ['view'] },
  { module: 'hr_employees', label: 'HR - Employees', description: 'Manage employees', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'hr_roles', label: 'HR - Roles', description: 'Manage roles and permissions', actions: ['view', 'edit'] },
  { module: 'accounting', label: 'Accounting', description: 'Access accounting features', actions: ['view', 'create', 'edit'] },
  { module: 'settings', label: 'Settings', description: 'Manage business settings', actions: ['view', 'edit'] },
];

// Default permissions by role
export const ROLE_PERMISSIONS: Record<StaffRole, PermissionModule[]> = {
  admin: PERMISSIONS.map(p => p.module),
  manager: ['dashboard', 'fuel_sales', 'fuel_inventory', 'fuel_shifts', 'fuel_stations', 'fleet_accounts', 'reports', 'hr_employees'],
  attendant: ['dashboard', 'fuel_sales', 'fuel_shifts'],
  accountant: ['dashboard', 'invoices', 'subscriptions', 'batch_payments', 'reports', 'accounting'],
  viewer: ['dashboard', 'reports'],
};

export const ROLES: { id: StaffRole; name: string; description: string }[] = [
  { id: 'admin', name: 'Administrator', description: 'Full access to all features' },
  { id: 'manager', name: 'Station Manager', description: 'Manage stations, staff, and operations' },
  { id: 'attendant', name: 'Pump Attendant', description: 'Record sales and manage shifts' },
  { id: 'accountant', name: 'Accountant', description: 'Manage finances, invoices, and reports' },
  { id: 'viewer', name: 'Viewer', description: 'Read-only access to reports' },
];

// In-memory cache for staff members and invitations
let staffCache: StaffMember[] | null = null;
let invitationsCache: StaffInvitation[] | null = null;
let staffCacheInitialized = false;
let invitationsCacheInitialized = false;

// Generate a unique ID
function generateId(): string {
  return `staff_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Simple hash function for PIN (in production, use proper hashing on server)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Load staff members from IndexedDB
 */
async function loadStaffMembers(): Promise<StaffMember[]> {
  if (staffCacheInitialized && staffCache !== null) {
    return staffCache;
  }

  try {
    const members = await getAll<StaffMember>(STORES.STAFF_MEMBERS);
    staffCache = members;
    staffCacheInitialized = true;
    return members;
  } catch (error) {
    console.error('Error loading staff members:', error);
    return [];
  }
}

/**
 * Load invitations from IndexedDB
 */
async function loadInvitations(): Promise<StaffInvitation[]> {
  if (invitationsCacheInitialized && invitationsCache !== null) {
    return invitationsCache;
  }

  try {
    const invitations = await getAll<StaffInvitation>(STORES.STAFF_INVITATIONS);
    invitationsCache = invitations;
    invitationsCacheInitialized = true;
    return invitations;
  } catch (error) {
    console.error('Error loading invitations:', error);
    return [];
  }
}

/**
 * Get all staff members for a business (async)
 */
export async function getStaffMembersAsync(businessId?: string): Promise<StaffMember[]> {
  const members = await loadStaffMembers();
  if (businessId) {
    return members.filter(m => m.businessId === businessId);
  }
  return members;
}

/**
 * Get all staff members for a business (sync - returns cached)
 */
export function getStaffMembers(businessId?: string): StaffMember[] {
  const members = staffCache || [];
  if (businessId) {
    return members.filter(m => m.businessId === businessId);
  }
  return members;
}

/**
 * Get a staff member by ID (async)
 */
export async function getStaffMemberAsync(staffId: string): Promise<StaffMember | null> {
  return getById<StaffMember>(STORES.STAFF_MEMBERS, staffId);
}

/**
 * Get a staff member by ID (sync - from cache)
 */
export function getStaffMember(staffId: string): StaffMember | null {
  const members = staffCache || [];
  return members.find(m => m.id === staffId) || null;
}

/**
 * Get staff member by user ID (async)
 */
export async function getStaffByUserIdAsync(userId: string, businessId?: string): Promise<StaffMember | null> {
  const members = await getStaffMembersAsync(businessId);
  return members.find(m => m.userId === userId) || null;
}

/**
 * Get staff member by user ID (sync - from cache)
 */
export function getStaffByUserId(userId: string, businessId?: string): StaffMember | null {
  const members = getStaffMembers(businessId);
  return members.find(m => m.userId === userId) || null;
}

/**
 * Save staff member to IndexedDB
 */
async function saveStaffMember(member: StaffMember): Promise<boolean> {
  try {
    const success = await put(STORES.STAFF_MEMBERS, member);
    if (success) {
      // Update cache
      if (staffCache) {
        const index = staffCache.findIndex(m => m.id === member.id);
        if (index >= 0) {
          staffCache[index] = member;
        } else {
          staffCache.push(member);
        }
      }
    }
    return success;
  } catch (error) {
    console.error('Error saving staff member:', error);
    return false;
  }
}

/**
 * Save invitation to IndexedDB
 */
async function saveInvitation(invitation: StaffInvitation): Promise<boolean> {
  try {
    const success = await put(STORES.STAFF_INVITATIONS, invitation);
    if (success) {
      // Update cache
      if (invitationsCache) {
        const index = invitationsCache.findIndex(i => i.id === invitation.id);
        if (index >= 0) {
          invitationsCache[index] = invitation;
        } else {
          invitationsCache.push(invitation);
        }
      }
    }
    return success;
  } catch (error) {
    console.error('Error saving invitation:', error);
    return false;
  }
}

/**
 * Initialize staff service (call on app start)
 */
export async function initializeStaffService(): Promise<void> {
  await loadStaffMembers();
  await loadInvitations();
}

/**
 * Add a new staff member (from search result)
 */
export async function addStaffMember(params: {
  businessId: string;
  businessName: string;
  user: Contact;
  role: StaffRole;
  permissions: PermissionModule[];
  department?: string;
  stations?: string[];
}): Promise<{ success: boolean; staffId?: string; error?: string }> {
  try {
    const members = await loadStaffMembers();

    // Check if user is already a staff member
    const existing = members.find(m => m.userId === params.user.id && m.businessId === params.businessId);
    if (existing) {
      return { success: false, error: 'User is already a staff member' };
    }

    const staffId = generateId();
    const newMember: StaffMember = {
      id: staffId,
      userId: params.user.id,
      businessId: params.businessId,
      user: params.user,
      role: params.role,
      department: params.department,
      permissions: params.permissions,
      stations: params.stations,
      pinSet: false,
      status: 'pending',
      invitedAt: new Date().toISOString(),
    };

    await saveStaffMember(newMember);

    // Create invitation for the user
    await createStaffInvitation({
      staffId,
      businessId: params.businessId,
      businessName: params.businessName,
      userId: params.user.id,
      role: params.role,
      permissions: params.permissions,
    });

    return { success: true, staffId };
  } catch (error) {
    return { success: false, error: 'Failed to add staff member' };
  }
}

/**
 * Update staff member
 */
export async function updateStaffMember(staffId: string, updates: Partial<StaffMember>): Promise<boolean> {
  const member = await getStaffMemberAsync(staffId);
  if (!member) return false;

  const updatedMember = { ...member, ...updates };
  return saveStaffMember(updatedMember);
}

/**
 * Remove staff member
 */
export async function removeStaffMember(staffId: string): Promise<boolean> {
  try {
    const success = await remove(STORES.STAFF_MEMBERS, staffId);
    if (success && staffCache) {
      staffCache = staffCache.filter(m => m.id !== staffId);
    }
    return success;
  } catch (error) {
    console.error('Error removing staff member:', error);
    return false;
  }
}

/**
 * Set PIN for staff member
 */
export async function setStaffPin(staffId: string, pin: string): Promise<boolean> {
  if (pin.length !== 4 || !/^\d+$/.test(pin)) {
    return false;
  }

  const member = await getStaffMemberAsync(staffId);
  if (!member) return false;

  member.pinHash = hashPin(pin);
  member.pinSet = true;
  member.status = 'active';
  member.activatedAt = new Date().toISOString();

  return saveStaffMember(member);
}

/**
 * Verify staff PIN
 */
export async function verifyStaffPin(staffId: string, pin: string): Promise<boolean> {
  const member = await getStaffMemberAsync(staffId);
  if (!member || !member.pinHash) return false;

  return member.pinHash === hashPin(pin);
}

/**
 * Check if staff has permission
 */
export async function hasPermission(staffId: string, module: PermissionModule): Promise<boolean> {
  const member = await getStaffMemberAsync(staffId);
  if (!member) return false;
  if (member.status !== 'active') return false;

  return member.permissions.includes(module);
}

// ==========================================
// Staff Invitations (for user's dashboard)
// ==========================================

/**
 * Get invitations for a user (async)
 */
export async function getStaffInvitationsAsync(userId: string): Promise<StaffInvitation[]> {
  const invitations = await loadInvitations();
  return invitations.filter(i => i.userId === userId && i.status === 'pending');
}

/**
 * Get invitations for a user (sync - from cache)
 */
export function getStaffInvitations(userId: string): StaffInvitation[] {
  const invitations = invitationsCache || [];
  return invitations.filter(i => i.userId === userId && i.status === 'pending');
}

/**
 * Create staff invitation
 */
async function createStaffInvitation(params: {
  staffId: string;
  businessId: string;
  businessName: string;
  userId: string;
  role: StaffRole;
  permissions: PermissionModule[];
}): Promise<void> {
  const invitation: StaffInvitation = {
    id: params.staffId,
    businessId: params.businessId,
    businessName: params.businessName,
    userId: params.userId,
    role: params.role,
    permissions: params.permissions,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  };

  await saveInvitation(invitation);
}

/**
 * Accept invitation and set PIN
 */
export async function acceptInvitation(invitationId: string, pin: string): Promise<{ success: boolean; error?: string }> {
  if (pin.length !== 4 || !/^\d+$/.test(pin)) {
    return { success: false, error: 'PIN must be 4 digits' };
  }

  try {
    // Get invitation
    const invitation = await getById<StaffInvitation>(STORES.STAFF_INVITATIONS, invitationId);
    if (!invitation) return { success: false, error: 'Invitation not found' };

    // Update invitation status
    invitation.status = 'accepted';
    await saveInvitation(invitation);

    // Set PIN for staff member
    const pinSet = await setStaffPin(invitationId, pin);
    if (!pinSet) {
      return { success: false, error: 'Failed to set PIN' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to accept invitation' };
  }
}

/**
 * Decline invitation
 */
export async function declineInvitation(invitationId: string): Promise<boolean> {
  try {
    // Get invitation
    const invitation = await getById<StaffInvitation>(STORES.STAFF_INVITATIONS, invitationId);
    if (!invitation) return false;

    // Update invitation status
    invitation.status = 'declined';
    await saveInvitation(invitation);

    // Also remove the staff member
    await removeStaffMember(invitationId);

    return true;
  } catch {
    return false;
  }
}

/**
 * Search contacts for adding as staff
 */
export async function searchContacts(query: string): Promise<Contact[]> {
  return contactService.searchContacts(query);
}

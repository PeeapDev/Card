/**
 * RBAC (Role-Based Access Control) Service
 *
 * Provides permission checking and role management for the frontend
 */

import { supabase } from '@/lib/supabase';

// Role hierarchy levels
export const ROLE_LEVELS = {
  superadmin: 100,
  admin: 80,
  support: 60,
  merchant: 40,
  agent: 40,
  user: 10,
} as const;

export type RoleName = keyof typeof ROLE_LEVELS;

// Permission definitions
export const PERMISSIONS = {
  // User permissions
  'users.read.own': 'View own profile',
  'users.write.own': 'Update own profile',
  'users.read.all': 'View all users',
  'users.write.all': 'Update all users',
  'users.delete': 'Delete users',
  'users.suspend': 'Suspend/activate users',

  // Wallet permissions
  'wallets.read.own': 'View own wallets',
  'wallets.write.own': 'Manage own wallets',
  'wallets.read.all': 'View all wallets',
  'wallets.write.all': 'Manage all wallets',
  'wallets.adjust': 'Adjust balances',

  // Transaction permissions
  'transactions.read.own': 'View own transactions',
  'transactions.create': 'Create transactions',
  'transactions.read.all': 'View all transactions',
  'transactions.reverse': 'Reverse transactions',

  // Card permissions
  'cards.read.own': 'View own cards',
  'cards.manage.own': 'Manage own cards',
  'cards.read.all': 'View all cards',
  'cards.issue': 'Issue cards',
  'cards.manage.all': 'Manage all cards',

  // KYC permissions
  'kyc.submit': 'Submit KYC',
  'kyc.review': 'Review KYC',

  // Fee permissions
  'fees.read': 'View fees',
  'fees.manage': 'Manage fees',

  // Dashboard permissions
  'admin.dashboard': 'Access admin dashboard',
  'merchant.dashboard': 'Access merchant dashboard',
  'agent.dashboard': 'Access agent dashboard',

  // Role management
  'roles.read': 'View roles',
  'roles.manage': 'Manage roles',
  'roles.assign': 'Assign roles',
} as const;

export type PermissionName = keyof typeof PERMISSIONS;

// Role to permissions mapping (frontend cache)
const ROLE_PERMISSIONS: Record<RoleName, PermissionName[]> = {
  superadmin: Object.keys(PERMISSIONS) as PermissionName[],
  admin: [
    'users.read.own', 'users.write.own', 'users.read.all', 'users.write.all', 'users.suspend',
    'wallets.read.own', 'wallets.write.own', 'wallets.read.all', 'wallets.adjust',
    'transactions.read.own', 'transactions.create', 'transactions.read.all', 'transactions.reverse',
    'cards.read.own', 'cards.manage.own', 'cards.read.all', 'cards.issue', 'cards.manage.all',
    'kyc.submit', 'kyc.review',
    'fees.read', 'fees.manage',
    'admin.dashboard',
    'roles.read', 'roles.assign',
  ],
  support: [
    'users.read.own', 'users.write.own', 'users.read.all',
    'wallets.read.own', 'wallets.read.all',
    'transactions.read.own', 'transactions.read.all',
    'cards.read.own', 'cards.read.all',
    'kyc.review',
    'admin.dashboard',
  ],
  merchant: [
    'users.read.own', 'users.write.own',
    'wallets.read.own', 'wallets.write.own',
    'transactions.read.own', 'transactions.create',
    'cards.read.own', 'cards.manage.own',
    'kyc.submit',
    'merchant.dashboard',
  ],
  agent: [
    'users.read.own', 'users.write.own',
    'wallets.read.own', 'wallets.write.own',
    'transactions.read.own', 'transactions.create',
    'kyc.submit',
    'agent.dashboard',
  ],
  user: [
    'users.read.own', 'users.write.own',
    'wallets.read.own', 'wallets.write.own',
    'transactions.read.own', 'transactions.create',
    'cards.read.own', 'cards.manage.own',
    'kyc.submit',
  ],
};

class RBACService {
  private userPermissions: Set<PermissionName> = new Set();
  private userRoles: RoleName[] = [];
  private userId: string | null = null;

  /**
   * Initialize RBAC for a user
   */
  async initialize(userId: string, roles: string): Promise<void> {
    this.userId = userId;
    this.userRoles = this.parseRoles(roles);
    this.userPermissions = this.getPermissionsForRoles(this.userRoles);
  }

  /**
   * Parse role string into array of role names
   */
  private parseRoles(roles: string): RoleName[] {
    if (!roles) return ['user'];

    const roleList = roles.toLowerCase().split(',').map(r => r.trim());
    return roleList.filter(r => r in ROLE_LEVELS) as RoleName[];
  }

  /**
   * Get all permissions for given roles
   */
  private getPermissionsForRoles(roles: RoleName[]): Set<PermissionName> {
    const permissions = new Set<PermissionName>();

    for (const role of roles) {
      const rolePerms = ROLE_PERMISSIONS[role] || [];
      rolePerms.forEach(p => permissions.add(p));
    }

    return permissions;
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: PermissionName): boolean {
    return this.userPermissions.has(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: PermissionName[]): boolean {
    return permissions.some(p => this.userPermissions.has(p));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(permissions: PermissionName[]): boolean {
    return permissions.every(p => this.userPermissions.has(p));
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: RoleName): boolean {
    return this.userRoles.includes(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: RoleName[]): boolean {
    return roles.some(r => this.userRoles.includes(r));
  }

  /**
   * Get user's highest role level
   */
  getRoleLevel(): number {
    return Math.max(...this.userRoles.map(r => ROLE_LEVELS[r] || 0), 0);
  }

  /**
   * Check if user is admin or higher
   */
  isAdmin(): boolean {
    return this.getRoleLevel() >= ROLE_LEVELS.admin;
  }

  /**
   * Check if user is superadmin
   */
  isSuperAdmin(): boolean {
    return this.getRoleLevel() >= ROLE_LEVELS.superadmin;
  }

  /**
   * Get all user permissions
   */
  getPermissions(): PermissionName[] {
    return Array.from(this.userPermissions);
  }

  /**
   * Get all user roles
   */
  getRoles(): RoleName[] {
    return [...this.userRoles];
  }

  /**
   * Check if user can access a specific resource
   */
  canAccess(resource: string, action: 'read' | 'write' | 'delete' | 'admin', isOwnResource: boolean = false): boolean {
    const ownPermission = `${resource}.${action}.own` as PermissionName;
    const allPermission = `${resource}.${action}.all` as PermissionName;
    const simplePermission = `${resource}.${action}` as PermissionName;

    if (isOwnResource && this.hasPermission(ownPermission)) {
      return true;
    }

    return this.hasPermission(allPermission) || this.hasPermission(simplePermission);
  }

  /**
   * Check if user can view another user in search
   */
  canViewUserInSearch(targetUserRole: string): boolean {
    const myLevel = this.getRoleLevel();
    const targetLevel = ROLE_LEVELS[targetUserRole as RoleName] || ROLE_LEVELS.user;

    // Admins can see everyone
    if (myLevel >= ROLE_LEVELS.admin) {
      return true;
    }

    // Regular users can only see other regular users
    return targetLevel <= ROLE_LEVELS.user;
  }

  /**
   * Secure user search using database function
   */
  async searchUsersSecure(query: string, limit: number = 10) {
    if (!this.userId) {
      throw new Error('RBAC not initialized');
    }

    const { data, error } = await supabase.rpc('search_users_secure', {
      p_searcher_id: this.userId,
      p_query: query,
      p_limit: limit,
    });

    if (error) {
      console.error('Secure search error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Clear RBAC state (on logout)
   */
  clear(): void {
    this.userPermissions.clear();
    this.userRoles = [];
    this.userId = null;
  }
}

// Export singleton instance
export const rbacService = new RBACService();

// Export types
export type { RBACService };

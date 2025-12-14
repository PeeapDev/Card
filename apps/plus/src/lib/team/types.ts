/**
 * Team Access Module - TypeScript Type Definitions
 * Handles team members, roles, permissions, and access control
 */

// =============================================
// ENUMS / TYPES
// =============================================

export type MemberStatus = 'active' | 'pending' | 'suspended' | 'deactivated';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

// Predefined roles
export type RoleType = 'owner' | 'admin' | 'manager' | 'accountant' | 'staff' | 'viewer' | 'custom';

// Permission categories
export type PermissionCategory =
  | 'dashboard'
  | 'transactions'
  | 'invoices'
  | 'subscriptions'
  | 'cards'
  | 'team'
  | 'reports'
  | 'settings'
  | 'fuel_station'
  | 'api';

// =============================================
// CORE ENTITIES
// =============================================

export interface TeamMember {
  id: string;
  business_id: string;
  user_id?: string; // Peeap user ID if linked

  // Personal info
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;

  // Role & Access
  role_id?: string;
  role_type: RoleType;
  role_name: string;
  permissions: Permission[];
  custom_permissions?: string[];

  // Status
  status: MemberStatus;
  invited_at?: string;
  joined_at?: string;
  suspended_at?: string;
  last_active_at?: string;

  // Settings
  two_factor_enabled?: boolean;
  notification_preferences?: NotificationPreferences;

  // Metadata
  department?: string;
  job_title?: string;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Relations
  role?: Role;
  invite?: TeamInvite;
}

export interface Role {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  role_type: RoleType;
  permissions: Permission[];
  is_system: boolean; // System roles can't be deleted
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  category: PermissionCategory;
  action: string;
  name: string;
  description?: string;
}

export interface TeamInvite {
  id: string;
  business_id: string;
  email: string;
  name?: string;
  role_id?: string;
  role_type: RoleType;
  status: InviteStatus;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  accepted_at?: string;
  token: string;
}

export interface NotificationPreferences {
  email_transactions: boolean;
  email_invoices: boolean;
  email_team_updates: boolean;
  email_reports: boolean;
  push_enabled: boolean;
}

export interface ActivityLog {
  id: string;
  business_id: string;
  member_id: string;
  member_name: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// =============================================
// DTOs
// =============================================

export interface InviteMemberDto {
  email: string;
  name?: string;
  role_type: RoleType;
  role_id?: string;
  department?: string;
  job_title?: string;
  custom_permissions?: string[];
}

export interface UpdateMemberDto {
  name?: string;
  phone?: string;
  role_type?: RoleType;
  role_id?: string;
  department?: string;
  job_title?: string;
  custom_permissions?: string[];
  notes?: string;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleDto extends Partial<CreateRoleDto> {}

// =============================================
// DASHBOARD / REPORTING
// =============================================

export interface TeamDashboardStats {
  total_members: number;
  active_members: number;
  pending_invites: number;
  suspended_members: number;
  roles_count: number;
  recent_activity: ActivityLog[];
  members_by_role: { role_name: string; count: number }[];
  members_by_department: { department: string; count: number }[];
}

export interface MemberFilters {
  status?: MemberStatus;
  role_type?: RoleType;
  department?: string;
  search?: string;
}

// =============================================
// PREDEFINED PERMISSIONS
// =============================================

export const AVAILABLE_PERMISSIONS: Permission[] = [
  // Dashboard
  { id: 'dashboard.view', category: 'dashboard', action: 'view', name: 'View Dashboard', description: 'Access the main dashboard' },

  // Transactions
  { id: 'transactions.view', category: 'transactions', action: 'view', name: 'View Transactions', description: 'View transaction history' },
  { id: 'transactions.create', category: 'transactions', action: 'create', name: 'Create Transactions', description: 'Initiate payments and transfers' },
  { id: 'transactions.export', category: 'transactions', action: 'export', name: 'Export Transactions', description: 'Export transaction data' },

  // Invoices
  { id: 'invoices.view', category: 'invoices', action: 'view', name: 'View Invoices', description: 'View all invoices' },
  { id: 'invoices.create', category: 'invoices', action: 'create', name: 'Create Invoices', description: 'Create and send invoices' },
  { id: 'invoices.edit', category: 'invoices', action: 'edit', name: 'Edit Invoices', description: 'Edit existing invoices' },
  { id: 'invoices.delete', category: 'invoices', action: 'delete', name: 'Delete Invoices', description: 'Delete invoices' },
  { id: 'invoices.record_payment', category: 'invoices', action: 'record_payment', name: 'Record Payments', description: 'Record invoice payments' },

  // Subscriptions
  { id: 'subscriptions.view', category: 'subscriptions', action: 'view', name: 'View Subscriptions', description: 'View subscription plans and subscribers' },
  { id: 'subscriptions.manage', category: 'subscriptions', action: 'manage', name: 'Manage Subscriptions', description: 'Create, edit, cancel subscriptions' },

  // Cards
  { id: 'cards.view', category: 'cards', action: 'view', name: 'View Cards', description: 'View employee cards' },
  { id: 'cards.issue', category: 'cards', action: 'issue', name: 'Issue Cards', description: 'Issue new employee cards' },
  { id: 'cards.manage', category: 'cards', action: 'manage', name: 'Manage Cards', description: 'Freeze, unfreeze, cancel cards' },
  { id: 'cards.approve', category: 'cards', action: 'approve', name: 'Approve Transactions', description: 'Approve card transactions' },

  // Team
  { id: 'team.view', category: 'team', action: 'view', name: 'View Team', description: 'View team members' },
  { id: 'team.invite', category: 'team', action: 'invite', name: 'Invite Members', description: 'Invite new team members' },
  { id: 'team.manage', category: 'team', action: 'manage', name: 'Manage Members', description: 'Edit roles, suspend, remove members' },
  { id: 'team.roles', category: 'team', action: 'roles', name: 'Manage Roles', description: 'Create and edit custom roles' },

  // Reports
  { id: 'reports.view', category: 'reports', action: 'view', name: 'View Reports', description: 'Access reports and analytics' },
  { id: 'reports.export', category: 'reports', action: 'export', name: 'Export Reports', description: 'Export report data' },

  // Settings
  { id: 'settings.view', category: 'settings', action: 'view', name: 'View Settings', description: 'View business settings' },
  { id: 'settings.manage', category: 'settings', action: 'manage', name: 'Manage Settings', description: 'Edit business settings' },
  { id: 'settings.billing', category: 'settings', action: 'billing', name: 'Manage Billing', description: 'View and manage billing' },

  // Fuel Station
  { id: 'fuel_station.view', category: 'fuel_station', action: 'view', name: 'View Fuel Operations', description: 'View fuel station data' },
  { id: 'fuel_station.sales', category: 'fuel_station', action: 'sales', name: 'Record Sales', description: 'Record fuel sales' },
  { id: 'fuel_station.inventory', category: 'fuel_station', action: 'inventory', name: 'Manage Inventory', description: 'Manage fuel inventory' },
  { id: 'fuel_station.fleet', category: 'fuel_station', action: 'fleet', name: 'Manage Fleet', description: 'Manage fleet accounts' },
  { id: 'fuel_station.manage', category: 'fuel_station', action: 'manage', name: 'Full Management', description: 'Full fuel station management' },

  // API
  { id: 'api.view', category: 'api', action: 'view', name: 'View API Keys', description: 'View API keys' },
  { id: 'api.manage', category: 'api', action: 'manage', name: 'Manage API Keys', description: 'Create and revoke API keys' },
];

// Predefined role permissions
export const ROLE_PERMISSIONS: Record<RoleType, string[]> = {
  owner: AVAILABLE_PERMISSIONS.map(p => p.id), // All permissions
  admin: AVAILABLE_PERMISSIONS.filter(p => p.id !== 'settings.billing').map(p => p.id),
  manager: [
    'dashboard.view', 'transactions.view', 'transactions.create',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.record_payment',
    'subscriptions.view', 'subscriptions.manage',
    'cards.view', 'cards.approve',
    'team.view',
    'reports.view',
    'fuel_station.view', 'fuel_station.sales', 'fuel_station.inventory',
  ],
  accountant: [
    'dashboard.view', 'transactions.view', 'transactions.export',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.record_payment',
    'subscriptions.view',
    'reports.view', 'reports.export',
    'fuel_station.view',
  ],
  staff: [
    'dashboard.view', 'transactions.view',
    'invoices.view',
    'fuel_station.view', 'fuel_station.sales',
  ],
  viewer: [
    'dashboard.view', 'transactions.view', 'invoices.view', 'subscriptions.view',
    'cards.view', 'team.view', 'reports.view', 'fuel_station.view',
  ],
  custom: [], // Custom roles define their own permissions
};

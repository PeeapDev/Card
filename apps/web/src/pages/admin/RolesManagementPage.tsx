import { useState, useEffect } from 'react';
import {
  UserCog,
  Shield,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  CreditCard,
  Wallet,
  Settings,
  Eye,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Lock,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

interface Permission {
  resource: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  actions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
}

interface Role {
  id: string;
  name: UserRole;
  displayName: string;
  description: string;
  permissions: Permission[];
  userCount: number;
  isSystem: boolean;
}

const defaultPermissions: Permission[] = [
  { resource: 'users', label: 'User Management', icon: Users, actions: { create: false, read: false, update: false, delete: false } },
  { resource: 'wallets', label: 'Wallets', icon: Wallet, actions: { create: false, read: false, update: false, delete: false } },
  { resource: 'cards', label: 'Cards', icon: CreditCard, actions: { create: false, read: false, update: false, delete: false } },
  { resource: 'transactions', label: 'Transactions', icon: Wallet, actions: { create: false, read: false, update: false, delete: false } },
  { resource: 'settings', label: 'System Settings', icon: Settings, actions: { create: false, read: false, update: false, delete: false } },
  { resource: 'roles', label: 'Role Management', icon: Shield, actions: { create: false, read: false, update: false, delete: false } },
];

const systemRoles: Role[] = [
  {
    id: 'role_superadmin',
    name: 'superadmin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions. Can manage roles and system settings.',
    permissions: defaultPermissions.map(p => ({ ...p, actions: { create: true, read: true, update: true, delete: true } })),
    userCount: 0,
    isSystem: true,
  },
  {
    id: 'role_admin',
    name: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access to manage users, transactions, and operations.',
    permissions: defaultPermissions.map(p => ({
      ...p,
      actions: p.resource === 'roles' || p.resource === 'settings'
        ? { create: false, read: true, update: false, delete: false }
        : { create: true, read: true, update: true, delete: true }
    })),
    userCount: 0,
    isSystem: true,
  },
  {
    id: 'role_merchant',
    name: 'merchant',
    displayName: 'Merchant',
    description: 'Business account with payment processing and transaction capabilities.',
    permissions: defaultPermissions.map(p => ({
      ...p,
      actions: ['wallets', 'cards', 'transactions'].includes(p.resource)
        ? { create: true, read: true, update: true, delete: false }
        : { create: false, read: false, update: false, delete: false }
    })),
    userCount: 0,
    isSystem: true,
  },
  {
    id: 'role_agent',
    name: 'agent',
    displayName: 'Agent',
    description: 'Support agent with customer service and transaction monitoring access.',
    permissions: defaultPermissions.map(p => ({
      ...p,
      actions: ['users', 'wallets', 'transactions'].includes(p.resource)
        ? { create: false, read: true, update: true, delete: false }
        : { create: false, read: false, update: false, delete: false }
    })),
    userCount: 0,
    isSystem: true,
  },
  {
    id: 'role_user',
    name: 'user',
    displayName: 'User',
    description: 'Standard user account with personal wallet and card access.',
    permissions: defaultPermissions.map(p => ({
      ...p,
      actions: ['wallets', 'cards', 'transactions'].includes(p.resource)
        ? { create: true, read: true, update: true, delete: false }
        : { create: false, read: false, update: false, delete: false }
    })),
    userCount: 0,
    isSystem: true,
  },
];

export function RolesManagementPage() {
  const [roles, setRoles] = useState<Role[]>(systemRoles);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchRoleCounts();
  }, []);

  const fetchRoleCounts = async () => {
    setLoading(true);
    try {
      // Get user counts per role - database uses 'roles' column (comma-separated)
      const { data: users } = await supabase.from('users').select('roles');

      const roleCounts = new Map<string, number>();
      users?.forEach(user => {
        // Handle comma-separated roles like "superadmin,admin"
        const userRoles = (user.roles || 'user').split(',').map((r: string) => r.trim());
        userRoles.forEach((role: string) => {
          roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
        });
      });

      setRoles(prev => prev.map(role => ({
        ...role,
        userCount: roleCounts.get(role.name) || 0,
      })));
    } catch (error) {
      console.error('Error fetching role counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRoleExpand = (roleId: string) => {
    setExpandedRole(expandedRole === roleId ? null : roleId);
  };

  const handlePermissionToggle = (roleId: string, resource: string, action: keyof Permission['actions']) => {
    setRoles(prev => prev.map(role => {
      if (role.id !== roleId || role.isSystem) return role;
      return {
        ...role,
        permissions: role.permissions.map(p => {
          if (p.resource !== resource) return p;
          return {
            ...p,
            actions: { ...p.actions, [action]: !p.actions[action] }
          };
        }),
      };
    }));
  };

  const getRoleBadgeColor = (name: UserRole) => {
    switch (name) {
      case 'superadmin': return 'bg-red-100 text-red-700';
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'merchant': return 'bg-green-100 text-green-700';
      case 'agent': return 'bg-orange-100 text-orange-700';
      case 'user': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
            <p className="text-gray-500">Configure user roles and permissions</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Custom Role
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {roles.map(role => (
            <Card key={role.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getRoleBadgeColor(role.name).replace('text-', 'bg-').split(' ')[0]}`}>
                  <Shield className={`w-5 h-5 ${getRoleBadgeColor(role.name).split(' ')[1]}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{role.displayName}</p>
                  <p className="text-xl font-semibold">{role.userCount}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Roles List */}
        <div className="space-y-4">
          {roles.map(role => (
            <Card key={role.id} className="overflow-hidden">
              {/* Role Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => toggleRoleExpand(role.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${getRoleBadgeColor(role.name).replace('text-', 'bg-').split(' ')[0]}`}>
                    <Shield className={`w-5 h-5 ${getRoleBadgeColor(role.name).split(' ')[1]}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{role.displayName}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(role.name)}`}>
                        {role.name}
                      </span>
                      {role.isSystem && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> System
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{role.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{role.userCount} users</p>
                    <p className="text-xs text-gray-500">{role.permissions.filter(p => Object.values(p.actions).some(v => v)).length} resources</p>
                  </div>
                  {expandedRole === role.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Permissions */}
              {expandedRole === role.id && (
                <div className="border-t border-gray-200 p-4">
                  <h4 className="font-medium text-gray-900 mb-4">Permissions</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase">
                          <th className="pb-3 font-medium">Resource</th>
                          <th className="pb-3 font-medium text-center">Create</th>
                          <th className="pb-3 font-medium text-center">Read</th>
                          <th className="pb-3 font-medium text-center">Update</th>
                          <th className="pb-3 font-medium text-center">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {role.permissions.map(permission => {
                          const Icon = permission.icon;
                          return (
                            <tr key={permission.resource} className="text-sm">
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium">{permission.label}</span>
                                </div>
                              </td>
                              {(['create', 'read', 'update', 'delete'] as const).map(action => (
                                <td key={action} className="py-3 text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePermissionToggle(role.id, permission.resource, action);
                                    }}
                                    disabled={role.isSystem}
                                    className={`p-1 rounded ${
                                      permission.actions[action]
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-gray-100 text-gray-400'
                                    } ${role.isSystem ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80'}`}
                                  >
                                    {permission.actions[action] ? (
                                      <CheckCircle className="w-4 h-4" />
                                    ) : (
                                      <XCircle className="w-4 h-4" />
                                    )}
                                  </button>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {!role.isSystem && (
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                      <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        Delete Role
                      </button>
                      <button className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                    </div>
                  )}

                  {role.isSystem && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                        <Lock className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <div className="text-sm text-yellow-700">
                          <p className="font-medium">System Role</p>
                          <p className="text-yellow-600">This is a system-defined role and cannot be modified. To customize permissions, create a new custom role.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* User Assignment Section */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick User Role Assignment</h3>
          <p className="text-sm text-gray-500 mb-4">
            To change a user's role, go to the User Management section and edit the individual user.
          </p>
          <div className="flex gap-4">
            <a
              href="/admin/users"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Manage Users
            </a>
            <a
              href="/admin/merchants"
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              Manage Merchants
            </a>
            <a
              href="/admin/agents"
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <UserCog className="w-4 h-4" />
              Manage Agents
            </a>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

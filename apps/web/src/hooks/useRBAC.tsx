/**
 * useRBAC Hook
 *
 * Provides RBAC functionality in React components
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { rbacService, RoleName, PermissionName } from '@/services/rbac.service';

export function useRBAC() {
  const { user } = useAuth();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (user?.id && user?.roles) {
      rbacService.initialize(user.id, user.roles.join(','));
      setInitialized(true);
    } else {
      rbacService.clear();
      setInitialized(false);
    }
  }, [user?.id, user?.roles]);

  const hasPermission = useCallback((permission: PermissionName): boolean => {
    return rbacService.hasPermission(permission);
  }, [initialized]);

  const hasAnyPermission = useCallback((permissions: PermissionName[]): boolean => {
    return rbacService.hasAnyPermission(permissions);
  }, [initialized]);

  const hasRole = useCallback((role: RoleName): boolean => {
    return rbacService.hasRole(role);
  }, [initialized]);

  const hasAnyRole = useCallback((roles: RoleName[]): boolean => {
    return rbacService.hasAnyRole(roles);
  }, [initialized]);

  const isAdmin = useCallback((): boolean => {
    return rbacService.isAdmin();
  }, [initialized]);

  const isSuperAdmin = useCallback((): boolean => {
    return rbacService.isSuperAdmin();
  }, [initialized]);

  const canAccess = useCallback((
    resource: string,
    action: 'read' | 'write' | 'delete' | 'admin',
    isOwnResource: boolean = false
  ): boolean => {
    return rbacService.canAccess(resource, action, isOwnResource);
  }, [initialized]);

  const canViewUserInSearch = useCallback((targetUserRole: string): boolean => {
    return rbacService.canViewUserInSearch(targetUserRole);
  }, [initialized]);

  return {
    initialized,
    hasPermission,
    hasAnyPermission,
    hasRole,
    hasAnyRole,
    isAdmin,
    isSuperAdmin,
    canAccess,
    canViewUserInSearch,
    getRoleLevel: () => rbacService.getRoleLevel(),
    getPermissions: () => rbacService.getPermissions(),
    getRoles: () => rbacService.getRoles(),
  };
}

/**
 * Permission Gate Component
 * Only renders children if user has required permissions
 */
interface PermissionGateProps {
  permission?: PermissionName;
  permissions?: PermissionName[];
  requireAll?: boolean;
  roles?: RoleName[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  roles,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasAnyRole, initialized } = useRBAC() as any;

  if (!initialized) {
    return null;
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasPerms = requireAll
      ? rbacService.hasAllPermissions(permissions)
      : rbacService.hasAnyPermission(permissions);

    if (!hasPerms) {
      return <>{fallback}</>;
    }
  }

  // Check roles
  if (roles && roles.length > 0 && !hasAnyRole(roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default useRBAC;

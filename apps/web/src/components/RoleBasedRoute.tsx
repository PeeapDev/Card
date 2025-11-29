import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import type { UserRole } from '@/types';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export function RoleBasedRoute({
  children,
  allowedRoles,
}: RoleBasedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has any of the allowed roles
  const hasRequiredRole = user.roles?.some(role => allowedRoles.includes(role));

  if (!hasRequiredRole) {
    // Redirect to their appropriate dashboard based on their role
    const userDashboard = getRoleDashboard(user.roles?.[0] || 'user');
    return <Navigate to={userDashboard} replace />;
  }

  return <>{children}</>;
}

// Helper function to get dashboard path based on role
export function getRoleDashboard(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'merchant':
      return '/merchant';
    case 'developer':
      return '/developer';
    case 'agent':
      return '/agent';
    case 'user':
    default:
      return '/dashboard';
  }
}

// Helper function to get user's primary dashboard
export function getUserDashboard(roles: UserRole[] | undefined): string {
  if (!roles || roles.length === 0) {
    return '/dashboard';
  }

  // Priority order for dashboard redirect
  const priorityOrder: UserRole[] = ['admin', 'merchant', 'developer', 'agent', 'user'];

  for (const role of priorityOrder) {
    if (roles.includes(role)) {
      return getRoleDashboard(role);
    }
  }

  return '/dashboard';
}

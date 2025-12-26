import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService, MfaRequiredResponse } from '@/services/auth.service';
import type { User, LoginRequest, RegisterRequest, UserRole } from '@/types';

// Storage key for active role preference
const ACTIVE_ROLE_KEY = 'peeap_active_role';

// Dashboard routes for each role
const ROLE_DASHBOARDS: Record<UserRole, string> = {
  user: '/dashboard',
  merchant: '/merchant',
  agent: '/agent',
  admin: '/admin',
  superadmin: '/admin',
  developer: '/developer',
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest & { mfaCode?: string }) => Promise<User | MfaRequiredResponse>;
  register: (data: RegisterRequest) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  // New role switching functionality
  activeRole: UserRole;
  availableRoles: UserRole[];
  switchRole: (role: UserRole) => void;
  getRoleDashboard: (role: UserRole) => string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<UserRole>('user');

  // Get available roles from user
  const availableRoles: UserRole[] = user?.roles || ['user'];

  // Get dashboard route for a role
  const getRoleDashboard = useCallback((role: UserRole): string => {
    return ROLE_DASHBOARDS[role] || '/dashboard';
  }, []);

  // Initialize active role from storage or user's first role
  useEffect(() => {
    if (user?.roles && user.roles.length > 0) {
      const storedRole = localStorage.getItem(ACTIVE_ROLE_KEY) as UserRole | null;
      if (storedRole && user.roles.includes(storedRole)) {
        setActiveRole(storedRole);
      } else {
        // Default to first role (priority: user > merchant > agent)
        const priorityOrder: UserRole[] = ['user', 'merchant', 'agent', 'admin', 'superadmin', 'developer'];
        const firstRole = priorityOrder.find(r => user.roles.includes(r)) || user.roles[0];
        setActiveRole(firstRole);
        localStorage.setItem(ACTIVE_ROLE_KEY, firstRole);
      }
    }
  }, [user?.roles]);

  // Switch active role
  const switchRole = useCallback((role: UserRole) => {
    if (user?.roles?.includes(role)) {
      setActiveRole(role);
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
    }
  }, [user?.roles]);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authService.getProfile();
      setUser(profile);
    } catch {
      setUser(null);
      // Logout clears secure cookies via sessionService
      await authService.logout();
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        await refreshUser();
      }
      setIsLoading(false);
    };

    initAuth();
  }, [refreshUser]);

  const login = async (data: LoginRequest & { mfaCode?: string }): Promise<User | MfaRequiredResponse> => {
    const result = await authService.login(data);

    // Check if MFA is required
    if ('mfaRequired' in result) {
      return result as MfaRequiredResponse;
    }

    // Normal login success - cast to ensure TypeScript knows this is the non-MFA case
    const loginResult = result as { user: User; tokens: { accessToken: string; refreshToken: string; expiresIn: number } };
    authService.setTokens(loginResult.tokens);
    setUser(loginResult.user);
    return loginResult.user;
  };

  const register = async (data: RegisterRequest): Promise<User> => {
    const result = await authService.register(data);
    authService.setTokens(result.tokens);
    setUser(result.user);
    return result.user;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const hasRole = useCallback((role: UserRole): boolean => {
    return user?.roles?.includes(role) ?? false;
  }, [user]);

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    return roles.some(role => user?.roles?.includes(role));
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        hasRole,
        hasAnyRole,
        // Role switching
        activeRole,
        availableRoles,
        switchRole,
        getRoleDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

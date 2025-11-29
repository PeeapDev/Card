import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService } from '@/services/auth.service';
import type { User, LoginRequest, RegisterRequest, UserRole } from '@/types';

// Demo users for testing - these simulate different role types
const DEMO_USERS: Record<string, User> = {
  admin: {
    id: 'demo-admin-001',
    email: 'admin@demo.com',
    firstName: 'Admin',
    lastName: 'User',
    phone: '+1234567890',
    roles: ['admin'],
    isActive: true,
    kycStatus: 'VERIFIED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  user: {
    id: 'demo-user-001',
    email: 'user@demo.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567891',
    roles: ['user'],
    isActive: true,
    kycStatus: 'VERIFIED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  merchant: {
    id: 'demo-merchant-001',
    email: 'merchant@demo.com',
    firstName: 'Merchant',
    lastName: 'Store',
    phone: '+1234567892',
    roles: ['merchant'],
    isActive: true,
    kycStatus: 'VERIFIED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  developer: {
    id: 'demo-developer-001',
    email: 'developer@demo.com',
    firstName: 'Dev',
    lastName: 'User',
    phone: '+1234567893',
    roles: ['developer'],
    isActive: true,
    kycStatus: 'VERIFIED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  agent: {
    id: 'demo-agent-001',
    email: 'agent@demo.com',
    firstName: 'Agent',
    lastName: 'User',
    phone: '+1234567894',
    roles: ['agent'],
    isActive: true,
    kycStatus: 'VERIFIED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<User>;
  register: (data: RegisterRequest) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  demoLogin: (role: keyof typeof DEMO_USERS) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      // First check for demo user in localStorage
      const demoUser = localStorage.getItem('demoUser');
      if (demoUser) {
        setUser(JSON.parse(demoUser));
        return;
      }

      // Otherwise try to get profile from API
      const profile = await authService.getProfile();
      setUser(profile);
    } catch {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('demoUser');
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      // Check for demo user first
      const demoUser = localStorage.getItem('demoUser');
      if (demoUser) {
        setUser(JSON.parse(demoUser));
        setIsLoading(false);
        return;
      }

      if (authService.isAuthenticated()) {
        await refreshUser();
      }
      setIsLoading(false);
    };

    initAuth();
  }, [refreshUser]);

  const login = async (data: LoginRequest): Promise<User> => {
    const result = await authService.login(data);
    authService.setTokens(result.tokens);
    setUser(result.user);
    return result.user;
  };

  // Demo login function for testing purposes
  const demoLogin = async (role: keyof typeof DEMO_USERS): Promise<User> => {
    const demoUser = DEMO_USERS[role];
    if (!demoUser) {
      throw new Error('Invalid demo role');
    }
    // Store demo user in localStorage for persistence
    localStorage.setItem('demoUser', JSON.stringify(demoUser));
    localStorage.setItem('accessToken', 'demo-token-' + role);
    setUser(demoUser);
    return demoUser;
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
        demoLogin,
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

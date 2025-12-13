import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService, MfaRequiredResponse } from '@/services/auth.service';
import type { User, LoginRequest, RegisterRequest, UserRole } from '@/types';

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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

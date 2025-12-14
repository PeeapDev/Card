/**
 * Mock AuthContext for testing
 */
import React, { createContext, useContext, ReactNode } from 'react';

// Default mock values
const defaultMockAuth = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: jest.fn().mockResolvedValue({ id: 'test-user' }),
  register: jest.fn().mockResolvedValue({ id: 'test-user' }),
  logout: jest.fn().mockResolvedValue(undefined),
  refreshUser: jest.fn().mockResolvedValue(undefined),
  hasRole: jest.fn().mockReturnValue(false),
  hasAnyRole: jest.fn().mockReturnValue(false),
};

// Create the context with mock values
const AuthContext = createContext(defaultMockAuth);

// Export a mutable mock state so tests can modify it
export const mockAuthState = { ...defaultMockAuth };

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={mockAuthState}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Helper to reset mock state between tests
export function resetMockAuth() {
  Object.assign(mockAuthState, defaultMockAuth);
}

// Helper to set authenticated user
export function setMockUser(user: { id: string; email?: string; firstName?: string; lastName?: string } | null) {
  mockAuthState.user = user as any;
  mockAuthState.isAuthenticated = !!user;
}

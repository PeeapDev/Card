/**
 * Mock Supabase client for testing
 */
export const supabase = {
  channel: jest.fn(() => ({
    on: jest.fn(() => ({
      subscribe: jest.fn(),
    })),
  })),
  removeChannel: jest.fn(),
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
      order: jest.fn(() => ({
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
    })),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
};

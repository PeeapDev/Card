/**
 * Mock URL configuration for testing
 */
export const API_URL = 'https://api.test.com';
export const API_BASE_URL = 'https://api.test.com';
export const SUPABASE_URL = 'https://test.supabase.co';
export const SUPABASE_ANON_KEY = 'test-anon-key';

export const getApiEndpoint = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${cleanPath}`;
};

export const getSupabaseUrl = (): string => SUPABASE_URL;
export const getSupabaseAnonKey = (): string => SUPABASE_ANON_KEY;

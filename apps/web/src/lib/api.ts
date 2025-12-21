/**
 * API client utility for making requests to the backend
 */

// Ensure API_BASE_URL ends with /api for proper routing
const envApiUrl = import.meta.env.VITE_API_URL;
const API_BASE_URL = envApiUrl
  ? (envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl}/api`)
  : '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

// Get token from secure cookie
function getSessionToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )peeap_session=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Get Supabase auth token from localStorage
function getSupabaseToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    // Try the standard Supabase storage key pattern
    const keys = Object.keys(localStorage).filter(k => k.includes('supabase') && k.includes('auth-token'));
    for (const key of keys) {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed?.access_token) {
          return parsed.access_token;
        }
      }
    }
    // Also try the project-specific key pattern
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (sbKey) {
      const data = localStorage.getItem(sbKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed?.access_token) {
          return parsed.access_token;
        }
      }
    }
  } catch (e) {
    console.error('[API] Error getting Supabase token:', e);
  }
  return null;
}

/**
 * Get authentication headers from stored tokens (secure cookie or Supabase)
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  // First try secure cookie session token
  const sessionToken = getSessionToken();
  if (sessionToken) {
    headers['Authorization'] = `Session ${sessionToken}`;
    return headers;
  }

  // Fall back to Supabase auth token
  const supabaseToken = getSupabaseToken();
  if (supabaseToken) {
    headers['Authorization'] = `Bearer ${supabaseToken}`;
  }

  return headers;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};
// Build trigger Wed Dec  3 08:44:57 GMT 2025

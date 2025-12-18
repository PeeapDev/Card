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

/**
 * Get authentication headers from stored tokens (secure cookie)
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  // Get token from secure cookie instead of localStorage
  const accessToken = getSessionToken();
  if (accessToken) {
    // Send the session token - backend validates it against the database
    headers['Authorization'] = `Session ${accessToken}`;
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

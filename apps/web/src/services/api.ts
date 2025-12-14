import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { AuthTokens, ApiError } from '@/types';
import { sessionService } from './session.service';

const API_BASE_URL = '/api/v1';

class ApiService {
  private client: AxiosInstance;
  private refreshPromise: Promise<AuthTokens> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Get session token from secure cookie (NOT localStorage)
        const token = sessionService.getSessionToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Refresh session in database
            await sessionService.refreshSession();
            const token = sessionService.getSessionToken();

            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Session refresh failed - logout and redirect
            await sessionService.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<AuthTokens> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Refresh session in database
    await sessionService.refreshSession();
    const token = sessionService.getSessionToken() || '';

    return {
      accessToken: token,
      refreshToken: token,
      expiresIn: 604800,
    };
  }

  get instance() {
    return this.client;
  }
}

export const apiService = new ApiService();
export const api = apiService.instance;

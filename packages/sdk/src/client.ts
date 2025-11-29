/**
 * HTTP Client for SoftTouch SDK
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { SDKConfig, SDKError, ApiResponse } from './types';
import { DEFAULT_CONFIG, ENVIRONMENTS } from './config';

export class HttpClient {
  private client: AxiosInstance;
  private config: Required<SDKConfig>;

  constructor(config: SDKConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      baseUrl: config.baseUrl || ENVIRONMENTS[config.environment || 'sandbox'],
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-SDK-Version': '1.0.0',
        'X-SDK-Language': 'javascript',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add request ID for tracing
        config.headers['X-Request-ID'] = this.generateRequestId();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as AxiosRequestConfig & { _retryCount?: number };

        // Retry logic for transient errors
        if (this.shouldRetry(error) && (config._retryCount || 0) < this.config.retryAttempts) {
          config._retryCount = (config._retryCount || 0) + 1;

          await this.delay(this.config.retryDelay * config._retryCount);
          return this.client.request(config);
        }

        throw this.formatError(error);
      }
    );
  }

  private shouldRetry(error: AxiosError): boolean {
    // Retry on network errors or 5xx server errors
    if (!error.response) return true;
    return error.response.status >= 500 && error.response.status < 600;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private formatError(error: AxiosError<any>): SDKError {
    const response = error.response;

    if (!response) {
      return {
        error: true,
        message: error.message || 'Network error',
        status: 0,
        code: 'NETWORK_ERROR',
        requestId: (error.config?.headers?.['X-Request-ID'] as string) || 'unknown',
      };
    }

    const data = response.data || {};

    return {
      error: true,
      message: data.message || error.message || 'Unknown error',
      status: response.status,
      code: data.code || `HTTP_${response.status}`,
      requestId: data.requestId || (error.config?.headers?.['X-Request-ID'] as string) || 'unknown',
      details: data.details,
    };
  }

  async get<T>(path: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(path, { params });
    return response.data;
  }

  async post<T>(path: string, data?: Record<string, any>): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(path, data);
    return response.data;
  }

  async put<T>(path: string, data?: Record<string, any>): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(path, data);
    return response.data;
  }

  async patch<T>(path: string, data?: Record<string, any>): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(path, data);
    return response.data;
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(path);
    return response.data;
  }

  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  getEnvironment(): string {
    return this.config.environment;
  }
}

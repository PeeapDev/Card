/**
 * Developer Resource
 * Manage API keys, webhooks, and developer settings
 */

import { HttpClient } from '../client';
import {
  ApiKey,
  CreateApiKeyParams,
  CreateApiKeyResult,
  Webhook,
  CreateWebhookParams,
  WebhookEvent,
  PaginationParams,
  PaginatedResponse,
} from '../types';

export class DeveloperResource {
  constructor(private client: HttpClient) {}

  // API Keys

  /**
   * List all API keys
   * @returns List of API keys (secrets are masked)
   */
  async listApiKeys(): Promise<ApiKey[]> {
    const response = await this.client.get<ApiKey[]>('/developer/api-keys');
    return response.data;
  }

  /**
   * Create a new API key
   * @param params - API key creation parameters
   * @returns Created API key with full secret (only shown once)
   */
  async createApiKey(params: CreateApiKeyParams): Promise<CreateApiKeyResult> {
    const response = await this.client.post<CreateApiKeyResult>('/developer/api-keys', params);
    return response.data;
  }

  /**
   * Get API key by ID
   * @param keyId - The API key ID
   * @returns API key details (secret is masked)
   */
  async getApiKey(keyId: string): Promise<ApiKey> {
    const response = await this.client.get<ApiKey>(`/developer/api-keys/${keyId}`);
    return response.data;
  }

  /**
   * Revoke an API key
   * @param keyId - The API key ID to revoke
   * @returns Confirmation
   */
  async revokeApiKey(keyId: string): Promise<{ success: boolean }> {
    const response = await this.client.delete<{ success: boolean }>(`/developer/api-keys/${keyId}`);
    return response.data;
  }

  /**
   * Roll (regenerate) an API key
   * @param keyId - The API key ID to roll
   * @returns New API key with full secret
   */
  async rollApiKey(keyId: string): Promise<CreateApiKeyResult> {
    const response = await this.client.post<CreateApiKeyResult>(`/developer/api-keys/${keyId}/roll`);
    return response.data;
  }

  // Webhooks

  /**
   * List all webhooks
   * @returns List of webhooks
   */
  async listWebhooks(): Promise<Webhook[]> {
    const response = await this.client.get<Webhook[]>('/developer/webhooks');
    return response.data;
  }

  /**
   * Create a new webhook endpoint
   * @param params - Webhook creation parameters
   * @returns Created webhook with secret
   */
  async createWebhook(params: CreateWebhookParams): Promise<Webhook> {
    const response = await this.client.post<Webhook>('/developer/webhooks', params);
    return response.data;
  }

  /**
   * Get webhook by ID
   * @param webhookId - The webhook ID
   * @returns Webhook details
   */
  async getWebhook(webhookId: string): Promise<Webhook> {
    const response = await this.client.get<Webhook>(`/developer/webhooks/${webhookId}`);
    return response.data;
  }

  /**
   * Update webhook
   * @param webhookId - The webhook ID
   * @param params - Update parameters
   * @returns Updated webhook
   */
  async updateWebhook(webhookId: string, params: Partial<CreateWebhookParams>): Promise<Webhook> {
    const response = await this.client.patch<Webhook>(`/developer/webhooks/${webhookId}`, params);
    return response.data;
  }

  /**
   * Delete webhook
   * @param webhookId - The webhook ID to delete
   * @returns Confirmation
   */
  async deleteWebhook(webhookId: string): Promise<{ success: boolean }> {
    const response = await this.client.delete<{ success: boolean }>(`/developer/webhooks/${webhookId}`);
    return response.data;
  }

  /**
   * Enable a disabled webhook
   * @param webhookId - The webhook ID
   * @returns Updated webhook
   */
  async enableWebhook(webhookId: string): Promise<Webhook> {
    const response = await this.client.post<Webhook>(`/developer/webhooks/${webhookId}/enable`);
    return response.data;
  }

  /**
   * Disable an active webhook
   * @param webhookId - The webhook ID
   * @returns Updated webhook
   */
  async disableWebhook(webhookId: string): Promise<Webhook> {
    const response = await this.client.post<Webhook>(`/developer/webhooks/${webhookId}/disable`);
    return response.data;
  }

  /**
   * Roll (regenerate) webhook secret
   * @param webhookId - The webhook ID
   * @returns Updated webhook with new secret
   */
  async rollWebhookSecret(webhookId: string): Promise<Webhook> {
    const response = await this.client.post<Webhook>(`/developer/webhooks/${webhookId}/roll-secret`);
    return response.data;
  }

  /**
   * Test webhook by sending a test event
   * @param webhookId - The webhook ID to test
   * @param eventType - Optional specific event type to test
   * @returns Test result
   */
  async testWebhook(webhookId: string, eventType?: string): Promise<{
    success: boolean;
    statusCode: number;
    responseTime: number;
    error?: string;
  }> {
    const response = await this.client.post<{
      success: boolean;
      statusCode: number;
      responseTime: number;
      error?: string;
    }>(`/developer/webhooks/${webhookId}/test`, { eventType });
    return response.data;
  }

  /**
   * Get webhook delivery history
   * @param webhookId - The webhook ID
   * @param params - Pagination parameters
   * @returns Paginated list of webhook events
   */
  async getWebhookHistory(webhookId: string, params?: PaginationParams): Promise<PaginatedResponse<{
    id: string;
    eventType: string;
    status: 'delivered' | 'failed' | 'pending';
    statusCode?: number;
    responseTime?: number;
    attempts: number;
    createdAt: string;
  }>> {
    const response = await this.client.get<PaginatedResponse<{
      id: string;
      eventType: string;
      status: 'delivered' | 'failed' | 'pending';
      statusCode?: number;
      responseTime?: number;
      attempts: number;
      createdAt: string;
    }>>(`/developer/webhooks/${webhookId}/history`, params);
    return response.data;
  }

  /**
   * Retry a failed webhook delivery
   * @param webhookId - The webhook ID
   * @param deliveryId - The delivery ID to retry
   * @returns Retry result
   */
  async retryWebhookDelivery(webhookId: string, deliveryId: string): Promise<{
    success: boolean;
    statusCode?: number;
  }> {
    const response = await this.client.post<{
      success: boolean;
      statusCode?: number;
    }>(`/developer/webhooks/${webhookId}/deliveries/${deliveryId}/retry`);
    return response.data;
  }

  // Request Logs

  /**
   * Get API request logs
   * @param params - Filter and pagination parameters
   * @returns Paginated list of request logs
   */
  async getRequestLogs(params?: PaginationParams & {
    method?: string;
    statusCode?: number;
    endpoint?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<{
    id: string;
    method: string;
    endpoint: string;
    statusCode: number;
    responseTime: number;
    requestId: string;
    ipAddress: string;
    createdAt: string;
  }>> {
    const response = await this.client.get<PaginatedResponse<{
      id: string;
      method: string;
      endpoint: string;
      statusCode: number;
      responseTime: number;
      requestId: string;
      ipAddress: string;
      createdAt: string;
    }>>('/developer/logs', params);
    return response.data;
  }

  /**
   * Get API usage statistics
   * @param period - Time period for stats
   * @returns API usage statistics
   */
  async getUsageStats(period: 'day' | 'week' | 'month' = 'month'): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsByEndpoint: Record<string, number>;
    requestsByDay: Array<{ date: string; count: number }>;
  }> {
    const response = await this.client.get<{
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      averageResponseTime: number;
      requestsByEndpoint: Record<string, number>;
      requestsByDay: Array<{ date: string; count: number }>;
    }>('/developer/stats', { period });
    return response.data;
  }

  /**
   * Get list of available webhook events
   * @returns List of event types
   */
  async getAvailableEvents(): Promise<Array<{
    type: string;
    description: string;
    category: string;
  }>> {
    const response = await this.client.get<Array<{
      type: string;
      description: string;
      category: string;
    }>>('/developer/webhook-events');
    return response.data;
  }
}

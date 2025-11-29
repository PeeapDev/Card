/**
 * QR Code Resource
 * Generate and process QR code payments
 */

import { HttpClient } from '../client';
import {
  QRCode,
  GenerateQRParams,
  ScanQRResult,
  PaginationParams,
  PaginatedResponse,
} from '../types';

export class QRCodeResource {
  constructor(private client: HttpClient) {}

  /**
   * Generate a new QR code for payment
   * @param params - QR code generation parameters
   * @returns Generated QR code details
   */
  async generate(params?: GenerateQRParams): Promise<QRCode & { qrImage: string }> {
    const response = await this.client.post<QRCode & { qrImage: string }>('/qr/generate', params || {});
    return response.data;
  }

  /**
   * Scan and process a QR code
   * @param qrPayload - The scanned QR code payload/data
   * @returns Scan result with payment details
   */
  async scan(qrPayload: string): Promise<ScanQRResult> {
    const response = await this.client.post<ScanQRResult>('/qr/scan', { payload: qrPayload });
    return response.data;
  }

  /**
   * Decode QR code without processing payment
   * @param qrPayload - The QR code payload to decode
   * @returns Decoded QR code information
   */
  async decode(qrPayload: string): Promise<{
    type: 'payment' | 'merchant' | 'transfer';
    amount?: number;
    currency: string;
    merchantId?: string;
    merchantName?: string;
    recipientId?: string;
    expiresAt?: string;
    metadata?: Record<string, any>;
  }> {
    const response = await this.client.post<{
      type: 'payment' | 'merchant' | 'transfer';
      amount?: number;
      currency: string;
      merchantId?: string;
      merchantName?: string;
      recipientId?: string;
      expiresAt?: string;
      metadata?: Record<string, any>;
    }>('/qr/decode', { payload: qrPayload });
    return response.data;
  }

  /**
   * Complete a QR payment (after scanning)
   * @param qrId - The QR code ID
   * @param pin - User's transaction PIN
   * @returns Payment result
   */
  async completePayment(qrId: string, pin: string): Promise<{
    id: string;
    amount: number;
    status: 'completed' | 'failed';
    reference: string;
    merchantName?: string;
  }> {
    const response = await this.client.post<{
      id: string;
      amount: number;
      status: 'completed' | 'failed';
      reference: string;
      merchantName?: string;
    }>(`/qr/${qrId}/pay`, { pin });
    return response.data;
  }

  /**
   * Get QR code by ID
   * @param qrId - The QR code ID
   * @returns QR code details
   */
  async get(qrId: string): Promise<QRCode> {
    const response = await this.client.get<QRCode>(`/qr/${qrId}`);
    return response.data;
  }

  /**
   * List generated QR codes
   * @param params - Pagination parameters
   * @returns Paginated list of QR codes
   */
  async list(params?: PaginationParams & {
    type?: 'static' | 'dynamic';
    status?: 'active' | 'used' | 'expired';
  }): Promise<PaginatedResponse<QRCode>> {
    const response = await this.client.get<PaginatedResponse<QRCode>>('/qr', params);
    return response.data;
  }

  /**
   * Deactivate/expire a QR code
   * @param qrId - The QR code ID to deactivate
   * @returns Updated QR code
   */
  async deactivate(qrId: string): Promise<QRCode> {
    const response = await this.client.post<QRCode>(`/qr/${qrId}/deactivate`);
    return response.data;
  }

  /**
   * Get QR code payment history
   * @param qrId - The QR code ID
   * @param params - Pagination parameters
   * @returns List of payments made with this QR code
   */
  async getPaymentHistory(qrId: string, params?: PaginationParams): Promise<PaginatedResponse<{
    id: string;
    amount: number;
    status: string;
    payerId?: string;
    payerName?: string;
    createdAt: string;
  }>> {
    const response = await this.client.get<PaginatedResponse<{
      id: string;
      amount: number;
      status: string;
      payerId?: string;
      payerName?: string;
      createdAt: string;
    }>>(`/qr/${qrId}/payments`, params);
    return response.data;
  }

  /**
   * Generate a merchant static QR code
   * @returns Static QR code for merchant payments
   */
  async generateMerchantQR(): Promise<QRCode & { qrImage: string }> {
    const response = await this.client.post<QRCode & { qrImage: string }>('/qr/merchant');
    return response.data;
  }

  /**
   * Update static QR code settings
   * @param qrId - The QR code ID
   * @param params - Update parameters
   * @returns Updated QR code
   */
  async update(qrId: string, params: {
    defaultAmount?: number;
    metadata?: Record<string, any>;
  }): Promise<QRCode> {
    const response = await this.client.patch<QRCode>(`/qr/${qrId}`, params);
    return response.data;
  }

  /**
   * Get QR code statistics
   * @param params - Date range parameters
   * @returns QR code usage statistics
   */
  async getStats(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalGenerated: number;
    totalScanned: number;
    totalCompleted: number;
    totalAmount: number;
    conversionRate: number;
  }> {
    const response = await this.client.get<{
      totalGenerated: number;
      totalScanned: number;
      totalCompleted: number;
      totalAmount: number;
      conversionRate: number;
    }>('/qr/stats', params);
    return response.data;
  }
}

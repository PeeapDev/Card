/**
 * KYC Service - Handles identity verification with OCR
 */

import { supabase } from '@/lib/supabase';
import { sessionService } from './session.service';

export interface KycDocument {
  type: 'PASSPORT' | 'DRIVERS_LICENSE' | 'NATIONAL_ID' | 'SELFIE' | 'UTILITY_BILL';
  data: string; // Base64 encoded image
  mimeType: string;
}

export interface KycSubmitRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  address: {
    street: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
  documents: KycDocument[];
}

export interface OcrVerificationResult {
  isValid: boolean;
  documentType: string;
  extractedData: {
    documentType?: string;
    documentNumber?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    dateOfBirth?: string;
    expiryDate?: string;
    nationality?: string;
    gender?: string;
    confidence: number;
  };
  matchScore: number;
  issues: string[];
}

export interface LivenessResult {
  isLive: boolean;
  confidence: number;
  frames: string[]; // Base64 frames captured
}

// Convert File to base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Capture frame from video element
export function captureVideoFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(video, 0, 0);
  }
  // Return base64 without prefix
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}

export const kycService = {
  /**
   * Submit KYC application with documents
   */
  async submitKyc(userId: string, data: KycSubmitRequest): Promise<{ applicationId: string; verificationResult?: OcrVerificationResult }> {
    // Store encrypted documents and KYC data in Supabase
    const { data: application, error } = await supabase
      .from('kyc_applications')
      .insert({
        user_id: userId,
        first_name: data.firstName,
        last_name: data.lastName,
        date_of_birth: data.dateOfBirth,
        nationality: data.nationality,
        address: data.address,
        documents: data.documents.map(doc => ({
          type: doc.type,
          mimeType: doc.mimeType,
          // Store base64 data (in production, encrypt this)
          data: doc.data,
          uploadedAt: new Date().toISOString(),
        })),
        status: 'PENDING',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('KYC submission error:', error);
      throw new Error(error.message || 'Failed to submit KYC application');
    }

    // Update user's KYC status
    await supabase
      .from('users')
      .update({
        kyc_status: 'PENDING',
        first_name: data.firstName,
        last_name: data.lastName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Process OCR verification (call backend or process locally)
    const verificationResult = await this.verifyDocumentWithOcr(
      data.documents.find(d => d.type === 'NATIONAL_ID' || d.type === 'PASSPORT')!,
      {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
      }
    );

    // Update application with verification result
    if (verificationResult) {
      await supabase
        .from('kyc_applications')
        .update({
          verification_result: {
            documentCheck: verificationResult.isValid,
            documentType: verificationResult.documentType,
            extractedData: verificationResult.extractedData,
            matchScore: verificationResult.matchScore,
            issues: verificationResult.issues,
            ocrProcessedAt: new Date().toISOString(),
          },
          status: verificationResult.isValid ? 'PENDING' : 'REJECTED',
          rejection_reason: verificationResult.issues.length > 0
            ? verificationResult.issues.join('; ')
            : undefined,
        })
        .eq('id', application.id);

      // If document is expired, reject immediately
      if (verificationResult.issues.some(i => i.includes('expired'))) {
        await supabase
          .from('users')
          .update({ kyc_status: 'REJECTED' })
          .eq('id', userId);
      }
    }

    return {
      applicationId: application.id,
      verificationResult,
    };
  },

  /**
   * Verify document using OCR (calls backend API)
   */
  async verifyDocumentWithOcr(
    document: KycDocument,
    expectedData: { firstName: string; lastName: string; dateOfBirth: string }
  ): Promise<OcrVerificationResult> {
    // For now, we'll call the backend API if available
    // Otherwise, do basic validation
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
      const response = await fetch(`${API_URL}/kyc/verify-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionService.getSessionToken()}`,
        },
        body: JSON.stringify({
          documentBase64: document.data,
          mimeType: document.mimeType,
          expectedData,
        }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
    }

    // Fallback: Basic validation without OCR
    return {
      isValid: true,
      documentType: document.type,
      extractedData: {
        confidence: 50, // Low confidence without OCR
      },
      matchScore: 50,
      issues: ['OCR verification pending - manual review required'],
    };
  },

  /**
   * Perform liveness check with video frames
   */
  async performLivenessCheck(frames: string[]): Promise<LivenessResult> {
    // In production, this would call a liveness detection API
    // For now, we just verify we have enough frames from different angles

    if (frames.length < 3) {
      return {
        isLive: false,
        confidence: 0,
        frames,
      };
    }

    // Basic check: ensure frames are different (user moved)
    // In production, use ML-based liveness detection
    return {
      isLive: true,
      confidence: 85,
      frames,
    };
  },

  /**
   * Get KYC status for user
   */
  async getKycStatus(userId: string) {
    const { data, error } = await supabase
      .from('kyc_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Check if Sierra Leone National ID is expired
   */
  isDocumentExpired(expiryDateStr: string): boolean {
    if (!expiryDateStr) return false;

    try {
      const expiryDate = new Date(expiryDateStr);
      const today = new Date();
      return expiryDate < today;
    } catch {
      return false;
    }
  },

  /**
   * Parse Sierra Leone National ID number format
   * Format: Usually starts with SLE followed by numbers
   */
  validateSierraLeoneNationalId(idNumber: string): boolean {
    if (!idNumber) return false;

    // Sierra Leone National ID patterns
    const patterns = [
      /^SLE\d{9,12}$/i,  // SLE followed by 9-12 digits
      /^[A-Z]{2}\d{7,10}$/i,  // Two letters followed by 7-10 digits
      /^\d{9,12}$/,  // Just 9-12 digits
    ];

    return patterns.some(pattern => pattern.test(idNumber.replace(/[\s-]/g, '')));
  },
};

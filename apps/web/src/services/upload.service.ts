/**
 * Upload Service
 * Handles file uploads to Supabase Storage
 */

import { supabase } from '@/lib/supabase';

// Configuration
const UPLOAD_CONFIG = {
  // Supabase storage bucket name
  bucketName: 'uploads',

  // Maximum file size in bytes (5MB)
  maxFileSize: 5 * 1024 * 1024,

  // Allowed MIME types
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
};

export interface UploadResult {
  success: boolean;
  url: string;
  filename: string;
  size: number;
}

export interface UploadError {
  message: string;
  code?: string;
}

/**
 * Generate a unique filename
 */
function generateUniqueFilename(originalName: string): string {
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${extension}`;
}

/**
 * Validate file before upload
 */
function validateFile(file: File): string | null {
  // Check file size
  if (file.size > UPLOAD_CONFIG.maxFileSize) {
    return `File size exceeds ${UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB limit`;
  }

  // Check file type
  if (!UPLOAD_CONFIG.allowedTypes.includes(file.type)) {
    return 'Invalid file type. Allowed: JPG, PNG, GIF, WebP, SVG';
  }

  return null;
}

export const uploadService = {
  /**
   * Upload an image file to Supabase Storage
   * @param file - The file to upload
   * @param folder - The destination folder (e.g., 'business-logos', 'user-avatars')
   */
  async uploadImage(file: File, folder: string = 'uploads'): Promise<UploadResult> {
    // Validate the file
    const validationError = validateFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    // Generate unique filename
    const filename = generateUniqueFilename(file.name);
    const filePath = `${folder}/${filename}`;

    try {
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(UPLOAD_CONFIG.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(error.message);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(UPLOAD_CONFIG.bucketName)
        .getPublicUrl(data.path);

      return {
        success: true,
        url: urlData.publicUrl,
        filename: filename,
        size: file.size,
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      throw new Error(error.message || 'Failed to upload file');
    }
  },

  /**
   * Upload multiple images
   * @param files - Array of files to upload
   * @param folder - The destination folder
   */
  async uploadImages(files: File[], folder: string = 'uploads'): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadImage(file, folder);
        results.push(result);
      } catch (error: any) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Continue with other files
      }
    }

    return results;
  },

  /**
   * Delete an uploaded file from Supabase Storage
   * @param url - The URL of the file to delete
   */
  async deleteImage(url: string): Promise<boolean> {
    try {
      // Extract the file path from the URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/uploads/folder/filename.jpg
      const urlParts = url.split('/storage/v1/object/public/');
      if (urlParts.length < 2) {
        console.error('Invalid URL format for deletion');
        return false;
      }

      const pathParts = urlParts[1].split('/');
      const bucket = pathParts[0];
      const filePath = pathParts.slice(1).join('/');

      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('Supabase delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  },

  /**
   * Get the public URL for a file in Supabase Storage
   */
  getImageUrl(folder: string, filename: string): string {
    const { data } = supabase.storage
      .from(UPLOAD_CONFIG.bucketName)
      .getPublicUrl(`${folder}/${filename}`);

    return data.publicUrl;
  },

  /**
   * List files in a folder
   */
  async listFiles(folder: string): Promise<string[]> {
    const { data, error } = await supabase.storage
      .from(UPLOAD_CONFIG.bucketName)
      .list(folder);

    if (error) {
      console.error('List files error:', error);
      return [];
    }

    return data.map(file => file.name);
  },
};

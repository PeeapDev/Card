/**
 * Supabase Storage Service for Product Images
 *
 * Handles image uploads for POS products
 * Uses supabaseAdmin to bypass RLS policies for storage operations
 */

import { supabase, supabaseAdmin } from '@/lib/supabase';

const PRODUCT_IMAGES_BUCKET = 'product-images';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Convert file to base64 data URL (fallback when storage fails)
 */
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Upload a product image to Supabase Storage
 * Falls back to base64 data URL if storage upload fails
 */
export const uploadProductImage = async (
  file: File,
  businessId: string,
  productId?: string
): Promise<UploadResult> => {
  // Generate unique filename
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${businessId}/${productId || 'temp'}_${Date.now()}.${fileExt}`;

  try {
    // Try to upload to Supabase Storage using admin client to bypass RLS
    const { data, error } = await supabaseAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Supabase storage error:', error.message);

      // Check if bucket doesn't exist
      if (error.message.includes('Bucket not found') || error.message.includes('not found')) {
        console.warn('Storage bucket not configured. Using base64 fallback.');
        const dataUrl = await fileToDataUrl(file);
        return {
          url: dataUrl,
          path: 'base64',
        };
      }

      // For RLS errors, try base64 fallback
      if (error.message.includes('row-level security') || error.message.includes('policy')) {
        console.warn('Storage RLS policy blocking upload. Using base64 fallback.');
        const dataUrl = await fileToDataUrl(file);
        return {
          url: dataUrl,
          path: 'base64',
        };
      }

      // For other errors, try base64 fallback
      console.warn('Storage upload failed. Using base64 fallback.');
      const dataUrl = await fileToDataUrl(file);
      return {
        url: dataUrl,
        path: 'base64',
      };
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (err) {
    console.error('Upload error, using base64 fallback:', err);
    // Fallback to base64 data URL
    const dataUrl = await fileToDataUrl(file);
    return {
      url: dataUrl,
      path: 'base64',
    };
  }
};

/**
 * Delete a product image from storage
 */
export const deleteProductImage = async (path: string): Promise<void> => {
  const { error } = await supabaseAdmin.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .remove([path]);

  if (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * Get a signed URL for private bucket access (if needed)
 */
export const getSignedUrl = async (path: string, expiresIn: number = 3600): Promise<string> => {
  const { data, error } = await supabaseAdmin.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }

  return data.signedUrl;
};

/**
 * Compress image before upload (client-side)
 */
export const compressImage = (
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

/**
 * Upload product image with compression
 */
export const uploadProductImageWithCompression = async (
  file: File,
  businessId: string,
  productId?: string
): Promise<UploadResult> => {
  try {
    // Compress if it's an image and larger than 500KB
    let uploadFile: File | Blob = file;
    if (file.type.startsWith('image/') && file.size > 500000) {
      try {
        uploadFile = await compressImage(file);
      } catch (compressError) {
        console.warn('Compression failed, using original file:', compressError);
        uploadFile = file; // Use original if compression fails
      }
    }

    // Convert blob back to file if compressed
    const finalFile = uploadFile instanceof Blob && !(uploadFile instanceof File)
      ? new File([uploadFile], file.name, { type: 'image/jpeg' })
      : uploadFile;

    return await uploadProductImage(finalFile as File, businessId, productId);
  } catch (error) {
    console.error('Upload with compression failed:', error);
    // Final fallback - convert original file to base64
    const dataUrl = await fileToDataUrl(file);
    return {
      url: dataUrl,
      path: 'base64',
    };
  }
};

export const storageService = {
  uploadProductImage,
  uploadProductImageWithCompression,
  deleteProductImage,
  getSignedUrl,
  compressImage,
};

export default storageService;

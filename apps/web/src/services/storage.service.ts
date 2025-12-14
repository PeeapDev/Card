/**
 * Supabase Storage Service for Product Images
 *
 * Handles image uploads for POS products
 */

import { supabase } from '@/lib/supabase';

const PRODUCT_IMAGES_BUCKET = 'product-images';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a product image to Supabase Storage
 */
export const uploadProductImage = async (
  file: File,
  businessId: string,
  productId?: string
): Promise<UploadResult> => {
  // Generate unique filename
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${businessId}/${productId || 'temp'}_${Date.now()}.${fileExt}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading image:', error);
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
};

/**
 * Delete a product image from storage
 */
export const deleteProductImage = async (path: string): Promise<void> => {
  const { error } = await supabase.storage
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
  const { data, error } = await supabase.storage
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
  // Compress if it's an image
  let uploadFile: File | Blob = file;
  if (file.type.startsWith('image/') && file.size > 500000) {
    // Compress if > 500KB
    uploadFile = await compressImage(file);
  }

  // Convert blob back to file if compressed
  const finalFile = uploadFile instanceof Blob && !(uploadFile instanceof File)
    ? new File([uploadFile], file.name, { type: 'image/jpeg' })
    : uploadFile;

  return uploadProductImage(finalFile as File, businessId, productId);
};

export const storageService = {
  uploadProductImage,
  uploadProductImageWithCompression,
  deleteProductImage,
  getSignedUrl,
  compressImage,
};

export default storageService;

-- Migration: Storage Bucket Policies for Product Images
-- This allows authenticated users to upload/view product images

-- First, ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to update" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to delete" ON storage.objects;
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_owner_delete" ON storage.objects;

-- Policy: Anyone can view product images (public bucket)
CREATE POLICY "product_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Policy: Authenticated users can upload to their folder
CREATE POLICY "product_images_authenticated_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
  )
);

-- Policy: Users can update their own images
CREATE POLICY "product_images_owner_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND (
    auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
  )
);

-- Policy: Users can delete their own images
CREATE POLICY "product_images_owner_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND (
    auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
  )
);

-- Grant usage on storage schema
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;

-- Grant access to storage.objects
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO service_role;

-- Grant access to storage.buckets
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.buckets TO service_role;

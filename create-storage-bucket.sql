-- SQL to create Supabase Storage bucket for product images
-- Run this in your Supabase SQL Editor

-- Create the product-images bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit)
VALUES (
  'product-images',
  'product-images',
  true,  -- public bucket for easy access
  false,
  5242880  -- 5MB file size limit
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product-images bucket

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- Allow public read access
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

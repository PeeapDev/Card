/**
 * Setup Supabase Storage Bucket for Product Images
 * Run this script to create the storage bucket and set policies
 *
 * Usage: SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node scripts/setup-storage-bucket.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const BUCKET_NAME = 'product-images';

async function setupStorageBucket() {
  console.log('Setting up storage bucket:', BUCKET_NAME);

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError.message);
      return;
    }

    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

    if (!bucketExists) {
      // Create the bucket
      console.log('Creating bucket...');
      const { data, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true, // Make bucket public for image URLs
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
        fileSizeLimit: 5 * 1024 * 1024, // 5MB
      });

      if (createError) {
        console.error('Error creating bucket:', createError.message);
        return;
      }

      console.log('Bucket created successfully!');
    } else {
      console.log('Bucket already exists');

      // Update bucket settings
      const { error: updateError } = await supabase.storage.updateBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
        fileSizeLimit: 5 * 1024 * 1024,
      });

      if (updateError) {
        console.error('Error updating bucket:', updateError.message);
      } else {
        console.log('Bucket settings updated');
      }
    }

    // Test upload
    console.log('\nTesting upload...');
    const testFile = Buffer.from('test');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload('test.txt', testFile, { upsert: true });

    if (uploadError) {
      console.error('Test upload failed:', uploadError.message);
    } else {
      console.log('Test upload successful!');

      // Clean up test file
      await supabase.storage.from(BUCKET_NAME).remove(['test.txt']);
      console.log('Test file cleaned up');
    }

    console.log('\n✅ Storage bucket setup complete!');
    console.log('\nNote: You may need to add RLS policies in the Supabase dashboard:');
    console.log('1. Go to Storage > Policies');
    console.log('2. Add a policy for INSERT/UPDATE/DELETE to allow authenticated users');
    console.log('   Or make the bucket fully public for simplicity');

  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setupStorageBucket();

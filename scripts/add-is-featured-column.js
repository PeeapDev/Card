/**
 * Add is_featured column to pos_products table
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

async function addColumn() {
  console.log('Adding is_featured column to pos_products...');

  // Check if column exists by trying to select it
  const { data, error } = await supabase
    .from('pos_products')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Error checking table:', error.message);
  }

  // Try to add the column using raw SQL via RPC or direct query
  // Since we can't run DDL directly, we'll use an alternative approach

  // Let's try updating a product with the field to see the exact error
  const { error: updateError } = await supabase
    .from('pos_products')
    .update({ is_featured: false })
    .eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID

  if (updateError) {
    if (updateError.message.includes('is_featured')) {
      console.log('\nColumn does not exist. Please run this SQL in Supabase Dashboard:\n');
      console.log('ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;');
      console.log('\nOr go to Table Editor > pos_products > Add column > "is_featured" (boolean, default false)');
    } else {
      console.log('Column may already exist or different error:', updateError.message);
    }
  } else {
    console.log('Column already exists!');
  }
}

addColumn().catch(console.error);

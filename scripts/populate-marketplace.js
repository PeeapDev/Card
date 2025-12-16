/**
 * Populate Marketplace with Sample Products
 * Run: node scripts/populate-marketplace.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Sample products with real images and Sierra Leone prices (in Leones)
const sampleProducts = [
  // Food & Beverages
  {
    category: 'Food & Beverages',
    color: '#EF4444',
    products: [
      {
        name: 'Jollof Rice with Chicken',
        description: 'Authentic Sierra Leonean Jollof rice served with grilled chicken',
        price: 45000,
        cost_price: 25000,
        image_url: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400',
        stock_quantity: 50,
        is_featured: true
      },
      {
        name: 'Cassava Leaves with Rice',
        description: 'Traditional cassava leaves stew served with white rice',
        price: 35000,
        cost_price: 18000,
        image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400',
        stock_quantity: 40
      },
      {
        name: 'Groundnut Soup',
        description: 'Rich peanut soup with meat, served with fufu',
        price: 40000,
        cost_price: 20000,
        image_url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
        stock_quantity: 35
      },
      {
        name: 'Fried Plantain (Dodo)',
        description: 'Sweet ripe plantain slices, deep fried to perfection',
        price: 15000,
        cost_price: 8000,
        image_url: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=400',
        stock_quantity: 100
      },
      {
        name: 'Fresh Orange Juice',
        description: 'Freshly squeezed orange juice, 500ml',
        price: 12000,
        cost_price: 6000,
        image_url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400',
        stock_quantity: 80
      },
      {
        name: 'Ginger Beer',
        description: 'Traditional spicy ginger drink, 330ml bottle',
        price: 8000,
        cost_price: 4000,
        image_url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400',
        stock_quantity: 120
      }
    ]
  },
  // Groceries
  {
    category: 'Groceries',
    color: '#22C55E',
    products: [
      {
        name: 'Local Rice (5kg)',
        description: 'Premium Sierra Leone grown rice, 5kg bag',
        price: 85000,
        cost_price: 65000,
        image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
        stock_quantity: 200,
        is_featured: true
      },
      {
        name: 'Palm Oil (1L)',
        description: 'Pure red palm oil, 1 litre bottle',
        price: 25000,
        cost_price: 18000,
        image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400',
        stock_quantity: 150
      },
      {
        name: 'Cassava Flour (2kg)',
        description: 'Finely ground cassava flour for fufu',
        price: 30000,
        cost_price: 20000,
        image_url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400',
        stock_quantity: 100
      },
      {
        name: 'Fresh Tomatoes (1kg)',
        description: 'Locally grown ripe tomatoes',
        price: 18000,
        cost_price: 12000,
        image_url: 'https://images.unsplash.com/photo-1546470427-e26264be0b0d?w=400',
        stock_quantity: 80
      },
      {
        name: 'Onions (1kg)',
        description: 'Fresh red onions',
        price: 15000,
        cost_price: 10000,
        image_url: 'https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400',
        stock_quantity: 90
      },
      {
        name: 'Maggi Cubes (Box of 100)',
        description: 'Seasoning cubes, box of 100 pieces',
        price: 45000,
        cost_price: 35000,
        image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400',
        stock_quantity: 60
      }
    ]
  },
  // Electronics
  {
    category: 'Electronics',
    color: '#F59E0B',
    products: [
      {
        name: 'iPhone 13 (128GB)',
        description: 'Apple iPhone 13, 128GB storage, unlocked',
        price: 8500000,
        cost_price: 7500000,
        image_url: 'https://images.unsplash.com/photo-1632633173522-47456de71b76?w=400',
        stock_quantity: 10,
        is_featured: true
      },
      {
        name: 'Samsung Galaxy A54',
        description: 'Samsung Galaxy A54 5G, 128GB, dual SIM',
        price: 4200000,
        cost_price: 3600000,
        image_url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
        stock_quantity: 15
      },
      {
        name: 'Wireless Earbuds',
        description: 'Bluetooth 5.0 wireless earbuds with charging case',
        price: 180000,
        cost_price: 120000,
        image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
        stock_quantity: 50
      },
      {
        name: 'Power Bank 20000mAh',
        description: 'Fast charging portable power bank',
        price: 250000,
        cost_price: 180000,
        image_url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400',
        stock_quantity: 40
      },
      {
        name: 'USB-C Charging Cable',
        description: 'Fast charging USB-C cable, 1.5m length',
        price: 35000,
        cost_price: 20000,
        image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400',
        stock_quantity: 100
      },
      {
        name: 'Bluetooth Speaker',
        description: 'Portable waterproof Bluetooth speaker',
        price: 320000,
        cost_price: 220000,
        image_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
        stock_quantity: 25
      }
    ]
  },
  // Fashion
  {
    category: 'Fashion',
    color: '#EC4899',
    products: [
      {
        name: 'African Print Shirt (Men)',
        description: 'Traditional African print cotton shirt',
        price: 120000,
        cost_price: 75000,
        image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400',
        stock_quantity: 30,
        is_featured: true
      },
      {
        name: 'Ankara Dress (Women)',
        description: 'Beautiful Ankara print dress, various sizes',
        price: 180000,
        cost_price: 100000,
        image_url: 'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=400',
        stock_quantity: 25
      },
      {
        name: 'Leather Sandals',
        description: 'Handmade leather sandals, unisex',
        price: 85000,
        cost_price: 50000,
        image_url: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400',
        stock_quantity: 40
      },
      {
        name: 'Traditional Cap (Fila)',
        description: 'Traditional African cap, embroidered',
        price: 45000,
        cost_price: 25000,
        image_url: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=400',
        stock_quantity: 50
      },
      {
        name: 'Beaded Necklace',
        description: 'Handcrafted African beaded necklace',
        price: 55000,
        cost_price: 30000,
        image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400',
        stock_quantity: 35
      },
      {
        name: 'Woven Basket Bag',
        description: 'Traditional woven basket handbag',
        price: 75000,
        cost_price: 45000,
        image_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400',
        stock_quantity: 20
      }
    ]
  },
  // Health & Beauty
  {
    category: 'Health & Beauty',
    color: '#8B5CF6',
    products: [
      {
        name: 'Shea Butter (500g)',
        description: 'Pure unrefined African shea butter',
        price: 35000,
        cost_price: 20000,
        image_url: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400',
        stock_quantity: 60,
        is_featured: true
      },
      {
        name: 'African Black Soap',
        description: 'Traditional African black soap bar',
        price: 15000,
        cost_price: 8000,
        image_url: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400',
        stock_quantity: 100
      },
      {
        name: 'Coconut Oil (250ml)',
        description: 'Pure virgin coconut oil for skin and hair',
        price: 25000,
        cost_price: 15000,
        image_url: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=400',
        stock_quantity: 70
      },
      {
        name: 'Paracetamol Tablets',
        description: 'Pain relief tablets, pack of 20',
        price: 8000,
        cost_price: 4500,
        image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
        stock_quantity: 200
      },
      {
        name: 'Hand Sanitizer (100ml)',
        description: '70% alcohol hand sanitizer',
        price: 12000,
        cost_price: 7000,
        image_url: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=400',
        stock_quantity: 150
      },
      {
        name: 'Face Masks (Box of 50)',
        description: 'Disposable face masks, 3-ply',
        price: 45000,
        cost_price: 30000,
        image_url: 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?w=400',
        stock_quantity: 80
      }
    ]
  }
];

async function populateMarketplace() {
  console.log('🚀 Starting marketplace population...\n');

  try {
    // 1. Find a user (preferably merchant)
    console.log('1️⃣ Finding user...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, roles')
      .limit(10);

    if (userError) throw userError;

    let merchantId;
    if (!users || users.length === 0) {
      console.log('❌ No users found in database. Please create a user first.');
      return;
    }

    // Try to find a merchant user first
    const merchantUser = users.find(u => u.roles && u.roles.includes('merchant'));
    if (merchantUser) {
      merchantId = merchantUser.id;
      console.log(`   Found merchant: ${merchantUser.email}`);
    } else {
      merchantId = users[0].id;
      console.log(`   Using user: ${users[0].email}`);
    }

    // 2. Create or get marketplace store
    console.log('\n2️⃣ Setting up marketplace store...');
    let storeId;

    const { data: existingStore } = await supabase
      .from('marketplace_stores')
      .select('id, store_name')
      .eq('merchant_id', merchantId)
      .single();

    if (existingStore) {
      storeId = existingStore.id;
      console.log(`   Existing store found: ${existingStore.store_name}`);
    } else {
      const { data: newStore, error: storeError } = await supabase
        .from('marketplace_stores')
        .insert({
          merchant_id: merchantId,
          store_name: 'Peeap Supermarket',
          store_slug: 'peeap-supermarket',
          description: 'Your one-stop shop for all your needs in Freetown. Fresh groceries, electronics, fashion, and more!',
          logo_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200',
          banner_url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800',
          phone: '+232 76 123456',
          email: 'shop@peeap.com',
          address: '15 Siaka Stevens Street',
          city: 'Freetown',
          country: 'Sierra Leone',
          is_listed: true,
          is_verified: true,
          is_featured: true,
          offers_pickup: true,
          offers_delivery: true,
          delivery_radius_km: 15,
          delivery_fee: 15000,
          free_delivery_minimum: 200000,
          minimum_order: 25000,
          preparation_time_minutes: 30,
          operating_hours: {
            monday: { open: '08:00', close: '20:00' },
            tuesday: { open: '08:00', close: '20:00' },
            wednesday: { open: '08:00', close: '20:00' },
            thursday: { open: '08:00', close: '20:00' },
            friday: { open: '08:00', close: '20:00' },
            saturday: { open: '09:00', close: '18:00' },
            sunday: { open: '10:00', close: '16:00' }
          },
          is_open_now: true,
          store_categories: ['grocery', 'retail', 'food', 'electronics', 'fashion']
        })
        .select()
        .single();

      if (storeError) throw storeError;
      storeId = newStore.id;
      console.log(`   Created new store: ${newStore.store_name}`);
    }

    // 3. Create categories and products
    console.log('\n3️⃣ Creating products...');
    let totalProducts = 0;
    let totalListings = 0;

    for (const categoryData of sampleProducts) {
      console.log(`\n   📦 Category: ${categoryData.category}`);

      // Check if category exists
      let categoryId;
      const { data: existingCategory } = await supabase
        .from('pos_categories')
        .select('id')
        .eq('merchant_id', merchantId)
        .eq('name', categoryData.category)
        .single();

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        const { data: newCategory, error: catError } = await supabase
          .from('pos_categories')
          .insert({
            merchant_id: merchantId,
            name: categoryData.category,
            color: categoryData.color,
            is_active: true,
            sort_order: sampleProducts.indexOf(categoryData)
          })
          .select()
          .single();

        if (catError) {
          console.log(`   ⚠️ Category error: ${catError.message}`);
          continue;
        }
        categoryId = newCategory.id;
      }

      // Create products
      for (const product of categoryData.products) {
        // Check if product already exists
        const { data: existingProduct } = await supabase
          .from('pos_products')
          .select('id')
          .eq('merchant_id', merchantId)
          .eq('name', product.name)
          .single();

        let productId;
        if (existingProduct) {
          productId = existingProduct.id;
          console.log(`      ✓ ${product.name} (existing)`);
        } else {
          const { data: newProduct, error: prodError } = await supabase
            .from('pos_products')
            .insert({
              merchant_id: merchantId,
              category_id: categoryId,
              name: product.name,
              description: product.description,
              price: product.price,
              cost_price: product.cost_price,
              image_url: product.image_url,
              track_inventory: true,
              stock_quantity: product.stock_quantity,
              low_stock_threshold: 10,
              has_variants: false,
              is_active: true,
              is_featured: product.is_featured || false,
              tax_rate: 0
            })
            .select()
            .single();

          if (prodError) {
            console.log(`      ❌ ${product.name}: ${prodError.message}`);
            continue;
          }
          productId = newProduct.id;
          totalProducts++;
          console.log(`      ✓ ${product.name} - Le ${product.price.toLocaleString()}`);
        }

        // Create marketplace listing
        const { data: existingListing } = await supabase
          .from('marketplace_listings')
          .select('id')
          .eq('product_id', productId)
          .single();

        if (!existingListing) {
          const { error: listingError } = await supabase
            .from('marketplace_listings')
            .insert({
              merchant_id: merchantId,
              store_id: storeId,
              product_id: productId,
              is_listed: true,
              is_featured: product.is_featured || false,
              sort_order: categoryData.products.indexOf(product)
            });

          if (listingError) {
            console.log(`      ⚠️ Listing error for ${product.name}: ${listingError.message}`);
          } else {
            totalListings++;
          }
        }
      }
    }

    console.log('\n✅ Marketplace population complete!');
    console.log(`   📦 Products created: ${totalProducts}`);
    console.log(`   🏪 Listings created: ${totalListings}`);
    console.log(`   🏬 Store: Peeap Supermarket`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

populateMarketplace();

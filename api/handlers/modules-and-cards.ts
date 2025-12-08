import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// MODULE MANAGEMENT HANDLERS
// ============================================================================

/**
 * GET /api/modules - List all modules
 */
export async function handleGetModules(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: modules, error } = await supabase
      .from('modules')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      modules: modules || [],
      total: modules?.length || 0,
    });
  } catch (error: any) {
    console.error('[Modules] Get error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/modules - Create new module
 */
export async function handleCreateModule(req: VercelRequest, res: VercelResponse) {
  try {
    const { code, name, description, category, version, icon, config, dependencies } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const { data: module, error } = await supabase
      .from('modules')
      .insert({
        code,
        name,
        description,
        category,
        version: version || '1.0.0',
        icon,
        config: config || {},
        dependencies: dependencies || [],
        is_enabled: false,
        is_system: false,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ module });
  } catch (error: any) {
    console.error('[Modules] Create error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/modules/:id - Update module (enable/disable, config)
 */
export async function handleUpdateModule(req: VercelRequest, res: VercelResponse, moduleId: string) {
  try {
    const { is_enabled, config, name, description, icon } = req.body;
    const updateData: any = {};

    if (is_enabled !== undefined) {
      updateData.is_enabled = is_enabled;
      if (is_enabled) {
        updateData.enabled_at = new Date().toISOString();
      }
    }
    if (config !== undefined) updateData.config = config;
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon) updateData.icon = icon;

    updateData.updated_at = new Date().toISOString();

    const { data: module, error } = await supabase
      .from('modules')
      .update(updateData)
      .eq('id', moduleId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ module });
  } catch (error: any) {
    console.error('[Modules] Update error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/modules/:id - Delete module (only non-system modules)
 */
export async function handleDeleteModule(req: VercelRequest, res: VercelResponse, moduleId: string) {
  try {
    // Check if module is system module
    const { data: module } = await supabase
      .from('modules')
      .select('is_system')
      .eq('id', moduleId)
      .single();

    if (module?.is_system) {
      return res.status(403).json({ error: 'Cannot delete system modules' });
    }

    const { error } = await supabase.from('modules').delete().eq('id', moduleId);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[Modules] Delete error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ============================================================================
// MODULE PACKAGE MANAGEMENT HANDLERS
// ============================================================================

/**
 * GET /api/modules/packages - List all module packages
 */
export async function handleGetModulePackages(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: packages, error } = await supabase
      .from('module_packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      packages: packages || [],
      total: packages?.length || 0,
    });
  } catch (error: any) {
    console.error('[ModulePackages] Get error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/modules/upload - Upload a module package
 */
export async function handleModuleUpload(req: VercelRequest, res: VercelResponse) {
  try {
    // For multipart form data, we need to parse the file
    // In Vercel, the body might be a buffer or we need to handle differently
    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data') && !contentType.includes('application/json')) {
      return res.status(400).json({ error: 'Content-Type must be multipart/form-data or application/json' });
    }

    let manifest: any;
    let filename = 'manifest.json';

    // Handle JSON manifest upload directly
    if (contentType.includes('application/json')) {
      manifest = req.body;
    } else {
      // For multipart, try to extract the file
      // Note: Vercel serverless functions have limited multipart support
      // In production, you'd use a library like formidable or busboy
      return res.status(400).json({
        error: 'For now, please upload a manifest.json file directly with Content-Type: application/json',
        hint: 'Send a JSON body with the module manifest',
      });
    }

    // Validate manifest
    if (!manifest.code || !manifest.name || !manifest.version || !manifest.category) {
      return res.status(400).json({
        error: 'Invalid manifest. Required fields: code, name, version, category',
      });
    }

    // Validate code format
    if (!/^[a-z][a-z0-9_]*$/.test(manifest.code)) {
      return res.status(400).json({
        error: 'Module code must start with a letter and contain only lowercase letters, numbers, and underscores',
      });
    }

    // Check for existing module
    const { data: existingModule } = await supabase
      .from('modules')
      .select('is_system')
      .eq('code', manifest.code)
      .single();

    if (existingModule?.is_system) {
      return res.status(403).json({ error: `Cannot override system module "${manifest.code}"` });
    }

    // Check version conflict
    const { data: existingPackage } = await supabase
      .from('module_packages')
      .select('*')
      .eq('module_code', manifest.code)
      .eq('version', manifest.version)
      .single();

    if (existingPackage) {
      return res.status(409).json({
        error: `Module "${manifest.code}" version ${manifest.version} already exists`,
      });
    }

    // Create package record
    const { data: packageData, error: packageError } = await supabase
      .from('module_packages')
      .insert({
        module_code: manifest.code,
        version: manifest.version,
        file_path: `manifests/${manifest.code}/${manifest.version}/manifest.json`,
        file_size: JSON.stringify(manifest).length,
        checksum: '',
        manifest,
        status: 'pending',
      })
      .select()
      .single();

    if (packageError) throw packageError;

    // Check if auto-enable is requested (hot-swap mode)
    const autoEnable = manifest.autoEnable !== false; // Default to true for hot-swap

    // Create/update module in database
    const moduleData = {
      code: manifest.code,
      name: manifest.name,
      description: manifest.description || '',
      category: manifest.category,
      version: manifest.version,
      icon: manifest.icon || '📦',
      is_enabled: autoEnable, // Hot-swap: enable immediately
      is_system: false,
      is_custom: true,
      package_id: packageData.id,
      config: manifest.defaultConfig || {},
      config_schema: manifest.configSchema,
      dependencies: manifest.dependencies || [],
      provides: manifest.provides || [],
      events: [...(manifest.events?.emits || []), ...(manifest.events?.listens || [])],
      settings_path: manifest.settingsPath,
      enabled_at: autoEnable ? new Date().toISOString() : null,
    };

    const { error: moduleError } = await supabase
      .from('modules')
      .upsert(moduleData, { onConflict: 'code' });

    if (moduleError) {
      // Cleanup package record
      await supabase.from('module_packages').delete().eq('id', packageData.id);
      throw moduleError;
    }

    // Update package status
    await supabase
      .from('module_packages')
      .update({
        status: 'installed',
        installed_at: new Date().toISOString(),
      })
      .eq('id', packageData.id);

    // Fetch updated package
    const { data: updatedPackage } = await supabase
      .from('module_packages')
      .select('*')
      .eq('id', packageData.id)
      .single();

    return res.status(200).json({
      success: true,
      package: updatedPackage,
      message: `Module "${manifest.name}" installed successfully`,
    });
  } catch (error: any) {
    console.error('[ModuleUpload] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/modules/packages/:id - Delete a module package
 */
export async function handleDeleteModulePackage(req: VercelRequest, res: VercelResponse, packageId: string) {
  try {
    // Get package info
    const { data: pkg, error: fetchError } = await supabase
      .from('module_packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (fetchError || !pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Check if module is enabled
    const { data: module } = await supabase
      .from('modules')
      .select('is_enabled, is_custom')
      .eq('code', pkg.module_code)
      .single();

    if (module?.is_enabled) {
      return res.status(400).json({
        error: 'Cannot delete package for enabled module. Disable the module first.',
      });
    }

    // Delete module if it's a custom module
    if (module?.is_custom) {
      await supabase.from('modules').delete().eq('code', pkg.module_code);
    }

    // Delete package record
    const { error: deleteError } = await supabase
      .from('module_packages')
      .delete()
      .eq('id', packageId);

    if (deleteError) throw deleteError;

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[ModulePackages] Delete error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ============================================================================
// CARD PRODUCT MANAGEMENT HANDLERS (Superadmin)
// ============================================================================

/**
 * GET /api/card-products - List all card products (with admin flag for all or user-visible only)
 */
export async function handleGetCardProducts(req: VercelRequest, res: VercelResponse) {
  try {
    const { admin } = req.query; // If admin=true, show all. Otherwise only visible ones

    let query = supabase
      .from('card_products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('tier', { ascending: true });

    // Non-admin users only see visible and active products
    if (admin !== 'true') {
      query = query.eq('is_active', true).eq('is_visible', true);
    }

    const { data: products, error } = await query;

    if (error) throw error;

    return res.status(200).json({
      products: products || [],
      total: products?.length || 0,
    });
  } catch (error: any) {
    console.error('[Card Products] Get error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/card-products - Create new card product (Superadmin only)
 */
export async function handleCreateCardProduct(req: VercelRequest, res: VercelResponse) {
  try {
    const {
      code,
      name,
      description,
      tier,
      purchase_price,
      annual_fee,
      currency,
      daily_transaction_limit,
      monthly_transaction_limit,
      max_balance,
      transaction_fee_percent,
      transaction_fee_flat,
      bin_prefix,
      card_length,
      is_online_enabled,
      is_atm_enabled,
      is_contactless_enabled,
      is_international_enabled,
      cashback_percent,
      features,
      card_design_url,
      card_color,
      card_text_color,
      stock_limit,
    } = req.body;

    if (!code || !name || !tier || purchase_price === undefined || !bin_prefix) {
      return res.status(400).json({
        error: 'Required fields: code, name, tier, purchase_price, bin_prefix',
      });
    }

    const { data: product, error } = await supabase
      .from('card_products')
      .insert({
        code,
        name,
        description,
        tier,
        purchase_price,
        annual_fee: annual_fee || 0,
        currency: currency || 'SLE',
        daily_transaction_limit,
        monthly_transaction_limit,
        max_balance,
        transaction_fee_percent: transaction_fee_percent || 0,
        transaction_fee_flat: transaction_fee_flat || 0,
        bin_prefix,
        card_length: card_length || 16,
        is_online_enabled: is_online_enabled !== false,
        is_atm_enabled: is_atm_enabled || false,
        is_contactless_enabled: is_contactless_enabled || false,
        is_international_enabled: is_international_enabled || false,
        cashback_percent: cashback_percent || 0,
        features: features || [],
        card_design_url,
        card_color: card_color || '#1A1A1A',
        card_text_color: card_text_color || '#FFFFFF',
        stock_limit,
        is_active: true,
        is_visible: true,
        cards_issued: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ product });
  } catch (error: any) {
    console.error('[Card Products] Create error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/card-products/:id - Update card product
 */
export async function handleUpdateCardProduct(
  req: VercelRequest,
  res: VercelResponse,
  productId: string
) {
  try {
    const updateData: any = { ...req.body };
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.cards_issued; // Don't allow manual override

    updateData.updated_at = new Date().toISOString();

    const { data: product, error } = await supabase
      .from('card_products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ product });
  } catch (error: any) {
    console.error('[Card Products] Update error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/card-products/:id - Delete card product (only if no cards issued)
 */
export async function handleDeleteCardProduct(
  req: VercelRequest,
  res: VercelResponse,
  productId: string
) {
  try {
    // Check if any cards have been issued
    const { data: product } = await supabase
      .from('card_products')
      .select('cards_issued')
      .eq('id', productId)
      .single();

    if (product && product.cards_issued > 0) {
      return res.status(403).json({
        error: `Cannot delete product with ${product.cards_issued} issued cards. Deactivate instead.`,
      });
    }

    const { error } = await supabase.from('card_products').delete().eq('id', productId);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[Card Products] Delete error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ============================================================================
// CARD PURCHASE & ISSUANCE HANDLERS
// ============================================================================

/**
 * POST /api/cards/purchase - User purchases a card product
 */
export async function handlePurchaseCard(req: VercelRequest, res: VercelResponse) {
  try {
    const { userId, cardProductId, paymentMethod } = req.body;

    if (!userId || !cardProductId) {
      return res.status(400).json({ error: 'userId and cardProductId are required' });
    }

    // Get card product details
    const { data: product, error: productError } = await supabase
      .from('card_products')
      .select('*')
      .eq('id', cardProductId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Card product not found' });
    }

    if (!product.is_active || !product.is_visible) {
      return res.status(400).json({ error: 'Card product not available' });
    }

    // Check stock limit
    if (product.stock_limit && product.cards_issued >= product.stock_limit) {
      return res.status(400).json({ error: 'Card product out of stock' });
    }

    // Check if user already has this card type
    const { data: existingCard } = await supabase
      .from('cards')
      .select('id')
      .eq('user_id', userId)
      .eq('card_product_id', cardProductId)
      .single();

    if (existingCard) {
      return res.status(400).json({ error: 'You already own this card type' });
    }

    // Get user wallet for payment
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('wallet_type', 'primary')
      .single();

    if (walletError || !wallet) {
      return res.status(404).json({ error: 'User wallet not found' });
    }

    // Check sufficient balance
    if (wallet.available_balance < product.purchase_price) {
      return res.status(400).json({
        error: 'Insufficient balance',
        required: product.purchase_price,
        available: wallet.available_balance,
      });
    }

    // Create purchase record
    const purchaseId = randomUUID();
    const { data: purchase, error: purchaseError } = await supabase
      .from('card_purchases')
      .insert({
        id: purchaseId,
        user_id: userId,
        card_product_id: cardProductId,
        amount: product.purchase_price,
        currency: product.currency,
        payment_method: paymentMethod || 'wallet',
        status: 'pending',
      })
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // Deduct from wallet
    const { error: debitError } = await supabase.rpc('update_wallet_balance', {
      p_wallet_id: wallet.id,
      p_amount: product.purchase_price,
      p_operation: 'debit',
    });

    if (debitError) {
      // Rollback purchase
      await supabase.from('card_purchases').delete().eq('id', purchaseId);
      throw new Error('Payment failed: ' + debitError.message);
    }

    // Generate unique card number using the database function
    const { data: cardNumberData } = await supabase.rpc('generate_card_number', {
      bin_prefix: product.bin_prefix,
      card_length: product.card_length,
    });

    const cardNumber = cardNumberData;

    // Calculate expiry date (5 years from now)
    const now = new Date();
    const expiryMonth = now.getMonth() + 1;
    const expiryYear = now.getFullYear() + 5;

    // Create card
    const cardId = randomUUID();
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .insert({
        id: cardId,
        user_id: userId,
        card_product_id: cardProductId,
        card_number: cardNumber,
        last_four: cardNumber.slice(-4),
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        cvv: String(Math.floor(Math.random() * 900) + 100), // Random 3-digit CVV
        status: 'ACTIVE',
        card_type_id: null, // Will use card_product instead
        daily_limit: product.daily_transaction_limit,
        monthly_limit: product.monthly_transaction_limit,
        is_online_enabled: product.is_online_enabled,
        purchased_at: new Date().toISOString(),
        purchase_amount: product.purchase_price,
        annual_fee_due_date: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
          .toISOString()
          .split('T')[0],
      })
      .select()
      .single();

    if (cardError) {
      // Rollback: refund wallet and delete purchase
      await supabase.rpc('update_wallet_balance', {
        p_wallet_id: wallet.id,
        p_amount: product.purchase_price,
        p_operation: 'credit',
      });
      await supabase.from('card_purchases').delete().eq('id', purchaseId);
      throw cardError;
    }

    // Update purchase with card_id and mark as completed
    await supabase
      .from('card_purchases')
      .update({
        card_id: cardId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', purchaseId);

    // Increment cards_issued counter
    await supabase
      .from('card_products')
      .update({
        cards_issued: product.cards_issued + 1,
      })
      .eq('id', cardProductId);

    // Create transaction record
    await supabase.from('transactions').insert({
      wallet_id: wallet.id,
      type: 'CARD_PURCHASE',
      amount: -product.purchase_price,
      currency: product.currency,
      status: 'COMPLETED',
      description: `Purchase ${product.name}`,
      reference: purchaseId,
      metadata: {
        card_id: cardId,
        card_product_id: cardProductId,
        card_product_name: product.name,
      },
    });

    return res.status(200).json({
      success: true,
      purchase,
      card: {
        id: card.id,
        card_number: cardNumber,
        last_four: card.last_four,
        expiry_month: card.expiry_month,
        expiry_year: card.expiry_year,
        product_name: product.name,
        status: card.status,
      },
    });
  } catch (error: any) {
    console.error('[Cards] Purchase error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/cards/user/:userId - Get user's cards
 */
export async function handleGetUserCards(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const { data: cards, error } = await supabase
      .from('cards')
      .select(
        `
        *,
        card_product:card_products(*)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      cards: cards || [],
      total: cards?.length || 0,
    });
  } catch (error: any) {
    console.error('[Cards] Get user cards error:', error);
    return res.status(500).json({ error: error.message });
  }
}

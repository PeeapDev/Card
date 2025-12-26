/**
 * Module Registry Service
 *
 * Central registry for managing all platform modules.
 * Provides methods to:
 * - Register and discover modules
 * - Enable/disable modules
 * - Get module configuration
 * - Check module dependencies
 * - Emit and handle module events
 */

import { SupabaseClient } from '@supabase/supabase-js';

// Types
export type ModuleCategory = 'payment' | 'feature' | 'integration' | 'security' | 'api';

export interface ModuleDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: ModuleCategory;
  version: string;
  icon: string;
  is_enabled: boolean;
  is_system: boolean;
  is_beta?: boolean;
  config: Record<string, any>;
  config_schema?: Record<string, any>;
  dependencies?: string[];
  provides?: string[];
  events?: string[];
  api_endpoints?: ModuleEndpoint[];
  webhooks?: WebhookConfig[];
  settings_path?: string;
  created_at: string;
  updated_at: string;
  enabled_at?: string;
  enabled_by?: string;
}

export interface ModuleEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  auth: 'required' | 'optional' | 'none';
}

export interface WebhookConfig {
  name: string;
  path: string;
  description: string;
  events?: string[];
}

export interface ModuleEvent {
  type: string;
  moduleCode: string;
  payload: Record<string, any>;
  timestamp: Date;
}

export class ModuleRegistryError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = 'ModuleRegistryError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Module Registry - Central module management
 */
export class ModuleRegistry {
  private supabase: SupabaseClient;
  private eventHandlers: Map<string, Array<(event: ModuleEvent) => Promise<void>>> = new Map();
  private moduleCache: Map<string, ModuleDefinition> = new Map();
  private cacheExpiry: number = 60000; // 1 minute cache
  private lastCacheUpdate: number = 0;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Get all modules
   */
  async getAll(): Promise<ModuleDefinition[]> {
    await this.refreshCacheIfNeeded();
    return Array.from(this.moduleCache.values());
  }

  /**
   * Get all enabled modules
   */
  async getEnabled(): Promise<ModuleDefinition[]> {
    const modules = await this.getAll();
    return modules.filter(m => m.is_enabled);
  }

  /**
   * Get modules by category
   */
  async getByCategory(category: ModuleCategory): Promise<ModuleDefinition[]> {
    const modules = await this.getAll();
    return modules.filter(m => m.category === category);
  }

  /**
   * Get a single module by code
   */
  async get(code: string): Promise<ModuleDefinition | null> {
    await this.refreshCacheIfNeeded();
    return this.moduleCache.get(code) || null;
  }

  /**
   * Check if a module is enabled
   */
  async isEnabled(code: string): Promise<boolean> {
    const module = await this.get(code);
    return module?.is_enabled === true;
  }

  /**
   * Enable a module
   */
  async enable(code: string, userId?: string): Promise<ModuleDefinition> {
    const module = await this.get(code);
    if (!module) {
      throw new ModuleRegistryError(`Module "${code}" not found`, 'MODULE_NOT_FOUND', 404);
    }

    if (module.is_enabled) {
      return module; // Already enabled
    }

    // Check dependencies
    const unmetDeps = await this.checkDependencies(code);
    if (unmetDeps.length > 0) {
      throw new ModuleRegistryError(
        `Cannot enable "${code}": missing dependencies: ${unmetDeps.join(', ')}`,
        'DEPENDENCIES_NOT_MET',
        400
      );
    }

    // Enable module
    const { data, error } = await this.supabase
      .from('modules')
      .update({
        is_enabled: true,
        enabled_at: new Date().toISOString(),
        enabled_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('code', code)
      .select()
      .single();

    if (error) {
      throw new ModuleRegistryError(`Failed to enable module: ${error.message}`, 'ENABLE_FAILED', 500);
    }

    // Clear cache
    this.invalidateCache();

    // Emit event
    await this.emit({
      type: 'module.enabled',
      moduleCode: code,
      payload: { code, enabledBy: userId },
      timestamp: new Date(),
    });

    return data;
  }

  /**
   * Disable a module
   */
  async disable(code: string, userId?: string): Promise<ModuleDefinition> {
    const module = await this.get(code);
    if (!module) {
      throw new ModuleRegistryError(`Module "${code}" not found`, 'MODULE_NOT_FOUND', 404);
    }

    if (!module.is_enabled) {
      return module; // Already disabled
    }

    // Check if other modules depend on this one
    const dependents = await this.getDependents(code);
    const enabledDependents = dependents.filter(d => d.is_enabled);
    if (enabledDependents.length > 0) {
      throw new ModuleRegistryError(
        `Cannot disable "${code}": required by: ${enabledDependents.map(d => d.code).join(', ')}`,
        'HAS_DEPENDENTS',
        400
      );
    }

    // Disable module
    const { data, error } = await this.supabase
      .from('modules')
      .update({
        is_enabled: false,
        enabled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('code', code)
      .select()
      .single();

    if (error) {
      throw new ModuleRegistryError(`Failed to disable module: ${error.message}`, 'DISABLE_FAILED', 500);
    }

    // Clear cache
    this.invalidateCache();

    // Emit event
    await this.emit({
      type: 'module.disabled',
      moduleCode: code,
      payload: { code, disabledBy: userId },
      timestamp: new Date(),
    });

    return data;
  }

  /**
   * Get module configuration
   */
  async getConfig(code: string): Promise<Record<string, any> | null> {
    const module = await this.get(code);
    return module?.config || null;
  }

  /**
   * Update module configuration
   */
  async updateConfig(code: string, config: Record<string, any>): Promise<ModuleDefinition> {
    const module = await this.get(code);
    if (!module) {
      throw new ModuleRegistryError(`Module "${code}" not found`, 'MODULE_NOT_FOUND', 404);
    }

    // Merge with existing config
    const newConfig = { ...module.config, ...config };

    // TODO: Validate against config_schema if present

    const { data, error } = await this.supabase
      .from('modules')
      .update({
        config: newConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('code', code)
      .select()
      .single();

    if (error) {
      throw new ModuleRegistryError(`Failed to update config: ${error.message}`, 'CONFIG_UPDATE_FAILED', 500);
    }

    // Clear cache
    this.invalidateCache();

    // Emit event
    await this.emit({
      type: 'module.config_updated',
      moduleCode: code,
      payload: { code, config: newConfig },
      timestamp: new Date(),
    });

    return data;
  }

  /**
   * Check if dependencies are met for a module
   */
  async checkDependencies(code: string): Promise<string[]> {
    const module = await this.get(code);
    if (!module || !module.dependencies || module.dependencies.length === 0) {
      return [];
    }

    const unmetDeps: string[] = [];
    for (const dep of module.dependencies) {
      const depModule = await this.get(dep);
      if (!depModule || !depModule.is_enabled) {
        unmetDeps.push(dep);
      }
    }

    return unmetDeps;
  }

  /**
   * Get modules that depend on a given module
   */
  async getDependents(code: string): Promise<ModuleDefinition[]> {
    const modules = await this.getAll();
    return modules.filter(m => m.dependencies?.includes(code));
  }

  /**
   * Register an event handler
   */
  on(eventType: string, handler: (event: ModuleEvent) => Promise<void>): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  /**
   * Emit an event
   */
  async emit(event: ModuleEvent): Promise<void> {
    // Get handlers for this event type
    const handlers = this.eventHandlers.get(event.type) || [];
    const wildcardHandlers = this.eventHandlers.get('*') || [];

    // Log event
    console.log(`[ModuleEvent] ${event.type}:`, event.payload);

    // Store event in database for audit trail
    try {
      await this.supabase.from('module_events').insert({
        event_type: event.type,
        module_code: event.moduleCode,
        payload: event.payload,
        created_at: event.timestamp.toISOString(),
      });
    } catch (err) {
      // Non-critical - just log
      console.error('[ModuleEvent] Failed to store event:', err);
    }

    // Call handlers
    const allHandlers = [...handlers, ...wildcardHandlers];
    for (const handler of allHandlers) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`[ModuleEvent] Handler error for ${event.type}:`, err);
      }
    }
  }

  /**
   * Register a new module (for custom modules)
   */
  async register(module: Partial<ModuleDefinition>): Promise<ModuleDefinition> {
    if (!module.code || !module.name) {
      throw new ModuleRegistryError('Module code and name are required', 'INVALID_MODULE', 400);
    }

    const { data, error } = await this.supabase
      .from('modules')
      .insert({
        code: module.code,
        name: module.name,
        description: module.description || '',
        category: module.category || 'feature',
        version: module.version || '1.0.0',
        icon: module.icon || '📦',
        is_enabled: false,
        is_system: false,
        config: module.config || {},
        config_schema: module.config_schema,
        dependencies: module.dependencies || [],
        provides: module.provides || [],
        events: module.events || [],
        settings_path: module.settings_path,
      })
      .select()
      .single();

    if (error) {
      throw new ModuleRegistryError(`Failed to register module: ${error.message}`, 'REGISTER_FAILED', 500);
    }

    this.invalidateCache();
    return data;
  }

  /**
   * Unregister a module (only non-system modules)
   */
  async unregister(code: string): Promise<void> {
    const module = await this.get(code);
    if (!module) {
      throw new ModuleRegistryError(`Module "${code}" not found`, 'MODULE_NOT_FOUND', 404);
    }

    if (module.is_system) {
      throw new ModuleRegistryError(`Cannot unregister system module "${code}"`, 'SYSTEM_MODULE', 403);
    }

    if (module.is_enabled) {
      throw new ModuleRegistryError(`Cannot unregister enabled module "${code}". Disable it first.`, 'MODULE_ENABLED', 400);
    }

    const { error } = await this.supabase
      .from('modules')
      .delete()
      .eq('code', code);

    if (error) {
      throw new ModuleRegistryError(`Failed to unregister module: ${error.message}`, 'UNREGISTER_FAILED', 500);
    }

    this.invalidateCache();
  }

  /**
   * Refresh cache from database
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.cacheExpiry || this.moduleCache.size === 0) {
      await this.loadModules();
    }
  }

  /**
   * Load modules from database
   */
  private async loadModules(): Promise<void> {
    const { data, error } = await this.supabase
      .from('modules')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('[ModuleRegistry] Failed to load modules:', error);
      return;
    }

    this.moduleCache.clear();
    for (const module of data || []) {
      this.moduleCache.set(module.code, module);
    }
    this.lastCacheUpdate = Date.now();
  }

  /**
   * Invalidate the module cache
   */
  private invalidateCache(): void {
    this.lastCacheUpdate = 0;
  }
}

// Singleton instance
let registryInstance: ModuleRegistry | null = null;

/**
 * Get the module registry instance
 */
export function getModuleRegistry(supabase: SupabaseClient): ModuleRegistry {
  if (!registryInstance) {
    registryInstance = new ModuleRegistry(supabase);
  }
  return registryInstance;
}

/**
 * Helper function to check if a module is enabled
 */
export async function requireModule(supabase: SupabaseClient, code: string): Promise<void> {
  const registry = getModuleRegistry(supabase);
  const isEnabled = await registry.isEnabled(code);

  if (!isEnabled) {
    throw new ModuleRegistryError(
      `Module "${code}" is not enabled. Enable it in Admin > Modules.`,
      'MODULE_DISABLED',
      400
    );
  }
}

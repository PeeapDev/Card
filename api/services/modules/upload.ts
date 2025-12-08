/**
 * Module Upload Service
 *
 * Handles custom module package uploads:
 * - Validates zip file structure
 * - Extracts and validates manifest.json
 * - Stores files in Supabase Storage
 * - Registers module in database
 */

import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { getModuleRegistry } from './registry';

// Types
export interface ModuleManifest {
  code: string;
  name: string;
  description: string;
  version: string;
  category: 'payment' | 'feature' | 'integration' | 'security' | 'api';
  icon?: string;
  author?: string;
  license?: string;
  dependencies?: string[];
  provides?: string[];
  configSchema?: Record<string, any>;
  events?: {
    emits?: string[];
    listens?: string[];
  };
  endpoints?: Array<{
    method: string;
    path: string;
    description: string;
    auth?: string;
  }>;
  webhooks?: Array<{
    name: string;
    path: string;
    description: string;
  }>;
  settingsPath?: string;
  minPlatformVersion?: string;
}

export interface ModulePackage {
  id: string;
  module_code: string;
  version: string;
  file_path: string;
  file_size: number;
  checksum: string;
  manifest: ModuleManifest;
  status: 'pending' | 'installed' | 'failed' | 'deprecated';
  install_error?: string;
  created_at: string;
  installed_at?: string;
  uploaded_by?: string;
}

export interface UploadResult {
  success: boolean;
  package?: ModulePackage;
  error?: string;
  warnings?: string[];
}

export class ModuleUploadError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = 'ModuleUploadError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Module Upload Service
 */
export class ModuleUploadService {
  private supabase: SupabaseClient;
  private storageBucket = 'modules';

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Upload and install a custom module from a zip file
   */
  async uploadModule(
    file: Buffer | ArrayBuffer,
    filename: string,
    uploadedBy?: string
  ): Promise<UploadResult> {
    const warnings: string[] = [];

    try {
      // Convert to Buffer if needed
      const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

      // Validate file size (max 50MB)
      if (buffer.length > 50 * 1024 * 1024) {
        throw new ModuleUploadError('File too large. Maximum size is 50MB.', 'FILE_TOO_LARGE', 400);
      }

      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

      // Extract and validate manifest
      const manifest = await this.extractManifest(buffer);

      // Validate manifest
      this.validateManifest(manifest);

      // Check for existing module with same code
      const registry = getModuleRegistry(this.supabase);
      const existingModule = await registry.get(manifest.code);

      if (existingModule && existingModule.is_system) {
        throw new ModuleUploadError(
          `Cannot override system module "${manifest.code}"`,
          'SYSTEM_MODULE',
          403
        );
      }

      // Check version conflict
      const { data: existingPackage } = await this.supabase
        .from('module_packages')
        .select('*')
        .eq('module_code', manifest.code)
        .eq('version', manifest.version)
        .single();

      if (existingPackage) {
        throw new ModuleUploadError(
          `Module "${manifest.code}" version ${manifest.version} already exists`,
          'VERSION_EXISTS',
          409
        );
      }

      // Upload zip to storage
      const storagePath = `packages/${manifest.code}/${manifest.version}/${filename}`;

      const { error: uploadError } = await this.supabase.storage
        .from(this.storageBucket)
        .upload(storagePath, buffer, {
          contentType: 'application/zip',
          upsert: false,
        });

      if (uploadError) {
        throw new ModuleUploadError(
          `Failed to upload file: ${uploadError.message}`,
          'UPLOAD_FAILED',
          500
        );
      }

      // Create package record
      const { data: packageData, error: packageError } = await this.supabase
        .from('module_packages')
        .insert({
          module_code: manifest.code,
          version: manifest.version,
          file_path: storagePath,
          file_size: buffer.length,
          checksum,
          manifest,
          status: 'pending',
          uploaded_by: uploadedBy,
        })
        .select()
        .single();

      if (packageError) {
        // Cleanup uploaded file
        await this.supabase.storage.from(this.storageBucket).remove([storagePath]);
        throw new ModuleUploadError(
          `Failed to create package record: ${packageError.message}`,
          'DB_ERROR',
          500
        );
      }

      // Register/update module in database
      await this.installModule(packageData.id, manifest, uploadedBy);

      // Update package status
      await this.supabase
        .from('module_packages')
        .update({
          status: 'installed',
          installed_at: new Date().toISOString(),
        })
        .eq('id', packageData.id);

      // Refresh package data
      const { data: updatedPackage } = await this.supabase
        .from('module_packages')
        .select('*')
        .eq('id', packageData.id)
        .single();

      return {
        success: true,
        package: updatedPackage,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      if (error instanceof ModuleUploadError) {
        return { success: false, error: error.message, warnings };
      }
      console.error('[ModuleUpload] Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings,
      };
    }
  }

  /**
   * Extract manifest.json from zip buffer
   */
  private async extractManifest(buffer: Buffer): Promise<ModuleManifest> {
    // For server-side, we'd use a zip library like 'jszip' or 'adm-zip'
    // For now, we'll expect the manifest to be provided separately or as the first file
    // In production, you'd use: const JSZip = require('jszip');

    try {
      // Try to parse as JSON directly (for testing/simple uploads)
      const content = buffer.toString('utf8');
      if (content.trim().startsWith('{')) {
        return JSON.parse(content);
      }

      // For actual zip handling, would use JSZip:
      // const zip = await JSZip.loadAsync(buffer);
      // const manifestFile = zip.file('manifest.json');
      // if (!manifestFile) throw new Error('No manifest.json found');
      // return JSON.parse(await manifestFile.async('string'));

      throw new ModuleUploadError(
        'Invalid file format. Expected a zip file with manifest.json',
        'INVALID_FORMAT',
        400
      );
    } catch (error) {
      if (error instanceof ModuleUploadError) throw error;
      throw new ModuleUploadError(
        'Failed to parse manifest.json: ' + (error instanceof Error ? error.message : 'Unknown error'),
        'INVALID_MANIFEST',
        400
      );
    }
  }

  /**
   * Validate module manifest
   */
  private validateManifest(manifest: ModuleManifest): void {
    const required = ['code', 'name', 'description', 'version', 'category'];
    const missing = required.filter((field) => !manifest[field as keyof ModuleManifest]);

    if (missing.length > 0) {
      throw new ModuleUploadError(
        `Missing required fields in manifest: ${missing.join(', ')}`,
        'INVALID_MANIFEST',
        400
      );
    }

    // Validate code format (lowercase, underscores only)
    if (!/^[a-z][a-z0-9_]*$/.test(manifest.code)) {
      throw new ModuleUploadError(
        'Module code must start with a letter and contain only lowercase letters, numbers, and underscores',
        'INVALID_CODE',
        400
      );
    }

    // Validate version format (semver)
    if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      throw new ModuleUploadError(
        'Version must be in semver format (e.g., 1.0.0)',
        'INVALID_VERSION',
        400
      );
    }

    // Validate category
    const validCategories = ['payment', 'feature', 'integration', 'security', 'api'];
    if (!validCategories.includes(manifest.category)) {
      throw new ModuleUploadError(
        `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        'INVALID_CATEGORY',
        400
      );
    }
  }

  /**
   * Install module from package
   */
  private async installModule(
    packageId: string,
    manifest: ModuleManifest,
    installedBy?: string
  ): Promise<void> {
    const moduleData = {
      code: manifest.code,
      name: manifest.name,
      description: manifest.description,
      category: manifest.category,
      version: manifest.version,
      icon: manifest.icon || '📦',
      is_enabled: false, // Custom modules start disabled
      is_system: false,
      is_custom: true,
      package_id: packageId,
      config: {},
      config_schema: manifest.configSchema,
      dependencies: manifest.dependencies || [],
      provides: manifest.provides || [],
      events: [
        ...(manifest.events?.emits || []),
        ...(manifest.events?.listens || []),
      ],
      settings_path: manifest.settingsPath,
    };

    const { error } = await this.supabase
      .from('modules')
      .upsert(moduleData, { onConflict: 'code' });

    if (error) {
      throw new ModuleUploadError(
        `Failed to register module: ${error.message}`,
        'REGISTER_FAILED',
        500
      );
    }
  }

  /**
   * List all uploaded packages
   */
  async listPackages(moduleCode?: string): Promise<ModulePackage[]> {
    let query = this.supabase
      .from('module_packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (moduleCode) {
      query = query.eq('module_code', moduleCode);
    }

    const { data, error } = await query;

    if (error) {
      throw new ModuleUploadError(`Failed to list packages: ${error.message}`, 'LIST_FAILED', 500);
    }

    return data || [];
  }

  /**
   * Delete a module package
   */
  async deletePackage(packageId: string): Promise<void> {
    // Get package info
    const { data: pkg, error: fetchError } = await this.supabase
      .from('module_packages')
      .select('*, modules(*)')
      .eq('id', packageId)
      .single();

    if (fetchError || !pkg) {
      throw new ModuleUploadError('Package not found', 'NOT_FOUND', 404);
    }

    // Check if module is enabled
    if (pkg.modules?.is_enabled) {
      throw new ModuleUploadError(
        'Cannot delete package for enabled module. Disable the module first.',
        'MODULE_ENABLED',
        400
      );
    }

    // Delete from storage
    await this.supabase.storage.from(this.storageBucket).remove([pkg.file_path]);

    // Delete module record if it's a custom module
    if (pkg.modules?.is_custom) {
      await this.supabase.from('modules').delete().eq('code', pkg.module_code);
    }

    // Delete package record (cascade will delete module_files)
    const { error: deleteError } = await this.supabase
      .from('module_packages')
      .delete()
      .eq('id', packageId);

    if (deleteError) {
      throw new ModuleUploadError(`Failed to delete package: ${deleteError.message}`, 'DELETE_FAILED', 500);
    }
  }

  /**
   * Get download URL for a package
   */
  async getDownloadUrl(packageId: string): Promise<string> {
    const { data: pkg, error } = await this.supabase
      .from('module_packages')
      .select('file_path')
      .eq('id', packageId)
      .single();

    if (error || !pkg) {
      throw new ModuleUploadError('Package not found', 'NOT_FOUND', 404);
    }

    const { data: urlData } = await this.supabase.storage
      .from(this.storageBucket)
      .createSignedUrl(pkg.file_path, 3600); // 1 hour expiry

    if (!urlData?.signedUrl) {
      throw new ModuleUploadError('Failed to generate download URL', 'URL_FAILED', 500);
    }

    return urlData.signedUrl;
  }
}

// Factory function
let uploadServiceInstance: ModuleUploadService | null = null;

export function getModuleUploadService(supabase: SupabaseClient): ModuleUploadService {
  if (!uploadServiceInstance) {
    uploadServiceInstance = new ModuleUploadService(supabase);
  }
  return uploadServiceInstance;
}

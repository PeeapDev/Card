/**
 * Invoice Type Settings Service
 *
 * Manages invoice type definitions and settings for SuperAdmin
 * and merchant invoice type selections.
 */

import { supabase } from '@/lib/supabase';

// Types
export interface InvoiceTypeDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
  is_premium: boolean;
  requires_full_plan: boolean;
  sort_order: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface InvoiceTypeLimits {
  single_app_max_types: number;
  single_app_default_types: string[];
  full_plan_unlimited: boolean;
  allow_merchant_selection: boolean;
}

export interface InvoiceMonthlyLimits {
  single_app_limit: number;
  full_plan_limit: number;
  enterprise_unlimited: boolean;
}

export interface MerchantInvoiceTypeSelection {
  id: string;
  business_id: string;
  invoice_type_code: string;
  enabled_at: string;
  enabled_by: string;
}

class InvoiceTypeSettingsService {
  // ==========================================
  // INVOICE TYPE DEFINITIONS (SuperAdmin)
  // ==========================================

  /**
   * Get all invoice type definitions
   */
  async getInvoiceTypes(): Promise<InvoiceTypeDefinition[]> {
    try {
      const { data, error } = await supabase
        .from('invoice_type_definitions')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching invoice types:', error);
      return [];
    }
  }

  /**
   * Get active invoice types only
   */
  async getActiveInvoiceTypes(): Promise<InvoiceTypeDefinition[]> {
    try {
      const { data, error } = await supabase
        .from('invoice_type_definitions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active invoice types:', error);
      return [];
    }
  }

  /**
   * Update invoice type definition
   */
  async updateInvoiceType(
    code: string,
    updates: Partial<InvoiceTypeDefinition>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoice_type_definitions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('code', code);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating invoice type:', error);
      return false;
    }
  }

  /**
   * Toggle invoice type active status
   */
  async toggleInvoiceTypeActive(code: string, isActive: boolean): Promise<boolean> {
    return this.updateInvoiceType(code, { is_active: isActive });
  }

  /**
   * Toggle invoice type premium status
   */
  async toggleInvoiceTypePremium(code: string, isPremium: boolean): Promise<boolean> {
    return this.updateInvoiceType(code, { is_premium: isPremium });
  }

  /**
   * Toggle requires full plan
   */
  async toggleRequiresFullPlan(code: string, requires: boolean): Promise<boolean> {
    return this.updateInvoiceType(code, { requires_full_plan: requires });
  }

  /**
   * Update sort order for invoice types
   */
  async updateSortOrder(codes: string[]): Promise<boolean> {
    try {
      for (let i = 0; i < codes.length; i++) {
        await supabase
          .from('invoice_type_definitions')
          .update({ sort_order: i + 1 })
          .eq('code', codes[i]);
      }
      return true;
    } catch (error) {
      console.error('Error updating sort order:', error);
      return false;
    }
  }

  // ==========================================
  // SYSTEM SETTINGS (SuperAdmin)
  // ==========================================

  /**
   * Get invoice type limits settings
   */
  async getInvoiceTypeLimits(): Promise<InvoiceTypeLimits> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'invoice_type_limits')
        .single();

      if (error) throw error;
      return data?.value as InvoiceTypeLimits || {
        single_app_max_types: 2,
        single_app_default_types: ['standard', 'proforma'],
        full_plan_unlimited: true,
        allow_merchant_selection: true,
      };
    } catch (error) {
      console.error('Error fetching invoice type limits:', error);
      return {
        single_app_max_types: 2,
        single_app_default_types: ['standard', 'proforma'],
        full_plan_unlimited: true,
        allow_merchant_selection: true,
      };
    }
  }

  /**
   * Update invoice type limits settings
   */
  async updateInvoiceTypeLimits(limits: Partial<InvoiceTypeLimits>): Promise<boolean> {
    try {
      const current = await this.getInvoiceTypeLimits();
      const { error } = await supabase
        .from('system_settings')
        .update({
          value: { ...current, ...limits },
          updated_at: new Date().toISOString(),
        })
        .eq('key', 'invoice_type_limits');

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating invoice type limits:', error);
      return false;
    }
  }

  /**
   * Get monthly invoice limits
   */
  async getMonthlyLimits(): Promise<InvoiceMonthlyLimits> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'invoice_monthly_limits')
        .single();

      if (error) throw error;
      return data?.value as InvoiceMonthlyLimits || {
        single_app_limit: 10,
        full_plan_limit: 1000,
        enterprise_unlimited: true,
      };
    } catch (error) {
      console.error('Error fetching monthly limits:', error);
      return {
        single_app_limit: 10,
        full_plan_limit: 1000,
        enterprise_unlimited: true,
      };
    }
  }

  /**
   * Update monthly invoice limits
   */
  async updateMonthlyLimits(limits: Partial<InvoiceMonthlyLimits>): Promise<boolean> {
    try {
      const current = await this.getMonthlyLimits();
      const { error } = await supabase
        .from('system_settings')
        .update({
          value: { ...current, ...limits },
          updated_at: new Date().toISOString(),
        })
        .eq('key', 'invoice_monthly_limits');

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating monthly limits:', error);
      return false;
    }
  }

  // ==========================================
  // MERCHANT SELECTIONS
  // ==========================================

  /**
   * Get merchant's selected invoice types
   */
  async getMerchantSelections(businessId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('merchant_invoice_type_selections')
        .select('invoice_type_code')
        .eq('business_id', businessId);

      if (error) throw error;
      return data?.map((d) => d.invoice_type_code) || [];
    } catch (error) {
      console.error('Error fetching merchant selections:', error);
      return [];
    }
  }

  /**
   * Get available invoice types for a merchant with selection status
   */
  async getAvailableTypesForMerchant(
    businessId: string
  ): Promise<(InvoiceTypeDefinition & { is_selected: boolean })[]> {
    try {
      // Get all active types
      const types = await this.getActiveInvoiceTypes();
      const selections = await this.getMerchantSelections(businessId);

      return types.map((type) => ({
        ...type,
        is_selected: selections.includes(type.code),
      }));
    } catch (error) {
      console.error('Error fetching available types:', error);
      return [];
    }
  }

  /**
   * Update merchant's selected invoice types
   */
  async updateMerchantSelections(
    businessId: string,
    typeCodes: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get limits
      const limits = await this.getInvoiceTypeLimits();

      // Validate selection count
      if (typeCodes.length > limits.single_app_max_types) {
        return {
          success: false,
          error: `You can only select up to ${limits.single_app_max_types} invoice types`,
        };
      }

      // Delete existing selections
      await supabase
        .from('merchant_invoice_type_selections')
        .delete()
        .eq('business_id', businessId);

      // Insert new selections
      if (typeCodes.length > 0) {
        const { data: user } = await supabase.auth.getUser();
        const insertData = typeCodes.map((code) => ({
          business_id: businessId,
          invoice_type_code: code,
          enabled_by: user?.user?.id,
        }));

        const { error } = await supabase
          .from('merchant_invoice_type_selections')
          .insert(insertData);

        if (error) throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating merchant selections:', error);
      return { success: false, error: error.message || 'Failed to update selections' };
    }
  }

  /**
   * Check if merchant can use a specific invoice type
   */
  async canMerchantUseType(businessId: string, typeCode: string): Promise<boolean> {
    try {
      const selections = await this.getMerchantSelections(businessId);
      return selections.includes(typeCode);
    } catch (error) {
      console.error('Error checking type permission:', error);
      return false;
    }
  }

  /**
   * Get merchant's invoice type limit info
   */
  async getMerchantLimitInfo(businessId: string): Promise<{
    maxTypes: number;
    selectedCount: number;
    remaining: number;
    selections: string[];
  }> {
    try {
      const limits = await this.getInvoiceTypeLimits();
      const selections = await this.getMerchantSelections(businessId);

      return {
        maxTypes: limits.single_app_max_types,
        selectedCount: selections.length,
        remaining: Math.max(0, limits.single_app_max_types - selections.length),
        selections,
      };
    } catch (error) {
      console.error('Error getting merchant limit info:', error);
      return {
        maxTypes: 2,
        selectedCount: 0,
        remaining: 2,
        selections: [],
      };
    }
  }
}

export const invoiceTypeSettingsService = new InvoiceTypeSettingsService();

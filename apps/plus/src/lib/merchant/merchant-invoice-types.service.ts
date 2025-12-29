/**
 * Merchant Invoice Types Service
 *
 * Manages invoice type selections for merchants based on their subscription.
 * Single-app subscribers can select a limited number of invoice types.
 */

import { supabase } from "@/lib/supabase";

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
}

export interface InvoiceTypeLimits {
  single_app_max_types: number;
  single_app_default_types: string[];
  full_plan_unlimited: boolean;
  allow_merchant_selection: boolean;
}

export interface MerchantTypeInfo {
  available_types: (InvoiceTypeDefinition & { is_selected: boolean })[];
  selected_codes: string[];
  max_selections: number;
  can_select_more: boolean;
  allow_selection: boolean;
}

class MerchantInvoiceTypesService {
  /**
   * Get system-wide invoice type limits
   */
  async getTypeLimits(): Promise<InvoiceTypeLimits> {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "invoice_type_limits")
        .single();

      if (error) throw error;
      return (data?.value as InvoiceTypeLimits) || {
        single_app_max_types: 2,
        single_app_default_types: ["standard", "proforma"],
        full_plan_unlimited: true,
        allow_merchant_selection: true,
      };
    } catch (error) {
      console.error("Error fetching type limits:", error);
      return {
        single_app_max_types: 2,
        single_app_default_types: ["standard", "proforma"],
        full_plan_unlimited: true,
        allow_merchant_selection: true,
      };
    }
  }

  /**
   * Get all active invoice types available in the system
   */
  async getActiveInvoiceTypes(): Promise<InvoiceTypeDefinition[]> {
    try {
      const { data, error } = await supabase
        .from("invoice_type_definitions")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching invoice types:", error);
      return [];
    }
  }

  /**
   * Get merchant's selected invoice type codes
   */
  async getMerchantSelections(businessId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from("merchant_invoice_type_selections")
        .select("invoice_type_code")
        .eq("business_id", businessId);

      if (error) throw error;
      return data?.map((d) => d.invoice_type_code) || [];
    } catch (error) {
      console.error("Error fetching merchant selections:", error);
      return [];
    }
  }

  /**
   * Get complete invoice type info for merchant settings page
   */
  async getMerchantTypeInfo(businessId: string): Promise<MerchantTypeInfo> {
    try {
      const [allTypes, selections, limits] = await Promise.all([
        this.getActiveInvoiceTypes(),
        this.getMerchantSelections(businessId),
        this.getTypeLimits(),
      ]);

      // Filter out types that require full plan (single-app merchants can't use these)
      const availableTypes = allTypes
        .filter((t) => !t.requires_full_plan)
        .map((type) => ({
          ...type,
          is_selected: selections.includes(type.code),
        }));

      return {
        available_types: availableTypes,
        selected_codes: selections.length > 0 ? selections : limits.single_app_default_types,
        max_selections: limits.single_app_max_types,
        can_select_more: selections.length < limits.single_app_max_types,
        allow_selection: limits.allow_merchant_selection,
      };
    } catch (error) {
      console.error("Error getting merchant type info:", error);
      return {
        available_types: [],
        selected_codes: ["standard", "proforma"],
        max_selections: 2,
        can_select_more: false,
        allow_selection: true,
      };
    }
  }

  /**
   * Get invoice types the merchant can actually use (for the invoice form)
   */
  async getUsableTypes(businessId: string): Promise<InvoiceTypeDefinition[]> {
    try {
      const info = await this.getMerchantTypeInfo(businessId);

      // Return only types that are selected (or defaults if none selected)
      return info.available_types.filter((t) =>
        info.selected_codes.includes(t.code)
      );
    } catch (error) {
      console.error("Error getting usable types:", error);
      return [];
    }
  }

  /**
   * Update merchant's selected invoice types
   */
  async updateSelections(
    businessId: string,
    typeCodes: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const limits = await this.getTypeLimits();

      // Validate selection count
      if (typeCodes.length > limits.single_app_max_types) {
        return {
          success: false,
          error: `You can only select up to ${limits.single_app_max_types} invoice types`,
        };
      }

      // Check if selection is allowed
      if (!limits.allow_merchant_selection) {
        return {
          success: false,
          error: "Invoice type selection is currently disabled",
        };
      }

      // Validate that selected types exist and don't require full plan
      const allTypes = await this.getActiveInvoiceTypes();
      const validCodes = allTypes
        .filter((t) => !t.requires_full_plan)
        .map((t) => t.code);

      const invalidCodes = typeCodes.filter((c) => !validCodes.includes(c));
      if (invalidCodes.length > 0) {
        return {
          success: false,
          error: `Invalid invoice types: ${invalidCodes.join(", ")}`,
        };
      }

      // Delete existing selections
      await supabase
        .from("merchant_invoice_type_selections")
        .delete()
        .eq("business_id", businessId);

      // Insert new selections
      if (typeCodes.length > 0) {
        const { data: user } = await supabase.auth.getUser();
        const insertData = typeCodes.map((code) => ({
          business_id: businessId,
          invoice_type_code: code,
          enabled_by: user?.user?.id,
        }));

        const { error } = await supabase
          .from("merchant_invoice_type_selections")
          .insert(insertData);

        if (error) throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error updating selections:", error);
      return {
        success: false,
        error: error.message || "Failed to update selections",
      };
    }
  }

  /**
   * Check if merchant can use a specific invoice type
   */
  async canUseType(businessId: string, typeCode: string): Promise<boolean> {
    try {
      const info = await this.getMerchantTypeInfo(businessId);
      return info.selected_codes.includes(typeCode);
    } catch (error) {
      console.error("Error checking type permission:", error);
      return false;
    }
  }
}

export const merchantInvoiceTypesService = new MerchantInvoiceTypesService();

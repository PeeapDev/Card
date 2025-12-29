"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Settings,
  Check,
  Lock,
  AlertCircle,
  Loader2,
  Save,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  merchantInvoiceTypesService,
  type InvoiceTypeDefinition,
} from "@/lib/merchant/merchant-invoice-types.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function MerchantSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState<any>(null);

  // Invoice type state
  const [availableTypes, setAvailableTypes] = useState<
    (InvoiceTypeDefinition & { is_selected: boolean })[]
  >([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [maxSelections, setMaxSelections] = useState(2);
  const [allowSelection, setAllowSelection] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get business
      const { data: businessData } = await supabase
        .from("plus_businesses")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setBusiness(businessData);

      if (businessData) {
        // Load invoice type info
        const typeInfo = await merchantInvoiceTypesService.getMerchantTypeInfo(
          businessData.id
        );
        setAvailableTypes(typeInfo.available_types);
        setSelectedCodes(typeInfo.selected_codes);
        setMaxSelections(typeInfo.max_selections);
        setAllowSelection(typeInfo.allow_selection);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleTypeToggle = (code: string) => {
    if (!allowSelection) return;

    const isSelected = selectedCodes.includes(code);

    if (isSelected) {
      // Remove selection
      setSelectedCodes((prev) => prev.filter((c) => c !== code));
    } else {
      // Add selection (if under limit)
      if (selectedCodes.length < maxSelections) {
        setSelectedCodes((prev) => [...prev, code]);
      } else {
        toast.error(`You can only select up to ${maxSelections} invoice types`);
      }
    }
  };

  const handleSaveTypes = async () => {
    if (!business) return;

    if (selectedCodes.length === 0) {
      toast.error("Please select at least one invoice type");
      return;
    }

    setSaving(true);
    try {
      const result = await merchantInvoiceTypesService.updateSelections(
        business.id,
        selectedCodes
      );

      if (result.success) {
        toast.success("Invoice types saved successfully");
      } else {
        toast.error(result.error || "Failed to save invoice types");
      }
    } catch (error) {
      console.error("Error saving types:", error);
      toast.error("Failed to save invoice types");
    } finally {
      setSaving(false);
    }
  };

  const getIconColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
      purple: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
      green: "text-green-600 bg-green-100 dark:bg-green-900/30",
      emerald: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
      orange: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
      cyan: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30",
      yellow: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30",
      teal: "text-teal-600 bg-teal-100 dark:bg-teal-900/30",
      red: "text-red-600 bg-red-100 dark:bg-red-900/30",
      amber: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
      slate: "text-slate-600 bg-slate-100 dark:bg-slate-900/30",
      indigo: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30",
      gray: "text-gray-600 bg-gray-100 dark:bg-gray-900/30",
    };
    return colors[color] || "text-gray-600 bg-gray-100 dark:bg-gray-900/30";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your merchant account settings
        </p>
      </div>

      {/* Invoice Types Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Invoice Types</CardTitle>
              <CardDescription>
                Choose which invoice types you want to use
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selection Info */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {allowSelection
                  ? `Select up to ${maxSelections} invoice types for your business`
                  : "Invoice type selection is managed by your administrator"}
              </span>
            </div>
            <Badge variant="outline">
              {selectedCodes.length} / {maxSelections} selected
            </Badge>
          </div>

          {!allowSelection && (
            <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <Lock className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-300">
                Invoice type selection is currently disabled. Please contact
                support to change your selection.
              </span>
            </div>
          )}

          {/* Invoice Type Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTypes.map((type) => {
              const isSelected = selectedCodes.includes(type.code);
              const canSelect =
                allowSelection &&
                (isSelected || selectedCodes.length < maxSelections);

              return (
                <button
                  key={type.code}
                  onClick={() => handleTypeToggle(type.code)}
                  disabled={!canSelect && !isSelected}
                  className={cn(
                    "relative p-4 rounded-lg border-2 text-left transition-all",
                    isSelected
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
                    !canSelect && !isSelected && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg", getIconColor(type.color))}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {type.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {type.description}
                      </p>
                    </div>
                  </div>

                  {type.is_premium && (
                    <Badge className="mt-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Premium
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {availableTypes.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">
                No invoice types available
              </p>
            </div>
          )}

          {/* Save Button */}
          {allowSelection && availableTypes.length > 0 && (
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={handleSaveTypes}
                disabled={saving || selectedCodes.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Invoice Types
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Info Card */}
      {business && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                  Your registered business details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Business Name
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {business.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Business Type
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {business.business_type || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Email
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {business.email || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Phone
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {business.phone || "Not specified"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

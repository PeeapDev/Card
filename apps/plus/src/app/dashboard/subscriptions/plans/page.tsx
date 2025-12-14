"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { subscriptionService } from "@/lib/subscriptions/subscription.service";
import type { SubscriptionPlan, CreatePlanDto, BillingInterval } from "@/lib/subscriptions/types";

function formatCurrency(amount: number, currency = "NLE"): string {
  return new Intl.NumberFormat("en-SL", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

const intervalLabels: Record<BillingInterval, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  quarterly: "quarter",
  yearly: "year",
};

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreatePlanDto>({
    name: "",
    description: "",
    price: 0,
    currency: "NLE",
    billing_interval: "monthly",
    billing_interval_count: 1,
    trial_days: 0,
    features: [],
  });
  const [featuresText, setFeaturesText] = useState("");

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await subscriptionService.getPlans();
      setPlans(data);
    } catch (error) {
      console.error("Failed to load plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      currency: "NLE",
      billing_interval: "monthly",
      billing_interval_count: 1,
      trial_days: 0,
      features: [],
    });
    setFeaturesText("");
  };

  const handleAdd = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      currency: plan.currency,
      billing_interval: plan.billing_interval,
      billing_interval_count: plan.billing_interval_count,
      trial_days: plan.trial_days,
      features: plan.features || [],
    });
    setFeaturesText((plan.features || []).join("\n"));
    setShowEditDialog(true);
  };

  const handleSaveNew = async () => {
    if (!formData.name.trim()) {
      alert("Please enter a plan name");
      return;
    }
    if (formData.price <= 0) {
      alert("Please enter a valid price");
      return;
    }

    setIsSaving(true);
    try {
      const features = featuresText
        .split("\n")
        .map(f => f.trim())
        .filter(f => f.length > 0);

      await subscriptionService.createPlan({
        ...formData,
        features,
      });
      setShowAddDialog(false);
      resetForm();
      loadPlans();
    } catch (error) {
      console.error("Failed to create plan:", error);
      alert("Failed to create plan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPlan || !formData.name.trim()) {
      alert("Please enter a plan name");
      return;
    }

    setIsSaving(true);
    try {
      const features = featuresText
        .split("\n")
        .map(f => f.trim())
        .filter(f => f.length > 0);

      await subscriptionService.updatePlan(editingPlan.id, {
        ...formData,
        features,
      });
      setShowEditDialog(false);
      setEditingPlan(null);
      resetForm();
      loadPlans();
    } catch (error) {
      console.error("Failed to update plan:", error);
      alert("Failed to update plan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      await subscriptionService.updatePlan(plan.id, {
        is_active: !plan.is_active,
      });
      loadPlans();
    } catch (error) {
      console.error("Failed to update plan:", error);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this plan? This cannot be undone.")) return;
    try {
      await subscriptionService.deletePlan(planId);
      loadPlans();
    } catch (error) {
      console.error("Failed to delete plan:", error);
      alert("Failed to delete plan. It may have active subscriptions.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/subscriptions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Subscription Plans</h1>
            <p className="text-muted-foreground">
              Create and manage reusable subscription plans
            </p>
          </div>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Create Plan
        </Button>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">No plans yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first subscription plan to start accepting recurring payments
            </p>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {plan.name}
                      {!plan.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </CardTitle>
                    {plan.description && (
                      <CardDescription>{plan.description}</CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(plan)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(plan)}>
                        {plan.is_active ? (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(plan.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold">
                    {formatCurrency(plan.price, plan.currency)}
                  </span>
                  <span className="text-muted-foreground">
                    /{plan.billing_interval_count > 1 ? `${plan.billing_interval_count} ` : ""}
                    {intervalLabels[plan.billing_interval]}
                    {plan.billing_interval_count > 1 ? "s" : ""}
                  </span>
                </div>

                {plan.trial_days > 0 && (
                  <p className="text-sm text-blue-600 mb-3">
                    {plan.trial_days} day free trial
                  </p>
                )}

                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-2 mb-4">
                    {plan.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-sm text-muted-foreground">
                        +{plan.features.length - 4} more features
                      </li>
                    )}
                  </ul>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground pt-3 border-t">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {plan.subscriber_count || 0} subscribers
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/subscriptions/new?planId=${plan.id}`}>
                      Add Subscriber
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Plan Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Plan</DialogTitle>
            <DialogDescription>
              Create a new subscription plan
            </DialogDescription>
          </DialogHeader>
          <PlanForm
            formData={formData}
            setFormData={setFormData}
            featuresText={featuresText}
            setFeaturesText={setFeaturesText}
            onSave={handleSaveNew}
            onCancel={() => setShowAddDialog(false)}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>
              Update plan details
            </DialogDescription>
          </DialogHeader>
          <PlanForm
            formData={formData}
            setFormData={setFormData}
            featuresText={featuresText}
            setFeaturesText={setFeaturesText}
            onSave={handleSaveEdit}
            onCancel={() => setShowEditDialog(false)}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanForm({
  formData,
  setFormData,
  featuresText,
  setFeaturesText,
  onSave,
  onCancel,
  isSaving,
}: {
  formData: CreatePlanDto;
  setFormData: (data: CreatePlanDto) => void;
  featuresText: string;
  setFeaturesText: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  return (
    <>
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="name">Plan Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Basic, Pro, Enterprise"
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the plan"
          />
        </div>
        <div className="grid gap-4 grid-cols-2">
          <div>
            <Label htmlFor="price">Price *</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(v) => setFormData({ ...formData, currency: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NLE">NLE</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2">
          <div>
            <Label htmlFor="interval">Billing Interval</Label>
            <Select
              value={formData.billing_interval}
              onValueChange={(v) => setFormData({ ...formData, billing_interval: v as BillingInterval })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="trialDays">Trial Days</Label>
            <Input
              id="trialDays"
              type="number"
              min="0"
              value={formData.trial_days}
              onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="features">Features (one per line)</Label>
          <Textarea
            id="features"
            value={featuresText}
            onChange={(e) => setFeaturesText(e.target.value)}
            placeholder="Enter features, one per line..."
            rows={4}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Plan
        </Button>
      </DialogFooter>
    </>
  );
}

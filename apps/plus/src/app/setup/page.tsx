"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Check,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Users,
  Settings,
  CheckCircle2,
  Copy,
  Plus,
  AlertTriangle,
  Shield,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type SetupStep = "choose" | "business" | "team" | "preferences" | "complete";
type BusinessSource = "existing" | "new" | null;

interface ExistingBusiness {
  id: string;
  businessName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  industry?: string;
  registrationNumber?: string;
  isVerified?: boolean;
  kycStatus?: string;
}

interface BusinessInfo {
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  industry: string;
  employeeCount: string;
  address: string;
  city: string;
  country: string;
}

interface TeamInfo {
  inviteEmails: string[];
  departments: string[];
}

interface FeatureAddon {
  id: string;
  name: string;
  description: string;
  price: number;
  included: boolean; // Included in base plan
  category: "payments" | "accounting" | "cards" | "team";
}

interface Preferences {
  enableInvoicing: boolean;
  enableSubscriptions: boolean;
  enableCards: boolean;
  defaultCurrency: string;
  autoApproveExpenses: boolean;
  expenseApprovalLimit: string;
  // Add-on features
  selectedAddons: string[];
  cardStaffTier: "none" | "1-10" | "11-50" | "51-100" | "unlimited";
}

function SetupWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<SetupStep>("choose");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const [tier, setTier] = useState<string>("business");
  const [businessSource, setBusinessSource] = useState<BusinessSource>(null);
  const [existingBusiness, setExistingBusiness] = useState<ExistingBusiness | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);

  // CHECK FOR EXISTING SUBSCRIPTION FIRST - Skip setup if already subscribed
  useEffect(() => {
    const checkExistingSubscription = async () => {
      try {
        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;

        if (!user?.id) {
          console.log("Setup: No user found, continuing with setup");
          setIsCheckingSubscription(false);
          return;
        }

        console.log("Setup: Checking for existing subscription for user:", user.id);

        // Query merchant_subscriptions table
        const { data: subscriptions, error } = await supabase
          .from('merchant_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          console.log("Setup: Subscription query error:", error.message);
          setIsCheckingSubscription(false);
          return;
        }

        if (subscriptions && subscriptions.length > 0) {
          const subscription = subscriptions[0];
          console.log("Setup: Found existing subscription:", subscription);

          // Set cookies and localStorage
          const secure = window.location.protocol === 'https:' ? 'Secure;' : '';
          document.cookie = `plusSetupComplete=true;path=/;max-age=31536000;${secure}SameSite=Lax`;
          document.cookie = `plusTier=${subscription.tier};path=/;max-age=31536000;${secure}SameSite=Lax`;

          try {
            localStorage.setItem("plusSetupComplete", "true");
            localStorage.setItem("plusTier", subscription.tier);
            localStorage.setItem("plusSubscriptionStatus", subscription.status);
          } catch {}

          // Redirect to dashboard - user already has subscription
          console.log("Setup: User already has subscription, redirecting to dashboard");
          router.replace("/dashboard");
          return;
        }

        console.log("Setup: No existing subscription found, showing setup wizard");
        setIsCheckingSubscription(false);
      } catch (e) {
        console.error("Setup: Error checking subscription:", e);
        setIsCheckingSubscription(false);
      }
    };

    checkExistingSubscription();
  }, [router]);

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    legalName: "",
    tradingName: "",
    registrationNumber: "",
    industry: "",
    employeeCount: "",
    address: "",
    city: "",
    country: "SL",
  });

  const [teamInfo, setTeamInfo] = useState<TeamInfo>({
    inviteEmails: [""],
    departments: ["General"],
  });

  const [preferences, setPreferences] = useState<Preferences>({
    enableInvoicing: true,
    enableSubscriptions: true,
    enableCards: false,
    defaultCurrency: "NLE",
    autoApproveExpenses: false,
    expenseApprovalLimit: "100",
    selectedAddons: [],
    cardStaffTier: "none",
  });

  // Feature add-ons with pricing (prices in NLE - New Leone, redenominated)
  const featureAddons: FeatureAddon[] = [
    // Free features (included in all plans)
    {
      id: "contact_directory",
      name: "Contact Directory",
      description: "Search and find PeeAP users to add to your team",
      price: 0,
      included: true,
      category: "team",
    },
    {
      id: "invoicing",
      name: "Invoice Generator",
      description: "Create and send professional invoices",
      price: 0,
      included: tier === "business" || tier === "business_plus",
      category: "payments",
    },
    {
      id: "subscriptions",
      name: "Recurring Payments",
      description: "Set up subscription billing for customers",
      price: 0,
      included: tier === "business" || tier === "business_plus",
      category: "payments",
    },
    // Paid add-ons (NLE pricing)
    {
      id: "batch_payments",
      name: "Batch Payments",
      description: "Pay multiple vendors or employees at once",
      price: 75,
      included: false,
      category: "payments",
    },
    {
      id: "payroll",
      name: "Automated Payroll",
      description: "Automated salary payments with tax calculations",
      price: 150,
      included: false,
      category: "accounting",
    },
    {
      id: "expense_management",
      name: "Expense Management",
      description: "Track, approve, and reimburse employee expenses",
      price: 50,
      included: tier === "business_plus",
      category: "accounting",
    },
    {
      id: "accounting_reports",
      name: "Accounting Reports",
      description: "Financial statements, P&L, and balance sheets",
      price: 100,
      included: false,
      category: "accounting",
    },
    {
      id: "multi_currency",
      name: "Multi-Currency Support",
      description: "Accept and pay in multiple currencies",
      price: 50,
      included: false,
      category: "payments",
    },
    {
      id: "api_access",
      name: "API Access",
      description: "Integrate PeeAP Plus with your systems",
      price: 0,
      included: tier === "business" || tier === "business_plus",
      category: "payments",
    },
  ];

  // Corporate card tiers with pricing (NLE - New Leone)
  const cardStaffTiers = [
    { id: "none", name: "No Cards", staff: "0", price: 0 },
    { id: "1-10", name: "Starter", staff: "1-10 employees", price: 100 },
    { id: "11-50", name: "Growth", staff: "11-50 employees", price: 300 },
    { id: "51-100", name: "Business", staff: "51-100 employees", price: 500 },
    { id: "unlimited", name: "Enterprise", staff: "Unlimited", price: 1000 },
  ];

  // Calculate total monthly fee (NLE - New Leone)
  const calculateMonthlyFee = () => {
    let total = 0;

    // Base plan fee (NLE)
    if (tier === "business") total += 150;
    if (tier === "business_plus") total += 500;

    // Add-on fees
    preferences.selectedAddons.forEach(addonId => {
      const addon = featureAddons.find(a => a.id === addonId);
      if (addon && !addon.included) {
        total += addon.price;
      }
    });

    // Card tier fee
    const cardTier = cardStaffTiers.find(t => t.id === preferences.cardStaffTier);
    if (cardTier) {
      total += cardTier.price;
    }

    return total;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-SL").format(price);
  };

  const toggleAddon = (addonId: string) => {
    setPreferences(prev => ({
      ...prev,
      selectedAddons: prev.selectedAddons.includes(addonId)
        ? prev.selectedAddons.filter(id => id !== addonId)
        : [...prev.selectedAddons, addonId]
    }));
  };

  useEffect(() => {
    const tierParam = searchParams.get("tier");
    if (tierParam) {
      setTier(tierParam);
      setPreferences(prev => ({
        ...prev,
        enableCards: tierParam === "business_plus"
      }));
    }
  }, [searchParams]);

  // Fetch existing business data directly from Supabase (shared database)
  const fetchExistingBusiness = async () => {
    setIsLoadingExisting(true);
    try {
      // Get user from localStorage (set by SSO flow)
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user?.id) {
        console.log("No user ID found in localStorage");
        setIsLoadingExisting(false);
        return null;
      }

      console.log("Fetching business for user:", user.id);

      // Query merchant_businesses table directly via Supabase
      const { data: businesses, error } = await supabase
        .from('merchant_businesses')
        .select('*')
        .eq('merchant_id', user.id)
        .limit(1);

      if (error) {
        console.error("Supabase query error:", error);
        return null;
      }

      if (!businesses || businesses.length === 0) {
        console.log("No business found for merchant:", user.id);
        return null;
      }

      const business = businesses[0];
      console.log("Found existing business:", business.name);

      return {
        id: business.id,
        businessName: business.name,
        email: business.email || user.email,
        phone: business.phone,
        address: business.address,
        city: business.city,
        industry: business.industry,
        registrationNumber: business.registration_number,
        isVerified: business.approval_status === 'APPROVED',
        kycStatus: business.kyc_status,
      };
    } catch (error) {
      console.error("Error fetching existing business:", error);
      return null;
    } finally {
      setIsLoadingExisting(false);
    }
  };

  const handleChooseExisting = async () => {
    setBusinessSource("existing");
    const existing = await fetchExistingBusiness();

    if (existing) {
      setExistingBusiness(existing);
      // Pre-fill business info from existing data
      setBusinessInfo({
        legalName: existing.businessName || "",
        tradingName: "",
        registrationNumber: existing.registrationNumber || "",
        industry: existing.industry || "",
        employeeCount: "",
        address: existing.address || "",
        city: existing.city || "",
        country: "SL",
      });
      // If business is already verified, no need for re-verification
      setRequiresVerification(!existing.isVerified);
      setCurrentStep("business");
    } else {
      // No existing business found, show message and switch to new business flow
      setExistingBusiness(null);
      setBusinessSource("new");
      setRequiresVerification(true);
      setCurrentStep("business");
    }
  };

  const handleChooseNew = () => {
    setBusinessSource("new");
    setExistingBusiness(null);
    setRequiresVerification(true);
    setBusinessInfo({
      legalName: "",
      tradingName: "",
      registrationNumber: "",
      industry: "",
      employeeCount: "",
      address: "",
      city: "",
      country: "SL",
    });
    setCurrentStep("business");
  };

  const steps = businessSource === null
    ? [{ id: "choose", label: "Choose Business", icon: Building2 }]
    : [
        { id: "choose", label: "Choose", icon: Building2 },
        { id: "business", label: "Business Info", icon: Building2 },
        { id: "team", label: "Team Setup", icon: Users },
        { id: "preferences", label: "Preferences", icon: Settings },
        { id: "complete", label: "Complete", icon: CheckCircle2 },
      ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    const stepOrder: SetupStep[] = ["choose", "business", "team", "preferences", "complete"];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder: SetupStep[] = ["choose", "business", "team", "preferences", "complete"];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    try {
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;

      // Start 7-day free trial for business_plus tier
      if (user?.id && (tier === 'business_plus' || tier === 'business')) {
        try {
          // Use the start_merchant_trial RPC function
          const { data: subscription, error: subscriptionError } = await supabase.rpc(
            'start_merchant_trial',
            {
              p_user_id: user.id,
              p_business_id: existingBusiness?.id || null,
              p_tier: tier,
              p_trial_days: 7,
              p_price_monthly: calculateMonthlyFee()
            }
          );

          if (subscriptionError) {
            console.log("Trial start via RPC failed, trying direct insert:", subscriptionError.message);

            // Fallback: Direct insert if RPC not available
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 7);

            const { error: insertError } = await supabase
              .from("merchant_subscriptions")
              .upsert({
                user_id: user.id,
                business_id: existingBusiness?.id || null,
                tier: tier,
                status: 'trialing',
                trial_started_at: new Date().toISOString(),
                trial_ends_at: trialEndDate.toISOString(),
                price_monthly: calculateMonthlyFee(),
                currency: 'NLE',
                selected_addons: preferences.selectedAddons,
                preferences: preferences,
              }, { onConflict: 'user_id' });

            if (insertError) {
              console.log("Direct subscription insert also failed:", insertError.message);
            } else {
              console.log("Trial started successfully via direct insert");
            }
          } else {
            console.log("Trial started successfully:", subscription);
          }

          // Store trial info in localStorage
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 7);
          localStorage.setItem("plusTrialEndsAt", trialEnd.toISOString());
          localStorage.setItem("plusSubscriptionStatus", "trialing");
        } catch (trialError) {
          console.error("Error starting trial:", trialError);
        }
      }

      // Try to save business setup to Supabase (table may not exist yet)
      try {
        const { error } = await supabase
          .from("plus_businesses")
          .upsert({
            user_id: user?.id,
            tier,
            source: businessSource,
            requires_verification: requiresVerification,
            verification_status: requiresVerification ? "pending" : "verified",
            business_info: businessInfo,
            team_info: teamInfo,
            preferences,
            monthly_fee: calculateMonthlyFee(),
            created_at: new Date().toISOString(),
          });

        if (error) {
          // Table may not exist yet - this is okay for now
          console.log("Database save skipped (table may not exist):", error.message);
        }
      } catch (dbError) {
        // Database error - continue with local storage
        console.log("Database not available, using local storage");
      }

      // Mark setup as complete in cookies (more reliable than localStorage)
      const secure = window.location.protocol === 'https:';
      const cookieOptions = `path=/; max-age=31536000; ${secure ? 'secure;' : ''} samesite=Lax`;

      document.cookie = `plusSetupComplete=true; ${cookieOptions}`;
      document.cookie = `plusTier=${tier}; ${cookieOptions}`;
      document.cookie = `plusMonthlyFee=${calculateMonthlyFee()}; ${cookieOptions}`;

      console.log("Setup: Saved setup complete to cookies");
      console.log("Setup: Cookie plusSetupComplete =", document.cookie.includes('plusSetupComplete=true'));

      // Also save to localStorage as backup
      try {
        localStorage.setItem("plusSetupComplete", "true");
        localStorage.setItem("plusTier", tier);
        localStorage.setItem("plusBusinessInfo", JSON.stringify(businessInfo));
        localStorage.setItem("plusPreferences", JSON.stringify(preferences));
        localStorage.setItem("plusMonthlyFee", calculateMonthlyFee().toString());
      } catch (e) {
        console.log("Setup: localStorage not available, using cookies only");
      }

      if (requiresVerification) {
        document.cookie = `plusVerificationStatus=pending; ${cookieOptions}`;
        try { localStorage.setItem("plusVerificationStatus", "pending"); } catch {}
      } else {
        document.cookie = `plusVerificationStatus=verified; ${cookieOptions}`;
        try { localStorage.setItem("plusVerificationStatus", "verified"); } catch {}
      }

      // Update user data
      if (user) {
        user.businessName = businessInfo.legalName;
        user.tier = tier;
        try { localStorage.setItem("user", JSON.stringify(user)); } catch {}
      }

      setCurrentStep("complete");
    } catch (error) {
      console.error("Setup error:", error);
      // Still proceed - save to local storage
      localStorage.setItem("plusSetupComplete", "true");
      localStorage.setItem("plusTier", tier);
      setCurrentStep("complete");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEmailField = () => {
    setTeamInfo(prev => ({
      ...prev,
      inviteEmails: [...prev.inviteEmails, ""]
    }));
  };

  const updateEmail = (index: number, value: string) => {
    setTeamInfo(prev => ({
      ...prev,
      inviteEmails: prev.inviteEmails.map((email, i) => i === index ? value : email)
    }));
  };

  // Show loading while checking for existing subscription
  if (isCheckingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-white/60">Checking subscription status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <span className="text-white font-bold text-lg">P+</span>
            </div>
            <span className="font-bold text-xl text-white">PeeAP Plus</span>
            <Badge variant="secondary" className="ml-2 bg-white/10 text-white border-white/20">Setup</Badge>
          </div>
          <Badge className="capitalize bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0 shadow-lg shadow-purple-500/25">{tier.replace("_", " ")} Plan</Badge>
        </div>
      </header>

      <main className="relative container mx-auto px-4 py-8 max-w-3xl">
        {/* Progress Steps */}
        {businessSource !== null && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isComplete = currentStepIndex > index;

                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center gap-2 ${
                      isActive ? "text-purple-400" : isComplete ? "text-green-400" : "text-white/40"
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        isActive
                          ? "border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/25"
                          : isComplete
                          ? "border-green-400 bg-green-500/20"
                          : "border-white/20 bg-white/5"
                      }`}>
                        {isComplete ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <span className="hidden sm:inline text-sm font-medium">{step.label}</span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-12 sm:w-20 h-0.5 mx-2 ${
                        isComplete ? "bg-green-400" : "bg-white/20"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step Content */}
        <Card className="bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl shadow-black/20">
          {/* Step 1: Choose Business Source */}
          {currentStep === "choose" && (
            <>
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/25">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Set Up Your Business</CardTitle>
                <CardDescription className="text-base">
                  How would you like to set up your PeeAP Plus business account?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Option 1: Use Existing Business */}
                <button
                  onClick={handleChooseExisting}
                  disabled={isLoadingExisting}
                  className="w-full p-6 border-2 border-gray-200 rounded-2xl text-left hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                      <Copy className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg text-gray-900">Use Existing Business</h3>
                        <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">Recommended</Badge>
                      </div>
                      <p className="text-gray-500 text-sm mb-3">
                        Copy your business information from your PeeAP merchant account. This is faster and your account will be automatically verified.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Auto-verified - Full access immediately</span>
                      </div>
                    </div>
                    {isLoadingExisting ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    ) : (
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                    )}
                  </div>
                </button>

                {/* Option 2: Create New Business */}
                <button
                  onClick={handleChooseNew}
                  className="w-full p-6 border-2 border-gray-200 rounded-2xl text-left hover:border-amber-400 hover:bg-amber-50 hover:shadow-lg hover:shadow-amber-100 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
                      <Plus className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">Create New Business</h3>
                      <p className="text-gray-500 text-sm mb-3">
                        Set up a completely new business account. This requires verification by our team before you can access all features.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
                        <Clock className="w-4 h-4" />
                        <span>Requires verification (1-2 business days)</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>

                {/* Info box */}
                <Alert className="mt-6">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Why verification for new businesses?</strong> To ensure security and prevent fraud, new business accounts require verification. Using your existing PeeAP merchant data skips this step.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </>
          )}

          {/* Step 2: Business Information */}
          {currentStep === "business" && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Business Information
                  {businessSource === "existing" && existingBusiness && (
                    <Badge variant="secondary" className="ml-2">From existing account</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {businessSource === "existing"
                    ? "We've pre-filled your information. Review and update if needed."
                    : "Enter your new business details. This will require verification."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Verification warning for new business */}
                {requiresVerification && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      <strong>Verification Required:</strong> New business accounts require approval by our team. Some features will be limited until verification is complete.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Success message for existing business */}
                {businessSource === "existing" && existingBusiness && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>Auto-Verified:</strong> Your business data from {existingBusiness.businessName} has been imported. You'll have full access immediately after setup.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="legalName">Legal Business Name *</Label>
                    <Input
                      id="legalName"
                      placeholder="ABC Company Ltd"
                      value={businessInfo.legalName}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, legalName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tradingName">Trading Name (optional)</Label>
                    <Input
                      id="tradingName"
                      placeholder="ABC Store"
                      value={businessInfo.tradingName}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, tradingName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Registration Number</Label>
                    <Input
                      id="registrationNumber"
                      placeholder="SL-12345"
                      value={businessInfo.registrationNumber}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, registrationNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select
                      value={businessInfo.industry}
                      onValueChange={(v) => setBusinessInfo({ ...businessInfo, industry: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="restaurant">Restaurant / Food</SelectItem>
                        <SelectItem value="services">Professional Services</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="construction">Construction</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeCount">Number of Employees</Label>
                  <Select
                    value={businessInfo.employeeCount}
                    onValueChange={(v) => setBusinessInfo({ ...businessInfo, employeeCount: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-5">1-5</SelectItem>
                      <SelectItem value="6-20">6-20</SelectItem>
                      <SelectItem value="21-50">21-50</SelectItem>
                      <SelectItem value="51-100">51-100</SelectItem>
                      <SelectItem value="100+">100+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    value={businessInfo.address}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Freetown"
                      value={businessInfo.city}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={businessInfo.country}
                      onValueChange={(v) => setBusinessInfo({ ...businessInfo, country: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SL">Sierra Leone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: Team Setup */}
          {currentStep === "team" && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Setup
                </CardTitle>
                <CardDescription>
                  Invite team members to your account (you can do this later)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Invite Team Members</Label>
                  <p className="text-sm text-muted-foreground">
                    Team members will be able to access the dashboard based on their assigned roles.
                  </p>
                  {teamInfo.inviteEmails.map((email, index) => (
                    <Input
                      key={index}
                      type="email"
                      placeholder="colleague@company.com"
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                    />
                  ))}
                  <Button variant="outline" size="sm" onClick={addEmailField}>
                    + Add Another
                  </Button>
                </div>

                {tier === "business_plus" && (
                  <div className="space-y-4">
                    <Label>Departments</Label>
                    <p className="text-sm text-muted-foreground">
                      Organize your team into departments for better expense tracking
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {["General", "Sales", "Marketing", "Engineering", "Operations", "Finance"].map((dept) => (
                        <Badge
                          key={dept}
                          variant={teamInfo.departments.includes(dept) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setTeamInfo(prev => ({
                              ...prev,
                              departments: prev.departments.includes(dept)
                                ? prev.departments.filter(d => d !== dept)
                                : [...prev.departments, dept]
                            }));
                          }}
                        >
                          {dept}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          )}

          {/* Step 4: Preferences */}
          {currentStep === "preferences" && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Features & Add-ons
                </CardTitle>
                <CardDescription>
                  Select features for your business. Add-ons will be charged monthly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Monthly Fee Summary */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Monthly Fee</p>
                      <p className="text-2xl font-bold">NLE {formatPrice(calculateMonthlyFee())}</p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {tier.replace("_", " ")} Plan
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Billed monthly from your PeeAP wallet at my.peeap.com
                  </p>
                </div>

                {/* Default Currency */}
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select
                    value={preferences.defaultCurrency}
                    onValueChange={(v) => setPreferences({ ...preferences, defaultCurrency: v })}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NLE">NLE (New Leone)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Included Features */}
                <div className="space-y-3">
                  <Label className="text-base">Included in Your Plan</Label>
                  <div className="grid gap-2">
                    {featureAddons.filter(a => a.included).map((addon) => (
                      <div
                        key={addon.id}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-medium text-sm">{addon.name}</p>
                            <p className="text-xs text-muted-foreground">{addon.description}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-green-700 bg-green-100">
                          Included
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Corporate Cards Tier Selection */}
                {tier === "business_plus" && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base">Corporate Cards</Label>
                    <p className="text-sm text-muted-foreground">
                      Issue expense cards to your employees with spending controls
                    </p>
                    <div className="grid gap-2">
                      {cardStaffTiers.map((cardTier) => (
                        <button
                          key={cardTier.id}
                          onClick={() => setPreferences(prev => ({ ...prev, cardStaffTier: cardTier.id as Preferences["cardStaffTier"] }))}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left ${
                            preferences.cardStaffTier === cardTier.id
                              ? "border-purple-500 bg-purple-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              preferences.cardStaffTier === cardTier.id
                                ? "border-purple-500 bg-purple-500"
                                : "border-gray-300"
                            }`}>
                              {preferences.cardStaffTier === cardTier.id && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{cardTier.name}</p>
                              <p className="text-xs text-muted-foreground">{cardTier.staff}</p>
                            </div>
                          </div>
                          <span className={`text-sm font-medium ${
                            cardTier.price === 0 ? "text-muted-foreground" : "text-purple-600"
                          }`}>
                            {cardTier.price === 0 ? "—" : `+NLE ${formatPrice(cardTier.price)}/mo`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Premium Add-ons */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-base">Premium Add-ons</Label>
                  <p className="text-sm text-muted-foreground">
                    Enhance your business with additional features
                  </p>
                  <div className="grid gap-2">
                    {featureAddons.filter(a => !a.included && a.price > 0).map((addon) => {
                      const isSelected = preferences.selectedAddons.includes(addon.id);
                      return (
                        <button
                          key={addon.id}
                          onClick={() => toggleAddon(addon.id)}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left ${
                            isSelected
                              ? "border-amber-500 bg-amber-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? "border-amber-500 bg-amber-500"
                                : "border-gray-300"
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{addon.name}</p>
                              <p className="text-xs text-muted-foreground">{addon.description}</p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-amber-600">
                            +NLE {formatPrice(addon.price)}/mo
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expense Settings (for Business++) */}
                {tier === "business_plus" && preferences.cardStaffTier !== "none" && (
                  <div className="space-y-4 pt-4 border-t">
                    <Label className="text-base">Expense Settings</Label>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="autoApprove"
                        checked={preferences.autoApproveExpenses}
                        onCheckedChange={(checked) =>
                          setPreferences({ ...preferences, autoApproveExpenses: !!checked })
                        }
                      />
                      <Label htmlFor="autoApprove" className="cursor-pointer text-sm">
                        Auto-approve expenses under limit
                      </Label>
                    </div>
                    {preferences.autoApproveExpenses && (
                      <div className="space-y-2 pl-6">
                        <Label htmlFor="approvalLimit" className="text-sm">Auto-approval Limit (NLE)</Label>
                        <Input
                          id="approvalLimit"
                          type="number"
                          className="w-48"
                          value={preferences.expenseApprovalLimit}
                          onChange={(e) => setPreferences({ ...preferences, expenseApprovalLimit: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Billing Info */}
                <Alert className="mt-4">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Subscription Management:</strong> Your monthly subscription will be managed from your PeeAP account at my.peeap.com. Charges are deducted automatically from your PeeAP wallet.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </>
          )}

          {/* Step 5: Complete */}
          {currentStep === "complete" && (
            <>
              <CardHeader className="text-center">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
                  requiresVerification
                    ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/25"
                    : "bg-gradient-to-br from-emerald-400 to-green-500 shadow-emerald-500/25"
                }`}>
                  {requiresVerification ? (
                    <Clock className="w-10 h-10 text-white" />
                  ) : (
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  )}
                </div>
                <CardTitle className="text-2xl">
                  {requiresVerification ? "Setup Complete - Verification Pending" : "You're All Set!"}
                </CardTitle>
                <CardDescription className="text-base">
                  {requiresVerification
                    ? "Your account has been created and is pending verification"
                    : "Your PeeAP Plus account is ready to use"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                {requiresVerification && (
                  <Alert className="text-left border-amber-200 bg-amber-50">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      <strong>What happens next?</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Our team will review your business information</li>
                        <li>Verification usually takes 1-2 business days</li>
                        <li>You'll receive an email once verified</li>
                        <li>Some features are limited until verification</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-100">
                  <p className="font-semibold text-gray-900 mb-3">Your {tier === "business_plus" ? "Business++" : "Business"} plan includes:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {preferences.enableInvoicing && <Badge className="bg-purple-100 text-purple-700 border-purple-200">Invoicing</Badge>}
                    {preferences.enableSubscriptions && <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">Subscriptions</Badge>}
                    {preferences.enableCards && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Employee Cards</Badge>}
                  </div>
                </div>

                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25 px-8 py-6 text-lg"
                  onClick={() => {
                    // Ensure setup complete flag is set in cookies before navigation
                    console.log("Setup Complete: Clicking Go to Dashboard");
                    const secure = window.location.protocol === 'https:';
                    const cookieOptions = `path=/; max-age=31536000; ${secure ? 'secure;' : ''} samesite=Lax`;
                    document.cookie = `plusSetupComplete=true; ${cookieOptions}`;
                    document.cookie = `plusTier=${tier}; ${cookieOptions}`;
                    try {
                      localStorage.setItem("plusSetupComplete", "true");
                      localStorage.setItem("plusTier", tier);
                    } catch {}
                    console.log("Setup Complete: Cookie set, navigating to /dashboard");
                    router.push("/dashboard");
                  }}
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </>
          )}

          {/* Navigation Buttons */}
          {currentStep !== "complete" && currentStep !== "choose" && (
            <div className="flex justify-between p-6 border-t border-gray-100 bg-gray-50/50">
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-gray-300 hover:bg-gray-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {currentStep === "preferences" ? (
                <Button
                  onClick={handleComplete}
                  disabled={isSubmitting || !businessInfo.legalName}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <Check className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={currentStep === "business" && !businessInfo.legalName}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* Skip Setup */}
        {currentStep !== "complete" && currentStep !== "choose" && (
          <p className="text-center text-sm text-white/60 mt-4">
            <button
              onClick={() => {
                localStorage.setItem("plusSetupComplete", "true");
                localStorage.setItem("plusTier", tier);
                router.push("/dashboard");
              }}
              className="underline hover:text-white transition-colors"
            >
              Skip setup and go to dashboard
            </button>
          </p>
        )}
      </main>
    </div>
  );
}

function SetupLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-purple-400 mx-auto mb-4" />
        <p className="text-white/60">Loading setup wizard...</p>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<SetupLoading />}>
      <SetupWizardContent />
    </Suspense>
  );
}

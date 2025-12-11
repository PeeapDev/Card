"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Users,
  CreditCard,
  Settings,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

type SetupStep = "business" | "team" | "preferences" | "complete";

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

interface Preferences {
  enableInvoicing: boolean;
  enableSubscriptions: boolean;
  enableCards: boolean;
  defaultCurrency: string;
  autoApproveExpenses: boolean;
  expenseApprovalLimit: string;
}

function SetupWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<SetupStep>("business");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tier, setTier] = useState<string>("business");

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
    enableCards: tier === "business_plus",
    defaultCurrency: "SLE",
    autoApproveExpenses: false,
    expenseApprovalLimit: "100000",
  });

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

  const steps = [
    { id: "business", label: "Business Info", icon: Building2 },
    { id: "team", label: "Team Setup", icon: Users },
    { id: "preferences", label: "Preferences", icon: Settings },
    { id: "complete", label: "Complete", icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    const stepOrder: SetupStep[] = ["business", "team", "preferences", "complete"];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder: SetupStep[] = ["business", "team", "preferences", "complete"];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      // Save setup data
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/merchant/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier,
          businessInfo,
          teamInfo,
          preferences,
        }),
      });

      // Mark setup as complete
      localStorage.setItem("plusSetupComplete", "true");
      localStorage.setItem("plusTier", tier);

      setCurrentStep("complete");
    } catch (error) {
      console.error("Setup error:", error);
      // Still proceed for demo
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P+</span>
            </div>
            <span className="font-bold text-xl">PeeAP Plus</span>
            <Badge variant="secondary" className="ml-2">Setup</Badge>
          </div>
          <Badge className="capitalize">{tier.replace("_", " ")} Plan</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isComplete = currentStepIndex > index;

              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 ${
                    isActive ? "text-primary" : isComplete ? "text-green-600" : "text-muted-foreground"
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      isActive
                        ? "border-primary bg-primary/10"
                        : isComplete
                        ? "border-green-600 bg-green-100"
                        : "border-muted"
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
                      isComplete ? "bg-green-600" : "bg-muted"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          {currentStep === "business" && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Business Information
                </CardTitle>
                <CardDescription>
                  Tell us about your business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="legalName">Legal Business Name</Label>
                    <Input
                      id="legalName"
                      placeholder="ABC Company Ltd"
                      value={businessInfo.legalName}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, legalName: e.target.value })}
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

          {currentStep === "preferences" && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Preferences
                </CardTitle>
                <CardDescription>
                  Configure your account settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Features to Enable</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="invoicing"
                        checked={preferences.enableInvoicing}
                        onCheckedChange={(checked) =>
                          setPreferences({ ...preferences, enableInvoicing: !!checked })
                        }
                      />
                      <Label htmlFor="invoicing" className="cursor-pointer">
                        Invoice Generator
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="subscriptions"
                        checked={preferences.enableSubscriptions}
                        onCheckedChange={(checked) =>
                          setPreferences({ ...preferences, enableSubscriptions: !!checked })
                        }
                      />
                      <Label htmlFor="subscriptions" className="cursor-pointer">
                        Recurring Payments / Subscriptions
                      </Label>
                    </div>
                    {tier === "business_plus" && (
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="cards"
                          checked={preferences.enableCards}
                          onCheckedChange={(checked) =>
                            setPreferences({ ...preferences, enableCards: !!checked })
                          }
                        />
                        <Label htmlFor="cards" className="cursor-pointer">
                          Employee Expense Cards
                        </Label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select
                    value={preferences.defaultCurrency}
                    onValueChange={(v) => setPreferences({ ...preferences, defaultCurrency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SLE">SLE (Sierra Leonean Leone)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {tier === "business_plus" && (
                  <div className="space-y-4 pt-4 border-t">
                    <Label>Expense Settings</Label>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="autoApprove"
                        checked={preferences.autoApproveExpenses}
                        onCheckedChange={(checked) =>
                          setPreferences({ ...preferences, autoApproveExpenses: !!checked })
                        }
                      />
                      <Label htmlFor="autoApprove" className="cursor-pointer">
                        Auto-approve expenses under limit
                      </Label>
                    </div>
                    {preferences.autoApproveExpenses && (
                      <div className="space-y-2 pl-6">
                        <Label htmlFor="approvalLimit">Auto-approval Limit (SLE)</Label>
                        <Input
                          id="approvalLimit"
                          type="number"
                          value={preferences.expenseApprovalLimit}
                          onChange={(e) => setPreferences({ ...preferences, expenseApprovalLimit: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </>
          )}

          {currentStep === "complete" && (
            <>
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle>You&apos;re All Set!</CardTitle>
                <CardDescription>
                  Your PeeAP Plus account is ready to use
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <div className="bg-muted rounded-lg p-4">
                  <p className="font-medium mb-2">Your {tier === "business_plus" ? "Business++" : "Business"} plan includes:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {preferences.enableInvoicing && <Badge>Invoicing</Badge>}
                    {preferences.enableSubscriptions && <Badge>Subscriptions</Badge>}
                    {preferences.enableCards && <Badge variant="secondary">Employee Cards</Badge>}
                  </div>
                </div>

                <Button size="lg" onClick={() => router.push("/dashboard")}>
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </>
          )}

          {/* Navigation Buttons */}
          {currentStep !== "complete" && (
            <div className="flex justify-between p-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === "business"}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {currentStep === "preferences" ? (
                <Button onClick={handleComplete} disabled={isSubmitting}>
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
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* Skip Setup */}
        {currentStep !== "complete" && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            <button
              onClick={() => {
                localStorage.setItem("plusSetupComplete", "true");
                localStorage.setItem("plusTier", tier);
                router.push("/dashboard");
              }}
              className="underline hover:text-foreground"
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

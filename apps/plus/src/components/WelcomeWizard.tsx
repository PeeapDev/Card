"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  LayoutDashboard,
  FileText,
  Users,
  CreditCard,
  Calculator,
  DollarSign,
  BookOpen,
  Sparkles,
  X,
  Plus,
  UserPlus,
  Link2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface Preferences {
  enableInvoicing: boolean;
  enableSubscriptions: boolean;
  enableCards: boolean;
  defaultCurrency: string;
  autoApproveExpenses: boolean;
  expenseApprovalLimit: string;
  selectedAddons: string[];
  cardStaffTier: string;
}

interface WelcomeWizardProps {
  tier: string;
  preferences: Preferences | null;
  onComplete: () => void;
}

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
  actionHref: string;
  tips: string[];
}

// All possible tour steps
const allTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to PeeAP Plus!",
    description: "Your business dashboard is ready. Let's take a quick tour of your features.",
    icon: <Sparkles className="h-8 w-8" />,
    actionLabel: "Start Tour",
    actionHref: "/dashboard",
    tips: [
      "Your sidebar shows all your enabled features",
      "Quick Actions let you create things fast",
      "Complete this tour to unlock your full potential",
    ],
  },
  {
    id: "create_invoice",
    title: "Create Your First Invoice",
    description: "Send professional invoices to your customers and get paid faster.",
    icon: <FileText className="h-8 w-8" />,
    actionLabel: "Create Invoice",
    actionHref: "/dashboard/invoices/new",
    tips: [
      "Add your business logo and details",
      "Set payment terms and due dates",
      "Send invoices directly via email",
    ],
  },
  {
    id: "new_subscription",
    title: "Set Up Recurring Payments",
    description: "Create subscription plans for customers who pay you regularly.",
    icon: <RefreshCw className="h-8 w-8" />,
    actionLabel: "New Subscription",
    actionHref: "/dashboard/subscriptions/new",
    tips: [
      "Set billing frequency (weekly, monthly, yearly)",
      "Auto-charge customers on schedule",
      "Send payment reminders automatically",
    ],
  },
  {
    id: "add_employee",
    title: "Add Your Team Members",
    description: "Search for PeeAP users and add them to your business team.",
    icon: <UserPlus className="h-8 w-8" />,
    actionLabel: "Add Employee",
    actionHref: "/dashboard/employees/new",
    tips: [
      "Search by name, email, or phone number",
      "Assign roles like Admin, Manager, or Viewer",
      "Team members can access based on permissions",
    ],
  },
  {
    id: "issue_card",
    title: "Issue Employee Cards",
    description: "Give your team expense cards with spending controls.",
    icon: <CreditCard className="h-8 w-8" />,
    actionLabel: "Issue Card",
    actionHref: "/dashboard/cards/new",
    tips: [
      "Set spending limits per card",
      "Restrict to certain merchant categories",
      "Track all expenses in real-time",
    ],
  },
  {
    id: "checkout_link",
    title: "Create Checkout Links",
    description: "Generate payment links to share with customers anywhere.",
    icon: <Link2 className="h-8 w-8" />,
    actionLabel: "Create Link",
    actionHref: "/dashboard/checkout/new",
    tips: [
      "Share via WhatsApp, email, or social media",
      "Accept one-time or recurring payments",
      "Track which links convert to sales",
    ],
  },
  {
    id: "batch_payments",
    title: "Batch Payments",
    description: "Pay multiple vendors or employees at once.",
    icon: <DollarSign className="h-8 w-8" />,
    actionLabel: "Make Batch Payment",
    actionHref: "/dashboard/batch-payments",
    tips: [
      "Upload a CSV with payment details",
      "Review and approve before sending",
      "Track all payments in one place",
    ],
  },
  {
    id: "payroll",
    title: "Automated Payroll",
    description: "Set up automatic salary payments for your team.",
    icon: <Calculator className="h-8 w-8" />,
    actionLabel: "Setup Payroll",
    actionHref: "/dashboard/payroll",
    tips: [
      "Add employees and their salary details",
      "Schedule automatic monthly payments",
      "Generate payslips automatically",
    ],
  },
  {
    id: "reports",
    title: "Accounting Reports",
    description: "Generate financial statements and track your business health.",
    icon: <BookOpen className="h-8 w-8" />,
    actionLabel: "View Reports",
    actionHref: "/dashboard/reports",
    tips: [
      "Generate P&L statements",
      "View balance sheets",
      "Export reports to PDF or Excel",
    ],
  },
];

export function WelcomeWizard({ tier, preferences, onComplete }: WelcomeWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Get enabled tour steps based on user's plan and selected addons
  const getEnabledSteps = (): TourStep[] => {
    const steps: TourStep[] = [allTourSteps[0]]; // Always include welcome

    // Base features for business tiers
    if (tier === "business" || tier === "business_plus") {
      steps.push(allTourSteps.find(s => s.id === "create_invoice")!);
      steps.push(allTourSteps.find(s => s.id === "new_subscription")!);
      steps.push(allTourSteps.find(s => s.id === "checkout_link")!);
    }

    // Team/Contact directory - always available
    steps.push(allTourSteps.find(s => s.id === "add_employee")!);

    // Cards (if card tier selected)
    if (preferences?.cardStaffTier && preferences.cardStaffTier !== "none") {
      steps.push(allTourSteps.find(s => s.id === "issue_card")!);
    }

    // Add-on features
    if (preferences?.selectedAddons?.includes("batch_payments")) {
      steps.push(allTourSteps.find(s => s.id === "batch_payments")!);
    }
    if (preferences?.selectedAddons?.includes("payroll")) {
      steps.push(allTourSteps.find(s => s.id === "payroll")!);
    }
    if (preferences?.selectedAddons?.includes("accounting_reports")) {
      steps.push(allTourSteps.find(s => s.id === "reports")!);
    }

    return steps.filter(Boolean);
  };

  const steps = getEnabledSteps();
  const currentTourStep = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleAction = () => {
    // Mark step as completed
    if (!completedSteps.includes(currentTourStep.id)) {
      setCompletedSteps(prev => [...prev, currentTourStep.id]);
    }
    // Navigate to the action
    router.push(currentTourStep.actionHref);
    // Close wizard
    onComplete();
  };

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="relative pb-2">
          <button
            onClick={handleSkip}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Progress indicator - clickable steps */}
          <div className="flex justify-center gap-1.5 mb-4">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = completedSteps.includes(step.id) || index < currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(index)}
                  className={`h-2 rounded-full transition-all ${
                    isActive
                      ? "w-6 bg-primary"
                      : isCompleted
                      ? "w-2 bg-green-500"
                      : "w-2 bg-gray-200 hover:bg-gray-300"
                  }`}
                  title={step.title}
                />
              );
            })}
          </div>

          {/* Step counter */}
          <div className="text-center mb-2">
            <Badge variant="secondary" className="text-xs">
              Step {currentStep + 1} of {steps.length}
            </Badge>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              isFirstStep
                ? "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600"
                : "bg-primary/10 text-primary"
            }`}>
              {currentTourStep.icon}
            </div>
          </div>

          <CardTitle className="text-center text-xl">
            {currentTourStep.title}
          </CardTitle>
          <CardDescription className="text-center">
            {currentTourStep.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tips */}
          <div className="space-y-2">
            {currentTourStep.tips.map((tip, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-primary">{index + 1}</span>
                </div>
                <p className="text-sm text-muted-foreground pt-0.5">{tip}</p>
              </div>
            ))}
          </div>

          {/* Action button (except for welcome) */}
          {!isFirstStep && (
            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              onClick={handleAction}
            >
              {currentTourStep.actionLabel}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}

          {/* Feature badges on first step */}
          {isFirstStep && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Your enabled features:</p>
              <div className="flex flex-wrap gap-2">
                {steps.slice(1).map((step) => (
                  <Badge key={step.id} variant="secondary" className="text-xs">
                    {step.title.replace("Create Your First ", "").replace("Set Up ", "").replace("Add Your ", "")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-2 border-t">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={isFirstStep}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                Skip Tour
              </Button>
              <Button onClick={handleNext}>
                {isLastStep ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

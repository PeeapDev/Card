"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Check, Building2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getStaffInvitationsAsync,
  acceptInvitation,
  declineInvitation,
  ROLES,
  PERMISSIONS,
  type StaffInvitation,
} from "@/lib/staff/staff.service";

export default function SetupPinPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [selectedInvitation, setSelectedInvitation] = useState<StaffInvitation | null>(null);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const [step, setStep] = useState<"select" | "pin" | "confirm">("select");
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const pinRef0 = useRef<HTMLInputElement>(null);
  const pinRef1 = useRef<HTMLInputElement>(null);
  const pinRef2 = useRef<HTMLInputElement>(null);
  const pinRef3 = useRef<HTMLInputElement>(null);
  const confirmPinRef0 = useRef<HTMLInputElement>(null);
  const confirmPinRef1 = useRef<HTMLInputElement>(null);
  const confirmPinRef2 = useRef<HTMLInputElement>(null);
  const confirmPinRef3 = useRef<HTMLInputElement>(null);

  const pinRefs = [pinRef0, pinRef1, pinRef2, pinRef3];
  const confirmPinRefs = [confirmPinRef0, confirmPinRef1, confirmPinRef2, confirmPinRef3];

  useEffect(() => {
    // Get current user ID
    const loadInvitations = async () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          const userInvitations = await getStaffInvitationsAsync(user.id);
          setInvitations(userInvitations);

          // If only one invitation, auto-select it
          if (userInvitations.length === 1) {
            setSelectedInvitation(userInvitations[0]);
            setStep("pin");
          }
        } catch {
          // Ignore
        }
      }
    };
    loadInvitations();
  }, []);

  const handlePinChange = (index: number, value: string, isPinConfirm: boolean = false) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newPin = isPinConfirm ? [...confirmPin] : [...pin];
    newPin[index] = value.slice(-1); // Only keep last digit

    if (isPinConfirm) {
      setConfirmPin(newPin);
    } else {
      setPin(newPin);
    }

    setError("");

    // Auto-focus next input
    if (value && index < 3) {
      const refs = isPinConfirm ? confirmPinRefs : pinRefs;
      refs[index + 1].current?.focus();
    }

    // Auto-advance to confirm step when PIN is complete
    if (!isPinConfirm && index === 3 && value) {
      setTimeout(() => {
        setStep("confirm");
        confirmPinRefs[0].current?.focus();
      }, 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent, isPinConfirm: boolean = false) => {
    if (e.key === "Backspace") {
      const currentPin = isPinConfirm ? confirmPin : pin;
      const refs = isPinConfirm ? confirmPinRefs : pinRefs;

      if (!currentPin[index] && index > 0) {
        refs[index - 1].current?.focus();
      }
    }
  };

  const handleSelectInvitation = (invitation: StaffInvitation) => {
    setSelectedInvitation(invitation);
    setStep("pin");
    setTimeout(() => pinRefs[0].current?.focus(), 100);
  };

  const handleDecline = async (invitationId: string) => {
    if (confirm("Are you sure you want to decline this invitation?")) {
      await declineInvitation(invitationId);
      setInvitations(invitations.filter(i => i.id !== invitationId));
      toast.info("Invitation declined");

      if (invitations.length === 1) {
        router.push("/dashboard");
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedInvitation) return;

    const pinValue = pin.join("");
    const confirmPinValue = confirmPin.join("");

    if (pinValue.length !== 4) {
      setError("Please enter a 4-digit PIN");
      return;
    }

    if (pinValue !== confirmPinValue) {
      setError("PINs do not match");
      setConfirmPin(["", "", "", ""]);
      confirmPinRefs[0].current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await acceptInvitation(selectedInvitation.id, pinValue);

      if (result.success) {
        toast.success("PIN set successfully! You can now access the system.");
        router.push("/dashboard");
      } else {
        setError(result.error || "Failed to set PIN");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPinInput = (value: string[], refs: React.RefObject<HTMLInputElement | null>[], isPinConfirm: boolean = false) => (
    <div className="flex justify-center gap-3">
      {value.map((digit, index) => (
        <Input
          key={index}
          ref={refs[index]}
          type={showPin ? "text" : "password"}
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handlePinChange(index, e.target.value, isPinConfirm)}
          onKeyDown={(e) => handleKeyDown(index, e, isPinConfirm)}
          className="w-14 h-14 text-center text-2xl font-bold"
        />
      ))}
    </div>
  );

  // No invitations
  if (invitations.length === 0 && step === "select") {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No Pending Invitations</h2>
              <p className="text-muted-foreground mb-6">
                You don't have any pending staff invitations.
              </p>
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-8 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Set Up Your PIN</h1>
        <p className="text-muted-foreground mt-1">
          Create a 4-digit PIN to access the system
        </p>
      </div>

      {/* Step: Select Invitation (if multiple) */}
      {step === "select" && invitations.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Business</CardTitle>
            <CardDescription>You have multiple pending invitations. Select one to set up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{invitation.businessName}</p>
                    <p className="text-sm text-muted-foreground">
                      {ROLES.find(r => r.id === invitation.role)?.name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDecline(invitation.id)}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSelectInvitation(invitation)}
                  >
                    Accept
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step: Enter PIN */}
      {(step === "pin" || step === "confirm") && selectedInvitation && (
        <>
          {/* Invitation Info */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{selectedInvitation.businessName}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {ROLES.find(r => r.id === selectedInvitation.role)?.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {selectedInvitation.permissions.length} permissions
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PIN Entry */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                {step === "pin" ? "Create Your PIN" : "Confirm Your PIN"}
              </CardTitle>
              <CardDescription className="text-center">
                {step === "pin"
                  ? "Enter a 4-digit PIN you'll use to access the system"
                  : "Re-enter your PIN to confirm"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {step === "pin" ? (
                renderPinInput(pin, pinRefs)
              ) : (
                renderPinInput(confirmPin, confirmPinRefs, true)
              )}

              {/* Show/Hide PIN Toggle */}
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPin(!showPin)}
                  className="text-muted-foreground"
                >
                  {showPin ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide PIN
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show PIN
                    </>
                  )}
                </Button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center justify-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* Progress Indicator */}
              <div className="flex justify-center gap-2">
                <div className={`w-2 h-2 rounded-full ${step === "pin" ? "bg-primary" : "bg-muted"}`} />
                <div className={`w-2 h-2 rounded-full ${step === "confirm" ? "bg-primary" : "bg-muted"}`} />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {step === "confirm" && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setStep("pin");
                      setConfirmPin(["", "", "", ""]);
                      setError("");
                    }}
                  >
                    Back
                  </Button>
                )}
                <Button
                  className="flex-1"
                  onClick={step === "pin" ? () => setStep("confirm") : handleSubmit}
                  disabled={
                    (step === "pin" && pin.join("").length !== 4) ||
                    (step === "confirm" && (confirmPin.join("").length !== 4 || isSubmitting))
                  }
                >
                  {step === "pin" ? (
                    "Continue"
                  ) : isSubmitting ? (
                    "Setting up..."
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Complete Setup
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Permissions Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Your Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selectedInvitation.permissions.map((perm) => {
                  const permission = PERMISSIONS.find(p => p.module === perm);
                  return (
                    <Badge key={perm} variant="outline" className="text-xs">
                      {permission?.label || perm}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

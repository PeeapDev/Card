"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authService, User } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

/**
 * SSO Callback Handler
 *
 * This page handles Single Sign-On from my.peeap.com to plus.peeap.com
 *
 * Flow:
 * 1. my.peeap.com redirects to plus.peeap.com/auth/callback?token=xxx&tier=xxx
 * 2. This page decodes the token and validates user exists in shared Supabase DB
 * 3. If valid, stores token locally and redirects to dashboard/setup
 */

interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
  tier?: string;
  exp: number;
}

async function validateTokenFromMyPeeap(token: string): Promise<{ valid: boolean; user?: User }> {
  try {
    // Decode the base64 token (same format used by both apps)
    const payload: TokenPayload = JSON.parse(atob(token));

    // Check if token is expired
    if (payload.exp < Date.now()) {
      console.error("SSO: Token expired");
      return { valid: false };
    }

    // Validate user exists in shared Supabase database
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", payload.userId)
      .limit(1);

    if (error || !users || users.length === 0) {
      console.error("SSO: User not found in database", error);
      return { valid: false };
    }

    const dbUser = users[0];

    // Parse roles
    let userRoles: string[] = ["user"];
    if (dbUser.roles) {
      userRoles = dbUser.roles.split(",").map((r: string) => r.trim());
    } else if (dbUser.role) {
      userRoles = [dbUser.role];
    }

    // Determine tier
    let tier: "basic" | "business" | "business_plus" | "developer" = "basic";
    if (dbUser.tier) {
      tier = dbUser.tier;
    } else if (userRoles.includes("business_plus") || userRoles.includes("corporate")) {
      tier = "business_plus";
    } else if (userRoles.includes("business") || userRoles.includes("merchant")) {
      tier = "business";
    } else if (userRoles.includes("developer")) {
      tier = "developer";
    }

    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      phone: dbUser.phone,
      roles: userRoles,
      tier,
      businessName: dbUser.business_name || dbUser.first_name,
      kycStatus: dbUser.kyc_status,
      kycTier: dbUser.kyc_tier,
      emailVerified: dbUser.email_verified,
      createdAt: dbUser.created_at,
    };

    return { valid: true, user };
  } catch (error) {
    console.error("SSO: Token validation error", error);
    return { valid: false };
  }
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleAutoLogin = async () => {
      try {
        // Get token from URL
        const token = searchParams.get("token");
        const tier = searchParams.get("tier");
        const redirectTo = searchParams.get("redirect") || "/dashboard";

        console.log("SSO Callback - Token present:", !!token, "Tier:", tier);

        if (!token) {
          // No token - check if already authenticated
          if (authService.isAuthenticated()) {
            router.replace(redirectTo);
            return;
          }
          setStatus("error");
          setErrorMessage("No authentication token provided");
          setTimeout(() => router.replace("/auth/login"), 2000);
          return;
        }

        // Validate token against shared Supabase database
        const { valid, user } = await validateTokenFromMyPeeap(token);

        if (!valid || !user) {
          setStatus("error");
          setErrorMessage("Invalid or expired token. Please login again.");
          setTimeout(() => router.replace("/auth/login"), 2000);
          return;
        }

        console.log("SSO: User validated:", user.email, "Tier:", user.tier);

        // Helper to set cookie
        const setCookie = (name: string, value: string, days: number) => {
          const expires = new Date();
          expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
          const secure = window.location.protocol === 'https:' ? 'secure;' : '';
          document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;${secure}SameSite=Lax`;
        };

        // Store tokens using Plus's token key
        authService.setTokens({
          accessToken: token,
          refreshToken: token, // Same token for now
          expiresIn: 3600 * 24 * 7, // 7 days
        });

        // Store user data
        try {
          localStorage.setItem("user", JSON.stringify(user));
        } catch {}

        // Store tier - use URL tier param or user's actual tier
        const userTier = tier || user.tier || "basic";
        try {
          localStorage.setItem("plusTier", userTier);
        } catch {}

        // Set tier and setup cookies for dashboard auth
        setCookie("plusTier", userTier, 365);

        setStatus("success");

        // Helper to get cookie value
        const getCookie = (name: string): string | null => {
          const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
          return match ? decodeURIComponent(match[1]) : null;
        };

        // Check if setup is needed for business tiers
        // Also check the database for setup completion status
        let setupComplete = getCookie("plusSetupComplete") === "true" || localStorage.getItem("plusSetupComplete") === "true";
        console.log("SSO Callback: Initial setupComplete from cookie/localStorage:", setupComplete);

        if (!setupComplete) {
          // Double-check with database
          console.log("SSO Callback: Checking database for subscription...");
          try {
            const { data: subscription, error: subError } = await supabase
              .from("merchant_subscriptions")
              .select("id, status, tier")
              .eq("user_id", user.id)
              .single();

            if (subError) {
              console.log("SSO Callback: Subscription query error:", subError.message);
            }

            if (subscription) {
              // User has a subscription, so setup was completed
              console.log("SSO Callback: Found subscription in database:", subscription);
              setupComplete = true;

              // Set cookies using our helper
              setCookie("plusSetupComplete", "true", 365);
              setCookie("plusTier", subscription.tier || userTier, 365);
              setCookie("plusSubscriptionStatus", subscription.status || "active", 365);

              // Also set localStorage as backup
              try {
                localStorage.setItem("plusSetupComplete", "true");
                localStorage.setItem("plusTier", subscription.tier || userTier);
                localStorage.setItem("plusSubscriptionStatus", subscription.status || "active");
              } catch {}
            }
          } catch (e) {
            // No subscription found, continue with setup check
            console.log("SSO Callback: No subscription found, checking if setup needed");
          }
        }

        console.log("SSO Callback: Final setupComplete:", setupComplete, "userTier:", userTier);

        if ((userTier === "business" || userTier === "business_plus") && !setupComplete) {
          console.log("SSO Callback: Redirecting to setup wizard");
          router.replace(`/setup?tier=${userTier}`);
        } else {
          console.log("SSO Callback: Redirecting to:", redirectTo);
          router.replace(redirectTo);
        }
      } catch (error) {
        console.error("SSO Auto-login error:", error);
        setStatus("error");
        setErrorMessage("Authentication failed. Please try again.");
        setTimeout(() => router.replace("/auth/login"), 2000);
      }
    };

    handleAutoLogin();
  }, [router, searchParams]);

  return (
    <div className="text-center">
      {status === "loading" && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Signing you in...</h1>
          <p className="text-muted-foreground">Please wait while we set up your account</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-2">Welcome to PeeAP Plus!</h1>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-2">Authentication Failed</h1>
          <p className="text-muted-foreground">{errorMessage}</p>
          <p className="text-sm text-muted-foreground mt-2">Redirecting to login...</p>
        </>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
      <h1 className="text-xl font-semibold mb-2">Loading...</h1>
      <p className="text-muted-foreground">Please wait</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Suspense fallback={<LoadingFallback />}>
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}

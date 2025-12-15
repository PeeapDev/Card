"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

/**
 * SSO Authentication Page - Like Google OAuth
 *
 * This page handles SSO from my.peeap.com to plus.peeap.com
 * Sessions persist for 30 days (like Google OAuth)
 *
 * Flow:
 * 1. Receive token from URL: /auth/sso?token=xxx
 * 2. Validate token in sso_tokens table
 * 3. Fetch user from users table
 * 4. Check if user has existing subscription
 * 5. Create long-lived session (30 days)
 * 6. Set all required cookies
 * 7. Redirect to dashboard or setup
 */

interface SsoToken {
  id: string;
  user_id: string;
  token: string;
  target_app: string;
  tier?: string;
  redirect_path?: string;
  expires_at: string;
  used_at?: string;
}

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  roles?: string;
  tier?: string;
  business_name?: string;
}

interface Subscription {
  id: string;
  tier: string;
  status: string;
  preferences?: Record<string, unknown>;
}

// Generate a random session token
function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Set a cookie with proper flags (like Google OAuth)
function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  const secure = window.location.protocol === 'https:' ? 'Secure;' : '';
  // Set cookie with proper attributes for cross-site if needed
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;${secure}SameSite=Lax`;
}

// Get a cookie value
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function handleSsoAuthentication(token: string): Promise<{
  success: boolean;
  user?: User;
  subscription?: Subscription;
  tier?: string;
  redirectPath?: string;
  sessionToken?: string;
  hasSubscription: boolean;
  error?: string;
}> {
  try {
    console.log("SSO: Starting authentication with token");

    // Step 1: Find and validate the SSO token
    const { data: tokens, error: findError } = await supabase
      .from("sso_tokens")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .limit(1);

    if (findError) {
      console.error("SSO: Database error finding token:", findError);
      return { success: false, hasSubscription: false, error: "Database error" };
    }

    if (!tokens || tokens.length === 0) {
      console.log("SSO: Token not found or already used");
      return { success: false, hasSubscription: false, error: "Invalid or already used token" };
    }

    const ssoToken = tokens[0] as SsoToken;

    // Step 2: Check if token is expired
    if (new Date(ssoToken.expires_at) < new Date()) {
      console.log("SSO: Token expired");
      return { success: false, hasSubscription: false, error: "Token has expired" };
    }

    // Step 3: Fetch the user from database
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, phone, roles, tier, business_name")
      .eq("id", ssoToken.user_id)
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error("SSO: User not found:", userError);
      return { success: false, hasSubscription: false, error: "User not found" };
    }

    const user = users[0] as User;
    console.log("SSO: Found user:", user.email);

    // Step 4: Mark SSO token as used (one-time use like OAuth authorization code)
    await supabase
      .from("sso_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", ssoToken.id);

    // Step 5: Check for existing subscription
    let subscription: Subscription | undefined;
    let hasSubscription = false;

    const { data: subscriptions, error: subError } = await supabase
      .from("merchant_subscriptions")
      .select("id, tier, status, preferences")
      .eq("user_id", user.id)
      .limit(1);

    if (!subError && subscriptions && subscriptions.length > 0) {
      subscription = subscriptions[0] as Subscription;
      hasSubscription = true;
      console.log("SSO: Found existing subscription:", subscription.tier, subscription.status);
    } else {
      console.log("SSO: No existing subscription found");
    }

    // Step 6: Create a long-lived session in the database (30 days like Google)
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { error: sessionError } = await supabase
      .from("user_sessions")
      .upsert({
        user_id: user.id,
        session_token: sessionToken,
        app: "plus",
        tier: ssoToken.tier || subscription?.tier || user.tier || "business",
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id,app' });

    if (sessionError) {
      console.log("SSO: Session upsert error (may not have unique constraint):", sessionError.message);
      // Try insert instead
      await supabase.from("user_sessions").insert({
        user_id: user.id,
        session_token: sessionToken,
        app: "plus",
        tier: ssoToken.tier || subscription?.tier || user.tier || "business",
        expires_at: expiresAt.toISOString(),
      });
    }

    console.log("SSO: Session created successfully");

    return {
      success: true,
      user,
      subscription,
      tier: ssoToken.tier || subscription?.tier || user.tier,
      redirectPath: ssoToken.redirect_path,
      sessionToken,
      hasSubscription,
    };
  } catch (error) {
    console.error("SSO: Unexpected error:", error);
    return { success: false, hasSubscription: false, error: "Authentication failed" };
  }
}

function SsoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const processSSO = async () => {
      // Check if already authenticated
      const existingToken = getCookie("plus_token");
      const existingSession = getCookie("plus_session");

      if (existingToken || existingSession) {
        console.log("SSO: Already authenticated, redirecting to dashboard");
        router.replace("/dashboard");
        return;
      }

      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setErrorMessage("No SSO token provided");
        setTimeout(() => router.replace("/auth/login"), 2000);
        return;
      }

      // Process the SSO authentication
      const result = await handleSsoAuthentication(token);

      if (!result.success || !result.user || !result.sessionToken) {
        setStatus("error");
        setErrorMessage(result.error || "Authentication failed");
        setTimeout(() => router.replace("/auth/login"), 2000);
        return;
      }

      // ============================================
      // SET ALL COOKIES (30 days like Google OAuth)
      // ============================================
      const COOKIE_DAYS = 30;

      // 1. Session cookie (database-backed)
      setCookie("plus_session", result.sessionToken, COOKIE_DAYS);

      // 2. Access token (JWT-like for quick auth checks)
      const tokenPayload = {
        userId: result.user.id,
        email: result.user.email,
        roles: result.user.roles || 'merchant',
        tier: result.tier || 'business',
        exp: Date.now() + COOKIE_DAYS * 24 * 60 * 60 * 1000,
      };
      const plusToken = btoa(JSON.stringify(tokenPayload));
      setCookie("plus_token", plusToken, COOKIE_DAYS);
      setCookie("plus_refresh_token", result.sessionToken, COOKIE_DAYS);

      // 3. Tier cookie
      setCookie("plusTier", result.tier || "business", COOKIE_DAYS);

      // 4. Setup complete cookie - ONLY if user has subscription
      if (result.hasSubscription) {
        setCookie("plusSetupComplete", "true", COOKIE_DAYS);
      }

      // ============================================
      // SET LOCALSTORAGE (backup)
      // ============================================
      try {
        localStorage.setItem("user", JSON.stringify({
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          businessName: result.user.business_name,
          tier: result.tier,
        }));
        localStorage.setItem("plusTier", result.tier || "business");
        if (result.hasSubscription) {
          localStorage.setItem("plusSetupComplete", "true");
          localStorage.setItem("plusSubscriptionStatus", result.subscription?.status || "active");
        }
      } catch (e) {
        console.log("SSO: localStorage not available");
      }

      setStatus("success");

      // Determine where to redirect
      let redirectPath: string;
      if (result.hasSubscription) {
        // User has subscription, go to dashboard
        redirectPath = "/dashboard";
        console.log("SSO: User has subscription, redirecting to dashboard");
      } else {
        // No subscription, go to setup wizard
        redirectPath = result.redirectPath || `/setup?tier=${result.tier || 'business'}`;
        console.log("SSO: No subscription, redirecting to setup:", redirectPath);
      }

      // Redirect after a short delay to show success message
      setTimeout(() => router.replace(redirectPath), 1000);
    };

    processSSO();
  }, [router, searchParams]);

  return (
    <div className="text-center">
      {status === "loading" && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2 text-gray-900">Signing you in...</h1>
          <p className="text-gray-500">Validating your credentials</p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2 text-gray-900">Welcome to PeeAP Plus!</h1>
          <p className="text-gray-500">Redirecting to your dashboard...</p>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2 text-gray-900">Authentication Failed</h1>
          <p className="text-red-600 mb-2">{errorMessage}</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
      <h1 className="text-xl font-semibold mb-2 text-gray-900">Loading...</h1>
    </div>
  );
}

export default function SsoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <Suspense fallback={<LoadingFallback />}>
          <SsoContent />
        </Suspense>
      </div>
    </div>
  );
}

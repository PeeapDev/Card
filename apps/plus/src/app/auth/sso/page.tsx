"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

/**
 * SSO Authentication Page - Database-backed sessions (NO localStorage)
 *
 * Flow:
 * 1. Receive token from URL: /auth/sso?token=xxx
 * 2. Look up token in sso_tokens table
 * 3. Validate token (exists, not expired, not used)
 * 4. Fetch user from users table
 * 5. Mark SSO token as used
 * 6. Create session in user_sessions table
 * 7. Set session cookie and redirect
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
  created_at: string;
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

// Generate a random session token
function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Set a cookie
function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

async function validateAndConsumeSsoToken(token: string): Promise<{
  success: boolean;
  user?: User;
  tier?: string;
  redirectPath?: string;
  sessionToken?: string;
  error?: string;
}> {
  try {
    // Step 1: Find the SSO token in the database
    const { data: tokens, error: findError } = await supabase
      .from("sso_tokens")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .limit(1);

    if (findError) {
      console.error("SSO: Database error finding token:", findError);
      return { success: false, error: "Database error" };
    }

    if (!tokens || tokens.length === 0) {
      return { success: false, error: "Invalid or already used token" };
    }

    const ssoToken = tokens[0] as SsoToken;

    // Step 2: Check if token is expired
    if (new Date(ssoToken.expires_at) < new Date()) {
      return { success: false, error: "Token has expired" };
    }

    // Step 3: Fetch the user from the database
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, phone, roles, tier, business_name")
      .eq("id", ssoToken.user_id)
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error("SSO: User not found:", userError);
      return { success: false, error: "User not found" };
    }

    const user = users[0] as User;

    // Step 4: Mark SSO token as used (one-time use)
    await supabase
      .from("sso_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", ssoToken.id);

    // Step 5: Create a session in the database
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { error: sessionError } = await supabase
      .from("user_sessions")
      .insert({
        user_id: ssoToken.user_id,
        session_token: sessionToken,
        app: "plus",
        tier: ssoToken.tier || user.tier || "basic",
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) {
      console.error("SSO: Failed to create session:", sessionError);
      return { success: false, error: "Failed to create session" };
    }

    return {
      success: true,
      user,
      tier: ssoToken.tier,
      redirectPath: ssoToken.redirect_path,
      sessionToken,
    };
  } catch (error) {
    console.error("SSO: Unexpected error:", error);
    return { success: false, error: "Authentication failed" };
  }
}

function SsoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleSso = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setErrorMessage("No SSO token provided");
        setTimeout(() => router.replace("/auth/login"), 2000);
        return;
      }

      // Validate and consume the SSO token
      const result = await validateAndConsumeSsoToken(token);

      if (!result.success || !result.user || !result.sessionToken) {
        setStatus("error");
        setErrorMessage(result.error || "Authentication failed");
        setTimeout(() => router.replace("/auth/login"), 2000);
        return;
      }

      // Set session cookie (NOT localStorage)
      setCookie("plus_session", result.sessionToken, 7);

      // Also set plus_token cookie that dashboard auth expects
      // Create a simple JWT-like token with user info
      const tokenPayload = {
        userId: result.user.id,
        email: result.user.email,
        roles: result.user.roles || 'merchant',
        tier: result.tier || result.user.tier || 'business',
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };
      const plusToken = btoa(JSON.stringify(tokenPayload));
      setCookie("plus_token", plusToken, 7);
      setCookie("plus_refresh_token", result.sessionToken, 7);

      // Also set setup complete and tier cookies
      setCookie("plusSetupComplete", "true", 365);
      setCookie("plusTier", result.tier || result.user.tier || "business", 365);

      // Store user data in localStorage for dashboard use (backup)
      try {
        localStorage.setItem("user", JSON.stringify({
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          businessName: result.user.business_name,
          tier: result.tier || result.user.tier,
        }));
        localStorage.setItem("plusTier", result.tier || result.user.tier || "business");
        localStorage.setItem("plusSetupComplete", "true");
      } catch {}

      setStatus("success");

      // Redirect to the intended destination
      const redirectPath = result.redirectPath || "/dashboard";
      setTimeout(() => router.replace(redirectPath), 1000);
    };

    handleSso();
  }, [router, searchParams]);

  return (
    <div className="text-center">
      {status === "loading" && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Signing you in...</h1>
          <p className="text-muted-foreground">Validating your credentials</p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Welcome to PeeAP Plus!</h1>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
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
    </div>
  );
}

export default function SsoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <Suspense fallback={<LoadingFallback />}>
          <SsoContent />
        </Suspense>
      </div>
    </div>
  );
}

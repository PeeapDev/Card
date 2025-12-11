"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/lib/auth";
import { Loader2 } from "lucide-react";

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

        // Validate and use the token
        const { valid, user } = await authService.validateToken(token);

        if (!valid || !user) {
          setStatus("error");
          setErrorMessage("Invalid or expired token");
          setTimeout(() => router.replace("/auth/login"), 2000);
          return;
        }

        // Store tokens
        authService.setTokens({
          accessToken: token,
          refreshToken: token, // In production, this should be a separate refresh token
          expiresIn: 3600,
        });

        // Store user data
        localStorage.setItem("user", JSON.stringify(user));

        // Store tier
        const userTier = tier || user.tier || "basic";
        localStorage.setItem("plusTier", userTier);

        setStatus("success");

        // Check if setup is needed for business tiers
        const setupComplete = localStorage.getItem("plusSetupComplete");
        if ((userTier === "business" || userTier === "business_plus") && !setupComplete) {
          router.replace(`/setup?tier=${userTier}`);
        } else {
          router.replace(redirectTo);
        }
      } catch (error) {
        console.error("Auto-login error:", error);
        setStatus("error");
        setErrorMessage("Authentication failed");
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

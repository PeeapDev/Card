"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";
import { authService } from "@/lib/auth";

// Helper to get cookie
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if already authenticated via token or session
    const token = authService.getAccessToken();
    const sessionToken = getCookie("plus_session");

    if (token || sessionToken) {
      console.log("Login: Already authenticated, redirecting to", redirect);
      router.replace(redirect);
    } else {
      setChecking(false);
    }
  }, [router, redirect]);

  const handleLoginViaPeeAP = () => {
    // Redirect to my.peeap.com merchant upgrade page which handles SSO
    // The upgrade page will generate an SSO token and redirect back to Plus
    const redirectPath = encodeURIComponent(redirect);
    window.location.href = `https://my.peeap.com/merchant/upgrade?redirect_plus=${redirectPath}`;
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-white/60">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <span className="text-white font-bold text-xl">P+</span>
            </div>
            <span className="font-bold text-3xl text-white">PeeAP Plus</span>
          </div>
          <p className="text-white/60 mt-2">Business Dashboard</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Welcome to PeeAP Plus</CardTitle>
            <CardDescription className="text-base">
              Sign in with your PeeAP account to access your business dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
              <p className="text-sm text-gray-600 text-center">
                PeeAP Plus uses your existing PeeAP account for secure single sign-on authentication.
              </p>
            </div>

            <Button
              onClick={handleLoginViaPeeAP}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25 py-6 text-lg"
            >
              Sign in with PeeAP
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-xs text-center text-gray-500">
              Don&apos;t have a PeeAP account?{" "}
              <a
                href="https://my.peeap.com/register"
                className="text-purple-600 hover:underline font-medium"
              >
                Create one at my.peeap.com
              </a>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-white/40 text-xs mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

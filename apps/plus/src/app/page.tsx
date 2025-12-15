"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authService } from "@/lib/auth";

/**
 * Homepage - redirects to dashboard (if authenticated) or login (if not)
 * plus.peeap.com has no landing page - it's a business dashboard app
 * All marketing/pricing is handled on my.peeap.com
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const isAuthenticated = authService.isAuthenticated();

    if (isAuthenticated) {
      // User is logged in - go to dashboard
      router.replace("/dashboard");
    } else {
      // User is not logged in - go to login
      router.replace("/auth/login");
    }
  }, [router]);

  // Show loading state while checking auth
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
        <span className="text-white font-bold text-lg">P+</span>
      </div>
      <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
      <p className="text-muted-foreground text-sm">Loading PeeAP Plus...</p>
    </div>
  );
}
// Trigger Mon Dec 15 19:38:17 GMT 2025

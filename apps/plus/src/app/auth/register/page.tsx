"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  useEffect(() => {
    // Redirect to my.peeap.com registration
    const returnUrl = encodeURIComponent(`${window.location.origin}/auth/callback`);
    window.location.href = `https://my.peeap.com/register?redirect=${returnUrl}&source=plus`;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-purple-400 mx-auto mb-4" />
        <p className="text-white/60">Redirecting to PeeAP registration...</p>
      </div>
    </div>
  );
}

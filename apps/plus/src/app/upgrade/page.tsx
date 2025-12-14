"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

/**
 * Upgrade page - redirects to my.peeap.com for pricing/upgrade management
 * All pricing and tier management is handled on my.peeap.com
 */
function UpgradeContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get any query params to pass along
    const tier = searchParams.get("tier");
    const redirectUrl = tier
      ? `https://my.peeap.com/plus/upgrade?tier=${tier}`
      : "https://my.peeap.com/plus/upgrade";

    // Redirect to my.peeap.com for upgrade/pricing
    window.location.href = redirectUrl;
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Redirecting to my.peeap.com...</p>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <UpgradeContent />
    </Suspense>
  );
}

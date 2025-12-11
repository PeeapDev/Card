"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Shield,
  Users,
  Sparkles,
} from "lucide-react";

const PEEAP_REGISTER_URL = "https://my.peeap.com/register";
const PEEAP_MERCHANT_URL = "https://my.peeap.com/merchant";

export default function RegisterPage() {
  const handleCreateAccount = () => {
    // Redirect to my.peeap.com registration with return URL
    const returnUrl = encodeURIComponent(`${window.location.origin}/upgrade`);
    window.location.href = `${PEEAP_REGISTER_URL}?redirect=${returnUrl}&source=plus`;
  };

  const handleExistingMerchant = () => {
    // Redirect to merchant upgrade page
    const returnUrl = encodeURIComponent(`${window.location.origin}/upgrade`);
    window.location.href = `${PEEAP_MERCHANT_URL}/upgrade?redirect=${returnUrl}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P+</span>
            </div>
            <span className="font-bold text-2xl">PeeAP Plus</span>
          </Link>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Get Started with PeeAP Plus</CardTitle>
            <CardDescription className="text-base">
              PeeAP Plus is the premium business platform for PeeAP merchants
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            {/* Benefits */}
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Use Your Existing PeeAP Account</p>
                  <p className="text-sm text-muted-foreground">
                    Sign up once at my.peeap.com and access all PeeAP services
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">You Become the Business Owner</p>
                  <p className="text-sm text-muted-foreground">
                    Full admin rights to manage your team and business settings
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Add Team Members Later</p>
                  <p className="text-sm text-muted-foreground">
                    Invite staff and assign roles after your account is set up
                  </p>
                </div>
              </div>
            </div>

            {/* How it works */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-center mb-4">How it works</p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">1</span>
                  Create account
                </span>
                <ArrowRight className="w-4 h-4" />
                <span className="flex items-center gap-1">
                  <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">2</span>
                  Choose plan
                </span>
                <ArrowRight className="w-4 h-4" />
                <span className="flex items-center gap-1">
                  <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">3</span>
                  Setup Plus
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              onClick={handleCreateAccount}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Create PeeAP Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  Already have an account?
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <Link href="/auth/login" className="w-full">
                <Button variant="outline" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Button variant="outline" onClick={handleExistingMerchant}>
                Upgrade Existing
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground pt-2">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
            </p>
          </CardFooter>
        </Card>

        {/* Info box */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
            <a href="mailto:support@peeap.com" className="text-primary hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Basic",
    price: "Free",
    description: "For small businesses just getting started",
    features: [
      "Checkout links",
      "QR code payments",
      "Single wallet",
      "Mobile money payouts",
      "Basic transaction history",
      "Email support",
    ],
    cta: "Get Started",
    href: "/auth/register?tier=basic",
    popular: false,
  },
  {
    name: "Business",
    price: "SLE 150,000",
    period: "/month",
    description: "For growing businesses that need more tools",
    features: [
      "Everything in Basic",
      "Invoice generator",
      "Recurring payments",
      "Subscription links",
      "Basic API access",
      "Webhook notifications",
      "90-day transaction history",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "/auth/register?tier=business",
    popular: true,
  },
  {
    name: "Business++",
    price: "SLE 500,000",
    period: "/month",
    description: "For enterprises needing full control",
    features: [
      "Everything in Business",
      "Issue employee cards",
      "Spending controls & limits",
      "Real-time authorization webhooks",
      "Expense management",
      "Multi-user access",
      "Department budgets",
      "Advanced analytics",
      "Unlimited transaction history",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    href: "/auth/register?tier=business_plus",
    popular: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P+</span>
            </div>
            <span className="font-bold text-xl">PeeAP Plus</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/developers" className="text-sm text-muted-foreground hover:text-foreground">
              Developers
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">
          Now available in Sierra Leone
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Payment infrastructure
          <br />
          <span className="text-primary">for modern businesses</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Accept payments, send invoices, manage subscriptions, and issue programmable cards.
          Everything you need to run your business finances.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/register">
            <Button size="lg" className="h-12 px-8">
              Start for Free
            </Button>
          </Link>
          <Link href="#pricing">
            <Button size="lg" variant="outline" className="h-12 px-8">
              View Pricing
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
          <p className="text-muted-foreground">Powerful tools to manage your business payments</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            title="Accept Payments"
            description="Checkout links, QR codes, and mobile money. Accept payments from anywhere."
            icon="💳"
          />
          <FeatureCard
            title="Send Invoices"
            description="Create professional invoices and get paid faster with online payments."
            icon="📄"
          />
          <FeatureCard
            title="Recurring Billing"
            description="Set up subscriptions and let payments collect automatically."
            icon="🔄"
          />
          <FeatureCard
            title="Issue Cards"
            description="Virtual and physical cards for employees with spending controls."
            icon="💎"
          />
          <FeatureCard
            title="Expense Management"
            description="Track spending, set budgets, and manage expenses in real-time."
            icon="📊"
          />
          <FeatureCard
            title="API & Webhooks"
            description="Integrate payments into your systems with our developer-friendly API."
            icon="⚡"
          />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-muted-foreground">Choose the plan that fits your business</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative ${tier.popular ? "border-primary shadow-lg scale-105" : ""}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="pt-4">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  {tier.period && (
                    <span className="text-muted-foreground">{tier.period}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link href={tier.href} className="w-full">
                  <Button
                    className="w-full"
                    variant={tier.popular ? "default" : "outline"}
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* Developer Section */}
      <section className="bg-gray-900 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              For Developers
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Build with PeeAP</h2>
            <p className="text-gray-400 mb-8">
              Full API access, SDKs, webhooks, and sandbox environment.
              Build payment experiences your users will love.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/developers">
                <Button size="lg" variant="secondary">
                  View Documentation
                </Button>
              </Link>
              <Link href="/auth/register?type=developer">
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                  Create Developer Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P+</span>
                </div>
                <span className="font-bold">PeeAP Plus</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Payment infrastructure for modern businesses in Sierra Leone.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features">Features</Link></li>
                <li><Link href="#pricing">Pricing</Link></li>
                <li><Link href="/developers">Developers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about">About</Link></li>
                <li><Link href="/contact">Contact</Link></li>
                <li><Link href="/careers">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} PeeAP. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Card className="text-center">
      <CardHeader>
        <div className="text-4xl mb-2">{icon}</div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

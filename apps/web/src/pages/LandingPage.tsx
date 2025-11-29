import { Link } from 'react-router-dom';
import {
  CreditCard,
  Shield,
  Zap,
  Globe,
  ArrowRight,
  CheckCircle,
  Wallet,
  Lock,
  BarChart3,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui';

export function LandingPage() {
  const features = [
    {
      icon: Wallet,
      title: 'Digital Wallets',
      description: 'Create and manage multiple digital wallets with real-time balance tracking and instant transfers.',
    },
    {
      icon: CreditCard,
      title: 'Virtual & Physical Cards',
      description: 'Issue virtual cards instantly or request physical cards. Full control over spending limits.',
    },
    {
      icon: Shield,
      title: 'Bank-Grade Security',
      description: 'Enterprise-level encryption, fraud detection, and compliance with financial regulations.',
    },
    {
      icon: Zap,
      title: 'Instant Transactions',
      description: 'Process payments in milliseconds with our high-performance transaction engine.',
    },
    {
      icon: Globe,
      title: 'Multi-Currency Support',
      description: 'Support for multiple currencies with competitive exchange rates.',
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      description: 'Track spending patterns, generate reports, and gain insights into your finances.',
    },
  ];

  const benefits = [
    'No hidden fees',
    'Instant card issuance',
    '24/7 customer support',
    'Mobile-first experience',
    'API access for developers',
    'Regulatory compliant',
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-primary-600">PaymentSystem</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
              <a href="/api/docs" target="_blank" className="text-gray-600 hover:text-gray-900">API Docs</a>
              <Link to="/login" className="text-gray-600 hover:text-gray-900">Sign In</Link>
              <Link to="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Modern Payment
              <span className="text-primary-600"> Infrastructure</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Build and scale your payment solutions with our powerful closed-loop card system.
              Issue cards, manage wallets, and process transactions seamlessly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="/api/docs" target="_blank">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  View API Docs
                </Button>
              </a>
            </div>
          </div>

          {/* Hero Image/Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl shadow-2xl p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
                  <Wallet className="w-8 h-8 mb-4" />
                  <p className="text-3xl font-bold">$2.5M+</p>
                  <p className="text-white/80">Processed Daily</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
                  <Users className="w-8 h-8 mb-4" />
                  <p className="text-3xl font-bold">50K+</p>
                  <p className="text-white/80">Active Users</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
                  <CreditCard className="w-8 h-8 mb-4" />
                  <p className="text-3xl font-bold">100K+</p>
                  <p className="text-white/80">Cards Issued</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A complete payment infrastructure with all the features you need to manage digital payments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why Choose PaymentSystem?
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                We provide a robust, secure, and scalable payment infrastructure that grows with your business.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-100 rounded-2xl p-8">
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Transaction Speed</span>
                    <span className="text-sm font-medium text-primary-600">99.9%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div className="h-2 bg-primary-600 rounded-full" style={{ width: '99.9%' }}></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Uptime SLA</span>
                    <span className="text-sm font-medium text-green-600">99.99%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div className="h-2 bg-green-600 rounded-full" style={{ width: '99.99%' }}></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Customer Satisfaction</span>
                    <span className="text-sm font-medium text-blue-600">98%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div className="h-2 bg-blue-600 rounded-full" style={{ width: '98%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* API Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Developer-First API
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Integrate our payment system into your application with our RESTful API.
            </p>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 overflow-x-auto">
            <pre className="text-sm text-gray-300">
{`// Create a new card
const response = await fetch('/api/v1/cards', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + accessToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    walletId: 'wallet_123',
    type: 'VIRTUAL',
    cardholderName: 'John Doe',
    dailyLimit: 1000
  })
});

const card = await response.json();
// { id: 'card_456', maskedNumber: '****1234', status: 'ACTIVE' }`}
            </pre>
          </div>

          <div className="text-center mt-8">
            <a href="/api/docs" target="_blank">
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900">
                Explore Full API Documentation
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Create your account today and start processing payments in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg">
                Create Free Account
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#features" className="hover:text-gray-900">Features</a></li>
                <li><a href="#pricing" className="hover:text-gray-900">Pricing</a></li>
                <li><a href="/api/docs" className="hover:text-gray-900">API Docs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-gray-900">About</a></li>
                <li><a href="#" className="hover:text-gray-900">Blog</a></li>
                <li><a href="#" className="hover:text-gray-900">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Privacy</a></li>
                <li><a href="#" className="hover:text-gray-900">Terms</a></li>
                <li><a href="#" className="hover:text-gray-900">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Help Center</a></li>
                <li><a href="#" className="hover:text-gray-900">Contact</a></li>
                <li><a href="#" className="hover:text-gray-900">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-500">
            <p>&copy; 2024 PaymentSystem. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

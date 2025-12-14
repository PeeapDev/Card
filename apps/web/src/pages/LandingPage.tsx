import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Shield,
  Zap,
  Globe,
  ArrowRight,
  CheckCircle,
  Smartphone,
  QrCode,
  TrendingUp,
  Code,
  Calculator,
  Sparkles,
  Play,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';

interface FeeConfig {
  name: string;
  description: string;
  category: string;
  user_type: string;
  fee_type: string;
  fee_value: number;
  min_fee: number | null;
  max_fee: number | null;
}

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 }
};

const slideInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0 }
};

const slideInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 }
};

// Floating animation for cards
const floatingAnimation = {
  y: [-10, 10, -10],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

// Counter animation hook
function useCounter(end: number, duration: number = 2000, startCounting: boolean = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!startCounting) return;

    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration, startCounting]);

  return count;
}

// Animated counter component
function AnimatedCounter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const count = useCounter(value, 2000, isInView);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

export function LandingPage() {
  const [amount, setAmount] = useState<number>(50); // New Leone (SLE) after redenomination
  const [fees, setFees] = useState<FeeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 50]);

  useEffect(() => {
    fetchFees();

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchFees = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_configs')
        .select('*')
        .eq('is_active', true);

      if (!error && data) {
        setFees(data);
      }
    } catch (err) {
      console.error('Error fetching fees:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateFee = (amount: number, feeConfig: FeeConfig | undefined): number => {
    if (!feeConfig) return 0;

    let fee = 0;
    if (feeConfig.fee_type === 'percentage') {
      fee = (amount * feeConfig.fee_value) / 100;
    } else {
      fee = feeConfig.fee_value;
    }

    if (feeConfig.min_fee !== null && fee < feeConfig.min_fee) {
      fee = feeConfig.min_fee;
    }
    if (feeConfig.max_fee !== null && fee > feeConfig.max_fee) {
      fee = feeConfig.max_fee;
    }

    return fee;
  };

  const getMerchantProcessingFee = () => {
    return fees.find(f => f.name === 'Payment Processing Fee' && f.category === 'merchant');
  };

  const processingFee = getMerchantProcessingFee();
  const calculatedFee = calculateFee(amount, processingFee);
  const netAmount = amount - calculatedFee;

  const features = [
    {
      icon: Smartphone,
      title: 'Mobile Money',
      description: 'Accept Orange Money, Africell Money and more through our Monime integration.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: CreditCard,
      title: 'Peeap Cards',
      description: 'Accept payments from Peeap prepaid cardholders - instant settlement.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: QrCode,
      title: 'QR Code Payments',
      description: 'Generate QR codes for in-store payments. Customers scan with Peeap app.',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description: 'Bank-grade encryption, fraud detection, and regulatory compliance built-in.',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: Code,
      title: 'Simple Integration',
      description: 'Add payments to your site with just a few lines of code. Full API docs available.',
      gradient: 'from-indigo-500 to-violet-500',
    },
    {
      icon: TrendingUp,
      title: 'Real-Time Dashboard',
      description: 'Track payments, view analytics, and manage your business from one place.',
      gradient: 'from-rose-500 to-red-500',
    },
  ];

  const paymentMethods = [
    {
      name: 'Mobile Money',
      providers: ['Orange Money', 'Africell Money'],
      icon: Smartphone,
      color: 'bg-gradient-to-br from-orange-400 to-orange-600',
      shadowColor: 'shadow-orange-500/30',
      delay: 0,
    },
    {
      name: 'Peeap Card',
      providers: ['Virtual Cards', 'Physical Cards'],
      icon: CreditCard,
      color: 'bg-gradient-to-br from-blue-400 to-indigo-600',
      shadowColor: 'shadow-blue-500/30',
      delay: 0.1,
    },
    {
      name: 'QR Code',
      providers: ['Peeap App Scan'],
      icon: QrCode,
      color: 'bg-gradient-to-br from-purple-400 to-purple-600',
      shadowColor: 'shadow-purple-500/30',
      delay: 0.2,
    },
  ];

  // Pricing tiers - Updated for New Leone (SLE) after redenomination
  const pricingTiers = [
    {
      name: 'Starter',
      description: 'For small businesses getting started',
      fee: '2.9% + Le 0.30',
      features: [
        'Accept all payment methods',
        'Standard payout (T+2)',
        'Basic dashboard',
        'Email support',
        'Up to Le 10,000/month',
      ],
      cta: 'Start Free',
      highlighted: false,
    },
    {
      name: 'Growth',
      description: 'For growing businesses',
      fee: '2.5% + Le 0.20',
      features: [
        'Everything in Starter',
        'Next-day payout (T+1)',
        'Advanced analytics',
        'Priority support',
        'Up to Le 100/month',
        'Webhook notifications',
      ],
      cta: 'Get Started',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      description: 'For large scale operations',
      fee: 'Custom',
      features: [
        'Everything in Growth',
        'Same-day payout',
        'Dedicated account manager',
        '24/7 phone support',
        'Unlimited volume',
        'Custom integration support',
        'SLA guarantee',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Animated Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-lg shadow-lg border-b border-gray-100'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div
              className="flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Peeap
              </span>
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="ml-2 px-2 py-0.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 text-xs font-medium rounded-full"
              >
                Business
              </motion.span>
            </motion.div>
            <div className="hidden md:flex items-center space-x-8">
              {['Features', 'Pricing', 'Calculator'].map((item, i) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="text-gray-600 hover:text-indigo-600 transition-colors relative group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 transition-all group-hover:w-full" />
                </motion.a>
              ))}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Link to="/login" className="text-gray-600 hover:text-indigo-600 transition-colors">
                  Sign In
                </Link>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to="/register">
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30">
                    Get Started
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section with Parallax */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
          {/* Floating orbs */}
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-indigo-300/30 to-purple-300/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -100, 0],
              y: [0, 50, 0],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-300/30 to-pink-300/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl"
          />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20"
        >
          <div className="text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full mb-6 shadow-lg shadow-indigo-500/10 border border-indigo-100"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-4 h-4 text-indigo-600 mr-2" />
              </motion.div>
              <span className="text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Sierra Leone's #1 Payment Gateway
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight"
            >
              Accept Payments{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Anywhere
                </span>
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 1 }}
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 10"
                  fill="none"
                >
                  <motion.path
                    d="M0 5 Q 50 0 100 5 T 200 5"
                    stroke="url(#gradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4F46E5" />
                      <stop offset="50%" stopColor="#9333EA" />
                      <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                  </defs>
                </motion.svg>
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed"
            >
              Peeap makes it easy for businesses in Sierra Leone to accept{' '}
              <span className="text-orange-500 font-semibold">Mobile Money</span>,{' '}
              <span className="text-blue-500 font-semibold">Card payments</span>, and{' '}
              <span className="text-purple-500 font-semibold">QR codes</span>.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-xl shadow-indigo-500/30 text-lg px-8 py-6">
                    Create Merchant Account
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/register?type=agent">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-lg px-8 py-6">
                    <Play className="mr-2 w-5 h-5" />
                    Watch Demo
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Payment Method Cards - Floating */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
            >
              {paymentMethods.map((method, index) => {
                const Icon = method.icon;
                return (
                  <motion.div
                    key={index}
                    variants={scaleIn}
                    animate={floatingAnimation}
                    style={{ animationDelay: `${index * 0.5}s` }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className={`bg-white rounded-2xl shadow-2xl ${method.shadowColor} border border-gray-100 p-6 cursor-pointer group`}
                  >
                    <motion.div
                      className={`w-14 h-14 ${method.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </motion.div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                      {method.name}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {method.providers.map((provider, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-lg">
                          {provider}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex flex-col items-center text-gray-400"
            >
              <span className="text-sm mb-2">Scroll to explore</span>
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.span
              className="inline-block px-4 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4"
              whileHover={{ scale: 1.05 }}
            >
              Features
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Accept Payments
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A complete payment solution designed for Sierra Leone's businesses.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  whileHover={{ y: -10, transition: { duration: 0.2 } }}
                  className="group bg-white rounded-2xl p-8 border border-gray-100 hover:border-indigo-200 hover:shadow-xl transition-all duration-300"
                >
                  <motion.div
                    className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    whileHover={{ rotate: 5 }}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Pricing Calculator Section */}
      <section id="calculator" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-indigo-50 relative overflow-hidden">
        {/* Background decoration */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-indigo-200/30 to-purple-200/30 rounded-full blur-3xl"
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-12"
          >
            <motion.span
              className="inline-block px-4 py-1 bg-white text-indigo-700 rounded-full text-sm font-medium mb-4 shadow-sm"
              whileHover={{ scale: 1.05 }}
            >
              Transparent Pricing
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Pricing Calculator
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See exactly how much you'll pay. No hidden fees, ever.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 md:p-10">
              <div className="flex items-center justify-center mb-8">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30"
                >
                  <Calculator className="w-8 h-8 text-white" />
                </motion.div>
              </div>

              {/* Amount Input */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Amount (Le)
                </label>
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-2xl font-semibold text-center transition-all"
                  placeholder="Enter amount"
                />
                {/* Quick amount buttons - New Leone (SLE) after redenomination */}
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {[10, 50, 100, 500, 1000].map((val) => (
                    <motion.button
                      key={val}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAmount(val)}
                      className={`px-4 py-2 text-sm rounded-xl border-2 transition-all font-medium ${
                        amount === val
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      Le {val.toLocaleString()}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Fee Breakdown */}
              <motion.div
                layout
                className="bg-gradient-to-br from-gray-50 to-indigo-50 rounded-2xl p-6 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment Amount</span>
                  <motion.span
                    key={amount}
                    initial={{ scale: 1.2, color: '#4F46E5' }}
                    animate={{ scale: 1, color: '#111827' }}
                    className="font-bold text-xl text-gray-900"
                  >
                    Le {amount.toLocaleString()}
                  </motion.span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-gray-600">Processing Fee</span>
                    {processingFee && (
                      <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                        {processingFee.fee_value}%
                      </span>
                    )}
                  </div>
                  <motion.span
                    key={calculatedFee}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="font-bold text-lg text-red-500"
                  >
                    - Le {calculatedFee.toLocaleString()}
                  </motion.span>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-900 font-semibold text-lg">You Receive</span>
                  <motion.span
                    key={netAmount}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent"
                  >
                    Le {netAmount.toLocaleString()}
                  </motion.span>
                </div>
              </motion.div>

              {/* Fee Details */}
              <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <h4 className="font-semibold text-indigo-900 mb-2 flex items-center">
                  <Zap className="w-4 h-4 mr-2" />
                  Current Rates
                </h4>
                <div className="text-sm text-indigo-700 space-y-1">
                  {loading ? (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Loading fees...
                    </motion.div>
                  ) : (
                    <>
                      <p>• Payment Processing: {processingFee ? `${processingFee.fee_value}%` : '2.9%'} per transaction</p>
                      <p>• Payouts: Free to your Peeap wallet</p>
                      <p>• Bank Withdrawal: 0.25% (min Le 0.25)</p>
                    </>
                  )}
                </div>
              </div>

              <motion.div
                className="mt-8"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link to="/register">
                  <Button size="lg" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-xl shadow-indigo-500/30 text-lg py-6">
                    Start Accepting Payments
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Tiers Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <motion.span
              className="inline-block px-4 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4"
            >
              Plans
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Simple, Transparent{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Pricing
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Pay only for what you use. No monthly fees, no setup costs.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -10 }}
                className={`rounded-3xl p-8 relative ${
                  tier.highlighted
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-2xl shadow-indigo-500/40 scale-105 z-10'
                    : 'bg-white border-2 border-gray-100 hover:border-indigo-200 hover:shadow-xl'
                } transition-all duration-300`}
              >
                {tier.highlighted && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-bold rounded-full shadow-lg"
                  >
                    Most Popular
                  </motion.div>
                )}
                <h3 className={`text-2xl font-bold mb-2 ${tier.highlighted ? 'text-white' : 'text-gray-900'}`}>
                  {tier.name}
                </h3>
                <p className={`text-sm mb-6 ${tier.highlighted ? 'text-indigo-200' : 'text-gray-500'}`}>
                  {tier.description}
                </p>
                <div className="mb-8">
                  <span className={`text-4xl font-bold ${tier.highlighted ? 'text-white' : 'text-gray-900'}`}>
                    {tier.fee}
                  </span>
                  {tier.fee !== 'Custom' && (
                    <span className={`text-sm ${tier.highlighted ? 'text-indigo-200' : 'text-gray-500'}`}>
                      {' '}per transaction
                    </span>
                  )}
                </div>
                <ul className="space-y-4 mb-8">
                  {tier.features.map((feature, idx) => (
                    <motion.li
                      key={idx}
                      className="flex items-start"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <CheckCircle className={`w-5 h-5 mr-3 flex-shrink-0 ${tier.highlighted ? 'text-indigo-200' : 'text-green-500'}`} />
                      <span className={tier.highlighted ? 'text-indigo-100' : 'text-gray-600'}>
                        {feature}
                      </span>
                    </motion.li>
                  ))}
                </ul>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to={tier.cta === 'Contact Sales' ? '/contact' : '/register'}>
                    <Button
                      variant={tier.highlighted ? 'outline' : 'primary'}
                      className={`w-full py-6 text-lg ${
                        tier.highlighted
                          ? 'border-2 border-white text-white hover:bg-white hover:text-indigo-600'
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30'
                      }`}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]" />
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-full blur-3xl"
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={slideInLeft}
              transition={{ duration: 0.6 }}
            >
              <motion.span
                className="inline-block px-4 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm font-medium mb-6"
              >
                Developer-Friendly
              </motion.span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Integrate in{' '}
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Minutes
                </span>
              </h2>
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                Add Peeap to your website with just a few lines of code. Works with any platform.
              </p>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                className="space-y-4"
              >
                {[
                  'Simple JavaScript SDK',
                  'REST API for custom integrations',
                  'Hosted checkout page - no code needed',
                  'Webhook notifications'
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    variants={fadeInUp}
                    className="flex items-center"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center mr-3">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-300">{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={slideInRight}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-full">
                    SDK v0
                  </span>
                </div>
                <pre className="text-sm text-gray-300 overflow-x-auto">
                  <code>{`<script src="https://checkout.peeap.com/embed/peeap-sdk.js"></script>
<script>
PeeapSDK.init({
  publicKey: 'pk_live_YOUR_KEY',
  baseUrl: 'https://api.peeap.com',
  onSuccess: function(payment) {
  }
});

// Create a payment
PeeapSDK.createPayment({
  amount: 50,  // New Leone (SLE) - 50 = Le 50.00
  currency: 'SLE',
  description: 'Order #12345'
});
</script>`}</code>
                </pre>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <motion.a
              href="/docs/SDK_INTEGRATION.md"
              target="_blank"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button variant="outline" size="lg" className="border-2 border-white/30 text-white hover:bg-white hover:text-gray-900 px-8">
                View Full Documentation
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Animated background */}
        <motion.div
          animate={{ x: [-200, 200], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent"
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            {[
              { value: 500, suffix: '+', label: 'Merchants' },
              { value: 1, prefix: 'Le ', suffix: 'B+', label: 'Processed' },
              { value: 99.9, suffix: '%', label: 'Uptime' },
              { value: 24, suffix: '/7', label: 'Support' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                className="p-6"
              >
                <motion.p
                  className="text-5xl md:text-6xl font-bold text-white mb-2"
                  initial={{ scale: 0.5 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                >
                  <AnimatedCounter value={stat.value} prefix={stat.prefix || ''} suffix={stat.suffix} />
                </motion.p>
                <p className="text-indigo-200 text-lg">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-white" />
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-100/40 to-purple-100/40 rounded-full blur-3xl"
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <motion.div
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="inline-block mb-6"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/40">
              <Zap className="w-10 h-10 text-white" />
            </div>
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Ready to Start{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Accepting Payments?
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Create your merchant account today. No setup fees, no monthly minimums.
            Start accepting payments in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/register">
                <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-xl shadow-indigo-500/30 text-lg px-10 py-6">
                  Create Free Account
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/login">
                <Button variant="outline" size="lg" className="border-2 border-gray-300 text-gray-700 hover:border-indigo-300 hover:text-indigo-600 text-lg px-10 py-6">
                  Sign In
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12"
          >
            <motion.div variants={fadeInUp} className="col-span-2">
              <div className="flex items-center mb-4">
                <span className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Peeap
                </span>
              </div>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Sierra Leone's leading payment gateway. Accept Mobile Money, Cards, and QR payments with ease.
              </p>
              <div className="flex items-center text-gray-500">
                <Globe className="w-5 h-5 mr-2" />
                <span>Freetown, Sierra Leone</span>
              </div>
            </motion.div>
            {[
              {
                title: 'Product',
                links: [
                  { name: 'Features', href: '#features' },
                  { name: 'Pricing', href: '#pricing' },
                  { name: 'Calculator', href: '#calculator' },
                  { name: 'API Docs', href: '/docs/SDK_INTEGRATION.md' },
                ]
              },
              {
                title: 'Company',
                links: [
                  { name: 'About Us', href: '#' },
                  { name: 'Careers', href: '#' },
                  { name: 'Blog', href: '#' },
                  { name: 'Contact', href: '#' },
                ]
              },
              {
                title: 'Legal',
                links: [
                  { name: 'Privacy Policy', href: '#' },
                  { name: 'Terms of Service', href: '#' },
                  { name: 'Security', href: '#' },
                ]
              }
            ].map((section, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <h4 className="font-semibold text-white mb-4">{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map((link, idx) => (
                    <li key={idx}>
                      <a
                        href={link.href}
                        className="text-gray-500 hover:text-indigo-400 transition-colors"
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center"
          >
            <p className="text-gray-500">&copy; 2025 Peeap. All rights reserved.</p>
            <div className="mt-4 md:mt-0 flex items-center space-x-2 text-gray-500">
              <Shield className="w-5 h-5 text-green-500" />
              <span>PCI DSS Compliant</span>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}

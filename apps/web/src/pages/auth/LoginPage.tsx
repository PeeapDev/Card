import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getUserDashboard } from '@/components/RoleBasedRoute';
import { AlertCircle, Shield, User, Store, Code, Headphones, Phone, Mail } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Phone number or email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Real database users with their credentials
const QUICK_LOGIN_USERS = [
  { email: 'superadmin@cardpay.com', password: 'admin123', label: 'Super Admin', icon: Shield, color: 'bg-black hover:bg-gray-800' },
  { email: 'admin@cardpay.com', password: 'admin123', label: 'Admin', icon: Shield, color: 'bg-red-500 hover:bg-red-600' },
  { email: 'user@example.com', password: 'User123!@#', label: 'User 1', icon: User, color: 'bg-blue-500 hover:bg-blue-600' },
  { email: 'merchant@example.com', password: 'Merchant123!@#', label: 'Merchant', icon: Store, color: 'bg-green-500 hover:bg-green-600' },
  { email: 'developer@example.com', password: 'Developer123!@#', label: 'Developer', icon: Code, color: 'bg-purple-500 hover:bg-purple-600' },
  { email: 'agent@example.com', password: 'Agent123!@#', label: 'Agent', icon: Headphones, color: 'bg-orange-500 hover:bg-orange-600' },
];

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [quickLoginLoading, setQuickLoginLoading] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromState = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      const user = await login(data);
      // If there's a specific redirect, use it; otherwise redirect based on role
      const redirectPath = fromState || getUserDashboard(user.roles);
      navigate(redirectPath, { replace: true });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid credentials';
      setError(errorMessage);
    }
  };

  // Quick login with real database credentials
  const handleQuickLogin = async (email: string, password: string) => {
    try {
      setError(null);
      setQuickLoginLoading(email);
      const user = await login({ email, password });
      const redirectPath = fromState || getUserDashboard(user.roles);
      navigate(redirectPath, { replace: true });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
    } finally {
      setQuickLoginLoading(null);
    }
  };

  return (
    <AuthLayout title="Sign in to your account" subtitle="Welcome back! Please enter your details.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number or Email
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="+1234567890 or email@example.com"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              {...register('email')}
            />
          </div>
          {errors.email?.message && (
            <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Primary: Phone number | Alternative: Email</p>
        </div>

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="ml-2 text-sm text-gray-600">Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Sign in
        </Button>

        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign up
          </Link>
        </p>

        {/* Quick Login Section - Real database users */}
        <div className="pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500 mb-4">
            Quick login with test accounts
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUICK_LOGIN_USERS.map(({ email, password, label, icon: Icon, color }) => (
              <button
                key={email}
                type="button"
                onClick={() => handleQuickLogin(email, password)}
                disabled={quickLoginLoading !== null}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
              >
                {quickLoginLoading === email ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                {label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}

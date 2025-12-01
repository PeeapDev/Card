import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getUserDashboard } from '@/components/RoleBasedRoute';
import { AlertCircle, Shield, User, UserPlus, Store, Code, Headphones } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const DEMO_ROLES = [
  { key: 'admin', label: 'Admin', icon: Shield, color: 'bg-red-500 hover:bg-red-600' },
  { key: 'user', label: 'User 1', icon: User, color: 'bg-blue-500 hover:bg-blue-600' },
  { key: 'user2', label: 'User 2', icon: UserPlus, color: 'bg-cyan-500 hover:bg-cyan-600' },
  { key: 'merchant', label: 'Merchant', icon: Store, color: 'bg-green-500 hover:bg-green-600' },
  { key: 'developer', label: 'Developer', icon: Code, color: 'bg-purple-500 hover:bg-purple-600' },
  { key: 'agent', label: 'Agent', icon: Headphones, color: 'bg-orange-500 hover:bg-orange-600' },
] as const;

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const { login, demoLogin } = useAuth();
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

  const handleDemoLogin = async (role: 'admin' | 'user' | 'user2' | 'merchant' | 'developer' | 'agent') => {
    try {
      setError(null);
      setDemoLoading(role);
      const user = await demoLogin(role);
      const redirectPath = getUserDashboard(user.roles);
      navigate(redirectPath, { replace: true });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Demo login failed';
      setError(errorMessage);
    } finally {
      setDemoLoading(null);
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

        <Input
          label="Email"
          type="email"
          placeholder="Enter your email"
          error={errors.email?.message}
          {...register('email')}
        />

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

        {/* Demo Login Section */}
        <div className="pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500 mb-4">
            Or try a demo account
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEMO_ROLES.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleDemoLogin(key)}
                disabled={demoLoading !== null}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
              >
                {demoLoading === key ? (
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

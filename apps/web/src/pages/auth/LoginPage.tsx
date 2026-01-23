import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getUserDashboard } from '@/components/RoleBasedRoute';
import { AlertCircle, Phone, Smartphone, ArrowLeft } from 'lucide-react';
import type { UserRole } from '@/types';

const loginSchema = z.object({
  email: z.string().min(1, 'Phone number or email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Check for redirect from location state OR query parameter (for OAuth flow)
  const fromState = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const redirectParam = searchParams.get('redirect');
  // searchParams.get() already decodes the value, so no need to decode again
  const redirectTo = fromState || redirectParam || null;

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
      const result = await login(data);

      // Check if MFA is required
      if ('mfaRequired' in result && result.mfaRequired) {
        setMfaRequired(true);
        setPendingCredentials({ email: data.email, password: data.password });
        return;
      }

      // Login successful - cast to User since we know MFA isn't required at this point
      const user = result as { roles: UserRole[] };
      const redirectPath = redirectTo || getUserDashboard(user.roles);
      console.log('[Login] Redirect decision:', { roles: user.roles, redirectTo, redirectPath });

      // Use window.location for full URLs (OAuth redirects), navigate() for internal paths
      if (redirectPath.startsWith('http://') || redirectPath.startsWith('https://') || redirectPath.startsWith('/auth/')) {
        window.location.href = redirectPath;
      } else {
        navigate(redirectPath, { replace: true });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid credentials';
      setError(errorMessage);
    }
  };

  // Handle MFA code submission
  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingCredentials || mfaCode.length !== 6) return;

    try {
      setError(null);
      const result = await login({
        email: pendingCredentials.email,
        password: pendingCredentials.password,
        mfaCode,
      });

      // Login successful
      const user = result as { roles: UserRole[] };
      const redirectPath = redirectTo || getUserDashboard(user.roles);
      console.log('[Login MFA] Redirect decision:', { roles: user.roles, redirectTo, redirectPath });

      // Use window.location for full URLs (OAuth redirects), navigate() for internal paths
      if (redirectPath.startsWith('http://') || redirectPath.startsWith('https://') || redirectPath.startsWith('/auth/')) {
        window.location.href = redirectPath;
      } else {
        navigate(redirectPath, { replace: true });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid verification code';
      setError(errorMessage);
    }
  };

  // Go back from MFA screen
  const handleBackFromMfa = () => {
    setMfaRequired(false);
    setMfaCode('');
    setPendingCredentials(null);
    setError(null);
  };

  // MFA verification screen
  if (mfaRequired) {
    return (
      <AuthLayout
        title="Two-Factor Authentication"
        subtitle="Enter the code from your authenticator app"
      >
        <form onSubmit={handleMfaSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-primary-600" />
            </div>
          </div>

          <p className="text-center text-sm text-gray-600">
            Open your authenticator app and enter the 6-digit code for your Peeap account.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
              Verification Code
            </label>
            <input
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              inputMode="numeric"
              autoFocus
              className="w-full px-4 py-4 border border-gray-300 rounded-xl text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="000000"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={mfaCode.length !== 6}
          >
            Verify
          </Button>

          <button
            type="button"
            onClick={handleBackFromMfa}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </button>
        </form>
      </AuthLayout>
    );
  }

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
      </form>
    </AuthLayout>
  );
}

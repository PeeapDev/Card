import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { ssoService } from '@/services/sso.service';
import { authService } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';
import { getUserDashboard } from '@/components/RoleBasedRoute';
import { useAuth } from '@/context/AuthContext';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { User, UserRole } from '@/types';

/**
 * SSO Authentication Page for Peeap Pay
 *
 * Handles incoming SSO tokens from:
 * 1. plus.peeap.com (internal SSO)
 * 2. Third-party applications (OAuth-style SSO)
 *
 * Flow:
 * 1. Receive token from URL: /auth/sso?token=xxx
 * 2. Validate token in sso_tokens table
 * 3. Fetch user from users table
 * 4. Create local session (JWT tokens)
 * 5. Mark SSO token as used
 * 6. Redirect to dashboard or specified path
 */

interface SsoToken {
  id: string;
  user_id: string;
  token: string;
  source_app: string;
  target_app: string;
  tier?: string;
  redirect_path?: string;
  expires_at: string;
  used_at?: string;
  created_at: string;
}

export function SsoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleSso = async () => {
      const token = searchParams.get('token');
      const redirectTo = searchParams.get('redirect') || null;

      if (!token) {
        setStatus('error');
        setErrorMessage('No SSO token provided');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
        return;
      }

      try {
        // Validate the SSO token
        const result = await ssoService.validateSsoToken(token);

        if (!result.valid || !result.userId) {
          setStatus('error');
          setErrorMessage(result.error || 'Invalid or expired token');
          setTimeout(() => navigate('/login', { replace: true }), 2000);
          return;
        }

        // Fetch user from database
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', result.userId)
          .limit(1);

        if (userError || !users || users.length === 0) {
          setStatus('error');
          setErrorMessage('User not found');
          setTimeout(() => navigate('/login', { replace: true }), 2000);
          return;
        }

        const dbUser = users[0];

        // Parse roles
        let userRoles: UserRole[] = ['user'];
        if (dbUser.roles) {
          userRoles = dbUser.roles.split(',').map((r: string) => r.trim()) as UserRole[];
        } else if (dbUser.role) {
          userRoles = [dbUser.role] as UserRole[];
        }

        // Create user object
        const user: User = {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.first_name,
          lastName: dbUser.last_name,
          phone: dbUser.phone,
          roles: userRoles,
          kycStatus: dbUser.kyc_status,
          kycTier: dbUser.kyc_tier,
          emailVerified: dbUser.email_verified,
          createdAt: dbUser.created_at,
        };

        // Generate local JWT tokens
        const tokens = {
          accessToken: btoa(JSON.stringify({
            userId: user.id,
            email: user.email,
            roles: user.roles,
            exp: Date.now() + 3600000, // 1 hour
          })),
          refreshToken: btoa(JSON.stringify({
            userId: user.id,
            exp: Date.now() + 604800000, // 7 days
          })),
          expiresIn: 3600,
        };

        // Store tokens
        authService.setTokens(tokens);

        // Update last login
        await supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', dbUser.id);

        // Refresh the auth context to pick up the new session
        try {
          await refreshUser();
        } catch (e) {
          // refreshUser may fail if getProfile expects API, but tokens are set
          console.log('SSO: Could not refresh user from API, using local session');
        }

        setStatus('success');

        // Determine redirect path
        const redirectPath = redirectTo || result.redirectPath || getUserDashboard(userRoles);

        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 1000);
      } catch (error) {
        console.error('SSO error:', error);
        setStatus('error');
        setErrorMessage('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    };

    handleSso();
  }, [navigate, searchParams, refreshUser]);

  return (
    <AuthLayout
      title={status === 'loading' ? 'Signing you in...' : status === 'success' ? 'Welcome!' : 'Authentication Failed'}
      subtitle={status === 'loading' ? 'Please wait while we verify your credentials' : ''}
    >
      <div className="text-center py-8">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Validating your session...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">Redirecting to your dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">{errorMessage}</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';

export function SchoolAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing sign in...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        setStatus('error');
        setMessage(errorDescription || 'Authentication failed');
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received');
        return;
      }

      try {
        setMessage('Exchanging authorization code...');

        // Exchange code for tokens with the Peeap API
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/sso/exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirect_uri: window.location.origin + '/auth/callback',
            client_id: 'school-portal',
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to complete SSO');
        }

        const data = await response.json();

        // Check if user has school admin access
        if (!data.schoolAdmin) {
          setStatus('error');
          setMessage('Your Peeap account is not connected to any school. Please contact your school administrator to get access.');
          return;
        }

        // Store tokens using auth service
        authService.setTokens({
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken,
          expiresIn: data.tokens.expiresIn || 3600,
        });

        // Store school ID for the portal
        localStorage.setItem('schoolId', data.schoolAdmin.schoolId);
        localStorage.setItem('schoolRole', data.schoolAdmin.role);

        // Refresh user profile in auth context
        await refreshUser();

        setStatus('success');
        setMessage('Sign in successful! Redirecting...');

        // Redirect to dashboard
        setTimeout(() => {
          navigate('/school');
        }, 1500);

      } catch (err: any) {
        console.error('SSO callback error:', err);
        setStatus('error');
        setMessage(err.message || 'Failed to complete sign in');
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-100 rounded-full">
            <GraduationCap className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Peeap School</h1>

        <div className="mt-8">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              <p className="text-gray-600">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <p className="text-green-700 font-medium">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <p className="text-red-700">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

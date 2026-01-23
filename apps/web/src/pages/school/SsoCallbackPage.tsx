import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { GraduationCap, Loader2, AlertCircle, CheckCircle, UserPlus } from 'lucide-react';
import { authService } from '@/services/auth.service';

/**
 * SSO Callback Page for School Quick Access
 *
 * This page receives verified user data from the api.peeap.com one-time code exchange.
 * The flow:
 * 1. SDSL2 generates a one-time code and redirects to api.peeap.com
 * 2. api.peeap.com exchanges the code with SDSL2 for user data
 * 3. api.peeap.com redirects here with verified user params
 * 4. This page creates a session and redirects to the school dashboard
 */
export function SsoCallbackPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no_account'>('loading');
  const [message, setMessage] = useState('Verifying your access...');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const handleSsoCallback = async () => {
      // Extract verified user data from URL params
      const email = searchParams.get('email');
      const name = searchParams.get('name');
      const schoolId = searchParams.get('school_id');
      const schoolName = searchParams.get('school_name');
      const role = searchParams.get('role');
      const saasUserId = searchParams.get('saas_user_id');
      const verified = searchParams.get('verified');
      const peeapUserId = searchParams.get('peeap_user_id');
      const peeapEmail = searchParams.get('peeap_email');
      const domain = searchParams.get('domain');
      const error = searchParams.get('error');

      console.log('[SSO Callback] Received params:', {
        email,
        name,
        schoolId,
        schoolName,
        role,
        verified,
        peeapUserId: peeapUserId ? 'present' : 'missing',
        domain,
        error,
      });

      // Check for errors
      if (error) {
        setStatus('error');
        const errorMessages: Record<string, string> = {
          missing_params: 'Missing required parameters. Please try again from your school system.',
          invalid_domain: 'Invalid school domain.',
          exchange_failed: 'Failed to verify your access. Please try again.',
          invalid_code: 'Your access code has expired or already been used. Please try again from your school system.',
          no_email: 'No email address found in your school account.',
          server_error: searchParams.get('message') || 'Server error occurred.',
        };
        setMessage(errorMessages[error] || 'An error occurred during sign in.');
        return;
      }

      // Validate required params
      if (!email || verified !== 'true') {
        setStatus('error');
        setMessage('Invalid or missing verification data. Please try again from your school system.');
        return;
      }

      setUserEmail(email);

      // Check if user has a Peeap account
      if (!peeapUserId) {
        setStatus('no_account');
        setMessage(`Your school account (${email}) is not linked to a Peeap account.`);
        return;
      }

      try {
        setMessage('Creating your session...');

        // Call API to create a session for this verified user
        // Always use api.peeap.com for the API calls
        const apiUrl = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
        const response = await fetch(`${apiUrl}/api/school/auth/create-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            peeap_user_id: peeapUserId,
            email: peeapEmail || email,
            school_id: schoolId,
            school_name: schoolName,
            role: role,
            saas_user_id: saasUserId,
            domain: domain,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to create session');
        }

        const data = await response.json();

        if (data.success && data.session) {
          // Store session tokens using authService for proper state management
          authService.setTokens({
            accessToken: data.session.accessToken,
            refreshToken: data.session.refreshToken,
            expiresIn: 3600,
          });

          // Also store user data directly so ProtectedRoute can find it
          localStorage.setItem('user', JSON.stringify(data.session.user));

          // Store school context
          localStorage.setItem('schoolId', schoolId || '');
          localStorage.setItem('schoolName', schoolName || '');
          localStorage.setItem('schoolRole', role || 'staff');

          setStatus('success');
          setMessage('Sign in successful! Redirecting to dashboard...');

          // Use hard redirect to force full page reload and re-initialize auth context
          setTimeout(() => {
            window.location.href = '/school';
          }, 1500);
        } else {
          throw new Error(data.message || 'Session creation failed');
        }

      } catch (err: any) {
        console.error('[SSO Callback] Error:', err);
        setStatus('error');
        setMessage(err.message || 'Failed to complete sign in. Please try again.');
      }
    };

    handleSsoCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

          {status === 'no_account' && (
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <UserPlus className="h-10 w-10 text-yellow-600" />
              </div>
              <p className="text-gray-700">{message}</p>
              <p className="text-sm text-gray-500 mt-2">
                To access your school's Peeap dashboard, you need to create a Peeap account
                using the same email address: <strong>{userEmail}</strong>
              </p>
              <div className="flex flex-col gap-3 mt-4 w-full">
                <Link
                  to={`/register?email=${encodeURIComponent(userEmail)}`}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Create Peeap Account
                </Link>
                <Link
                  to="/login"
                  className="px-6 py-2 text-blue-600 hover:text-blue-700 transition-colors text-sm"
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <p className="text-red-700">{message}</p>
              <button
                onClick={() => window.history.back()}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

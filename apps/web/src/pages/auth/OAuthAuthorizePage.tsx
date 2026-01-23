import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui';
import { ssoService, OAuthClient } from '@/services/sso.service';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

/**
 * OAuth Authorization Page
 *
 * Handles the OAuth 2.0 authorization flow for third-party applications.
 * Users are shown the requesting application and scopes, then can approve or deny.
 *
 * URL Parameters:
 * - client_id: The OAuth client ID
 * - redirect_uri: Where to redirect after authorization
 * - response_type: Must be 'code' for authorization code flow
 * - scope: Space-separated list of requested scopes
 * - state: Optional state parameter to prevent CSRF
 */

const SCOPE_DESCRIPTIONS: Record<string, { name: string; description: string }> = {
  profile: {
    name: 'Profile',
    description: 'Access your basic profile information (name, email)',
  },
  email: {
    name: 'Email',
    description: 'View your email address',
  },
  phone: {
    name: 'Phone',
    description: 'View your phone number',
  },
  'wallet:read': {
    name: 'View Wallet',
    description: 'View your wallet balance and transaction history',
  },
  'wallet:write': {
    name: 'Manage Wallet',
    description: 'Make payments and transfers on your behalf',
  },
  'cards:read': {
    name: 'View Cards',
    description: 'View your linked cards',
  },
  'transactions:read': {
    name: 'View Transactions',
    description: 'View your transaction history',
  },
  // School-specific scopes
  'school:connect': {
    name: 'Connect School',
    description: 'Connect your school to Peeap Pay for payments',
  },
  'school:manage': {
    name: 'Manage School',
    description: 'Manage school settings, vendors, and student sync',
  },
  'student:sync': {
    name: 'Sync Students',
    description: 'Sync student data between school and Peeap',
  },
  'fee:pay': {
    name: 'Pay Fees',
    description: 'Pay school fees on behalf of students',
  },
};

export function OAuthAuthorizePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [status, setStatus] = useState<'loading' | 'authorize' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [client, setClient] = useState<OAuthClient | null>(null);
  const [requestedScopes, setRequestedScopes] = useState<string[]>([]);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // Extract OAuth parameters
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const responseType = searchParams.get('response_type');
  const scope = searchParams.get('scope') || 'profile';
  const state = searchParams.get('state');

  // Extract school-specific metadata
  const schoolId = searchParams.get('school_id');
  const userType = searchParams.get('user_type') as 'admin' | 'student' | 'parent' | null;
  const indexNumber = searchParams.get('index_number');
  const studentName = searchParams.get('student_name');
  const studentPhone = searchParams.get('student_phone');

  // Extract pass-through params for school SaaS integration
  // These need to be forwarded to the redirect_uri so school.peeap.com knows where to redirect back
  const origin = searchParams.get('origin');
  const connection = searchParams.get('connection');

  useEffect(() => {
    const validateRequest = async () => {
      // Wait for auth to load
      if (authLoading) return;

      // Redirect to login if not authenticated
      if (!isAuthenticated) {
        const returnUrl = window.location.href;
        navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`, { replace: true });
        return;
      }

      // Validate required parameters
      if (!clientId || !redirectUri) {
        setStatus('error');
        setErrorMessage('Missing required parameters: client_id and redirect_uri');
        return;
      }

      if (responseType !== 'code') {
        setStatus('error');
        setErrorMessage('Invalid response_type. Only "code" is supported.');
        return;
      }

      // Validate OAuth client
      const result = await ssoService.validateOAuthClient(clientId, redirectUri);

      if (!result.valid || !result.client) {
        setStatus('error');
        setErrorMessage(result.error || 'Invalid OAuth client');
        return;
      }

      setClient(result.client);

      // Parse requested scopes
      const scopes = scope.split(' ').filter(s => s.trim());
      setRequestedScopes(scopes);

      setStatus('authorize');
    };

    validateRequest();
  }, [clientId, redirectUri, responseType, scope, authLoading, isAuthenticated, navigate]);

  const handleAuthorize = async () => {
    if (!client || !user || !redirectUri) return;

    setIsAuthorizing(true);

    try {
      // Build metadata for school integration
      const metadata: Record<string, any> = {};
      if (schoolId) metadata.school_id = schoolId;
      if (userType) metadata.user_type = userType;
      if (indexNumber) metadata.index_number = indexNumber;
      if (studentName) metadata.student_name = studentName;
      if (studentPhone) metadata.student_phone = studentPhone;

      // Generate authorization code
      const { code } = await ssoService.generateAuthorizationCode({
        clientId: client.client_id,
        userId: user.id,
        redirectUri,
        scope: requestedScopes.join(' '),
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      setStatus('success');

      // Build redirect URL with code
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('code', code);
      if (state) {
        redirectUrl.searchParams.set('state', state);
      }

      // Pass through school SaaS integration params
      // These allow school.peeap.com to know where to redirect back after setup
      if (origin) {
        redirectUrl.searchParams.set('origin', origin);
      }
      if (schoolId) {
        redirectUrl.searchParams.set('school_id', schoolId);
      }
      if (connection) {
        redirectUrl.searchParams.set('connection', connection);
      }

      // Redirect after a brief delay
      setTimeout(() => {
        window.location.href = redirectUrl.toString();
      }, 1000);
    } catch (error) {
      console.error('Authorization failed:', error);
      setStatus('error');
      setErrorMessage('Failed to authorize. Please try again.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleDeny = () => {
    if (!redirectUri) {
      navigate('/dashboard');
      return;
    }

    // Redirect with error
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('error_description', 'User denied the authorization request');
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }

    window.location.href = redirectUrl.toString();
  };

  // Loading state
  if (status === 'loading' || authLoading) {
    return (
      <AuthLayout title="Authorizing..." subtitle="Please wait">
        <div className="text-center py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Validating authorization request...</p>
        </div>
      </AuthLayout>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <AuthLayout title="Authorization Error" subtitle="">
        <div className="text-center py-8">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{errorMessage}</p>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <AuthLayout title="Authorization Successful" subtitle="">
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">You have authorized {client?.name}.</p>
          <p className="text-sm text-gray-500">Redirecting you back...</p>
        </div>
      </AuthLayout>
    );
  }

  // Authorization form
  return (
    <AuthLayout
      title="Authorize Application"
      subtitle={`${client?.name} is requesting access to your account`}
    >
      <div className="space-y-6">
        {/* App Info */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          {client?.logo_url ? (
            <img
              src={client.logo_url}
              alt={client.name}
              className="w-12 h-12 rounded-lg"
            />
          ) : (
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-600" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{client?.name}</h3>
            {client?.website_url && (
              <p className="text-sm text-gray-500">{client.website_url}</p>
            )}
          </div>
        </div>

        {/* Requested Permissions */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            This application will be able to:
          </h4>
          <ul className="space-y-3">
            {requestedScopes.map((scope) => {
              const scopeInfo = SCOPE_DESCRIPTIONS[scope];
              return (
                <li key={scope} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {scopeInfo?.name || scope}
                    </p>
                    <p className="text-sm text-gray-500">
                      {scopeInfo?.description || `Access ${scope}`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800">
              Only authorize applications you trust
            </p>
            <p className="text-yellow-700 mt-1">
              By authorizing, you allow this application to access your Peeap account
              with the permissions listed above.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDeny}
            disabled={isAuthorizing}
          >
            Deny
          </Button>
          <Button
            className="flex-1"
            onClick={handleAuthorize}
            isLoading={isAuthorizing}
          >
            Authorize
          </Button>
        </div>

        {/* User info */}
        <p className="text-center text-sm text-gray-500">
          Signed in as <span className="font-medium">{user?.email}</span>
        </p>
      </div>
    </AuthLayout>
  );
}

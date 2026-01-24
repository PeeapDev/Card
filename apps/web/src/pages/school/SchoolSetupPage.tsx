import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabaseAdmin } from '@/lib/supabase';
import {
  GraduationCap,
  Building2,
  Check,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export function SchoolSetupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Get domain from URL params if provided
  const domainFromUrl = searchParams.get('domain');

  const [formData, setFormData] = useState({
    schoolName: '',
    schoolId: '',
    peeapSchoolId: domainFromUrl || '',
  });

  // Update form when URL params change
  useEffect(() => {
    if (domainFromUrl) {
      setFormData(prev => ({
        ...prev,
        peeapSchoolId: domainFromUrl,
        // Auto-generate a readable school name from domain
        schoolName: prev.schoolName || domainFromUrl.charAt(0).toUpperCase() + domainFromUrl.slice(1) + ' School',
      }));
    }
  }, [domainFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      setError('You must be logged in to setup a school');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const schoolSlug = formData.peeapSchoolId || formData.schoolId;

      // Create wallet for school (no user_id for school wallets)
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .insert({
          currency: 'SLE',
          balance: 0,
          status: 'ACTIVE',
          wallet_type: 'school',
          name: `${formData.schoolName} Wallet`,
          external_id: `SCH-${schoolSlug}`,
        })
        .select()
        .single();

      if (walletError) {
        throw new Error(`Failed to create wallet: ${walletError.message}`);
      }

      // Create school connection with correct column names
      const { error: connectionError } = await supabaseAdmin
        .from('school_connections')
        .insert({
          school_id: formData.schoolId || `school-${Date.now()}`,
          school_name: formData.schoolName,
          peeap_school_id: schoolSlug,
          school_domain: schoolSlug ? `${schoolSlug}.gov.school.edu.sl` : null,
          connected_by_user_id: user.id,
          connected_by_email: user.email,
          wallet_id: wallet.id,
          status: 'active',
          saas_origin: schoolSlug ? `${schoolSlug}.gov.school.edu.sl` : null,
          connected_at: new Date().toISOString(),
        });

      if (connectionError) {
        // If connection failed, delete the wallet we just created
        await supabaseAdmin.from('wallets').delete().eq('id', wallet.id);
        throw new Error(`Failed to create school connection: ${connectionError.message}`);
      }

      // Store in localStorage
      localStorage.setItem('schoolId', formData.schoolId);
      localStorage.setItem('schoolName', formData.schoolName);
      localStorage.setItem('school_domain', formData.peeapSchoolId || formData.schoolId);

      setSuccess(true);
      setTimeout(() => {
        // Navigate to the school-specific URL
        const schoolDomain = formData.peeapSchoolId || formData.schoolId || 'school';
        navigate(`/${schoolDomain}`);
      }, 2000);
    } catch (err: any) {
      console.error('Error setting up school:', err);
      setError(err.message || 'Failed to setup school. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-white/20 rounded-2xl backdrop-blur-sm mb-4">
            <GraduationCap className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Setup Your School</h1>
          <p className="text-blue-200 mt-2">Connect your school to Peeap to start receiving payments</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">School Connected!</h2>
              <p className="text-gray-600">Redirecting to your dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  School Name *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    placeholder="e.g. St. Joseph's Secondary School"
                    required
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  School ID (from your school system)
                </label>
                <input
                  type="text"
                  value={formData.schoolId}
                  onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                  placeholder="e.g. 2"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">Your unique school ID in the school system</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  School Domain (for SDSL integration)
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={formData.peeapSchoolId}
                    onChange={(e) => setFormData({ ...formData, peeapSchoolId: e.target.value })}
                    placeholder="e.g. stjosephs"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-l-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <span className="px-3 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-xl text-gray-500 text-sm">
                    .gov.school.edu.sl
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Your subdomain if integrated with SDSL</p>
              </div>

              <button
                type="submit"
                disabled={loading || !formData.schoolName}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Setup School
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                This will create a Peeap wallet for your school to receive payments
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 404 Not Found Page
 *
 * Displayed when a user navigates to a non-existent route
 */

import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, HelpCircle } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="text-9xl font-bold text-gray-200 dark:text-gray-700 select-none">
            404
          </div>
          <div className="relative -mt-16">
            <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto">
              <Search className="w-12 h-12 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Page Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Oops! The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <button
            onClick={handleGoBack}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Helpful Links
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Link
              to="/dashboard"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
            >
              Dashboard
            </Link>
            <Link
              to="/dashboard/wallet"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
            >
              Wallet
            </Link>
            <Link
              to="/dashboard/transactions"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
            >
              Transactions
            </Link>
            <Link
              to="/dashboard/settings"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
            >
              Settings
            </Link>
          </div>
        </div>

        {/* Support */}
        <p className="mt-6 text-xs text-gray-400">
          Need help?{' '}
          <a href="mailto:support@peeap.com" className="text-primary-600 hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}

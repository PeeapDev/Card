import { CheckCircle, Shield } from 'lucide-react';
import { clsx } from 'clsx';

interface VerifiedBadgeProps {
  verified?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

/**
 * VerifiedBadge Component
 *
 * Displays a verification badge that can be used across the app:
 * - User profiles
 * - Transaction lists
 * - Contact search results
 * - User cards
 */
export function VerifiedBadge({
  verified = false,
  size = 'sm',
  showText = false,
  className,
}: VerifiedBadgeProps) {
  if (!verified) return null;

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSize = sizeClasses[size];
  const textSize = textSizeClasses[size];

  if (showText) {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
          textSize,
          className
        )}
        title="Verified User"
      >
        <CheckCircle className={iconSize} />
        <span className="font-medium">Verified</span>
      </span>
    );
  }

  return (
    <span className={clsx('inline-flex', className)} title="Verified User">
      <CheckCircle
        className={clsx(iconSize, 'text-green-500 dark:text-green-400')}
        fill="currentColor"
        stroke="white"
        strokeWidth={2}
      />
    </span>
  );
}

/**
 * UserVerificationStatus Component
 *
 * Displays the full verification status with more details
 */
export function UserVerificationStatus({
  verified,
  kycLevel,
  className,
}: {
  verified?: boolean;
  kycLevel?: number;
  className?: string;
}) {
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {verified ? (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
          <CheckCircle className="w-3.5 h-3.5" />
          Verified
          {kycLevel && kycLevel >= 2 && (
            <span className="text-green-500 dark:text-green-300">• Level {kycLevel}</span>
          )}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
          <Shield className="w-3.5 h-3.5" />
          Unverified
        </span>
      )}
    </div>
  );
}

export default VerifiedBadge;

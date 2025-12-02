/**
 * Profile Avatar Component
 *
 * Displays user profile picture with initials fallback
 * Uses first letters of first and last name
 */

import { clsx } from 'clsx';

interface ProfileAvatarProps {
  firstName?: string;
  lastName?: string;
  profilePicture?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Generate consistent color based on name
const getColorFromName = (name: string): string => {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export function ProfileAvatar({
  firstName = '',
  lastName = '',
  profilePicture,
  size = 'md',
  className,
}: ProfileAvatarProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const fullName = `${firstName} ${lastName}`.trim();
  const bgColor = getColorFromName(fullName || 'Unknown');

  if (profilePicture) {
    return (
      <img
        src={profilePicture}
        alt={fullName}
        className={clsx(
          'rounded-full object-cover border-2 border-white shadow-sm',
          sizeClasses[size],
          className
        )}
        onError={(e) => {
          // Fallback to initials if image fails to load
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.classList.remove('hidden');
        }}
      />
    );
  }

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center text-white font-semibold shadow-sm',
        sizeClasses[size],
        bgColor,
        className
      )}
      title={fullName}
    >
      {initials || '?'}
    </div>
  );
}

export default ProfileAvatar;

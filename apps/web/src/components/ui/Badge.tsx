import { clsx } from 'clsx';
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-primary-100 text-primary-700',
  secondary: 'bg-gray-100 text-gray-600',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
};

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}

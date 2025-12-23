import { HTMLAttributes, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';

// Padding styles type
type PaddingSize = 'none' | 'sm' | 'md' | 'lg';

// Color theme types
export type CardColorTheme = 'green' | 'blue' | 'purple' | 'orange' | 'cyan' | 'pink' | 'amber' | 'red' | 'indigo' | 'teal' | 'gray';

// Theme color classes for different elements
export interface ThemeColors {
  // Card backgrounds and borders
  cardBg: string;
  cardBorder: string;
  // Icon container
  iconBg: string;
  iconColor: string;
  // Text colors
  titleColor: string;
  textColor: string;
  // Badge/status
  badgeBg: string;
  badgeText: string;
  // Link/action colors
  linkColor: string;
  // Inactive state
  inactiveBg: string;
  inactiveBorder: string;
  inactiveIconBg: string;
  inactiveIconColor: string;
  inactiveBadgeBg: string;
  inactiveBadgeText: string;
}

// Get all theme colors for a specific color theme
export const getThemeColors = (theme: CardColorTheme): ThemeColors => {
  const themes: Record<CardColorTheme, ThemeColors> = {
    green: {
      cardBg: 'bg-green-50 dark:bg-green-900/20',
      cardBorder: 'border-green-200 dark:border-green-800',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      titleColor: 'text-green-900 dark:text-green-100',
      textColor: 'text-green-700 dark:text-green-300',
      badgeBg: 'bg-green-100 dark:bg-green-900/30',
      badgeText: 'text-green-700 dark:text-green-400',
      linkColor: 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300',
      inactiveBg: 'bg-gray-50 dark:bg-gray-800',
      inactiveBorder: 'border-gray-200 dark:border-gray-700',
      inactiveIconBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveIconColor: 'text-gray-400',
      inactiveBadgeBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveBadgeText: 'text-gray-500 dark:text-gray-400',
    },
    blue: {
      cardBg: 'bg-blue-50 dark:bg-blue-900/20',
      cardBorder: 'border-blue-200 dark:border-blue-800',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-900 dark:text-blue-100',
      textColor: 'text-blue-700 dark:text-blue-300',
      badgeBg: 'bg-blue-100 dark:bg-blue-900/30',
      badgeText: 'text-blue-700 dark:text-blue-400',
      linkColor: 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
      inactiveBg: 'bg-gray-50 dark:bg-gray-800',
      inactiveBorder: 'border-gray-200 dark:border-gray-700',
      inactiveIconBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveIconColor: 'text-gray-400',
      inactiveBadgeBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveBadgeText: 'text-gray-500 dark:text-gray-400',
    },
    purple: {
      cardBg: 'bg-purple-50 dark:bg-purple-900/20',
      cardBorder: 'border-purple-200 dark:border-purple-800',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      titleColor: 'text-purple-900 dark:text-purple-100',
      textColor: 'text-purple-700 dark:text-purple-300',
      badgeBg: 'bg-purple-100 dark:bg-purple-900/30',
      badgeText: 'text-purple-700 dark:text-purple-400',
      linkColor: 'text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300',
      inactiveBg: 'bg-gray-50 dark:bg-gray-800',
      inactiveBorder: 'border-gray-200 dark:border-gray-700',
      inactiveIconBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveIconColor: 'text-gray-400',
      inactiveBadgeBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveBadgeText: 'text-gray-500 dark:text-gray-400',
    },
    orange: {
      cardBg: 'bg-orange-50 dark:bg-orange-900/20',
      cardBorder: 'border-orange-200 dark:border-orange-800',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      titleColor: 'text-orange-900 dark:text-orange-100',
      textColor: 'text-orange-700 dark:text-orange-300',
      badgeBg: 'bg-orange-100 dark:bg-orange-900/30',
      badgeText: 'text-orange-700 dark:text-orange-400',
      linkColor: 'text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300',
      inactiveBg: 'bg-gray-50 dark:bg-gray-800',
      inactiveBorder: 'border-gray-200 dark:border-gray-700',
      inactiveIconBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveIconColor: 'text-gray-400',
      inactiveBadgeBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveBadgeText: 'text-gray-500 dark:text-gray-400',
    },
    cyan: {
      cardBg: 'bg-cyan-50 dark:bg-cyan-900/20',
      cardBorder: 'border-cyan-200 dark:border-cyan-800',
      iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      titleColor: 'text-cyan-900 dark:text-cyan-100',
      textColor: 'text-cyan-700 dark:text-cyan-300',
      badgeBg: 'bg-cyan-100 dark:bg-cyan-900/30',
      badgeText: 'text-cyan-700 dark:text-cyan-400',
      linkColor: 'text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300',
      inactiveBg: 'bg-gray-50 dark:bg-gray-800',
      inactiveBorder: 'border-gray-200 dark:border-gray-700',
      inactiveIconBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveIconColor: 'text-gray-400',
      inactiveBadgeBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveBadgeText: 'text-gray-500 dark:text-gray-400',
    },
    pink: {
      cardBg: 'bg-pink-50 dark:bg-pink-900/20',
      cardBorder: 'border-pink-200 dark:border-pink-800',
      iconBg: 'bg-pink-100 dark:bg-pink-900/30',
      iconColor: 'text-pink-600 dark:text-pink-400',
      titleColor: 'text-pink-900 dark:text-pink-100',
      textColor: 'text-pink-700 dark:text-pink-300',
      badgeBg: 'bg-pink-100 dark:bg-pink-900/30',
      badgeText: 'text-pink-700 dark:text-pink-400',
      linkColor: 'text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300',
      inactiveBg: 'bg-gray-50 dark:bg-gray-800',
      inactiveBorder: 'border-gray-200 dark:border-gray-700',
      inactiveIconBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveIconColor: 'text-gray-400',
      inactiveBadgeBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveBadgeText: 'text-gray-500 dark:text-gray-400',
    },
    amber: {
      cardBg: 'bg-amber-50 dark:bg-amber-900/20',
      cardBorder: 'border-amber-200 dark:border-amber-800',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      titleColor: 'text-amber-900 dark:text-amber-100',
      textColor: 'text-amber-700 dark:text-amber-300',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/30',
      badgeText: 'text-amber-700 dark:text-amber-400',
      linkColor: 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300',
      inactiveBg: 'bg-gray-50 dark:bg-gray-800',
      inactiveBorder: 'border-gray-200 dark:border-gray-700',
      inactiveIconBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveIconColor: 'text-gray-400',
      inactiveBadgeBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveBadgeText: 'text-gray-500 dark:text-gray-400',
    },
    red: {
      cardBg: 'bg-red-50 dark:bg-red-900/20',
      cardBorder: 'border-red-200 dark:border-red-800',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      titleColor: 'text-red-900 dark:text-red-100',
      textColor: 'text-red-700 dark:text-red-300',
      badgeBg: 'bg-red-100 dark:bg-red-900/30',
      badgeText: 'text-red-700 dark:text-red-400',
      linkColor: 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300',
      inactiveBg: 'bg-gray-50 dark:bg-gray-800',
      inactiveBorder: 'border-gray-200 dark:border-gray-700',
      inactiveIconBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveIconColor: 'text-gray-400',
      inactiveBadgeBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveBadgeText: 'text-gray-500 dark:text-gray-400',
    },
    indigo: {
      cardBg: 'bg-indigo-50 dark:bg-indigo-900/20',
      cardBorder: 'border-indigo-200 dark:border-indigo-800',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      titleColor: 'text-indigo-900 dark:text-indigo-100',
      textColor: 'text-indigo-700 dark:text-indigo-300',
      badgeBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      badgeText: 'text-indigo-700 dark:text-indigo-400',
      linkColor: 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300',
      inactiveBg: 'bg-gray-50 dark:bg-gray-800',
      inactiveBorder: 'border-gray-200 dark:border-gray-700',
      inactiveIconBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveIconColor: 'text-gray-400',
      inactiveBadgeBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveBadgeText: 'text-gray-500 dark:text-gray-400',
    },
    teal: {
      cardBg: 'bg-teal-50 dark:bg-teal-900/20',
      cardBorder: 'border-teal-200 dark:border-teal-800',
      iconBg: 'bg-teal-100 dark:bg-teal-900/30',
      iconColor: 'text-teal-600 dark:text-teal-400',
      titleColor: 'text-teal-900 dark:text-teal-100',
      textColor: 'text-teal-700 dark:text-teal-300',
      badgeBg: 'bg-teal-100 dark:bg-teal-900/30',
      badgeText: 'text-teal-700 dark:text-teal-400',
      linkColor: 'text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300',
      inactiveBg: 'bg-gray-50 dark:bg-gray-800',
      inactiveBorder: 'border-gray-200 dark:border-gray-700',
      inactiveIconBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveIconColor: 'text-gray-400',
      inactiveBadgeBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveBadgeText: 'text-gray-500 dark:text-gray-400',
    },
    gray: {
      cardBg: 'bg-gray-50 dark:bg-gray-800/50',
      cardBorder: 'border-gray-200 dark:border-gray-700',
      iconBg: 'bg-gray-100 dark:bg-gray-700',
      iconColor: 'text-gray-600 dark:text-gray-400',
      titleColor: 'text-gray-900 dark:text-gray-100',
      textColor: 'text-gray-600 dark:text-gray-400',
      badgeBg: 'bg-gray-100 dark:bg-gray-700',
      badgeText: 'text-gray-600 dark:text-gray-400',
      linkColor: 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
      inactiveBg: 'bg-gray-50 dark:bg-gray-800',
      inactiveBorder: 'border-gray-200 dark:border-gray-700',
      inactiveIconBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveIconColor: 'text-gray-400',
      inactiveBadgeBg: 'bg-gray-100 dark:bg-gray-700',
      inactiveBadgeText: 'text-gray-500 dark:text-gray-400',
    },
  };
  return themes[theme];
};

// Hook to use theme colors - returns classes based on active state
export const useCardTheme = (theme: CardColorTheme, isActive: boolean = true) => {
  const colors = getThemeColors(theme);
  return {
    cardBg: isActive ? colors.cardBg : colors.inactiveBg,
    cardBorder: isActive ? colors.cardBorder : colors.inactiveBorder,
    iconBg: isActive ? colors.iconBg : colors.inactiveIconBg,
    iconColor: isActive ? colors.iconColor : colors.inactiveIconColor,
    titleColor: isActive ? colors.titleColor : 'text-gray-900 dark:text-white',
    textColor: isActive ? colors.textColor : 'text-gray-500 dark:text-gray-400',
    badgeBg: isActive ? colors.badgeBg : colors.inactiveBadgeBg,
    badgeText: isActive ? colors.badgeText : colors.inactiveBadgeText,
    linkColor: isActive ? colors.linkColor : 'text-gray-400',
  };
};

const getPaddingClass = (padding: PaddingSize): string => {
  const styles: Record<PaddingSize, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  return styles[padding];
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: PaddingSize;
  glass?: boolean; // Enable frosted glass effect in dark mode
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'md', glass = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-xl shadow-sm border',
          glass
            ? 'bg-white dark:bg-gray-800/70 dark:backdrop-blur-xl border-gray-200 dark:border-gray-700/50'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
          'dark:shadow-gray-900/20',
          getPaddingClass(padding),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Animated Card with Framer Motion
interface MotionCardProps {
  padding?: PaddingSize;
  children?: React.ReactNode;
  hoverEffect?: boolean;
  glowEffect?: boolean;
  glass?: boolean; // Enable frosted glass effect in dark mode
  delay?: number;
  className?: string;
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ className, padding = 'md', children, hoverEffect = true, glowEffect = false, glass = false, delay = 0 }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease: 'easeOut' }}
        whileHover={hoverEffect ? {
          scale: 1.02,
          transition: { duration: 0.2 }
        } : undefined}
        className={clsx(
          'rounded-xl shadow-sm border',
          glass
            ? 'bg-white dark:bg-gray-800/70 dark:backdrop-blur-xl border-gray-200 dark:border-gray-700/50'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
          'dark:shadow-gray-900/20 transition-colors duration-300',
          glowEffect && 'dark:shadow-lg dark:shadow-primary-500/10 dark:hover:shadow-primary-500/20',
          getPaddingClass(padding),
          className
        )}
      >
        {children}
      </motion.div>
    );
  }
);

MotionCard.displayName = 'MotionCard';

// Gradient Card for colorful stats
type GradientType = 'green' | 'blue' | 'purple' | 'orange' | 'cyan' | 'pink';

const getGradientClass = (gradient: GradientType): string => {
  const styles: Record<GradientType, string> = {
    green: 'bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700',
    blue: 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700',
    orange: 'bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700',
    cyan: 'bg-gradient-to-br from-cyan-500 to-cyan-600 dark:from-cyan-600 dark:to-cyan-700',
    pink: 'bg-gradient-to-br from-pink-500 to-pink-600 dark:from-pink-600 dark:to-pink-700',
  };
  return styles[gradient];
};

interface GradientCardProps {
  gradient: GradientType;
  children?: React.ReactNode;
  delay?: number;
  className?: string;
}

export const GradientCard = forwardRef<HTMLDivElement, GradientCardProps>(
  ({ className, gradient, children, delay = 0 }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease: 'easeOut' }}
        whileHover={{
          scale: 1.02,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          transition: { duration: 0.2 }
        }}
        className={clsx(
          'p-6 rounded-xl text-white shadow-lg transition-all duration-300',
          getGradientClass(gradient),
          className
        )}
      >
        {children}
      </motion.div>
    );
  }
);

GradientCard.displayName = 'GradientCard';

// Themed Card with color scheme support
interface ThemedCardProps extends HTMLAttributes<HTMLDivElement> {
  theme: CardColorTheme;
  isActive?: boolean;
  padding?: PaddingSize;
  glass?: boolean;
}

export const ThemedCard = forwardRef<HTMLDivElement, ThemedCardProps>(
  ({ className, theme, isActive = true, padding = 'md', glass = false, children, ...props }, ref) => {
    const colors = useCardTheme(theme, isActive);
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-lg border-2 transition-all duration-200',
          colors.cardBg,
          colors.cardBorder,
          glass && 'dark:backdrop-blur-xl',
          getPaddingClass(padding),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ThemedCard.displayName = 'ThemedCard';

// Feature Card - a pre-styled themed card for feature toggles (like subscriptions)
interface FeatureCardProps {
  theme: CardColorTheme;
  isActive?: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  inactiveBadge?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  inactiveText?: string;
  className?: string;
}

export const FeatureCard = ({
  theme,
  isActive = true,
  icon,
  title,
  description,
  badge = 'Active',
  inactiveBadge = 'Inactive',
  actionLabel,
  actionHref,
  onAction,
  inactiveText,
  className,
}: FeatureCardProps) => {
  const colors = useCardTheme(theme, isActive);

  return (
    <div
      className={clsx(
        'p-4 rounded-lg border-2 transition-all duration-200',
        colors.cardBg,
        colors.cardBorder,
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={clsx('p-2 rounded-lg', colors.iconBg)}>
            <span className={colors.iconColor}>{icon}</span>
          </div>
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
        </div>
        <span
          className={clsx(
            'px-2 py-1 text-xs font-medium rounded-full',
            colors.badgeBg,
            colors.badgeText
          )}
        >
          {isActive ? badge : inactiveBadge}
        </span>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{description}</p>
      {isActive && actionLabel && (
        actionHref ? (
          <a href={actionHref} className={clsx('text-sm font-medium', colors.linkColor)}>
            {actionLabel} →
          </a>
        ) : onAction ? (
          <button onClick={onAction} className={clsx('text-sm font-medium', colors.linkColor)}>
            {actionLabel} →
          </button>
        ) : null
      )}
      {!isActive && inactiveText && (
        <p className="text-xs text-gray-400">{inactiveText}</p>
      )}
    </div>
  );
};

// Themed Icon Container
interface ThemedIconProps {
  theme: CardColorTheme;
  isActive?: boolean;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ThemedIcon = ({ theme, isActive = true, children, size = 'md', className }: ThemedIconProps) => {
  const colors = useCardTheme(theme, isActive);
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  return (
    <div className={clsx('rounded-lg', sizeClasses[size], colors.iconBg, className)}>
      <span className={colors.iconColor}>{children}</span>
    </div>
  );
};

// Themed Badge
interface ThemedBadgeProps {
  theme: CardColorTheme;
  isActive?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const ThemedBadge = ({ theme, isActive = true, children, className }: ThemedBadgeProps) => {
  const colors = useCardTheme(theme, isActive);

  return (
    <span
      className={clsx(
        'px-2 py-1 text-xs font-medium rounded-full',
        colors.badgeBg,
        colors.badgeText,
        className
      )}
    >
      {children}
    </span>
  );
};

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={clsx('mb-4', className)} {...props}>
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3 ref={ref} className={clsx('text-lg font-semibold text-gray-900 dark:text-white', className)} {...props}>
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p ref={ref} className={clsx('text-sm text-gray-500 dark:text-gray-400 mt-1', className)} {...props}>
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

// Stagger container for animating multiple cards
export const CardContainer = ({
  children,
  className,
  staggerDelay = 0.1
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Card item variant for stagger animations
export const cardItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  },
};

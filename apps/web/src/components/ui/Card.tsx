import { HTMLAttributes, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';

// Padding styles type
type PaddingSize = 'none' | 'sm' | 'md' | 'lg';

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
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700',
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
  delay?: number;
  className?: string;
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ className, padding = 'md', children, hoverEffect = true, glowEffect = false, delay = 0 }, ref) => {
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
          'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700',
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

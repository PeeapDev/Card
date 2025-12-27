/**
 * PhoneFrame Component
 *
 * Wraps content in an iPhone-style frame on larger screens (tablet/laptop).
 * On mobile devices, the content fills the full screen without frame.
 * Smaller, more compact size with resize capability.
 */

import { ReactNode, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { clsx } from 'clsx';

interface PhoneFrameProps {
  children: ReactNode;
  className?: string;
  label?: string;
}

export function PhoneFrame({ children, className = '', label = 'Collection Mode' }: PhoneFrameProps) {
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');

  const sizeClasses = {
    small: 'w-[280px] h-[560px]',
    medium: 'w-[320px] h-[640px]',
    large: 'w-[360px] h-[720px]',
  };

  const radiusClasses = {
    small: 'rounded-[2.5rem]',
    medium: 'rounded-[2.8rem]',
    large: 'rounded-[3rem]',
  };

  const innerRadiusClasses = {
    small: 'rounded-[2.2rem]',
    medium: 'rounded-[2.5rem]',
    large: 'rounded-[2.8rem]',
  };

  return (
    <>
      {/* Mobile: Full screen - NO frame, just content */}
      <div className="md:hidden fixed inset-0 z-50">
        {children}
      </div>

      {/* Tablet/Desktop: Phone frame */}
      <div className="hidden md:flex fixed inset-0 bg-black/80 backdrop-blur-sm items-center justify-center p-4 z-50">
        <div className="relative flex flex-col items-center">
          {/* Size controls */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setSize('small')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                size === 'small'
                  ? 'bg-cyan-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              Small
            </button>
            <button
              onClick={() => setSize('medium')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                size === 'medium'
                  ? 'bg-cyan-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              Medium
            </button>
            <button
              onClick={() => setSize('large')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                size === 'large'
                  ? 'bg-cyan-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              Large
            </button>
          </div>

          {/* Phone frame */}
          <div className="relative">
            {/* Phone outer frame */}
            <div className={clsx(
              'relative bg-gray-900 p-1.5 shadow-2xl transition-all duration-300',
              sizeClasses[size],
              radiusClasses[size]
            )}>
              {/* Phone bezel */}
              <div className={clsx(
                'absolute inset-0 border-[2px] border-gray-700 pointer-events-none',
                radiusClasses[size]
              )} />

              {/* Dynamic Island */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-full z-20" />

              {/* Screen content area */}
              <div className={clsx(
                'relative w-full h-full bg-gray-900 overflow-hidden',
                innerRadiusClasses[size],
                className
              )}>
                {/* Screen content */}
                <div className="absolute inset-0 overflow-hidden">
                  {children}
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/30 rounded-full z-20" />
              </div>
            </div>

            {/* Side buttons - scaled down */}
            <div className="absolute left-[-2px] top-24 w-[2px] h-6 bg-gray-700 rounded-l-sm" />
            <div className="absolute left-[-2px] top-36 w-[2px] h-6 bg-gray-700 rounded-l-sm" />
            <div className="absolute right-[-2px] top-28 w-[2px] h-10 bg-gray-700 rounded-r-sm" />

            {/* Reflection overlay */}
            <div className={clsx(
              'absolute inset-0 pointer-events-none bg-gradient-to-br from-white/5 via-transparent to-transparent',
              radiusClasses[size]
            )} />
          </div>

          {/* Label below phone */}
          <div className="mt-4 text-gray-500 text-sm">
            {label}
          </div>
        </div>
      </div>
    </>
  );
}

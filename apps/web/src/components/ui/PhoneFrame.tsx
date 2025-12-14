/**
 * PhoneFrame Component
 *
 * Wraps content in an iPhone-style frame on larger screens (tablet/laptop).
 * On mobile devices, the content fills the full screen.
 */

import { ReactNode } from 'react';

interface PhoneFrameProps {
  children: ReactNode;
  className?: string;
}

export function PhoneFrame({ children, className = '' }: PhoneFrameProps) {
  return (
    <>
      {/* Mobile: Full screen */}
      <div className="md:hidden fixed inset-0">
        {children}
      </div>

      {/* Tablet/Desktop: Phone frame */}
      <div className="hidden md:flex fixed inset-0 bg-gray-100 dark:bg-gray-900 items-center justify-center p-8">
        {/* iPhone 16 Pro frame - 393x852 aspect ratio */}
        <div className="relative">
          {/* Phone outer frame */}
          <div className="relative w-[320px] h-[680px] lg:w-[393px] lg:h-[852px] bg-gray-900 rounded-[3rem] lg:rounded-[3.5rem] p-2 shadow-2xl">
            {/* Phone bezel */}
            <div className="absolute inset-0 rounded-[3rem] lg:rounded-[3.5rem] border-[3px] border-gray-700 pointer-events-none" />

            {/* Dynamic Island */}
            <div className="absolute top-4 lg:top-5 left-1/2 -translate-x-1/2 w-24 lg:w-28 h-7 lg:h-8 bg-black rounded-full z-20" />

            {/* Screen content area */}
            <div className={`relative w-full h-full bg-gray-900 rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden ${className}`}>
              {/* Screen content */}
              <div className="absolute inset-0 overflow-hidden">
                {children}
              </div>

              {/* Home indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 lg:w-36 h-1 bg-white/30 rounded-full z-20" />
            </div>
          </div>

          {/* Side buttons */}
          {/* Volume up */}
          <div className="absolute left-[-3px] top-28 lg:top-32 w-[3px] h-8 lg:h-10 bg-gray-700 rounded-l-sm" />
          {/* Volume down */}
          <div className="absolute left-[-3px] top-40 lg:top-48 w-[3px] h-8 lg:h-10 bg-gray-700 rounded-l-sm" />
          {/* Power button */}
          <div className="absolute right-[-3px] top-32 lg:top-40 w-[3px] h-12 lg:h-16 bg-gray-700 rounded-r-sm" />

          {/* Reflection overlay */}
          <div className="absolute inset-0 rounded-[3rem] lg:rounded-[3.5rem] pointer-events-none bg-gradient-to-br from-white/5 via-transparent to-transparent" />
        </div>

        {/* Label below phone */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-gray-500 text-sm">
          Driver Collection Mode
        </div>
      </div>
    </>
  );
}

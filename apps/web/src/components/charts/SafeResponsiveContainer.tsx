/**
 * SafeResponsiveContainer
 *
 * A wrapper around Recharts ResponsiveContainer that prevents the
 * "width(-1) and height(-1)" console warnings by only rendering
 * charts after the container has proper dimensions.
 *
 * This is especially useful when charts are inside animated containers
 * (like Framer Motion) where the parent may not have dimensions initially.
 */

import { useState, useEffect, useRef, ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';

interface SafeResponsiveContainerProps {
  width?: string | number;
  height?: string | number;
  children: ReactNode;
  className?: string;
  debounceDelay?: number;
}

export function SafeResponsiveContainer({
  width = '100%',
  height = '100%',
  children,
  className,
  debounceDelay = 50,
}: SafeResponsiveContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const checkDimensions = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
        setIsReady(true);
      }
    };

    // Initial check with a small delay to allow animations to start
    timeoutId = setTimeout(checkDimensions, debounceDelay);

    // Use ResizeObserver for subsequent updates
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setDimensions({ width: w, height: h });
            setIsReady(true);
          }, debounceDelay);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [debounceDelay]);

  return (
    <div ref={containerRef} className={className} style={{ width, height }}>
      {isReady ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {children}
        </ResponsiveContainer>
      ) : (
        // Skeleton placeholder while waiting for dimensions
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg w-full h-full" />
        </div>
      )}
    </div>
  );
}

export default SafeResponsiveContainer;

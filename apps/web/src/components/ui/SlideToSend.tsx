/**
 * Slide to Send Component
 *
 * A secure slide-to-confirm action button that prevents accidental payments
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, ChevronRight, Check, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface SlideToSendProps {
  amount: string;
  recipientName: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  isProcessing?: boolean;
}

export function SlideToSend({
  amount,
  recipientName,
  onConfirm,
  disabled = false,
  isProcessing = false,
}: SlideToSendProps) {
  const [sliderPosition, setSliderPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const sliderPositionRef = useRef(0);

  const THRESHOLD = 85; // Percentage needed to confirm

  // Keep ref in sync with state
  useEffect(() => {
    sliderPositionRef.current = sliderPosition;
  }, [sliderPosition]);

  // Reset when processing completes
  useEffect(() => {
    if (!isProcessing && isComplete) {
      const timer = setTimeout(() => {
        setIsComplete(false);
        setSliderPosition(0);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isProcessing, isComplete]);

  const getMaxPosition = useCallback(() => {
    if (!containerRef.current) return 200;
    return containerRef.current.offsetWidth - 64 - 8; // sliderWidth(64) + padding(8)
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!isDraggingRef.current || !containerRef.current || disabled || isProcessing) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const maxPosition = getMaxPosition();
    const newPosition = Math.max(0, Math.min(clientX - containerRect.left - 32, maxPosition));
    const percentage = (newPosition / maxPosition) * 100;

    setSliderPosition(percentage);
    sliderPositionRef.current = percentage;
  }, [disabled, isProcessing, getMaxPosition]);

  const handleEnd = useCallback(async () => {
    if (!isDraggingRef.current) return;

    const currentPosition = sliderPositionRef.current;
    isDraggingRef.current = false;
    setIsDragging(false);

    if (currentPosition >= THRESHOLD && !disabled && !isProcessing) {
      setIsComplete(true);
      setSliderPosition(100);
      try {
        await onConfirm();
      } catch (error) {
        console.error('Confirm error:', error);
        setIsComplete(false);
        setSliderPosition(0);
      }
    } else {
      // Animate back to start
      setSliderPosition(0);
    }
  }, [disabled, isProcessing, onConfirm]);

  const handleStart = useCallback((clientX: number) => {
    if (disabled || isProcessing || isComplete) return;
    isDraggingRef.current = true;
    setIsDragging(true);
  }, [disabled, isProcessing, isComplete]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  // Global event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        handleMove(e.clientX);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        handleEnd();
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches[0]) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isDraggingRef.current) {
        handleEnd();
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
    window.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [handleMove, handleEnd]);

  const sliderTranslateX = (sliderPosition / 100) * getMaxPosition();

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative h-16 rounded-2xl overflow-hidden select-none',
        disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-grab',
        isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-primary-600 to-primary-500'
      )}
    >
      {/* Background text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 text-white/80 font-medium">
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : isComplete ? (
            <>
              <Check className="w-5 h-5" />
              <span>Sent!</span>
            </>
          ) : (
            <>
              <span>Slide to send ${parseFloat(amount).toFixed(2)}</span>
              <ChevronRight className="w-5 h-5 animate-pulse" />
            </>
          )}
        </div>
      </div>

      {/* Progress fill */}
      <div
        className={clsx(
          'absolute inset-y-0 left-0 transition-all duration-100',
          isComplete ? 'bg-green-600' : 'bg-primary-700/30'
        )}
        style={{ width: `${sliderPosition}%` }}
      />

      {/* Slider thumb */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={clsx(
          'absolute top-1 bottom-1 left-1 w-14 rounded-xl flex items-center justify-center',
          isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab',
          isComplete ? 'bg-white' : 'bg-white shadow-lg',
          disabled || isProcessing ? 'pointer-events-none' : ''
        )}
        style={{
          transform: `translateX(${sliderTranslateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {isProcessing ? (
          <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
        ) : isComplete ? (
          <Check className="w-6 h-6 text-green-600" />
        ) : (
          <Send className="w-6 h-6 text-primary-600" />
        )}
      </div>
    </div>
  );
}

export default SlideToSend;

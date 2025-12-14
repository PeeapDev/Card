/**
 * Polling Utilities with Exponential Backoff
 *
 * Provides polling utilities that implement exponential backoff
 * to reduce server load and improve battery life on mobile devices.
 */

export interface PollingOptions {
  /** Initial interval in milliseconds (default: 2000) */
  initialInterval?: number;
  /** Maximum interval in milliseconds (default: 30000) */
  maxInterval?: number;
  /** Multiplier for exponential backoff (default: 1.5) */
  backoffMultiplier?: number;
  /** Maximum number of retries before stopping (default: unlimited) */
  maxRetries?: number;
  /** Reset interval to initial on success (default: true) */
  resetOnSuccess?: boolean;
  /** Callback when max retries reached */
  onMaxRetries?: () => void;
}

export interface PollingController {
  /** Stop polling */
  stop: () => void;
  /** Reset interval to initial value */
  reset: () => void;
  /** Whether polling is currently active */
  isActive: () => boolean;
  /** Get current interval */
  getCurrentInterval: () => number;
}

/**
 * Create a polling function with exponential backoff
 *
 * @param callback - Async function to poll. Return true to reset interval, false to increase it.
 * @param options - Polling configuration options
 * @returns Controller object to manage the polling
 *
 * @example
 * ```typescript
 * const { stop, reset } = createPollingWithBackoff(
 *   async () => {
 *     const result = await checkStatus();
 *     return result.hasChanges; // Return true to reset, false to back off
 *   },
 *   { initialInterval: 2000, maxInterval: 30000 }
 * );
 *
 * // Later: stop polling
 * stop();
 * ```
 */
export function createPollingWithBackoff(
  callback: () => Promise<boolean>,
  options: PollingOptions = {}
): PollingController {
  const {
    initialInterval = 2000,
    maxInterval = 30000,
    backoffMultiplier = 1.5,
    maxRetries,
    resetOnSuccess = true,
    onMaxRetries,
  } = options;

  let currentInterval = initialInterval;
  let retryCount = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let isRunning = true;

  const poll = async () => {
    if (!isRunning) return;

    try {
      const shouldReset = await callback();

      if (shouldReset && resetOnSuccess) {
        currentInterval = initialInterval;
        retryCount = 0;
      } else {
        // Exponential backoff
        currentInterval = Math.min(currentInterval * backoffMultiplier, maxInterval);
        retryCount++;
      }

      // Check max retries
      if (maxRetries !== undefined && retryCount >= maxRetries) {
        isRunning = false;
        onMaxRetries?.();
        return;
      }
    } catch {
      // On error, back off
      currentInterval = Math.min(currentInterval * backoffMultiplier, maxInterval);
      retryCount++;
    }

    if (isRunning) {
      timeoutId = setTimeout(poll, currentInterval);
    }
  };

  // Start polling
  timeoutId = setTimeout(poll, currentInterval);

  return {
    stop: () => {
      isRunning = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
    reset: () => {
      currentInterval = initialInterval;
      retryCount = 0;
    },
    isActive: () => isRunning,
    getCurrentInterval: () => currentInterval,
  };
}

/**
 * Simple polling with fixed interval and cleanup
 *
 * @param callback - Function to call on each interval
 * @param interval - Interval in milliseconds
 * @returns Cleanup function
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   return createSimplePolling(() => fetchData(), 5000);
 * }, []);
 * ```
 */
export function createSimplePolling(
  callback: () => void | Promise<void>,
  interval: number
): () => void {
  const intervalId = setInterval(callback, interval);
  return () => clearInterval(intervalId);
}

/**
 * Visibility-aware polling that pauses when tab is hidden
 * Useful for reducing resource usage on inactive tabs
 *
 * @param callback - Function to poll
 * @param options - Polling options
 * @returns Cleanup function
 */
export function createVisibilityAwarePolling(
  callback: () => Promise<boolean>,
  options: PollingOptions = {}
): () => void {
  let controller: PollingController | null = null;

  const startPolling = () => {
    if (!controller || !controller.isActive()) {
      controller = createPollingWithBackoff(callback, options);
    }
  };

  const stopPolling = () => {
    controller?.stop();
    controller = null;
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      startPolling();
    } else {
      stopPolling();
    }
  };

  // Start polling if currently visible
  if (document.visibilityState === 'visible') {
    startPolling();
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    stopPolling();
  };
}

/**
 * React hook for exponential backoff polling
 * Automatically cleans up on unmount
 *
 * Usage:
 * ```typescript
 * import { usePolling } from '@/utils/polling';
 *
 * function Component() {
 *   const { stop, reset } = usePolling(
 *     async () => {
 *       const data = await fetchStatus();
 *       return data.hasChanges;
 *     },
 *     { initialInterval: 2000 }
 *   );
 *
 *   // stop() on some condition
 *   // reset() to reset interval
 * }
 * ```
 */

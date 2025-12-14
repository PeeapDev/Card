/**
 * Logger Service
 *
 * A centralized logging service that:
 * - Only logs in development environment
 * - Provides structured logging with levels
 * - Can be extended to send logs to external services in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: Date;
  context?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  private shouldLog(level: LogLevel): boolean {
    // Always log errors and warnings
    if (level === 'error' || level === 'warn') return true;
    // Only log debug/info in development
    return this.isDevelopment;
  }

  private addToHistory(entry: LogEntry) {
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  private formatMessage(context: string | undefined, message: string): string {
    return context ? `[${context}] ${message}` : message;
  }

  debug(message: string, data?: unknown, context?: string) {
    const entry: LogEntry = {
      level: 'debug',
      message,
      data,
      timestamp: new Date(),
      context,
    };
    this.addToHistory(entry);

    if (this.shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.log(this.formatMessage(context, message), data !== undefined ? data : '');
    }
  }

  info(message: string, data?: unknown, context?: string) {
    const entry: LogEntry = {
      level: 'info',
      message,
      data,
      timestamp: new Date(),
      context,
    };
    this.addToHistory(entry);

    if (this.shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.info(this.formatMessage(context, message), data !== undefined ? data : '');
    }
  }

  warn(message: string, data?: unknown, context?: string) {
    const entry: LogEntry = {
      level: 'warn',
      message,
      data,
      timestamp: new Date(),
      context,
    };
    this.addToHistory(entry);

    if (this.shouldLog('warn')) {
      // eslint-disable-next-line no-console
      console.warn(this.formatMessage(context, message), data !== undefined ? data : '');
    }
  }

  error(message: string, error?: unknown, context?: string) {
    const entry: LogEntry = {
      level: 'error',
      message,
      data: error,
      timestamp: new Date(),
      context,
    };
    this.addToHistory(entry);

    if (this.shouldLog('error')) {
      // eslint-disable-next-line no-console
      console.error(this.formatMessage(context, message), error !== undefined ? error : '');
    }
  }

  // Get recent logs for debugging
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  // Clear log history
  clearHistory() {
    this.logHistory = [];
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  debug: (message: string, data?: unknown, context?: string) =>
    logger.debug(message, data, context),
  info: (message: string, data?: unknown, context?: string) =>
    logger.info(message, data, context),
  warn: (message: string, data?: unknown, context?: string) =>
    logger.warn(message, data, context),
  error: (message: string, error?: unknown, context?: string) =>
    logger.error(message, error, context),
};

export default logger;

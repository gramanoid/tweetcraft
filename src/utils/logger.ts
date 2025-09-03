/**
 * Enhanced production-aware logger utility
 * Provides compact, grouped logging with conditional output
 */

// Determine if we're in production based on Chrome extension manifest
const getIsProduction = (): boolean => {
  try {
    // Check if extension has an update URL (typically indicates production)
    const manifest = chrome.runtime.getManifest();
    // Production builds typically have version_name or are installed from store
    // Development builds are typically loaded unpacked
    return !!(manifest as any).update_url;
  } catch {
    // If we can't determine, assume production for safety
    return true;
  }
};

const IS_PRODUCTION = getIsProduction();

// Log level configuration
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Current log level (can be configured)
const CURRENT_LOG_LEVEL = IS_PRODUCTION ? LogLevel.ERROR : LogLevel.DEBUG;

// Compact logging configuration
const COMPACT_MODE = true; // Enable compact mode
const MAX_DATA_LENGTH = 100; // Max length for logged data in compact mode

// Color palette for consistent styling
const COLORS = {
  primary: '#1DA1F2',   // Twitter blue
  success: '#17BF63',   // Green
  error: '#DC3545',     // Red
  warning: '#FFA500',   // Orange
  info: '#9146FF',      // Purple
  debug: '#657786',     // Gray
};

/**
 * Truncate long strings/objects for compact mode
 */
const truncate = (data: any, maxLength: number = MAX_DATA_LENGTH): string => {
  const str = typeof data === 'object' ? JSON.stringify(data) : String(data);
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
};

/**
 * Format log message with optional styling
 */
const formatLog = (prefix: string, color: string, ...args: any[]): any[] => {
  if (!COMPACT_MODE) return args;
  
  const formattedArgs = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      return truncate(arg);
    }
    return arg;
  });
  
  return [`%c${prefix}`, `color: ${color}; font-weight: bold`, ...formattedArgs];
};

/**
 * Production-aware logger with conditional output
 */
export const logger = {
  /**
   * Debug level logging - only in development
   */
  debug: (...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG && !IS_PRODUCTION) {
      const logArgs = COMPACT_MODE ? formatLog('[DEBUG]', COLORS.debug, ...args) : args;
      console.log(...logArgs);
    }
  },

  /**
   * Info level logging - only in development
   */
  log: (...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.INFO && !IS_PRODUCTION) {
      const logArgs = COMPACT_MODE ? formatLog('[LOG]', COLORS.primary, ...args) : args;
      console.log(...logArgs);
    }
  },

  /**
   * Info level logging - only in development
   */
  info: (...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.INFO && !IS_PRODUCTION) {
      const logArgs = COMPACT_MODE ? formatLog('[INFO]', COLORS.info, ...args) : args;
      console.info(...logArgs);
    }
  },

  /**
   * Warning level logging - only in development
   */
  warn: (...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.WARN && !IS_PRODUCTION) {
      const logArgs = COMPACT_MODE ? formatLog('[WARN]', COLORS.warning, ...args) : args;
      console.warn(...logArgs);
    }
  },

  /**
   * Error level logging - always enabled
   */
  error: (...args: any[]): void => {
    // Always log errors, even in production
    const logArgs = COMPACT_MODE ? formatLog('[ERROR]', COLORS.error, ...args) : args;
    console.error(...logArgs);
  },

  /**
   * Group logging - only in development
   */
  group: (...args: any[]): void => {
    if (!IS_PRODUCTION) {
      console.group(...args);
    }
  },

  /**
   * Group collapsed logging - only in development
   */
  groupCollapsed: (...args: any[]): void => {
    if (!IS_PRODUCTION) {
      console.groupCollapsed(...args);
    }
  },

  /**
   * Group end - only in development
   */
  groupEnd: (): void => {
    if (!IS_PRODUCTION) {
      console.groupEnd();
    }
  },

  /**
   * Table logging - only in development
   */
  table: (...args: any[]): void => {
    if (!IS_PRODUCTION) {
      console.table(...args);
    }
  },

  /**
   * Time logging - only in development
   */
  time: (label?: string): void => {
    if (!IS_PRODUCTION) {
      console.time(label);
    }
  },

  /**
   * Time end logging - only in development
   */
  timeEnd: (label?: string): void => {
    if (!IS_PRODUCTION) {
      console.timeEnd(label);
    }
  },

  /**
   * Check if logging is enabled
   */
  isEnabled: (): boolean => {
    return !IS_PRODUCTION;
  },

  /**
   * Get current environment
   */
  getEnvironment: (): string => {
    return IS_PRODUCTION ? 'production' : 'development';
  },

  /**
   * Success logging - only in development
   */
  success: (...args: any[]): void => {
    if (!IS_PRODUCTION) {
      const logArgs = COMPACT_MODE ? formatLog('[SUCCESS]', COLORS.success, ...args) : args;
      console.log(...logArgs);
    }
  },

  /**
   * Compact logging for high-frequency events
   */
  compact: (category: string, message: string, data?: any): void => {
    if (!IS_PRODUCTION) {
      const truncatedData = data ? truncate(data, 50) : '';
      console.log(`%c[${category}]`, `color: ${COLORS.primary}; font-size: 11px`, message, truncatedData);
    }
  },

  /**
   * Feature logging with styled output
   */
  feature: (name: string, details: Record<string, any>): void => {
    if (!IS_PRODUCTION) {
      console.log(`%c🚀 ${name}`, 'color: #1DA1F2; font-weight: bold; font-size: 14px');
      Object.entries(details).forEach(([key, value]) => {
        const displayValue = COMPACT_MODE && typeof value === 'object' ? truncate(value) : value;
        console.log(`%c  ${key}:`, 'color: #657786', displayValue);
      });
    }
  },

  /**
   * Performance timing helper
   */
  perf: (label: string, fn: () => void): void => {
    if (!IS_PRODUCTION) {
      const start = performance.now();
      fn();
      const duration = (performance.now() - start).toFixed(2);
      console.log(`%c⚡ ${label}`, 'color: #FFA500; font-size: 11px', `${duration}ms`);
    }
  }
};

// Export a default instance
export default logger;
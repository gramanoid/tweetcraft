/**
 * Production-aware logger utility
 * Conditionally outputs logs based on environment
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

/**
 * Production-aware logger with conditional output
 */
export const logger = {
  /**
   * Debug level logging - only in development
   */
  debug: (...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG && !IS_PRODUCTION) {
      console.log(...args);
    }
  },

  /**
   * Info level logging - only in development
   */
  log: (...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.INFO && !IS_PRODUCTION) {
      console.log(...args);
    }
  },

  /**
   * Info level logging - only in development
   */
  info: (...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.INFO && !IS_PRODUCTION) {
      console.info(...args);
    }
  },

  /**
   * Warning level logging - only in development
   */
  warn: (...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.WARN && !IS_PRODUCTION) {
      console.warn(...args);
    }
  },

  /**
   * Error level logging - always enabled
   */
  error: (...args: any[]): void => {
    // Always log errors, even in production
    console.error(...args);
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
  }
};

// Export a default instance
export default logger;
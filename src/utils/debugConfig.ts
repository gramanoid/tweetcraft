/**
 * Debug Configuration for TweetCraft
 * Controls console logging verbosity throughout the extension
 */

interface DebugConfig {
  enabled: boolean;
  logLevel: 'verbose' | 'info' | 'warning' | 'error';
  categories: {
    api: boolean;
    cache: boolean;
    dom: boolean;
    messaging: boolean;
    performance: boolean;
    ui: boolean;
    all: boolean;
  };
}

class DebugManager {
  private config: DebugConfig = {
    enabled: false, // Set to true during development
    logLevel: 'info',
    categories: {
      api: true,
      cache: true,
      dom: true,
      messaging: true,
      performance: true,
      ui: true,
      all: false // Override to enable all categories
    }
  };

  constructor() {
    // Load debug settings from localStorage if available
    this.loadSettings();
    
    // Expose debug controls to window for easy runtime toggling
    if (typeof window !== 'undefined') {
      (window as any).tweetcraftDebug = {
        enable: () => this.enable(),
        disable: () => this.disable(),
        setLevel: (level: string) => this.setLogLevel(level as any),
        enableCategory: (category: string) => this.enableCategory(category),
        disableCategory: (category: string) => this.disableCategory(category),
        status: () => this.getStatus()
      };
    }
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('tweetcraft_debug_config');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        this.config = { ...this.config, ...parsedConfig };
      }
    } catch (error) {
      // Silent fail - use defaults
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('tweetcraft_debug_config', JSON.stringify(this.config));
    } catch (error) {
      // Silent fail
    }
  }

  enable(): void {
    this.config.enabled = true;
    this.saveSettings();
    console.log('%c🐛 Debug Mode: ENABLED', 'color: #17BF63; font-weight: bold');
  }

  disable(): void {
    this.config.enabled = false;
    this.saveSettings();
    console.log('%c🐛 Debug Mode: DISABLED', 'color: #DC3545; font-weight: bold');
  }

  setLogLevel(level: 'verbose' | 'info' | 'warning' | 'error'): void {
    this.config.logLevel = level;
    this.saveSettings();
    console.log(`%c🐛 Log Level: ${level.toUpperCase()}`, 'color: #1DA1F2; font-weight: bold');
  }

  enableCategory(category: string): void {
    if (category in this.config.categories) {
      (this.config.categories as any)[category] = true;
      this.saveSettings();
      console.log(`%c🐛 Category Enabled: ${category}`, 'color: #17BF63');
    }
  }

  disableCategory(category: string): void {
    if (category in this.config.categories) {
      (this.config.categories as any)[category] = false;
      this.saveSettings();
      console.log(`%c🐛 Category Disabled: ${category}`, 'color: #FFA500');
    }
  }

  getStatus(): DebugConfig {
    return { ...this.config };
  }

  shouldLog(category: keyof DebugConfig['categories'], level: 'verbose' | 'info' | 'warning' | 'error' = 'info'): boolean {
    if (!this.config.enabled) return false;
    
    // Check category
    if (!this.config.categories.all && !this.config.categories[category]) {
      return false;
    }

    // Check log level
    const levels = ['verbose', 'info', 'warning', 'error'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= configLevelIndex;
  }

  /**
   * Conditional console.log wrapper
   */
  log(category: keyof DebugConfig['categories'], level: 'verbose' | 'info' | 'warning' | 'error', ...args: any[]): void {
    if (this.shouldLog(category, level)) {
      console.log(...args);
    }
  }

  /**
   * Conditional console.warn wrapper
   */
  warn(category: keyof DebugConfig['categories'], ...args: any[]): void {
    if (this.shouldLog(category, 'warning')) {
      console.warn(...args);
    }
  }

  /**
   * Conditional console.error wrapper
   */
  error(category: keyof DebugConfig['categories'], ...args: any[]): void {
    if (this.shouldLog(category, 'error')) {
      console.error(...args);
    }
  }

  /**
   * Conditional console.group wrapper
   */
  group(category: keyof DebugConfig['categories'], label: string): void {
    if (this.shouldLog(category, 'verbose')) {
      console.group(label);
    }
  }

  /**
   * Conditional console.groupEnd wrapper
   */
  groupEnd(category: keyof DebugConfig['categories']): void {
    if (this.shouldLog(category, 'verbose')) {
      console.groupEnd();
    }
  }

  /**
   * Performance timing wrapper
   */
  time(category: keyof DebugConfig['categories'], label: string): void {
    if (this.shouldLog(category, 'verbose')) {
      console.time(label);
    }
  }

  timeEnd(category: keyof DebugConfig['categories'], label: string): void {
    if (this.shouldLog(category, 'verbose')) {
      console.timeEnd(label);
    }
  }

  /**
   * Convenience methods for logging errors and warnings
   */
  logError(...args: any[]): void {
    this.error('all', ...args);
  }

  logWarn(...args: any[]): void {
    this.warn('all', ...args);
  }
}

// Export singleton instance
export const debug = new DebugManager();

// Export convenience functions for common use cases
export const logAPI = (...args: any[]) => debug.log('api', 'info', ...args);
export const logCache = (...args: any[]) => debug.log('cache', 'info', ...args);
export const logDOM = (...args: any[]) => debug.log('dom', 'info', ...args);
export const logMessage = (...args: any[]) => debug.log('messaging', 'info', ...args);
export const logPerf = (...args: any[]) => debug.log('performance', 'verbose', ...args);
export const logUI = (...args: any[]) => debug.log('ui', 'info', ...args);
export const logError = (...args: any[]) => debug.error('all', ...args);
export const logWarn = (...args: any[]) => debug.warn('all', ...args);

// Usage instructions comment
/**
 * Debug Control from Browser Console:
 * 
 * Enable debug mode:
 *   tweetcraftDebug.enable()
 * 
 * Disable debug mode:
 *   tweetcraftDebug.disable()
 * 
 * Set log level ('verbose', 'info', 'warning', 'error'):
 *   tweetcraftDebug.setLevel('verbose')
 * 
 * Enable specific category:
 *   tweetcraftDebug.enableCategory('api')
 * 
 * Disable specific category:
 *   tweetcraftDebug.disableCategory('cache')
 * 
 * Check current status:
 *   tweetcraftDebug.status()
 */
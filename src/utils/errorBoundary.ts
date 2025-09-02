/**
 * Error Boundary System for TweetCraft
 * Provides comprehensive error handling with recovery strategies
 */

import { logger } from '@/utils/logger';

interface ErrorContext {
  component: string;
  action: string;
  data?: any;
  userId?: string;
  timestamp: number;
}

interface ErrorReport {
  message: string;
  stack?: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recovered: boolean;
}

export class ErrorBoundary {
  private static errors: ErrorReport[] = [];
  private static readonly MAX_ERRORS = 50;
  private static errorHandlers = new Map<string, (error: Error, context: ErrorContext) => void>();
  private static recoveryStrategies = new Map<string, () => Promise<boolean>>();
  
  /**
   * Initialize error boundary
   */
  static initialize(): void {
    // Set up global error handlers
    this.setupGlobalHandlers();
    
    // Register default recovery strategies
    this.registerDefaultRecoveryStrategies();
    
    logger.log('🛡️ Error boundary initialized');
  }
  
  /**
   * Set up global error handlers
   */
  private static setupGlobalHandlers(): void {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.handleError(new Error(event.message), {
        component: 'global',
        action: 'uncaught',
        timestamp: Date.now()
      });
      event.preventDefault();
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(event.reason?.message || 'Unhandled promise rejection'), {
        component: 'promise',
        action: 'rejection',
        data: event.reason,
        timestamp: Date.now()
      });
      event.preventDefault();
    });
  }
  
  /**
   * Register default recovery strategies
   */
  private static registerDefaultRecoveryStrategies(): void {
    // Recovery strategy for DOM errors
    this.recoveryStrategies.set('dom_error', async () => {
      try {
        // Wait for DOM to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Re-inject buttons if missing
        const buttons = document.querySelectorAll('.smart-reply-btn');
        if (buttons.length === 0) {
          logger.warn('No smart reply buttons found, attempting re-injection');
          // Trigger re-injection through content script
          window.dispatchEvent(new CustomEvent('smartReply:reinject'));
        }
        
        return true;
      } catch {
        return false;
      }
    });
    
    // Recovery strategy for API errors
    this.recoveryStrategies.set('api_error', async () => {
      try {
        // Clear cache
        sessionStorage.removeItem('smartReplyCache');
        
        // Reset rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return true;
      } catch {
        return false;
      }
    });
    
    // Recovery strategy for storage errors
    this.recoveryStrategies.set('storage_error', async () => {
      try {
        // Clear corrupted data
        const keysToCheck = ['smartReply_config', 'smartReply_cache', 'smartReply_state'];
        
        for (const key of keysToCheck) {
          try {
            const data = await chrome.storage.local.get(key);
            if (data[key] && typeof data[key] === 'string') {
              // Try to parse to check if it's valid JSON
              JSON.parse(data[key]);
            }
          } catch {
            // Remove corrupted data
            await chrome.storage.local.remove(key);
            logger.warn(`Removed corrupted storage key: ${key}`);
          }
        }
        
        return true;
      } catch {
        return false;
      }
    });
  }
  
  /**
   * Handle an error with context
   */
  static async handleError(
    error: Error,
    context: ErrorContext,
    severity: ErrorReport['severity'] = 'medium'
  ): Promise<void> {
    // Create error report
    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      context,
      severity,
      recovered: false
    };
    
    // Log the error
    this.logError(report);
    
    // Store error for analysis
    this.storeError(report);
    
    // Try recovery strategies
    const recovered = await this.attemptRecovery(error, context);
    report.recovered = recovered;
    
    // Call custom error handlers
    const handler = this.errorHandlers.get(context.component);
    if (handler) {
      handler(error, context);
    }
    
    // Send telemetry if critical
    if (severity === 'critical' && !recovered) {
      this.sendErrorTelemetry(report);
    }
  }
  
  /**
   * Log error based on severity
   */
  private static logError(report: ErrorReport): void {
    const { message, context, severity } = report;
    const logMessage = `[${context.component}:${context.action}] ${message}`;
    
    switch (severity) {
      case 'critical':
        logger.error('🔴 CRITICAL ERROR:', logMessage, report);
        break;
      case 'high':
        logger.error('🟠 HIGH ERROR:', logMessage, report);
        break;
      case 'medium':
        logger.warn('🟡 MEDIUM ERROR:', logMessage, report);
        break;
      case 'low':
        logger.debug('🟢 LOW ERROR:', logMessage, report);
        break;
    }
  }
  
  /**
   * Store error for analysis
   */
  private static storeError(report: ErrorReport): void {
    this.errors.push(report);
    
    // Keep only recent errors
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors.shift();
    }
    
    // Store in local storage for persistence
    try {
      chrome.storage.local.set({
        'smartReply_errors': this.errors.slice(-10) // Keep last 10 errors
      });
    } catch {
      // Ignore storage errors here to prevent recursion
    }
  }
  
  /**
   * Attempt recovery based on error type
   */
  private static async attemptRecovery(
    error: Error,
    context: ErrorContext
  ): Promise<boolean> {
    // Determine recovery strategy based on error type
    let strategyKey = 'default';
    
    if (error.message.includes('DOM') || error.message.includes('element')) {
      strategyKey = 'dom_error';
    } else if (error.message.includes('API') || error.message.includes('fetch')) {
      strategyKey = 'api_error';
    } else if (error.message.includes('storage')) {
      strategyKey = 'storage_error';
    }
    
    const strategy = this.recoveryStrategies.get(strategyKey);
    if (strategy) {
      try {
        const recovered = await strategy();
        if (recovered) {
          logger.log(`✅ Successfully recovered from ${strategyKey}`);
        }
        return recovered;
      } catch (recoveryError) {
        logger.error('Recovery strategy failed:', recoveryError);
        return false;
      }
    }
    
    return false;
  }
  
  /**
   * Send error telemetry (placeholder for future implementation)
   */
  private static sendErrorTelemetry(report: ErrorReport): void {
    // In production, this would send to an error tracking service
    logger.debug('Would send telemetry:', report);
  }
  
  /**
   * Register a custom error handler for a component
   */
  static registerErrorHandler(
    component: string,
    handler: (error: Error, context: ErrorContext) => void
  ): void {
    this.errorHandlers.set(component, handler);
  }
  
  /**
   * Register a custom recovery strategy
   */
  static registerRecoveryStrategy(
    key: string,
    strategy: () => Promise<boolean>
  ): void {
    this.recoveryStrategies.set(key, strategy);
  }
  
  /**
   * Wrap a function with error boundary
   */
  static wrap<T extends (...args: any[]) => any>(
    fn: T,
    component: string,
    action: string
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args);
        
        // Handle async functions
        if (result instanceof Promise) {
          return result.catch(error => {
            this.handleError(error, {
              component,
              action,
              data: args,
              timestamp: Date.now()
            });
            throw error;
          });
        }
        
        return result;
      } catch (error) {
        this.handleError(error as Error, {
          component,
          action,
          data: args,
          timestamp: Date.now()
        });
        throw error;
      }
    }) as T;
  }
  
  /**
   * Get error statistics
   */
  static getStatistics(): {
    total: number;
    bySeverity: Record<string, number>;
    byComponent: Record<string, number>;
    recoveryRate: number;
  } {
    const stats = {
      total: this.errors.length,
      bySeverity: {} as Record<string, number>,
      byComponent: {} as Record<string, number>,
      recoveryRate: 0
    };
    
    let recoveredCount = 0;
    
    this.errors.forEach(error => {
      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // Count by component
      stats.byComponent[error.context.component] = 
        (stats.byComponent[error.context.component] || 0) + 1;
      
      // Count recovered
      if (error.recovered) {
        recoveredCount++;
      }
    });
    
    // Calculate recovery rate
    if (this.errors.length > 0) {
      stats.recoveryRate = (recoveredCount / this.errors.length) * 100;
    }
    
    return stats;
  }
  
  /**
   * Clear error history
   */
  static clearErrors(): void {
    this.errors = [];
    chrome.storage.local.remove('smartReply_errors');
    logger.log('Error history cleared');
  }
}

// Export wrapped version of common functions
export const withErrorBoundary = ErrorBoundary.wrap.bind(ErrorBoundary);
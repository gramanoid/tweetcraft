/**
 * Enhanced Error Handler with Recovery Strategies
 * Provides automatic recovery, retry logic, and user-friendly error messages
 */

import { memoryManager } from './memoryManager';

// Error types and interfaces
interface ErrorContext {
  action: string;
  component?: string;
  retryAction?: () => Promise<any>;
  metadata?: Record<string, any>;
  data?: any;
}

interface ErrorLog {
  timestamp: number;
  error: string;
  stack?: string;
  context: ErrorContext;
  resolved?: boolean;
}

interface RecoveryStrategy {
  recoverable: boolean;
  action: 'retry' | 'reinject' | 'reauth' | 'refresh' | 'log';
  delay?: number;
  userMessage: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errors: ErrorLog[] = [];
  private maxRetries = 3;
  private retryDelays = [1000, 2000, 4000]; // Exponential backoff
  private retryAttempts = new Map<string, number>();

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    memoryManager.addEventListener(window, 'unhandledrejection', (event) => {
      const promiseEvent = event as PromiseRejectionEvent;
      console.error('❌ Unhandled Promise Rejection:', promiseEvent.reason);
      this.handleError(
        new Error(promiseEvent.reason?.message || 'Unhandled promise rejection'),
        { action: 'unhandled_promise' }
      );
      promiseEvent.preventDefault();
    });

    // Handle general errors
    memoryManager.addEventListener(window, 'error', (event) => {
      const errorEvent = event as ErrorEvent;
      console.error('❌ Global Error:', errorEvent.error);
      this.handleError(
        errorEvent.error || new Error(errorEvent.message),
        { action: 'global_error' }
      );
    });
  }

  /**
   * Main error handling method
   */
  async handleError(error: Error, context: ErrorContext): Promise<void> {
    // Log error with structured format
    console.log('%c❌ ERROR HANDLER', 'color: #DC3545; font-weight: bold; font-size: 14px');
    console.log('%c  Error:', 'color: #657786', error.message);
    console.log('%c  Component:', 'color: #657786', context.component || 'Unknown');
    console.log('%c  Action:', 'color: #657786', context.action);
    console.log('%c  Stack:', 'color: #657786', error.stack);

    // Store error log
    this.errors.push({
      timestamp: Date.now(),
      error: error.message,
      stack: error.stack,
      context,
      resolved: false
    });

    // Determine error type and recovery strategy
    const strategy = this.getRecoveryStrategy(error, context);

    console.log('%c🔧 RECOVERY STRATEGY', 'color: #FFA500; font-weight: bold');
    console.log('%c  Recoverable:', 'color: #657786', strategy.recoverable);
    console.log('%c  Action:', 'color: #657786', strategy.action);
    console.log('%c  Message:', 'color: #657786', strategy.userMessage);

    if (strategy.recoverable) {
      await this.attemptRecovery(strategy, context, error);
    } else {
      this.showUserError(strategy.userMessage, 'error');
    }
  }

  /**
   * Determine recovery strategy based on error type
   */
  private getRecoveryStrategy(error: Error, context: ErrorContext): RecoveryStrategy {
    const errorMessage = error.message.toLowerCase();

    // API/Network errors
    if (errorMessage.includes('api') || errorMessage.includes('openrouter')) {
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        return {
          recoverable: true,
          action: 'retry',
          delay: 60000,
          userMessage: 'Rate limited. Waiting before retry...'
        };
      }
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        return {
          recoverable: false,
          action: 'reauth',
          userMessage: 'API key invalid. Please check your settings.'
        };
      }
      if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
        return {
          recoverable: true,
          action: 'retry',
          delay: 5000,
          userMessage: 'Server error. Retrying...'
        };
      }
    }

    // DOM/Twitter interface errors
    if (errorMessage.includes('dom') || errorMessage.includes('element not found') || 
        errorMessage.includes('cannot read') || errorMessage.includes('null')) {
      return {
        recoverable: true,
        action: 'reinject',
        userMessage: 'Twitter interface changed. Reconnecting...'
      };
    }

    // Extension context errors
    if (errorMessage.includes('extension context invalidated')) {
      return {
        recoverable: false,
        action: 'refresh',
        userMessage: 'Extension needs to be reloaded. Please refresh the page.'
      };
    }

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || 
        errorMessage.includes('failed to fetch')) {
      return {
        recoverable: true,
        action: 'retry',
        delay: 2000,
        userMessage: 'Network error. Checking connection...'
      };
    }

    // Storage errors
    if (errorMessage.includes('storage') || errorMessage.includes('quota')) {
      return {
        recoverable: false,
        action: 'log',
        userMessage: 'Storage error. Please clear some browser data.'
      };
    }

    // Default unknown errors
    return {
      recoverable: false,
      action: 'log',
      userMessage: 'An unexpected error occurred. Please try again.'
    };
  }

  /**
   * Attempt recovery based on strategy
   */
  private async attemptRecovery(
    strategy: RecoveryStrategy, 
    context: ErrorContext, 
    error: Error
  ): Promise<void> {
    const errorKey = `${context.action}_${error.message}`;
    const attempts = this.retryAttempts.get(errorKey) || 0;

    if (attempts >= this.maxRetries) {
      console.log('%c⚠️ Max retries exceeded', 'color: #FFA500; font-weight: bold');
      this.showUserError('Maximum retry attempts exceeded. Please refresh the page.', 'error');
      this.retryAttempts.delete(errorKey);
      return;
    }

    this.retryAttempts.set(errorKey, attempts + 1);

    switch (strategy.action) {
      case 'retry':
        await this.retryWithBackoff(context, attempts, strategy.delay);
        break;
      
      case 'reinject':
        await this.reinjectUI();
        break;
      
      case 'reauth':
        this.openSettings();
        break;
      
      case 'refresh':
        this.suggestRefresh();
        break;
      
      case 'log':
      default:
        // Just log, no recovery action
        break;
    }
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff(
    context: ErrorContext, 
    attemptNumber: number,
    customDelay?: number
  ): Promise<void> {
    const delay = customDelay || this.retryDelays[attemptNumber] || 8000;
    
    console.log(`%c⏳ Retrying in ${delay}ms (attempt ${attemptNumber + 1}/${this.maxRetries})`, 
                'color: #17BF63');
    
    this.showUserError(`Retrying in ${Math.round(delay / 1000)} seconds...`, 'warning');
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (context.retryAction) {
      try {
        console.log('%c🔄 Executing retry...', 'color: #1DA1F2');
        await context.retryAction();
        
        // Success - clear retry counter
        const errorKey = `${context.action}_retry`;
        this.retryAttempts.delete(errorKey);
        
        // Mark error as resolved
        const lastError = this.errors[this.errors.length - 1];
        if (lastError) {
          lastError.resolved = true;
        }
        
        this.showUserError('Successfully recovered!', 'success');
      } catch (retryError: any) {
        console.error('Retry failed:', retryError);
        // Will trigger another retry through handleError
        await this.handleError(retryError, context);
      }
    }
  }

  /**
   * Reinject UI components after DOM changes
   */
  private async reinjectUI(): Promise<void> {
    console.log('%c🔧 Reinjecting UI components...', 'color: #9146FF; font-weight: bold');
    
    // Dispatch custom event to trigger reinjection
    const event = new CustomEvent('tweetcraft:reinject');
    window.dispatchEvent(event);
    
    this.showUserError('Reconnected to Twitter interface', 'success');
  }

  /**
   * Open settings page for reauth
   */
  private openSettings(): void {
    chrome.runtime.sendMessage({ action: 'openOptions' });
    this.showUserError('Please check your API key in settings', 'warning');
  }

  /**
   * Suggest page refresh
   */
  private suggestRefresh(): void {
    const shouldRefresh = confirm(
      'TweetCraft needs to refresh the page to recover. Do you want to refresh now?'
    );
    
    if (shouldRefresh) {
      location.reload();
    }
  }

  /**
   * Show user-friendly error message
   */
  private showUserError(message: string, type: 'error' | 'warning' | 'success' = 'error'): void {
    // Create toast notification
    const existingToast = document.querySelector('.tweetcraft-error-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `tweetcraft-error-toast tweetcraft-toast-${type}`;
    toast.textContent = message;
    
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      animation: slideUp 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      ${type === 'error' ? 'background: #DC3545; color: white;' : ''}
      ${type === 'warning' ? 'background: #FFA500; color: white;' : ''}
      ${type === 'success' ? 'background: #17BF63; color: white;' : ''}
    `;

    document.body.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    resolved: number;
    byComponent: Record<string, number>;
    recent: ErrorLog[];
  } {
    const byComponent: Record<string, number> = {};
    
    this.errors.forEach(error => {
      const component = error.context.component || 'unknown';
      byComponent[component] = (byComponent[component] || 0) + 1;
    });

    return {
      total: this.errors.length,
      resolved: this.errors.filter(e => e.resolved).length,
      byComponent,
      recent: this.errors.slice(-10)
    };
  }

  /**
   * Clear error logs
   */
  clearErrors(): void {
    this.errors = [];
    this.retryAttempts.clear();
    console.log('%c🧹 Error logs cleared', 'color: #17BF63');
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Add CSS for toast animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translate(-50%, 20px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
  
  @keyframes slideDown {
    from {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    to {
      opacity: 0;
      transform: translate(-50%, 20px);
    }
  }
`;
document.head.appendChild(style);
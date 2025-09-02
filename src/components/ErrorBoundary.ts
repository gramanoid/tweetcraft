/**
 * Error Boundary implementation for UI components
 * Catches and handles errors in UI rendering to prevent extension crashes
 */

import { LOG_COLORS } from '@/config/constants';

interface ErrorInfo {
  componentStack?: string;
  errorBoundary?: string;
  errorBoundaryFound?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number;
}

export class ErrorBoundary {
  private state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorCount: 0,
    lastErrorTime: 0,
  };
  
  private readonly maxErrorsPerMinute = 5;
  private readonly errorResetTime = 60000; // 1 minute
  private readonly fallbackUI: HTMLElement;
  private readonly targetElement: HTMLElement;
  private readonly onError?: (error: Error, errorInfo: ErrorInfo) => void;
  
  constructor(
    targetElement: HTMLElement,
    fallbackUI?: HTMLElement,
    onError?: (error: Error, errorInfo: ErrorInfo) => void
  ) {
    this.targetElement = targetElement;
    this.fallbackUI = fallbackUI || this.createDefaultFallbackUI();
    this.onError = onError;
    
    this.setupErrorHandlers();
  }
  
  /**
   * Wrap a function with error boundary protection
   */
  static wrap<T extends (...args: any[]) => any>(
    fn: T,
    componentName: string,
    fallbackValue?: ReturnType<T>
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        return fn(...args);
      } catch (error) {
        console.error(
          `%c❌ Error in ${componentName}:`,
          `color: ${LOG_COLORS.ERROR}; font-weight: bold`,
          error
        );
        
        // Report error to background if possible
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'ERROR_REPORT',
            error: {
              message: (error as Error).message,
              stack: (error as Error).stack,
              component: componentName,
              timestamp: Date.now(),
            },
          }).catch(() => {
            // Ignore errors in error reporting
          });
        }
        
        // Return fallback value if provided
        if (fallbackValue !== undefined) {
          return fallbackValue;
        }
        
        // Re-throw if no fallback
        throw error;
      }
    }) as T;
  }
  
  /**
   * Wrap a component class with error boundary protection
   */
  static wrapComponent<T extends new (...args: any[]) => any>(
    ComponentClass: T,
    componentName: string
  ): T {
    return class extends ComponentClass {
      constructor(...args: any[]) {
        try {
          super(...args);
        } catch (error) {
          console.error(
            `%c❌ Error constructing ${componentName}:`,
            `color: ${LOG_COLORS.ERROR}; font-weight: bold`,
            error
          );
          throw error;
        }
      }
      
      // Override render method if it exists
      render(...args: any[]): any {
        try {
          if (super.render) {
            return super.render(...args);
          }
        } catch (error) {
          console.error(
            `%c❌ Error rendering ${componentName}:`,
            `color: ${LOG_COLORS.ERROR}; font-weight: bold`,
            error
          );
          
          // Return error UI
          const errorUI = document.createElement('div');
          errorUI.className = 'tweetcraft-error-boundary';
          errorUI.innerHTML = `
            <div style="padding: 12px; background: #fee; border: 1px solid #fcc; border-radius: 8px; color: #c00;">
              <strong>Something went wrong</strong>
              <p style="margin: 8px 0 0; font-size: 12px;">Component: ${componentName}</p>
            </div>
          `;
          return errorUI;
        }
      }
    } as T;
  }
  
  /**
   * Create a promise-based wrapper with error boundary
   */
  static async wrapAsync<T>(
    promise: Promise<T>,
    componentName: string,
    fallbackValue?: T
  ): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      console.error(
        `%c❌ Async error in ${componentName}:`,
        `color: ${LOG_COLORS.ERROR}; font-weight: bold`,
        error
      );
      
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      
      throw error;
    }
  }
  
  /**
   * Setup error handlers for the target element
   */
  private setupErrorHandlers(): void {
    // Catch errors in event handlers
    const originalAddEventListener = this.targetElement.addEventListener;
    this.targetElement.addEventListener = (
      type: string,
      listener: any,
      options?: any
    ) => {
      const wrappedListener = this.wrapEventListener(listener, type);
      originalAddEventListener.call(this.targetElement, type, wrappedListener, options);
    };
    
    // Global error handler for this element's scope
    this.setupGlobalErrorHandler();
  }
  
  /**
   * Wrap an event listener with error handling
   */
  private wrapEventListener(listener: EventListener, eventType: string): EventListener {
    return (event: Event) => {
      try {
        listener(event);
      } catch (error) {
        this.handleError(error as Error, {
          componentStack: `Event: ${eventType}`,
          errorBoundary: 'EventListener',
        });
      }
    };
  }
  
  /**
   * Setup global error handler for unhandled errors
   */
  private setupGlobalErrorHandler(): void {
    // Note: This is scoped to the component, not truly global
    const handleError = (event: ErrorEvent) => {
      // Check if error is from our component
      if (this.isErrorFromComponent(event)) {
        event.preventDefault();
        this.handleError(event.error || new Error(event.message), {
          componentStack: `Line: ${event.lineno}, Column: ${event.colno}`,
          errorBoundary: 'Global',
        });
      }
    };
    
    window.addEventListener('error', handleError);
    
    // Store cleanup function
    (this as any).cleanup = () => {
      window.removeEventListener('error', handleError);
    };
  }
  
  /**
   * Check if an error originates from our component
   */
  private isErrorFromComponent(event: ErrorEvent): boolean {
    // Check if error source contains our component's ID or class
    const componentId = this.targetElement.id;
    const componentClasses = Array.from(this.targetElement.classList);
    
    return (
      event.filename?.includes('tweetcraft') ||
      event.message?.includes('tweetcraft') ||
      (componentId && event.message?.includes(componentId)) ||
      componentClasses.some(cls => event.message?.includes(cls))
    );
  }
  
  /**
   * Handle an error
   */
  private handleError(error: Error, errorInfo: ErrorInfo): void {
    const now = Date.now();
    
    // Reset error count if enough time has passed
    if (now - this.state.lastErrorTime > this.errorResetTime) {
      this.state.errorCount = 0;
    }
    
    this.state.errorCount++;
    this.state.lastErrorTime = now;
    
    // Check if we've hit the error limit
    if (this.state.errorCount > this.maxErrorsPerMinute) {
      console.error(
        `%c⚠️ Error boundary: Too many errors (${this.state.errorCount}), disabling component`,
        `color: ${LOG_COLORS.WARNING}; font-weight: bold`
      );
      this.showFallbackUI();
      return;
    }
    
    // Update state
    this.state.hasError = true;
    this.state.error = error;
    this.state.errorInfo = errorInfo;
    
    // Log error
    console.error(
      `%c❌ Error caught by boundary:`,
      `color: ${LOG_COLORS.ERROR}; font-weight: bold`,
      error,
      errorInfo
    );
    
    // Call custom error handler if provided
    if (this.onError) {
      try {
        this.onError(error, errorInfo);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    }
    
    // Show fallback UI
    this.showFallbackUI();
  }
  
  /**
   * Show fallback UI
   */
  private showFallbackUI(): void {
    try {
      // Hide original content
      this.targetElement.style.display = 'none';
      
      // Insert fallback UI after target
      if (this.targetElement.parentElement) {
        this.targetElement.parentElement.insertBefore(
          this.fallbackUI,
          this.targetElement.nextSibling
        );
      }
    } catch (error) {
      console.error('Failed to show fallback UI:', error);
    }
  }
  
  /**
   * Create default fallback UI
   */
  private createDefaultFallbackUI(): HTMLElement {
    const fallback = document.createElement('div');
    fallback.className = 'tweetcraft-error-fallback';
    fallback.style.cssText = `
      padding: 16px;
      background: #fee;
      border: 1px solid #fcc;
      border-radius: 8px;
      color: #c00;
      margin: 8px;
    `;
    
    fallback.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px;">⚠️</span>
        <div>
          <strong>Something went wrong</strong>
          <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.8;">
            The component encountered an error and cannot be displayed.
          </p>
          <button 
            class="retry-button" 
            style="margin-top: 8px; padding: 4px 12px; background: white; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">
            Retry
          </button>
        </div>
      </div>
    `;
    
    // Add retry functionality
    const retryButton = fallback.querySelector('.retry-button');
    if (retryButton) {
      retryButton.addEventListener('click', () => this.retry());
    }
    
    return fallback;
  }
  
  /**
   * Retry rendering the component
   */
  private retry(): void {
    // Reset state
    this.state.hasError = false;
    this.state.error = null;
    this.state.errorInfo = null;
    
    // Remove fallback UI
    if (this.fallbackUI.parentElement) {
      this.fallbackUI.remove();
    }
    
    // Show original content
    this.targetElement.style.display = '';
    
    console.log(
      `%c🔄 Retrying component render`,
      `color: ${LOG_COLORS.INFO}; font-weight: bold`
    );
  }
  
  /**
   * Reset error boundary state
   */
  reset(): void {
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0,
    };
    
    if (this.fallbackUI.parentElement) {
      this.fallbackUI.remove();
    }
    
    this.targetElement.style.display = '';
  }
  
  /**
   * Destroy the error boundary
   */
  destroy(): void {
    if ((this as any).cleanup) {
      (this as any).cleanup();
    }
    
    if (this.fallbackUI.parentElement) {
      this.fallbackUI.remove();
    }
  }
}

// Export a singleton for global error tracking
export const globalErrorTracker = {
  errors: [] as Array<{ error: Error; timestamp: number; component?: string }>,
  maxErrors: 100,
  
  track(error: Error, component?: string): void {
    this.errors.push({
      error,
      timestamp: Date.now(),
      component,
    });
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  },
  
  getRecentErrors(minutes: number = 5): typeof this.errors {
    const cutoff = Date.now() - minutes * 60000;
    return this.errors.filter(e => e.timestamp > cutoff);
  },
  
  clear(): void {
    this.errors = [];
  },
};
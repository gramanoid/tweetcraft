/**
 * Simplified Error Handler - Consumer-Focused
 * Streamlined error handling with clear recovery actions
 */

// Simplified interfaces for consumer MVP
interface ErrorContext {
  action: string;
  component?: string;
  retryAction?: () => Promise<any>;
  metadata?: Record<string, any>;
}

// Recovery action interface
interface RecoveryAction {
  label: string;
  action: string;
  primary?: boolean;
  handler: () => void;
}

export class ErrorHandler {

  /**
   * Simple error handling with user-friendly messages
   */
  static handleUserFriendlyError(error: Error, context: ErrorContext, button?: HTMLElement): RecoveryAction[] {
    console.log('%c🚨 TweetCraft Error:', 'color: #DC3545; font-weight: bold', error.message);
    
    const userMessage = this.getUserFriendlyMessage(error);
    const recoveryActions = this.getRecoveryActions(context);

    // Show error on button if provided
    if (button && 'showError' in (window as any).DOMUtils) {
      (window as any).DOMUtils.showError(button, userMessage, 'error');
    }

    return recoveryActions;
  }

  /**
   * Simple user-friendly error messages
   */
  private static getUserFriendlyMessage(error: Error): string {
    const message = error.message.toLowerCase();
    
    // Network issues
    if (message.includes('network') || message.includes('fetch') || 
        message.includes('connection') || message.includes('timeout')) {
      return 'Connection issue - please check your internet and try again';
    }
    
    // API key issues
    if (message.includes('api') || message.includes('key') || 
        message.includes('401') || message.includes('403')) {
      return 'Please check your OpenRouter API key in extension settings';
    }
    
    // Extension context issues
    if (message.includes('context') || message.includes('extension') || 
        message.includes('invalidated')) {
      return 'Please refresh this Twitter page';
    }
    
    // Rate limiting
    if (message.includes('rate') || message.includes('429')) {
      return 'Please wait a moment and try again';
    }
    
    // Default message
    return 'Something went wrong - please try again';
  }

  /**
   * Simple recovery actions - consumer focused
   */
  private static getRecoveryActions(context: ErrorContext): RecoveryAction[] {
    return [
      {
        label: 'Try Again',
        action: 'retry',
        primary: true,
        handler: context.retryAction || (() => window.location.reload())
      }
    ];
  }
}

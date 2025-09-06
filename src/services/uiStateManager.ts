/**
 * UI State Manager
 * Manages loading, error, and success states for UI components
 * Provides consistent visual feedback across the extension
 */

import { logger } from '@/utils/logger';

export interface UIStateOptions {
  showSpinner?: boolean;
  customText?: string;
  disableElement?: boolean;
  animationType?: 'pulse' | 'spin' | 'fade';
}

export class UIStateManager {
  private static loadingElements = new WeakMap<HTMLElement, {
    originalContent: string;
    originalDisabled: boolean;
  }>();
  
  private static activeToasts = new Set<HTMLElement>();

  /**
   * Set loading state on an element
   */
  static setLoading(
    element: HTMLElement | null,
    loading: boolean,
    options: UIStateOptions = {}
  ): void {
    if (!element) return;

    const {
      showSpinner = true,
      customText = 'Generating...',
      disableElement = true,
      animationType = 'spin'
    } = options;

    if (loading) {
      // Store original state
      const isButton = element instanceof HTMLButtonElement;
      const originalContent = element.innerHTML;
      const originalDisabled = isButton ? element.disabled : false;
      
      this.loadingElements.set(element, {
        originalContent,
        originalDisabled
      });

      // Add loading class
      element.classList.add('loading', `loading-${animationType}`);
      
      // Disable if requested
      if (disableElement && isButton) {
        element.disabled = true;
      }

      // Update content
      if (showSpinner) {
        const spinnerHtml = this.getSpinnerHtml(animationType);
        element.innerHTML = `${spinnerHtml} <span>${customText}</span>`;
      } else {
        element.innerHTML = customText;
      }
    } else {
      // Restore original state
      const originalState = this.loadingElements.get(element);
      if (originalState) {
        element.innerHTML = originalState.originalContent;
        
        if (element instanceof HTMLButtonElement) {
          element.disabled = originalState.originalDisabled;
        }
        
        this.loadingElements.delete(element);
      }
      
      // Remove loading classes
      element.classList.remove('loading', 'loading-pulse', 'loading-spin', 'loading-fade');
    }
  }

  /**
   * Show error message
   */
  static showError(
    nearElement: HTMLElement | null,
    message: string,
    duration: number = 5000
  ): HTMLElement | null {
    if (!nearElement) return null;

    // Remove any existing error for this element
    this.clearNearbyMessages(nearElement, '.error-message');

    // Create error element
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message tweetcraft-message';
    errorEl.innerHTML = `
      <span class="error-icon">⚠️</span>
      <span class="error-text">${this.escapeHtml(message)}</span>
      <button class="error-close" aria-label="Dismiss">×</button>
    `;
    
    // Apply styles
    this.applyMessageStyles(errorEl, 'error');

    // Insert after the element
    nearElement.parentElement?.insertBefore(errorEl, nearElement.nextSibling);

    // Add close handler
    const closeBtn = errorEl.querySelector('.error-close');
    closeBtn?.addEventListener('click', () => errorEl.remove());

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => errorEl.remove(), duration);
    }

    logger.error('UI Error shown:', message);
    return errorEl;
  }

  /**
   * Show success message
   */
  static showSuccess(
    nearElement: HTMLElement | null,
    message: string,
    duration: number = 3000
  ): HTMLElement | null {
    if (!nearElement) return null;

    // Remove any existing success message for this element
    this.clearNearbyMessages(nearElement, '.success-message');

    // Create success element
    const successEl = document.createElement('div');
    successEl.className = 'success-message tweetcraft-message';
    successEl.innerHTML = `
      <span class="success-icon">✅</span>
      <span class="success-text">${this.escapeHtml(message)}</span>
    `;
    
    // Apply styles
    this.applyMessageStyles(successEl, 'success');

    // Insert after the element
    nearElement.parentElement?.insertBefore(successEl, nearElement.nextSibling);

    // Animate in
    successEl.style.animation = 'slideInFade 0.3s ease-out';

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        successEl.style.animation = 'slideOutFade 0.3s ease-out';
        setTimeout(() => successEl.remove(), 300);
      }, duration);
    }

    return successEl;
  }

  /**
   * Show toast notification
   */
  static showToast(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    duration: number = 4000
  ): void {
    // Create toast container if it doesn't exist
    let container = document.querySelector('.tweetcraft-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'tweetcraft-toast-container';
      (container as HTMLElement).style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `tweetcraft-toast toast-${type}`;
    toast.style.cssText = `
      background: ${this.getToastBackground(type)};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 250px;
      max-width: 400px;
      animation: slideInRight 0.3s ease-out;
      pointer-events: auto;
      cursor: pointer;
    `;

    const icon = this.getToastIcon(type);
    toast.innerHTML = `
      <span style="font-size: 18px;">${icon}</span>
      <span style="flex: 1;">${this.escapeHtml(message)}</span>
    `;

    // Add to container
    container.appendChild(toast);
    this.activeToasts.add(toast);

    // Click to dismiss
    toast.addEventListener('click', () => this.dismissToast(toast));

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => this.dismissToast(toast), duration);
    }
  }

  /**
   * Display generated reply in the UI
   */
  static displayReply(
    container: HTMLElement | null,
    reply: string,
    options: {
      showCopyButton?: boolean;
      showRegenerateButton?: boolean;
      onCopy?: () => void;
      onRegenerate?: () => void;
    } = {}
  ): HTMLElement | null {
    if (!container) return null;

    const {
      showCopyButton = true,
      showRegenerateButton = true,
      onCopy,
      onRegenerate
    } = options;

    // Create reply display element
    const replyEl = document.createElement('div');
    replyEl.className = 'generated-reply-container';
    replyEl.style.cssText = `
      background: #f7f9fa;
      border: 1px solid #e1e8ed;
      border-radius: 12px;
      padding: 16px;
      margin-top: 16px;
      animation: fadeInUp 0.4s ease-out;
    `;

    // Build HTML
    let buttonsHtml = '';
    if (showCopyButton || showRegenerateButton) {
      buttonsHtml = '<div class="reply-actions" style="display: flex; gap: 8px; margin-top: 12px;">';
      
      if (showCopyButton) {
        buttonsHtml += `
          <button class="copy-reply-btn" style="
            background: #1DA1F2;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
          ">
            <span>📋</span> Copy
          </button>
        `;
      }
      
      if (showRegenerateButton) {
        buttonsHtml += `
          <button class="regenerate-reply-btn" style="
            background: white;
            color: #1DA1F2;
            border: 1px solid #1DA1F2;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
          ">
            <span>🔄</span> Regenerate
          </button>
        `;
      }
      
      buttonsHtml += '</div>';
    }

    replyEl.innerHTML = `
      <div class="reply-header" style="
        font-size: 12px;
        color: #657786;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <span>Generated Reply</span>
        <span style="color: #17BF63;">✓ Ready to post</span>
      </div>
      <div class="reply-text" style="
        font-size: 15px;
        line-height: 1.4;
        color: #14171a;
        white-space: pre-wrap;
        word-wrap: break-word;
      ">${this.escapeHtml(reply)}</div>
      ${buttonsHtml}
    `;

    // Clear previous reply if exists
    const existingReply = container.querySelector('.generated-reply-container');
    if (existingReply) {
      existingReply.remove();
    }

    // Add to container
    container.appendChild(replyEl);

    // Wire up buttons
    if (showCopyButton) {
      const copyBtn = replyEl.querySelector('.copy-reply-btn') as HTMLButtonElement;
      copyBtn?.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(reply);
          copyBtn.innerHTML = '<span>✅</span> Copied!';
          copyBtn.style.background = '#17BF63';
          
          setTimeout(() => {
            copyBtn.innerHTML = '<span>📋</span> Copy';
            copyBtn.style.background = '#1DA1F2';
          }, 2000);
          
          onCopy?.();
        } catch (error) {
          logger.error('Failed to copy:', error);
          this.showError(copyBtn, 'Failed to copy');
        }
      });
    }

    if (showRegenerateButton) {
      const regenerateBtn = replyEl.querySelector('.regenerate-reply-btn');
      regenerateBtn?.addEventListener('click', () => {
        onRegenerate?.();
      });
    }

    return replyEl;
  }

  /**
   * Update progress indicator
   */
  static updateProgress(
    container: HTMLElement | null,
    progress: number,
    message?: string
  ): void {
    if (!container) return;

    let progressEl = container.querySelector('.progress-indicator') as HTMLElement;
    
    if (!progressEl) {
      progressEl = document.createElement('div');
      progressEl.className = 'progress-indicator';
      progressEl.style.cssText = `
        background: #f0f0f0;
        border-radius: 4px;
        height: 4px;
        margin: 8px 0;
        overflow: hidden;
        position: relative;
      `;
      container.appendChild(progressEl);
    }

    // Update or create progress bar
    let progressBar = progressEl.querySelector('.progress-bar') as HTMLElement;
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progressBar.style.cssText = `
        background: linear-gradient(90deg, #1DA1F2, #17BF63);
        height: 100%;
        transition: width 0.3s ease;
        border-radius: 4px;
      `;
      progressEl.appendChild(progressBar);
    }

    progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;

    // Update message if provided
    if (message) {
      let messageEl = container.querySelector('.progress-message') as HTMLElement;
      if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.className = 'progress-message';
        messageEl.style.cssText = `
          font-size: 12px;
          color: #657786;
          margin-top: 4px;
        `;
        progressEl.parentElement?.insertBefore(messageEl, progressEl.nextSibling);
      }
      messageEl.textContent = message;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private static getSpinnerHtml(type: string): string {
    switch (type) {
      case 'pulse':
        return '<span class="spinner-pulse" style="display: inline-block; width: 16px; height: 16px; background: currentColor; border-radius: 50%; animation: pulse 1.5s infinite;"></span>';
      case 'fade':
        return '<span class="spinner-fade" style="display: inline-block; width: 16px; height: 16px; opacity: 0.3; animation: fade 1s infinite;">⏳</span>';
      default: // spin
        return '<span class="spinner-spin" style="display: inline-block; width: 16px; height: 16px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>';
    }
  }

  private static applyMessageStyles(element: HTMLElement, type: 'error' | 'success'): void {
    const baseStyles = `
      padding: 8px 12px;
      border-radius: 6px;
      margin: 8px 0;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: fadeIn 0.3s ease-out;
    `;

    const typeStyles = type === 'error' 
      ? 'background: #fee; border: 1px solid #fcc; color: #c33;'
      : 'background: #efe; border: 1px solid #cfc; color: #3a3;';

    element.style.cssText = baseStyles + typeStyles;
  }

  private static clearNearbyMessages(element: HTMLElement, selector: string): void {
    const parent = element.parentElement;
    if (parent) {
      parent.querySelectorAll(selector).forEach(el => el.remove());
    }
  }

  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private static getToastBackground(type: string): string {
    switch (type) {
      case 'success': return '#17BF63';
      case 'warning': return '#FFA500';
      case 'error': return '#DC3545';
      default: return '#1DA1F2';
    }
  }

  private static getToastIcon(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  }

  private static dismissToast(toast: HTMLElement): void {
    toast.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => {
      toast.remove();
      this.activeToasts.delete(toast);
    }, 300);
  }
}

// Add required CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(0.8); opacity: 0.5; }
  }
  @keyframes fade {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  @keyframes slideInFade {
    from { transform: translateY(-10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slideOutFade {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(-10px); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Export as default for easier imports
export default UIStateManager;
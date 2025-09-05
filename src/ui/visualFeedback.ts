/**
 * Visual Feedback System for TweetCraft
 * Provides visual indicators for user actions
 */

interface FeedbackOptions {
  duration?: number;
  position?: 'top' | 'bottom' | 'center';
  type?: 'success' | 'error' | 'info' | 'warning';
  persistent?: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: string;
  timestamp: number;
  element?: HTMLElement;
}

export class VisualFeedback {
  private toasts: Map<string, Toast> = new Map();
  private container: HTMLElement | null = null;
  private loadingOverlay: HTMLElement | null = null;
  private pulseElements: WeakSet<HTMLElement> = new WeakSet();
  private initialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize feedback system
   */
  private initialize(): void {
    if (this.initialized) return;
    
    this.createContainer();
    this.applyStyles();
    this.initialized = true;
    
    console.log('%c✨ VisualFeedback initialized', 'color: #1DA1F2; font-weight: bold');
  }

  /**
   * Create container for toasts
   */
  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.className = 'tweetcraft-feedback-container';
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(this.container);
  }

  /**
   * Show toast notification
   */
  showToast(message: string, options: FeedbackOptions = {}): string {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const type = options.type || 'info';
    const duration = options.duration || 3000;
    const position = options.position || 'bottom';

    const toastElement = this.createToastElement(message, type);
    
    const toast: Toast = {
      id,
      message,
      type,
      timestamp: Date.now(),
      element: toastElement
    };

    this.toasts.set(id, toast);
    
    // Position and animate
    this.positionToast(toastElement, position);
    this.container?.appendChild(toastElement);
    
    // Animate in
    requestAnimationFrame(() => {
      toastElement.classList.add('show');
    });

    // Auto-remove unless persistent
    if (!options.persistent) {
      setTimeout(() => this.removeToast(id), duration);
    }

    console.log(`%c✨ Toast shown: ${message}`, 'color: #17BF63');
    return id;
  }

  /**
   * Create toast element
   */
  private createToastElement(message: string, type: string): HTMLElement {
    const toast = document.createElement('div');
    toast.className = `tweetcraft-toast tweetcraft-toast-${type}`;
    
    const icon = this.getIcon(type);
    const closeBtn = this.createCloseButton();
    
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    `;
    
    toast.appendChild(closeBtn);
    
    return toast;
  }

  /**
   * Position toast
   */
  private positionToast(element: HTMLElement, position: string): void {
    element.setAttribute('data-position', position);
  }

  /**
   * Remove toast
   */
  removeToast(id: string): void {
    const toast = this.toasts.get(id);
    if (toast && toast.element) {
      toast.element.classList.add('hide');
      
      setTimeout(() => {
        toast.element?.remove();
        this.toasts.delete(id);
      }, 300);
    }
  }

  /**
   * Show loading overlay (deprecated - now just logs)
   * @deprecated Use showButtonLoading instead
   */
  showLoading(message: string = 'Loading...'): void {
    // No longer show full-screen overlay, just log for debugging
    console.log('%c⏳ Loading:', 'color: #FFA500', message);
  }

  /**
   * Hide loading overlay (deprecated - now just logs)
   * @deprecated Use hideButtonLoading instead
   */
  hideLoading(): void {
    // No longer needed since we don't show overlay
    console.log('%c✅ Loading complete', 'color: #17BF63');
  }

  /**
   * Show loading state on button with pulsing animation
   */
  showButtonLoading(button: HTMLElement, message: string = 'Generating...'): void {
    // Store original content
    const originalContent = button.innerHTML;
    button.setAttribute('data-original-content', originalContent);
    
    // Add loading class and update content
    button.classList.add('tweetcraft-loading');
    button.innerHTML = `
      <span class="loading-spinner-inline"></span>
      <span>${message}</span>
    `;
    
    // Disable button
    button.setAttribute('disabled', 'true');
    
    console.log('%c⏳ Button loading:', 'color: #FFA500', message);
  }

  /**
   * Hide loading state on button
   */
  hideButtonLoading(button: HTMLElement): void {
    // Restore original content
    const originalContent = button.getAttribute('data-original-content');
    if (originalContent) {
      button.innerHTML = originalContent;
    }
    
    // Remove loading class
    button.classList.remove('tweetcraft-loading');
    
    // Enable button
    button.removeAttribute('disabled');
    
    console.log('%c✅ Button loading complete', 'color: #17BF63');
  }

  /**
   * Pulse animation for element
   */
  pulse(element: HTMLElement, color?: string): void {
    if (this.pulseElements.has(element)) return;
    
    this.pulseElements.add(element);
    element.classList.add('tweetcraft-pulse');
    
    if (color) {
      element.style.setProperty('--pulse-color', color);
    }
    
    setTimeout(() => {
      element.classList.remove('tweetcraft-pulse');
      this.pulseElements.delete(element);
    }, 600);
  }

  /**
   * Shake animation for errors
   */
  shake(element: HTMLElement): void {
    element.classList.add('tweetcraft-shake');
    
    setTimeout(() => {
      element.classList.remove('tweetcraft-shake');
    }, 500);
  }

  /**
   * Slide in animation
   */
  slideIn(element: HTMLElement, direction: 'left' | 'right' | 'top' | 'bottom' = 'bottom'): void {
    element.classList.add('tweetcraft-slide-in', `from-${direction}`);
    
    setTimeout(() => {
      element.classList.remove('tweetcraft-slide-in', `from-${direction}`);
    }, 500);
  }

  /**
   * Fade in/out
   */
  fade(element: HTMLElement, fadeIn: boolean = true): Promise<void> {
    return new Promise(resolve => {
      if (fadeIn) {
        element.classList.add('tweetcraft-fade-in');
        element.classList.remove('tweetcraft-fade-out');
      } else {
        element.classList.add('tweetcraft-fade-out');
        element.classList.remove('tweetcraft-fade-in');
      }
      
      setTimeout(resolve, 300);
    });
  }

  /**
   * Show success animation with checkmark
   */
  showSuccess(element: HTMLElement, message?: string): void {
    const successIcon = document.createElement('div');
    successIcon.className = 'tweetcraft-success-icon';
    successIcon.innerHTML = '✓';
    
    const rect = element.getBoundingClientRect();
    successIcon.style.left = `${rect.left + rect.width / 2}px`;
    successIcon.style.top = `${rect.top + rect.height / 2}px`;
    
    document.body.appendChild(successIcon);
    
    requestAnimationFrame(() => {
      successIcon.classList.add('show');
    });
    
    setTimeout(() => {
      successIcon.remove();
    }, 1500);
    
    if (message) {
      this.showToast(message, { type: 'success', duration: 2000 });
    }
  }

  /**
   * Show copy success with inline checkmark
   */
  showCopySuccess(element: HTMLElement): void {
    const originalContent = element.innerHTML;
    
    // Temporarily change to checkmark
    element.innerHTML = '✓ Copied!';
    element.classList.add('tweetcraft-copy-success');
    
    // Restore after delay
    setTimeout(() => {
      element.innerHTML = originalContent;
      element.classList.remove('tweetcraft-copy-success');
    }, 2000);
  }

  /**
   * Show error animation
   */
  showError(element: HTMLElement, message?: string): void {
    this.shake(element);
    element.classList.add('tweetcraft-error-highlight');
    
    setTimeout(() => {
      element.classList.remove('tweetcraft-error-highlight');
    }, 2000);
    
    if (message) {
      this.showToast(message, { type: 'error' });
    }
  }

  /**
   * Highlight element
   */
  highlight(element: HTMLElement, duration: number = 2000): void {
    element.classList.add('tweetcraft-highlight');
    
    setTimeout(() => {
      element.classList.remove('tweetcraft-highlight');
    }, duration);
  }

  /**
   * Show progress bar
   */
  showProgress(progress: number, message?: string): void {
    let progressBar = document.querySelector('.tweetcraft-progress-bar') as HTMLElement;
    
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'tweetcraft-progress-bar';
      progressBar.innerHTML = `
        <div class="progress-fill"></div>
        <div class="progress-message"></div>
      `;
      document.body.appendChild(progressBar);
    }
    
    const fill = progressBar.querySelector('.progress-fill') as HTMLElement;
    const messageEl = progressBar.querySelector('.progress-message') as HTMLElement;
    
    fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    
    if (message) {
      messageEl.textContent = message;
    }
    
    progressBar.classList.add('show');
    
    if (progress >= 100) {
      setTimeout(() => {
        progressBar.classList.remove('show');
        setTimeout(() => progressBar.remove(), 300);
      }, 500);
    }
  }

  /**
   * Start indeterminate progress for slow requests
   */
  startSlowProgress(message: string = 'This is taking longer than expected...'): () => void {
    let progress = 0;
    let slowMessageShown = false;
    
    // Start progress bar
    this.showProgress(10, 'Generating...');
    
    // Simulate slow progress
    const interval = setInterval(() => {
      progress = Math.min(90, progress + Math.random() * 10);
      this.showProgress(progress, progress > 50 && !slowMessageShown ? message : 'Generating...');
      
      if (progress > 50) {
        slowMessageShown = true;
      }
    }, 500);
    
    // Return function to stop progress
    return () => {
      clearInterval(interval);
      this.showProgress(100, 'Complete!');
    };
  }

  /**
   * Create close button
   */
  private createCloseButton(): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'toast-close';
    btn.innerHTML = '×';
    btn.onclick = (e) => {
      const toast = (e.target as HTMLElement).closest('.tweetcraft-toast');
      const id = Array.from(this.toasts.entries())
        .find(([_, t]) => t.element === toast)?.[0];
      
      if (id) {
        this.removeToast(id);
      }
    };
    return btn;
  }

  /**
   * Get icon for type
   */
  private getIcon(type: string): string {
    const icons: Record<string, string> = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  /**
   * Apply styles
   */
  private applyStyles(): void {
    if (!document.querySelector('#tweetcraft-feedback-styles')) {
      const style = document.createElement('style');
      style.id = 'tweetcraft-feedback-styles';
      style.textContent = `
        .tweetcraft-feedback-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: none;
        }
        
        .tweetcraft-toast {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: #15202b;
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 8px;
          color: #e7e9ea;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          transform: translateX(400px);
          transition: transform 0.3s ease, opacity 0.3s ease;
          pointer-events: auto;
        }
        
        .tweetcraft-toast.show {
          transform: translateX(0);
        }
        
        .tweetcraft-toast.hide {
          opacity: 0;
          transform: translateX(400px);
        }
        
        .tweetcraft-toast-success {
          border-color: #17BF63;
          background: linear-gradient(135deg, #15202b, rgba(23, 191, 99, 0.1));
        }
        
        .tweetcraft-toast-error {
          border-color: #DC3545;
          background: linear-gradient(135deg, #15202b, rgba(220, 53, 69, 0.1));
        }
        
        .tweetcraft-toast-warning {
          border-color: #FFA500;
          background: linear-gradient(135deg, #15202b, rgba(255, 165, 0, 0.1));
        }
        
        .toast-icon {
          font-size: 18px;
        }
        
        .toast-close {
          margin-left: auto;
          background: none;
          border: none;
          color: #8b98a5;
          font-size: 20px;
          cursor: pointer;
          padding: 0 4px;
          transition: color 0.2s;
        }
        
        .toast-close:hover {
          color: #e7e9ea;
        }
        
        /* Button loading states */
        .tweetcraft-loading {
          position: relative;
          pointer-events: none;
          opacity: 0.9;
        }
        
        .loading-spinner-inline {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(29, 155, 240, 0.3);
          border-top-color: #1d9bf0;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Enhanced pulse animation for generating state */
        .tweetcraft-pulse {
          animation: enhanced-pulse 1.5s ease infinite;
        }
        
        @keyframes enhanced-pulse {
          0% { 
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(29, 155, 240, 0.7);
          }
          50% { 
            transform: scale(1.02);
            box-shadow: 0 0 20px 10px rgba(29, 155, 240, 0);
          }
          100% { 
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(29, 155, 240, 0);
          }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); box-shadow: 0 0 20px var(--pulse-color, #1d9bf0); }
        }
        
        .tweetcraft-shake {
          animation: shake 0.5s ease;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        
        .tweetcraft-highlight {
          animation: highlight 2s ease;
        }
        
        @keyframes highlight {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(29, 155, 240, 0.2); }
        }
        
        .tweetcraft-error-highlight {
          animation: error-highlight 2s ease;
        }
        
        @keyframes error-highlight {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(220, 53, 69, 0.2); }
        }
        
        .tweetcraft-success-icon {
          position: fixed;
          width: 60px;
          height: 60px;
          background: #17BF63;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 30px;
          font-weight: bold;
          transform: translate(-50%, -50%) scale(0);
          opacity: 0;
          z-index: 10002;
          transition: all 0.3s ease;
        }
        
        .tweetcraft-success-icon.show {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        
        .tweetcraft-copy-success {
          color: #17BF63 !important;
          font-weight: bold;
          animation: copy-success 0.3s ease;
        }
        
        @keyframes copy-success {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        .tweetcraft-progress-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: rgba(139, 152, 165, 0.2);
          z-index: 10000;
          opacity: 0;
          transition: opacity 0.3s;
        }
        
        .tweetcraft-progress-bar.show {
          opacity: 1;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #1d9bf0, #17BF63);
          transition: width 0.3s ease;
        }
        
        .progress-message {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 12px;
          color: #e7e9ea;
          background: #15202b;
          padding: 2px 8px;
          border-radius: 4px;
        }
        
        .tweetcraft-slide-in {
          animation: slideIn 0.5s ease;
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .tweetcraft-fade-in {
          animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .tweetcraft-fade-out {
          animation: fadeOut 0.3s ease;
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.toasts.forEach(toast => {
      toast.element?.remove();
    });
    this.toasts.clear();
    
    this.container?.remove();
    this.loadingOverlay?.remove();
    
    const style = document.querySelector('#tweetcraft-feedback-styles');
    style?.remove();
    
    console.log('%c✨ VisualFeedback destroyed', 'color: #FFA500');
  }
}

// Export singleton instance
export const visualFeedback = new VisualFeedback();
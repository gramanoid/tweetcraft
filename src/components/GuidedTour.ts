/**
 * Guided Tour Component for TweetCraft
 * Simple 3-arrow onboarding for first-time users
 */

export class GuidedTour {
  private container: HTMLElement | null = null;
  private currentStep: number = 0;
  private steps = [
    {
      selector: '.tab-btn[data-view="personas"]',
      message: '1. Pick a personality',
      position: 'bottom' as const,
      arrow: '↑'
    },
    {
      selector: '.personality-btn, .template-btn',
      message: '2. Choose your style',
      position: 'top' as const,
      arrow: '↓'
    },
    {
      selector: '.generate-btn',
      message: '3. Click Generate!',
      position: 'left' as const,
      arrow: '→'
    }
  ];
  private tooltips: HTMLElement[] = [];
  private hasSeenTour: boolean = false;

  constructor() {
    // Check if user has seen tour
    this.hasSeenTour = localStorage.getItem('tweetcraft-tour-completed') === 'true';
  }

  /**
   * Check if tour should be shown
   */
  shouldShowTour(): boolean {
    return !this.hasSeenTour;
  }

  /**
   * Start the guided tour
   */
  start(container: HTMLElement): void {
    if (this.hasSeenTour) return;
    
    this.container = container;
    this.currentStep = 0;
    
    console.log('%c🎯 Starting Guided Tour', 'color: #1DA1F2; font-weight: bold');
    
    // Add tour overlay
    this.addOverlay();
    
    // Show first step after a short delay
    setTimeout(() => {
      this.showStep(0);
    }, 500);
  }

  /**
   * Add semi-transparent overlay
   */
  private addOverlay(): void {
    const overlay = document.createElement('div');
    overlay.className = 'tweetcraft-tour-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 9998;
      pointer-events: none;
      animation: fadeIn 0.3s ease;
    `;
    document.body.appendChild(overlay);
    
    // Store for cleanup
    this.tooltips.push(overlay);
  }

  /**
   * Show a specific step
   */
  private showStep(stepIndex: number): void {
    if (stepIndex >= this.steps.length) {
      this.complete();
      return;
    }
    
    const step = this.steps[stepIndex];
    const element = this.container?.querySelector(step.selector) as HTMLElement;
    
    if (!element) {
      console.warn(`Tour step ${stepIndex + 1} element not found:`, step.selector);
      // Try next step
      setTimeout(() => this.showStep(stepIndex + 1), 100);
      return;
    }
    
    // Highlight the element
    this.highlightElement(element);
    
    // Create tooltip
    this.createTooltip(element, step);
    
    // Auto-advance after 3 seconds or on click
    const autoAdvance = setTimeout(() => {
      this.nextStep();
    }, 3000);
    
    // Clear auto-advance if user clicks
    const clickHandler = () => {
      clearTimeout(autoAdvance);
      this.nextStep();
    };
    
    element.addEventListener('click', clickHandler, { once: true });
  }

  /**
   * Highlight an element
   */
  private highlightElement(element: HTMLElement): void {
    // Add highlight class
    element.classList.add('tweetcraft-tour-highlight');
    element.style.position = 'relative';
    element.style.zIndex = '9999';
    
    // Add pulsing animation
    const pulse = document.createElement('div');
    pulse.className = 'tweetcraft-tour-pulse';
    pulse.style.cssText = `
      position: absolute;
      top: -5px;
      left: -5px;
      right: -5px;
      bottom: -5px;
      border: 3px solid #1DA1F2;
      border-radius: 8px;
      pointer-events: none;
      animation: tourPulse 2s ease infinite;
    `;
    element.appendChild(pulse);
    
    this.tooltips.push(pulse);
  }

  /**
   * Create tooltip with arrow
   */
  private createTooltip(element: HTMLElement, step: any): void {
    const rect = element.getBoundingClientRect();
    const tooltip = document.createElement('div');
    tooltip.className = 'tweetcraft-tour-tooltip';
    
    // Position based on step configuration
    let top = 0;
    let left = 0;
    
    switch (step.position) {
      case 'bottom':
        top = rect.bottom + 15;
        left = rect.left + rect.width / 2;
        break;
      case 'top':
        top = rect.top - 60;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - 20;
        left = rect.left - 200;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - 20;
        left = rect.right + 15;
        break;
    }
    
    tooltip.style.cssText = `
      position: fixed;
      top: ${top}px;
      left: ${left}px;
      transform: ${step.position === 'bottom' || step.position === 'top' ? 'translateX(-50%)' : 'none'};
      background: linear-gradient(135deg, #1DA1F2, #0D8BD9);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    `;
    
    // Add arrow and message
    tooltip.innerHTML = `
      <span style="font-size: 20px; animation: bounce 1s ease infinite;">${step.arrow}</span>
      <span>${step.message}</span>
    `;
    
    // Add skip button on first step
    if (this.currentStep === 0) {
      const skipBtn = document.createElement('button');
      skipBtn.textContent = 'Skip';
      skipBtn.style.cssText = `
        margin-left: 12px;
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        color: white;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;
      `;
      skipBtn.onmouseover = () => skipBtn.style.background = 'rgba(255, 255, 255, 0.3)';
      skipBtn.onmouseout = () => skipBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      skipBtn.onclick = () => this.complete();
      tooltip.appendChild(skipBtn);
    }
    
    document.body.appendChild(tooltip);
    this.tooltips.push(tooltip);
  }

  /**
   * Move to next step
   */
  private nextStep(): void {
    // Clean up current step
    this.cleanupCurrentStep();
    
    // Move to next
    this.currentStep++;
    
    // Show next step
    setTimeout(() => {
      this.showStep(this.currentStep);
    }, 300);
  }

  /**
   * Clean up current step
   */
  private cleanupCurrentStep(): void {
    // Remove highlights
    const highlighted = document.querySelectorAll('.tweetcraft-tour-highlight');
    highlighted.forEach(el => {
      el.classList.remove('tweetcraft-tour-highlight');
      (el as HTMLElement).style.zIndex = '';
    });
    
    // Remove tooltips except overlay
    this.tooltips.forEach((tooltip, index) => {
      if (index > 0) { // Keep overlay (index 0)
        tooltip.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => tooltip.remove(), 300);
      }
    });
    
    // Keep only overlay in array
    this.tooltips = this.tooltips.slice(0, 1);
  }

  /**
   * Complete the tour
   */
  private complete(): void {
    console.log('%c✅ Guided Tour Completed', 'color: #17BF63; font-weight: bold');
    
    // Mark as completed
    localStorage.setItem('tweetcraft-tour-completed', 'true');
    this.hasSeenTour = true;
    
    // Clean up everything
    this.cleanupCurrentStep();
    
    // Remove overlay with fade
    if (this.tooltips[0]) {
      this.tooltips[0].style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        this.tooltips[0]?.remove();
        this.tooltips = [];
      }, 300);
    }
    
    // Show success message
    this.showCompletionMessage();
  }

  /**
   * Show completion message
   */
  private showCompletionMessage(): void {
    const message = document.createElement('div');
    message.className = 'tweetcraft-tour-complete';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #17BF63, #10A050);
      color: white;
      padding: 20px 30px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      z-index: 10001;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      animation: scaleIn 0.3s ease;
      text-align: center;
    `;
    
    message.innerHTML = `
      <div style="font-size: 32px; margin-bottom: 10px;">🎉</div>
      <div>You're ready to create amazing replies!</div>
    `;
    
    document.body.appendChild(message);
    
    // Remove after 2 seconds
    setTimeout(() => {
      message.style.animation = 'scaleOut 0.3s ease';
      setTimeout(() => message.remove(), 300);
    }, 2000);
  }

  /**
   * Reset tour (for testing)
   */
  reset(): void {
    localStorage.removeItem('tweetcraft-tour-completed');
    this.hasSeenTour = false;
    console.log('%c🔄 Tour reset', 'color: #FFA500');
  }

  /**
   * Add required styles
   */
  static injectStyles(): void {
    if (document.querySelector('#tweetcraft-tour-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'tweetcraft-tour-styles';
    styles.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      @keyframes slideIn {
        from { 
          opacity: 0;
          transform: translateY(10px) translateX(-50%);
        }
        to { 
          opacity: 1;
          transform: translateY(0) translateX(-50%);
        }
      }
      
      @keyframes scaleIn {
        from { 
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
        to { 
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
      
      @keyframes scaleOut {
        from { 
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        to { 
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
      }
      
      @keyframes tourPulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.6;
          transform: scale(1.05);
        }
      }
      
      @keyframes bounce {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-5px);
        }
      }
      
      .tweetcraft-tour-highlight {
        position: relative !important;
        z-index: 9999 !important;
      }
    `;
    
    document.head.appendChild(styles);
  }
}

// Export singleton
export const guidedTour = new GuidedTour();
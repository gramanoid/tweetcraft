/**
 * Enhanced Loading State Manager
 * Provides rich loading feedback with progress indicators and animations
 */

export interface LoadingStage {
  stage: string;
  message: string;
  progress?: number;
  icon?: string;
}

export class LoadingStateManager {
  private static activeStates = new Map<string, LoadingStage>();
  private static startTimes = new Map<string, number>();
  
  /**
   * Loading stage definitions with estimated durations
   */
  static readonly STAGES = {
    PREPARING: { 
      stage: 'preparing', 
      message: 'Preparing request', 
      icon: '🔄',
      estimatedMs: 100 
    },
    VALIDATING: { 
      stage: 'validating', 
      message: 'Validating API', 
      icon: '🔐',
      estimatedMs: 200 
    },
    BUILDING: { 
      stage: 'building', 
      message: 'Building context', 
      icon: '🔨',
      estimatedMs: 300 
    },
    GENERATING: { 
      stage: 'generating', 
      message: 'Generating', 
      icon: '🤖',
      estimatedMs: 3000 
    },
    FINALIZING: { 
      stage: 'finalizing', 
      message: 'Finalizing response', 
      icon: '✨',
      estimatedMs: 200 
    }
  };

  /**
   * Start a loading operation with enhanced feedback
   */
  static startLoading(
    button: HTMLElement, 
    operationId: string,
    initialStage = this.STAGES.PREPARING
  ): void {
    // Store start time for duration tracking
    this.startTimes.set(operationId, Date.now());
    this.activeStates.set(operationId, initialStage);
    
    // Update button UI
    button.classList.add('loading', 'loading-enhanced');
    
    // Create or update loading container
    let container = button.querySelector('.loading-container') as HTMLElement;
    if (!container) {
      container = document.createElement('div');
      container.className = 'loading-container';
      button.appendChild(container);
    }
    
    // Create progress bar
    container.innerHTML = `
      <div class="loading-content">
        <span class="loading-icon">${initialStage.icon}</span>
        <span class="loading-message">${initialStage.message}...</span>
      </div>
      <div class="loading-progress-bar">
        <div class="loading-progress-fill" style="width: 0%"></div>
      </div>
      <div class="loading-meta">
        <span class="loading-time">0.0s</span>
        <span class="loading-cancel" data-operation="${operationId}">Cancel</span>
      </div>
    `;
    
    // Animate progress bar
    this.animateProgress(button, operationId, 0, 20);
    
    // Start time update interval
    this.startTimeUpdater(button, operationId);
    
    // Add cancel handler
    const cancelBtn = container.querySelector('.loading-cancel') as HTMLElement;
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cancelLoading(button, operationId);
      });
    }
    
    (button as HTMLButtonElement).disabled = true;
  }

  /**
   * Update loading stage with smooth transitions
   */
  static updateStage(
    button: HTMLElement,
    operationId: string,
    newStage: LoadingStage,
    progress?: number
  ): void {
    const currentStage = this.activeStates.get(operationId);
    if (!currentStage) return;
    
    this.activeStates.set(operationId, newStage);
    
    const container = button.querySelector('.loading-container');
    if (!container) return;
    
    // Update icon and message with fade effect
    const iconEl = container.querySelector('.loading-icon') as HTMLElement;
    const messageEl = container.querySelector('.loading-message') as HTMLElement;
    
    if (iconEl && messageEl) {
      // Fade out
      iconEl.style.opacity = '0.5';
      messageEl.style.opacity = '0.5';
      
      setTimeout(() => {
        iconEl.textContent = newStage.icon || '🔄';
        messageEl.textContent = `${newStage.message}...`;
        
        // Fade in
        iconEl.style.opacity = '1';
        messageEl.style.opacity = '1';
      }, 150);
    }
    
    // Update progress bar
    if (progress !== undefined) {
      this.animateProgress(button, operationId, progress, progress + 20);
    }
  }

  /**
   * Animate progress bar smoothly
   */
  private static animateProgress(
    button: HTMLElement,
    operationId: string,
    from: number,
    to: number
  ): void {
    const progressFill = button.querySelector('.loading-progress-fill') as HTMLElement;
    if (!progressFill) return;
    
    // Ensure we don't exceed 95% until complete
    to = Math.min(to, 95);
    
    progressFill.style.transition = 'width 0.3s ease-out';
    progressFill.style.width = `${to}%`;
    
    // Store current progress
    const stage = this.activeStates.get(operationId);
    if (stage) {
      stage.progress = to;
    }
  }

  /**
   * Update elapsed time display
   */
  private static startTimeUpdater(button: HTMLElement, operationId: string): void {
    const interval = setInterval(() => {
      const startTime = this.startTimes.get(operationId);
      if (!startTime || !this.activeStates.has(operationId)) {
        clearInterval(interval);
        return;
      }
      
      const elapsed = (Date.now() - startTime) / 1000;
      const timeEl = button.querySelector('.loading-time') as HTMLElement;
      if (timeEl) {
        timeEl.textContent = `${elapsed.toFixed(1)}s`;
        
        // Add warning color if taking too long
        if (elapsed > 10) {
          timeEl.style.color = '#FF6B6B';
        } else if (elapsed > 5) {
          timeEl.style.color = '#FFA500';
        }
      }
    }, 100);
  }

  /**
   * Complete loading with success animation
   */
  static completeLoading(
    button: HTMLElement,
    operationId: string,
    message = 'Complete!'
  ): void {
    const startTime = this.startTimes.get(operationId);
    const elapsed = startTime ? ((Date.now() - startTime) / 1000).toFixed(1) : '0.0';
    
    // Animate to 100%
    const progressFill = button.querySelector('.loading-progress-fill') as HTMLElement;
    if (progressFill) {
      progressFill.style.width = '100%';
    }
    
    // Show success state
    const container = button.querySelector('.loading-container');
    if (container) {
      setTimeout(() => {
        container.innerHTML = `
          <div class="loading-success">
            <span class="success-icon">✅</span>
            <span class="success-message">${message}</span>
            <span class="success-time">${elapsed}s</span>
          </div>
        `;
      }, 300);
    }
    
    // Clean up after animation
    setTimeout(() => {
      this.resetButton(button, operationId);
    }, 2000);
  }

  /**
   * Cancel loading operation
   */
  static cancelLoading(button: HTMLElement, operationId: string): void {
    const container = button.querySelector('.loading-container');
    if (container) {
      container.innerHTML = `
        <div class="loading-cancelled">
          <span class="cancel-icon">❌</span>
          <span class="cancel-message">Cancelled</span>
        </div>
      `;
    }
    
    // Dispatch cancel event
    button.dispatchEvent(new CustomEvent('loading-cancelled', { 
      detail: { operationId } 
    }));
    
    setTimeout(() => {
      this.resetButton(button, operationId);
    }, 1000);
  }

  /**
   * Handle loading error
   */
  static errorLoading(
    button: HTMLElement,
    operationId: string,
    error: string
  ): void {
    const container = button.querySelector('.loading-container');
    if (container) {
      container.innerHTML = `
        <div class="loading-error">
          <span class="error-icon">⚠️</span>
          <span class="error-message">${error}</span>
        </div>
      `;
    }
    
    setTimeout(() => {
      this.resetButton(button, operationId);
    }, 3000);
  }

  /**
   * Reset button to original state
   */
  private static resetButton(button: HTMLElement, operationId: string): void {
    button.classList.remove('loading', 'loading-enhanced');
    (button as HTMLButtonElement).disabled = false;
    
    const container = button.querySelector('.loading-container');
    if (container) {
      container.remove();
    }
    
    // Reset button text
    const span = button.querySelector('span');
    if (span) {
      span.textContent = 'AI Reply';
    }
    
    // Clean up tracking
    this.activeStates.delete(operationId);
    this.startTimes.delete(operationId);
  }

  /**
   * Get estimated time remaining
   */
  static getEstimatedTime(operationId: string): number {
    const stage = this.activeStates.get(operationId);
    if (!stage) return 0;
    
    // Calculate based on typical stage durations
    const stages = Object.values(this.STAGES);
    const currentIndex = stages.findIndex(s => s.stage === stage.stage);
    
    let remaining = 0;
    for (let i = currentIndex + 1; i < stages.length; i++) {
      remaining += stages[i].estimatedMs;
    }
    
    return remaining / 1000; // Return in seconds
  }
}
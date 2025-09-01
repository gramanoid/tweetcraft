/**
 * Extension Context Recovery System
 * Handles context invalidation and automatic recovery with state restoration
 */

import { debug, logError, logWarn } from '@/utils/debugConfig';

interface SavedState {
  timestamp: number;
  apiKey?: string;
  lastTone?: string;
  lastTemplate?: string;
  customTemplates?: any[];
  activeTab?: string;
  pendingReply?: {
    text: string;
    tweetId: string;
    context: string;
  };
  userPreferences?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

interface RecoveryConfig {
  autoRecover: boolean;
  stateExpiration: number; // milliseconds
  checkInterval: number; // milliseconds
  maxRecoveryAttempts: number;
}

export class ContextRecovery {
  private static readonly STATE_KEY = '__tweetcraft_state__';
  private static readonly RECOVERY_FLAG = '__tweetcraft_recovering__';
  private static isRecovering = false;
  private static checkTimer: ReturnType<typeof setInterval> | null = null;
  private static autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private static recoveryAttempts = 0;
  private static lastSaveTime = 0;
  private static stateChangeListeners = new Set<(state: SavedState) => void>();
  
  private static config: RecoveryConfig = {
    autoRecover: true,
    stateExpiration: 3600000, // 1 hour
    checkInterval: 5000, // 5 seconds
    maxRecoveryAttempts: 3
  };

  /**
   * Initialize context recovery system
   */
  static init(config?: Partial<RecoveryConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    console.log('%c🔄 Context Recovery', 'color: #FFA500; font-weight: bold', 'Initializing...');
    
    // Check if we're recovering from a context invalidation
    this.checkRecoveryState();
    
    // Start periodic context check
    this.startContextMonitoring();
    
    // Set up state auto-save
    this.setupAutoSave();
    
    // Listen for context invalidation
    this.setupInvalidationListener();
  }

  /**
   * Save current state
   */
  static saveState(partialState?: Partial<SavedState>): void {
    try {
      const currentState = this.getState() || {};
      const newState: SavedState = {
        ...currentState,
        ...partialState,
        timestamp: Date.now()
      };

      // Save to both localStorage and sessionStorage for redundancy
      localStorage.setItem(this.STATE_KEY, JSON.stringify(newState));
      sessionStorage.setItem(this.STATE_KEY, JSON.stringify(newState));
      
      // Also try to save to chrome.storage if available
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ [this.STATE_KEY]: newState })
          .then(() => {
            // Successfully saved
          })
          .catch(() => {
            // Ignore errors, storage might not be available
          });
      }

      this.lastSaveTime = Date.now();
      console.log('State saved', newState);
      
      // Notify listeners
      this.stateChangeListeners.forEach(listener => listener(newState));
    } catch (error) {
      logError('Failed to save state', error);
    }
  }

  /**
   * Get saved state
   */
  static getState(): SavedState | null {
    try {
      // Try localStorage first
      let stateStr = localStorage.getItem(this.STATE_KEY);
      
      // Fallback to sessionStorage
      if (!stateStr) {
        stateStr = sessionStorage.getItem(this.STATE_KEY);
      }
      
      if (!stateStr) return null;
      
      const state = JSON.parse(stateStr) as SavedState;
      
      // Check if state is expired
      if (Date.now() - state.timestamp > this.config.stateExpiration) {
        logWarn('Saved state expired');
        this.clearState();
        return null;
      }
      
      return state;
    } catch (error) {
      logError('Failed to get state', error);
      return null;
    }
  }

  /**
   * Clear saved state
   */
  static clearState(): void {
    try {
      localStorage.removeItem(this.STATE_KEY);
      sessionStorage.removeItem(this.STATE_KEY);
      
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.remove(this.STATE_KEY)
          .then(() => {
            // Successfully removed
          })
          .catch(() => {
            // Ignore errors
          });
      }
      
      console.log('State cleared');
    } catch (error) {
      logError('Failed to clear state', error);
    }
  }

  /**
   * Check if recovering from context invalidation
   */
  private static checkRecoveryState(): void {
    const isRecovering = sessionStorage.getItem(this.RECOVERY_FLAG) === 'true';
    
    if (isRecovering) {
      console.log('%c🔄 Recovery Mode', 'color: #FFA500; font-weight: bold', 'Recovering from context invalidation');
      this.performRecovery();
    }
  }

  /**
   * Perform recovery
   */
  private static async performRecovery(): Promise<void> {
    if (this.isRecovering || this.recoveryAttempts >= this.config.maxRecoveryAttempts) {
      return;
    }

    this.isRecovering = true;
    this.recoveryAttempts++;
    
    try {
      const state = this.getState();
      
      if (!state) {
        console.log('No state to recover');
        return;
      }

      console.log('%c🔄 Restoring State', 'color: #17BF63', state);
      
      // Restore API key
      if (state.apiKey && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        try {
          await chrome.runtime.sendMessage({
            type: 'SET_API_KEY',
            data: { apiKey: state.apiKey }
          });
        } catch (error) {
          // Ignore errors, runtime might not be available
        }
      }
      
      // Restore user preferences
      if (state.userPreferences) {
        await this.restorePreferences(state.userPreferences);
      }
      
      // Restore UI state
      if (state.lastTone || state.lastTemplate || state.activeTab) {
        await this.restoreUIState({
          lastTone: state.lastTone,
          lastTemplate: state.lastTemplate,
          activeTab: state.activeTab
        });
      }
      
      // Restore pending reply if any
      if (state.pendingReply) {
        await this.restorePendingReply(state.pendingReply);
      }
      
      // Clear recovery flag
      sessionStorage.removeItem(this.RECOVERY_FLAG);
      
      console.log('%c✅ Recovery Complete', 'color: #17BF63; font-weight: bold');
      
      // Dispatch recovery complete event
      window.dispatchEvent(new CustomEvent('tweetcraft-recovery-complete', {
        detail: { state, attempts: this.recoveryAttempts }
      }));
      
    } catch (error) {
      logError('Recovery failed', error);
      
      if (this.recoveryAttempts < this.config.maxRecoveryAttempts) {
        // Retry recovery after delay
        setTimeout(() => this.performRecovery(), 2000);
      }
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Restore user preferences
   */
  private static async restorePreferences(preferences: any): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        await chrome.runtime.sendMessage({
          type: 'SET_CONFIG',
          data: preferences
        });
      } catch (error) {
        // Ignore errors, runtime might not be available
      }
    }
  }

  /**
   * Restore UI state
   */
  private static async restoreUIState(uiState: any): Promise<void> {
    // Dispatch event for UI components to restore their state
    window.dispatchEvent(new CustomEvent('tweetcraft-restore-ui', {
      detail: uiState
    }));
  }

  /**
   * Restore pending reply
   */
  private static async restorePendingReply(pendingReply: any): Promise<void> {
    // Find the tweet and restore the reply
    const tweetElement = document.querySelector(`[data-tweet-id="${pendingReply.tweetId}"]`);
    
    if (tweetElement) {
      // Dispatch event to restore reply
      window.dispatchEvent(new CustomEvent('tweetcraft-restore-reply', {
        detail: pendingReply
      }));
    }
  }

  /**
   * Start monitoring for context invalidation
   */
  private static startContextMonitoring(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    this.checkTimer = setInterval(() => {
      this.checkContextHealth();
    }, this.config.checkInterval);
  }

  /**
   * Check if extension context is healthy
   */
  private static async checkContextHealth(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      return;
    }

    try {
      // Try to send a ping message to the background script
      await chrome.runtime.sendMessage({ type: 'PING' });
    } catch (error: any) {
      if (error?.message?.includes('Extension context invalidated')) {
        this.handleContextInvalidation();
      }
    }
  }

  /**
   * Handle context invalidation
   */
  private static handleContextInvalidation(): void {
    logWarn('Extension context invalidated, preparing for recovery');
    
    // Save current state before reload
    this.saveState();
    
    // Set recovery flag
    sessionStorage.setItem(this.RECOVERY_FLAG, 'true');
    
    // Notify user
    this.notifyUserOfRecovery();
    
    // Reload the page after a short delay
    setTimeout(() => {
      location.reload();
    }, 1000);
  }

  /**
   * Setup invalidation listener
   */
  private static setupInvalidationListener(): void {
    // Listen for unhandled promise rejections that might indicate context issues
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('Extension context invalidated')) {
        this.handleContextInvalidation();
      }
    });

    // Listen for chrome runtime errors
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Keep connection alive
        if (message.type === 'PING') {
          sendResponse({ status: 'PONG' });
        }
      });
    }
  }

  /**
   * Setup auto-save
   */
  private static setupAutoSave(): void {
    // Save state on important events
    const events = [
      'tweetcraft-reply-generated',
      'tweetcraft-template-selected',
      'tweetcraft-tone-selected',
      'tweetcraft-custom-template-saved'
    ];

    events.forEach(eventName => {
      window.addEventListener(eventName, (event: any) => {
        this.saveState(event.detail);
      });
    });

    // Save state periodically
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setInterval(() => {
      if (Date.now() - this.lastSaveTime > 30000) { // Every 30 seconds
        this.saveState();
      }
    }, 30000);
  }

  /**
   * Notify user of recovery
   */
  private static notifyUserOfRecovery(): void {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #FFA500;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      ">
        🔄 TweetCraft is recovering your session...
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * Add state change listener
   */
  static onStateChange(listener: (state: SavedState) => void): () => void {
    this.stateChangeListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.stateChangeListeners.delete(listener);
    };
  }

  /**
   * Destroy and cleanup
   */
  static destroy(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    
    this.stateChangeListeners.clear();
    this.isRecovering = false;
    this.recoveryAttempts = 0;
  }

  /**
   * Force recovery (for testing)
   */
  static forceRecovery(): void {
    this.handleContextInvalidation();
  }

  /**
   * Get recovery status
   */
  static getStatus(): {
    isRecovering: boolean;
    recoveryAttempts: number;
    hasState: boolean;
    stateAge: number | null;
  } {
    const state = this.getState();
    
    return {
      isRecovering: this.isRecovering,
      recoveryAttempts: this.recoveryAttempts,
      hasState: state !== null,
      stateAge: state ? Date.now() - state.timestamp : null
    };
  }
}

// Auto-initialize if in browser context
if (typeof window !== 'undefined') {
  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ContextRecovery.init();
    });
  } else {
    ContextRecovery.init();
  }
}
/**
 * Memory Management System for TweetCraft
 * Tracks and cleans up all resources to prevent memory leaks
 */

interface MemoryStats {
  listeners: number;
  observers: number;
  timers: number;
  intervals: number;
  abortControllers: number;
  totalResources: number;
}

interface ListenerInfo {
  element: Element | Document | Window;
  event: string;
  handler: EventListener;
  options?: boolean | AddEventListenerOptions;
}

export class MemoryManager {
  private listeners: Map<string, ListenerInfo> = new Map();
  private observers: Set<MutationObserver> = new Set();
  private timers: Set<number> = new Set();
  private intervals: Set<number> = new Set();
  private abortControllers: Set<AbortController> = new Set();
  private cleanupCallbacks: Set<() => void> = new Set();
  private isDestroyed = false;

  constructor() {
    // Auto-cleanup on page unload
    this.addEventListener(window, 'beforeunload', () => this.cleanup());
    this.addEventListener(window, 'pagehide', () => this.cleanup());
    
    // Log memory stats periodically in dev mode
    if (process.env.NODE_ENV === 'development') {
      this.setInterval(() => {
        const stats = this.getStats();
        if (stats.totalResources > 0) {
          console.log('[MemoryManager] Current resources:', stats);
        }
      }, 30000); // Every 30 seconds
    }
  }

  /**
   * Add event listener with automatic tracking
   */
  addEventListener(
    element: Element | Document | Window,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
  ): string {
    if (this.isDestroyed) {
      // Silently ignore attempts to add listeners after cleanup
      // This happens during page navigation and is expected
      return '';
    }

    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.listeners.set(id, { element, event, handler, options });
    element.addEventListener(event, handler, options);
    
    console.log(`[MemoryManager] Added listener: ${event} (${id})`);
    return id;
  }

  /**
   * Remove specific event listener
   */
  removeEventListener(id: string): void {
    const listener = this.listeners.get(id);
    if (listener) {
      const { element, event, handler, options } = listener;
      element.removeEventListener(event, handler, options);
      this.listeners.delete(id);
      console.log(`[MemoryManager] Removed listener: ${event} (${id})`);
    }
  }

  /**
   * Create and track mutation observer
   */
  createObserver(callback: MutationCallback): MutationObserver {
    if (this.isDestroyed) {
      // Return a no-op observer if destroyed
      return new MutationObserver(() => {});
    }

    const observer = new MutationObserver(callback);
    this.observers.add(observer);
    
    console.log('[MemoryManager] Created mutation observer');
    return observer;
  }

  /**
   * Remove and disconnect observer
   */
  removeObserver(observer: MutationObserver): void {
    if (this.observers.has(observer)) {
      observer.disconnect();
      this.observers.delete(observer);
      console.log('[MemoryManager] Removed mutation observer');
    }
  }

  /**
   * Set timeout with tracking
   */
  setTimeout(callback: () => void, delay: number): number {
    if (this.isDestroyed) {
      console.warn('[MemoryManager] Attempted to set timeout after cleanup');
      return 0;
    }

    const id = window.setTimeout(() => {
      callback();
      this.timers.delete(id);
    }, delay);
    
    this.timers.add(id);
    return id;
  }

  /**
   * Clear specific timeout
   */
  clearTimeout(id: number): void {
    if (this.timers.has(id)) {
      window.clearTimeout(id);
      this.timers.delete(id);
    }
  }

  /**
   * Set interval with tracking
   */
  setInterval(callback: () => void, delay: number): number {
    if (this.isDestroyed) {
      console.warn('[MemoryManager] Attempted to set interval after cleanup');
      return 0;
    }

    const id = window.setInterval(callback, delay);
    this.intervals.add(id);
    return id;
  }

  /**
   * Clear specific interval
   */
  clearInterval(id: number): void {
    if (this.intervals.has(id)) {
      window.clearInterval(id);
      this.intervals.delete(id);
    }
  }

  /**
   * Create abort controller for fetch requests
   */
  createAbortController(): AbortController {
    if (this.isDestroyed) {
      console.warn('[MemoryManager] Attempted to create abort controller after cleanup');
      return new AbortController();
    }

    const controller = new AbortController();
    this.abortControllers.add(controller);
    return controller;
  }

  /**
   * Remove abort controller
   */
  removeAbortController(controller: AbortController): void {
    this.abortControllers.delete(controller);
  }

  /**
   * Register a cleanup callback
   */
  registerCleanup(callback: () => void): void {
    this.cleanupCallbacks.add(callback);
  }

  /**
   * Unregister a cleanup callback
   */
  unregisterCleanup(callback: () => void): void {
    this.cleanupCallbacks.delete(callback);
  }

  /**
   * Get current memory statistics
   */
  getStats(): MemoryStats {
    return {
      listeners: this.listeners.size,
      observers: this.observers.size,
      timers: this.timers.size,
      intervals: this.intervals.size,
      abortControllers: this.abortControllers.size,
      totalResources: 
        this.listeners.size + 
        this.observers.size + 
        this.timers.size + 
        this.intervals.size + 
        this.abortControllers.size
    };
  }

  /**
   * Check if manager has been destroyed
   */
  get destroyed(): boolean {
    return this.isDestroyed;
  }

  /**
   * Clean up all tracked resources
   */
  cleanup(): void {
    if (this.isDestroyed) {
      return;
    }

    console.log('[MemoryManager] Starting cleanup...');
    const stats = this.getStats();
    console.log('[MemoryManager] Resources before cleanup:', stats);

    // Remove all event listeners
    this.listeners.forEach(({ element, event, handler, options }) => {
      try {
        element.removeEventListener(event, handler, options);
      } catch (e) {
        console.warn('[MemoryManager] Error removing listener:', e);
      }
    });
    this.listeners.clear();

    // Disconnect all observers
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (e) {
        console.warn('[MemoryManager] Error disconnecting observer:', e);
      }
    });
    this.observers.clear();

    // Clear all timers
    this.timers.forEach(id => {
      try {
        window.clearTimeout(id);
      } catch (e) {
        console.warn('[MemoryManager] Error clearing timeout:', e);
      }
    });
    this.timers.clear();

    // Clear all intervals
    this.intervals.forEach(id => {
      try {
        window.clearInterval(id);
      } catch (e) {
        console.warn('[MemoryManager] Error clearing interval:', e);
      }
    });
    this.intervals.clear();

    // Abort all fetch requests
    this.abortControllers.forEach(controller => {
      try {
        controller.abort();
      } catch (e) {
        console.warn('[MemoryManager] Error aborting request:', e);
      }
    });
    this.abortControllers.clear();

    // Run all cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (e) {
        console.warn('[MemoryManager] Error in cleanup callback:', e);
      }
    });
    this.cleanupCallbacks.clear();

    this.isDestroyed = true;
    console.log('[MemoryManager] Cleanup complete');
  }

  /**
   * Reset the manager (useful for testing)
   */
  reset(): void {
    this.cleanup();
    this.isDestroyed = false;
  }
}

// Create singleton instance
export const memoryManager = new MemoryManager();

// Export for use in content scripts
if (typeof window !== 'undefined') {
  (window as any).__tweetcraftMemoryManager = memoryManager;
}
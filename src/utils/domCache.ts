/**
 * DOM Query Cache for performance optimization
 * Caches frequently accessed DOM elements with automatic invalidation
 */

interface CacheEntry {
  element: Element | null;
  timestamp: number;
  selector: string;
}

export class DOMCache {
  private static cache = new Map<string, CacheEntry>();
  private static readonly TTL = 5000; // 5 seconds cache TTL
  private static mutationObserver: MutationObserver | null = null;

  /**
   * Initialize the DOM cache with mutation observer for invalidation
   */
  static init(): void {
    if (this.mutationObserver) return;

    this.mutationObserver = new MutationObserver((mutations) => {
      // Intelligently invalidate cache based on mutations
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Clear cache when significant DOM changes occur
          this.clearStaleEntries();
        }
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Query selector with caching
   */
  static querySelector<T extends Element>(selector: string, parent: Element | Document = document): T | null {
    const cacheKey = `${parent === document ? 'doc' : 'el'}:${selector}`;
    const cached = this.cache.get(cacheKey);

    // Return cached element if still valid
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      // Verify element is still in DOM
      if (cached.element && document.contains(cached.element)) {
        return cached.element as T;
      }
    }

    // Query DOM and cache result
    const element = parent.querySelector<T>(selector);
    this.cache.set(cacheKey, {
      element,
      timestamp: Date.now(),
      selector
    });

    return element;
  }

  /**
   * Query selector all with caching
   */
  static querySelectorAll<T extends Element>(selector: string, parent: Element | Document = document): NodeListOf<T> {
    // For querySelectorAll, we don't cache as NodeLists are live
    // But we can optimize by batching queries
    return parent.querySelectorAll<T>(selector);
  }

  /**
   * Clear stale cache entries
   */
  private static clearStaleEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL || !document.contains(entry.element)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Cleanup and destroy
   */
  static destroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    this.cache.clear();
  }
}
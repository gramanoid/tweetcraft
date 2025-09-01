/**
 * DOM Query Cache for performance optimization
 * Caches frequently accessed DOM elements with automatic invalidation
 */

interface CacheEntry {
  element: Element | null;
  timestamp: number;
  selector: string;
}

interface WeakCacheEntry {
  timestamp: number;
  selector: string;
  parentRef?: any; // WeakRef type if supported
}

// Feature detection for WeakRef
const hasWeakRef = typeof WeakRef !== 'undefined';

export class DOMCache {
  // Primary cache using Map for string keys
  private static cache = new Map<string, CacheEntry>();
  
  // WeakMap cache for element-to-element relationships
  private static weakCache = new WeakMap<Element, Map<string, WeakCacheEntry>>();
  
  // WeakMap for caching query results based on parent elements
  private static elementQueryCache = hasWeakRef 
    ? new WeakMap<Element, Map<string, any>>() 
    : new WeakMap<Element, Map<string, Element>>();
  
  private static readonly TTL = 5000; // 5 seconds cache TTL
  private static mutationObserver: MutationObserver | null = null;
  
  // Performance metrics
  private static metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    weakCacheHits: 0,
    weakCacheMisses: 0
  };

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
   * Query selector with caching (enhanced with WeakMap for element parents)
   */
  static querySelector<T extends Element>(selector: string, parent: Element | Document = document): T | null {
    // Use WeakMap cache for element parents
    if (parent !== document && parent instanceof Element) {
      return this.queryWithWeakCache<T>(selector, parent);
    }
    
    // Use regular cache for document queries
    const cacheKey = `doc:${selector}`;
    const cached = this.cache.get(cacheKey);

    // Return cached element if still valid
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      // Verify element is still in DOM
      if (cached.element && document.contains(cached.element)) {
        this.metrics.cacheHits++;
        return cached.element as T;
      }
    }

    this.metrics.cacheMisses++;
    
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
   * Query with WeakMap caching for element parents
   */
  private static queryWithWeakCache<T extends Element>(selector: string, parent: Element): T | null {
    // Get or create cache for this parent element
    let parentCache = this.elementQueryCache.get(parent);
    
    if (!parentCache) {
      parentCache = new Map();
      this.elementQueryCache.set(parent, parentCache);
    }
    
    // Check if we have a cached result
    if (hasWeakRef) {
      const cachedRef = parentCache.get(selector);
      if (cachedRef) {
        const cached = cachedRef.deref();
        if (cached && parent.contains(cached)) {
          this.metrics.weakCacheHits++;
          return cached as T;
        }
      }
    } else {
      // Fallback for browsers without WeakRef
      const cached = parentCache.get(selector);
      if (cached && parent.contains(cached)) {
        this.metrics.weakCacheHits++;
        return cached as T;
      }
    }
    
    this.metrics.weakCacheMisses++;
    
    // Query and cache the result
    const element = parent.querySelector<T>(selector);
    if (element) {
      if (hasWeakRef) {
        parentCache.set(selector, new WeakRef(element));
      } else {
        parentCache.set(selector, element);
      }
    }
    
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
    // WeakMaps will be garbage collected automatically
    this.resetMetrics();
  }

  /**
   * Cleanup and destroy
   */
  static destroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    this.clear();
  }
  
  /**
   * Get cache metrics
   */
  static getMetrics() {
    const totalHits = this.metrics.cacheHits + this.metrics.weakCacheHits;
    const totalMisses = this.metrics.cacheMisses + this.metrics.weakCacheMisses;
    const hitRate = totalHits + totalMisses > 0 
      ? (totalHits / (totalHits + totalMisses) * 100).toFixed(2) 
      : 0;
    
    return {
      ...this.metrics,
      totalHits,
      totalMisses,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size
    };
  }
  
  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      weakCacheHits: 0,
      weakCacheMisses: 0
    };
  }
  
  /**
   * Batch query multiple selectors efficiently
   */
  static batchQuery<T extends Element>(selectors: string[], parent: Element | Document = document): Map<string, T | null> {
    const results = new Map<string, T | null>();
    
    for (const selector of selectors) {
      results.set(selector, this.querySelector<T>(selector, parent));
    }
    
    return results;
  }
}
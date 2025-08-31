/**
 * Prompt Caching Service for TweetCraft
 * LRU cache for combined prompts and API responses
 */

interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  accessCount: number;
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  currentSize: number;
  maxSize: number;
  entryCount: number;
}

export class PromptCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    currentSize: 0,
    maxSize: 100,
    entryCount: 0
  };
  
  // Configuration
  private readonly MAX_ENTRIES = 100;
  private readonly MAX_AGE_MS = 3600000; // 1 hour
  private readonly MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

  constructor() {
    this.loadFromSession();
    console.log('%c💾 PromptCache initialized', 'color: #1DA1F2; font-weight: bold');
  }

  /**
   * Generate cache key from parameters
   */
  private generateKey(params: {
    templateId?: string;
    toneId?: string;
    context?: string;
    customPrompt?: string;
  }): string {
    const parts = [
      params.templateId || '',
      params.toneId || '',
      params.context ? this.hashString(params.context) : '',
      params.customPrompt ? this.hashString(params.customPrompt) : ''
    ].filter(Boolean);
    
    return parts.join(':');
  }

  /**
   * Simple hash function for strings
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Calculate size of value in bytes (approximate)
   */
  private calculateSize(value: any): number {
    const str = JSON.stringify(value);
    return new Blob([str]).size;
  }

  /**
   * Get cached prompt or response
   */
  get(params: {
    templateId?: string;
    toneId?: string;
    context?: string;
    customPrompt?: string;
  }): any | null {
    const key = this.generateKey(params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      console.log('%c💾 Cache miss', 'color: #FFA500', key);
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.MAX_AGE_MS) {
      this.delete(key);
      this.stats.misses++;
      console.log('%c💾 Cache expired', 'color: #FFA500', key);
      return null;
    }

    // Update access order and count
    entry.accessCount++;
    this.updateAccessOrder(key);
    
    this.stats.hits++;
    console.log('%c💾 Cache hit', 'color: #17BF63', key, `(${entry.accessCount} accesses)`);
    
    return entry.value;
  }

  /**
   * Set cached value
   */
  set(params: {
    templateId?: string;
    toneId?: string;
    context?: string;
    customPrompt?: string;
  }, value: any): void {
    const key = this.generateKey(params);
    const size = this.calculateSize(value);

    // Check if single entry is too large
    if (size > this.MAX_SIZE_BYTES / 2) {
      console.warn('%c💾 Entry too large to cache', 'color: #DC3545', key, size);
      return;
    }

    // Evict entries if necessary
    while (this.cache.size >= this.MAX_ENTRIES || 
           this.stats.currentSize + size > this.MAX_SIZE_BYTES) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      accessCount: 1,
      size
    };

    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.stats.currentSize += size;
    this.stats.entryCount = this.cache.size;

    console.log('%c💾 Cached', 'color: #1DA1F2', key, `(${size} bytes)`);
    
    // Persist to session storage
    this.saveToSession();
  }

  /**
   * Get combined prompt from cache
   */
  getCombinedPrompt(templateId: string, toneId: string): string | null {
    return this.get({ templateId, toneId });
  }

  /**
   * Set combined prompt in cache
   */
  setCombinedPrompt(templateId: string, toneId: string, prompt: string): void {
    this.set({ templateId, toneId }, prompt);
  }

  /**
   * Get API response from cache
   */
  getApiResponse(params: {
    templateId?: string;
    toneId?: string;
    context?: string;
  }): string | null {
    const key = `api:${this.generateKey(params)}`;
    const entry = this.cache.get(key);
    
    if (entry) {
      this.stats.hits++;
      console.log('%c💾 API response cache hit', 'color: #17BF63');
      return entry.value;
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Set API response in cache
   */
  setApiResponse(params: {
    templateId?: string;
    toneId?: string;
    context?: string;
  }, response: string): void {
    const key = `api:${this.generateKey(params)}`;
    this.set({ customPrompt: key }, response);
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const keyToEvict = this.accessOrder.shift()!;
    const entry = this.cache.get(keyToEvict);
    
    if (entry) {
      this.stats.currentSize -= entry.size;
      this.cache.delete(keyToEvict);
      this.stats.evictions++;
      this.stats.entryCount = this.cache.size;
      
      console.log('%c💾 Evicted LRU', 'color: #FFA500', keyToEvict);
    }
  }

  /**
   * Delete specific entry
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.currentSize -= entry.size;
      this.cache.delete(key);
      
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      
      this.stats.entryCount = this.cache.size;
      return true;
    }
    return false;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.currentSize = 0;
    this.stats.entryCount = 0;
    
    console.log('%c💾 Cache cleared', 'color: #FFA500');
    this.clearSession();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Save cache to session storage
   */
  private saveToSession(): void {
    try {
      // Only save most recent entries to avoid quota issues
      const entriesToSave = Array.from(this.cache.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp)
        .slice(0, 20)
        .reduce((acc, [key, entry]) => {
          acc[key] = {
            value: entry.value,
            timestamp: entry.timestamp
          };
          return acc;
        }, {} as any);

      sessionStorage.setItem('tweetcraft_prompt_cache', JSON.stringify(entriesToSave));
    } catch (error) {
      console.warn('Failed to save cache to session:', error);
    }
  }

  /**
   * Load cache from session storage
   */
  private loadFromSession(): void {
    try {
      const saved = sessionStorage.getItem('tweetcraft_prompt_cache');
      if (saved) {
        const entries = JSON.parse(saved);
        let loadedCount = 0;
        
        for (const [key, data] of Object.entries(entries as any)) {
          const entry = data as any;
          // Only load if not expired
          if (Date.now() - entry.timestamp < this.MAX_AGE_MS) {
            const size = this.calculateSize(entry.value);
            this.cache.set(key, {
              key,
              value: entry.value,
              timestamp: entry.timestamp,
              accessCount: 0,
              size
            });
            this.accessOrder.push(key);
            this.stats.currentSize += size;
            loadedCount++;
          }
        }
        
        this.stats.entryCount = this.cache.size;
        console.log(`%c💾 Loaded ${loadedCount} entries from session`, 'color: #1DA1F2');
      }
    } catch (error) {
      console.warn('Failed to load cache from session:', error);
    }
  }

  /**
   * Clear session storage
   */
  private clearSession(): void {
    try {
      sessionStorage.removeItem('tweetcraft_prompt_cache');
    } catch (error) {
      console.warn('Failed to clear session cache:', error);
    }
  }

  /**
   * Preload commonly used combinations
   */
  async preloadCommon(templateIds: string[], toneIds: string[]): Promise<void> {
    console.log('%c💾 Preloading common combinations', 'color: #1DA1F2');
    
    for (const templateId of templateIds) {
      for (const toneId of toneIds) {
        // Check if already cached
        if (!this.getCombinedPrompt(templateId, toneId)) {
          // Generate and cache the combination
          // This would typically call the ConfigurationManager
          // but we'll leave the actual generation to the caller
          console.log(`%c  Marked for preload: ${templateId}:${toneId}`, 'color: #657786');
        }
      }
    }
  }

  /**
   * Debug: Print cache contents
   */
  debug(): void {
    console.group('%c💾 PromptCache Debug', 'color: #1DA1F2; font-weight: bold');
    console.log('Stats:', this.getStats());
    console.log('Hit Rate:', `${this.getHitRate().toFixed(2)}%`);
    console.log('Entries:', this.cache.size);
    console.log('Size:', `${(this.stats.currentSize / 1024).toFixed(2)} KB`);
    
    console.group('Contents:');
    this.cache.forEach((entry, key) => {
      console.log(`${key}: ${entry.accessCount} accesses, ${entry.size} bytes, age: ${Math.floor((Date.now() - entry.timestamp) / 1000)}s`);
    });
    console.groupEnd();
    
    console.groupEnd();
  }
}

// Export singleton instance
export const promptCache = new PromptCache();
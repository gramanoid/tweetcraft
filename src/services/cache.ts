interface CacheEntry {
  reply: string;
  timestamp: number;
  tweetId: string;
  tone: string;
}

export class CacheService {
  private static cache = new Map<string, CacheEntry>();
  private static readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  
  static generateCacheKey(tweetId: string, tone: string): string {
    return `${tweetId}-${tone}`;
  }
  
  static get(tweetId: string, tone: string): string | null {
    const key = this.generateCacheKey(tweetId, tone);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if cache entry has expired
    const now = Date.now();
    if (now - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    console.log('Smart Reply: Cache hit for tweet', tweetId, 'with tone', tone);
    return entry.reply;
  }
  
  static set(tweetId: string, tone: string, reply: string): void {
    const key = this.generateCacheKey(tweetId, tone);
    const entry: CacheEntry = {
      reply,
      timestamp: Date.now(),
      tweetId,
      tone
    };
    
    this.cache.set(key, entry);
    console.log('Smart Reply: Cached reply for tweet', tweetId, 'with tone', tone);
    
    // Clean up old entries periodically
    this.cleanupOldEntries();
  }
  
  static clear(): void {
    this.cache.clear();
    console.log('Smart Reply: Cache cleared');
  }
  
  private static cleanupOldEntries(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        entriesToDelete.push(key);
      }
    });
    
    entriesToDelete.forEach(key => this.cache.delete(key));
    
    if (entriesToDelete.length > 0) {
      console.log(`Smart Reply: Cleaned up ${entriesToDelete.length} expired cache entries`);
    }
  }
  
  static getCacheSize(): number {
    return this.cache.size;
  }
  
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}
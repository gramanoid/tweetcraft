/**
 * API Request Optimizer for TweetCraft
 * Implements request deduplication, intelligent batching, and connection-aware timeouts
 */

import { debug, logAPI, logPerf } from '@/utils/debugConfig';

interface PendingRequest {
  key: string;
  promise: Promise<any>;
  timestamp: number;
  abortController?: AbortController;
}

interface BatchedRequest {
  requests: Array<{
    id: string;
    params: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>;
  timer?: ReturnType<typeof setTimeout>;
  timestamp: number;
}

interface RequestMetrics {
  totalRequests: number;
  deduplicatedRequests: number;
  batchedRequests: number;
  averageResponseTime: number;
  cacheHits: number;
  cacheMisses: number;
}

export class RequestOptimizer {
  // Request deduplication
  private pendingRequests = new Map<string, PendingRequest>();
  private responseCache = new Map<string, { data: any; timestamp: number }>();
  
  // Request batching
  private batchQueue = new Map<string, BatchedRequest>();
  
  // Configuration
  private readonly DEDUP_WINDOW_MS = 30000; // 30 seconds
  private readonly BATCH_WINDOW_MS = 200; // 200ms to collect requests
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache
  private readonly MAX_BATCH_SIZE = 10;
  
  // Metrics
  private metrics: RequestMetrics = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    batchedRequests: 0,
    averageResponseTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
  
  // Response times for average calculation
  private responseTimes: number[] = [];
  private readonly MAX_RESPONSE_TIME_SAMPLES = 100;

  private cleanupTimer?: ReturnType<typeof setInterval>;
  
  constructor() {
    this.startCacheCleanup();
    logAPI('%c🚀 Request Optimizer initialized', 'color: #1DA1F2; font-weight: bold');
  }
  
  /**
   * Cleanup resources when service is destroyed
   */
  destroy(): void {
    // Clear all timers
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    // Clear any pending batch timers
    this.batchQueue.forEach(batch => {
      if (batch.timer) {
        clearTimeout(batch.timer);
      }
    });
    
    // Clear pending requests
    this.pendingRequests.forEach(request => {
      if (request.abortController) {
        request.abortController.abort();
      }
    });
    
    // Clear caches
    this.pendingRequests.clear();
    this.responseCache.clear();
    this.batchQueue.clear();
    
    console.log('%c🧹 Request Optimizer destroyed', 'color: #FFA500');
  }

  /**
   * Generate cache key from request parameters
   */
  private generateKey(endpoint: string, params: any): string {
    const sortedParams = this.sortObjectKeys(params);
    return `${endpoint}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Sort object keys for consistent cache key generation
   */
  private sortObjectKeys(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.sortObjectKeys(item));
    
    return Object.keys(obj)
      .sort()
      .reduce((sorted: any, key) => {
        sorted[key] = this.sortObjectKeys(obj[key]);
        return sorted;
      }, {});
  }

  /**
   * Check if request is already pending (deduplication)
   */
  private checkPendingRequest(key: string): PendingRequest | null {
    const pending = this.pendingRequests.get(key);
    
    if (pending) {
      const age = Date.now() - pending.timestamp;
      
      // If request is still within dedup window, return it
      if (age < this.DEDUP_WINDOW_MS) {
        this.metrics.deduplicatedRequests++;
        logAPI('%c🔄 Request deduplicated', 'color: #FFA500', key);
        return pending;
      }
      
      // Otherwise, remove stale pending request
      this.pendingRequests.delete(key);
    }
    
    return null;
  }

  /**
   * Check response cache
   */
  private checkCache(key: string): any | null {
    const cached = this.responseCache.get(key);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      
      if (age < this.CACHE_TTL_MS) {
        this.metrics.cacheHits++;
        logAPI('%c💾 Cache hit', 'color: #17BF63', key);
        return cached.data;
      }
      
      // Remove expired cache entry
      this.responseCache.delete(key);
    }
    
    this.metrics.cacheMisses++;
    return null;
  }

  /**
   * Execute request with deduplication
   */
  async executeWithDedup<T>(
    endpoint: string,
    params: any,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const key = this.generateKey(endpoint, params);
    this.metrics.totalRequests++;
    
    // Check cache first
    const cached = this.checkCache(key);
    if (cached !== null) {
      return cached;
    }
    
    // Check for pending request
    const pending = this.checkPendingRequest(key);
    if (pending) {
      return pending.promise;
    }
    
    // Create new request
    const abortController = new AbortController();
    const startTime = Date.now();
    
    const promise = requestFn()
      .then(result => {
        // Track response time
        const responseTime = Date.now() - startTime;
        this.trackResponseTime(responseTime);
        
        // Cache successful response
        this.responseCache.set(key, {
          data: result,
          timestamp: Date.now()
        });
        
        // Clean up pending request
        this.pendingRequests.delete(key);
        
        logAPI('%c✅ Request completed', 'color: #17BF63', key, `${responseTime}ms`);
        return result;
      })
      .catch(error => {
        // Clean up pending request on error
        this.pendingRequests.delete(key);
        
        logAPI('%c❌ Request failed', 'color: #DC3545', key, error);
        throw error;
      });
    
    // Store as pending request
    this.pendingRequests.set(key, {
      key,
      promise,
      timestamp: Date.now(),
      abortController
    });
    
    return promise;
  }

  /**
   * Batch multiple requests
   */
  async batchRequest<T>(
    batchKey: string,
    requestId: string,
    params: any,
    batchProcessor: (requests: any[]) => Promise<Map<string, T>>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Get or create batch
      let batch = this.batchQueue.get(batchKey);
      
      if (!batch) {
        batch = {
          requests: [],
          timestamp: Date.now()
        };
        this.batchQueue.set(batchKey, batch);
        
        // Set timer to process batch
        batch.timer = setTimeout(() => {
          this.processBatch(batchKey, batchProcessor);
        }, this.BATCH_WINDOW_MS);
      }
      
      // Add request to batch
      batch.requests.push({
        id: requestId,
        params,
        resolve,
        reject
      });
      
      // Process immediately if batch is full
      if (batch.requests.length >= this.MAX_BATCH_SIZE) {
        if (batch.timer) {
          clearTimeout(batch.timer);
        }
        this.processBatch(batchKey, batchProcessor);
      }
      
      logAPI('%c📦 Request batched', 'color: #9146FF', batchKey, requestId);
    });
  }

  /**
   * Process a batch of requests
   */
  private async processBatch<T>(
    batchKey: string,
    batchProcessor: (requests: any[]) => Promise<Map<string, T>>
  ): Promise<void> {
    const batch = this.batchQueue.get(batchKey);
    if (!batch || batch.requests.length === 0) return;
    
    // Remove batch from queue
    this.batchQueue.delete(batchKey);
    
    const startTime = Date.now();
    const requestCount = batch.requests.length;
    
    try {
      logAPI('%c🚀 Processing batch', 'color: #1DA1F2', batchKey, `${requestCount} requests`);
      
      // Process all requests in batch
      const results = await batchProcessor(batch.requests.map(r => ({
        id: r.id,
        params: r.params
      })));
      
      // Resolve individual promises
      batch.requests.forEach(request => {
        const result = results.get(request.id);
        if (result !== undefined) {
          request.resolve(result);
        } else {
          request.reject(new Error(`No result for request ${request.id}`));
        }
      });
      
      // Track metrics
      this.metrics.batchedRequests += requestCount;
      const responseTime = Date.now() - startTime;
      this.trackResponseTime(responseTime);
      
      logAPI('%c✅ Batch processed', 'color: #17BF63', batchKey, `${responseTime}ms`);
      
    } catch (error) {
      // Reject all promises in batch
      batch.requests.forEach(request => {
        request.reject(error);
      });
      
      logAPI('%c❌ Batch failed', 'color: #DC3545', batchKey, error);
    }
  }

  /**
   * Get adaptive timeout based on connection quality
   */
  getAdaptiveTimeout(): number {
    // Check if Network Information API is available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      const effectiveType = connection.effectiveType;
      
      switch (effectiveType) {
        case 'slow-2g':
          return 90000; // 90 seconds
        case '2g':
          return 60000; // 60 seconds
        case '3g':
          return 45000; // 45 seconds
        case '4g':
        default:
          return 30000; // 30 seconds
      }
    }
    
    // Default timeout if API not available
    return 30000;
  }

  /**
   * Track response time for metrics
   */
  private trackResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // Keep only recent samples
    if (this.responseTimes.length > this.MAX_RESPONSE_TIME_SAMPLES) {
      this.responseTimes.shift();
    }
    
    // Update average
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = Math.round(sum / this.responseTimes.length);
  }

  /**
   * Clean up expired cache entries periodically
   */
  private startCacheCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      // Clean response cache
      this.responseCache.forEach((entry, key) => {
        if (now - entry.timestamp > this.CACHE_TTL_MS) {
          this.responseCache.delete(key);
          cleaned++;
        }
      });
      
      // Clean pending requests
      this.pendingRequests.forEach((request, key) => {
        if (now - request.timestamp > this.DEDUP_WINDOW_MS) {
          this.pendingRequests.delete(key);
          cleaned++;
        }
      });
      
      if (cleaned > 0) {
        logPerf('%c🧹 Cache cleanup', 'color: #657786', `${cleaned} entries removed`);
      }
    }, 60000); // Run every minute
  }

  /**
   * Cancel pending request
   */
  cancelRequest(endpoint: string, params: any): void {
    const key = this.generateKey(endpoint, params);
    const pending = this.pendingRequests.get(key);
    
    if (pending && pending.abortController) {
      pending.abortController.abort();
      this.pendingRequests.delete(key);
      logAPI('%c🚫 Request cancelled', 'color: #FFA500', key);
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.responseCache.clear();
    this.pendingRequests.clear();
    this.batchQueue.clear();
    logAPI('%c🧹 All caches cleared', 'color: #FFA500');
  }

  /**
   * Get current metrics
   */
  getMetrics(): RequestMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      batchedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    this.responseTimes = [];
  }

  /**
   * Get cache size info
   */
  getCacheInfo(): {
    responseCacheSize: number;
    pendingRequestsSize: number;
    batchQueueSize: number;
  } {
    return {
      responseCacheSize: this.responseCache.size,
      pendingRequestsSize: this.pendingRequests.size,
      batchQueueSize: this.batchQueue.size
    };
  }
}

// Export singleton instance
export const requestOptimizer = new RequestOptimizer();
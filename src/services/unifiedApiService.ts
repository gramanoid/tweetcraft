/**
 * Unified API Service for TweetCraft
 * Centralizes all OpenRouter API calls with deduplication and caching
 */

import { logger } from '@/utils/logger';
import { OpenRouterService } from './openRouter';

interface RequestSignature {
  method: string;
  params: any;
  timestamp: number;
}

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  requestCount: number;
}

export class UnifiedApiService {
  // Request deduplication
  private static pendingRequests = new Map<string, PendingRequest>();
  private static requestCache = new Map<string, { data: any; timestamp: number }>();
  
  // Configuration
  private static readonly DEDUP_WINDOW = 1000; // 1 second dedup window
  private static readonly CACHE_TTL = 30000; // 30 second cache
  private static readonly MAX_BATCH_SIZE = 5;
  private static readonly BATCH_DELAY = 200; // 200ms to collect batch
  
  // Batch processing
  private static batchQueue: Array<{
    id: string;
    request: RequestSignature;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private static batchTimer: NodeJS.Timeout | null = null;
  
  // Metrics
  private static metrics = {
    totalRequests: 0,
    dedupedRequests: 0,
    cachedRequests: 0,
    batchedRequests: 0,
    apiCalls: 0
  };
  
  /**
   * Generate a reply with deduplication
   */
  static async generateReply(params: {
    context: string;
    tone: string;
    template?: string;
    customPrompt?: string;
    model?: string;
    temperature?: number;
  }): Promise<string> {
    this.metrics.totalRequests++;
    
    // Create request signature
    const signature = this.createSignature('generateReply', params);
    
    // Check cache first
    const cached = this.getFromCache(signature);
    if (cached) {
      this.metrics.cachedRequests++;
      logger.debug('Reply served from cache');
      return cached;
    }
    
    // Check for duplicate pending request
    const pending = this.getPendingRequest(signature);
    if (pending) {
      this.metrics.dedupedRequests++;
      logger.debug('Deduplicating request, waiting for existing call');
      return pending;
    }
    
    // Create new request
    const requestPromise = this.executeRequest(async () => {
      this.metrics.apiCalls++;
      
      // Create request object for OpenRouterService
      const request = {
        tone: params.tone,
        template: params.template,
        customPrompt: params.customPrompt,
        model: params.model,
        temperature: params.temperature
      };
      
      // Create context object
      const context = {
        tweetText: params.context,
        userHandle: '',
        threadContext: []
      };
      
      const response = await OpenRouterService.generateReply(request as any, context as any);
      return response.reply || '';
    });
    
    // Store as pending
    this.setPendingRequest(signature, requestPromise);
    
    try {
      const result = await requestPromise;
      
      // Cache successful result
      this.setCache(signature, result);
      
      return result;
    } finally {
      // Clean up pending request
      this.removePendingRequest(signature);
    }
  }
  
  
  
  /**
   * Create request signature for deduplication
   */
  private static createSignature(method: string, params: any): string {
    // Create a stable signature excluding volatile params
    const stableParams = { ...params };
    delete stableParams.timestamp;
    delete stableParams.requestId;
    
    return `${method}:${JSON.stringify(stableParams)}`;
  }
  
  /**
   * Get from cache if valid
   */
  private static getFromCache(signature: string): any | null {
    const cached = this.requestCache.get(signature);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    
    // Remove expired cache
    if (cached) {
      this.requestCache.delete(signature);
    }
    
    return null;
  }
  
  /**
   * Set cache entry
   */
  private static setCache(signature: string, data: any, ttl?: number): void {
    this.requestCache.set(signature, {
      data,
      timestamp: Date.now()
    });
    
    // Auto-cleanup after TTL
    setTimeout(() => {
      this.requestCache.delete(signature);
    }, ttl || this.CACHE_TTL);
  }
  
  /**
   * Get pending request if within dedup window
   */
  private static getPendingRequest(signature: string): Promise<any> | null {
    const pending = this.pendingRequests.get(signature);
    
    if (pending && Date.now() - pending.timestamp < this.DEDUP_WINDOW) {
      pending.requestCount++;
      logger.debug(`Request deduped (${pending.requestCount} waiting)`);
      return pending.promise;
    }
    
    return null;
  }
  
  /**
   * Set pending request
   */
  private static setPendingRequest(signature: string, promise: Promise<any>): void {
    this.pendingRequests.set(signature, {
      promise,
      timestamp: Date.now(),
      requestCount: 1
    });
  }
  
  /**
   * Remove pending request
   */
  private static removePendingRequest(signature: string): void {
    this.pendingRequests.delete(signature);
  }
  
  /**
   * Execute request with error handling
   */
  private static async executeRequest<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      logger.error('API request failed:', error);
      throw error;
    }
  }
  
  /**
   * Batch multiple requests (for future use)
   */
  static async batchRequest(request: RequestSignature): Promise<any> {
    return new Promise((resolve, reject) => {
      // Add to batch queue
      this.batchQueue.push({
        id: this.createSignature(request.method, request.params),
        request,
        resolve,
        reject
      });
      
      // Start batch timer if not running
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.BATCH_DELAY);
      }
      
      // Process immediately if batch is full
      if (this.batchQueue.length >= this.MAX_BATCH_SIZE) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
        this.processBatch();
      }
    });
  }
  
  /**
   * Process batched requests
   */
  private static async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;
    
    const batch = this.batchQueue.splice(0, this.MAX_BATCH_SIZE);
    this.batchTimer = null;
    
    logger.debug(`Processing batch of ${batch.length} requests`);
    this.metrics.batchedRequests += batch.length;
    
    // Process each request in the batch
    // In the future, this could be optimized to send multiple requests in one API call
    for (const item of batch) {
      try {
        let result;
        
        switch (item.request.method) {
          case 'generateReply':
            result = await this.generateReply(item.request.params);
            break;
          default:
            throw new Error(`Unknown method: ${item.request.method}`);
        }
        
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }
  }
  
  /**
   * Get service metrics
   */
  static getMetrics(): typeof UnifiedApiService.metrics {
    const dedupRate = this.metrics.totalRequests > 0
      ? ((this.metrics.dedupedRequests / this.metrics.totalRequests) * 100).toFixed(2)
      : '0';
    
    const cacheHitRate = this.metrics.totalRequests > 0
      ? ((this.metrics.cachedRequests / this.metrics.totalRequests) * 100).toFixed(2)
      : '0';
    
    const apiReduction = this.metrics.totalRequests > 0
      ? (((this.metrics.totalRequests - this.metrics.apiCalls) / this.metrics.totalRequests) * 100).toFixed(2)
      : '0';
    
    return {
      ...this.metrics,
      dedupRate: `${dedupRate}%`,
      cacheHitRate: `${cacheHitRate}%`,
      apiReduction: `${apiReduction}%`
    } as any;
  }
  
  /**
   * Clear all caches
   */
  static clearCache(): void {
    this.requestCache.clear();
    this.pendingRequests.clear();
    logger.log('API cache cleared');
  }
  
  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      dedupedRequests: 0,
      cachedRequests: 0,
      batchedRequests: 0,
      apiCalls: 0
    };
  }
}
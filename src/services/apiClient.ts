/**
 * Centralized API Client with Request Queuing and Circuit Breaker
 * Handles all external API calls with resilience patterns
 */

import { API_CONFIG } from '@/config/apiConfig';

interface QueuedRequest {
  id: string;
  url: string;
  options: RequestInit;
  resolve: (value: Response) => void;
  reject: (error: Error) => void;
  retryCount: number;
  timestamp: number;
}

interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

interface ApiClientOptions {
  maxConcurrentRequests?: number;
  maxRetries?: number;
  retryDelay?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  requestTimeout?: number;
}

/**
 * Circuit Breaker Pattern Implementation
 */
class CircuitBreaker {
  private state: CircuitBreakerState;
  private readonly threshold: number;
  private readonly timeout: number;

  constructor(threshold = 5, timeout = 30000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0
    };
  }

  canExecute(): boolean {
    if (!this.state.isOpen) {
      return true;
    }

    // Check if we should attempt to close the circuit (half-open state)
    const timeSinceFailure = Date.now() - this.state.lastFailureTime;
    if (timeSinceFailure >= this.timeout) {
      console.log('%c🔄 Circuit breaker attempting half-open state', 'color: #FFA500');
      return true;
    }

    return false;
  }

  onSuccess(): void {
    if (this.state.isOpen) {
      console.log('%c✅ Circuit breaker closing - API recovered', 'color: #17BF63');
    }
    
    this.state.isOpen = false;
    this.state.failureCount = 0;
    this.state.successCount++;
  }

  onFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failureCount >= this.threshold && !this.state.isOpen) {
      this.state.isOpen = true;
      console.error('%c🚨 Circuit breaker opened - API calls suspended', 'color: #DC3545');
      console.error(`%c  Failure count: ${this.state.failureCount}/${this.threshold}`, 'color: #657786');
    }
  }

  getStatus(): CircuitBreakerState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0
    };
    console.log('%c🔄 Circuit breaker reset', 'color: #1DA1F2');
  }
}

/**
 * Request Queue with Concurrency Control
 */
class RequestQueue {
  private queue: QueuedRequest[] = [];
  private activeRequests = new Set<string>();
  private readonly maxConcurrent: number;

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  async enqueue(request: QueuedRequest): Promise<Response> {
    return new Promise((resolve, reject) => {
      request.resolve = resolve;
      request.reject = reject;
      this.queue.push(request);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.activeRequests.size >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    this.activeRequests.add(request.id);

    try {
      const response = await this.executeRequest(request);
      request.resolve(response);
    } catch (error) {
      request.reject(error as Error);
    } finally {
      this.activeRequests.delete(request.id);
      // Process next request in queue
      this.processQueue();
    }
  }

  private async executeRequest(request: QueuedRequest): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(request.url, {
        ...request.options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  getQueueStatus(): { queueLength: number; activeRequests: number } {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests.size
    };
  }

  clear(): void {
    // Reject all queued requests
    this.queue.forEach(req => {
      req.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}

/**
 * Centralized API Client with Resilience Patterns
 */
class ApiClient {
  private requestQueue: RequestQueue;
  private circuitBreaker: CircuitBreaker;
  private readonly options: Required<ApiClientOptions>;
  private requestCounter = 0;

  constructor(options: ApiClientOptions = {}) {
    this.options = {
      maxConcurrentRequests: 3,
      maxRetries: 2,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000,
      requestTimeout: 30000,
      ...options
    };

    this.requestQueue = new RequestQueue(this.options.maxConcurrentRequests);
    this.circuitBreaker = new CircuitBreaker(
      this.options.circuitBreakerThreshold,
      this.options.circuitBreakerTimeout
    );

    console.log('%c🛡️ API Client initialized with resilience patterns', 'color: #1DA1F2; font-weight: bold');
    console.log('%c  Max concurrent requests:', 'color: #657786', this.options.maxConcurrentRequests);
    console.log('%c  Circuit breaker threshold:', 'color: #657786', this.options.circuitBreakerThreshold);
  }

  /**
   * Make a resilient API request with queuing, retries, and circuit breaker
   */
  async request(url: string, options: RequestInit = {}): Promise<Response> {
    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      const status = this.circuitBreaker.getStatus();
      const waitTime = Math.ceil((this.options.circuitBreakerTimeout - (Date.now() - status.lastFailureTime)) / 1000);
      throw new Error(`Circuit breaker is open. API calls suspended for ${waitTime}s after ${status.failureCount} failures.`);
    }

    const requestId = `req_${++this.requestCounter}_${Date.now()}`;
    const queuedRequest: QueuedRequest = {
      id: requestId,
      url,
      options,
      resolve: () => {}, // Will be set by queue
      reject: () => {}, // Will be set by queue
      retryCount: 0,
      timestamp: Date.now()
    };

    console.log(`%c📤 Queuing API request: ${requestId}`, 'color: #657786');
    const queueStatus = this.requestQueue.getQueueStatus();
    if (queueStatus.queueLength > 0 || queueStatus.activeRequests > 0) {
      console.log(`%c  Queue status: ${queueStatus.queueLength} queued, ${queueStatus.activeRequests} active`, 'color: #657786');
    }

    return this.requestWithRetry(queuedRequest);
  }

  private async requestWithRetry(queuedRequest: QueuedRequest): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.options.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`%c🔄 Retrying request ${queuedRequest.id} (attempt ${attempt}/${this.options.maxRetries}) in ${delay}ms`, 'color: #FFA500');
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      try {
        const response = await this.requestQueue.enqueue(queuedRequest);
        
        if (response.ok) {
          this.circuitBreaker.onSuccess();
          console.log(`%c✅ Request ${queuedRequest.id} completed successfully`, 'color: #17BF63');
          return response;
        } else if (response.status === 429) {
          // Rate limit - don't count as circuit breaker failure, but do retry
          lastError = new Error(`Rate limited: ${response.status} - ${response.statusText}`);
          console.warn(`%c⏰ Rate limited on request ${queuedRequest.id}`, 'color: #FFA500');
          continue;
        } else if (response.status >= 400 && response.status < 500) {
          // Client error - don't retry
          const error = new Error(`Client error: ${response.status} - ${response.statusText}`);
          this.circuitBreaker.onFailure();
          throw error;
        } else {
          // Server error - retry
          lastError = new Error(`Server error: ${response.status} - ${response.statusText}`);
          this.circuitBreaker.onFailure();
        }
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.error(`%c⏰ Request ${queuedRequest.id} timed out`, 'color: #DC3545');
        } else {
          console.error(`%c❌ Request ${queuedRequest.id} failed:`, 'color: #DC3545', error);
        }
        
        this.circuitBreaker.onFailure();
      }
    }

    // All retries exhausted
    console.error(`%c💥 Request ${queuedRequest.id} failed after ${this.options.maxRetries + 1} attempts`, 'color: #DC3545');
    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * OpenRouter-specific request with authentication
   */
  async openRouterRequest(
    endpoint: string, 
    body: any, 
    model: string = 'anthropic/claude-3-haiku'
  ): Promise<Response> {
    // Get API key from Chrome storage
    const apiKeyData = await chrome.storage.local.get(['apiKey']);
    const apiKey = apiKeyData.apiKey || '';
    
    if (!apiKey || apiKey === 'sk-or-v1-YOUR_API_KEY_HERE') {
      throw new Error('OpenRouter API key not configured');
    }

    const url = `https://openrouter.ai/api/v1/${endpoint}`;
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'chrome-extension://tweetcraft',
        'X-Title': 'TweetCraft'
      },
      body: JSON.stringify(body)
    };

    return this.request(url, options);
  }

  /**
   * OpenRouter GET request (for models, validation, etc.)
   */
  async openRouterGet(endpoint: string, apiKey?: string): Promise<Response> {
    // Use provided API key or get from Chrome storage
    let key = apiKey;
    if (!key) {
      const apiKeyData = await chrome.storage.local.get(['apiKey']);
      key = apiKeyData.apiKey || '';
    }
    
    if (!key || key === 'sk-or-v1-YOUR_API_KEY_HERE') {
      throw new Error('OpenRouter API key not configured');
    }

    const url = `https://openrouter.ai/api/v1/${endpoint}`;
    const options: RequestInit = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'chrome-extension://tweetcraft',
        'X-Title': 'TweetCraft'
      }
    };

    return this.request(url, options);
  }

  /**
   * Get API client statistics
   */
  getStats(): {
    circuitBreaker: CircuitBreakerState;
    queue: { queueLength: number; activeRequests: number };
    totalRequests: number;
  } {
    return {
      circuitBreaker: this.circuitBreaker.getStatus(),
      queue: this.requestQueue.getQueueStatus(),
      totalRequests: this.requestCounter
    };
  }

  /**
   * Reset all state (useful for testing or recovery)
   */
  reset(): void {
    this.circuitBreaker.reset();
    this.requestQueue.clear();
    this.requestCounter = 0;
    console.log('%c🔄 API Client reset', 'color: #1DA1F2');
  }

  /**
   * Manually close circuit breaker (for testing/debugging)
   */
  closeCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}

// Export singleton instance
export const apiClient = new ApiClient({
  maxConcurrentRequests: 3,
  maxRetries: 2,
  retryDelay: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 30000,
  requestTimeout: 30000
});

// Export class for testing or custom instances
export { ApiClient };
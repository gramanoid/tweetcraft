/**
 * OpenRouter Smart Tab Service - PHASE 1.1
 * Robust API integration with error handling, retries, and circuit breakers
 */

import { logger } from '@/utils/logger';
import type { LLMAnalysisResult } from '@/types/llm';

interface RetryConfig {
  maxRetries: number;
  delays: number[]; // ms delays for each retry
  backoffMultiplier: number;
}

interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures to open circuit
  recoveryTimeout: number; // ms to wait before half-open state
  halfOpenRequests: number; // Number of test requests in half-open state
}

enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export class OpenRouterSmartService {
  private static readonly BASE_URL = 'https://openrouter.ai/api/v1';
  
  // Retry configuration
  private static readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    delays: [1000, 2000, 4000], // Exponential backoff
    backoffMultiplier: 2
  };
  
  // Circuit breaker configuration
  private static readonly circuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds
    halfOpenRequests: 2
  };
  
  // Circuit breaker state
  private static circuitState: CircuitState = CircuitState.CLOSED;
  private static failureCount = 0;
  private static lastFailureTime = 0;
  private static halfOpenTestCount = 0;
  private static circuitOpenedAt = 0;
  
  // Rate limiting
  private static requestQueue: Array<() => Promise<any>> = [];
  private static isProcessingQueue = false;
  private static lastRequestTime = 0;
  private static readonly MIN_REQUEST_INTERVAL = 500; // 500ms between requests
  
  // Performance metrics
  private static metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    retriedRequests: 0,
    circuitBreakerTrips: 0,
    averageResponseTime: 0,
    responseTimes: [] as number[]
  };

  /**
   * Main API call with comprehensive error handling
   */
  static async analyzeTweetWithLLM(
    tweetText: string,
    context: any,
    apiKey: string,
    options: {
      bypassCircuitBreaker?: boolean;
      priority?: 'high' | 'normal' | 'low';
      timeout?: number;
    } = {}
  ): Promise<LLMAnalysisResult | null> {
    const startTime = Date.now();
    this.metrics.totalRequests++;
    
    // Check circuit breaker state
    if (!options.bypassCircuitBreaker && !this.canMakeRequest()) {
      logger.warn('Circuit breaker is OPEN - returning cached/fallback response');
      this.metrics.failedRequests++;
      return this.getFallbackAnalysis(tweetText, context);
    }
    
    // Add to request queue for rate limiting
    return new Promise((resolve) => {
      const executeRequest = async () => {
        try {
          const result = await this.executeWithRetry(
            () => this.makeAPICall(tweetText, context, apiKey, options.timeout),
            this.retryConfig
          );
          
          // Success - update circuit breaker
          this.onRequestSuccess();
          
          // Update metrics
          const responseTime = Date.now() - startTime;
          this.updateMetrics(true, responseTime);
          
          resolve(result);
        } catch (error) {
          // Failure - update circuit breaker
          this.onRequestFailure();
          
          // Update metrics
          this.updateMetrics(false, Date.now() - startTime);
          
          logger.error('Smart tab API call failed after retries', error);
          resolve(this.getFallbackAnalysis(tweetText, context));
        }
      };
      
      // Queue the request for rate limiting
      this.queueRequest(executeRequest, options.priority || 'normal');
    });
  }
  
  /**
   * Execute API call with retry logic
   */
  private static async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        logger.log(`API attempt ${attempt + 1}/${config.maxRetries + 1}`);
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        // Check if we have more retries
        if (attempt < config.maxRetries) {
          const delay = config.delays[attempt] || 
                        config.delays[config.delays.length - 1] * Math.pow(config.backoffMultiplier, attempt - config.delays.length + 1);
          
          logger.warn(`Retrying after ${delay}ms (attempt ${attempt + 1})`);
          this.metrics.retriedRequests++;
          
          // Add jitter to prevent thundering herd
          const jitter = Math.random() * 0.2 * delay; // ±20% jitter
          await this.delay(delay + jitter);
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Make the actual API call
   */
  private static async makeAPICall(
    tweetText: string,
    context: any,
    apiKey: string,
    timeout: number = 10000
  ): Promise<LLMAnalysisResult | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const prompt = this.buildAnalysisPrompt(tweetText, context);
      
      const response = await fetch(`${this.BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'chrome-extension://tweetcraft',
          'X-Title': 'TweetCraft Smart Suggestions'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku', // Fast, cheap model for analysis
          messages: [
            {
              role: 'system',
              content: 'You are an expert social media strategist. Analyze tweets and provide JSON-formatted suggestions.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3, // Low temperature for consistency
          max_tokens: 600,
          stream: false
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Check response status
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('Empty response from API');
      }
      
      // Parse JSON response
      return this.parseAnalysisResponse(content);
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      
      throw error;
    }
  }
  
  /**
   * Circuit breaker: Check if requests can be made
   */
  private static canMakeRequest(): boolean {
    const now = Date.now();
    
    switch (this.circuitState) {
      case CircuitState.CLOSED:
        return true;
        
      case CircuitState.OPEN:
        // Check if recovery timeout has passed
        if (now - this.circuitOpenedAt > this.circuitConfig.recoveryTimeout) {
          logger.log('Circuit breaker transitioning to HALF_OPEN');
          this.circuitState = CircuitState.HALF_OPEN;
          this.halfOpenTestCount = 0;
          return true;
        }
        return false;
        
      case CircuitState.HALF_OPEN:
        // Allow limited requests to test recovery
        return this.halfOpenTestCount < this.circuitConfig.halfOpenRequests;
        
      default:
        return true;
    }
  }
  
  /**
   * Circuit breaker: Handle successful request
   */
  private static onRequestSuccess(): void {
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.halfOpenTestCount++;
      
      // If all test requests succeeded, close the circuit
      if (this.halfOpenTestCount >= this.circuitConfig.halfOpenRequests) {
        logger.log('Circuit breaker CLOSED - service recovered');
        this.circuitState = CircuitState.CLOSED;
        this.failureCount = 0;
      }
    } else {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }
  
  /**
   * Circuit breaker: Handle failed request
   */
  private static onRequestFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.circuitState === CircuitState.HALF_OPEN) {
      // Immediately reopen circuit on failure in half-open state
      logger.warn('Circuit breaker reopened - test request failed');
      this.circuitState = CircuitState.OPEN;
      this.circuitOpenedAt = Date.now();
      this.metrics.circuitBreakerTrips++;
    } else if (this.failureCount >= this.circuitConfig.failureThreshold) {
      // Open circuit after threshold failures
      logger.warn(`Circuit breaker OPEN after ${this.failureCount} failures`);
      this.circuitState = CircuitState.OPEN;
      this.circuitOpenedAt = Date.now();
      this.metrics.circuitBreakerTrips++;
    }
  }
  
  /**
   * Rate limiting: Queue requests
   */
  private static queueRequest(
    fn: () => Promise<any>,
    priority: 'high' | 'normal' | 'low'
  ): void {
    // Add to queue based on priority
    if (priority === 'high') {
      this.requestQueue.unshift(fn);
    } else {
      this.requestQueue.push(fn);
    }
    
    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      this.processRequestQueue();
    }
  }
  
  /**
   * Rate limiting: Process queued requests
   */
  private static async processRequestQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      // Rate limiting
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await this.delay(this.MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      }
      
      const request = this.requestQueue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        try {
          await request();
        } catch (error) {
          logger.error('Request queue processing error', error);
        }
      }
    }
    
    this.isProcessingQueue = false;
  }
  
  /**
   * Build analysis prompt
   */
  private static buildAnalysisPrompt(tweetText: string, context: any): string {
    const contextParts = [];
    
    if (context.threadContext?.length) {
      contextParts.push(`THREAD: ${context.threadContext.length} previous tweets`);
    }
    
    if (context.authorHandle) {
      contextParts.push(`AUTHOR: @${context.authorHandle}`);
    }
    
    const contextString = contextParts.join('\n');
    
    return `Analyze this tweet and suggest reply approaches:

TWEET: "${tweetText}"
${contextString}

Return JSON with:
{
  "sentiment": "positive|negative|neutral|controversial",
  "intent": "question|opinion|achievement|problem|debate|announcement",
  "confidence": 0.0-1.0,
  "suggestedCategories": ["engagement", "support", "debate"],
  "suggestedTones": ["professional", "casual", "witty"],
  "reasoning": ["brief reasoning points"]
}`;
  }
  
  /**
   * Parse API response
   */
  private static parseAnalysisResponse(content: string): LLMAnalysisResult | null {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.sentiment || !parsed.intent) {
        throw new Error('Missing required fields in response');
      }
      
      return parsed as LLMAnalysisResult;
    } catch (error) {
      logger.error('Failed to parse API response', error);
      return null;
    }
  }
  
  /**
   * Get fallback analysis when API fails
   */
  private static getFallbackAnalysis(tweetText: string, context: any): LLMAnalysisResult {
    // Pattern-based fallback analysis
    const patterns = {
      question: /\?|how|what|when|where|why|who|which|could|should|would/i,
      achievement: /launched|shipped|built|created|finished|completed|proud|excited/i,
      problem: /issue|problem|error|bug|broken|help|stuck|trouble/i,
      opinion: /think|believe|feel|seems|appears|opinion|perspective/i,
      debate: /wrong|terrible|awful|disagree|hate|stupid|worst/i // Changed to 'debate' which is valid
    };
    
    let intent: LLMAnalysisResult['intent'] = 'opinion'; // Default to opinion
    let sentiment: LLMAnalysisResult['sentiment'] = 'neutral';
    let suggestedCategories = ['engagement'];
    let suggestedTones = ['casual'];
    
    // Detect intent
    for (const [key, pattern] of Object.entries(patterns)) {
      if (pattern.test(tweetText)) {
        intent = key as LLMAnalysisResult['intent'];
        break;
      }
    }
    
    // Set suggestions based on intent
    switch (intent) {
      case 'question':
        suggestedCategories = ['help', 'insight', 'value'];
        suggestedTones = ['professional', 'academic', 'casual'];
        break;
      case 'achievement':
        suggestedCategories = ['celebration', 'support', 'engagement'];
        suggestedTones = ['enthusiastic', 'motivational', 'wholesome'];
        sentiment = 'positive';
        break;
      case 'problem':
        suggestedCategories = ['help', 'solution', 'support'];
        suggestedTones = ['professional', 'casual', 'motivational'];
        break;
      case 'debate':
        suggestedCategories = ['debate', 'challenge', 'perspective'];
        suggestedTones = ['contrarian', 'philosophical', 'professional'];
        sentiment = 'controversial';
        break;
    }
    
    return {
      sentiment,
      intent,
      confidence: 0.5, // Lower confidence for fallback
      suggestedCategories,
      suggestedTones,
      reasoning: ['Using pattern-based analysis (API unavailable)'],
      isFallback: true // Mark as fallback
    };
  }
  
  /**
   * Check if error is non-retryable
   */
  private static isNonRetryableError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    
    // Don't retry on authentication errors or invalid requests
    if (message.includes('401') || message.includes('403') || message.includes('400')) {
      return true;
    }
    
    // Don't retry on quota exceeded
    if (message.includes('quota') || message.includes('limit exceeded')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Update performance metrics
   */
  private static updateMetrics(success: boolean, responseTime: number): void {
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    // Update average response time (keep last 100 samples)
    this.metrics.responseTimes.push(responseTime);
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }
    
    this.metrics.averageResponseTime = 
      this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
  }
  
  /**
   * Get current metrics
   */
  static getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%'
        : '0%',
      circuitState: this.circuitState,
      failureCount: this.failureCount
    };
  }
  
  /**
   * Reset circuit breaker (for testing/recovery)
   */
  static resetCircuitBreaker(): void {
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    this.halfOpenTestCount = 0;
    logger.log('Circuit breaker reset');
  }
  
  /**
   * Utility: Delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const openRouterSmartService = new OpenRouterSmartService();
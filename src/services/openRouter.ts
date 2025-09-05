import { 
  OpenRouterRequest, 
  OpenRouterResponse, 
  ReplyGenerationRequest, 
  ReplyGenerationResponse,
  TwitterContext 
} from '@/types';
import { StorageService } from './storage';
import { CacheService } from './cache';
import { URLCleaner } from '@/utils/urlCleaner';
import { requestOptimizer } from './requestOptimizer';
import { cleanupReply } from '@/utils/textUtils';
import { logger } from '@/utils/logger';
import { API_CONFIG } from '@/config/apiConfig';
import { API_CONFIG as CONSTANTS, TIMING } from '@/config/constants';
import { PromptArchitecture, PromptConfiguration } from './promptArchitecture';

export class OpenRouterService {
  private static readonly BASE_URL = 'https://openrouter.ai/api/v1';
  private static readonly HEADERS = {
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://tweetcraft.ai/extension',
    'X-Title': 'TweetCraft - AI Reply Assistant v0.0.12'
  };
  
  // Enhanced rate limiting and optimization
  private static lastRequestTime = 0;
  private static readonly MIN_REQUEST_INTERVAL = TIMING.MIN_REQUEST_INTERVAL;
  
  // Retry configuration
  private static readonly MAX_RETRIES = CONSTANTS.RETRY_ATTEMPTS;
  private static readonly RETRY_DELAYS = CONSTANTS.RETRY_DELAYS;

  // Request deduplication - cache identical requests for 30 seconds
  private static requestCache = new Map<string, Promise<ReplyGenerationResponse>>();
  private static readonly REQUEST_CACHE_TTL = 30000; // 30 seconds
  private static readonly REQUEST_CACHE_MAX_SIZE = 100; // Maximum cache entries to prevent memory leak
  
  // Intelligent batching - batch similar requests within 200ms
  private static batchQueue: Array<{
    request: ReplyGenerationRequest;
    context: TwitterContext;
    resolve: (value: ReplyGenerationResponse) => void;
    reject: (reason: any) => void;
    timestamp: number;
    signal?: AbortSignal;
  }> = [];
  private static batchTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly BATCH_WINDOW = TIMING.BATCH_WINDOW;
  
  // Performance metrics
  private static metrics = {
    requestsDeduped: 0,
    requestsBatched: 0,
    cacheHits: 0,
    totalRequests: 0
  };

  // Network resilience - offline capability and connection monitoring
  private static isOnline = navigator.onLine;
  private static connectionType: string = 'unknown';
  private static queuedRequests: Array<{
    request: ReplyGenerationRequest;
    context: TwitterContext;
    signal?: AbortSignal;
    resolve: (value: ReplyGenerationResponse) => void;
    reject: (reason: any) => void;
    timestamp: number;
  }> = [];
  private static readonly OFFLINE_QUEUE_MAX_AGE = 300000; // 5 minutes
  private static readonly OFFLINE_QUEUE_MAX_SIZE = 50;

  // Connection quality detection
  private static connectionMetrics = {
    rtt: 0, // Round-trip time
    downlink: 0, // Connection speed
    effectiveType: '4g' as '4g' | '3g' | '2g' | 'slow-2g'
  };
  
  // Cleanup interval ID for managed resource cleanup
  private static cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  // Initialize network monitoring (call once at startup)
  static {
    this.initializeNetworkMonitoring();
  }

  static async generateReply(
    request: ReplyGenerationRequest, 
    context: TwitterContext,
    signal?: AbortSignal,
    bypassCache: boolean = false
  ): Promise<ReplyGenerationResponse> {
    console.log('%c🚀 AI REPLY GENERATION STARTED', 'color: #1DA1F2; font-weight: bold; font-size: 16px');
    console.log('%c  Connection Status:', 'color: #657786', this.isOnline ? '✅ Online' : '❌ Offline');
    console.log('%c  Connection Type:', 'color: #657786', this.connectionMetrics.effectiveType);
    
    // Log all request parameters
    console.log('%c📋 GENERATION PARAMETERS', 'color: #1DA1F2; font-weight: bold; font-size: 14px');
    console.log('%c  Tone:', 'color: #657786', request.tone || 'None');
    console.log('%c  Model:', 'color: #657786', request.model || 'Default');
    console.log('%c  Reply length:', 'color: #657786', request.replyLength || 'Default');
    console.log('%c  Personality:', 'color: #657786', request.personality || 'None');
    console.log('%c  Vocabulary:', 'color: #657786', request.vocabulary || 'None');
    console.log('%c  Rhetoric:', 'color: #657786', request.rhetoric || 'None');
    console.log('%c  Length pacing:', 'color: #657786', request.lengthPacing || 'None');
    console.log('%c  Custom prompt:', 'color: #657786', request.customPrompt ? '✅ YES' : '❌ NO');
    console.log('%c  Rewrite mode:', 'color: #657786', request.isRewriteMode ? '✅ YES' : '❌ NO');
    console.log('%c  Bypass cache:', 'color: #657786', bypassCache ? '✅ YES' : '❌ NO');
    
    // Log context information
    console.log('%c🌐 CONTEXT INFORMATION', 'color: #1DA1F2; font-weight: bold; font-size: 14px');
    console.log('%c  Tweet text length:', 'color: #657786', context.tweetText?.length || 0, 'characters');
    console.log('%c  Author handle:', 'color: #657786', context.authorHandle || 'Unknown');
    console.log('%c  Thread context:', 'color: #657786', context.threadContext?.length || 0, 'tweets');
    console.log('%c  Is reply:', 'color: #657786', context.isReply ? '✅ YES' : '❌ NO');
    console.log('%c  Tweet ID:', 'color: #657786', context.tweetId || 'None');
    
    this.metrics.totalRequests++;
    
    // Check if offline and queue request if needed
    if (!this.isOnline) {
      console.log('%c📴 Offline mode: Queuing request', 'color: #FFA500; font-weight: bold');
      return this.queueOfflineRequest(request, context, signal);
    }
    
    try {
      // Enhanced cache check first (skip if bypassCache is true)
      if (!bypassCache && context.tweetId && request.tone) {
        const cachedReply = CacheService.get(context.tweetId, request.tone);
        if (cachedReply) {
          this.metrics.cacheHits++;
          console.log('%c💾 Cache Hit:', 'color: #17BF63; font-weight: bold', 
                     `Hit rate: ${Math.round(this.metrics.cacheHits / this.metrics.totalRequests * 100)}%`);
          return {
            success: true,
            reply: cachedReply
          };
        }
      }
      
      if (bypassCache) {
        console.log('%c🔄 Cache Bypassed:', 'color: #FFA500', 'Generating fresh response');
      }

      // Request deduplication (skip if bypassCache is true)
      const requestKey = this.generateRequestKey(request, context);
      
      if (!bypassCache) {
        const existingRequest = this.requestCache.get(requestKey);
        if (existingRequest) {
          this.metrics.requestsDeduped++;
          console.log('%c🔄 Request Deduplicated:', 'color: #9146FF; font-weight: bold', 
                     `Saved ${this.metrics.requestsDeduped} duplicate requests`);
          return existingRequest;
        }
      }

      // Create promise for this request
      const requestPromise = this.executeBatchedRequest(request, context, signal);
      
      // Cache the promise to prevent duplicate requests (unless bypassing cache)
      if (!bypassCache) {
        // Check cache size limit to prevent memory leak
        if (this.requestCache.size >= this.REQUEST_CACHE_MAX_SIZE) {
          // Clean up old entries more aggressively
          this.cleanupOldCacheEntries();
        }
        
        this.requestCache.set(requestKey, requestPromise);
        
        // Clean up cache after TTL
        setTimeout(() => {
          this.requestCache.delete(requestKey);
        }, this.REQUEST_CACHE_TTL);
      }

      return requestPromise;
    } catch (error: any) {
      console.error('%c❌ API Request Optimization Error:', 'color: #DC3545; font-weight: bold', error);
      return {
        success: false,
        error: 'API optimization failed. Please try again.'
      };
    }
  }

  /**
   * Generate unique key for request deduplication
   */
  private static generateRequestKey(request: ReplyGenerationRequest, context: TwitterContext): string {
    const keyData = {
      originalTweet: request.originalTweet,
      tone: request.tone,
      tweetId: context.tweetId,
      tweetText: context.tweetText?.substring(0, 100) || '' // First 100 chars for context
    };
    return JSON.stringify(keyData);
  }

  /**
   * Clean up old cache entries to prevent memory leak
   */
  private static cleanupOldCacheEntries(): void {
    const entriesToRemove = Math.floor(this.REQUEST_CACHE_MAX_SIZE * 0.2); // Remove 20% of entries
    const iterator = this.requestCache.entries();
    
    for (let i = 0; i < entriesToRemove; i++) {
      const { value, done } = iterator.next();
      if (done || !value) break;
      this.requestCache.delete(value[0]);
    }
    
    console.log(`%c🧹 Cleaned up ${entriesToRemove} old cache entries`, 'color: #FFA500');
  }

  /**
   * Execute request with intelligent batching
   */
  private static async executeBatchedRequest(
    request: ReplyGenerationRequest, 
    context: TwitterContext,
    signal?: AbortSignal
  ): Promise<ReplyGenerationResponse> {
    return new Promise((resolve, reject) => {
      // Add to batch queue
      this.batchQueue.push({
        request,
        context,
        resolve,
        reject,
        timestamp: Date.now(),
        signal
      });

      console.log('%c📦 Request queued for batching:', 'color: #9146FF; font-weight: bold', 
                 `Queue size: ${this.batchQueue.length}`);

      // Start batch timer if not already running
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.BATCH_WINDOW);
      }
    });
  }

  /**
   * Process batched requests
   */
  private static async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) {
      this.batchTimer = null;
      return;
    }

    const currentBatch = [...this.batchQueue];
    this.batchQueue = [];
    this.batchTimer = null;

    console.log('%c🚀 Processing request batch:', 'color: #1DA1F2; font-weight: bold', 
               `Batch size: ${currentBatch.length}`);

    if (currentBatch.length > 1) {
      this.metrics.requestsBatched += currentBatch.length - 1;
      console.log('%c⚡ Batched requests:', 'color: #FFA500; font-weight: bold', 
                 `Saved ${this.metrics.requestsBatched} API calls through batching`);
    }

    // Process each request in the batch
    for (const batchItem of currentBatch) {
      try {
        // Check if request was cancelled
        if (batchItem.signal?.aborted) {
          batchItem.reject(new Error('Request was cancelled'));
          continue;
        }
        
        const result = await this.executeActualRequest(batchItem.request, batchItem.context, batchItem.signal);
        batchItem.resolve(result);
      } catch (error) {
        batchItem.reject(error);
      }
    }
  }

  /**
   * Execute the actual API request (original logic)
   */
  private static async executeActualRequest(
    request: ReplyGenerationRequest, 
    context: TwitterContext,
    signal?: AbortSignal
  ): Promise<ReplyGenerationResponse> {
    try {
      // Check if request was cancelled before starting
      if (signal?.aborted) {
        throw new Error('Request was cancelled');
      }
      
      // Rate limiting
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
        
        // Check cancellation after rate limit delay
        if (signal?.aborted) {
          throw new Error('Request was cancelled');
        }
      }
      this.lastRequestTime = Date.now();

      const config = await StorageService.getConfig();
      // Get API key from environment configuration
      const apiKey = API_CONFIG.OPENROUTER_API_KEY;

      if (!apiKey || apiKey === 'sk-or-v1-YOUR_API_KEY_HERE') {
        return {
          success: false,
          error: 'API key not configured. Please contact the developer.'
        };
      }

      const messages = await this.buildMessages(request, context, config);
      
      // Get temperature from PromptArchitecture (handles custom overrides)
      const promptConfig: PromptConfiguration = {
        systemPrompt: config.systemPrompt || '',
        temperature: config.temperature || 0.7,
        contextMode: config.contextMode || 'thread',
        tabType: request.tabType || 'all',
        customConfig: request.customConfig
      };
      const temperature = PromptArchitecture.getTemperature(promptConfig);
      
      // Adaptive timeout based on connection quality
      const adaptiveTimeout = this.getAdaptiveTimeout();
      
      // Task 4.3: Simple Model Fallback - Try multiple models if one fails
      const modelFallbackChain = [
        request.model || config.model || 'openai/gpt-4o-mini',  // Fast & cheap primary
        'anthropic/claude-3-haiku',    // Reliable backup
        'meta-llama/llama-3.1-8b-instruct'  // Free fallback
      ];
      
      // Log temperature setting and connection adaptation
      console.log('%c⚙️ TweetCraft Settings & Connection Adaptation', 'color: #1DA1F2; font-weight: bold; font-size: 14px');
      console.log(`%c  Temperature: ${temperature}`, 'color: #657786');
      console.log(`%c  Model Chain: ${modelFallbackChain.join(' → ')}`, 'color: #657786');
      console.log(`%c  Adaptive Timeout: ${adaptiveTimeout}ms (based on ${this.connectionMetrics.effectiveType})`, 'color: #657786');
      
      // Try each model in the fallback chain
      let lastError: any = null;
      
      for (let modelIndex = 0; modelIndex < modelFallbackChain.length; modelIndex++) {
        const currentModel = modelFallbackChain[modelIndex];
        
        if (modelIndex > 0) {
          console.log(`%c🔄 Trying fallback model ${modelIndex + 1}/${modelFallbackChain.length}: ${currentModel}`, 'color: #FFA500');
        }
        
        const openRouterRequest: OpenRouterRequest = {
          model: currentModel,
          messages,
          temperature,
          // max_tokens intentionally omitted for unlimited output
          top_p: 0.9
        };

        // Create combined AbortController for timeout and cancellation
        const timeoutController = new AbortController();
        const combinedController = new AbortController();
        
        // Set up timeout based on connection quality
        const timeoutId = setTimeout(() => {
          timeoutController.abort();
        }, adaptiveTimeout);
        
        // Combine signals - abort if either the original signal or timeout triggers
        const abortHandler = () => combinedController.abort();
        signal?.addEventListener('abort', abortHandler);
        timeoutController.signal.addEventListener('abort', abortHandler);

        try {
          const response = await this.fetchWithRetry(
            `${this.BASE_URL}/chat/completions`,
            {
              method: 'POST',
              headers: {
                ...this.HEADERS,
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify(openRouterRequest),
              signal: combinedController.signal
            }
          );
          
          clearTimeout(timeoutId);
          
          // Success! Log which model worked
          if (modelIndex > 0) {
            console.log(`%c✅ Fallback model ${currentModel} succeeded!`, 'color: #17BF63');
          }
          
          // Track which model was successful (for stats)
          const result = await this.processSuccessfulResponse(response, request, context);
          if (result.success) {
            // Add model tracking info to the result
            (result as any).modelUsed = currentModel;
            (result as any).modelFallbackIndex = modelIndex;
          }
          return result;
          
        } catch (error: any) {
          clearTimeout(timeoutId);
          lastError = error;
          
          // Handle timeout specifically
          if (error.name === 'AbortError' && timeoutController.signal.aborted && !signal?.aborted) {
            console.log(`%c⏱️ Model ${currentModel} timed out`, 'color: #FFA500');
            // Continue to next model in chain
            continue;
          }
          
          // Log model-specific failure
          console.log(`%c❌ Model ${currentModel} failed: ${error.message}`, 'color: #DC3545');
          
          // If this isn't the last model, continue to next
          if (modelIndex < modelFallbackChain.length - 1) {
            continue;
          }
          
          // This was the last model, handle final failure
          throw error;
        }
      }
      
      // All models failed, return error
      return {
        success: false,
        error: `All models failed. Last error: ${lastError?.message || 'Unknown error'}`
      };

    } catch (error: any) {
      console.error('OpenRouter service error:', error);
      
      // Check for network errors
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        return {
          success: false,
          error: 'Connection failed. Check your internet connection'
        };
      }
      
      if (error?.message?.includes('timeout')) {
        return {
          success: false,
          error: 'Request timed out. Try again'
        };
      }
      
      return {
        success: false,
        error: 'Something went wrong. Try again'
      };
    }
  }

  private static async buildMessages(
    request: ReplyGenerationRequest,
    context: TwitterContext,
    config: any
  ) {
    const messages = [];

    // Build prompt configuration for PromptArchitecture
    const promptConfig: PromptConfiguration = {
      systemPrompt: config.systemPrompt || '',
      temperature: config.temperature || 0.7,
      contextMode: config.contextMode || 'thread',
      replyLength: config.replyLengthDefault,
      tabType: request.tabType || 'all', // Default to 'all' if not specified
      context: {
        tweetText: context.tweetText,
        authorHandle: context.authorHandle,
        threadContext: context.threadContext,
        images: context.images
      }
    };

    // Handle tab-specific configurations
    if (request.tabType === 'personas' && request.personaConfig) {
      promptConfig.personaConfig = request.personaConfig;
    } else if (request.tabType === 'all' && request.allTabConfig) {
      promptConfig.allTabConfig = request.allTabConfig;
    } else if (request.tabType === 'custom' && request.customConfig) {
      promptConfig.customConfig = request.customConfig;
    } else if (request.tabType === 'smart' && request.allTabConfig) {
      // Smart tab uses ALL tab config
      promptConfig.allTabConfig = request.allTabConfig;
    } else if (request.tabType === 'favorites' && request.allTabConfig) {
      // Favorites tab uses ALL tab config
      promptConfig.allTabConfig = request.allTabConfig;
    }

    // Use PromptArchitecture to build system prompt
    const systemPrompt = PromptArchitecture.buildSystemPrompt(promptConfig);
    
    // Log prompt architecture details
    PromptArchitecture.logPromptArchitecture(promptConfig, systemPrompt, '', config.temperature || 0.7);
    
    // For backward compatibility: if tone is still passed in old format, add it to system prompt
    if (request.tone && !request.tabType) {
      // Legacy support for old tone-based requests
      console.log('%c⚠️ Legacy tone request detected, adding to prompt', 'color: #FFA500');
      const legacySystemPrompt = systemPrompt + ' ' + request.tone;
      messages.push({
        role: 'system' as const,
        content: legacySystemPrompt
      });
    } else {
      // Use new architecture-based system prompt
      messages.push({
        role: 'system' as const,
        content: systemPrompt
      });
    }

    // Build user prompt using PromptArchitecture
    let userPrompt = PromptArchitecture.buildUserPrompt(promptConfig);
    
    // Allow custom prompt override for special cases
    if (request.customPrompt) {
      userPrompt = request.customPrompt;
    }

    // Update logging in PromptArchitecture
    PromptArchitecture.logPromptArchitecture(promptConfig, systemPrompt, userPrompt, config.temperature || 0.7);

    messages.push({
      role: 'user' as const,
      content: userPrompt
    });

    return messages;
  }

  // Use shared cleanupReply function from textUtils
  private static cleanupReply(reply: string): string {
    return cleanupReply(reply);
  }

  static async validateApiKey(apiKey?: string): Promise<boolean> {
    try {
      // Get API key from environment configuration
      const actualApiKey = API_CONFIG.OPENROUTER_API_KEY;
      
      if (!actualApiKey || actualApiKey === 'sk-or-v1-YOUR_API_KEY_HERE') {
        return false;
      }
      
      const response = await fetch(`${this.BASE_URL}/models`, {
        headers: {
          ...this.HEADERS,
          'Authorization': `Bearer ${actualApiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('API key validation error:', error);
      return false;
    }
  }

  static async fetchAvailableModels(apiKey?: string): Promise<any[]> {
    try {
      // Get API key from environment configuration
      const actualApiKey = API_CONFIG.OPENROUTER_API_KEY;
      
      if (!actualApiKey || actualApiKey === 'sk-or-v1-YOUR_API_KEY_HERE') {
        console.error('API key not configured');
        return [];
      }
      
      const response = await this.fetchWithRetry(
        `${this.BASE_URL}/models`,
        {
          headers: {
            ...this.HEADERS,
            'Authorization': `Bearer ${actualApiKey}`
          }
        }
      );
      
      if (!response.ok) {
        console.error('Failed to fetch models:', response.status);
        return [];
      }
      
      const data = await response.json();
      
      // Filter and sort models for best user experience
      const models = data.data || [];
      
      // Prioritize commonly used models for replies
      const priorityModels = [
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'anthropic/claude-3.5-sonnet',
        'anthropic/claude-3-haiku',
        'google/gemini-pro-1.5',
        'meta-llama/llama-3.1-70b-instruct',
        'meta-llama/llama-3.1-8b-instruct'
      ];
      
      // Sort models: priority models first, then alphabetically
      const sortedModels = models.sort((a: any, b: any) => {
        const aIndex = priorityModels.indexOf(a.id);
        const bIndex = priorityModels.indexOf(b.id);
        
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        return a.id.localeCompare(b.id);
      });
      
      // Return with relevant info
      return sortedModels.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        contextWindow: model.context_length || 'Unknown',
        pricing: {
          input: model.pricing?.prompt || 0,
          output: model.pricing?.completion || 0
        }
      }));
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }

  private static async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt: number = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);
      
      // Don't retry on success or client errors (4xx)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // Check if we should retry for server errors (5xx)
      if (response.status >= 500 && attempt < this.MAX_RETRIES - 1) {
        const delay = this.RETRY_DELAYS[attempt];
        console.log(`Smart Reply: Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${this.MAX_RETRIES})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      
      return response;
    } catch (error: any) {
      // Network errors - retry if we have attempts left
      if (attempt < this.MAX_RETRIES - 1) {
        const delay = this.RETRY_DELAYS[attempt];
        console.log(`Smart Reply: Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${this.MAX_RETRIES})`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      
      // Max retries reached, throw the error
      throw error;
    }
  }

  /**
   * Get API optimization performance metrics
   */
  static getPerformanceMetrics() {
    const metrics = { ...this.metrics };
    const efficiency = metrics.totalRequests > 0 ? {
      cacheHitRate: Math.round((metrics.cacheHits / metrics.totalRequests) * 100),
      deduplicationRate: Math.round((metrics.requestsDeduped / metrics.totalRequests) * 100),
      batchEfficiency: Math.round((metrics.requestsBatched / metrics.totalRequests) * 100),
      totalEfficiency: Math.round(((metrics.cacheHits + metrics.requestsDeduped + metrics.requestsBatched) / metrics.totalRequests) * 100)
    } : {
      cacheHitRate: 0,
      deduplicationRate: 0,
      batchEfficiency: 0,
      totalEfficiency: 0
    };

    console.log('%c📊 API OPTIMIZATION METRICS', 'color: #17BF63; font-weight: bold; font-size: 14px');
    console.log('%c  Cache Hit Rate:', 'color: #657786', `${efficiency.cacheHitRate}% (${metrics.cacheHits}/${metrics.totalRequests})`);
    console.log('%c  Deduplication Rate:', 'color: #657786', `${efficiency.deduplicationRate}% (${metrics.requestsDeduped} saved)`);
    console.log('%c  Batch Efficiency:', 'color: #657786', `${efficiency.batchEfficiency}% (${metrics.requestsBatched} batched)`);
    console.log('%c  Total Efficiency:', 'color: #657786', `${efficiency.totalEfficiency}% overall optimization`);

    return { ...metrics, efficiency };
  }

  /**
   * Reset performance metrics (for testing or cleanup)
   */
  static resetMetrics(): void {
    this.metrics = {
      requestsDeduped: 0,
      requestsBatched: 0,
      cacheHits: 0,
      totalRequests: 0
    };
    this.requestCache.clear();
    this.batchQueue = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    console.log('%c🔄 API optimization metrics reset', 'color: #1DA1F2; font-weight: bold');
  }

  /**
   * Initialize network monitoring
   */
  private static initializeNetworkMonitoring(): void {
    console.log('%c🌐 NETWORK RESILIENCE: Initializing monitoring', 'color: #9146FF; font-weight: bold; font-size: 14px');
    
    // Monitor online/offline status
    window.addEventListener('online', () => {
      console.log('%c🟢 Connection restored - processing queued requests', 'color: #17BF63; font-weight: bold');
      this.isOnline = true;
      this.processQueuedRequests();
    });

    window.addEventListener('offline', () => {
      console.log('%c🔴 Connection lost - entering offline mode', 'color: #DC3545; font-weight: bold');
      this.isOnline = false;
    });

    // Monitor connection changes using Network Information API (if available)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.updateConnectionMetrics(connection);
        
        connection.addEventListener('change', () => {
          this.updateConnectionMetrics(connection);
          console.log('%c📊 Connection quality updated:', 'color: #1DA1F2; font-weight: bold', {
            effectiveType: this.connectionMetrics.effectiveType,
            downlink: this.connectionMetrics.downlink,
            rtt: this.connectionMetrics.rtt
          });
        });
      }
    }
    
    // Clean up old queued requests periodically with managed interval
    this.cleanupIntervalId = setInterval(() => this.cleanupQueuedRequests(), 60000); // Every minute
    
    console.log('%c  ✅ Network monitoring initialized', 'color: #17BF63; font-weight: bold');
    console.log('%c  Initial status:', 'color: #657786', {
      online: this.isOnline,
      effectiveType: this.connectionMetrics.effectiveType
    });
  }

  /**
   * Update connection quality metrics
   */
  private static updateConnectionMetrics(connection: any): void {
    this.connectionMetrics = {
      rtt: connection.rtt || 0,
      downlink: connection.downlink || 0,
      effectiveType: connection.effectiveType || '4g'
    };
  }

  /**
   * Get adaptive timeout based on connection quality
   */
  private static getAdaptiveTimeout(): number {
    const baseTimeout = 30000; // 30 seconds base
    
    switch (this.connectionMetrics.effectiveType) {
      case 'slow-2g':
        return baseTimeout * 3; // 90 seconds
      case '2g':
        return baseTimeout * 2; // 60 seconds
      case '3g':
        return baseTimeout * 1.5; // 45 seconds
      case '4g':
      default:
        return baseTimeout; // 30 seconds
    }
  }

  /**
   * Queue request for when connection is restored
   */
  private static queueOfflineRequest(
    request: ReplyGenerationRequest, 
    context: TwitterContext, 
    signal?: AbortSignal
  ): Promise<ReplyGenerationResponse> {
    return new Promise((resolve, reject) => {
      // Clean up old requests first
      this.cleanupQueuedRequests();
      
      // Check queue size limit
      if (this.queuedRequests.length >= this.OFFLINE_QUEUE_MAX_SIZE) {
        console.log('%c⚠️ Offline queue full - rejecting request', 'color: #FFA500; font-weight: bold');
        reject(new Error('Too many requests queued. Please wait for connection to restore.'));
        return;
      }
      
      // Add to queue
      this.queuedRequests.push({
        request,
        context,
        signal,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      console.log('%c📴 Request queued for offline processing', 'color: #FFA500; font-weight: bold', 
                 `Queue size: ${this.queuedRequests.length}`);
      
      // If user cancels, remove from queue
      signal?.addEventListener('abort', () => {
        const index = this.queuedRequests.findIndex(item => 
          item.request === request && item.context === context
        );
        if (index >= 0) {
          this.queuedRequests.splice(index, 1);
          reject(new Error('Request was cancelled'));
        }
      });
    });
  }

  /**
   * Process queued requests when connection is restored
   */
  private static async processQueuedRequests(): Promise<void> {
    if (this.queuedRequests.length === 0) return;
    
    console.log('%c🔄 Processing queued requests:', 'color: #1DA1F2; font-weight: bold', 
               `${this.queuedRequests.length} requests`);
    
    // Process all queued requests
    const requestsToProcess = [...this.queuedRequests];
    this.queuedRequests = [];
    
    for (const queuedItem of requestsToProcess) {
      try {
        // Check if request is still valid (not cancelled and not too old)
        if (queuedItem.signal?.aborted) {
          queuedItem.reject(new Error('Request was cancelled'));
          continue;
        }
        
        const age = Date.now() - queuedItem.timestamp;
        if (age > this.OFFLINE_QUEUE_MAX_AGE) {
          queuedItem.reject(new Error('Request expired while offline'));
          continue;
        }
        
        // Process the request
        const result = await this.executeActualRequest(
          queuedItem.request, 
          queuedItem.context, 
          queuedItem.signal
        );
        queuedItem.resolve(result);
        
      } catch (error) {
        queuedItem.reject(error);
      }
    }
    
    console.log('%c✅ All queued requests processed', 'color: #17BF63; font-weight: bold');
  }

  /**
   * Clean up expired requests from queue
   */
  private static cleanupQueuedRequests(): void {
    const now = Date.now();
    const initialSize = this.queuedRequests.length;
    
    this.queuedRequests = this.queuedRequests.filter(item => {
      const age = now - item.timestamp;
      const isExpired = age > this.OFFLINE_QUEUE_MAX_AGE;
      const isCancelled = item.signal?.aborted;
      
      if (isExpired || isCancelled) {
        if (isExpired) {
          item.reject(new Error('Request expired while offline'));
        } else {
          item.reject(new Error('Request was cancelled'));
        }
        return false;
      }
      
      return true;
    });
    
    const removed = initialSize - this.queuedRequests.length;
    if (removed > 0) {
      console.log('%c🧹 Cleaned up offline queue:', 'color: #657786', 
                 `Removed ${removed} expired/cancelled requests`);
    }
  }

  /**
   * Process successful API response (extracted for reuse)
   */
  private static async processSuccessfulResponse(
    response: Response, 
    request: ReplyGenerationRequest, 
    context: TwitterContext
  ): Promise<ReplyGenerationResponse> {
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      
      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid API key. Get your key at openrouter.ai/keys'
        };
      }
      
      if (response.status === 429) {
        // Try to parse rate limit info from response
        let retryAfter = '';
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.metadata?.ratelimit_reset) {
            const resetTime = new Date(errorData.error.metadata.ratelimit_reset * 1000);
            const waitSeconds = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
            retryAfter = ` Try again in ${waitSeconds} seconds`;
          }
        } catch {}
        
        return {
          success: false,
          error: `Rate limited.${retryAfter || ' Try again in a few seconds'}`
        };
      }
      
      if (response.status === 402) {
        return {
          success: false,
          error: 'Insufficient credits. Add credits at openrouter.ai/account'
        };
      }
      
      if (response.status >= 500) {
        return {
          success: false,
          error: 'OpenRouter service error. Try again in a moment'
        };
      }

      return {
        success: false,
        error: `Request failed (${response.status}). Check your connection and try again`
      };
    }

    const result: OpenRouterResponse = await response.json();
    
    if (!result.choices || result.choices.length === 0) {
      console.error('TweetCraft: No choices in API response:', result);
      return {
        success: false,
        error: 'No response generated. Please try again.'
      };
    }

    const reply = result.choices[0]?.message?.content?.trim();
    
    if (!reply) {
      // Check if it was cut off due to max_tokens
      if (result.choices[0]?.finish_reason === 'length' || (result.choices[0] as any)?.native_finish_reason === 'MAX_TOKENS') {
        console.warn('%c⚠️ Response hit token limit', 'color: #FFAD1F; font-weight: bold; font-size: 14px');
        console.warn('%c  Response may be incomplete', 'color: #657786');
        // Even if empty, there might be partial content we can use
        const partialReply = result.choices[0]?.message?.content || '';
        if (partialReply.length > 0) {
          return {
            success: true,
            reply: partialReply.trim()
          };
        }
      }
      console.error('%c❌ Empty API Response', 'color: #E0245E; font-weight: bold; font-size: 14px');
      console.error('%c  Details:', 'color: #657786', result.choices[0]);
      return {
        success: false,
        error: 'Empty response generated. Please try again.'
      };
    }

    console.log('%c✅ API Response Received', 'color: #17BF63; font-weight: bold; font-size: 14px');
    console.log(`%c  Raw length: ${reply.length} chars`, 'color: #657786');
    const cleanedReply = this.cleanupReply(reply);
    console.log(`%c  Cleaned length: ${cleanedReply.length} chars`, 'color: #657786');
    if (reply !== cleanedReply) {
      console.log('%c  ⚠️ Meta-text removed during cleanup', 'color: #FFAD1F');
    }
    
    if (!cleanedReply) {
      console.error('TweetCraft: Reply became empty after cleanup. Original:', reply);
      // If cleanup removed everything, return the original trimmed reply
      return {
        success: true,
        reply: reply
      };
    }
    
    // Use cleanedReply if it exists, otherwise use original reply
    const replyToUse = cleanedReply || reply;
    
    // Cache the successful response if we have a tweet ID and tone
    if (context.tweetId && request.tone) {
      CacheService.set(context.tweetId, request.tone, replyToUse);
    }

    // Clean any tracking parameters from URLs in the reply
    const finalReply = URLCleaner.cleanTextURLs(replyToUse);
    
    return {
      success: true,
      reply: finalReply
    };
  }

  /**
   * Get network resilience status and metrics
   */
  static getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      connectionMetrics: { ...this.connectionMetrics },
      queuedRequestsCount: this.queuedRequests.length,
      adaptiveTimeout: this.getAdaptiveTimeout()
    };
  }
  
  /**
   * Cleanup static resources (intervals, timers, caches)
   */
  static cleanup(): void {
    // Clear cleanup interval
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
      console.log('%c🧹 OpenRouterService: Cleanup interval cleared', 'color: #FFA500');
    }
    
    // Clear batch timer if active
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    // Clear request cache to free memory
    this.requestCache.clear();
    
    // Clear queued requests
    this.queuedRequests = [];
    
    console.log('%c✅ OpenRouterService: All resources cleaned up', 'color: #17BF63');
  }
}
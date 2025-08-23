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

export class OpenRouterService {
  private static readonly BASE_URL = 'https://openrouter.ai/api/v1';
  private static readonly HEADERS = {
    'Content-Type': 'application/json',
    'HTTP-Referer': chrome.runtime.getURL(''),
    'X-Title': 'Smart Reply Extension'
  };
  
  // Simple rate limiting
  private static lastRequestTime = 0;
  private static readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests
  
  // Retry configuration
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

  static async generateReply(
    request: ReplyGenerationRequest, 
    context: TwitterContext
  ): Promise<ReplyGenerationResponse> {
    try {
      // Check cache first if we have a tweet ID and tone
      if (context.tweetId && request.tone) {
        const cachedReply = CacheService.get(context.tweetId, request.tone);
        if (cachedReply) {
          console.log('TweetCraft: Using cached response');
          return {
            success: true,
            reply: cachedReply
          };
        }
      }
      
      // Simple rate limiting
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }
      this.lastRequestTime = Date.now();
      
      const config = await StorageService.getConfig();
      const apiKey = await StorageService.getApiKey();

      if (!apiKey) {
        return {
          success: false,
          error: 'No API key found. Get your key at openrouter.ai/keys and add it in the extension settings.'
        };
      }

      const messages = await this.buildMessages(request, context, config);
      const temperature = config.temperature || 0.7;
      
      // Log temperature setting
      console.log(`TweetCraft: Using temperature setting: ${temperature}`);
      
      const openRouterRequest: OpenRouterRequest = {
        model: request.model || config.model || 'openai/gpt-4o',
        messages,
        temperature,
        max_tokens: 280, // Twitter's character limit
        top_p: 0.9
      };

      const response = await this.fetchWithRetry(
        `${this.BASE_URL}/chat/completions`,
        {
          method: 'POST',
          headers: {
            ...this.HEADERS,
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(openRouterRequest)
        }
      );

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
          console.error('TweetCraft: Response hit token limit, may be incomplete');
          // Even if empty, there might be partial content we can use
          const partialReply = result.choices[0]?.message?.content || '';
          if (partialReply.length > 0) {
            return {
              success: true,
              reply: partialReply.trim()
            };
          }
        }
        console.error('TweetCraft: Empty content in API response:', result.choices[0]);
        return {
          success: false,
          error: 'Empty response generated. Please try again.'
        };
      }

      console.log('TweetCraft: Raw API response:', reply);
      const cleanedReply = this.cleanupReply(reply);
      console.log('TweetCraft: Cleaned reply:', cleanedReply);
      
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

    // System prompt with user's style
    let systemPrompt = config.systemPrompt || 'You are a helpful social media user who writes engaging, authentic replies to tweets.';
    
    // Debug logging for tones
    console.log('TweetCraft: Building messages with tone:', request.tone);
    console.log('TweetCraft: Config tonePresets:', config.tonePresets);
    
    // Add tone modifier if specified
    if (request.tone && config.tonePresets) {
      const tonePreset = config.tonePresets.find((preset: any) => preset.id === request.tone);
      console.log('TweetCraft: Found tone preset:', tonePreset);
      if (tonePreset) {
        systemPrompt += ' ' + tonePreset.promptModifier;
        console.log('TweetCraft: Final system prompt:', systemPrompt);
      }
    }

    // Add context awareness instruction
    if (config.contextAware && context.isReply) {
      systemPrompt += ' Analyze the original tweet and write a contextually relevant reply.';
    }

    systemPrompt += ' Keep the reply natural and conversational. Do not use hashtags unless essential.';
    systemPrompt += ' IMPORTANT: Write only the reply text itself. Do not include any meta-commentary, labels, or phrases like "A reply could be:" or "Here\'s a response:". Start directly with the actual reply content.';

    messages.push({
      role: 'system' as const,
      content: systemPrompt
    });

    // User message with context
    let userPrompt = '';
    
    if (request.customPrompt) {
      userPrompt = request.customPrompt;
    } else if (context.isReply && context.tweetText) {
      const contextMode = config.contextMode || 'thread'; // Default to thread
      
      // Handle different context modes
      if (contextMode === 'thread' && context.threadContext && context.threadContext.length > 0) {
        userPrompt = 'Here is a Twitter conversation thread:\n\n';
        
        // Add each previous tweet in the thread
        context.threadContext.forEach((tweet, index) => {
          userPrompt += `${tweet.author}: ${tweet.text}\n`;
        });
        
        // Add the tweet we're directly replying to
        if (context.authorHandle) {
          userPrompt += `@${context.authorHandle}: ${context.tweetText}\n\n`;
        } else {
          userPrompt += `Latest tweet: ${context.tweetText}\n\n`;
        }
        
        userPrompt += 'Write a contextually relevant reply that continues this conversation naturally.';
        console.log(`TweetCraft: Generating THREAD reply with ${context.threadContext.length} previous tweets for context`);
      } else if (contextMode === 'single' || (contextMode === 'thread' && !context.threadContext)) {
        userPrompt = `Write a reply to this tweet: "${context.tweetText}"`;
        console.log(`TweetCraft: Generating SINGLE tweet reply (context mode: ${contextMode})`);
      } else if (contextMode === 'none') {
        userPrompt = 'Write an engaging tweet reply.';
        console.log('TweetCraft: Generating GENERIC reply (context mode: none)');
      }
    } else {
      userPrompt = 'Write an engaging tweet.';
    }

    // Debug logging to see what text we're replying to
    console.log('TweetCraft: Original tweet text:', context.tweetText || '[No tweet text captured]');
    console.log('TweetCraft: Thread context:', context.threadContext || 'No thread context');
    console.log('TweetCraft: User prompt being sent:', userPrompt);

    messages.push({
      role: 'user' as const,
      content: userPrompt
    });

    return messages;
  }

  private static cleanupReply(reply: string): string {
    // Remove common artifacts and meta text
    let cleaned = reply
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();
    
    // Remove common meta-text patterns
    const metaPatterns = [
      /^(A |An )?(balanced |measured |witty |professional |casual |supportive |contrarian |thoughtful )?(reply|response)( could be| might be)?:?\s*/i,
      /^Here(\'s| is) (a |an )?(reply|response):?\s*/i,
      /^(Reply|Response):?\s*/i,
      /^You could (say|reply|respond with):?\s*/i,
    ];
    
    for (const pattern of metaPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    // Remove quotes that might have been added around the actual reply
    cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
    
    return cleaned;
  }

  static async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/models`, {
        headers: {
          ...this.HEADERS,
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('API key validation error:', error);
      return false;
    }
  }

  static async fetchAvailableModels(apiKey: string): Promise<any[]> {
    try {
      const response = await this.fetchWithRetry(
        `${this.BASE_URL}/models`,
        {
          headers: {
            ...this.HEADERS,
            'Authorization': `Bearer ${apiKey}`
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
}
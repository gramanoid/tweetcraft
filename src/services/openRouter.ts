import { 
  OpenRouterRequest, 
  OpenRouterResponse, 
  ReplyGenerationRequest, 
  ReplyGenerationResponse,
  TwitterContext 
} from '@/types';
import { StorageService } from './storage';

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

  static async generateReply(
    request: ReplyGenerationRequest, 
    context: TwitterContext
  ): Promise<ReplyGenerationResponse> {
    try {
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
          error: 'API key not configured. Please set your OpenRouter API key in the extension popup.'
        };
      }

      const messages = await this.buildMessages(request, context, config);
      const openRouterRequest: OpenRouterRequest = {
        model: request.model || config.model || 'openai/gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 1000, // Generous for premium users
        top_p: 0.9
      };

      const response = await fetch(`${this.BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          ...this.HEADERS,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(openRouterRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error:', response.status, errorText);
        
        if (response.status === 401) {
          return {
            success: false,
            error: 'Invalid API key. Please check your OpenRouter API key.'
          };
        }
        
        if (response.status === 429) {
          return {
            success: false,
            error: 'Rate limit exceeded. Please try again in a moment.'
          };
        }

        return {
          success: false,
          error: `API error: ${response.status}. Please try again.`
        };
      }

      const result: OpenRouterResponse = await response.json();
      
      if (!result.choices || result.choices.length === 0) {
        return {
          success: false,
          error: 'No response generated. Please try again.'
        };
      }

      const reply = result.choices[0]?.message?.content?.trim();
      
      if (!reply) {
        return {
          success: false,
          error: 'Empty response generated. Please try again.'
        };
      }

      return {
        success: true,
        reply: this.cleanupReply(reply)
      };

    } catch (error) {
      console.error('OpenRouter service error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
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
    
    // Add tone modifier if specified
    if (request.tone && config.tonePresets) {
      const tonePreset = config.tonePresets.find((preset: any) => preset.id === request.tone);
      if (tonePreset) {
        systemPrompt += ' ' + tonePreset.promptModifier;
      }
    }

    // Add context awareness instruction
    if (config.contextAware && context.isReply) {
      systemPrompt += ' Analyze the original tweet and write a contextually relevant reply.';
    }

    systemPrompt += ' Keep the reply natural and conversational. Do not use hashtags unless essential.';

    messages.push({
      role: 'system' as const,
      content: systemPrompt
    });

    // User message with context
    let userPrompt = '';
    
    if (request.customPrompt) {
      userPrompt = request.customPrompt;
    } else if (context.isReply && context.tweetText) {
      userPrompt = `Write a reply to this tweet: "${context.tweetText}"`;
    } else {
      userPrompt = 'Write an engaging tweet.';
    }

    messages.push({
      role: 'user' as const,
      content: userPrompt
    });

    return messages;
  }

  private static cleanupReply(reply: string): string {
    // Remove common artifacts
    return reply
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();
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
}
import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export class OpenRouterClient {
  private client: AxiosInstance;
  private requestQueue: Promise<any> = Promise.resolve();
  private requestTimes: number[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: config.openrouter.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.openrouter.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/bulkcraft',
        'X-Title': 'BulkCraft Viral Content Generator',
      },
    });
  }

  async complete(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<string> {
    await this.enforceRateLimit();

    const response = await this.client.post('/chat/completions', {
      model: options.model || config.models.default,
      messages,
      temperature: options.temperature ?? config.generation.temperature,
      max_tokens: options.maxTokens ?? config.generation.maxTokens,
      stream: options.stream ?? false,
    });

    return response.data.choices[0].message.content;
  }

  async generateWithRetry(
    prompt: string,
    systemPrompt?: string,
    options: CompletionOptions = {}
  ): Promise<string> {
    const messages: ChatMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    let lastError: Error | null = null;
    
    for (let i = 0; i < config.generation.maxRetries; i++) {
      try {
        return await this.complete(messages, options);
      } catch (error: any) {
        lastError = error;
        
        // Handle rate limit errors
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 5;
          await this.delay(retryAfter * 1000);
        } else if (i < config.generation.maxRetries - 1) {
          // Exponential backoff for other errors
          await this.delay(Math.pow(2, i) * 1000);
        }
      }
    }

    throw lastError || new Error('Failed to generate content after retries');
  }

  async research(query: string): Promise<string> {
    // Use research model for web-aware responses
    return this.generateWithRetry(
      query,
      'You are a research assistant with access to current information. Provide detailed, factual responses based on the latest available data.',
      { model: config.models.research }
    );
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old request times
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);
    
    // If we're at the limit, wait
    if (this.requestTimes.length >= config.rateLimit.requestsPerMinute) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = 60000 - (now - oldestRequest) + 100; // Add 100ms buffer
      await this.delay(waitTime);
    }
    
    this.requestTimes.push(now);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generateWithRetry(
        'Reply with "OK" if you can read this.',
        'You are a test assistant. Reply only with "OK".',
        { maxTokens: 10 }
      );
      return response.toLowerCase().includes('ok');
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
/**
 * Message Bridge Service
 * Centralized message passing between content script and service worker
 * Provides type-safe communication with error handling and retry logic
 */

import { 
  ExtensionMessage, 
  MessageResponse, 
  MessageType,
  GenerateReplyMessage,
  SuggestTemplateMessage,
  GetArsenalRepliesMessage,
  SaveArsenalReplyMessage,
  ComposeTweetMessage,
  GetStorageMessage,
  SetStorageMessage,
  ValidateApiKeyMessage
} from '@/types/messages';
import { SelectionResult } from '@/content/unifiedSelector';
import { TwitterContext } from '@/types';
import { logger } from '@/utils/logger';

export interface MessageBridgeOptions {
  timeout?: number;
  retries?: number;
  onProgress?: (status: string) => void;
}

export class MessageBridge {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly DEFAULT_RETRIES = 2;
  private static loadingElements = new WeakMap<HTMLElement, boolean>();

  /**
   * Send a message to the service worker with type safety
   */
  static async sendMessage<T = any>(
    message: ExtensionMessage,
    options: MessageBridgeOptions = {}
  ): Promise<T> {
    const { 
      timeout = this.DEFAULT_TIMEOUT, 
      retries = this.DEFAULT_RETRIES,
      onProgress 
    } = options;

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(`Retrying message (attempt ${attempt + 1})...`);
          onProgress?.(`Retrying... (${attempt + 1}/${retries + 1})`);
        }

        const response = await this.sendWithTimeout(message, timeout);
        
        if (!response.success) {
          throw new Error(response.error || 'Unknown error occurred');
        }
        
        return response.data as T;
      } catch (error) {
        lastError = error as Error;
        logger.error(`Message failed (attempt ${attempt + 1}):`, error);
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          break;
        }
        
        // Wait before retry with exponential backoff
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }
    
    throw lastError || new Error('Message failed after all retries');
  }

  /**
   * Send message with timeout
   */
  private static sendWithTimeout(
    message: ExtensionMessage,
    timeout: number
  ): Promise<MessageResponse> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);

      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeoutId);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response) {
          reject(new Error('No response received from service worker'));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Generate a reply using the selected configuration
   */
  static async generateReply(
    config: SelectionResult,
    context: TwitterContext,
    options?: MessageBridgeOptions
  ): Promise<string> {
    const message: GenerateReplyMessage = {
      type: MessageType.GENERATE_REPLY,
      request: config as any, // SelectionResult is compatible with ReplyGenerationRequest
      context
    };

    const response = await this.sendMessage<{ reply: string }>(message, {
      ...options,
      timeout: 30000 // 30s for generation
    });

    return response.reply;
  }

  /**
   * Get AI suggestions for the current context
   */
  static async getSuggestions(
    context: TwitterContext,
    options?: MessageBridgeOptions
  ): Promise<Array<{
    config: SelectionResult;
    preview: string;
    score: number;
    rationale: string;
  }>> {
    const message: SuggestTemplateMessage = {
      type: MessageType.SUGGEST_TEMPLATE,
      context
    };

    return this.sendMessage(message, {
      ...options,
      timeout: 15000 // 15s for suggestions
    });
  }

  /**
   * Get Arsenal replies with optional filters
   */
  static async getArsenalReplies(
    filters?: {
      category?: string;
      searchTerm?: string;
      limit?: number;
    },
    options?: MessageBridgeOptions
  ): Promise<Array<{
    id: string;
    text: string;
    category: string;
    usageCount: number;
    createdAt: Date;
  }>> {
    const message: GetArsenalRepliesMessage = {
      type: MessageType.GET_ARSENAL_REPLIES,
      filters
    };

    return this.sendMessage(message, options);
  }

  /**
   * Save a reply to Arsenal
   */
  static async saveArsenalReply(
    reply: {
      text: string;
      category: string;
      metadata?: any;
    },
    options?: MessageBridgeOptions
  ): Promise<{ id: string }> {
    const message: SaveArsenalReplyMessage = {
      type: MessageType.SAVE_ARSENAL_REPLY,
      reply
    };

    return this.sendMessage(message, options);
  }

  /**
   * Compose an original tweet
   */
  static async composeTweet(
    config: {
      topic?: string;
      style?: string;
      tone?: string;
      draft?: string;
      type: 'generate' | 'enhance' | 'suggest';
    },
    options?: MessageBridgeOptions
  ): Promise<string | string[]> {
    const message: ComposeTweetMessage = {
      type: MessageType.COMPOSE_TWEET,
      config
    };

    return this.sendMessage(message, {
      ...options,
      timeout: 20000 // 20s for composition
    });
  }

  /**
   * Validate API key
   */
  static async validateApiKey(
    apiKey: string,
    options?: MessageBridgeOptions
  ): Promise<boolean> {
    const message: ValidateApiKeyMessage = {
      type: MessageType.VALIDATE_API_KEY,
      apiKey
    };

    const response = await this.sendMessage<{ valid: boolean }>(message, {
      ...options,
      timeout: 10000 // 10s for validation
    });

    return response.valid;
  }

  /**
   * Get storage data
   */
  static async getStorage(
    keys: string | string[],
    options?: MessageBridgeOptions
  ): Promise<any> {
    const message: GetStorageMessage = {
      type: MessageType.GET_STORAGE,
      keys
    };

    return this.sendMessage(message, {
      ...options,
      timeout: 5000 // 5s for storage
    });
  }

  /**
   * Set storage data
   */
  static async setStorage(
    data: Record<string, any>,
    options?: MessageBridgeOptions
  ): Promise<void> {
    const message: SetStorageMessage = {
      type: MessageType.SET_STORAGE,
      data
    };

    await this.sendMessage(message, {
      ...options,
      timeout: 5000 // 5s for storage
    });
  }

  /**
   * Check if error should not be retried
   */
  private static isNonRetryableError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return (
      message.includes('invalid api key') ||
      message.includes('quota exceeded') ||
      message.includes('rate limit') ||
      message.includes('extension context invalidated') ||
      message.includes('cannot access')
    );
  }

  /**
   * Helper to delay execution
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set loading state on an element
   */
  static setLoading(element: HTMLElement | null, loading: boolean): void {
    if (!element) return;

    if (loading) {
      this.loadingElements.set(element, true);
      element.classList.add('loading');
      
      if (element instanceof HTMLButtonElement) {
        element.disabled = true;
        const originalText = element.textContent;
        element.dataset.originalText = originalText || '';
        element.innerHTML = '<span class="spinner"></span> Generating...';
      }
    } else {
      this.loadingElements.delete(element);
      element.classList.remove('loading');
      
      if (element instanceof HTMLButtonElement) {
        element.disabled = false;
        const originalText = element.dataset.originalText;
        if (originalText) {
          element.textContent = originalText;
          delete element.dataset.originalText;
        }
      }
    }
  }

  /**
   * Show error message near element
   */
  static showError(element: HTMLElement | null, error: string): void {
    if (!element) return;

    // Remove any existing error
    const existingError = element.parentElement?.querySelector('.error-message');
    existingError?.remove();

    // Create error element
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = error;
    errorEl.style.cssText = `
      color: #DC3545;
      font-size: 12px;
      margin-top: 4px;
      animation: fadeIn 0.3s;
    `;

    // Insert after the element
    element.parentElement?.insertBefore(errorEl, element.nextSibling);

    // Auto-remove after 5 seconds
    setTimeout(() => errorEl.remove(), 5000);
  }

  /**
   * Show success message near element
   */
  static showSuccess(element: HTMLElement | null, message: string): void {
    if (!element) return;

    // Remove any existing message
    const existingMsg = element.parentElement?.querySelector('.success-message');
    existingMsg?.remove();

    // Create success element
    const successEl = document.createElement('div');
    successEl.className = 'success-message';
    successEl.textContent = message;
    successEl.style.cssText = `
      color: #17BF63;
      font-size: 12px;
      margin-top: 4px;
      animation: fadeIn 0.3s;
    `;

    // Insert after the element
    element.parentElement?.insertBefore(successEl, element.nextSibling);

    // Auto-remove after 3 seconds
    setTimeout(() => successEl.remove(), 3000);
  }
}

// Export as default for easier imports
export default MessageBridge;
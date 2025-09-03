// Log at the very start of service worker loading
console.log('%c🚀 SERVICE WORKER LOADING', 'color: #FF0000; font-weight: bold; font-size: 16px');
console.log('Service Worker: Script execution starting...');

import { StorageService } from '@/services/storage';
import { getTemplate, getTone, REPLY_CONFIG } from '@/config/templatesAndTones';
import { EncryptionService } from '@/utils/encryption';
import { cleanupReply } from '@/utils/textUtils';
import { buildFourPartPrompt, logPromptComponents, validatePromptComponents } from '@/services/promptBuilder';
import { usageTracker } from '@/services/usageTracker';

// Log after imports
console.log('Service Worker: Imports completed');

import { API_CONFIG } from '@/config/apiConfig';

console.log('Service Worker: API_CONFIG loaded from environment');
import type { 
  ExtensionMessage as OpenRouterExtensionMessage,
  StorageData,
  FetchModelsResponse,
  TestApiKeyResponse,
  GenerateReplyResponse,
  GenerateImageResponse,
  OpenRouterModel
} from '@/types/openrouter';
import { 
  ExtensionMessage, 
  MessageResponse, 
  MessageType,
  GenerateReplyMessage,
  isGetConfigMessage,
  isSetConfigMessage,
  isGetApiKeyMessage,
  isSetApiKeyMessage,
  isValidateApiKeyMessage,
  isClearDataMessage,
  isGetLastToneMessage,
  isSetLastToneMessage,
  isGenerateReplyMessage,
  isGetStorageMessage,
  isSetStorageMessage,
  isTestApiKeyMessage,
  isFetchModelsMessage,
  isResetUsageStatsMessage,
  isAnalyzeImagesMessage
} from '@/types/messages';
import { ReplyGenerationRequest, TwitterContext, AppConfig } from '@/types';

class SmartReplyServiceWorker {
  constructor() {
    console.log('%c🎯 SmartReplyServiceWorker CONSTRUCTOR CALLED', 'color: #00FF00; font-weight: bold; font-size: 14px');
    this.init();
    console.log('%c✅ SmartReplyServiceWorker INITIALIZED', 'color: #00FF00; font-weight: bold; font-size: 14px');
  }

  /**
   * Shared utility for OpenRouter API calls
   */
  private async fetchFromOpenRouter(endpoint: string, apiKey: string, options: RequestInit = {}): Promise<Response> {
    const url = `https://openrouter.ai/api/v1/${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    console.log(`%c🌐 Service Worker: Fetching ${endpoint}`, 'color: #9146FF; font-weight: bold');

    return fetch(url, {
      ...options,
      headers
    });
  }

  private init(): void {
    console.log('%c📌 Init method called', 'color: #9146FF; font-weight: bold');
    console.log('Smart Reply: Service worker initialized');

    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('📦 onInstalled listener registered');
      void this.handleInstalled(details);
    });

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      console.log('🚀 onStartup listener registered');
      console.log('Smart Reply: Extension started');
    });

    // Handle messages from content scripts or popup with proper error handling
    console.log('📨 Registering message listener...');
    chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
      console.log('%c📩 Message received:', 'color: #1DA1F2; font-weight: bold', message);
      // handleMessage calls sendResponse internally, so we just need to catch errors
      this.handleMessage(message as ExtensionMessage, sender, sendResponse)
        .catch(error => {
          // Send error response only if handleMessage didn't already send one
          console.error('Service worker message handling error:', error);
          if (!chrome.runtime.lastError) {
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
          }
        });
      return true; // Keep the message channel open for async responses
    });
  }

  private async handleInstalled(details: chrome.runtime.InstalledDetails): Promise<void> {
    console.log('Smart Reply: Extension installed/updated', details);

    if (details.reason === 'install') {
      // First-time installation
      console.log('Smart Reply: First-time installation');
      
      // Initialize default settings
      await this.initializeDefaultSettings();
      
      // Open welcome page or show notification
      this.showWelcomeNotification();
    } else if (details.reason === 'update') {
      // Extension updated
      console.log('Smart Reply: Extension updated from', details.previousVersion);
      
      // Handle any migration logic here if needed
      await this.handleUpdate(details.previousVersion);
    }
  }

  private async initializeDefaultSettings(): Promise<void> {
    try {
      // Initialize with default configuration
      const currentConfig = await StorageService.getConfig();
      if (!currentConfig.systemPrompt) {
        console.log('Smart Reply: Initializing default settings');
        // Settings will be initialized with defaults from the storage service
      }
    } catch (error) {
      console.error('Smart Reply: Failed to initialize default settings:', error);
    }
  }

  private showWelcomeNotification(): void {
    // Check if notifications API is available
    if (chrome.notifications && chrome.notifications.create) {
      chrome.notifications.create('smartReplyWelcome', {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon_48.png'),
        title: 'Smart Reply Installed!',
        message: 'Click the extension icon to configure your API key and settings.'
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.log('Smart Reply: Could not show notification:', chrome.runtime.lastError.message);
        } else {
          console.log(`Smart Reply: Welcome notification shown with ID: ${notificationId}`);
        }
      });
    } else {
      console.log('Smart Reply: Notifications API not available');
    }
  }

  private handleUpdate(previousVersion?: string): void {
    // Handle any version-specific migration logic here
    console.log('Smart Reply: Handling update from version', previousVersion);
    
    // Example: Migration logic for breaking changes
    // if (previousVersion && compareVersions(previousVersion, '2.0.0') < 0) {
    //   await this.migrateToV2();
    // }
  }

  private async handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): Promise<void> {
    try {
      switch (message.type) {
        case MessageType.GET_CONFIG: {
          if (isGetConfigMessage(message)) {
            const config = await StorageService.getConfig();
            sendResponse({ success: true, data: config });
          }
          break;
        }

        case MessageType.SET_CONFIG:
          if (isSetConfigMessage(message)) {
            await StorageService.setConfig(message.config);
            sendResponse({ success: true });
          }
          break;

        case MessageType.GET_API_KEY: {
          if (isGetApiKeyMessage(message)) {
            // Return the hardcoded API key
            const apiKey = API_CONFIG.OPENROUTER_API_KEY;
            if (!apiKey || apiKey === 'sk-or-v1-YOUR_API_KEY_HERE') {
              sendResponse({ success: false, error: 'API key not configured' });
            } else {
              sendResponse({ success: true, data: apiKey });
            }
          }
          break;
        }

        case MessageType.SET_API_KEY:
          if (isSetApiKeyMessage(message)) {
            await StorageService.setApiKey(message.apiKey);
            sendResponse({ success: true });
          }
          break;

        case MessageType.VALIDATE_API_KEY:
          if (isValidateApiKeyMessage(message)) {
            // This could be implemented to validate the API key
            // For now, just return success
            sendResponse({ success: true, data: { valid: true } });
          }
          break;

        case MessageType.CLEAR_DATA:
          if (isClearDataMessage(message)) {
            await StorageService.clearAllData();
            sendResponse({ success: true });
          }
          break;

        case MessageType.GET_LAST_TONE: {
          if (isGetLastToneMessage(message)) {
            const lastTone = await StorageService.getLastTone();
            sendResponse({ success: true, data: lastTone });
          }
          break;
        }

        case MessageType.SET_LAST_TONE:
          if (isSetLastToneMessage(message)) {
            await StorageService.setLastTone(message.tone);
            sendResponse({ success: true });
          }
          break;

        // Note: PING not in MessageType enum - should be added if needed

        case MessageType.GET_STORAGE: {
          if (isGetStorageMessage(message)) {
            // Get generic storage items with validation
            const storageKeys = message.keys || null;
          
          // Validate keys parameter
          if (storageKeys !== null && 
              typeof storageKeys !== 'string' && 
              !Array.isArray(storageKeys) && 
              (typeof storageKeys !== 'object' || storageKeys.constructor !== Object)) {
            sendResponse({ success: false, error: 'Invalid keys format. Must be null, string, array of strings, or object' });
            break;
          }
          
          // Validate array contents if array
          if (Array.isArray(storageKeys)) {
            if (storageKeys.length > 100) {
              sendResponse({ success: false, error: 'Too many keys requested (limit: 100)' });
              break;
            }
            if (!storageKeys.every(key => typeof key === 'string')) {
              sendResponse({ success: false, error: 'All array elements must be strings' });
              break;
            }
          }
          
          // Validate object if object
          if (storageKeys && typeof storageKeys === 'object' && !Array.isArray(storageKeys)) {
            const keyCount = Object.keys(storageKeys).length;
            if (keyCount > 100) {
              sendResponse({ success: false, error: 'Too many keys requested (limit: 100)' });
              break;
            }
          }
          
            chrome.storage.local.get(storageKeys, (data) => {
              if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
              } else {
                sendResponse({ success: true, data });
              }
            });
          }
          break;
        }

        case MessageType.SET_STORAGE: {
          if (isSetStorageMessage(message)) {
            // Set generic storage items with validation
            const dataToStore = message.data || {};
          
          // Validate data is a plain object
          if (typeof dataToStore !== 'object' || dataToStore === null || Array.isArray(dataToStore)) {
            sendResponse({ success: false, error: 'Data must be a plain object' });
            break;
          }
          
          // Validate number of keys
          const keys = Object.keys(dataToStore);
          if (keys.length > 100) {
            sendResponse({ success: false, error: 'Too many keys to store (limit: 100)' });
            break;
          }
          
          // Validate key patterns and values
          const allowedKeyPattern = /^[a-zA-Z0-9_-]+$/;
          for (const key of keys) {
            if (typeof key !== 'string') {
              sendResponse({ success: false, error: 'All keys must be strings' });
              break;
            }
            if (key.length > 100) {
              sendResponse({ success: false, error: `Key too long: ${key.substring(0, 50)}...` });
              break;
            }
            if (!allowedKeyPattern.test(key)) {
              sendResponse({ success: false, error: `Invalid key pattern: ${key}. Only alphanumeric, underscore, and hyphen allowed` });
              break;
            }
            
            // Validate value is serializable
            const value = dataToStore[key];
            try {
              JSON.stringify(value);
            } catch (e) {
              sendResponse({ success: false, error: `Value for key '${key}' is not serializable` });
              break;
            }
          }
          
          // Estimate size (rough check)
          let estimatedSize = 0;
          try {
            estimatedSize = JSON.stringify(dataToStore).length;
            if (estimatedSize > 1024 * 1024) { // 1MB limit
              sendResponse({ success: false, error: 'Data too large (limit: 1MB)' });
              break;
            }
          } catch (e) {
            sendResponse({ success: false, error: 'Failed to validate data size' });
            break;
          }
          
            chrome.storage.local.set(dataToStore, () => {
              if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
              } else {
                sendResponse({ success: true });
              }
            });
          }
          break;
        }

        case MessageType.ANALYZE_IMAGES: {
          if (isAnalyzeImagesMessage(message)) {
            try {
              const apiKey = API_CONFIG.OPENROUTER_API_KEY;
              if (!apiKey || apiKey === 'sk-or-v1-YOUR_API_KEY_HERE') {
                sendResponse({ success: false, error: 'API key not configured' });
                return;
              }

              const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': 'https://tweetcraft.com',
                  'X-Title': 'TweetCraft Vision Analysis'
                },
                body: JSON.stringify({
                  model: message.modelId,
                  messages: message.messages,
                  max_tokens: 500,
                  temperature: 0.1
                })
              });

              if (!response.ok) {
                throw new Error(`Vision API error: ${response.status} ${response.statusText}`);
              }

              const data = await response.json();
              const content = data.choices?.[0]?.message?.content;
              
              if (content) {
                sendResponse({ success: true, data: content });
              } else {
                sendResponse({ success: false, error: 'No content in API response' });
              }
            } catch (error) {
              console.error('Vision API error:', error);
              sendResponse({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
              });
            }
          }
          break;
        }
        
        case MessageType.TEST_API_KEY: {
          if (isTestApiKeyMessage(message)) {
          // Test the hardcoded API key
          const testApiKey = API_CONFIG.OPENROUTER_API_KEY;
          if (!testApiKey || testApiKey === 'sk-or-v1-YOUR_API_KEY_HERE') {
            sendResponse({ success: false, error: 'API key not configured' });
            break;
          }
          
            void this.fetchFromOpenRouter('models', testApiKey)
              .then(response => {
                if (response.ok) {
                  console.log('%c✅ API key test successful', 'color: #17BF63');
                  sendResponse({ success: true });
                } else {
                  console.warn(`%c❌ API key test failed: ${response.status}`, 'color: #DC3545');
                  sendResponse({ 
                    success: false, 
                    error: `Error ${response.status}: ${response.statusText}` 
                  });
                }
              })
              .catch(error => {
                console.error('%c❌ Smart Reply: API key test failed:', 'color: #DC3545; font-weight: bold', error);
                sendResponse({ 
                  success: false, 
                  error: 'Network error: Could not connect to OpenRouter' 
                });
              });
          }
          break;
        }

        case MessageType.GENERATE_REPLY:
          if (isGenerateReplyMessage(message)) {
            // Handle reply generation in service worker - await it properly
            await this.handleGenerateReply(message, sendResponse);
          }
          break;

        case MessageType.FETCH_MODELS: {
          if (isFetchModelsMessage(message)) {
            // Handle fetch models - await it properly
            await this.handleFetchModels(sendResponse);
          }
          break;
        }

        case MessageType.RESET_USAGE_STATS: {
          if (isResetUsageStatsMessage(message)) {
            console.log('Service Worker: Resetting usage statistics');
            try {
              await usageTracker.reset();
              console.log('Service Worker: Usage statistics reset successfully');
              sendResponse({ success: true });
            } catch (error) {
              console.error('Service Worker: Failed to reset usage statistics:', error);
              sendResponse({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to reset usage stats' 
              });
            }
          }
          break;
        }

        default:
          console.warn('Smart Reply: Unknown message type:', (message as any).type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Smart Reply: Error handling message:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Utility method to check if the extension is properly configured
  private async isConfigured(): Promise<boolean> {
    try {
      const apiKey = API_CONFIG.OPENROUTER_API_KEY;
      const config = await StorageService.getConfig();
      return !!(apiKey && apiKey !== 'sk-or-v1-YOUR_API_KEY_HERE' && config.systemPrompt);
    } catch (error) {
      console.error('Smart Reply: Error checking configuration:', error);
      return false;
    }
  }

  /**
   * Get temperature based on tone or template
   */
  private getTemperatureForRequest(request: any, config: any): number {
    // Check if a specific temperature was requested
    if (request.temperature !== undefined) {
      return request.temperature;
    }

    // If tone is provided, use tone-specific temperature
    if (request.tone) {
      const toneId = request.tone;
      
      // Check configured tones from templatesAndTones.ts
      const configuredTone = getTone(toneId);
      if (configuredTone) {
        // Use temperature from REPLY_CONFIG
        const toneTemp = REPLY_CONFIG.temperatureByTone[toneId as keyof typeof REPLY_CONFIG.temperatureByTone];
        if (toneTemp !== undefined) {
          console.log(`%c🌡️ Using tone-specific temperature for ${configuredTone.label}:`, 'color: #FF6B6B', toneTemp);
          return toneTemp;
        }
      }
      
      // Check custom tones
      const customTone = config.customTones?.find((tone: any) => tone.id === toneId);
      if (customTone?.temperature !== undefined) {
        console.log(`%c🌡️ Using custom tone temperature:`, 'color: #FF6B6B', customTone.temperature);
        return customTone.temperature;
      }
    }

    // If template is provided without tone, use a moderate temperature
    if (request.template) {
      const template = getTemplate(request.template);
      if (template) {
        // Different templates might need different temperatures
        const templateTemperatures: Record<string, number> = {
          'fact_check': 0.3,      // Low creativity for facts
          'provide_data': 0.4,    // Low for data/stats
          'hot_take': 0.9,        // High for controversial
          'ratio_bait': 0.9,      // High for provocative
          'meme_response': 0.8,   // High for humor
          'ask_question': 0.6,    // Moderate for questions
          'share_experience': 0.7 // Moderate-high for stories
        };
        
        const templateTemp = templateTemperatures[template.id];
        if (templateTemp !== undefined) {
          console.log(`%c🌡️ Using template-specific temperature for ${template.name}:`, 'color: #FF6B6B', templateTemp);
          return templateTemp;
        }
      }
    }

    // Fall back to config temperature or default
    const defaultTemp = config.temperature || REPLY_CONFIG.temperatureByTone.default || 0.7;
    console.log(`%c🌡️ Using default temperature:`, 'color: #657786', defaultTemp);
    return defaultTemp;
  }

  // Handle reply generation with OpenRouter API
  private async handleGenerateReply(
    message: GenerateReplyMessage,
    sendResponse: (response: MessageResponse) => void
  ): Promise<void> {
    console.log('%c🚀 SERVICE WORKER: GENERATE REPLY', 'color: #1DA1F2; font-weight: bold; font-size: 14px');
    console.log('%c════════════════════════════════', 'color: #2E3236');
    
    try {
      const { request, context } = message;
      
      console.log('%c📥 INCOMING REQUEST', 'color: #9146FF; font-weight: bold');
      console.log('%c  Mode:', 'color: #657786', request?.isRewriteMode ? 'REWRITE' : 'GENERATE');
      console.log('%c  Request:', 'color: #657786', request);
      console.log('%c  Context:', 'color: #657786', context);
      if (request?.isRewriteMode && request?.existingText) {
        console.log('%c  Text to Rewrite:', 'color: #FF6B6B', request.existingText.substring(0, 100) + (request.existingText.length > 100 ? '...' : ''));
      }
      
      const apiKey = API_CONFIG.OPENROUTER_API_KEY;
      const config = await StorageService.getConfig();
      
      console.log('%c⚙️ CONFIG LOADED', 'color: #17BF63; font-weight: bold');
      console.log('%c  Model:', 'color: #657786', config.model || 'openai/gpt-4o');
      console.log('%c  Base Temperature:', 'color: #657786', config.temperature || 0.7);
      console.log('%c  Has Custom Style:', 'color: #657786', !!config.customStylePrompt);
      console.log('%c  Custom Tones Count:', 'color: #657786', config.customTones?.length || 0);

      if (!apiKey || apiKey === 'sk-or-v1-YOUR_API_KEY_HERE') {
        sendResponse({
          success: false,
          error: 'API key not configured. Please contact the developer.'
        });
        return;
      }

      // Check if using new 4-part structure
      const has4PartStructure = request.personality || request.vocabulary || request.rhetoric || request.lengthPacing;
      
      let messages;
      let promptComponents;
      
      if (has4PartStructure) {
        console.log('%c🎨 Using NEW 4-PART PROMPT STRUCTURE', 'color: #FFD700; font-weight: bold; font-size: 14px');
        
        // Validate components
        const validation = validatePromptComponents(request);
        if (!validation.isValid) {
          console.log('%c⚠️ Filling missing components with defaults', 'color: #FFA500');
          // Fill in defaults for missing components
          request.personality = request.personality || 'neutral';
          request.vocabulary = request.vocabulary || 'plain_english';
          request.rhetoric = request.rhetoric || 'factual';
          request.lengthPacing = request.lengthPacing || 'standard';
        }
        
        // Build 4-part prompt
        promptComponents = buildFourPartPrompt(request);
        logPromptComponents(promptComponents);
        
        // Create messages with 4-part structure
        messages = [
          { role: 'system', content: promptComponents.combined },
          { role: 'user', content: this.buildUserPrompt(request, context) }
        ];
      } else {
        console.log('%c📝 Using LEGACY prompt structure', 'color: #657786');
        // Fall back to legacy message building
        messages = await this.buildMessages(request, context, config);
      }
      
      // Get temperature based on tone (if provided) or use config/default
      const temperature = this.getTemperatureForRequest(request, config);
      
      console.log('%c📝 MESSAGES BUILT', 'color: #FF6B6B; font-weight: bold');
      console.log('%c  System Prompt Length:', 'color: #657786', messages[0].content.length);
      console.log('%c  User Prompt Length:', 'color: #657786', messages[1].content.length);
      console.log('%c  Total Characters:', 'color: #657786', messages[0].content.length + messages[1].content.length);

      // Add reply length modifier if specified
      let systemPrompt = messages[0].content;
      if (request.replyLength) {
        const lengthModifiers = {
          short: ' Keep the reply very brief, under 50 characters.',
          medium: ' Keep the reply concise, between 50-150 characters.',
          long: ' Write a detailed reply, 150-280 characters.'
        };
        systemPrompt += lengthModifiers[request.replyLength as keyof typeof lengthModifiers] || '';
        messages[0].content = systemPrompt;
      }

      const openRouterRequest = {
        model: request.model || config.model || 'openai/gpt-4o',
        messages,
        temperature,
        top_p: 0.9
      };
      
      console.log('%c🌡️ TEMPERATURE SETTINGS', 'color: #FF6B6B; font-weight: bold');
      console.log('%c  Final Temperature:', 'color: #657786', temperature);
      console.log('%c  Top P:', 'color: #657786', 0.9);

      console.log('%c📤 SENDING TO OPENROUTER API', 'color: #E1AD01; font-weight: bold');
      console.log('%c  Full Request:', 'color: #657786', openRouterRequest);
      console.log('%c  Headers:', 'color: #657786', {
        'Authorization': 'Bearer [REDACTED]',
        'HTTP-Referer': 'https://github.com/gramanoid/tweetcraft',
        'X-Title': 'TweetCraft - AI-powered Twitter/X Reply Chrome Extension'
      });
      console.log('%c  Reply Length Preset:', 'color: #657786', request.replyLength || 'auto');

      const startTime = Date.now();
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/gramanoid/tweetcraft',
          'X-Title': 'TweetCraft - AI-powered Twitter/X Reply Chrome Extension'
        },
        body: JSON.stringify(openRouterRequest)
      });

      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('%c❌ API ERROR', 'color: #DC3545; font-weight: bold; font-size: 14px');
        console.error('%c  Status:', 'color: #DC3545', response.status);
        console.error('%c  Status Text:', 'color: #DC3545', response.statusText);
        console.error('%c  Response Time:', 'color: #DC3545', `${responseTime}ms`);
        console.error('%c  Error Body:', 'color: #DC3545', errorText);
        
        if (response.status === 401) {
          sendResponse({
            success: false,
            error: 'Invalid API key. Get your key at openrouter.ai/keys'
          });
        } else if (response.status === 429) {
          sendResponse({
            success: false,
            error: 'Rate limited. Try again in a few seconds'
          });
        } else {
          sendResponse({
            success: false,
            error: `API error (${response.status}). Try again`
          });
        }
        return;
      }

      const result = await response.json();
      
      console.log('%c✅ API RESPONSE RECEIVED', 'color: #17BF63; font-weight: bold; font-size: 14px');
      console.log('%c  Response Time:', 'color: #657786', `${responseTime}ms`);
      console.log('%c  Model Used:', 'color: #657786', result.model);
      console.log('%c  Tokens Used:', 'color: #657786', result.usage);
      console.log('%c  Finish Reason:', 'color: #657786', result.choices?.[0]?.finish_reason);
      
      const reply = result.choices?.[0]?.message?.content?.trim();

      if (!reply) {
        sendResponse({
          success: false,
          error: 'No response generated. Please try again.'
        });
        return;
      }

      const cleanedReply = this.cleanupReply(reply);
      
      console.log('%c🎯 FINAL REPLY', 'color: #17BF63; font-weight: bold');
      console.log('%c  Original Length:', 'color: #657786', reply.length);
      console.log('%c  Cleaned Length:', 'color: #657786', cleanedReply.length);
      console.log('%c  Reply:', 'color: #17BF63', cleanedReply);
      console.log('%c════════════════════════════════', 'color: #2E3236');
      
      // Include prompt components in response for debugging
      const responseData: MessageResponse = {
        success: true,
        data: {
          reply: cleanedReply,
          promptComponents: promptComponents
        }
      };
      
      sendResponse(responseData);

    } catch (error: any) {
      console.error('%c💥 EXCEPTION IN SERVICE WORKER', 'color: #DC3545; font-weight: bold; font-size: 14px');
      console.error('%c  Error Type:', 'color: #DC3545', error?.constructor?.name || 'Unknown');
      console.error('%c  Error Message:', 'color: #DC3545', error?.message || 'Unknown error');
      console.error('%c  Stack Trace:', 'color: #DC3545', error?.stack || 'No stack trace');
      console.error('%c════════════════════════════════', 'color: #2E3236');
      
      sendResponse({
        success: false,
        error: 'Failed to generate reply. Please try again.'
      });
    }
  }

  /**
   * Handle fetching models from OpenRouter
   */
  private async handleFetchModels(
    sendResponse: (response: MessageResponse) => void
  ): Promise<void> {
    try {
      // Use hardcoded API key
      const fetchApiKey = API_CONFIG.OPENROUTER_API_KEY;
      console.log('Fetching models with API key:', fetchApiKey ? 'Key present' : 'No key');
      console.log('API key length:', fetchApiKey?.length);
      
      if (!fetchApiKey || fetchApiKey === 'sk-or-v1-YOUR_API_KEY_HERE') {
        console.error('API key not configured properly');
        sendResponse({ success: false, error: 'API key not configured in the extension.' });
        return;
      }

      console.log('%c📋 Fetching models from OpenRouter...', 'color: #1DA1F2; font-weight: bold');
      
      // Fetch models from OpenRouter
      const response = await this.fetchFromOpenRouter('models', fetchApiKey);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch models:', response.status, errorText);
        
        if (response.status === 401) {
          sendResponse({ success: false, error: 'Invalid API key. Please check your OpenRouter API key.' });
        } else if (response.status === 429) {
          sendResponse({ success: false, error: 'Rate limit exceeded. Please try again later.' });
        } else {
          sendResponse({ success: false, error: `Failed to fetch models: ${response.statusText}` });
        }
        return;
      }

      const data = await response.json() as { data?: OpenRouterModel[] };
      console.log(`%c✅ Fetched ${data.data?.length || 0} models`, 'color: #17BF63');
      
      if (data.data && Array.isArray(data.data)) {
        // Sort and prioritize popular models
        const priorityModels = [
          'openai/gpt-4o',
          'openai/gpt-4o-mini',
          'anthropic/claude-3.5-sonnet',
          'anthropic/claude-3-opus',
          'google/gemini-pro-1.5',
          'meta-llama/llama-3.1-70b-instruct'
        ];
        
        const models = data.data
          .filter((model) => model.id && model.name)
          .map((model) => ({
            id: model.id,
            name: model.name,
            context_length: model.context_length || 0,
            pricing: {
              prompt: model.pricing?.prompt || 0,
              completion: model.pricing?.completion || 0
            }
          }))
          .sort((a, b) => {
            const aIndex = priorityModels.indexOf(a.id);
            const bIndex = priorityModels.indexOf(b.id);
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return a.name.localeCompare(b.name);
          });
        
        sendResponse({ success: true, data: models });
      } else {
        sendResponse({ success: false, error: 'Invalid response format from OpenRouter' });
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch models from OpenRouter'
      });
    }
  }

  private async buildMessages(
    request: ReplyGenerationRequest,
    context: TwitterContext,
    config: Partial<AppConfig>
  ): Promise<Array<{role: string; content: string}>> {
    console.log('%c🔨 BUILDING MESSAGES', 'color: #9146FF; font-weight: bold');
    console.log('%c────────────────────────────────', 'color: #E1E8ED');
    
    const messages = [];

    // Build system prompt with custom prompts
    let systemPrompt = config.systemPrompt || 'You are a helpful social media user who writes engaging, authentic replies to tweets.';
    
    console.log('%c📝 BASE SYSTEM PROMPT', 'color: #1DA1F2; font-weight: bold');
    console.log('%c  Content:', 'color: #657786', systemPrompt);
    
    // Add custom style prompt if configured
    if (config.customStylePrompt) {
      console.log('%c🎨 CUSTOM STYLE PROMPT', 'color: #FF6B6B; font-weight: bold');
      console.log('%c  Content:', 'color: #657786', config.customStylePrompt);
      systemPrompt += ' ' + config.customStylePrompt;
    }

    // Add tone modifier
    if (request.tone) {
      console.log('%c🎭 TONE MODIFIER', 'color: #E1AD01; font-weight: bold');
      console.log('%c  Requested Tone:', 'color: #657786', request.tone);
      
      // First check if it's one of our backend-configured tones
      const configuredTone = getTone(request.tone);
      if (configuredTone) {
        console.log('%c  Type: Configured Tone', 'color: #9146FF');
        console.log('%c  Tone:', 'color: #657786', configuredTone.label);
        console.log('%c  System Prompt:', 'color: #657786', configuredTone.systemPrompt);
        systemPrompt += ' ' + configuredTone.systemPrompt;
      }
      // Check if it's a custom tone from user settings
      else if (config.customTones?.find((tone: any) => tone.id === request.tone)) {
        const customTone = config.customTones.find((tone: any) => tone.id === request.tone);
        if (customTone) {
          console.log('%c  Type: User Custom Tone', 'color: #9146FF');
          console.log('%c  Modifier:', 'color: #657786', customTone.promptModifier);
          systemPrompt += ' ' + customTone.promptModifier;
        }
      }
      // Otherwise treat it as a combined template+tone instruction
      else {
        console.log('%c  Type: Combined Template+Tone', 'color: #9146FF');
        console.log('%c  Content:', 'color: #657786', request.tone);
        systemPrompt += ' ' + request.tone;
      }
    }

    // Add context awareness
    const hasTweetContext = context.tweetText || request.originalTweet;
    if (hasTweetContext) {
      systemPrompt += ' CRITICAL: You MUST analyze the tweet content provided and write a directly relevant reply that addresses the specific topic, data, or question in the tweet.';
      systemPrompt += ' Your reply must demonstrate that you understood the tweet\'s content.';
    }

    systemPrompt += ' Keep the reply natural and conversational. Do not use hashtags unless essential.';
    systemPrompt += ' IMPORTANT: Write only the reply text itself. Do not include any meta-commentary.';

    console.log('%c📋 FINAL SYSTEM PROMPT', 'color: #17BF63; font-weight: bold');
    console.log('%c  Length:', 'color: #657786', systemPrompt.length + ' characters');
    console.log('%c  Full Content:', 'color: #17BF63');
    console.log('%c  ', 'color: #17BF63', systemPrompt);
    
    messages.push({
      role: 'system' as const,
      content: systemPrompt
    });

    // Build user message
    console.log('%c💬 USER MESSAGE', 'color: #794BC4; font-weight: bold');
    
    let userPrompt = '';
    
    // Handle rewrite mode - pass the user's existing text to the LLM
    if (request.isRewriteMode && request.existingText) {
      console.log('%c  Type: REWRITE MODE', 'color: #FF6B6B; font-weight: bold');
      console.log('%c  Existing Text:', 'color: #657786', request.existingText);
      
      // For rewrite mode, we want the LLM to improve the user's draft
      userPrompt = `Please rewrite and improve this tweet reply while maintaining its core message:\n\n"${request.existingText}"\n\n`;
      
      // Add context about what they're replying to if available
      if (context.tweetText) {
        userPrompt += `Context - this is a reply to: "${context.tweetText}"\n\n`;
      }
      
      userPrompt += 'Improve the clarity, impact, and engagement while keeping the same general intent. Make it more compelling and Twitter-appropriate.';
      
    } else if (request.customPrompt) {
      console.log('%c  Type: Custom Prompt', 'color: #657786');
      userPrompt = request.customPrompt;
    } else {
      // ALWAYS check for tweet context first, regardless of source
      const tweetText = context.tweetText || request.originalTweet;
      
      if (tweetText) {
        console.log('%c  Type: Reply to Tweet', 'color: #657786');
        console.log('%c  Tweet Text Found:', 'color: #17BF63', tweetText.substring(0, 100) + '...');
        
        const contextMode = config.contextMode || 'single'; // Default to single for simplicity
        
        if (contextMode === 'thread' && context.threadContext && context.threadContext.length > 0) {
          console.log('%c  Context Mode: Thread', 'color: #657786');
          console.log('%c  Thread Length:', 'color: #657786', context.threadContext.length + ' additional tweets');
          
          userPrompt = 'Here is a Twitter conversation thread:\n\n';
          context.threadContext.forEach((tweet, index) => {
            console.log(`%c  Tweet ${index + 1}:`, 'color: #657786', tweet.text.substring(0, 50) + '...');
            userPrompt += `${tweet.author}: ${tweet.text}\n`;
          });
          if (context.authorHandle) {
            userPrompt += `@${context.authorHandle}: ${tweetText}\n\n`;
          } else {
            userPrompt += `Latest tweet: ${tweetText}\n\n`;
          }
          userPrompt += 'Write a contextually relevant reply that continues this conversation naturally.';
        } else {
          // Single tweet mode - MOST IMPORTANT: Make the tweet context prominent
          console.log('%c  Context Mode: Single Tweet', 'color: #657786');
          
          // Put the tweet FIRST and make it very clear this is what needs a reply
          userPrompt = `IMPORTANT: You must write a reply to the following tweet. The reply MUST be relevant to the content below:\n\n`;
          userPrompt += `Tweet to reply to: "${tweetText}"\n\n`;
          userPrompt += `Write a reply that directly addresses or responds to the above tweet's content.`;
        }
      } else {
        console.log('%c  Type: Generic Tweet (no context)', 'color: #FFA500');
        userPrompt = 'Write an engaging tweet.';
      }
    }

    console.log('%c  User Prompt Length:', 'color: #657786', userPrompt.length + ' characters');
    console.log('%c  User Prompt:', 'color: #794BC4', userPrompt);
    console.log('%c────────────────────────────────', 'color: #E1E8ED');
    
    messages.push({
      role: 'user' as const,
      content: userPrompt
    });

    return messages;
  }

  // Use shared cleanupReply function from textUtils
  /**
   * Build user prompt from request and context
   */
  private buildUserPrompt(request: ReplyGenerationRequest, context: TwitterContext): string {
    let userPrompt = '';
    
    // For rewrite mode
    if (request.isRewriteMode && request.existingText) {
      userPrompt = `Rewrite this tweet: "${request.existingText}"`;
      if (context.tweetText) {
        userPrompt += `\n\nContext: Replying to: "${context.tweetText}"`;
      }
      return userPrompt;
    }
    
    // For regular reply mode
    if (context.tweetText) {
      userPrompt = `Reply to this tweet: "${context.tweetText}"`;
    } else {
      userPrompt = 'Write a tweet.';
    }
    
    // Add thread context if available
    if (context.threadContext && context.threadContext.length > 0) {
      userPrompt += '\n\nThread context:\n';
      context.threadContext.slice(-3).forEach(tweet => {
        userPrompt += `@${tweet.author}: ${tweet.text}\n`;
      });
    }
    
    // Add author context
    if (context.authorHandle) {
      userPrompt += `\n\nYou are replying to @${context.authorHandle}`;
    }
    
    return userPrompt;
  }
  
  private cleanupReply(reply: string): string {
    return cleanupReply(reply);
  }

  // Handle image analysis requests from vision service
  private async handleAnalyzeImages(
    message: any,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    console.log('%c👁️ SERVICE WORKER: ANALYZE IMAGES', 'color: #794BC4; font-weight: bold');
    
    try {
      const { imageUrls, tweetText, modelId, messages } = message;
      
      // Get hardcoded API key
      const apiKey = API_CONFIG.OPENROUTER_API_KEY;
      if (!apiKey || apiKey === 'sk-or-v1-YOUR_API_KEY_HERE') {
        sendResponse({
          success: false,
          error: 'API key not configured in the extension'
        });
        return;
      }
      
      // Make the vision API call
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://tweetcraft.app',
          'X-Title': 'TweetCraft Vision'
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          max_tokens: 500,
          temperature: 0.3,
          stream: false
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('Vision API error:', error);
        
        if (response.status === 401) {
          sendResponse({ success: false, error: 'Invalid API key' });
        } else if (response.status === 429) {
          sendResponse({ success: false, error: 'Rate limit exceeded' });
        } else if (response.status === 402) {
          sendResponse({ success: false, error: 'Insufficient credits' });
        } else {
          sendResponse({ success: false, error: `API error: ${response.status}` });
        }
        return;
      }
      
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        sendResponse({ success: false, error: 'No content in response' });
        return;
      }
      
      sendResponse({ success: true, content });
      
    } catch (error) {
      console.error('Vision analysis error:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private cleanup(): void {
    console.log('Smart Reply: Performing cleanup');
    // Any cleanup logic can go here
  }
}

// Initialize the service worker
console.log('%c🔥 CREATING SmartReplyServiceWorker INSTANCE', 'color: #FFD700; font-weight: bold; font-size: 16px');
const serviceWorkerInstance = new SmartReplyServiceWorker();
console.log('%c🎉 SmartReplyServiceWorker INSTANCE CREATED', 'color: #FFD700; font-weight: bold; font-size: 16px', serviceWorkerInstance);

// Keep service worker alive for important events
chrome.runtime.onConnect.addListener((port) => {
  console.log('Smart Reply: Port connected:', port.name);
  port.onDisconnect.addListener(() => {
    console.log('Smart Reply: Port disconnected:', port.name);
  });
});

// Handle service worker termination
self.addEventListener('beforeunload', () => {
  console.log('Smart Reply: Service worker terminating');
});

// Remove duplicate activate listener - handled below

// Service Worker Lifecycle Management
// Note: Removed deprecated keep-alive pattern for Chrome Manifest V3 compliance
// Service workers are now event-driven and will activate when needed

// Enhanced lifecycle logging for debugging
self.addEventListener('install', (_event) => {
  console.log('%c🔧 Smart Reply: Service worker installing', 'color: #1DA1F2; font-weight: bold');
  // Skip waiting to activate immediately
  (self as any).skipWaiting();
});

self.addEventListener('activate', (event: any) => {
  console.log('%c✅ Smart Reply: Service worker activated', 'color: #17BF63; font-weight: bold');
  
  // Clean up expired migration locks on activation
  EncryptionService.cleanupExpiredLocks().catch(error => {
    console.error('Failed to cleanup expired locks on activation:', error);
  });
  
  // Claim all clients immediately
  event.waitUntil((self as any).clients.claim());
});

// Log that service worker is starting
console.log('Smart Reply: Service worker starting...');

// Service worker instance already created above at line 1050
console.log('Smart Reply: Service worker instance already created');
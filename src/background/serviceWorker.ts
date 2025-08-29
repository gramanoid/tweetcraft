import { StorageService } from '@/services/storage';

class SmartReplyServiceWorker {
  constructor() {
    this.init();
  }

  private init(): void {
    console.log('Smart Reply: Service worker initialized');

    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstalled(details);
    });

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      console.log('Smart Reply: Extension started');
    });

    // Handle messages from content scripts or popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
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
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: 'Smart Reply Installed!',
        message: 'Click the extension icon to configure your API key and settings.'
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.log('Smart Reply: Could not show notification:', chrome.runtime.lastError.message);
        } else {
          console.log('Smart Reply: Welcome notification shown');
        }
      });
    } else {
      console.log('Smart Reply: Notifications API not available');
    }
  }

  private async handleUpdate(previousVersion?: string): Promise<void> {
    // Handle any version-specific migration logic here
    console.log('Smart Reply: Handling update from version', previousVersion);
    
    // Example: Migration logic for breaking changes
    // if (previousVersion && compareVersions(previousVersion, '2.0.0') < 0) {
    //   await this.migrateToV2();
    // }
  }

  private async handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'GET_CONFIG':
          const config = await StorageService.getConfig();
          sendResponse({ success: true, config });
          break;

        case 'SET_CONFIG':
          await StorageService.setConfig(message.config);
          sendResponse({ success: true });
          break;

        case 'GET_API_KEY':
          const apiKey = await StorageService.getApiKey();
          sendResponse({ success: true, apiKey });
          break;

        case 'SET_API_KEY':
          await StorageService.setApiKey(message.apiKey);
          sendResponse({ success: true });
          break;

        case 'VALIDATE_API_KEY':
          // This could be implemented to validate the API key
          // For now, just return success
          sendResponse({ success: true, valid: true });
          break;

        case 'CLEAR_DATA':
          await StorageService.clearAllData();
          sendResponse({ success: true });
          break;

        case 'GET_LAST_TONE':
          const lastTone = await StorageService.getLastTone();
          sendResponse({ success: true, lastTone });
          break;

        case 'SET_LAST_TONE':
          await StorageService.setLastTone(message.tone);
          sendResponse({ success: true });
          break;

        case 'PING':
          sendResponse({ success: true, message: 'Service worker is active' });
          break;

        case 'TEST_API_KEY':
          // Test API key by fetching models from OpenRouter
          const testApiKey = message.apiKey;
          if (!testApiKey) {
            sendResponse({ success: false, error: 'No API key provided' });
            break;
          }
          
          fetch('https://openrouter.ai/api/v1/models', {
            headers: {
              'Authorization': `Bearer ${testApiKey}`,
              'Content-Type': 'application/json'
            }
          })
          .then(response => {
            if (response.ok) {
              sendResponse({ success: true });
            } else {
              sendResponse({ 
                success: false, 
                error: `Error ${response.status}: ${response.statusText}` 
              });
            }
          })
          .catch(error => {
            console.error('Smart Reply: API key test failed:', error);
            sendResponse({ 
              success: false, 
              error: 'Network error: Could not connect to OpenRouter' 
            });
          });
          break;

        case 'FETCH_MODELS':
          // Fetch available models from OpenRouter
          const fetchApiKey = message.apiKey;
          if (!fetchApiKey) {
            sendResponse({ success: false, error: 'No API key provided' });
            break;
          }
          
          fetch('https://openrouter.ai/api/v1/models', {
            headers: {
              'Authorization': `Bearer ${fetchApiKey}`,
              'Content-Type': 'application/json'
            }
          })
          .then(response => response.json())
          .then(data => {
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
                .filter((model: any) => model.id && model.name)
                .map((model: any) => ({
                  id: model.id,
                  name: model.name,
                  context_length: model.context_length || 'N/A',
                  pricing: {
                    prompt: model.pricing?.prompt || 0,
                    completion: model.pricing?.completion || 0
                  }
                }))
                .sort((a: any, b: any) => {
                  const aIndex = priorityModels.indexOf(a.id);
                  const bIndex = priorityModels.indexOf(b.id);
                  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                  if (aIndex !== -1) return -1;
                  if (bIndex !== -1) return 1;
                  return a.name.localeCompare(b.name);
                });
              
              sendResponse({ success: true, models });
            } else {
              sendResponse({ success: false, error: 'Invalid response from OpenRouter' });
            }
          })
          .catch(error => {
            console.error('TweetCraft: Failed to fetch models:', error);
            sendResponse({ 
              success: false, 
              error: 'Network error: Could not fetch models from OpenRouter' 
            });
          });
          break;

        default:
          console.warn('Smart Reply: Unknown message type:', message.type);
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
      const apiKey = await StorageService.getApiKey();
      const config = await StorageService.getConfig();
      return !!(apiKey && config.systemPrompt);
    } catch (error) {
      console.error('Smart Reply: Error checking configuration:', error);
      return false;
    }
  }

  // Method to handle cleanup on extension disable/uninstall
  private cleanup(): void {
    console.log('Smart Reply: Performing cleanup');
    // Any cleanup logic can go here
  }
}

// Initialize the service worker
const serviceWorker = new SmartReplyServiceWorker();

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

// Log activation
self.addEventListener('activate', (event) => {
  console.log('Smart Reply: Service worker activated');
});

// Keep service worker alive
const keepAlive = () => {
  // Send a keep-alive ping every 20 seconds
  setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // Just a dummy call to keep the service worker alive
    });
  }, 20000);
};

// Initialize keep-alive
keepAlive();

// Log that service worker is starting
console.log('Smart Reply: Service worker starting...');
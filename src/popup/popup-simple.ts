// Super simple popup to test if scripts work at all
import './popup.scss';
import { MessageType } from '@/types/messages';

// TypeScript interfaces for storage
interface StorageConfig {
  model?: string;
  systemPrompt?: string;
  customStylePrompt?: string;
  contextMode?: string;
  temperature?: number;
  replyLengthDefault?: string;
}

interface Features {
  imageUnderstanding?: {
    enabled: boolean;
    model?: string;
    maxImagesPerRequest?: number;
  };
  smartSuggestions?: {
    enabled: boolean;
    maxSuggestions?: number;
  };
  arsenalMode?: {
    enabled: boolean;
    maxReplies?: number;
  };
}

// Configuration constants
const MAX_IMAGES_PER_REQUEST = 2;

console.log('popup-simple.ts: Script loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('popup-simple.ts: DOM loaded');
  
  // Load saved settings
  const systemPromptInput = document.getElementById('system-prompt') as HTMLTextAreaElement | null;
  const customStylePromptInput = document.getElementById('custom-style-prompt') as HTMLTextAreaElement | null;
  const contextModeSelect = document.getElementById('context-mode') as HTMLSelectElement | null;
  const modelSelect = document.getElementById('model-select') as HTMLSelectElement | null;
  const temperatureInput = document.getElementById('temperature') as HTMLInputElement | null;
  const temperatureValue = document.getElementById('temperature-value');
  const refreshModelsBtn = document.getElementById('refresh-models') as HTMLButtonElement | null;
  const replyLengthSelect = document.getElementById('reply-length') as HTMLSelectElement | null;
  
  
  
  // Early return if critical elements are missing
  if (!modelSelect || !systemPromptInput) {
    console.error('Critical form elements missing');
    return;
  }
  
  // Auto-fetch models on popup load
  const autoFetchModels = async () => {
    if (!refreshModelsBtn || !modelSelect) return;
    
    console.log('Auto-fetching models on popup load...');
    
    try {
      const response = await chrome.runtime.sendMessage({ type: MessageType.FETCH_MODELS });
      
      if (response?.success && response?.data) {
        // Clear existing options
        modelSelect.innerHTML = '';
        
        // Add fetched models
        response.data.forEach((model: any) => {
          const option = document.createElement('option');
          option.value = model.id;
          option.textContent = `${model.name} (${model.context_length} tokens, $${model.pricing?.prompt || 0}/${model.pricing?.completion || 0})`;
          modelSelect.appendChild(option);
        });
        
        // Get saved model from storage and select it
        const savedResult = await new Promise<{ smartReply_config?: StorageConfig }>((resolve) => {
          chrome.storage.sync.get(['smartReply_config'], resolve);
        });
        const savedModel = savedResult.smartReply_config?.model;
        
        if (savedModel) {
          const modelExists = Array.from(modelSelect.options).some(opt => opt.value === savedModel);
          if (modelExists) {
            modelSelect.value = savedModel;
            console.log('Restored saved model:', savedModel);
          } else {
            console.log('Saved model not found in fetched list:', savedModel);
            // Select first model and save it
            if (modelSelect.options.length > 0) {
              const firstModel = modelSelect.options[0].value;
              modelSelect.value = firstModel;
              const config = savedResult.smartReply_config || {};
              config.model = firstModel;
              await chrome.storage.sync.set({ smartReply_config: config });
            }
          }
        } else if (modelSelect.options.length > 0) {
          // No saved model, select first one
          const firstModel = modelSelect.options[0].value;
          modelSelect.value = firstModel;
          const config = savedResult.smartReply_config || {};
          config.model = firstModel;
          await chrome.storage.sync.set({ smartReply_config: config });
        }
        
        console.log(`Loaded ${response.data.length} models`);
      } else {
        console.error('Failed to fetch models:', response?.error);
      }
    } catch (error) {
      console.error('Error auto-fetching models:', error);
    }
  };
  
  // Start fetching models immediately
  autoFetchModels();
  
  chrome.storage.sync.get(['smartReply_config', 'features'], (result: { smartReply_config?: StorageConfig; features?: Features }) => {
    if (result.smartReply_config) {
      const config = result.smartReply_config;
      if (config.systemPrompt && systemPromptInput) {
        systemPromptInput.value = config.systemPrompt;
      }
      if (config.customStylePrompt && customStylePromptInput) {
        customStylePromptInput.value = config.customStylePrompt;
      }
      // Model will be loaded after auto-fetch completes
      if (config.temperature !== undefined && temperatureInput) {
        temperatureInput.value = config.temperature.toString();
        if (temperatureValue) {
          temperatureValue.textContent = config.temperature.toString();
        }
      }
      // Load context mode setting
      if (config.contextMode && contextModeSelect) {
        contextModeSelect.value = config.contextMode;
      } else if (contextModeSelect) {
        // Default to thread mode if not set
        contextModeSelect.value = 'thread';
      }
      // Load reply length setting
      if (config.replyLengthDefault && replyLengthSelect) {
        replyLengthSelect.value = config.replyLengthDefault;
      }
      // Comprehensive logging of all loaded settings
      console.log('%c📂 POPUP SETTINGS LOADED', 'color: #17BF63; font-weight: bold; font-size: 14px');
      console.log('%c  Model:', 'color: #657786', config.model || 'Not set');
      console.log('%c  Temperature:', 'color: #657786', config.temperature || 0.7);
      console.log('%c  Context Mode:', 'color: #657786', config.contextMode || 'thread');
      console.log('%c  Reply Length Default:', 'color: #657786', config.replyLengthDefault || 'Auto');
      console.log('%c  System Prompt Length:', 'color: #657786', config.systemPrompt?.length || 0, 'characters');
      console.log('%c  Custom Style Prompt Length:', 'color: #657786', config.customStylePrompt?.length || 0, 'characters');
    }
    
  });
  
  
  // Handle temperature slider
  if (temperatureInput) {
    temperatureInput.addEventListener('input', () => {
      if (temperatureValue) {
        temperatureValue.textContent = temperatureInput.value;
      }
    });
  }
  
  // Auto-save model selection when changed
  if (modelSelect) {
    modelSelect.addEventListener('change', async () => {
      const selectedModel = modelSelect.value;
      console.log('Model changed to:', selectedModel);
      
      // Get existing config
      const result = await new Promise<{ smartReply_config?: StorageConfig }>((resolve) => {
        chrome.storage.sync.get(['smartReply_config'], resolve);
      });
      
      const config = result.smartReply_config || {};
      config.model = selectedModel;
      
      // Save the updated config
      await chrome.storage.sync.set({ smartReply_config: config });
      console.log('Model selection saved:', selectedModel);
      
      // Show brief success indicator
      const statusDiv = document.getElementById('status-message');
      if (statusDiv) {
        statusDiv.textContent = 'Model saved!';
        statusDiv.style.display = 'block';
        statusDiv.style.color = 'green';
        setTimeout(() => {
          statusDiv.style.display = 'none';
        }, 2000);
      }
    });
  }
  
  const saveBtn = document.getElementById('save-settings');
  const resetUsageBtn = document.getElementById('reset-usage');
  
  if (saveBtn) {
    console.log('popup-simple.ts: Save button found');
    saveBtn.addEventListener('click', async () => {
      console.log('popup-simple.ts: Save button clicked!');
      
      const systemPrompt = systemPromptInput?.value?.trim();
      const customStylePrompt = customStylePromptInput?.value?.trim();
      const contextMode = contextModeSelect?.value || 'thread';
      const model = modelSelect?.value;
      const temperature = parseFloat(temperatureInput?.value || '0.7');
      const replyLengthDefault = replyLengthSelect?.value || '';
      
        
        // Get existing config to preserve custom tones with error handling
        const existingConfig = await new Promise<{ config: StorageConfig; features: Features }>((resolve, reject) => {
          chrome.storage.sync.get(['smartReply_config', 'features'], (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve({ config: result.smartReply_config || {}, features: result.features || {} });
            }
          });
        }).catch(error => {
          console.error('Failed to get existing config:', error);
          return { config: {}, features: {} };
        });
        
        // Save config with correct storage key
        const config: StorageConfig = {
          ...existingConfig.config,
          model: model || modelSelect?.value || 'openai/gpt-4o',
          systemPrompt: systemPrompt || 'I am a helpful assistant',
          customStylePrompt: customStylePrompt || '',
          contextMode: contextMode,
          temperature,
          replyLengthDefault: replyLengthDefault || undefined
        };
        
        // Save features settings with image understanding enabled by default
        const features: Features = {
          ...existingConfig.features,
          imageUnderstanding: {
            enabled: true, // Always enabled by default
            model: 'gemini-pro-vision', // Default model
            maxImagesPerRequest: MAX_IMAGES_PER_REQUEST
          }
        };
        
        await chrome.storage.sync.set({ 
          smartReply_config: config,
          features: features 
        });
        
        // Comprehensive logging of all saved settings
        console.log('%c💾 POPUP SETTINGS SAVED', 'color: #1DA1F2; font-weight: bold; font-size: 14px');
        console.log('%c  Model:', 'color: #657786', config.model);
        console.log('%c  Temperature:', 'color: #657786', config.temperature);
        console.log('%c  Context Mode:', 'color: #657786', config.contextMode);
        console.log('%c  Reply Length Default:', 'color: #657786', config.replyLengthDefault || 'Auto');
        console.log('%c  System Prompt Length:', 'color: #657786', config.systemPrompt?.length || 0, 'characters');
        console.log('%c  Custom Style Prompt Length:', 'color: #657786', config.customStylePrompt?.length || 0, 'characters');
        console.log('%c  Image Understanding:', 'color: #657786', features.imageUnderstanding?.enabled ? '✅ ENABLED' : '❌ DISABLED');
        console.log('%c  Vision Model:', 'color: #657786', features.imageUnderstanding?.model);
        console.log('%c  Max Images Per Request:', 'color: #657786', features.imageUnderstanding?.maxImagesPerRequest);
        
        // Show success message
        const statusDiv = document.getElementById('status-message');
        if (statusDiv) {
          statusDiv.textContent = 'Settings saved!';
          statusDiv.style.display = 'block';
          statusDiv.style.color = 'green';
          setTimeout(() => {
            statusDiv.style.display = 'none';
          }, 3000);
        }
        
        console.log('Settings saved:', config);
    });
  } else {
    console.error('popup-simple.ts: Save button not found');
  }

  // Handle reset usage button
  if (resetUsageBtn) {
    console.log('popup-simple.ts: Reset usage button found');
    resetUsageBtn.addEventListener('click', async () => {
      console.log('popup-simple.ts: Reset usage button clicked!');
      
      // Show confirmation dialog
      const confirmed = confirm('Are you sure you want to reset all usage counters? This cannot be undone.');
      
      if (confirmed) {
        try {
          // Disable button during operation
          (resetUsageBtn as HTMLButtonElement).disabled = true;
          resetUsageBtn.textContent = '🔄 Resetting...';
          
          // Send reset message to content script/service worker
          const response = await chrome.runtime.sendMessage({
            type: MessageType.RESET_USAGE_STATS
          });
          
          if (response?.success) {
            // Show success message
            const statusDiv = document.getElementById('status-message');
            if (statusDiv) {
              statusDiv.textContent = '✅ Usage counters reset successfully!';
              statusDiv.style.display = 'block';
              statusDiv.style.color = 'green';
              setTimeout(() => {
                statusDiv.style.display = 'none';
              }, 3000);
            }
            console.log('Usage stats reset successfully');
          } else {
            throw new Error('Failed to reset usage stats');
          }
          
        } catch (error) {
          console.error('Error resetting usage stats:', error);
          
          // Show error message
          const statusDiv = document.getElementById('status-message');
          if (statusDiv) {
            statusDiv.textContent = '❌ Failed to reset usage counters';
            statusDiv.style.display = 'block';
            statusDiv.style.color = 'red';
            setTimeout(() => {
              statusDiv.style.display = 'none';
            }, 3000);
          }
        } finally {
          // Re-enable button
          (resetUsageBtn as HTMLButtonElement).disabled = false;
          resetUsageBtn.textContent = '🔄 Reset Usage';
        }
      }
    });
  } else {
    console.error('popup-simple.ts: Reset usage button not found');
  }
  
  // API key configuration removed - now handled via environment variables
  
  // Handle refresh models button
  if (refreshModelsBtn && modelSelect) {
    refreshModelsBtn.addEventListener('click', async () => {
      console.log('Fetching models from OpenRouter...');
      
      // API key is now hardcoded, no need to check storage
      
      refreshModelsBtn.disabled = true;
      refreshModelsBtn.textContent = '⏳';
      
      try {
        // Fetch models through service worker
        const response = await chrome.runtime.sendMessage({
          type: MessageType.FETCH_MODELS
        });
        
        if (response?.success && response?.data) {
          // Clear existing options
          modelSelect.innerHTML = '';
          
          // Get saved model before clearing options
          const savedResult = await new Promise<{ smartReply_config?: StorageConfig }>((resolve) => {
            chrome.storage.sync.get(['smartReply_config'], resolve);
          });
          const savedModel = savedResult.smartReply_config?.model;
          
          // Add fetched models
          response.data.forEach((model: any) => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name} (${model.context_length} tokens, $${model.pricing?.prompt || 0}/${model.pricing?.completion || 0})`;
            modelSelect.appendChild(option);
          });
          
          // Restore previously selected model if it exists
          if (savedModel) {
            // Check if the saved model exists in the fetched list
            const modelExists = Array.from(modelSelect.options).some(opt => opt.value === savedModel);
            if (modelExists) {
              modelSelect.value = savedModel;
              console.log('Restored saved model:', savedModel);
            } else {
              console.log('Saved model not found in fetched list:', savedModel);
              // Save the first available model as default
              if (modelSelect.options.length > 0) {
                const firstModel = modelSelect.options[0].value;
                modelSelect.value = firstModel;
                // Update saved config with new model
                const config = savedResult.smartReply_config || {};
                config.model = firstModel;
                await chrome.storage.sync.set({ smartReply_config: config });
              }
            }
          } else if (modelSelect.options.length > 0) {
            // No saved model, select the first one
            const firstModel = modelSelect.options[0].value;
            modelSelect.value = firstModel;
            // Save it
            const config = savedResult.smartReply_config || {};
            config.model = firstModel;
            await chrome.storage.sync.set({ smartReply_config: config });
          }
          
          // Show model info
          const modelInfo = document.getElementById('model-info');
          if (modelInfo) {
            modelInfo.textContent = `Found ${response.data.length} models`;
            modelInfo.style.color = 'green';
          }
        } else {
          console.error('Failed to fetch models:', response?.error);
          const modelInfo = document.getElementById('model-info');
          if (modelInfo) {
            modelInfo.textContent = 'Failed to fetch models';
            modelInfo.style.color = 'red';
          }
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        const modelInfo = document.getElementById('model-info');
        if (modelInfo) {
          modelInfo.textContent = 'Error fetching models';
          modelInfo.style.color = 'red';
        }
      } finally {
        refreshModelsBtn.disabled = false;
        refreshModelsBtn.textContent = '↻';
      }
    });
  }
  
});
// Super simple popup to test if scripts work at all
import './popup.scss';
import { MessageType } from '@/types/messages';

// TypeScript interfaces for storage
interface StorageConfig {
  model?: string;
  systemPrompt?: string;
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
  const contextModeSelect = document.getElementById('context-mode') as HTMLSelectElement | null;
  const modelSelect = document.getElementById('model-select') as HTMLSelectElement | null;
  const temperatureInput = document.getElementById('temperature') as HTMLInputElement | null;
  const temperatureValue = document.getElementById('temperature-value');
  const refreshModelsBtn = document.getElementById('refresh-models') as HTMLButtonElement | null;
  const replyLengthSelect = document.getElementById('reply-length') as HTMLSelectElement | null;
  const clearDataBtn = document.getElementById('clear-data') as HTMLButtonElement | null;
  const validateKeyBtn = document.getElementById('validate-key') as HTMLButtonElement | null;
  const selfTestBtn = document.getElementById('self-test') as HTMLButtonElement | null;
  
  // TwitterAPI settings
  const twitterApiEnabledCheckbox = document.getElementById('twitter-api-enabled') as HTMLInputElement | null;
  const twitterApiSettings = document.getElementById('twitter-api-settings');
  const twitterApiKeyInput = document.getElementById('twitter-api-key') as HTMLInputElement | null;
  const testTwitterApiBtn = document.getElementById('test-twitter-api') as HTMLButtonElement | null;
  const twitterApiStatus = document.getElementById('twitter-api-status');
  
  
  
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
          contextMode: contextMode,
          temperature,
          replyLengthDefault: replyLengthDefault || undefined
        };
        
        // Save features settings with image understanding enabled by default
        const features: Features = {
          ...existingConfig.features,
          imageUnderstanding: {
            enabled: true, // Always enabled by default
            model: 'gemini-2-flash', // Default model (free tier)
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
      
      // API key is configured via environment
      
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
  
  // Handle clear data button
  if (clearDataBtn) {
    console.log('popup-simple.ts: Clear data button found');
    clearDataBtn.addEventListener('click', async () => {
      console.log('popup-simple.ts: Clear data button clicked!');
      
      // Show confirmation dialog
      const confirmed = confirm('Are you sure you want to clear all extension data? This will delete all settings, saved templates, arsenal replies, and usage stats. This cannot be undone.');
      
      if (confirmed) {
        try {
          // Disable button during operation
          clearDataBtn.disabled = true;
          clearDataBtn.textContent = '🗑️ Clearing...';
          
          // Send clear data message to service worker
          const response = await chrome.runtime.sendMessage({
            type: MessageType.CLEAR_DATA
          });
          
          if (response?.success) {
            // Show success message
            const statusDiv = document.getElementById('status-message');
            if (statusDiv) {
              statusDiv.textContent = '✅ All data cleared successfully!';
              statusDiv.style.display = 'block';
              statusDiv.style.color = 'green';
              setTimeout(() => {
                statusDiv.style.display = 'none';
                // Reload the popup to show default values
                window.location.reload();
              }, 2000);
            }
            console.log('All data cleared successfully');
          } else {
            throw new Error('Failed to clear data');
          }
        } catch (error) {
          console.error('Error clearing data:', error);
          const statusDiv = document.getElementById('status-message');
          if (statusDiv) {
            statusDiv.textContent = '❌ Failed to clear data';
            statusDiv.style.display = 'block';
            statusDiv.style.color = 'red';
            setTimeout(() => {
              statusDiv.style.display = 'none';
            }, 3000);
          }
        } finally {
          // Re-enable button
          clearDataBtn.disabled = false;
          clearDataBtn.textContent = '🗑️ Clear Data';
        }
      }
    });
  }

  // Handle validate API key button
  if (validateKeyBtn) {
    console.log('popup-simple.ts: Validate key button found');
    validateKeyBtn.addEventListener('click', async () => {
      console.log('popup-simple.ts: Validate key button clicked!');
      
      try {
        // Disable button during operation
        validateKeyBtn.disabled = true;
        validateKeyBtn.textContent = '✓ Validating...';
        
        // Send validate API key message to service worker
        const response = await chrome.runtime.sendMessage({
          type: MessageType.VALIDATE_API_KEY
        });
        
        if (response?.success) {
          // Show success message
          const statusDiv = document.getElementById('status-message');
          if (statusDiv) {
            statusDiv.textContent = '✅ API key is valid!';
            statusDiv.style.display = 'block';
            statusDiv.style.color = 'green';
            setTimeout(() => {
              statusDiv.style.display = 'none';
            }, 3000);
          }
          console.log('API key validated successfully');
        } else {
          throw new Error(response?.error || 'API key validation failed');
        }
      } catch (error) {
        console.error('Error validating API key:', error);
        const statusDiv = document.getElementById('status-message');
        if (statusDiv) {
          statusDiv.textContent = `❌ ${error instanceof Error ? error.message : 'Failed to validate API key'}`;
          statusDiv.style.display = 'block';
          statusDiv.style.color = 'red';
          setTimeout(() => {
            statusDiv.style.display = 'none';
          }, 5000);
        }
      } finally {
        // Re-enable button
        validateKeyBtn.disabled = false;
        validateKeyBtn.textContent = '✓ Validate Key';
      }
    });
  }

  // Handle self-test button
  if (selfTestBtn) {
    console.log('popup-simple.ts: Self-test button found');
    selfTestBtn.addEventListener('click', async () => {
      console.log('popup-simple.ts: Self-test button clicked!');
      
      try {
        // Disable button during operation
        selfTestBtn.disabled = true;
        selfTestBtn.textContent = '🔍 Testing...';
        
        // Import and run self-test
        const { selfTest } = await import('../utils/selfTest');
        const results = await selfTest.runHealthCheck();
        
        // Show results in status message
        const statusDiv = document.getElementById('status-message');
        if (statusDiv) {
          const statusEmoji = results.overall === 'pass' ? '✅' : results.overall === 'warning' ? '⚠️' : '❌';
          const statusText = `${statusEmoji} Health Check Complete - Score: ${results.score}%`;
          
          statusDiv.innerHTML = `
            <div class="status-success">
              ${statusText}
              <details style="margin-top: 8px;">
                <summary style="cursor: pointer; font-size: 0.9em;">View Details</summary>
                <pre style="margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 0.8em; overflow-x: auto; white-space: pre-wrap;">${selfTest.formatResults(results)}</pre>
              </details>
            </div>
          `;
          statusDiv.style.display = 'block';
          
          // Auto-hide after 10 seconds unless details are expanded
          setTimeout(() => {
            const details = statusDiv.querySelector('details') as HTMLDetailsElement;
            if (details && !details.open) {
              statusDiv.style.display = 'none';
            }
          }, 10000);
        }
        
        // Log detailed results to console
        console.log('%c🔍 TweetCraft Self-Test Results', 'color: #1DA1F2; font-weight: bold', results);
        
      } catch (error) {
        console.error('Self-test failed:', error);
        
        const statusDiv = document.getElementById('status-message');
        if (statusDiv) {
          statusDiv.innerHTML = `
            <div class="status-error">
              ❌ Self-test failed: ${error instanceof Error ? error.message : 'Unknown error'}
            </div>
          `;
          statusDiv.style.display = 'block';
          
          setTimeout(() => {
            statusDiv.style.display = 'none';
          }, 5000);
        }
      } finally {
        // Re-enable button
        selfTestBtn.disabled = false;
        selfTestBtn.textContent = '🔍 Self-Test';
      }
    });
  }

  // Load TwitterAPI settings
  const loadTwitterApiSettings = async () => {
    try {
      const { twitterAPI } = await import('../services/twitterAPI');
      const config = await twitterAPI.getConfig();
      
      if (twitterApiEnabledCheckbox) {
        twitterApiEnabledCheckbox.checked = config.enabled;
      }
      
      if (twitterApiKeyInput && config.apiKey) {
        twitterApiKeyInput.value = config.apiKey;
      }
      
      // Show/hide settings based on checkbox
      if (twitterApiSettings) {
        twitterApiSettings.style.display = config.enabled ? 'block' : 'none';
      }
      
    } catch (error) {
      console.error('Failed to load TwitterAPI settings:', error);
    }
  };

  // Handle TwitterAPI enabled checkbox
  if (twitterApiEnabledCheckbox && twitterApiSettings) {
    twitterApiEnabledCheckbox.addEventListener('change', async () => {
      const enabled = twitterApiEnabledCheckbox.checked;
      twitterApiSettings.style.display = enabled ? 'block' : 'none';
      
      try {
        const { twitterAPI } = await import('../services/twitterAPI');
        await twitterAPI.updateConfig({ enabled });
        console.log('TwitterAPI enabled status updated:', enabled);
      } catch (error) {
        console.error('Failed to update TwitterAPI enabled status:', error);
      }
    });
  }

  // Handle TwitterAPI key input
  if (twitterApiKeyInput) {
    twitterApiKeyInput.addEventListener('blur', async () => {
      const apiKey = twitterApiKeyInput.value.trim();
      
      try {
        const { twitterAPI } = await import('../services/twitterAPI');
        await twitterAPI.updateConfig({ apiKey: apiKey || undefined });
        console.log('TwitterAPI key updated');
      } catch (error) {
        console.error('Failed to update TwitterAPI key:', error);
      }
    });
  }

  // Handle test TwitterAPI connection
  if (testTwitterApiBtn && twitterApiStatus) {
    testTwitterApiBtn.addEventListener('click', async () => {
      const originalText = testTwitterApiBtn.textContent;
      
      try {
        testTwitterApiBtn.disabled = true;
        testTwitterApiBtn.textContent = 'Testing...';
        
        const { twitterAPI } = await import('../services/twitterAPI');
        const apiKey = twitterApiKeyInput?.value.trim();
        const result = await twitterAPI.testConnection(apiKey);
        
        if (result.success) {
          twitterApiStatus.innerHTML = '<span style="color: #17BF63;">✅ Connection successful!</span>';
        } else {
          twitterApiStatus.innerHTML = `<span style="color: #DC3545;">❌ ${result.error}</span>`;
        }
        
        // Auto-hide status after 5 seconds
        setTimeout(() => {
          if (twitterApiStatus) {
            twitterApiStatus.innerHTML = '';
          }
        }, 5000);
        
      } catch (error) {
        twitterApiStatus.innerHTML = `<span style="color: #DC3545;">❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}</span>`;
      } finally {
        testTwitterApiBtn.disabled = false;
        testTwitterApiBtn.textContent = originalText;
      }
    });
  }

  // Initialize TwitterAPI settings
  loadTwitterApiSettings();
  
  // Load weekly summary
  loadWeeklySummary();
  
  // Load best time indicator
  loadBestTimeIndicator();
  
});

// Load and display weekly summary
async function loadWeeklySummary(): Promise<void> {
  const container = document.getElementById('weekly-summary-container');
  if (!container) return;
  
  try {
    // Fetch summary from service worker
    const response = await new Promise<any>((resolve) => {
      chrome.runtime.sendMessage(
        { type: MessageType.GET_WEEKLY_SUMMARY },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Failed to fetch weekly summary:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(response);
          }
        }
      );
    });
    
    if (response?.success && response.data) {
      displayWeeklySummary(container, response.data);
    } else {
      container.innerHTML = `
        <div class="summary-empty">
          <p>No data available yet. Start using TweetCraft to see your weekly statistics!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading weekly summary:', error);
    container.innerHTML = `
      <div class="summary-error">
        <p>Failed to load summary. Please try again later.</p>
      </div>
    `;
  }
}

// Display weekly summary in the popup
function displayWeeklySummary(container: HTMLElement, data: any): void {
  const { 
    totalReplies = 0, 
    totalSent = 0, 
    successRate = 0, 
    topPersonality = 'N/A',
    topVocabulary = 'N/A',
    topRhetoric = 'N/A',
    mostActiveDay = 'N/A'
  } = data;
  
  container.innerHTML = `
    <div class="summary-stats">
      <div class="stat-row">
        <span class="stat-label">Total Replies:</span>
        <span class="stat-value">${totalReplies}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Sent:</span>
        <span class="stat-value">${totalSent} (${successRate}%)</span>
      </div>
      ${topPersonality !== 'N/A' ? `
        <div class="stat-row">
          <span class="stat-label">Top Personality:</span>
          <span class="stat-value">${topPersonality}</span>
        </div>
      ` : ''}
      ${mostActiveDay !== 'N/A' ? `
        <div class="stat-row">
          <span class="stat-label">Most Active Day:</span>
          <span class="stat-value">${mostActiveDay}</span>
        </div>
      ` : ''}
    </div>
    <div class="summary-footer">
      <small>Updates every Sunday at 7PM</small>
    </div>
  `;
}

// Load and display best time to tweet indicator
async function loadBestTimeIndicator(): Promise<void> {
  const container = document.getElementById('best-time-indicator');
  if (!container) return;
  
  try {
    // Fetch time recommendations from service worker
    const response = await new Promise<any>((resolve) => {
      chrome.runtime.sendMessage(
        { type: MessageType.GET_TIME_RECOMMENDATIONS },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Failed to fetch time recommendations:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(response);
          }
        }
      );
    });
    
    if (response?.success && response.data) {
      displayBestTimeIndicator(container, response.data);
    } else {
      container.innerHTML = `
        <div class="time-empty">
          <p>No time patterns detected yet. Keep tweeting to discover your optimal posting times!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading time recommendations:', error);
    container.innerHTML = `
      <div class="time-error">
        <p>Failed to load recommendations.</p>
      </div>
    `;
  }
}

// Display best time indicator in the popup
function displayBestTimeIndicator(container: HTMLElement, data: any): void {
  const { currentPeriod, bestTime, suggestion } = data;
  
  // Get current time display
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Format current period nicely
  const periodLabels: { [key: string]: string } = {
    morning: '🌅 Morning',
    midMorning: '☀️ Mid-Morning',
    noon: '🌞 Noon',
    afternoon: '☕ Afternoon',
    evening: '🌇 Evening',
    night: '🌙 Night',
    lateNight: '🌜 Late Night'
  };
  
  const currentPeriodLabel = periodLabels[currentPeriod] || currentPeriod;
  
  container.innerHTML = `
    <div class="time-indicator">
      <div class="current-time">
        <span class="time-now">Now: ${timeString}</span>
        <span class="period-badge">${currentPeriodLabel}</span>
      </div>
      ${bestTime && bestTime.confidence !== 'low' ? `
        <div class="best-time-info">
          <div class="recommendation">
            ${suggestion}
          </div>
          <div class="confidence-indicator confidence-${bestTime.confidence}">
            <span class="confidence-label">Confidence:</span>
            <span class="confidence-value">${bestTime.confidence}</span>
          </div>
        </div>
      ` : `
        <div class="suggestion-text">
          ${suggestion}
        </div>
      `}
    </div>
  `;
}
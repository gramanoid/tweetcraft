// Super simple popup to test if scripts work at all
import './popup.scss';

// TypeScript interfaces for storage
interface StorageConfig {
  model?: string;
  systemPrompt?: string;
  customStylePrompt?: string;
  contextMode?: string;
  temperature?: number;
  replyLengthDefault?: string;
  customTones?: any[];
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
  replyCarousel?: {
    enabled: boolean;
    numberOfOptions?: number;
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
  
  // Custom tone elements
  const customToneNameInput = document.getElementById('custom-tone-name') as HTMLInputElement | null;
  const customToneEmojiInput = document.getElementById('custom-tone-emoji') as HTMLInputElement | null;
  const customTonePromptInput = document.getElementById('custom-tone-prompt') as HTMLTextAreaElement | null;
  const addCustomToneBtn = document.getElementById('add-custom-tone') as HTMLButtonElement | null;
  const customTonesList = document.getElementById('custom-tones-list') as HTMLDivElement | null;
  
  // Feature toggle elements
  const imageUnderstandingCheckbox = document.getElementById('image-understanding') as HTMLInputElement | null;
  const visionSettingsDiv = document.getElementById('vision-settings') as HTMLDivElement | null;
  const visionModelSelect = document.getElementById('vision-model') as HTMLSelectElement | null;
  const arsenalModeCheckbox = document.getElementById('arsenal-mode') as HTMLInputElement | null;
  const smartSuggestionsCheckbox = document.getElementById('smart-suggestions') as HTMLInputElement | null;
  const replyCarouselCheckbox = document.getElementById('reply-carousel') as HTMLInputElement | null;
  
  // Quick action buttons
  const manageArsenalBtn = document.getElementById('manage-arsenal') as HTMLButtonElement | null;
  const viewHistoryBtn = document.getElementById('view-history') as HTMLButtonElement | null;
  const keyboardShortcutsBtn = document.getElementById('keyboard-shortcuts') as HTMLButtonElement | null;
  
  // Early return if critical elements are missing
  if (!modelSelect || !systemPromptInput) {
    console.error('Critical form elements missing');
    return;
  }
  
  chrome.storage.sync.get(['smartReply_config', 'features'], (result: { smartReply_config?: StorageConfig; features?: Features }) => {
    if (result.smartReply_config) {
      const config = result.smartReply_config;
      if (config.systemPrompt && systemPromptInput) {
        systemPromptInput.value = config.systemPrompt;
      }
      if (config.customStylePrompt && customStylePromptInput) {
        customStylePromptInput.value = config.customStylePrompt;
      }
      if (config.model && modelSelect) {
        modelSelect.value = config.model;
      }
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
      // Load custom tones
      if (config.customTones && customTonesList) {
        displayCustomTones(config.customTones);
      }
      console.log('Loaded config:', config);
    }
    
    // Load all features
    if (result.features) {
      const features = result.features;
      
      // Image Understanding
      if (features.imageUnderstanding) {
        if (imageUnderstandingCheckbox) {
          imageUnderstandingCheckbox.checked = features.imageUnderstanding.enabled || false;
          // Show/hide vision settings based on checkbox
          if (visionSettingsDiv) {
            visionSettingsDiv.style.display = imageUnderstandingCheckbox.checked ? 'block' : 'none';
            imageUnderstandingCheckbox.setAttribute('aria-expanded', imageUnderstandingCheckbox.checked ? 'true' : 'false');
          }
        }
        if (visionModelSelect && features.imageUnderstanding.model) {
          visionModelSelect.value = features.imageUnderstanding.model;
        }
      }
      
      // Arsenal Mode
      if (arsenalModeCheckbox && features.arsenalMode) {
        arsenalModeCheckbox.checked = features.arsenalMode.enabled || false;
      }
      
      // Smart Suggestions
      if (smartSuggestionsCheckbox && features.smartSuggestions) {
        smartSuggestionsCheckbox.checked = features.smartSuggestions.enabled !== false; // Default to true
      }
      
      // Reply Carousel
      if (replyCarouselCheckbox && features.replyCarousel) {
        replyCarouselCheckbox.checked = features.replyCarousel.enabled || false;
      }
    }
  });
  
  // Handle image understanding checkbox toggle
  if (imageUnderstandingCheckbox && visionSettingsDiv) {
    imageUnderstandingCheckbox.addEventListener('change', () => {
      const isChecked = imageUnderstandingCheckbox.checked;
      visionSettingsDiv.style.display = isChecked ? 'block' : 'none';
      imageUnderstandingCheckbox.setAttribute('aria-expanded', isChecked ? 'true' : 'false');
    });
  }
  
  // Handle temperature slider
  if (temperatureInput) {
    temperatureInput.addEventListener('input', () => {
      if (temperatureValue) {
        temperatureValue.textContent = temperatureInput.value;
      }
    });
  }
  
  const saveBtn = document.getElementById('save-settings');
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
      
      // Get all feature settings
      const imageUnderstandingEnabled = imageUnderstandingCheckbox?.checked || false;
      const visionModel = visionModelSelect?.value || 'gemini-pro-vision';
      const arsenalModeEnabled = arsenalModeCheckbox?.checked || false;
      const smartSuggestionsEnabled = smartSuggestionsCheckbox?.checked !== false;
      const replyCarouselEnabled = replyCarouselCheckbox?.checked || false;
        
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
          replyLengthDefault: replyLengthDefault || undefined,
          customTones: (existingConfig.config as StorageConfig).customTones || []
        };
        
        // Save features settings
        const features: Features = {
          ...existingConfig.features,
          imageUnderstanding: {
            enabled: imageUnderstandingEnabled,
            model: visionModel,
            maxImagesPerRequest: MAX_IMAGES_PER_REQUEST
          },
          arsenalMode: {
            enabled: arsenalModeEnabled,
            maxReplies: 50
          },
          smartSuggestions: {
            enabled: smartSuggestionsEnabled,
            maxSuggestions: 3
          },
          replyCarousel: {
            enabled: replyCarouselEnabled,
            numberOfOptions: 3
          }
        };
        
        await chrome.storage.sync.set({ 
          smartReply_config: config,
          features: features 
        });
        
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
  
  // API key configuration removed - now handled via environment variables
  
  // Handle refresh models button
  if (refreshModelsBtn && modelSelect) {
    refreshModelsBtn.addEventListener('click', async () => {
      console.log('Fetching models from OpenRouter...');
      
      // Get API key from storage
      const result = await new Promise<any>(resolve => {
        chrome.storage.local.get(['smartReply_apiKey'], resolve);
      });
      
      const apiKey = result.smartReply_apiKey;
      if (!apiKey) {
        alert('Please configure your API key first');
        chrome.runtime.openOptionsPage();
        return;
      }
      
      refreshModelsBtn.disabled = true;
      refreshModelsBtn.textContent = '⏳';
      
      try {
        // Fetch models through service worker
        const response = await chrome.runtime.sendMessage({
          type: 'FETCH_MODELS',
          apiKey: apiKey
        });
        
        if (response?.success && response?.models) {
          // Clear existing options
          modelSelect.innerHTML = '';
          
          // Add fetched models
          response.models.forEach((model: any) => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name} (${model.context_length} tokens, $${model.pricing?.prompt || 0}/${model.pricing?.completion || 0})`;
            modelSelect.appendChild(option);
          });
          
          // Restore previously selected model if it exists
          chrome.storage.sync.get(['smartReply_config'], (result: { smartReply_config?: StorageConfig }) => {
            if (result.smartReply_config?.model) {
              modelSelect.value = result.smartReply_config.model;
            }
          });
          
          // Show model info
          const modelInfo = document.getElementById('model-info');
          if (modelInfo) {
            modelInfo.textContent = `Found ${response.models.length} models`;
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
  
  // Handle custom tone addition
  if (addCustomToneBtn && customToneNameInput && customToneEmojiInput && customTonePromptInput) {
    addCustomToneBtn.addEventListener('click', async () => {
      const name = customToneNameInput.value.trim();
      const emoji = customToneEmojiInput.value.trim() || '✨';
      const prompt = customTonePromptInput.value.trim();
      
      if (!name || !prompt) {
        alert('Please provide both a name and prompt for the custom tone');
        return;
      }
      
      // Get existing config
      const result = await new Promise<any>(resolve => {
        chrome.storage.sync.get(['smartReply_config'], resolve);
      });
      
      const config = result.smartReply_config || {};
      const customTones = config.customTones || [];
      
      // Create new tone
      const newTone = {
        id: `custom-${Date.now()}`,
        name,
        emoji,
        systemPrompt: prompt
      };
      
      // Add to custom tones
      customTones.push(newTone);
      
      // Save back to storage
      config.customTones = customTones;
      await chrome.storage.sync.set({ smartReply_config: config });
      
      // Clear inputs
      customToneNameInput.value = '';
      customToneEmojiInput.value = '';
      customTonePromptInput.value = '';
      
      // Update display
      if (customTonesList) {
        displayCustomTones(customTones);
      }
      
      // Show success message
      const statusDiv = document.getElementById('status-message');
      if (statusDiv) {
        statusDiv.textContent = 'Custom tone added!';
        statusDiv.style.display = 'block';
        statusDiv.style.color = 'green';
        setTimeout(() => {
          statusDiv.style.display = 'none';
        }, 3000);
      }
    });
  }
  
  function displayCustomTones(customTones: any[]) {
    if (!customTonesList) return;
    
    customTonesList.innerHTML = '';
    
    if (customTones.length === 0) {
      customTonesList.innerHTML = '<small style="color: #666;">No custom tones yet</small>';
      return;
    }
    
    customTones.forEach(tone => {
      const toneDiv = document.createElement('div');
      toneDiv.style.cssText = 'padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;';
      
      const toneInfo = document.createElement('div');
      toneInfo.innerHTML = `<strong>${tone.emoji} ${tone.name}</strong><br><small style="color: #666;">${tone.systemPrompt.substring(0, 50)}...</small>`;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️';
      deleteBtn.style.cssText = 'background: none; border: none; cursor: pointer; font-size: 16px;';
      deleteBtn.title = 'Delete tone';
      deleteBtn.onclick = async () => {
        if (!confirm(`Delete custom tone "${tone.name}"?`)) return;
        
        // Get current config
        const result = await new Promise<any>(resolve => {
          chrome.storage.sync.get(['smartReply_config'], resolve);
        });
        
        const config = result.smartReply_config || {};
        config.customTones = (config.customTones || []).filter((t: any) => t.id !== tone.id);
        
        // Save updated config
        await chrome.storage.sync.set({ smartReply_config: config });
        
        // Update display
        displayCustomTones(config.customTones);
      };
      
      toneDiv.appendChild(toneInfo);
      toneDiv.appendChild(deleteBtn);
      customTonesList.appendChild(toneDiv);
    });
  }
  
  // Quick action buttons
  if (manageArsenalBtn) {
    manageArsenalBtn.addEventListener('click', () => {
      // Open arsenal management page
      chrome.tabs.create({ url: chrome.runtime.getURL('arsenal.html') });
    });
  }
  
  if (viewHistoryBtn) {
    viewHistoryBtn.addEventListener('click', () => {
      // Open reply history page
      chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
    });
  }
  
  if (keyboardShortcutsBtn) {
    keyboardShortcutsBtn.addEventListener('click', () => {
      // Show keyboard shortcuts modal
      showKeyboardShortcuts();
    });
  }
  
  function showKeyboardShortcuts() {
    const shortcuts = [
      { keys: 'Ctrl+Shift+T', action: 'Open TweetCraft selector' },
      { keys: 'Ctrl+Shift+A', action: 'Open Arsenal Mode' },
      { keys: 'Ctrl+Enter', action: 'Apply selected reply' },
      { keys: 'Escape', action: 'Close selector/popup' }
    ];
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 400px;
    `;
    
    modal.innerHTML = `
      <h3 style="margin: 0 0 16px 0;">Keyboard Shortcuts</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${shortcuts.map(s => `
          <tr>
            <td style="padding: 8px 16px 8px 0; font-family: monospace; font-size: 13px;">
              <kbd style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${s.keys}</kbd>
            </td>
            <td style="padding: 8px 0; color: #666;">${s.action}</td>
          </tr>
        `).join('')}
      </table>
      <button id="close-shortcuts" style="margin-top: 16px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">
        Close
      </button>
    `;
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('#close-shortcuts');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.remove();
      });
    }
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeModal(e) {
        if (!modal.contains(e.target as Node)) {
          modal.remove();
          document.removeEventListener('click', closeModal);
        }
      });
    }, 100);
  }
});
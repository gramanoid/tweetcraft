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
  
  // Image understanding elements with null checks
  const imageUnderstandingCheckbox = document.getElementById('image-understanding') as HTMLInputElement | null;
  const visionSettingsDiv = document.getElementById('vision-settings') as HTMLDivElement | null;
  const visionModelSelect = document.getElementById('vision-model') as HTMLSelectElement | null;
  
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
    
    // Load image understanding features
    if (result.features) {
      const features = result.features;
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
      
      // Get image understanding settings
      const imageUnderstandingEnabled = imageUnderstandingCheckbox?.checked || false;
      const visionModel = visionModelSelect?.value || 'gemini-pro-vision';
        
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
});
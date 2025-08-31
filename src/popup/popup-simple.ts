// Super simple popup to test if scripts work at all
import './popup.scss';
console.log('popup-simple.ts: Script loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('popup-simple.ts: DOM loaded');
  
  // Load saved settings
  const systemPromptInput = document.getElementById('system-prompt') as HTMLTextAreaElement;
  const customStylePromptInput = document.getElementById('custom-style-prompt') as HTMLTextAreaElement;
  const contextModeSelect = document.getElementById('context-mode') as HTMLSelectElement;
  const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
  const temperatureInput = document.getElementById('temperature') as HTMLInputElement;
  const temperatureValue = document.getElementById('temperature-value');
  const refreshModelsBtn = document.getElementById('refresh-models') as HTMLButtonElement;
  const replyLengthSelect = document.getElementById('reply-length') as HTMLSelectElement;
  
  // Custom tone elements
  const customToneNameInput = document.getElementById('custom-tone-name') as HTMLInputElement;
  const customToneEmojiInput = document.getElementById('custom-tone-emoji') as HTMLInputElement;
  const customTonePromptInput = document.getElementById('custom-tone-prompt') as HTMLTextAreaElement;
  const addCustomToneBtn = document.getElementById('add-custom-tone') as HTMLButtonElement;
  const customTonesList = document.getElementById('custom-tones-list') as HTMLDivElement;
  
  chrome.storage.sync.get(['smartReply_config'], (result) => {
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
      if (config.temperature && temperatureInput) {
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
  });
  
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
      
      const systemPrompt = (document.getElementById('system-prompt') as HTMLTextAreaElement)?.value?.trim();
      const customStylePrompt = (document.getElementById('custom-style-prompt') as HTMLTextAreaElement)?.value?.trim();
      const contextMode = (document.getElementById('context-mode') as HTMLSelectElement)?.value || 'thread';
      const model = (document.getElementById('model-select') as HTMLSelectElement)?.value;
      const temperature = parseFloat((document.getElementById('temperature') as HTMLInputElement)?.value || '0.7');
      const replyLengthDefault = (document.getElementById('reply-length') as HTMLSelectElement)?.value || '';
        
        // Get existing config to preserve custom tones
        const existingConfig = await new Promise<any>(resolve => {
          chrome.storage.sync.get(['smartReply_config'], (result) => {
            resolve(result.smartReply_config || {});
          });
        });
        
        // Save config with correct storage key
        const config = {
          ...existingConfig,
          model: model || 'openai/gpt-4o',
          systemPrompt: systemPrompt || 'I am a helpful assistant',
          customStylePrompt: customStylePrompt || '',
          contextMode: contextMode,
          temperature,
          replyLengthDefault: replyLengthDefault || undefined,
          customTones: existingConfig.customTones || []
        };
        await chrome.storage.sync.set({ smartReply_config: config });
        
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
  
  // Handle Configure API link
  const configureLink = document.getElementById('configure-api');
  if (configureLink) {
    configureLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }
  
  // Handle refresh models button
  if (refreshModelsBtn) {
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
          chrome.storage.sync.get(['smartReply_config'], (result) => {
            if (result.smartReply_config?.model) {
              modelSelect.value = result.smartReply_config.model;
            }
          });
          
          console.log(`Loaded ${response.models.length} models from OpenRouter`);
        } else {
          console.error('Failed to fetch models:', response?.error);
          alert('Failed to fetch models. Check your API key.');
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        alert('Error fetching models. Check console for details.');
      } finally {
        refreshModelsBtn.disabled = false;
        refreshModelsBtn.textContent = '↻';
      }
    });
  }
  
  // Handle custom tone addition
  if (addCustomToneBtn) {
    addCustomToneBtn.addEventListener('click', async () => {
      const name = customToneNameInput?.value?.trim();
      const emoji = customToneEmojiInput?.value?.trim() || '✨';
      const prompt = customTonePromptInput?.value?.trim();
      
      if (!name || !prompt) {
        alert('Please enter both a tone name and prompt modifier');
        return;
      }
      
      // Get existing config
      const result = await new Promise<any>(resolve => {
        chrome.storage.sync.get(['smartReply_config'], (result) => {
          resolve(result);
        });
      });
      
      const config = result.smartReply_config || {};
      const customTones = config.customTones || [];
      
      // Check for duplicate
      if (customTones.some((tone: any) => tone.name === name)) {
        alert('A tone with this name already exists');
        return;
      }
      
      // Add new custom tone
      const newTone = {
        id: `custom_${Date.now()}`,
        name,
        description: `Custom: ${name}`,
        promptModifier: prompt,
        emoji,
        isCustom: true
      };
      
      customTones.push(newTone);
      config.customTones = customTones;
      
      // Save updated config
      await chrome.storage.sync.set({ smartReply_config: config });
      
      // Clear inputs
      if (customToneNameInput) customToneNameInput.value = '';
      if (customToneEmojiInput) customToneEmojiInput.value = '';
      if (customTonePromptInput) customTonePromptInput.value = '';
      
      // Update display
      displayCustomTones(customTones);
      
      // Show success message
      const statusDiv = document.getElementById('status-message');
      if (statusDiv) {
        statusDiv.textContent = `Custom tone "${name}" added!`;
        statusDiv.style.display = 'block';
        statusDiv.style.color = 'green';
        setTimeout(() => {
          statusDiv.style.display = 'none';
        }, 3000);
      }
    });
  }
  
  // Function to display custom tones
  function displayCustomTones(customTones: any[]) {
    if (!customTonesList) return;
    
    if (customTones.length === 0) {
      customTonesList.innerHTML = '<small style="color: #888;">No custom tones added yet</small>';
      return;
    }
    
    customTonesList.innerHTML = '<strong>Your Custom Tones:</strong><br>';
    customTones.forEach((tone: any) => {
      const toneDiv = document.createElement('div');
      toneDiv.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 5px; margin: 5px 0; background: #f0f0f0; border-radius: 4px;';
      toneDiv.innerHTML = `
        <span>${tone.emoji} ${tone.name}</span>
        <button class="remove-tone" data-tone-id="${tone.id}" style="background: #dc3545; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">Remove</button>
      `;
      customTonesList.appendChild(toneDiv);
    });
    
    // Add remove handlers
    document.querySelectorAll('.remove-tone').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const toneId = (e.target as HTMLElement).getAttribute('data-tone-id');
        await removeCustomTone(toneId);
      });
    });
  }
  
  // Function to remove custom tone
  async function removeCustomTone(toneId: string | null) {
    if (!toneId) return;
    
    const result = await new Promise<any>(resolve => {
      chrome.storage.sync.get(['smartReply_config'], (result) => {
        resolve(result);
      });
    });
    
    const config = result.smartReply_config || {};
    config.customTones = (config.customTones || []).filter((tone: any) => tone.id !== toneId);
    
    await chrome.storage.sync.set({ smartReply_config: config });
    displayCustomTones(config.customTones);
  }
});


// Super simple popup to test if scripts work at all
import './popup.scss';
console.log('popup-simple.ts: Script loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('popup-simple.ts: DOM loaded');
  
  // Load saved settings
  const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
  const systemPromptInput = document.getElementById('system-prompt') as HTMLTextAreaElement;
  const contextModeSelect = document.getElementById('context-mode') as HTMLSelectElement;
  const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
  const temperatureInput = document.getElementById('temperature') as HTMLInputElement;
  const temperatureValue = document.getElementById('temperature-value');
  const refreshModelsBtn = document.getElementById('refresh-models') as HTMLButtonElement;
  
  // Load all settings - use the correct storage keys
  chrome.storage.local.get(['smartReply_apiKey'], (result) => {
    if (result.smartReply_apiKey && apiKeyInput) {
      apiKeyInput.value = result.smartReply_apiKey;
      console.log('Loaded API key');
    }
  });
  
  chrome.storage.sync.get(['smartReply_config'], (result) => {
    if (result.smartReply_config) {
      const config = result.smartReply_config;
      if (config.systemPrompt && systemPromptInput) {
        systemPromptInput.value = config.systemPrompt;
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
      
      const apiKey = apiKeyInput?.value?.trim();
      const systemPrompt = (document.getElementById('system-prompt') as HTMLTextAreaElement)?.value?.trim();
      const contextMode = (document.getElementById('context-mode') as HTMLSelectElement)?.value || 'thread';
      const model = (document.getElementById('model-select') as HTMLSelectElement)?.value;
      const temperature = parseFloat((document.getElementById('temperature') as HTMLInputElement)?.value || '0.7');
      
      if (apiKey) {
        // Save API key with correct storage key
        await chrome.storage.local.set({ smartReply_apiKey: apiKey });
        
        // Save config with correct storage key
        const config = {
          model: model || 'openai/gpt-4o',
          systemPrompt: systemPrompt || 'I am a helpful assistant',
          contextMode: contextMode,
          temperature
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
        
        console.log('Settings saved:', { apiKey: apiKey.substring(0, 10) + '...', config });
      } else {
        alert('Please enter an API key');
      }
    });
  } else {
    console.error('popup-simple.ts: Save button not found');
  }
  
  const testBtn = document.getElementById('test-api-key') as HTMLButtonElement;
  const testResult = document.getElementById('api-test-result') as HTMLDivElement;
  
  if (testBtn) {
    console.log('popup-simple.ts: Test button found');
    testBtn.addEventListener('click', async () => {
      console.log('popup-simple.ts: Test button clicked!');
      
      const apiKey = apiKeyInput?.value?.trim();
      if (!apiKey) {
        if (testResult) {
          testResult.className = 'test-result error';
          testResult.textContent = 'Please enter an API key first';
          testResult.style.display = 'block';
        }
        return;
      }
      
      // Disable button during test
      testBtn.disabled = true;
      testBtn.textContent = 'Testing...';
      
      if (testResult) {
        testResult.className = 'test-result testing';
        testResult.textContent = 'Validating API key with OpenRouter...';
        testResult.style.display = 'block';
      }
      
      try {
        // Test the API key through the service worker to avoid CORS issues
        const response = await chrome.runtime.sendMessage({
          type: 'TEST_API_KEY',
          apiKey: apiKey
        });
        
        if (response?.success) {
          if (testResult) {
            testResult.className = 'test-result success';
            testResult.textContent = '✓ API key is valid and working!';
          }
        } else {
          if (testResult) {
            testResult.className = 'test-result error';
            if (response?.error?.includes('401')) {
              testResult.textContent = '✗ Invalid API key. Get your key at openrouter.ai/keys';
            } else {
              testResult.textContent = response?.error || '✗ Test failed. Check your connection and try again';
            }
          }
        }
      } catch (error) {
        console.error('API test failed:', error);
        if (testResult) {
          testResult.className = 'test-result error';
          testResult.textContent = '✗ Connection failed. Check extension permissions';
        }
      } finally {
        // Re-enable button
        testBtn.disabled = false;
        testBtn.textContent = 'Test';
        
        // Hide result after 5 seconds
        setTimeout(() => {
          if (testResult) {
            testResult.style.display = 'none';
          }
        }, 5000);
      }
    });
  } else {
    console.error('popup-simple.ts: Test button not found');
  }
  
  // Handle refresh models button
  if (refreshModelsBtn) {
    refreshModelsBtn.addEventListener('click', async () => {
      console.log('Fetching models from OpenRouter...');
      
      const apiKey = apiKeyInput?.value?.trim();
      if (!apiKey) {
        alert('Please enter an API key first');
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
});

// Also add a visible indicator that the script ran
setTimeout(() => {
  const statusDiv = document.getElementById('status-message');
  if (statusDiv) {
    statusDiv.textContent = 'Script loaded successfully';
    statusDiv.style.display = 'block';
    statusDiv.style.color = 'green';
  }
}, 500);
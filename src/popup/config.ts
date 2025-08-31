import './popup.scss';

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
  const toggleBtn = document.getElementById('toggle-api-key');
  const saveBtn = document.getElementById('save-api-key');
  const backBtn = document.getElementById('back-to-settings');
  const statusDiv = document.getElementById('api-status');
  const statusText = document.getElementById('status-text');
  const modelCount = document.getElementById('model-count');
  const lastCheck = document.getElementById('last-check');
  
  // Load existing API key
  chrome.storage.local.get(['smartReply_apiKey'], (result) => {
    if (result.smartReply_apiKey && apiKeyInput) {
      apiKeyInput.value = result.smartReply_apiKey;
      // Auto-test the existing key
      testApiKey(result.smartReply_apiKey);
    }
  });
  
  // Toggle visibility
  if (toggleBtn && apiKeyInput) {
    toggleBtn.addEventListener('click', () => {
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleBtn.textContent = '🙈';
      } else {
        apiKeyInput.type = 'password';
        toggleBtn.textContent = '👁️';
      }
    });
  }
  
  // Auto-test API key as user types (debounced)
  let testTimeout: NodeJS.Timeout;
  if (apiKeyInput) {
    apiKeyInput.addEventListener('input', () => {
      clearTimeout(testTimeout);
      const key = apiKeyInput.value.trim();
      
      if (key.length > 20) { // Only test if key looks valid
        if (statusText) statusText.textContent = 'Checking API key...';
        testTimeout = setTimeout(() => {
          testApiKey(key);
        }, 1000); // Wait 1 second after typing stops
      }
    });
  }
  
  // Save button
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const apiKey = apiKeyInput?.value?.trim();
      
      if (!apiKey) {
        showStatus('Please enter an API key', 'error');
        return;
      }
      
      // Test before saving
      const isValid = await testApiKey(apiKey);
      
      if (isValid) {
        await chrome.storage.local.set({ smartReply_apiKey: apiKey });
        showStatus('API key saved successfully!', 'success');
        
        // Close window after successful save
        setTimeout(() => {
          window.close();
        }, 1500);
      }
    });
  }
  
  // Back button
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.close();
    });
  }
  
  async function testApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    
    try {
      // Test the API key
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_API_KEY',
        apiKey: apiKey
      });
      
      if (response?.success) {
        // Fetch models to show count
        const modelsResponse = await chrome.runtime.sendMessage({
          type: 'FETCH_MODELS',
          apiKey: apiKey
        });
        
        if (statusDiv) statusDiv.style.background = '#d4edda';
        if (statusText) {
          statusText.textContent = '✅ API key is valid and working!';
          statusText.style.color = '#155724';
        }
        
        if (modelsResponse?.success && modelsResponse?.models) {
          if (modelCount) {
            modelCount.textContent = `${modelsResponse.models.length} models available`;
            modelCount.style.color = '#155724';
          }
        }
        
        if (lastCheck) {
          lastCheck.textContent = `Last checked: ${new Date().toLocaleTimeString()}`;
        }
        
        return true;
      } else {
        if (statusDiv) statusDiv.style.background = '#f8d7da';
        if (statusText) {
          statusText.textContent = '❌ Invalid API key';
          statusText.style.color = '#721c24';
        }
        if (modelCount) modelCount.textContent = '';
        
        return false;
      }
    } catch (error) {
      console.error('API test failed:', error);
      if (statusDiv) statusDiv.style.background = '#f8d7da';
      if (statusText) {
        statusText.textContent = '❌ Connection error';
        statusText.style.color = '#721c24';
      }
      return false;
    }
  }
  
  function showStatus(message: string, type: 'success' | 'error') {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = message;
      statusMessage.style.display = 'block';
      statusMessage.style.color = type === 'success' ? 'green' : 'red';
      
      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, 3000);
    }
  }
});
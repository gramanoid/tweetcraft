import './popup.scss';

document.addEventListener('DOMContentLoaded', async () => {
  const backBtn = document.getElementById('back-to-settings');
  const statusDiv = document.getElementById('api-status');
  const statusText = document.getElementById('status-text');
  const modelCount = document.getElementById('model-count');
  const lastCheck = document.getElementById('last-check');
  
  // Back button
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.close();
    });
  }
  
  // Check API status on load
  checkApiStatus();
  
  async function checkApiStatus() {
    try {
      // Test the hardcoded API key
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_API_KEY'
      });
      
      if (response?.success) {
        // Fetch models to show count
        const modelsResponse = await chrome.runtime.sendMessage({
          type: 'FETCH_MODELS'
        });
        
        if (modelsResponse?.success && modelsResponse?.models) {
          if (modelCount) {
            modelCount.textContent = `${modelsResponse.models.length} models available`;
            modelCount.style.color = '#2e7d32';
          }
        }
        
        if (lastCheck) {
          lastCheck.textContent = `Last checked: ${new Date().toLocaleTimeString()}`;
        }
      } else {
        // API key not configured or invalid
        if (statusDiv) {
          statusDiv.style.background = '#fff3cd';
          statusDiv.style.border = '1px solid #ffc107';
        }
        if (statusText) {
          statusText.textContent = '⚠️ API Key Not Configured';
          statusText.style.color = '#856404';
        }
        if (modelCount) {
          modelCount.textContent = 'Please configure the API key in apiConfig.ts';
          modelCount.style.color = '#856404';
        }
      }
    } catch (error) {
      console.error('API status check failed:', error);
      if (statusDiv) {
        statusDiv.style.background = '#f8d7da';
        statusDiv.style.border = '1px solid #dc3545';
      }
      if (statusText) {
        statusText.textContent = '❌ Connection error';
        statusText.style.color = '#721c24';
      }
    }
  }
});
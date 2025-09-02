import { StorageService } from '@/services/storage';
import { OpenRouterService } from '@/services/openRouter';
import { AppConfig } from '@/types';
import './popup.scss';

class SmartReplyPopup {
  private elements: { [key: string]: HTMLElement } = {};

  constructor() {
    console.log('Smart Reply Popup: Constructor called');
    this.init();
    // Mark as initialized
    const container = document.querySelector('.popup-container');
    if (container) {
      container.setAttribute('data-initialized', 'true');
    }
  }

  private init(): void {
    console.log('Smart Reply Popup: Init method called');
    this.bindElements();
    this.bindEvents();
    this.loadSettings();
    console.log('Smart Reply Popup: Init complete');
  }

  private bindElements(): void {
    console.log('Smart Reply Popup: Binding elements...');
    const requiredElements = {
      apiKey: 'api-key',
      modelSelect: 'model-select',
      systemPrompt: 'system-prompt',
      contextAware: 'context-aware',
      saveButton: 'save-settings',
      statusMessage: 'status-message',
      testApiButton: 'test-api-key',
      apiTestResult: 'api-test-result',
      refreshModelsButton: 'refresh-models',
      modelInfo: 'model-info',
      temperature: 'temperature',
      temperatureValue: 'temperature-value',
      toggleApiKeyButton: 'toggle-api-key'
    };

    let foundCount = 0;
    for (const [key, id] of Object.entries(requiredElements)) {
      const element = document.getElementById(id);
      if (!element) {
        console.error(`Smart Reply Popup: Required element with id '${id}' not found`);
      } else {
        this.elements[key] = element;
        foundCount++;
      }
    }
    console.log(`Smart Reply Popup: Found ${foundCount}/${Object.keys(requiredElements).length} elements`);
  }

  private bindEvents(): void {
    console.log('Smart Reply Popup: Binding events...');
    // Save settings button
    if (this.elements.saveButton) {
      this.elements.saveButton.addEventListener('click', () => {
        console.log('Save button clicked');
        this.saveSettings();
      });
    } else {
      console.error('Save button not found');
    }

    // Test API key button
    if (this.elements.testApiButton) {
      this.elements.testApiButton.addEventListener('click', () => {
        console.log('Test API button clicked');
        this.testApiKey();
      });
    } else {
      console.error('Test API button not found');
    }

    // Toggle API key visibility
    if (this.elements.toggleApiKeyButton) {
      this.elements.toggleApiKeyButton.addEventListener('click', () => {
        console.log('Toggle API key button clicked');
        this.toggleApiKeyVisibility();
      });
    } else {
      console.error('Toggle API key button not found');
    }

    // Refresh models button
    if (this.elements.refreshModelsButton) {
      this.elements.refreshModelsButton.addEventListener('click', () => {
        console.log('Refresh models button clicked');
        this.refreshModels();
      });
    } else {
      console.error('Refresh models button not found');
    }

    // Model selection change
    if (this.elements.modelSelect) {
      this.elements.modelSelect.addEventListener('change', () => {
        console.log('Model select changed');
        this.updateModelInfo();
      });
    } else {
      console.error('Model select not found');
    }

    // Temperature slider change
    if (this.elements.temperature && this.elements.temperatureValue) {
      this.elements.temperature.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        this.elements.temperatureValue.textContent = value;
        console.log('Temperature changed to:', value);
      });
    } else {
      console.error('Temperature slider or value element not found');
    }

    // API key validation on blur
    this.elements.apiKey.addEventListener('blur', () => {
      this.validateApiKey();
    });

    // Auto-save system prompt on change (with debounce)
    let promptTimeout: NodeJS.Timeout;
    this.elements.systemPrompt.addEventListener('input', () => {
      clearTimeout(promptTimeout);
      promptTimeout = setTimeout(() => {
        this.autoSavePrompt();
      }, 1000);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.saveSettings();
      }
    });
  }

  private async loadSettings(): Promise<void> {
    try {
      this.showMessage('Loading settings...', 'info');

      // Load API key (masked)
      const apiKey = await StorageService.getApiKey();
      if (apiKey) {
        (this.elements.apiKey as HTMLInputElement).value = apiKey;
        this.updateApiKeyDisplay(true); // Show masked by default
      }

      // Load configuration
      const config = await StorageService.getConfig();
      
      if (config.model) {
        (this.elements.modelSelect as HTMLSelectElement).value = config.model;
      }

      if (config.systemPrompt) {
        (this.elements.systemPrompt as HTMLTextAreaElement).value = config.systemPrompt;
      }

      // Context mode is now handled in popup-simple.ts

      if (config.temperature !== undefined) {
        (this.elements.temperature as HTMLInputElement).value = config.temperature.toString();
        this.elements.temperatureValue.textContent = config.temperature.toString();
      }

      this.clearMessage();
      console.log('Smart Reply Popup: Settings loaded successfully');

    } catch (error) {
      console.error('Smart Reply Popup: Failed to load settings:', error);
      this.showMessage('Failed to load settings', 'error');
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      this.showMessage('Saving settings...', 'info');
      (this.elements.saveButton as HTMLButtonElement).disabled = true;

      // Get form values
      const apiKeyInput = this.elements.apiKey as HTMLInputElement;
      const apiKey = (apiKeyInput.dataset.realKey || apiKeyInput.value).trim();
      const model = (this.elements.modelSelect as HTMLSelectElement).value;
      const systemPrompt = (this.elements.systemPrompt as HTMLTextAreaElement).value.trim();
      const contextAware = (this.elements.contextAware as HTMLInputElement).checked;
      const temperature = parseFloat((this.elements.temperature as HTMLInputElement).value);

      // Validate required fields
      if (!apiKey) {
        this.showMessage('API key is required', 'error');
        return;
      }

      // Validate API key format
      if (!this.validateApiKeyFormat(apiKey)) {
        this.showMessage('Invalid API key format. Should start with "sk-or-"', 'warning');
        // Continue anyway - let the API validation handle it
      }

      if (!systemPrompt) {
        this.showMessage('System prompt is required', 'error');
        return;
      }

      // Save API key
      await StorageService.setApiKey(apiKey);

      // Save configuration
      const config: Partial<AppConfig> = {
        model,
        systemPrompt,
        temperature
      };

      await StorageService.setConfig(config);

      // Validate API key if it changed
      const isValid = await this.validateApiKey();
      if (!isValid) {
        this.showMessage('Settings saved, but API key validation failed', 'warning');
      } else {
        this.showMessage('Settings saved successfully!', 'success');
      }

      console.log('Smart Reply Popup: Settings saved successfully');

    } catch (error) {
      console.error('Smart Reply Popup: Failed to save settings:', error);
      this.showMessage('Failed to save settings', 'error');
    } finally {
      (this.elements.saveButton as HTMLButtonElement).disabled = false;
    }
  }

  private async validateApiKey(): Promise<boolean> {
    const apiKey = (this.elements.apiKey as HTMLInputElement).value.trim();
    
    if (!apiKey) {
      return false;
    }

    try {
      const isValid = await OpenRouterService.validateApiKey(apiKey);
      
      if (isValid) {
        this.elements.apiKey?.classList.remove('invalid');
        this.elements.apiKey?.classList.add('valid');
        return true;
      } else {
        this.elements.apiKey?.classList.remove('valid');
        this.elements.apiKey?.classList.add('invalid');
        return false;
      }
    } catch (error) {
      console.error('Smart Reply Popup: API key validation failed:', error);
      this.elements.apiKey?.classList.remove('valid');
      this.elements.apiKey?.classList.add('invalid');
      return false;
    }
  }

  private async testApiKey(): Promise<void> {
    const apiKey = (this.elements.apiKey as HTMLInputElement).value.trim();
    const testButton = this.elements.testApiButton as HTMLButtonElement;
    const resultDiv = this.elements.apiTestResult;
    
    if (!apiKey) {
      resultDiv.className = 'test-result error';
      resultDiv.textContent = 'Please enter an API key first';
      return;
    }

    // Show testing state
    testButton.disabled = true;
    testButton.textContent = 'Testing...';
    resultDiv.className = 'test-result testing';
    resultDiv.textContent = 'Validating API key with OpenRouter...';

    try {
      const isValid = await OpenRouterService.validateApiKey(apiKey);
      
      if (isValid) {
        resultDiv.className = 'test-result success';
        resultDiv.textContent = '✓ API key is valid and working!';
        this.elements.apiKey?.classList.remove('invalid');
        this.elements.apiKey?.classList.add('valid');
      } else {
        resultDiv.className = 'test-result error';
        resultDiv.textContent = '✗ Invalid API key. Get your key at openrouter.ai/keys';
        this.elements.apiKey?.classList.remove('valid');
        this.elements.apiKey?.classList.add('invalid');
      }
    } catch (error: any) {
      console.error('Smart Reply Popup: API key test failed:', error);
      resultDiv.className = 'test-result error';
      
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        resultDiv.textContent = '✗ Connection failed. Check your internet connection';
      } else {
        resultDiv.textContent = '✗ Test failed. Check your connection and try again';
      }
      
      this.elements.apiKey?.classList.remove('valid');
      this.elements.apiKey?.classList.add('invalid');
    } finally {
      testButton.disabled = false;
      testButton.textContent = 'Test';
      
      // Hide the result after 5 seconds
      setTimeout(() => {
        resultDiv.className = 'test-result';
        resultDiv.textContent = '';
      }, 5000);
    }
  }

  private async autoSavePrompt(): Promise<void> {
    try {
      const config = await StorageService.getConfig();
      config.systemPrompt = (this.elements.systemPrompt as HTMLTextAreaElement).value.trim();
      await StorageService.setConfig(config);
      console.log('Smart Reply Popup: System prompt auto-saved');
    } catch (error) {
      console.error('Smart Reply Popup: Failed to auto-save prompt:', error);
    }
  }

  private async refreshModels(): Promise<void> {
    const refreshButton = this.elements.refreshModelsButton as HTMLButtonElement;
    const modelSelect = this.elements.modelSelect as HTMLSelectElement;
    const apiKey = (this.elements.apiKey as HTMLInputElement).value.trim();
    
    if (!apiKey) {
      this.showMessage('Please enter an API key first', 'error');
      return;
    }
    
    refreshButton.disabled = true;
    refreshButton.textContent = '⟳';
    refreshButton.style.animation = 'spin 1s linear infinite';
    
    try {
      const models = await OpenRouterService.fetchAvailableModels(apiKey);
      
      if (models.length === 0) {
        this.showMessage('No models available or invalid API key', 'error');
        return;
      }
      
      // Save current selection
      const currentModel = modelSelect.value;
      
      // Clear and repopulate
      modelSelect.innerHTML = '';
      
      models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        modelSelect.appendChild(option);
      });
      
      // Try to restore previous selection
      if (currentModel && models.find(m => m.id === currentModel)) {
        modelSelect.value = currentModel;
      }
      
      // Cache models data for info display
      (window as any).cachedModels = models;
      
      this.updateModelInfo();
      this.showMessage(`Loaded ${models.length} models`, 'success');
      
    } catch (error) {
      console.error('Failed to refresh models:', error);
      this.showMessage('Failed to load models', 'error');
    } finally {
      refreshButton.disabled = false;
      refreshButton.textContent = '↻';
      refreshButton.style.animation = '';
    }
  }

  private updateModelInfo(): void {
    const modelSelect = this.elements.modelSelect as HTMLSelectElement;
    const modelInfo = this.elements.modelInfo;
    const models = (window as any).cachedModels || [];
    
    const selectedModel = models.find((m: any) => m.id === modelSelect.value);
    
    if (selectedModel) {
      const inputPrice = (selectedModel.pricing.input * 1000000).toFixed(2);
      const outputPrice = (selectedModel.pricing.output * 1000000).toFixed(2);
      
      modelInfo.textContent = `Context: ${selectedModel.contextWindow.toLocaleString()} tokens | Cost: $${inputPrice}/$${outputPrice} per 1M tokens`;
    } else {
      modelInfo.textContent = '';
    }
  }

  private toggleApiKeyVisibility(): void {
    const apiKeyInput = this.elements.apiKey as HTMLInputElement;
    const toggleButton = this.elements.toggleApiKeyButton as HTMLButtonElement;
    
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleButton.textContent = isPassword ? '🙈' : '👁️';
    toggleButton.classList.toggle('active', isPassword);
    
    // Update display based on current state
    this.updateApiKeyDisplay(!isPassword);
  }

  private updateApiKeyDisplay(shouldMask: boolean): void {
    const apiKeyInput = this.elements.apiKey as HTMLInputElement;
    const currentValue = apiKeyInput.value;
    
    if (!currentValue || !shouldMask) return;
    
    // Store the real key in a data attribute
    if (!apiKeyInput.dataset.realKey) {
      apiKeyInput.dataset.realKey = currentValue;
    }
    
    // If masking, show masked version
    if (shouldMask && currentValue.length > 8) {
      const masked = currentValue.slice(0, 4) + '•'.repeat(currentValue.length - 8) + currentValue.slice(-4);
      apiKeyInput.value = masked;
    } else if (!shouldMask && apiKeyInput.dataset.realKey) {
      // Restore real key
      apiKeyInput.value = apiKeyInput.dataset.realKey;
    }
  }

  private validateApiKeyFormat(apiKey: string): boolean {
    // OpenRouter API keys can be:
    // - Legacy format: sk-or-[alphanumeric chars]
    // - New format: sk-or-v1-[hex chars]
    const legacyPattern = /^sk-or-[a-zA-Z0-9]{40,}$/;
    const newPattern = /^sk-or-v1-[a-fA-F0-9]{64}$/;
    return legacyPattern.test(apiKey) || newPattern.test(apiKey);
  }

  private showMessage(message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
    if (this.elements.statusMessage) {
      this.elements.statusMessage.textContent = message;
      this.elements.statusMessage.className = `status-message ${type}`;
      this.elements.statusMessage.style.display = 'block';
    }
  }

  private clearMessage(): void {
    if (this.elements.statusMessage) {
      this.elements.statusMessage.style.display = 'none';
      this.elements.statusMessage.textContent = '';
      this.elements.statusMessage.className = 'status-message';
    }
  }

  // Handle external links
  private openExternalLink(url: string): void {
    chrome.tabs.create({ url });
  }
}

// Initialize popup
function initializePopup() {
  console.log('Smart Reply Popup: Initializing...');
  // Add a visual indicator that script is running
  const statusDiv = document.getElementById('status-message');
  if (statusDiv) {
    statusDiv.textContent = 'Loading...';
    statusDiv.style.display = 'block';
  }
  
  try {
    new SmartReplyPopup();
    console.log('Smart Reply Popup: Initialized successfully');
    if (statusDiv) {
      statusDiv.textContent = '';
      statusDiv.style.display = 'none';
    }
  } catch (error) {
    console.error('Smart Reply Popup: Failed to initialize', error);
    if (statusDiv) {
      statusDiv.textContent = 'Error: ' + error;
      statusDiv.style.display = 'block';
      statusDiv.style.color = 'red';
    }
  }

  // Handle external links
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' && target.getAttribute('target') === '_blank') {
      e.preventDefault();
      const url = target.getAttribute('href');
      if (url) {
        chrome.tabs.create({ url });
      }
    }
  });
}

// Check if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  // DOM is already loaded, initialize immediately
  initializePopup();
}

// Also add a fallback with setTimeout
setTimeout(() => {
  if (!document.querySelector('.popup-container')?.hasAttribute('data-initialized')) {
    console.log('Smart Reply Popup: Fallback initialization');
    initializePopup();
  }
}, 100);
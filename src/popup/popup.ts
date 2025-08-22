import { StorageService } from '@/services/storage';
import { OpenRouterService } from '@/services/openRouter';
import { AppConfig } from '@/types';
import './popup.scss';

class SmartReplyPopup {
  private elements: { [key: string]: HTMLElement } = {};

  constructor() {
    this.init();
  }

  private init(): void {
    this.bindElements();
    this.bindEvents();
    this.loadSettings();
  }

  private bindElements(): void {
    this.elements.apiKey = document.getElementById('api-key')!;
    this.elements.modelSelect = document.getElementById('model-select')!;
    this.elements.systemPrompt = document.getElementById('system-prompt')!;
    this.elements.contextAware = document.getElementById('context-aware')!;
    this.elements.saveButton = document.getElementById('save-settings')!;
    this.elements.statusMessage = document.getElementById('status-message')!;
  }

  private bindEvents(): void {
    // Save settings button
    this.elements.saveButton.addEventListener('click', () => {
      this.saveSettings();
    });

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

      // Load API key
      const apiKey = await StorageService.getApiKey();
      if (apiKey) {
        (this.elements.apiKey as HTMLInputElement).value = apiKey;
      }

      // Load configuration
      const config = await StorageService.getConfig();
      
      if (config.model) {
        (this.elements.modelSelect as HTMLSelectElement).value = config.model;
      }

      if (config.systemPrompt) {
        (this.elements.systemPrompt as HTMLTextAreaElement).value = config.systemPrompt;
      }

      if (config.contextAware !== undefined) {
        (this.elements.contextAware as HTMLInputElement).checked = config.contextAware;
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
      const apiKey = (this.elements.apiKey as HTMLInputElement).value.trim();
      const model = (this.elements.modelSelect as HTMLSelectElement).value;
      const systemPrompt = (this.elements.systemPrompt as HTMLTextAreaElement).value.trim();
      const contextAware = (this.elements.contextAware as HTMLInputElement).checked;

      // Validate required fields
      if (!apiKey) {
        this.showMessage('API key is required', 'error');
        return;
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
        contextAware
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

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SmartReplyPopup();

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
});
/**
 * Settings Tab Component
 * SPRINT 2: Settings UI development and backend integration
 */

import { TabComponent, TabManager } from './TabManager';
import { MessageType } from '@/types/messages';
import { logger } from '@/utils/logger';
import UIStateManager from '@/services/uiStateManager';

export class SettingsTab implements TabComponent {
  private container: HTMLElement | null = null;
  private tabManager: TabManager | null = null;
  private settings = {
    apiKey: '',
    defaultModel: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 150,
    autoSave: true,
    darkMode: true,
    shortcuts: true,
    notifications: true,
    analytics: true,
    debugMode: false
  };

  constructor(tabManager?: TabManager) {
    this.tabManager = tabManager || null;
  }

  async onShow(): Promise<void> {
    // Load current settings from storage
    await this.loadSettings();
  }

  render(): string {
    return `
      <div class="settings-tab-container">
        <div class="settings-header">
          <h2>Settings</h2>
          <p class="settings-subtitle">Configure your TweetCraft preferences</p>
        </div>
        
        <div class="settings-sections">
          <!-- API Configuration -->
          <div class="settings-section">
            <h3 class="section-title">API Configuration</h3>
            <div class="setting-item">
              <label for="api-key">OpenRouter API Key</label>
              <div class="input-group">
                <input 
                  type="password" 
                  id="api-key" 
                  class="setting-input" 
                  placeholder="sk-or-v1-..." 
                  value="${this.settings.apiKey}"
                />
                <button class="btn-validate" data-action="validate-key">Validate</button>
              </div>
              <span class="setting-hint">Get your API key from openrouter.ai</span>
            </div>
            
            <div class="setting-item">
              <label for="default-model">Default Model</label>
              <select id="default-model" class="setting-select">
                <option value="gpt-4o-mini" ${this.settings.defaultModel === 'gpt-4o-mini' ? 'selected' : ''}>GPT-4o Mini (Fast & Cheap)</option>
                <option value="claude-3-haiku" ${this.settings.defaultModel === 'claude-3-haiku' ? 'selected' : ''}>Claude 3 Haiku</option>
                <option value="gpt-4o" ${this.settings.defaultModel === 'gpt-4o' ? 'selected' : ''}>GPT-4o (Better Quality)</option>
                <option value="claude-3-5-sonnet" ${this.settings.defaultModel === 'claude-3-5-sonnet' ? 'selected' : ''}>Claude 3.5 Sonnet</option>
              </select>
            </div>
            
            <div class="setting-item">
              <label for="temperature">Temperature (Creativity)</label>
              <div class="slider-container">
                <input 
                  type="range" 
                  id="temperature" 
                  class="setting-slider" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value="${this.settings.temperature}"
                />
                <span class="slider-value">${this.settings.temperature}</span>
              </div>
              <span class="setting-hint">Higher = more creative, Lower = more focused</span>
            </div>
          </div>
          
          <!-- Preferences -->
          <div class="settings-section">
            <h3 class="section-title">Preferences</h3>
            
            <div class="setting-item">
              <label class="toggle-label">
                <input 
                  type="checkbox" 
                  class="setting-toggle" 
                  data-setting="autoSave"
                  ${this.settings.autoSave ? 'checked' : ''}
                />
                <span class="toggle-slider"></span>
                <span class="toggle-text">Auto-save drafts</span>
              </label>
            </div>
            
            <div class="setting-item">
              <label class="toggle-label">
                <input 
                  type="checkbox" 
                  class="setting-toggle" 
                  data-setting="darkMode"
                  ${this.settings.darkMode ? 'checked' : ''}
                />
                <span class="toggle-slider"></span>
                <span class="toggle-text">Dark mode</span>
              </label>
            </div>
            
            <div class="setting-item">
              <label class="toggle-label">
                <input 
                  type="checkbox" 
                  class="setting-toggle" 
                  data-setting="shortcuts"
                  ${this.settings.shortcuts ? 'checked' : ''}
                />
                <span class="toggle-slider"></span>
                <span class="toggle-text">Keyboard shortcuts</span>
              </label>
            </div>
            
            <div class="setting-item">
              <label class="toggle-label">
                <input 
                  type="checkbox" 
                  class="setting-toggle" 
                  data-setting="notifications"
                  ${this.settings.notifications ? 'checked' : ''}
                />
                <span class="toggle-slider"></span>
                <span class="toggle-text">Show notifications</span>
              </label>
            </div>
          </div>
          
          <!-- Privacy & Data -->
          <div class="settings-section">
            <h3 class="section-title">Privacy & Data</h3>
            
            <div class="setting-item">
              <label class="toggle-label">
                <input 
                  type="checkbox" 
                  class="setting-toggle" 
                  data-setting="analytics"
                  ${this.settings.analytics ? 'checked' : ''}
                />
                <span class="toggle-slider"></span>
                <span class="toggle-text">Usage analytics</span>
              </label>
              <span class="setting-hint">Help improve TweetCraft with anonymous usage data</span>
            </div>
            
            <div class="setting-item">
              <button class="btn-action" data-action="export-data">Export Settings</button>
              <button class="btn-action" data-action="import-data">Import Settings</button>
            </div>
            
            <div class="setting-item">
              <button class="btn-danger" data-action="clear-data">Clear All Data</button>
              <span class="setting-hint">This will reset all settings and clear saved templates</span>
            </div>
          </div>
          
          <!-- Advanced -->
          <div class="settings-section">
            <h3 class="section-title">Advanced</h3>
            
            <div class="setting-item">
              <label class="toggle-label">
                <input 
                  type="checkbox" 
                  class="setting-toggle" 
                  data-setting="debugMode"
                  ${this.settings.debugMode ? 'checked' : ''}
                />
                <span class="toggle-slider"></span>
                <span class="toggle-text">Debug mode</span>
              </label>
              <span class="setting-hint">Show detailed logs in console</span>
            </div>
            
            <div class="setting-item">
              <button class="btn-action" data-action="reset-defaults">Reset to Defaults</button>
            </div>
          </div>
        </div>
        
        <div class="settings-footer">
          <button class="btn-save" data-action="save-settings">Save Changes</button>
          <span class="save-status hidden">Settings saved!</span>
        </div>
      </div>
    `;
  }

  attachEventListeners(container: HTMLElement): void {
    this.container = container;
    
    // API Key validation
    const validateBtn = container.querySelector('[data-action="validate-key"]');
    if (validateBtn) {
      validateBtn.addEventListener('click', () => this.validateApiKey());
    }
    
    // Model selection
    const modelSelect = container.querySelector('#default-model') as HTMLSelectElement;
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        this.settings.defaultModel = (e.target as HTMLSelectElement).value;
      });
    }
    
    // Temperature slider
    const tempSlider = container.querySelector('#temperature') as HTMLInputElement;
    const tempValue = container.querySelector('.slider-value');
    if (tempSlider && tempValue) {
      tempSlider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        this.settings.temperature = parseFloat(value);
        tempValue.textContent = value;
      });
    }
    
    // Toggle switches
    container.querySelectorAll('.setting-toggle').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const setting = (e.target as HTMLElement).dataset.setting;
        if (setting && setting in this.settings) {
          (this.settings as any)[setting] = (e.target as HTMLInputElement).checked;
        }
      });
    });
    
    // Action buttons
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.target as HTMLElement).dataset.action;
        this.handleAction(action);
      });
    });
    
    // API key input
    const apiKeyInput = container.querySelector('#api-key') as HTMLInputElement;
    if (apiKeyInput) {
      apiKeyInput.addEventListener('input', (e) => {
        this.settings.apiKey = (e.target as HTMLInputElement).value;
      });
    }
  }

  destroy(): void {
    this.container = null;
  }

  private async loadSettings(): Promise<void> {
    try {
      if (this.tabManager) {
        // Use TabManager's getStorage method
        const config = await this.tabManager.getStorage('config');
        if (config) {
          Object.assign(this.settings, config);
        }
      } else {
        // Fallback to direct message
        const response = await chrome.runtime.sendMessage({ 
          type: MessageType.GET_CONFIG 
        });
        if (response?.success && response.data) {
          Object.assign(this.settings, response.data);
        }
      }
    } catch (error) {
      logger.error('Failed to load settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      if (this.container) {
        UIStateManager.setLoading(this.container, true, {
          customText: 'Saving settings...',
          animationType: 'pulse'
        });
      }

      if (this.tabManager) {
        // Use TabManager's setStorage method
        await this.tabManager.setStorage({ config: this.settings });
      } else {
        // Fallback to direct message
        await chrome.runtime.sendMessage({
          type: MessageType.SET_CONFIG,
          config: this.settings
        });
      }
      
      if (this.container) {
        UIStateManager.setLoading(this.container, false);
        UIStateManager.showSuccess(this.container, 'Settings saved successfully!');
      }
      this.showSaveStatus();
    } catch (error) {
      logger.error('Failed to save settings:', error);
      if (this.container) {
        UIStateManager.setLoading(this.container, false);
        UIStateManager.showError(this.container, 'Failed to save settings');
      }
    }
  }

  private async validateApiKey(): Promise<void> {
    const btn = this.container?.querySelector('[data-action="validate-key"]') as HTMLButtonElement;
    if (!btn) return;
    
    btn.textContent = 'Validating...';
    btn.disabled = true;
    
    try {
      let isValid = false;
      
      if (this.tabManager) {
        // Use TabManager's validateApiKey method
        isValid = await this.tabManager.validateApiKey(this.settings.apiKey);
      } else {
        // Fallback to direct message
        const response = await chrome.runtime.sendMessage({
          type: MessageType.VALIDATE_API_KEY,
          apiKey: this.settings.apiKey
        });
        isValid = response?.success || false;
      }
      
      if (isValid) {
        btn.textContent = '✓ Valid';
        btn.classList.add('success');
      } else {
        btn.textContent = '✗ Invalid';
        btn.classList.add('error');
      }
    } catch (error) {
      btn.textContent = 'Error';
      btn.classList.add('error');
    } finally {
      setTimeout(() => {
        btn.textContent = 'Validate';
        btn.disabled = false;
        btn.classList.remove('success', 'error');
      }, 3000);
    }
  }

  private async handleAction(action?: string): Promise<void> {
    switch (action) {
      case 'save-settings':
        await this.saveSettings();
        break;
      case 'export-data':
        await this.exportSettings();
        break;
      case 'import-data':
        await this.importSettings();
        break;
      case 'clear-data':
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
          await this.clearAllData();
        }
        break;
      case 'reset-defaults':
        if (confirm('Reset all settings to defaults?')) {
          await this.resetToDefaults();
        }
        break;
    }
  }

  private async exportSettings(): Promise<void> {
    const dataStr = JSON.stringify(this.settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tweetcraft-settings-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private async importSettings(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        Object.assign(this.settings, imported);
        await this.saveSettings();
        this.render(); // Re-render with new settings
      } catch (error) {
        console.error('Failed to import settings:', error);
        alert('Failed to import settings. Please check the file format.');
      }
    };
    input.click();
  }

  private async clearAllData(): Promise<void> {
    try {
      if (this.container) {
        UIStateManager.setLoading(this.container, true, {
          customText: 'Clearing all data...',
          animationType: 'pulse'
        });
      }

      // Clear data via direct message (no TabManager method for this)
      await chrome.runtime.sendMessage({ type: MessageType.CLEAR_DATA });
      await this.resetToDefaults();
      
      if (this.container) {
        UIStateManager.setLoading(this.container, false);
        UIStateManager.showSuccess(this.container, 'All data cleared successfully');
      }
    } catch (error) {
      logger.error('Failed to clear data:', error);
      if (this.container) {
        UIStateManager.setLoading(this.container, false);
        UIStateManager.showError(this.container, 'Failed to clear data');
      }
    }
  }

  private async resetToDefaults(): Promise<void> {
    this.settings = {
      apiKey: '',
      defaultModel: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 150,
      autoSave: true,
      darkMode: true,
      shortcuts: true,
      notifications: true,
      analytics: true,
      debugMode: false
    };
    await this.saveSettings();
    if (this.container) {
      this.container.innerHTML = this.render();
      this.attachEventListeners(this.container);
    }
  }

  private showSaveStatus(): void {
    const status = this.container?.querySelector('.save-status');
    if (status) {
      status.classList.remove('hidden');
      setTimeout(() => {
        status.classList.add('hidden');
      }, 2000);
    }
  }
}
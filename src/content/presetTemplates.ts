/**
 * Preset Reply Templates for TweetCraft
 * Provides quick template options for different types of replies
 */

import { memoryManager } from '@/utils/memoryManager';
import { TEMPLATES, Template } from '@/config/templatesAndTones';

export interface PresetTemplate {
  id: string;
  name: string;
  emoji: string;
  prompt: string;
  description: string;
  category: 'engagement' | 'value' | 'conversation' | 'humor' | 'debate' | 'viral';
}

export class PresetTemplates {
  // Use templates from centralized configuration
  public static readonly DEFAULT_PRESETS: PresetTemplate[] = TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    emoji: t.emoji,
    prompt: t.prompt,
    description: t.description,
    category: t.category
  }));

  private container: HTMLElement | null = null;
  private selectedPreset: PresetTemplate | null = null;
  private onSelectCallback: ((preset: PresetTemplate) => void) | null = null;
  private customPresets: PresetTemplate[] = [];
  private isExpanded: boolean = false;

  constructor() {
    this.loadCustomPresets();
  }

  /**
   * Create the preset templates UI
   */
  create(onSelect: (preset: PresetTemplate) => void): HTMLElement {
    this.onSelectCallback = onSelect;
    
    this.container = document.createElement('div');
    this.container.className = 'tweetcraft-preset-templates';
    this.render();
    this.applyStyles();
    
    return this.container;
  }

  /**
   * Render the templates UI
   */
  private render(): void {
    if (!this.container) return;

    const allPresets = [...PresetTemplates.DEFAULT_PRESETS, ...this.customPresets];
    
    // Show only 6 presets in compact mode
    this.container.innerHTML = `
      <div class="preset-header">
        <span class="preset-title">Quick Templates</span>
        <button class="preset-expand-btn" aria-label="Toggle expand">
          <span>${this.isExpanded ? '▼' : '▶'}</span>
        </button>
      </div>
      
      <div class="preset-quick-access">
        ${allPresets.slice(0, 6).map(preset => `
          <button class="preset-quick-btn" 
                  data-preset="${preset.id}"
                  title="${preset.description}">
            <span class="preset-emoji">${preset.emoji}</span>
            <span class="preset-label">${preset.name}</span>
          </button>
        `).join('')}
      </div>
      
      ${this.isExpanded ? `
        <div class="preset-expanded show">
          <div class="preset-compact-grid">
            ${allPresets.slice(6).map(preset => `
              <button class="preset-compact-btn" 
                      data-preset="${preset.id}"
                      title="${preset.description}">
                <span class="preset-emoji">${preset.emoji}</span>
                <span class="preset-label">${preset.name}</span>
              </button>
            `).join('')}
          </div>
          
          ${this.customPresets.length > 0 || allPresets.length > 12 ? `
            <div class="preset-actions-compact">
              <button class="create-custom-btn compact">
                <span>➕ Custom</span>
              </button>
            </div>
          ` : ''}
        </div>
      ` : ''}
    `;

    this.attachEventListeners();
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Quick access buttons
    this.container.querySelectorAll('.preset-quick-btn').forEach(btn => {
      memoryManager.addEventListener(btn as HTMLElement, 'click', (e) => {
        e.stopPropagation();
        this.selectPreset((e.currentTarget as HTMLElement).dataset.preset!);
      });
    });

    // Compact preset buttons in expanded view
    this.container.querySelectorAll('.preset-compact-btn').forEach(btn => {
      memoryManager.addEventListener(btn as HTMLElement, 'click', (e) => {
        e.stopPropagation();
        this.selectPreset((e.currentTarget as HTMLElement).dataset.preset!);
      });
    });

    // Expand/collapse button
    const expandBtn = this.container.querySelector('.preset-expand-btn');
    if (expandBtn) {
      memoryManager.addEventListener(expandBtn as HTMLElement, 'click', (e) => {
        e.stopPropagation();
        this.toggleExpanded();
      });
    }

    // Create custom button
    const createBtn = this.container.querySelector('.create-custom-btn');
    if (createBtn) {
      memoryManager.addEventListener(createBtn as HTMLElement, 'click', (e) => {
        e.stopPropagation();
        this.showCreateDialog();
      });
    }
  }

  /**
   * Select a preset template
   */
  private selectPreset(presetId: string): void {
    const allPresets = [...PresetTemplates.DEFAULT_PRESETS, ...this.customPresets];
    const preset = allPresets.find(p => p.id === presetId);
    
    if (preset && this.onSelectCallback) {
      console.log('%c📋 PRESET SELECTED', 'color: #9146FF; font-weight: bold', preset.name);
      console.log('%c  Prompt:', 'color: #657786', preset.prompt);
      
      this.selectedPreset = preset;
      this.onSelectCallback(preset);
      
      // Visual feedback
      this.container?.querySelectorAll('.preset-quick-btn, .preset-tile').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-preset') === presetId);
      });
    }
  }

  /**
   * Toggle expanded view
   */
  private toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
    this.render();
  }

  /**
   * Show create custom template dialog
   */
  private showCreateDialog(): void {
    const dialog = document.createElement('div');
    dialog.className = 'tweetcraft-preset-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h3>Create Custom Template</h3>
        <input type="text" id="preset-name" placeholder="Template Name" maxlength="30">
        <input type="text" id="preset-emoji" placeholder="Emoji (optional)" maxlength="2">
        <select id="preset-category">
          <option value="engagement">Engagement</option>
          <option value="value">Add Value</option>
          <option value="conversation">Conversation</option>
          <option value="humor">Humor</option>
        </select>
        <textarea id="preset-prompt" placeholder="Enter the prompt for this template..." rows="4"></textarea>
        <input type="text" id="preset-description" placeholder="Short description" maxlength="50">
        
        <div class="dialog-actions">
          <button class="cancel-btn">Cancel</button>
          <button class="save-btn primary">Save Template</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Handle save
    const saveBtn = dialog.querySelector('.save-btn');
    if (saveBtn) {
      memoryManager.addEventListener(saveBtn as HTMLElement, 'click', () => {
        const name = (dialog.querySelector('#preset-name') as HTMLInputElement).value;
        const emoji = (dialog.querySelector('#preset-emoji') as HTMLInputElement).value || '📝';
        const category = (dialog.querySelector('#preset-category') as HTMLSelectElement).value as any;
        const prompt = (dialog.querySelector('#preset-prompt') as HTMLTextAreaElement).value;
        const description = (dialog.querySelector('#preset-description') as HTMLInputElement).value;
        
        if (name && prompt && description) {
          this.createCustomPreset({
            id: `custom_${Date.now()}`,
            name,
            emoji,
            category,
            prompt,
            description
          });
          dialog.remove();
        } else {
          alert('Please fill in all required fields');
        }
      });
    }
    
    // Handle cancel
    const cancelBtn = dialog.querySelector('.cancel-btn');
    if (cancelBtn) {
      memoryManager.addEventListener(cancelBtn as HTMLElement, 'click', () => {
        dialog.remove();
      });
    }
    
    // Close on escape
    memoryManager.addEventListener(dialog, 'keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') {
        dialog.remove();
      }
    });
  }

  /**
   * Show manage templates dialog
   */
  private showManageDialog(): void {
    // Implementation for managing custom templates
    console.log('Manage templates dialog - to be implemented');
  }

  /**
   * Create a custom preset
   */
  private createCustomPreset(preset: PresetTemplate): void {
    this.customPresets.push(preset);
    this.saveCustomPresets();
    this.render();
    console.log('%c✅ Custom preset created', 'color: #28A745', preset.name);
  }

  /**
   * Get category title
   */
  private getCategoryTitle(category: string): string {
    const titles: Record<string, string> = {
      engagement: '💬 Engagement',
      value: '💎 Add Value',
      conversation: '🗣️ Conversation',
      humor: '😄 Humor'
    };
    return titles[category] || category;
  }

  /**
   * Load custom presets from storage
   */
  private async loadCustomPresets(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['customPresets']);
      if (result.customPresets) {
        this.customPresets = result.customPresets;
      }
    } catch (error) {
      console.error('Failed to load custom presets:', error);
    }
  }

  /**
   * Save custom presets to storage
   */
  private async saveCustomPresets(): Promise<void> {
    try {
      await chrome.storage.local.set({ customPresets: this.customPresets });
    } catch (error) {
      console.error('Failed to save custom presets:', error);
    }
  }

  /**
   * Apply styles
   */
  private applyStyles(): void {
    if (!document.querySelector('#tweetcraft-preset-styles')) {
      const style = document.createElement('style');
      style.id = 'tweetcraft-preset-styles';
      style.textContent = `
        .tweetcraft-preset-templates {
          background: transparent;
          border-radius: 8px;
          padding: 8px 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          width: 100%;
          box-sizing: border-box;
        }
        
        .preset-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          padding: 0 4px;
        }
        
        .preset-title {
          font-size: 12px;
          font-weight: 600;
          color: #e7e9ea;
          opacity: 0.8;
        }
        
        .preset-expand-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px 6px;
          color: #8b98a5;
          font-size: 10px;
          transition: color 0.2s;
        }
        
        .preset-expand-btn:hover {
          color: #e7e9ea;
        }
        
        .preset-quick-access {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          margin-bottom: 6px;
        }
        
        .preset-quick-btn {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 5px 6px;
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          cursor: pointer;
          font-size: 11px;
          color: #e7e9ea;
          transition: all 0.2s;
          overflow: hidden;
        }
        
        .preset-quick-btn:hover {
          background: rgba(29, 155, 240, 0.15);
          border-color: rgba(29, 155, 240, 0.5);
        }
        
        .preset-quick-btn.active {
          background: rgba(29, 155, 240, 0.25);
          border-color: rgb(29, 155, 240);
        }
        
        .preset-emoji {
          font-size: 14px;
          flex-shrink: 0;
        }
        
        .preset-label {
          font-size: 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          opacity: 0.9;
        }
        
        .preset-expanded {
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid rgba(139, 152, 165, 0.2);
        }
        
        .preset-expanded.show {
          animation: slideDown 0.2s ease;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .preset-compact-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          margin-bottom: 8px;
        }
        
        .preset-compact-btn {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 5px 6px;
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          cursor: pointer;
          font-size: 11px;
          color: #e7e9ea;
          transition: all 0.2s;
          overflow: hidden;
        }
        
        .preset-compact-btn .preset-emoji {
          font-size: 14px;
          flex-shrink: 0;
        }
        
        .preset-compact-btn .preset-label {
          font-size: 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          opacity: 0.9;
        }
        
        .preset-compact-btn:hover {
          background: rgba(29, 155, 240, 0.15);
          border-color: rgba(29, 155, 240, 0.5);
        }
        
        .preset-compact-btn.active {
          background: rgba(29, 155, 240, 0.25);
          border-color: rgb(29, 155, 240);
        }
        
        .preset-actions-compact {
          display: flex;
          gap: 4px;
        }
        
        .create-custom-btn.compact {
          padding: 4px 8px;
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          cursor: pointer;
          font-size: 11px;
          color: #e7e9ea;
          transition: all 0.2s;
          white-space: nowrap;
        }
        
        .create-custom-btn.compact:hover {
          background: rgba(29, 155, 240, 0.15);
          border-color: rgba(29, 155, 240, 0.5);
        }
        
        /* Dialog styles */
        .tweetcraft-preset-dialog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10002;
        }
        
        .dialog-content {
          background: #15202b;
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 12px;
          padding: 20px;
          max-width: 400px;
          width: 90%;
          color: #e7e9ea;
        }
        
        .dialog-content h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: #e7e9ea;
        }
        
        .dialog-content input,
        .dialog-content select,
        .dialog-content textarea {
          width: 100%;
          padding: 8px;
          margin-bottom: 12px;
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          color: #e7e9ea;
          font-family: inherit;
          font-size: 13px;
        }
        
        .dialog-content input:focus,
        .dialog-content select:focus,
        .dialog-content textarea:focus {
          outline: none;
          border-color: rgb(29, 155, 240);
          background: rgba(255, 255, 255, 0.05);
        }
        
        .dialog-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 16px;
        }
        
        .dialog-actions button {
          padding: 8px 16px;
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          color: #e7e9ea;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        
        .dialog-actions button:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        
        .dialog-actions button.primary {
          background: rgb(29, 155, 240);
          color: white;
          border-color: rgb(29, 155, 240);
        }
        
        .dialog-actions button.primary:hover {
          background: rgb(26, 140, 216);
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Get all presets
   */
  getAllPresets(): PresetTemplate[] {
    return [...PresetTemplates.DEFAULT_PRESETS, ...this.customPresets];
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    this.container?.remove();
    this.container = null;
    this.onSelectCallback = null;
  }
}

export const presetTemplates = new PresetTemplates();
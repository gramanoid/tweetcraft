/**
 * Unified Template & Tone Selector
 * Matrix-based selection UI for combining templates and tones
 */

import { Template, Tone } from '@/config/templatesAndTones';
import { configManager } from '@/config/configurationManager';
import { memoryManager } from '@/utils/memoryManager';

export interface SelectionResult {
  template: Template;
  tone: Tone;
  combinedPrompt: string;
  temperature: number;
}

export class UnifiedSelector {
  private container: HTMLElement | null = null;
  private selectedTemplate: Template | null = null;
  private selectedTone: Tone | null = null;
  private onSelectCallback: ((result: SelectionResult) => void) | null = null;
  private favoriteTemplates: Set<string> = new Set();
  private favoriteTones: Set<string> = new Set();
  private view: 'grid' | 'favorites' | 'custom' = 'grid';

  constructor() {
    this.loadFavorites();
  }

  /**
   * Create the unified selector UI
   */
  create(onSelect: (result: SelectionResult) => void): HTMLElement {
    this.onSelectCallback = onSelect;
    
    this.container = document.createElement('div');
    this.container.className = 'tweetcraft-unified-selector';
    this.render();
    this.applyStyles();
    
    return this.container;
  }

  /**
   * Render the selector UI
   */
  private render(): void {
    if (!this.container) return;

    const templates = configManager.getAllTemplates();
    const tones = configManager.getAllTones();
    
    this.container.innerHTML = `
      <div class="selector-header">
        <div class="selector-tabs">
          <button class="tab-btn ${this.view === 'grid' ? 'active' : ''}" data-view="grid">
            <span>📝 All</span>
          </button>
          <button class="tab-btn ${this.view === 'favorites' ? 'active' : ''}" data-view="favorites">
            <span>⭐ Favorites</span>
          </button>
          <button class="tab-btn ${this.view === 'custom' ? 'active' : ''}" data-view="custom">
            <span>✨ Custom</span>
          </button>
        </div>
        <button class="close-btn" aria-label="Close">×</button>
      </div>
      
      ${this.renderViewContent(templates, tones)}
      
      <div class="selector-footer">
        <div class="selection-info">
          ${this.selectedTemplate ? `<span class="selected-template">${this.selectedTemplate.emoji} ${this.selectedTemplate.name}</span>` : ''}
          ${this.selectedTone ? `<span class="selected-tone">${this.selectedTone.emoji} ${this.selectedTone.label}</span>` : ''}
        </div>
        <button class="generate-btn ${this.selectedTemplate && this.selectedTone ? 'active' : ''}" 
                ${!this.selectedTemplate || !this.selectedTone ? 'disabled' : ''}>
          Generate Reply
        </button>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render content based on current view
   */
  private renderViewContent(templates: Template[], tones: Tone[]): string {
    switch (this.view) {
      case 'favorites':
        return this.renderFavoritesView(templates, tones);
      case 'custom':
        return this.renderCustomView(templates, tones);
      default:
        return this.renderGridView(templates, tones);
    }
  }

  /**
   * Render grid view (all templates and tones)
   */
  private renderGridView(templates: Template[], tones: Tone[]): string {
    const categories = ['engagement', 'value', 'conversation', 'humor', 'debate', 'viral'];
    
    return `
      <div class="selector-content grid-view">
        <div class="templates-section">
          <h3>Choose Template</h3>
          ${categories.map(category => {
            const categoryTemplates = templates.filter(t => t.category === category);
            if (categoryTemplates.length === 0) return '';
            
            return `
              <div class="template-category">
                <h4>${this.getCategoryTitle(category)}</h4>
                <div class="template-grid">
                  ${categoryTemplates.map(template => `
                    <button class="template-btn ${this.selectedTemplate?.id === template.id ? 'selected' : ''}"
                            data-template="${template.id}"
                            title="${template.description}">
                      <span class="template-emoji">${template.emoji}</span>
                      <span class="template-name">${template.name}</span>
                      ${this.favoriteTemplates.has(template.id) ? '<span class="favorite-star">⭐</span>' : ''}
                    </button>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div class="tones-section">
          <h3>Choose Tone</h3>
          <div class="tone-grid">
            ${tones.map(tone => `
              <button class="tone-btn ${this.selectedTone?.id === tone.id ? 'selected' : ''}"
                      data-tone="${tone.id}"
                      title="${tone.description}">
                <span class="tone-emoji">${tone.emoji}</span>
                <span class="tone-label">${tone.label}</span>
                ${this.favoriteTones.has(tone.id) ? '<span class="favorite-star">⭐</span>' : ''}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render favorites view
   */
  private renderFavoritesView(templates: Template[], tones: Tone[]): string {
    const favoriteTemplatesList = templates.filter(t => this.favoriteTemplates.has(t.id));
    const favoriteTonesList = tones.filter(t => this.favoriteTones.has(t.id));
    
    if (favoriteTemplatesList.length === 0 && favoriteTonesList.length === 0) {
      return `
        <div class="selector-content favorites-view">
          <div class="empty-state">
            <p>No favorites yet!</p>
            <p>Star your favorite templates and tones to see them here.</p>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="selector-content favorites-view">
        ${favoriteTemplatesList.length > 0 ? `
          <div class="templates-section">
            <h3>Favorite Templates</h3>
            <div class="template-grid">
              ${favoriteTemplatesList.map(template => `
                <button class="template-btn ${this.selectedTemplate?.id === template.id ? 'selected' : ''}"
                        data-template="${template.id}"
                        title="${template.description}">
                  <span class="template-emoji">${template.emoji}</span>
                  <span class="template-name">${template.name}</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${favoriteTonesList.length > 0 ? `
          <div class="tones-section">
            <h3>Favorite Tones</h3>
            <div class="tone-grid">
              ${favoriteTonesList.map(tone => `
                <button class="tone-btn ${this.selectedTone?.id === tone.id ? 'selected' : ''}"
                        data-tone="${tone.id}"
                        title="${tone.description}">
                  <span class="tone-emoji">${tone.emoji}</span>
                  <span class="tone-label">${tone.label}</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render custom view
   */
  private renderCustomView(templates: Template[], tones: Tone[]): string {
    const customTemplates = templates.filter(t => t.id.startsWith('custom_'));
    const customTones = tones.filter(t => t.id.startsWith('custom_'));
    
    if (customTemplates.length === 0 && customTones.length === 0) {
      return `
        <div class="selector-content custom-view">
          <div class="empty-state">
            <p>No custom templates or tones yet!</p>
            <button class="create-custom-btn">Create Custom Template</button>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="selector-content custom-view">
        ${customTemplates.length > 0 ? `
          <div class="templates-section">
            <h3>Custom Templates</h3>
            <div class="template-grid">
              ${customTemplates.map(template => `
                <button class="template-btn ${this.selectedTemplate?.id === template.id ? 'selected' : ''}"
                        data-template="${template.id}"
                        title="${template.description}">
                  <span class="template-emoji">${template.emoji}</span>
                  <span class="template-name">${template.name}</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${customTones.length > 0 ? `
          <div class="tones-section">
            <h3>Custom Tones</h3>
            <div class="tone-grid">
              ${customTones.map(tone => `
                <button class="tone-btn ${this.selectedTone?.id === tone.id ? 'selected' : ''}"
                        data-tone="${tone.id}"
                        title="${tone.description}">
                  <span class="tone-emoji">${tone.emoji}</span>
                  <span class="tone-label">${tone.label}</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <button class="create-custom-btn">Create New</button>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Tab switching
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      memoryManager.addEventListener(btn as HTMLElement, 'click', (e) => {
        const view = (e.currentTarget as HTMLElement).dataset.view as 'grid' | 'favorites' | 'custom';
        this.view = view;
        this.render();
      });
    });

    // Template selection
    this.container.querySelectorAll('.template-btn').forEach(btn => {
      memoryManager.addEventListener(btn as HTMLElement, 'click', (e) => {
        e.stopPropagation();
        const templateId = (e.currentTarget as HTMLElement).dataset.template!;
        this.selectTemplate(templateId);
      });

      // Double-click to favorite
      memoryManager.addEventListener(btn as HTMLElement, 'dblclick', async (e) => {
        e.stopPropagation();
        const templateId = (e.currentTarget as HTMLElement).dataset.template!;
        await this.toggleFavoriteTemplate(templateId);
      });
    });

    // Tone selection
    this.container.querySelectorAll('.tone-btn').forEach(btn => {
      memoryManager.addEventListener(btn as HTMLElement, 'click', (e) => {
        e.stopPropagation();
        const toneId = (e.currentTarget as HTMLElement).dataset.tone!;
        this.selectTone(toneId);
      });

      // Double-click to favorite
      memoryManager.addEventListener(btn as HTMLElement, 'dblclick', async (e) => {
        e.stopPropagation();
        const toneId = (e.currentTarget as HTMLElement).dataset.tone!;
        await this.toggleFavoriteTone(toneId);
      });
    });

    // Generate button
    const generateBtn = this.container.querySelector('.generate-btn');
    if (generateBtn) {
      memoryManager.addEventListener(generateBtn as HTMLElement, 'click', () => {
        this.handleGenerate();
      });
    }

    // Close button
    const closeBtn = this.container.querySelector('.close-btn');
    if (closeBtn) {
      memoryManager.addEventListener(closeBtn as HTMLElement, 'click', () => {
        this.destroy();
      });
    }

    // Create custom button
    const createBtn = this.container.querySelector('.create-custom-btn');
    if (createBtn) {
      memoryManager.addEventListener(createBtn as HTMLElement, 'click', () => {
        this.showCreateDialog();
      });
    }
  }

  /**
   * Select a template
   */
  private selectTemplate(templateId: string): void {
    const template = configManager.getTemplate(templateId);
    if (template) {
      this.selectedTemplate = template;
      console.log('%c📋 Template selected:', 'color: #1DA1F2', template.name);
      this.updateUI();
      this.checkReadyToGenerate();
    }
  }

  /**
   * Select a tone
   */
  private selectTone(toneId: string): void {
    const tone = configManager.getTone(toneId);
    if (tone) {
      this.selectedTone = tone;
      console.log('%c🎭 Tone selected:', 'color: #9146FF', tone.label);
      this.updateUI();
      this.checkReadyToGenerate();
    }
  }

  /**
   * Update UI after selection
   */
  private updateUI(): void {
    if (!this.container) return;

    // Update template buttons
    this.container.querySelectorAll('.template-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-template') === this.selectedTemplate?.id);
    });

    // Update tone buttons
    this.container.querySelectorAll('.tone-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-tone') === this.selectedTone?.id);
    });

    // Update selection info
    const selectionInfo = this.container.querySelector('.selection-info');
    if (selectionInfo) {
      selectionInfo.innerHTML = `
        ${this.selectedTemplate ? `<span class="selected-template">${this.selectedTemplate.emoji} ${this.selectedTemplate.name}</span>` : ''}
        ${this.selectedTone ? `<span class="selected-tone">${this.selectedTone.emoji} ${this.selectedTone.label}</span>` : ''}
      `;
    }

    // Update generate button
    const generateBtn = this.container.querySelector('.generate-btn');
    if (generateBtn) {
      const ready = this.selectedTemplate && this.selectedTone;
      generateBtn.classList.toggle('active', !!ready);
      if (ready) {
        generateBtn.removeAttribute('disabled');
      } else {
        generateBtn.setAttribute('disabled', '');
      }
    }
  }

  /**
   * Check if ready to generate
   */
  private checkReadyToGenerate(): void {
    if (this.selectedTemplate && this.selectedTone) {
      console.log('%c✅ Ready to generate!', 'color: #17BF63');
      console.log('%c  Template:', 'color: #657786', this.selectedTemplate.name);
      console.log('%c  Tone:', 'color: #657786', this.selectedTone.label);
    }
  }

  /**
   * Handle generate action
   */
  private handleGenerate(): void {
    if (!this.selectedTemplate || !this.selectedTone || !this.onSelectCallback) return;

    const combinedPrompt = configManager.getCombinedPrompt(
      this.selectedTemplate.id,
      this.selectedTone.id
    );

    const temperature = configManager.getTemperatureForTone(this.selectedTone.id);

    const result: SelectionResult = {
      template: this.selectedTemplate,
      tone: this.selectedTone,
      combinedPrompt,
      temperature
    };

    console.log('%c🚀 Generating with selection:', 'color: #1DA1F2; font-weight: bold');
    console.log('%c  Combined prompt length:', 'color: #657786', combinedPrompt.length);
    console.log('%c  Temperature:', 'color: #657786', temperature);

    this.onSelectCallback(result);
  }

  /**
   * Toggle favorite template
   */
  private async toggleFavoriteTemplate(templateId: string): Promise<void> {
    if (this.favoriteTemplates.has(templateId)) {
      this.favoriteTemplates.delete(templateId);
      await configManager.removeFavoriteTemplate(templateId);
      console.log('%c⭐ Removed from favorites:', 'color: #FFA500', templateId);
    } else {
      this.favoriteTemplates.add(templateId);
      await configManager.addFavoriteTemplate(templateId);
      console.log('%c⭐ Added to favorites:', 'color: #FFA500', templateId);
    }
    this.render();
  }

  /**
   * Toggle favorite tone
   */
  private async toggleFavoriteTone(toneId: string): Promise<void> {
    if (this.favoriteTones.has(toneId)) {
      this.favoriteTones.delete(toneId);
      await configManager.removeFavoriteTone(toneId);
      console.log('%c⭐ Removed from favorites:', 'color: #FFA500', toneId);
    } else {
      this.favoriteTones.add(toneId);
      await configManager.addFavoriteTone(toneId);
      console.log('%c⭐ Added to favorites:', 'color: #FFA500', toneId);
    }
    this.render();
  }

  /**
   * Load favorites from storage
   */
  private async loadFavorites(): Promise<void> {
    try {
      const prefs = await configManager.getUserPreferences();
      this.favoriteTemplates = new Set(prefs.favoriteTemplates);
      this.favoriteTones = new Set(prefs.favoriteTones);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }

  /**
   * Show create custom template/tone dialog
   */
  private showCreateDialog(): void {
    // Placeholder for custom creation dialog
    console.log('Create custom dialog - to be implemented');
  }

  /**
   * Get category title
   */
  private getCategoryTitle(category: string): string {
    const titles: Record<string, string> = {
      engagement: '💬 Engagement',
      value: '💎 Add Value',
      conversation: '🗣️ Conversation',
      humor: '😄 Humor',
      debate: '⚔️ Debate',
      viral: '🔥 Viral'
    };
    return titles[category] || category;
  }

  /**
   * Apply styles
   */
  private applyStyles(): void {
    if (!document.querySelector('#tweetcraft-unified-styles')) {
      const style = document.createElement('style');
      style.id = 'tweetcraft-unified-styles';
      style.textContent = `
        .tweetcraft-unified-selector {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #15202b;
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 16px;
          width: 90%;
          max-width: 800px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          z-index: 10001;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }
        
        .selector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(139, 152, 165, 0.2);
        }
        
        .selector-tabs {
          display: flex;
          gap: 8px;
        }
        
        .tab-btn {
          padding: 6px 12px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 20px;
          color: #8b98a5;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        
        .tab-btn.active {
          background: rgba(29, 155, 240, 0.2);
          border-color: rgba(29, 155, 240, 0.5);
          color: #1d9bf0;
        }
        
        .close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: transparent;
          border: none;
          color: #8b98a5;
          font-size: 24px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #e7e9ea;
        }
        
        .selector-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        
        .grid-view {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .templates-section h3,
        .tones-section h3 {
          margin: 0 0 12px 0;
          color: #e7e9ea;
          font-size: 14px;
          font-weight: 600;
        }
        
        .template-category {
          margin-bottom: 16px;
        }
        
        .template-category h4 {
          margin: 0 0 8px 0;
          color: #8b98a5;
          font-size: 12px;
          font-weight: 500;
        }
        
        .template-grid,
        .tone-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 8px;
        }
        
        .template-btn,
        .tone-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 8px;
          color: #e7e9ea;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        
        .template-btn:hover,
        .tone-btn:hover {
          background: rgba(29, 155, 240, 0.15);
          border-color: rgba(29, 155, 240, 0.5);
          transform: translateY(-1px);
        }
        
        .template-btn.selected,
        .tone-btn.selected {
          background: rgba(29, 155, 240, 0.25);
          border-color: #1d9bf0;
        }
        
        .template-emoji,
        .tone-emoji {
          font-size: 16px;
        }
        
        .template-name,
        .tone-label {
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .favorite-star {
          position: absolute;
          top: 2px;
          right: 2px;
          font-size: 10px;
        }
        
        .selector-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-top: 1px solid rgba(139, 152, 165, 0.2);
        }
        
        .selection-info {
          display: flex;
          gap: 8px;
        }
        
        .selected-template,
        .selected-tone {
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          font-size: 12px;
          color: #e7e9ea;
        }
        
        .generate-btn {
          padding: 8px 20px;
          background: rgba(29, 155, 240, 0.3);
          border: 1px solid rgba(29, 155, 240, 0.5);
          border-radius: 20px;
          color: #8b98a5;
          cursor: not-allowed;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }
        
        .generate-btn.active {
          background: #1d9bf0;
          border-color: #1d9bf0;
          color: white;
          cursor: pointer;
        }
        
        .generate-btn.active:hover {
          background: #1a8cd8;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #8b98a5;
        }
        
        .create-custom-btn {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 8px;
          color: #e7e9ea;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .create-custom-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `;
      document.head.appendChild(style);
    }
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

export const unifiedSelector = new UnifiedSelector();
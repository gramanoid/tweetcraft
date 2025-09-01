/**
 * Unified Template & Tone Selector
 * Matrix-based selection UI for combining templates and tones
 */

import { Template, Tone, TEMPLATES, TONES } from '@/config/templatesAndTones';
import { visualFeedback } from '@/ui/visualFeedback';

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
  private clickOutsideHandler: ((e: MouseEvent) => void) | null = null;

  constructor() {
    this.loadFavorites();
  }

  /**
   * Show the unified selector
   */
  show(button: HTMLElement, onSelect: (result: SelectionResult) => void): void {
    this.onSelectCallback = onSelect;
    
    // Remove any existing selector
    this.hide();
    
    // Create and show new selector
    this.container = this.createUI();
    document.body.appendChild(this.container);
    
    // Position near button
    this.positionNearButton(button);
    
    // Show with animation
    requestAnimationFrame(() => {
      if (this.container) {
        this.container.style.display = 'flex';
        this.container.style.opacity = '0';
        
        requestAnimationFrame(() => {
          if (this.container) {
            this.container.style.transition = 'opacity 0.2s';
            this.container.style.opacity = '1';
          }
        });
      }
    });
    
    // Add click outside handler
    this.setupClickOutsideHandler();
  }
  
  /**
   * Hide the selector
   */
  hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    
    // Remove click outside handler
    if (this.clickOutsideHandler) {
      document.removeEventListener('click', this.clickOutsideHandler);
      this.clickOutsideHandler = null;
    }
  }
  
  /**
   * Position selector near button
   */
  private positionNearButton(button: HTMLElement): void {
    if (!this.container) return;
    
    const buttonRect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Calculate whether to show above or below
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const selectorHeight = 580; // max-height from CSS (updated to match new design)
    const showAbove = spaceBelow < selectorHeight && spaceAbove > spaceBelow;
    
    // Use fixed positioning to stick to viewport
    this.container.style.position = 'fixed';
    
    // Position vertically relative to button
    if (showAbove) {
      this.container.style.bottom = `${viewportHeight - buttonRect.top + 8}px`;
      this.container.style.top = 'auto';
    } else {
      this.container.style.top = `${buttonRect.bottom + 8}px`;
      this.container.style.bottom = 'auto';
    }
    
    // Center horizontally but keep within viewport
    const selectorWidth = 540; // width from CSS (updated to match new design)
    let leftPos = buttonRect.left + (buttonRect.width / 2) - (selectorWidth / 2);
    
    // Ensure it stays within viewport bounds
    if (leftPos < 10) {
      leftPos = 10;
    } else if (leftPos + selectorWidth > viewportWidth - 10) {
      leftPos = viewportWidth - selectorWidth - 10;
    }
    
    this.container.style.left = `${leftPos}px`;
    this.container.style.right = 'auto';
    
    // Remove the transform since we're positioning directly
    this.container.style.transform = 'none';
  }
  
  /**
   * Setup click outside handler
   */
  private setupClickOutsideHandler(): void {
    this.clickOutsideHandler = (e: MouseEvent) => {
      if (this.container && !this.container.contains(e.target as Node)) {
        this.hide();
      }
    };
    
    // Delay to avoid immediate trigger
    setTimeout(() => {
      if (this.clickOutsideHandler) {
        document.addEventListener('click', this.clickOutsideHandler);
      }
    }, 100);
  }

  /**
   * Create the unified selector UI
   */
  private createUI(): HTMLElement {
    this.onSelectCallback = this.onSelectCallback;
    
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

    const templates = TEMPLATES;
    const tones = TONES;
    
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
    return `
      <div class="selector-content grid-view">
        <div class="templates-section">
          <h3>Templates</h3>
          <div class="template-grid">
            ${templates.map(template => `
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
        
        <div class="tones-section">
          <h3>Tones</h3>
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
      (btn as HTMLElement).addEventListener('click', (e) => {
        const view = (e.currentTarget as HTMLElement).dataset.view as 'grid' | 'favorites' | 'custom';
        this.view = view;
        this.render();
      });
    });

    // Template selection
    this.container.querySelectorAll('.template-btn').forEach(btn => {
      (btn as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        const templateId = (e.currentTarget as HTMLElement).dataset.template!;
        this.selectTemplate(templateId);
      });

      // Double-click to favorite
      (btn as HTMLElement).addEventListener('dblclick', async (e) => {
        e.stopPropagation();
        const templateId = (e.currentTarget as HTMLElement).dataset.template!;
        await this.toggleFavoriteTemplate(templateId);
      });
    });

    // Tone selection
    this.container.querySelectorAll('.tone-btn').forEach(btn => {
      (btn as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        const toneId = (e.currentTarget as HTMLElement).dataset.tone!;
        this.selectTone(toneId);
      });

      // Double-click to favorite
      (btn as HTMLElement).addEventListener('dblclick', async (e) => {
        e.stopPropagation();
        const toneId = (e.currentTarget as HTMLElement).dataset.tone!;
        await this.toggleFavoriteTone(toneId);
      });
    });

    // Generate button
    const generateBtn = this.container.querySelector('.generate-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        this.handleGenerate();
      });
    }

    // Close button
    const closeBtn = this.container.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }

    // Create custom button
    const createBtn = this.container.querySelector('.create-custom-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        // Show create dialog (not implemented yet)
        visualFeedback.showToast('Custom template creation coming soon!', { type: 'info' });
      });
    }
  }

  /**
   * Select a template
   */
  private selectTemplate(templateId: string): void {
    const template = TEMPLATES.find(t => t.id === templateId) || null;
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
    const tone = TONES.find(t => t.id === toneId) || null;
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

    // Combine template and tone prompts
    const combinedPrompt = `${this.selectedTemplate.prompt} ${this.selectedTone.systemPrompt}`;

    // Get temperature for tone (default 0.7)
    const temperature = 0.7;

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
      // Remove from favorites
      this.favoriteTemplates.delete(templateId);
      this.saveFavorites();
      console.log('%c⭐ Removed from favorites:', 'color: #FFA500', templateId);
    } else {
      this.favoriteTemplates.add(templateId);
      // Add to favorites
      this.favoriteTemplates.add(templateId);
      this.saveFavorites();
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
      // Remove from favorites
      this.favoriteTones.delete(toneId);
      this.saveFavorites();
      console.log('%c⭐ Removed from favorites:', 'color: #FFA500', toneId);
    } else {
      this.favoriteTones.add(toneId);
      // Add to favorites
      this.favoriteTones.add(toneId);
      this.saveFavorites();
      console.log('%c⭐ Added to favorites:', 'color: #FFA500', toneId);
    }
    this.render();
  }

  /**
   * Save favorites to storage
   */
  private saveFavorites(): void {
    const favorites = {
      favoriteTemplates: Array.from(this.favoriteTemplates),
      favoriteTones: Array.from(this.favoriteTones)
    };
    localStorage.setItem('tweetcraft_favorites', JSON.stringify(favorites));
  }

  /**
   * Load favorites from storage
   */
  private async loadFavorites(): Promise<void> {
    try {
      // Load favorites from localStorage
      const stored = localStorage.getItem('tweetcraft_favorites');
      const prefs = stored ? JSON.parse(stored) : null;
      if (prefs) {
        this.favoriteTemplates = new Set(prefs.favoriteTemplates || []);
        this.favoriteTones = new Set(prefs.favoriteTones || []);
      }
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
   * Get category title (deprecated - kept for compatibility)
   */
  private getCategoryTitle(category: string): string {
    // No longer used since we removed categories
    return category;
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
          background: #15202b;
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 12px;
          width: 540px;
          max-width: 92vw;
          min-width: 480px;
          max-height: 580px;
          min-height: 400px;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          z-index: 10001;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
          overflow: hidden;
        }
        
        /* Responsive design for smaller screens */
        @media (max-width: 600px) {
          .tweetcraft-unified-selector {
            width: 95vw;
            min-width: 320px;
            max-height: 85vh;
          }
          
          .grid-view {
            grid-template-columns: 1fr !important;
            gap: 6px;
          }
          
          .selector-header {
            padding: 6px 8px;
          }
          
          .selector-content {
            padding: 6px;
          }
          
          .selector-footer {
            padding: 6px 8px;
          }
        }
        
        .selector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(139, 152, 165, 0.2);
          background: #15202b;
        }
        
        .selector-tabs {
          display: flex;
          gap: 8px;
        }
        
        .tab-btn {
          padding: 6px 12px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 14px;
          color: #8b98a5;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
          font-weight: 500;
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
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: transparent;
          border: none;
          color: #8b98a5;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #e7e9ea;
        }
        
        .selector-content {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          background: #15202b;
        }
        
        .grid-view {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .templates-section,
        .tones-section {
          flex: 1;
        }
        
        .templates-section h3,
        .tones-section h3 {
          margin: 0 0 10px 0;
          color: #e7e9ea;
          font-size: 15px;
          font-weight: 600;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(139, 152, 165, 0.2);
        }
        
        /* Removed template-category styles since we no longer use categories */
        
        .template-grid,
        .tone-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
        }
        
        .template-btn,
        .tone-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 5px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 8px;
          color: #e7e9ea;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          font-size: 12px;
          min-height: 32px;
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
          flex: 1;
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
          padding: 10px 14px;
          border-top: 1px solid rgba(139, 152, 165, 0.2);
          background: #15202b;
          margin-top: auto;
          gap: 8px;
        }
        
        .selection-info {
          display: flex;
          gap: 6px;
        }
        
        .selected-template,
        .selected-tone {
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          font-size: 12px;
          color: #e7e9ea;
        }
        
        .generate-btn {
          padding: 8px 18px;
          background: rgba(29, 155, 240, 0.3);
          border: 1px solid rgba(29, 155, 240, 0.5);
          border-radius: 18px;
          color: #8b98a5;
          cursor: not-allowed;
          font-size: 13px;
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
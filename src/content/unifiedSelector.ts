/**
 * Unified Template & Tone Selector
 * Matrix-based selection UI for combining templates and tones
 */

import { Template, Personality, TEMPLATES, PERSONALITIES } from '@/config/templatesAndTones';
// Type alias for backward compatibility
type Tone = Personality;
import { visualFeedback } from '@/ui/visualFeedback';
import { templateSuggester } from '@/services/templateSuggester';
import { DOMUtils } from '@/content/domUtils';
import { imageService } from '@/services/imageService';

export interface SelectionResult {
  template: Template;
  tone: Tone;
  combinedPrompt: string;
  temperature: number;
}

export class UnifiedSelector {
  private container: HTMLElement | null = null;
  private selectedTemplate: Template | null = null;
  private selectedPersonality: Personality | null = null;
  // Backward compatibility alias
  private get selectedTone(): Personality | null { return this.selectedPersonality; }
  private set selectedTone(value: Personality | null) { this.selectedPersonality = value; }
  private onSelectCallback: ((result: SelectionResult) => void) | null = null;
  private favoriteRhetoric: Set<string> = new Set();
  // Backward compatibility alias
  private get favoriteTemplates(): Set<string> { return this.favoriteRhetoric; }
  private favoritePersonalities: Set<string> = new Set();
  // Backward compatibility alias
  private get favoriteTones(): Set<string> { return this.favoritePersonalities; }
  private view: 'grid' | 'smart' | 'favorites' | 'imagegen' | 'custom' = 'grid';
  private clickOutsideHandler: ((e: MouseEvent) => void) | null = null;
  private scrollHandler: (() => void) | null = null;
  private anchorButton: HTMLElement | null = null;
  private smartSuggestions: { templates: Template[], personalities: Personality[] } = { templates: [], personalities: [] };
  private smartSuggestionsScores: any[] = [];
  private customTemplatesLoaded: Promise<void> | null = null;

  constructor() {
    this.loadFavorites();
    // Defer async loading
    this.customTemplatesLoaded = this.loadCustomTemplates();
  }

  /**
   * Show the unified selector
   */
  async show(button: HTMLElement, onSelect: (result: SelectionResult) => void): Promise<void> {
    // Ensure custom templates are loaded
    if (this.customTemplatesLoaded) {
      await this.customTemplatesLoaded;
    }
    
    this.onSelectCallback = onSelect;
    
    // Remove any existing selector
    this.hide();
    
    // Store button reference for repositioning
    this.anchorButton = button;
    
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
    
    // Add scroll handler to keep popup positioned relative to button
    this.setupScrollHandler();
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
    
    // Remove scroll handler
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler, true);
      this.scrollHandler = null;
    }
    
    this.anchorButton = null;
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
    const selectorHeight = 600; // max-height from CSS (updated to match new design)
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
   * Setup scroll handler to keep popup positioned
   */
  private setupScrollHandler(): void {
    this.scrollHandler = () => {
      if (this.anchorButton && this.container) {
        this.positionNearButton(this.anchorButton);
      }
    };
    
    // Listen to scroll on window and any scrollable parent
    window.addEventListener('scroll', this.scrollHandler, true);
  }

  /**
   * Create the unified selector UI
   */
  private createUI(): HTMLElement {
    // Keep reference to callback (removed self-assignment)
    
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
    const personalities = PERSONALITIES;
    
    this.container.innerHTML = `
      <div class="selector-header">
        <div class="selector-tabs">
          <button class="tab-btn ${this.view === 'grid' ? 'active' : ''}" data-view="grid">
            <span>📝 All</span>
          </button>
          <button class="tab-btn ${this.view === 'smart' ? 'active' : ''}" data-view="smart">
            <span>🤖 Smart</span>
          </button>
          <button class="tab-btn ${this.view === 'favorites' ? 'active' : ''}" data-view="favorites">
            <span>⭐ Favorites</span>
          </button>
          <button class="tab-btn ${this.view === 'imagegen' ? 'active' : ''}" data-view="imagegen">
            <span>🖼️ Image Gen</span>
          </button>
          <button class="tab-btn ${this.view === 'custom' ? 'active' : ''}" data-view="custom">
            <span>✨ Custom</span>
          </button>
        </div>
        <button class="close-btn" aria-label="Close">×</button>
      </div>
      
      ${this.renderViewContent(templates, personalities)}
      
      <div class="selector-footer">
        <div class="selection-info">
          ${this.selectedTemplate ? `<span class="selected-template">${this.selectedTemplate.emoji} ${this.selectedTemplate.name}</span>` : ''}
          ${this.selectedPersonality ? `<span class="selected-personality">${this.selectedPersonality.emoji} ${this.selectedPersonality.label}</span>` : ''}
        </div>
        <button class="generate-btn ${this.selectedTemplate && this.selectedPersonality ? 'active' : ''}" 
                ${!this.selectedTemplate || !this.selectedPersonality ? 'disabled' : ''}>
          Generate Reply
        </button>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render content based on current view
   */
  private renderViewContent(templates: Template[], personalities: Personality[]): string {
    switch (this.view) {
      case 'smart':
        return this.renderSmartSuggestionsView(templates, personalities);
      case 'favorites':
        return this.renderFavoritesView(templates, personalities);
      case 'imagegen':
        return this.renderImageGenView();
      case 'custom':
        return this.renderCustomView(templates, personalities);
      default:
        return this.renderGridView(templates, personalities);
    }
  }

  /**
   * Render grid view (all templates and tones)
   */
  private renderGridView(templates: Template[], personalities: Personality[]): string {
    return `
      <div class="selector-content grid-view">
        <div class="personalities-section">
          <h3>Personality</h3>
          <div class="personality-grid">
            ${personalities.map(personality => `
              <div class="item-wrapper">
                <button class="personality-btn ${this.selectedPersonality?.id === personality.id ? 'selected' : ''}"
                        data-personality="${personality.id}"
                        title="${personality.description}">
                  <span class="personality-emoji">${personality.emoji}</span>
                  <span class="personality-label">${personality.label}</span>
                </button>
                <button class="star-btn ${this.favoritePersonalities.has(personality.id) ? 'active' : ''}" 
                        data-personality-star="${personality.id}" 
                        title="${this.favoritePersonalities.has(personality.id) ? 'Remove from favorites' : 'Add to favorites'}">
                  ${this.favoritePersonalities.has(personality.id) ? '⭐' : '☆'}
                </button>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="rhetoric-section">
          <h3>Rhetoric</h3>
          <div class="rhetoric-grid">
            ${templates.map(template => `
              <div class="item-wrapper">
                <button class="rhetoric-btn ${this.selectedTemplate?.id === template.id ? 'selected' : ''}"
                        data-rhetoric="${template.id}"
                        title="${template.description}">
                  <span class="rhetoric-emoji">${template.emoji}</span>
                  <span class="rhetoric-name">${template.name}</span>
                </button>
                <button class="star-btn ${this.favoriteTemplates.has(template.id) ? 'active' : ''}" 
                        data-rhetoric-star="${template.id}" 
                        title="${this.favoriteTemplates.has(template.id) ? 'Remove from favorites' : 'Add to favorites'}">
                  ${this.favoriteTemplates.has(template.id) ? '⭐' : '☆'}
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render smart suggestions view
   */
  private renderSmartSuggestionsView(templates: Template[], personalities: Personality[]): string {
    // Use smart suggestions with scores if available
    const suggestedTemplates = this.smartSuggestions.templates.length > 0 
      ? this.smartSuggestions.templates 
      : templates.slice(0, 6); // Fallback to first 6 templates
    
    const suggestedPersonalities = this.smartSuggestions.personalities.length > 0
      ? this.smartSuggestions.personalities
      : personalities.slice(0, 6); // Fallback to first 6 personalities
    
    // Get scores from smartSuggestionsScores if available
    const scores = (this as any).smartSuggestionsScores || [];
    
    return `
      <div class="selector-content smart-view">
        <div class="smart-info">
          <p style="text-align: center; color: #8b98a5; font-size: 12px; margin: 0 0 12px 0;">
            🤖 AI-suggested combinations based on conversation context
          </p>
        </div>
        <div class="smart-suggestions-list">
          ${scores.length > 0 ? scores.slice(0, 6).map((score: any, _index: number) => {
            const template = TEMPLATES.find(t => t.id === score.templateId);
            const personality = PERSONALITIES.find(p => p.id === (score.personalityId || score.toneId));
            if (!template || !personality) return '';
            
            return `
              <div class="suggestion-card" data-template="${template.id}" data-personality="${personality.id}">
                <div class="suggestion-header">
                  <span class="suggestion-combo">
                    ${template.emoji} ${template.name} + ${personality.emoji} ${personality.label}
                  </span>
                  <span class="suggestion-score" title="AI confidence score based on context analysis">
                    <span class="score-icon">⚡</span>
                    ${score.score.toFixed(1)}
                  </span>
                </div>
                <div class="suggestion-preview">
                  ${template.description.length > 60 ? template.description.substring(0, 60) + '...' : template.description}
                </div>
                <div class="suggestion-reasons">
                  ${score.reasons.map((reason: string, idx: number) => {
                    // Enhance reason descriptions
                    let enhancedReason = reason;
                    if (reason.includes('Template matches')) enhancedReason = '🎯 ' + reason;
                    else if (reason.includes('Tone suits')) enhancedReason = '🎨 ' + reason;
                    else if (reason.includes('thread')) enhancedReason = '🧵 ' + reason;
                    else if (reason.includes('viral')) enhancedReason = '🔥 ' + reason;
                    else if (reason.includes('engagement')) enhancedReason = '💬 ' + reason;
                    
                    return idx < 3 ? `<span class="reason-chip" title="Why this combination works well">${enhancedReason}</span>` : '';
                  }).join('')}
                </div>
              </div>
            `;
          }).join('') : `
            <div class="rhetoric-section">
              <h3>Suggested Rhetoric</h3>
              <div class="template-grid">
                ${suggestedTemplates.map(template => `
                  <button class="template-btn ${this.selectedTemplate?.id === template.id ? 'selected' : ''}"
                          data-template="${template.id}"
                          title="${template.description}">
                    <span class="template-emoji">${template.emoji}</span>
                    <span class="template-name">${template.name}</span>
                  </button>
                `).join('')}
              </div>
            </div>
            
            <div class="personalities-section">
              <h3>Suggested Personality</h3>
              <div class="personality-grid">
                ${suggestedPersonalities.map(personality => `
                  <button class="personality-btn ${this.selectedPersonality?.id === personality.id ? 'selected' : ''}"
                          data-personality="${personality.id}"
                          title="${personality.description}">
                    <span class="personality-emoji">${personality.emoji}</span>
                    <span class="personality-label">${personality.label}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          `}
        </div>
      </div>
    `;
  }

  /**
   * Render favorites view
   */
  private renderFavoritesView(templates: Template[], personalities: Personality[]): string {
    const favoriteTemplatesList = templates.filter(t => this.favoriteTemplates.has(t.id));
    const favoritePersonalitiesList = personalities.filter(p => this.favoritePersonalities.has(p.id));
    
    if (favoriteTemplatesList.length === 0 && favoritePersonalitiesList.length === 0) {
      return `
        <div class="selector-content favorites-view">
          <div class="empty-state">
            <p>No favorites yet!</p>
            <p>Star your favorite rhetoric and personalities to see them here.</p>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="selector-content favorites-view">
        ${favoriteTemplatesList.length > 0 ? `
          <div class="rhetoric-section">
            <h3>Favorite Rhetoric</h3>
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
        
        ${favoritePersonalitiesList.length > 0 ? `
          <div class="personalities-section">
            <h3>Favorite Personality</h3>
            <div class="personality-grid">
              ${favoritePersonalitiesList.map(personality => `
                <button class="personality-btn ${this.selectedPersonality?.id === personality.id ? 'selected' : ''}"
                        data-personality="${personality.id}"
                        title="${personality.description}">
                  <span class="personality-emoji">${personality.emoji}</span>
                  <span class="personality-label">${personality.label}</span>
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
  private renderCustomView(templates: Template[], personalities: Personality[]): string {
    const customTemplates = templates.filter(t => t.id.startsWith('custom_'));
    const customPersonalities = personalities.filter(p => p.id.startsWith('custom_'));
    
    if (customTemplates.length === 0 && customPersonalities.length === 0) {
      return `
        <div class="selector-content custom-view">
          <div class="empty-state">
            <p>No custom rhetoric or personalities yet!</p>
            <button class="create-custom-btn">Create Custom Template</button>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="selector-content custom-view">
        ${customTemplates.length > 0 ? `
          <div class="rhetoric-section">
            <h3>Custom Rhetoric</h3>
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
        
        ${customPersonalities.length > 0 ? `
          <div class="personalities-section">
            <h3>Custom Personality</h3>
            <div class="personality-grid">
              ${customPersonalities.map(personality => `
                <button class="personality-btn ${this.selectedPersonality?.id === personality.id ? 'selected' : ''}"
                        data-personality="${personality.id}"
                        title="${personality.description}">
                  <span class="personality-emoji">${personality.emoji}</span>
                  <span class="personality-label">${personality.label}</span>
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
        e.preventDefault();
        e.stopPropagation();
        const view = (e.currentTarget as HTMLElement).dataset.view as 'grid' | 'smart' | 'favorites' | 'imagegen' | 'custom';
        this.view = view;
        if (view === 'smart') {
          this.loadSmartSuggestions();
        }
        this.render();
      });
    });

    // Rhetoric selection (new buttons)
    this.container.querySelectorAll('.rhetoric-btn').forEach(btn => {
      (btn as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        const rhetoricId = (e.currentTarget as HTMLElement).dataset.rhetoric!;
        this.selectTemplate(rhetoricId);
      });
    });
    
    // Template selection (backward compatibility)
    this.container.querySelectorAll('.template-btn').forEach(btn => {
      (btn as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        const templateId = (e.currentTarget as HTMLElement).dataset.template!;
        this.selectTemplate(templateId);
      });
    });
    
    // Rhetoric star buttons (new)
    this.container.querySelectorAll('[data-rhetoric-star]').forEach(btn => {
      (btn as HTMLElement).addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const rhetoricId = (e.currentTarget as HTMLElement).dataset.rhetoricStar!;
        await this.toggleFavoriteTemplate(rhetoricId);
      });
    });
    
    // Template star buttons (backward compatibility)
    this.container.querySelectorAll('[data-template-star]').forEach(btn => {
      (btn as HTMLElement).addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const templateId = (e.currentTarget as HTMLElement).dataset.templateStar!;
        await this.toggleFavoriteTemplate(templateId);
      });
    });
    
    // Suggestion card selection (for Smart view)
    this.container.querySelectorAll('.suggestion-card').forEach(card => {
      (card as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        const templateId = (e.currentTarget as HTMLElement).dataset.template!;
        const personalityId = (e.currentTarget as HTMLElement).dataset.personality!;
        this.selectTemplate(templateId);
        this.selectPersonality(personalityId);
      });
    });

    // Personality selection
    this.container.querySelectorAll('.personality-btn').forEach(btn => {
      (btn as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        const personalityId = (e.currentTarget as HTMLElement).dataset.personality!;
        this.selectPersonality(personalityId);
      });
    });
    
    // Personality star buttons
    this.container.querySelectorAll('[data-personality-star]').forEach(btn => {
      (btn as HTMLElement).addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const personalityId = (e.currentTarget as HTMLElement).dataset.personalityStar!;
        await this.toggleFavoritePersonality(personalityId);
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
        this.showCreateCustomDialog();
      });
    }

    // Image search button
    const searchBtn = this.container.querySelector('.image-search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        this.handleImageSearch();
      });
    }

    // Image generate button
    const generateImageBtn = this.container.querySelector('.image-generate-btn');
    if (generateImageBtn) {
      generateImageBtn.addEventListener('click', () => {
        this.handleImageGenerate();
      });
    }

    // Enter key on image search input
    const searchInput = this.container.querySelector('.image-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleImageSearch();
        }
      });
    }
  }

  /**
   * Load smart suggestions based on context
   */
  private async loadSmartSuggestions(): Promise<void> {
    try {
      console.log('%c🤖 Loading smart suggestions', 'color: #1DA1F2');
      
      // Get the current tweet context
      const replyBox = document.querySelector('[data-testid="tweetTextarea_0"], .DraftEditor-root');
      let context: any = { tweetText: '', isReply: false };
      
      if (replyBox) {
        const extracted = DOMUtils.extractTwitterContext();
        context = {
          tweetText: extracted.tweetText || '',
          isReply: extracted.isReply,
          threadContext: extracted.threadContext
        };
      }
      
      // Get suggestions from the template suggester
      const suggestions = await templateSuggester.getSuggestions({
        tweetText: context.tweetText || '',
        isReply: true,
        threadContext: context.threadContext,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      });
      
      // Store the full scores for display
      this.smartSuggestionsScores = suggestions;
      
      // Extract unique templates and tones from suggestions
      const templateIds = new Set<string>();
      const toneIds = new Set<string>();
      
      suggestions.slice(0, 9).forEach(suggestion => {
        templateIds.add(suggestion.templateId);
        toneIds.add(suggestion.toneId);
      });
      
      // Get the actual template and tone objects
      const suggestedTemplates = Array.from(templateIds)
        .map(id => TEMPLATES.find(t => t.id === id))
        .filter(Boolean) as Template[];
      
      const suggestedPersonalities = Array.from(toneIds)
        .map(id => PERSONALITIES.find(p => p.id === id))
        .filter(Boolean) as Personality[];
      
      // Ensure we have at least 6 suggestions
      if (suggestedTemplates.length < 6) {
        const remaining = 6 - suggestedTemplates.length;
        const additionalTemplates = TEMPLATES
          .filter(t => !templateIds.has(t.id))
          .slice(0, remaining);
        suggestedTemplates.push(...additionalTemplates);
      }
      
      if (suggestedPersonalities.length < 6) {
        const remaining = 6 - suggestedPersonalities.length;
        const additionalPersonalities = PERSONALITIES
          .filter(p => !toneIds.has(p.id))
          .slice(0, remaining);
        suggestedPersonalities.push(...additionalPersonalities);
      }
      
      // Store the suggestions
      this.smartSuggestions = {
        templates: suggestedTemplates.slice(0, 6),
        personalities: suggestedPersonalities.slice(0, 6)
      };
      
      console.log('%c🤖 Smart suggestions loaded:', 'color: #17BF63', this.smartSuggestions);
      
      // Re-render to show the suggestions
      this.render();
      
    } catch (error) {
      console.error('Failed to load smart suggestions:', error);
      
      // Fallback to popular choices
      this.smartSuggestions = {
        templates: TEMPLATES.slice(0, 6),
        personalities: PERSONALITIES.slice(0, 6)
      };
      
      this.render();
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
   * Select a personality
   */
  private selectPersonality(personalityId: string): void {
    const personality = PERSONALITIES.find(p => p.id === personalityId) || null;
    if (personality) {
      this.selectedPersonality = personality;
      console.log('%c🎭 Personality selected:', 'color: #9146FF', personality.label);
      this.updateUI();
      this.checkReadyToGenerate();
    }
  }

  /**
   * Update UI after selection
   */
  private updateUI(): void {
    if (!this.container) return;

    // Update rhetoric buttons (new)
    this.container.querySelectorAll('.rhetoric-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-rhetoric') === this.selectedTemplate?.id);
    });
    
    // Update template buttons (backward compatibility)
    this.container.querySelectorAll('.template-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-template') === this.selectedTemplate?.id);
    });

    // Update personality buttons
    this.container.querySelectorAll('.personality-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-personality') === this.selectedPersonality?.id);
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

    // Hide the popup immediately when generating starts
    this.hide();
    
    // Call the callback after hiding
    this.onSelectCallback(result);
  }

  /**
   * Toggle favorite template
   */
  private async toggleFavoriteTemplate(rhetoricId: string): Promise<void> {
    if (this.favoriteRhetoric.has(rhetoricId)) {
      this.favoriteRhetoric.delete(rhetoricId);
      this.saveFavorites();
      console.log('%c⭐ Removed from favorites:', 'color: #FFA500', rhetoricId);
    } else {
      this.favoriteRhetoric.add(rhetoricId);
      this.saveFavorites();
      console.log('%c⭐ Added to favorites:', 'color: #FFA500', rhetoricId);
    }
    this.render();
  }

  /**
   * Toggle favorite personality
   */
  private async toggleFavoritePersonality(personalityId: string): Promise<void> {
    if (this.favoritePersonalities.has(personalityId)) {
      this.favoritePersonalities.delete(personalityId);
      this.saveFavorites();
      console.log('%c⭐ Removed from favorites:', 'color: #FFA500', personalityId);
    } else {
      this.favoritePersonalities.add(personalityId);
      this.saveFavorites();
      console.log('%c⭐ Added to favorites:', 'color: #FFA500', personalityId);
    }
    this.render();
  }

  /**
   * Save favorites to storage
   */
  private saveFavorites(): void {
    const favorites = {
      favoriteTemplates: Array.from(this.favoriteTemplates),
      favoritePersonalities: Array.from(this.favoritePersonalities)
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
        this.favoriteRhetoric = new Set(prefs.favoriteRhetoric || prefs.favoriteTemplates || []);
        this.favoritePersonalities = new Set(prefs.favoritePersonalities || prefs.favoriteTones || []);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }

  /**
   * Show create custom template/tone dialog
   */
  private showCreateCustomDialog(): void {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'tweetcraft-custom-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create Custom Template</h3>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Template Name *</label>
            <input type="text" id="custom-name" placeholder="e.g., Thoughtful Response" maxlength="50" />
          </div>
          <div class="form-group">
            <label>Emoji Icon</label>
            <input type="text" id="custom-emoji" placeholder="e.g., 💭" maxlength="2" value="✨" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <input type="text" id="custom-description" placeholder="Brief description of this template" />
          </div>
          <div class="form-group">
            <label>Style Prompt *</label>
            <textarea id="custom-style" rows="4" placeholder="Define the writing style and approach for this template (e.g., 'Write a thoughtful reply that acknowledges the point and adds a new perspective')"></textarea>
          </div>
          <div class="form-group">
            <label>Tone Prompt *</label>
            <textarea id="custom-tone" rows="4" placeholder="Define the tone and personality (e.g., 'Be professional but approachable, use clear language, avoid jargon')"></textarea>
          </div>
          <div class="form-group">
            <label>Category</label>
            <select id="custom-category">
              <option value="custom">Custom</option>
              <option value="engagement">Engagement</option>
              <option value="debate">Debate</option>
              <option value="humor">Humor</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-save">Create Template</button>
        </div>
      </div>
    `;
    
    // Apply styles
    const style = document.createElement('style');
    style.textContent = `
      .tweetcraft-custom-modal {
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
      
      .modal-content {
        background: #15202b;
        border-radius: 12px;
        width: 500px;
        max-width: 90vw;
        border: 1px solid rgba(139, 152, 165, 0.3);
      }
      
      .modal-header {
        padding: 16px 20px;
        border-bottom: 1px solid rgba(139, 152, 165, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .modal-header h3 {
        margin: 0;
        color: #e7e9ea;
        font-size: 18px;
      }
      
      .modal-close {
        background: transparent;
        border: none;
        color: #8b98a5;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
      }
      
      .modal-close:hover {
        color: #e7e9ea;
      }
      
      .modal-body {
        padding: 20px;
      }
      
      .form-group {
        margin-bottom: 16px;
      }
      
      .form-group label {
        display: block;
        color: #8b98a5;
        font-size: 13px;
        margin-bottom: 6px;
      }
      
      .form-group input,
      .form-group textarea,
      .form-group select {
        width: 100%;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(139, 152, 165, 0.3);
        border-radius: 8px;
        padding: 10px 12px;
        color: #000;
        font-size: 14px;
      }
      
      .form-group select option {
        background: white;
        color: black;
      }
      
      .form-group input:focus,
      .form-group textarea:focus,
      .form-group select:focus {
        outline: none;
        border-color: #1d9bf0;
        background: rgba(255, 255, 255, 0.08);
      }
      
      .modal-footer {
        padding: 16px 20px;
        border-top: 1px solid rgba(139, 152, 165, 0.2);
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      
      .btn-cancel,
      .btn-save {
        padding: 8px 20px;
        border-radius: 18px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .btn-cancel {
        background: transparent;
        border: 1px solid rgba(139, 152, 165, 0.3);
        color: #8b98a5;
      }
      
      .btn-cancel:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .btn-save {
        background: #1d9bf0;
        border: none;
        color: white;
      }
      
      .btn-save:hover {
        background: #1a8cd8;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // Event handlers
    const closeModal = () => {
      modal.remove();
      style.remove();
    };
    
    modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
    modal.querySelector('.btn-cancel')?.addEventListener('click', closeModal);
    
    modal.querySelector('.btn-save')?.addEventListener('click', async () => {
      const name = (modal.querySelector('#custom-name') as HTMLInputElement)?.value.trim();
      const emoji = (modal.querySelector('#custom-emoji') as HTMLInputElement)?.value.trim() || '✨';
      const description = (modal.querySelector('#custom-description') as HTMLInputElement)?.value.trim();
      const stylePrompt = (modal.querySelector('#custom-style') as HTMLTextAreaElement)?.value.trim();
      const tonePrompt = (modal.querySelector('#custom-tone') as HTMLTextAreaElement)?.value.trim();
      const category = (modal.querySelector('#custom-category') as HTMLSelectElement)?.value || 'custom';
      
      if (!name || !stylePrompt || !tonePrompt) {
        visualFeedback.showToast('Name, style prompt, and tone prompt are required', { type: 'error' });
        return;
      }
      
      // Combine the prompts
      const combinedPrompt = `${stylePrompt}\n\n${tonePrompt}`;
      
      // Create custom template
      const customTemplate: Template = {
        id: `custom_${Date.now()}`,
        name,
        emoji,
        description: description || `Custom template: ${name}`,
        prompt: combinedPrompt,
        category: category as any
      };
      
      // Save to storage
      await this.saveCustomTemplate(customTemplate);
      
      visualFeedback.showToast('Custom template created!', { type: 'success' });
      closeModal();
      
      // Refresh the view
      this.view = 'custom';
      this.render();
    });
    
    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
  
  /**
   * Save custom template to storage
   */
  private async saveCustomTemplate(template: Template): Promise<void> {
    try {
      // First get existing templates via message passing
      chrome.runtime.sendMessage({ type: 'GET_STORAGE', keys: ['customTemplates'] }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to load templates for saving:', chrome.runtime.lastError);
          return;
        }
        
        const customTemplates = (response?.data?.customTemplates || []);
        const updatedTemplates = Array.isArray(customTemplates) ? [...customTemplates, template] : [template];
        
        // Save updated templates via service worker
        chrome.runtime.sendMessage({ 
          type: 'SET_STORAGE', 
          data: { customTemplates: updatedTemplates } 
        }, (saveResponse) => {
          if (chrome.runtime.lastError) {
            console.error('Failed to save custom template:', chrome.runtime.lastError);
          } else if (saveResponse?.success) {
            // Add to TEMPLATES array for current session
            TEMPLATES.push(template);
            console.log('Custom template saved successfully');
          }
        });
      });
    } catch (error) {
      console.error('Failed to save custom template:', error);
    }
  }
  
  /**
   * Load custom templates from storage
   */
  private async loadCustomTemplates(): Promise<void> {
    try {
      // Use message passing to avoid CSP issues
      chrome.runtime.sendMessage({ type: 'GET_STORAGE', keys: ['customTemplates'] }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to load custom templates:', chrome.runtime.lastError);
          return;
        }
        
        if (response && response.success && response.data) {
          const customTemplates = response.data.customTemplates || [];
          
          // Ensure customTemplates is an array before iterating
          if (Array.isArray(customTemplates)) {
            customTemplates.forEach((template: Template) => {
              if (!TEMPLATES.find(t => t.id === template.id)) {
                TEMPLATES.push(template);
              }
            });
          }
        }
      });
    } catch (error) {
      console.error('Failed to load custom templates:', error);
    }
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
          max-height: 600px;
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
        .personalities-section {
          flex: 1;
        }
        
        .templates-section h3,
        .personalities-section h3 {
          margin: 0 0 10px 0;
          color: #e7e9ea;
          font-size: 15px;
          font-weight: 600;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(139, 152, 165, 0.2);
        }
        
        /* Removed template-category styles since we no longer use categories */
        
        .rhetoric-grid,
        .template-grid,
        .personality-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
        }
        
        .item-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .rhetoric-btn,
        .template-btn,
        .personality-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 20px 6px 5px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 8px;
          color: #e7e9ea;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          font-size: 12px;
          min-height: 32px;
          width: 100%;
        }
        
        .star-btn {
          position: absolute;
          right: 2px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 14px;
          padding: 2px 4px;
          z-index: 10;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        
        .star-btn:hover {
          opacity: 1;
        }
        
        .star-btn.active {
          opacity: 1;
          color: #ffd700;
        }
        
        .rhetoric-btn:hover,
        .template-btn:hover,
        .personality-btn:hover {
          background: rgba(29, 155, 240, 0.15);
          border-color: rgba(29, 155, 240, 0.5);
          transform: translateY(-1px);
        }
        
        .rhetoric-btn.selected,
        .template-btn.selected,
        .personality-btn.selected {
          background: rgba(29, 155, 240, 0.25);
          border-color: #1d9bf0;
        }
        
        .rhetoric-emoji,
        .template-emoji,
        .personality-emoji {
          font-size: 16px;
        }
        
        .rhetoric-name,
        .template-name,
        .personality-label {
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
        
        /* Smart suggestions cards */
        .smart-suggestions-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .suggestion-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 8px;
          padding: 10px 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .suggestion-card:hover {
          background: rgba(29, 155, 240, 0.15);
          border-color: rgba(29, 155, 240, 0.5);
          transform: translateY(-1px);
        }
        
        .suggestion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        
        .suggestion-combo {
          color: #e7e9ea;
          font-size: 13px;
          font-weight: 500;
        }
        
        .suggestion-score {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          color: #1d9bf0;
          font-size: 12px;
          font-weight: 600;
          background: rgba(29, 155, 240, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .score-icon {
          font-size: 10px;
        }
        
        .suggestion-preview {
          font-size: 11px;
          color: #8899a6;
          margin-bottom: 8px;
          line-height: 1.3;
          font-style: italic;
        }
        
        .suggestion-reasons {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        
        .reason-chip {
          background: rgba(29, 155, 240, 0.15);
          color: #a8b3bf;
          font-size: 11px;
          padding: 3px 6px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        
        .reason-chip:hover {
          background: rgba(29, 155, 240, 0.25);
          color: #e7e9ea;
        }
        
        /* Image Generation View Styles */
        .imagegen-view {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .image-gen-controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }
        
        .search-input-wrapper {
          display: flex;
          gap: 6px;
        }
        
        .image-search-input {
          flex: 1;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 8px;
          color: #e7e9ea;
          font-size: 13px;
        }
        
        .image-search-input:focus {
          outline: none;
          border-color: #1d9bf0;
          background: rgba(255, 255, 255, 0.08);
        }
        
        .image-search-btn,
        .image-generate-btn {
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 8px;
          color: #e7e9ea;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s;
        }
        
        .image-search-btn:hover,
        .image-generate-btn:hover {
          background: rgba(29, 155, 240, 0.2);
          border-color: rgba(29, 155, 240, 0.5);
        }
        
        .image-style-options {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .style-label {
          color: #8b98a5;
          font-size: 12px;
        }
        
        .image-style-select {
          flex: 1;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 6px;
          color: #000;
          font-size: 12px;
        }
        
        .image-style-select option {
          background: white;
          color: black;
        }
        
        .image-results-container {
          flex: 1;
          overflow-y: auto;
          position: relative;
        }
        
        .image-results-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 8px;
        }
        
        .image-result-item {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .image-result-item:hover {
          transform: scale(1.05);
        }
        
        .image-result-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(to bottom, transparent 60%, rgba(0, 0, 0, 0.8));
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding: 6px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .image-result-item:hover .image-overlay {
          opacity: 1;
        }
        
        .use-image-btn {
          width: 28px;
          height: 28px;
          background: #1d9bf0;
          border: none;
          border-radius: 50%;
          color: white;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .use-image-btn:hover {
          background: #1a8cd8;
        }
        
        .image-source {
          background: rgba(0, 0, 0, 0.6);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          color: white;
        }
        
        .image-empty-state,
        .image-loading-state {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: #8b98a5;
        }
        
        .image-loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        
        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(29, 155, 240, 0.3);
          border-top-color: #1d9bf0;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Handle image search
   */
  private async handleImageSearch(): Promise<void> {
    if (!this.container) return;
    
    const input = this.container.querySelector('.image-search-input') as HTMLInputElement;
    const query = input?.value.trim();
    
    if (!query) {
      visualFeedback.showToast('Please enter a search query', { type: 'error' });
      return;
    }
    
    console.log('%c🔍 Searching for images:', 'color: #1DA1F2', query);
    
    // Show loading state
    const emptyState = this.container.querySelector('.image-empty-state') as HTMLElement;
    const loadingState = this.container.querySelector('.image-loading-state') as HTMLElement;
    const resultsGrid = this.container.querySelector('.image-results-grid') as HTMLElement;
    
    if (emptyState) emptyState.style.display = 'none';
    if (loadingState) loadingState.style.display = 'flex';
    if (resultsGrid) resultsGrid.innerHTML = '';
    
    try {
      const results = await imageService.searchImages({ 
        query,
        limit: 12 
      });
      
      if (loadingState) loadingState.style.display = 'none';
      
      if (results.length === 0) {
        if (emptyState) {
          emptyState.innerHTML = `
            <p>No images found for "${query}"</p>
            <p style="font-size: 12px; color: #8b98a5;">Try a different search term</p>
          `;
          emptyState.style.display = 'block';
        }
        return;
      }
      
      // Display results
      this.displayImageResults(results);
      
    } catch (error) {
      console.error('Image search failed:', error);
      if (loadingState) loadingState.style.display = 'none';
      visualFeedback.showToast('Failed to search images', { type: 'error' });
      
      if (emptyState) {
        emptyState.innerHTML = `
          <p>Failed to search images</p>
          <p style="font-size: 12px; color: #8b98a5;">${error instanceof Error ? error.message : 'Unknown error'}</p>
        `;
        emptyState.style.display = 'block';
      }
    }
  }

  /**
   * Handle AI image generation
   */
  private async handleImageGenerate(): Promise<void> {
    if (!this.container) return;
    
    const input = this.container.querySelector('.image-search-input') as HTMLInputElement;
    const styleSelect = this.container.querySelector('.image-style-select') as HTMLSelectElement;
    const prompt = input?.value.trim();
    const style = styleSelect?.value as 'realistic' | 'cartoon' | 'artistic' | 'sketch';
    
    if (!prompt) {
      visualFeedback.showToast('Please enter an image description', { type: 'error' });
      return;
    }
    
    console.log('%c✨ Generating AI image:', 'color: #9146FF', { prompt, style });
    
    // Show loading state
    const emptyState = this.container.querySelector('.image-empty-state') as HTMLElement;
    const loadingState = this.container.querySelector('.image-loading-state') as HTMLElement;
    const resultsGrid = this.container.querySelector('.image-results-grid') as HTMLElement;
    
    if (emptyState) emptyState.style.display = 'none';
    if (loadingState) {
      loadingState.style.display = 'flex';
      loadingState.innerHTML = `
        <div class="spinner"></div>
        <p>Generating AI image...</p>
      `;
    }
    if (resultsGrid) resultsGrid.innerHTML = '';
    
    // Get configured image size or use default
    const allowedSizes = ['256x256', '512x512', '1024x1024'] as const;
    let imageSize: '256x256' | '512x512' | '1024x1024' = '512x512'; // Default size
    
    // Get size from config or UI if available
    const sizeSelector = this.container.querySelector('.image-size-selector') as HTMLSelectElement;
    if (sizeSelector && sizeSelector.value && allowedSizes.includes(sizeSelector.value as any)) {
      imageSize = sizeSelector.value as '256x256' | '512x512' | '1024x1024';
    }
    
    try {
      const result = await imageService.generateImage({ 
        prompt,
        style,
        size: imageSize
      });
      
      if (loadingState) loadingState.style.display = 'none';
      
      // Display the generated image
      this.displayImageResults([result]);
      
      visualFeedback.showToast('AI image generated!', { type: 'success' });
      
    } catch (error) {
      console.error('Image generation failed:', error);
      if (loadingState) loadingState.style.display = 'none';
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      visualFeedback.showToast(`Failed to generate image: ${errorMsg}`, { type: 'error' });
      
      if (emptyState) {
        emptyState.innerHTML = `
          <p>Failed to generate image</p>
          <p style="font-size: 12px; color: #8b98a5;">${errorMsg}</p>
        `;
        emptyState.style.display = 'block';
      }
    }
  }

  /**
   * Display image results in the grid
   */
  private displayImageResults(results: any[]): void {
    if (!this.container) return;
    
    const resultsGrid = this.container.querySelector('.image-results-grid') as HTMLElement;
    if (!resultsGrid) return;
    
    // Clear previous results
    resultsGrid.innerHTML = '';
    
    // Create elements using DOM API to prevent XSS
    results.forEach(img => {
      // Validate URL protocol
      let url = img.url;
      try {
        const urlObj = new URL(url);
        if (!['https:', 'http:', 'data:'].includes(urlObj.protocol)) {
          console.warn('Invalid image URL protocol:', urlObj.protocol);
          return;
        }
        // Only allow specific data image types
        if (urlObj.protocol === 'data:' && !url.startsWith('data:image/')) {
          console.warn('Invalid data URL type');
          return;
        }
      } catch (e) {
        console.warn('Invalid URL:', url);
        return;
      }
      
      const item = document.createElement('div');
      item.className = 'image-result-item';
      item.setAttribute('data-url', url);
      
      // Sanitize and limit alt text
      const altText = (img.alt || 'Image').substring(0, 200).replace(/[<>]/g, '');
      item.setAttribute('data-alt', altText);
      
      const imgElement = document.createElement('img');
      imgElement.src = img.thumbnail || url;
      imgElement.alt = altText;
      
      const overlay = document.createElement('div');
      overlay.className = 'image-overlay';
      
      const button = document.createElement('button');
      button.className = 'use-image-btn';
      button.title = 'Use this image';
      button.textContent = '✓';
      
      const sourceSpan = document.createElement('span');
      sourceSpan.className = 'image-source';
      sourceSpan.textContent = img.source === 'generated' ? '✨ AI' : '🔍 Web';
      
      overlay.appendChild(button);
      overlay.appendChild(sourceSpan);
      
      item.appendChild(imgElement);
      item.appendChild(overlay);
      
      resultsGrid.appendChild(item);
    });
    
    // Add click handlers for using images
    resultsGrid.querySelectorAll('.use-image-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = (e.target as HTMLElement).closest('.image-result-item');
        if (item) {
          const url = item.getAttribute('data-url');
          const alt = item.getAttribute('data-alt');
          if (url) {
            this.handleImageSelection(url, alt || '');
          }
        }
      });
    });
    
    // Click on image also selects it
    resultsGrid.querySelectorAll('.image-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.getAttribute('data-url');
        const alt = item.getAttribute('data-alt');
        if (url) {
          this.handleImageSelection(url, alt || '');
        }
      });
    });
  }

  /**
   * Handle image selection
   */
  private handleImageSelection(url: string, alt: string): void {
    console.log('%c🖼️ Image selected:', 'color: #17BF63', { url, alt });
    
    // Insert image URL into the tweet textarea
    const replyBox = document.querySelector('[data-testid="tweetTextarea_0"], .DraftEditor-root') as HTMLElement;
    if (replyBox) {
      // Get current text and append image URL
      const currentText = DOMUtils.getTextFromTextarea(replyBox);
      const newText = currentText ? `${currentText}\n${url}` : url;
      DOMUtils.setTextareaValue(replyBox, newText);
      visualFeedback.showToast('Image URL added to tweet!', { type: 'success' });
    }
    
    // Hide the selector
    this.hide();
  }

  /**
   * Render image generation view
   */
  private renderImageGenView(): string {
    return `
      <div class="selector-content imagegen-view">
        <div class="image-gen-controls">
          <div class="search-input-wrapper">
            <input type="text" 
                   class="image-search-input" 
                   placeholder="Search for images or describe what you want..." />
            <button class="image-search-btn" title="Search Images">🔍</button>
            <button class="image-generate-btn" title="Generate AI Image">✨</button>
          </div>
          
          <div class="image-style-options">
            <label class="style-label">Style:</label>
            <select class="image-style-select">
              <option value="realistic">Realistic</option>
              <option value="cartoon">Cartoon</option>
              <option value="artistic">Artistic</option>
              <option value="sketch">Sketch</option>
            </select>
          </div>
        </div>
        
        <div class="image-results-container">
          <div class="image-results-grid" id="image-results">
            <!-- Results will be inserted here -->
          </div>
          <div class="image-empty-state">
            <p>🖼️ Search for images or generate AI images</p>
            <p style="font-size: 12px; color: #8b98a5;">Enter a description and click search or generate</p>
          </div>
        </div>
        
        <div class="image-loading-state" style="display: none;">
          <div class="spinner"></div>
          <p>Loading images...</p>
        </div>
      </div>
    `;
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
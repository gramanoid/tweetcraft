/**
 * Five-Step AI Reply System Selector
 * Implements Persona & Framing, Attitude, Rhetoric, Vocabulary, and Format & Pacing selection
 */

import { REPLY_OPTIONS, ReplyOption, ReplyOptionsStructure } from '@/config/templatesAndTones';
import { visualFeedback } from '@/ui/visualFeedback';
import { DOMUtils } from '@/content/domUtils';
import { imageService } from '@/services/imageService';
import { SelectionMap } from '@/types';

export interface FiveStepSelectionResult {
  selections: SelectionMap;
  combinedPrompts: string[];
  temperature: number;
}

export class UnifiedSelector {
  private container: HTMLElement | null = null;
  private selections: SelectionMap = {
    personaFraming: null,
    attitude: null,
    rhetoric: null,
    vocabulary: null,
    formatPacing: null
  };
  
  private onSelectCallback: ((result: FiveStepSelectionResult) => void) | null = null;
  private clickOutsideHandler: ((e: MouseEvent) => void) | null = null;
  private scrollHandler: (() => void) | null = null;
  private anchorButton: HTMLElement | null = null;
  private view: 'all' | 'smart' | 'favorites' | 'imagegen' | 'custom' = 'all';
  private flatOptionsCache: ReplyOption[] | null = null;

  constructor() {
    // Initialize
  }

  /**
   * Show the unified selector
   */
  async show(button: HTMLElement, onSelect: (result: FiveStepSelectionResult) => void): Promise<void> {
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
    const selectorHeight = 600; // max-height from CSS
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
    const selectorWidth = 560; // width from CSS
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

    this.container.innerHTML = `
      <div class="selector-header">
        <div class="selector-tabs">
          <button class="tab-btn ${this.view === 'all' ? 'active' : ''}" data-view="all">
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
      
      ${this.renderViewContent()}
      
      <div class="selector-footer">
        <div class="selection-info">
          ${this.getSelectionSummary()}
        </div>
        <button class="generate-btn ${this.isReadyToGenerate() ? 'active' : ''}" 
                ${!this.isReadyToGenerate() ? 'disabled' : ''}>
          Generate Reply
        </button>
      </div>
    `;

    this.attachEventListeners();
    this.updateWarnings(); // Initial warning check
  }

  /**
   * Render content based on current view
   */
  private renderViewContent(): string {
    switch (this.view) {
      case 'smart':
        return this.renderSmartView();
      case 'favorites':
        return this.renderFavoritesView();
      case 'imagegen':
        return this.renderImageGenView();
      case 'custom':
        return this.renderCustomView();
      default:
        return this.renderFiveStepView();
    }
  }

  /**
   * Render the five-step view (main "All" tab)
   */
  private renderFiveStepView(): string {
    return `
      <div class="selector-content five-step-view">
        ${this.renderCategory('personaFraming', 'Step 1: Persona & Framing', REPLY_OPTIONS.personaFraming)}
        ${this.renderCategoryWithSubgroups('attitude', 'Step 2: Attitude', REPLY_OPTIONS.attitude)}
        ${this.renderCategoryWithSubgroups('rhetoric', 'Step 3: Rhetoric', REPLY_OPTIONS.rhetoric)}
        ${this.renderCategoryWithSubgroups('vocabulary', 'Step 4: Vocabulary', REPLY_OPTIONS.vocabulary)}
        ${this.renderCategory('formatPacing', 'Step 5: Format & Pacing', REPLY_OPTIONS.formatPacing)}
      </div>
    `;
  }

  /**
   * Render a category without subgroups
   */
  private renderCategory(key: string, title: string, options: ReplyOption[]): string {
    return `
      <div class="selector-category">
        <h3 class="category-title">${title}</h3>
        <div class="options-grid">
          ${options.map(opt => this.renderOptionButton(opt, key)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render a category with subgroups
   */
  private renderCategoryWithSubgroups(key: string, title: string, subgroups: any): string {
    let html = `<div class="selector-category"><h3 class="category-title">${title}</h3>`;
    
    for (const subKey in subgroups) {
      // Convert camelCase to Title Case
      const subTitle = subKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
      
      html += `<h4 class="category-subtitle">${subTitle}</h4>`;
      html += `<div class="options-grid">${subgroups[subKey].map((opt: ReplyOption) => 
        this.renderOptionButton(opt, key)).join('')}</div>`;
    }
    
    html += `</div>`;
    return html;
  }

  /**
   * Render an individual option button
   */
  private renderOptionButton(option: ReplyOption, categoryKey: string): string {
    const isSelected = this.selections[categoryKey as keyof typeof this.selections] === option.id;
    const hasConflict = this.hasConflict(option.id);
    
    return `
      <button class="option-button ${isSelected ? 'selected' : ''} ${hasConflict ? 'conflicting' : ''}" 
              data-id="${option.id}" 
              data-category="${categoryKey}" 
              title="${option.description}">
        ${option.label}
        ${hasConflict ? '<span class="conflict-warning" title="May conflict with your other selections">⚠️</span>' : ''}
      </button>
    `;
  }

  /**
   * Check if an option has conflicts with current selections
   */
  private hasConflict(optionId: string): boolean {
    const allSelectedIds = Object.values(this.selections).filter(Boolean) as string[];
    const allOptionsFlat = this.getAllOptionsFlat();
    
    const optionData = allOptionsFlat.find(opt => opt.id === optionId);
    if (!optionData || !optionData.incompatibleWith || optionData.incompatibleWith.length === 0) {
      return false;
    }
    
    return allSelectedIds.some(selectedId => 
      optionData.incompatibleWith.includes(selectedId)
    );
  }

  /**
   * Get all options in a flat array
   */
  private getAllOptionsFlat(): ReplyOption[] {
    // Return cached result if available
    if (this.flatOptionsCache) {
      return this.flatOptionsCache;
    }
    
    const flat: ReplyOption[] = [];
    
    // Add persona & framing
    flat.push(...REPLY_OPTIONS.personaFraming);
    
    // Add attitude options
    Object.values(REPLY_OPTIONS.attitude).forEach(subgroup => {
      flat.push(...subgroup);
    });
    
    // Add rhetoric options
    Object.values(REPLY_OPTIONS.rhetoric).forEach(subgroup => {
      flat.push(...subgroup);
    });
    
    // Add vocabulary options
    Object.values(REPLY_OPTIONS.vocabulary).forEach(subgroup => {
      flat.push(...subgroup);
    });
    
    // Add format & pacing
    flat.push(...REPLY_OPTIONS.formatPacing);
    
    // Cache the result
    this.flatOptionsCache = flat;
    
    return flat;
  }

  /**
   * Update warning states for all options
   */
  private updateWarnings(): void {
    if (!this.container) return;
    
    const allSelectedIds = Object.values(this.selections).filter(Boolean) as string[];
    const allOptionsFlat = this.getAllOptionsFlat();
    
    this.container.querySelectorAll('.option-button').forEach(button => {
      const buttonElement = button as HTMLElement;
      const optionId = buttonElement.dataset.id;
      
      if (!optionId) return;
      
      // Remove existing warning
      const existingWarning = buttonElement.querySelector('.conflict-warning');
      if (existingWarning) {
        existingWarning.remove();
      }
      buttonElement.classList.remove('conflicting');
      
      // Find option data
      const optionData = allOptionsFlat.find(opt => opt.id === optionId);
      if (!optionData || !optionData.incompatibleWith || optionData.incompatibleWith.length === 0) {
        return;
      }
      
      // Check for conflicts
      const isConflicting = allSelectedIds.some(selectedId => 
        optionData.incompatibleWith.includes(selectedId)
      );
      
      // Add warning if conflicting and not selected
      if (isConflicting && !buttonElement.classList.contains('selected')) {
        const warningIcon = document.createElement('span');
        warningIcon.className = 'conflict-warning';
        warningIcon.textContent = ' ⚠️';
        warningIcon.title = 'May conflict with your other selections';
        
        buttonElement.appendChild(warningIcon);
        buttonElement.classList.add('conflicting');
      }
    });
  }

  /**
   * Get selection summary for footer
   */
  private getSelectionSummary(): string {
    const selections = [];
    const allOptionsFlat = this.getAllOptionsFlat();
    
    for (const [category, id] of Object.entries(this.selections)) {
      if (id) {
        const option = allOptionsFlat.find(opt => opt.id === id);
        if (option) {
          const categoryLabel = category.replace(/([A-Z])/g, ' $1').trim();
          selections.push(`<span class="selected-item" title="${categoryLabel}">${option.label.split(' ')[0]}</span>`);
        }
      }
    }
    
    return selections.length > 0 ? selections.join(' ') : '<span style="color: #8b98a5;">Select options from each step</span>';
  }

  /**
   * Check if ready to generate
   */
  private isReadyToGenerate(): boolean {
    // Require at least 2 selections from different categories to generate
    const selectedCount = Object.values(this.selections).filter(v => v !== null).length;
    return selectedCount >= 2;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;
    
    // Tab switching
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = (e.currentTarget as HTMLElement).dataset.view as any;
        if (view) {
          this.view = view;
          this.render();
        }
      });
    });
    
    // Close button
    this.container.querySelector('.close-btn')?.addEventListener('click', () => {
      this.hide();
    });
    
    // Option buttons
    this.container.querySelectorAll('.option-button').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleOptionClick(e as MouseEvent));
    });
    
    // Generate button
    this.container.querySelector('.generate-btn')?.addEventListener('click', () => {
      if (this.isReadyToGenerate()) {
        this.handleGenerate();
      }
    });
  }

  /**
   * Handle option click
   */
  private handleOptionClick(event: MouseEvent): void {
    const button = event.currentTarget as HTMLElement;
    const optionId = button.dataset.id;
    const category = button.dataset.category;
    
    if (!optionId || !category) return;
    
    // Toggle selection
    if (this.selections[category as keyof typeof this.selections] === optionId) {
      this.selections[category as keyof typeof this.selections] = null; // Deselect
    } else {
      this.selections[category as keyof typeof this.selections] = optionId; // Select
    }
    
    // Update UI
    this.updateSelectedVisuals();
    this.updateWarnings();
    this.updateFooter();
  }

  /**
   * Update selected visual states
   */
  private updateSelectedVisuals(): void {
    if (!this.container) return;
    
    const allButtons = this.container.querySelectorAll('.option-button');
    allButtons.forEach(button => {
      const optionId = button.getAttribute('data-id');
      const category = button.getAttribute('data-category');
      if (optionId && category) {
        button.classList.toggle('selected', 
          this.selections[category as keyof typeof this.selections] === optionId);
      }
    });
  }

  /**
   * Update footer with selections
   */
  private updateFooter(): void {
    if (!this.container) return;
    
    const selectionInfo = this.container.querySelector('.selection-info');
    const generateBtn = this.container.querySelector('.generate-btn');
    
    if (selectionInfo) {
      selectionInfo.innerHTML = this.getSelectionSummary();
    }
    
    if (generateBtn) {
      const ready = this.isReadyToGenerate();
      generateBtn.classList.toggle('active', ready);
      if (ready) {
        generateBtn.removeAttribute('disabled');
      } else {
        generateBtn.setAttribute('disabled', 'true');
      }
    }
  }

  /**
   * Handle generate button click
   */
  private handleGenerate(): void {
    if (!this.onSelectCallback) return;
    
    const allOptionsFlat = this.getAllOptionsFlat();
    const combinedPrompts: string[] = [];
    
    // Collect selected prompts in order
    const categoryOrder: (keyof typeof this.selections)[] = [
      'personaFraming', 'attitude', 'rhetoric', 'vocabulary', 'formatPacing'
    ];
    
    for (const category of categoryOrder) {
      const selectedId = this.selections[category];
      if (selectedId) {
        const selectedOption = allOptionsFlat.find(opt => opt.id === selectedId);
        if (selectedOption && selectedOption.prompt) {
          combinedPrompts.push(selectedOption.prompt);
        }
      }
    }
    
    const result: FiveStepSelectionResult = {
      selections: { ...this.selections },
      combinedPrompts,
      temperature: 0.7 // Default temperature
    };
    
    // Hide immediately when generating starts
    this.hide();
    
    // Trigger callback
    this.onSelectCallback(result);
    
    // Show visual feedback
    visualFeedback.showToast('Generating reply...', { type: 'success', duration: 2000 });
  }

  /**
   * Render smart suggestions view (placeholder for now)
   */
  private renderSmartView(): string {
    return `
      <div class="selector-content smart-view">
        <div class="empty-state">
          <p>🤖 Smart suggestions coming soon!</p>
          <p>AI will analyze context and suggest optimal combinations.</p>
        </div>
      </div>
    `;
  }

  /**
   * Render favorites view (placeholder for now)
   */
  private renderFavoritesView(): string {
    return `
      <div class="selector-content favorites-view">
        <div class="empty-state">
          <p>⭐ Favorites coming soon!</p>
          <p>Save your favorite combinations for quick access.</p>
        </div>
      </div>
    `;
  }

  /**
   * Render image generation view (existing functionality)
   */
  private renderImageGenView(): string {
    return `
      <div class="selector-content imagegen-view">
        <div class="image-gen-container">
          <h3>🖼️ Image Generation</h3>
          <p>Generate AI images or search the web for images to include in your reply.</p>
          <div class="image-gen-options">
            <button class="image-option-btn" data-image-action="search">🔍 Search Web</button>
            <button class="image-option-btn" data-image-action="generate">🎨 Generate AI</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render custom view (placeholder for now)
   */
  private renderCustomView(): string {
    return `
      <div class="selector-content custom-view">
        <div class="custom-template-form">
          <h3>✨ Custom Template</h3>
          <div class="form-group">
            <label>Style Prompt</label>
            <textarea placeholder="Describe the writing style..." rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>Tone Prompt</label>
            <textarea placeholder="Describe the tone and personality..." rows="3"></textarea>
          </div>
          <button class="apply-custom-btn">Apply Custom Settings</button>
        </div>
      </div>
    `;
  }

  /**
   * Apply styles to the container
   */
  private applyStyles(): void {
    if (!this.container) return;
    
    // Base styles
    Object.assign(this.container.style, {
      position: 'fixed',
      zIndex: '10000',
      width: '560px',
      maxWidth: '95vw',
      maxHeight: '600px',
      backgroundColor: 'rgba(21, 32, 43, 0.98)',
      border: '1px solid rgba(139, 152, 165, 0.3)',
      borderRadius: '16px',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
      display: 'none',
      flexDirection: 'column',
      backdropFilter: 'blur(20px)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#e7e9ea'
    });
    
    // Add internal styles
    const style = document.createElement('style');
    style.textContent = `
      .tweetcraft-unified-selector * {
        box-sizing: border-box;
      }
      
      .selector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(139, 152, 165, 0.2);
      }
      
      .selector-tabs {
        display: flex;
        gap: 4px;
      }
      
      .tab-btn {
        padding: 6px 12px;
        background: transparent;
        border: none;
        color: #8b98a5;
        cursor: pointer;
        border-radius: 8px;
        font-size: 13px;
        transition: all 0.2s;
      }
      
      .tab-btn:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .tab-btn.active {
        background: rgba(29, 155, 240, 0.1);
        color: #1d9bf0;
      }
      
      .close-btn {
        background: transparent;
        border: none;
        color: #8b98a5;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .close-btn:hover {
        color: #e7e9ea;
      }
      
      .selector-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }
      
      .five-step-view {
        max-height: 480px;
        overflow-y: auto;
      }
      
      .five-step-view::-webkit-scrollbar {
        width: 8px;
      }
      
      .five-step-view::-webkit-scrollbar-track {
        background: rgba(139, 152, 165, 0.1);
        border-radius: 4px;
      }
      
      .five-step-view::-webkit-scrollbar-thumb {
        background: rgba(139, 152, 165, 0.3);
        border-radius: 4px;
      }
      
      .five-step-view::-webkit-scrollbar-thumb:hover {
        background: rgba(139, 152, 165, 0.5);
      }
      
      .selector-category {
        margin-bottom: 20px;
      }
      
      .category-title {
        color: #1d9bf0;
        font-size: 14px;
        font-weight: 600;
        margin: 0 0 12px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(139, 152, 165, 0.2);
      }
      
      .category-subtitle {
        color: #8b98a5;
        font-size: 12px;
        font-weight: 500;
        margin: 12px 0 8px 0;
        text-transform: capitalize;
      }
      
      .options-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-bottom: 8px;
      }
      
      @media (max-width: 480px) {
        .options-grid {
          grid-template-columns: 1fr;
        }
      }
      
      .option-button {
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(139, 152, 165, 0.2);
        border-radius: 8px;
        color: #e7e9ea;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
        text-align: left;
        position: relative;
      }
      
      .option-button:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(139, 152, 165, 0.4);
      }
      
      .option-button.selected {
        background: rgba(29, 155, 240, 0.15);
        border-color: #1d9bf0;
        color: #1d9bf0;
      }
      
      .option-button.conflicting {
        opacity: 0.65;
        border-style: dashed;
        border-color: #FFA500;
      }
      
      .option-button.conflicting:hover {
        opacity: 1;
      }
      
      .conflict-warning {
        color: #FFA500;
        font-weight: bold;
        pointer-events: none;
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
      }
      
      .selector-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-top: 1px solid rgba(139, 152, 165, 0.2);
        background: rgba(0, 0, 0, 0.2);
      }
      
      .selection-info {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        flex: 1;
      }
      
      .selected-item {
        padding: 4px 8px;
        background: rgba(29, 155, 240, 0.1);
        border-radius: 4px;
        font-size: 12px;
        color: #1d9bf0;
      }
      
      .generate-btn {
        padding: 8px 20px;
        background: rgba(139, 152, 165, 0.3);
        border: none;
        border-radius: 20px;
        color: #8b98a5;
        cursor: not-allowed;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s;
      }
      
      .generate-btn.active {
        background: #1d9bf0;
        color: white;
        cursor: pointer;
      }
      
      .generate-btn.active:hover {
        background: #1a8cd8;
      }
      
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #8b98a5;
      }
      
      .empty-state p {
        margin: 8px 0;
      }
    `;
    
    document.head.appendChild(style);
  }
}

// Export singleton instance
export const unifiedSelector = new UnifiedSelector();
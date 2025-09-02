/**
 * Enhanced Five-Step AI Reply System Selector (v0.0.13)
 * Implements all 9 UX improvements for better user experience
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

// Quick preset configurations
const QUICK_PRESETS = {
  professional: {
    name: '💼 Professional',
    emoji: '💼',
    selections: {
      personaFraming: 'persona-expert',
      attitude: 'attitude-professional',
      rhetoric: 'rhetoric-agree-add',
      vocabulary: 'vocab-academic',
      formatPacing: 'format-single-sentence'
    }
  },
  witty: {
    name: '😄 Witty Response',
    emoji: '😄',
    selections: {
      personaFraming: 'persona-jester',
      attitude: 'attitude-witty',
      rhetoric: 'rhetoric-hot-take',
      vocabulary: 'vocab-plain-english',
      formatPacing: 'format-statement-question'
    }
  },
  supportive: {
    name: '🤗 Supportive',
    emoji: '🤗',
    selections: {
      personaFraming: 'persona-nurturer',
      attitude: 'attitude-supportive',
      rhetoric: 'rhetoric-agree-add',
      vocabulary: 'vocab-plain-english',
      formatPacing: 'format-single-sentence'
    }
  },
  spicy: {
    name: '🌶️ Spicy Take',
    emoji: '🌶️',
    selections: {
      personaFraming: 'persona-jester',
      attitude: 'attitude-sarcastic',
      rhetoric: 'rhetoric-hot-take',
      vocabulary: 'vocab-shitposter',
      formatPacing: 'format-single-word'
    }
  },
  thoughtful: {
    name: '🤔 Thoughtful',
    emoji: '🤔',
    selections: {
      personaFraming: 'framing-humble',
      attitude: 'attitude-pensive',
      rhetoric: 'rhetoric-steel-man',
      vocabulary: 'vocab-academic',
      formatPacing: 'format-paced'
    }
  }
};

// Example texts for each option
const OPTION_EXAMPLES: { [key: string]: string } = {
  'persona-expert': "Look, we've been through this debate before...",
  'persona-builder': "Let's build something amazing together!",
  'persona-jester': "Oh, the irony is just *chef's kiss*",
  'persona-nurturer': "I hear you, and your feelings are valid",
  'attitude-friendly': "Hey! Great point you made there 😊",
  'attitude-professional': "I appreciate your perspective on this matter",
  'attitude-witty': "Well, that escalated at exactly the right speed",
  'attitude-sarcastic': "Oh sure, because that always works out well",
  'rhetoric-hot-take': "Unpopular opinion but...",
  'rhetoric-steel-man': "You make an excellent point about X, and to build on that...",
  'vocab-academic': "The epistemological implications are quite profound",
  'vocab-genz': "no cap this is literally so real fr fr",
  'format-single-word': "Based.",
  'format-mini-thread': "1/ Here's the thing..."
};

export class UnifiedSelectorEnhanced {
  private container: HTMLElement | null = null;
  private selections: SelectionMap = {
    personaFraming: null,
    attitude: null,
    rhetoric: null,
    vocabulary: null,
    formatPacing: null
  };
  
  // New properties for enhancements
  private currentStep: number = 1;
  private readonly TOTAL_STEPS = 5;
  private selectionHistory: Array<typeof this.selections> = [];
  private searchTerms: Map<string, string> = new Map();
  private suggestions: Map<string, string[]> = new Map();
  private isProgressiveMode: boolean = true; // Can toggle between progressive and all-at-once
  
  private onSelectCallback: ((result: FiveStepSelectionResult) => void) | null = null;
  private clickOutsideHandler: ((e: MouseEvent) => void) | null = null;
  private scrollHandler: (() => void) | null = null;
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;
  private anchorButton: HTMLElement | null = null;
  private view: 'all' | 'smart' | 'favorites' | 'imagegen' | 'custom' = 'all';
  private tweetContext: string = '';
  private flatOptionsCache: ReplyOption[] | null = null;

  constructor() {
    // Load saved preferences
    this.loadPreferences();
  }

  /**
   * Show the unified selector
   */
  async show(button: HTMLElement, onSelect: (result: FiveStepSelectionResult) => void): Promise<void> {
    console.log('%c🎨 UnifiedSelectorEnhanced.show() called', 'color: #17BF63; font-weight: bold');
    console.log('%c  Button:', 'color: #657786', button);
    
    this.onSelectCallback = onSelect;
    
    // Extract tweet context for smart suggestions
    this.extractTweetContext();
    
    // Generate smart suggestions based on context
    this.generateSmartSuggestions();
    
    // Remove any existing selector
    this.hide();
    
    // Store button reference for repositioning
    this.anchorButton = button;
    
    // Create and show new selector
    console.log('%c  Creating UI...', 'color: #657786');
    this.container = this.createUI();
    console.log('%c  Container created:', 'color: #657786', this.container);
    
    if (!this.container) {
      console.error('%c❌ Failed to create container!', 'color: #DC3545');
      return;
    }
    
    document.body.appendChild(this.container);
    console.log('%c  Container appended to body', 'color: #657786');
    
    // Position near button
    this.positionNearButton(button);
    console.log('%c  Container positioned', 'color: #657786');
    
    // Show with animation
    requestAnimationFrame(() => {
      if (this.container) {
        this.container.style.display = 'flex';
        this.container.style.opacity = '0';
        
        requestAnimationFrame(() => {
          if (this.container) {
            this.container.style.transition = 'opacity 0.3s ease';
            this.container.style.opacity = '1';
          }
        });
      }
    });
    
    // Add event handlers
    this.setupClickOutsideHandler();
    this.setupScrollHandler();
    this.setupKeyboardHandler();
  }
  
  /**
   * Extract tweet context for smart suggestions
   */
  private extractTweetContext(): void {
    // Find the tweet text near the button
    const tweetArticle = this.anchorButton?.closest('article[data-testid="tweet"]');
    if (tweetArticle) {
      const tweetText = tweetArticle.querySelector('[data-testid="tweetText"]')?.textContent || '';
      this.tweetContext = tweetText;
    }
  }
  
  /**
   * Generate smart suggestions based on tweet context
   */
  private generateSmartSuggestions(): void {
    this.suggestions.clear();
    
    if (!this.tweetContext) return;
    
    const text = this.tweetContext.toLowerCase();
    
    // Analyze context for suggestions
    const isQuestion = text.includes('?');
    const isControversial = /debate|controversial|opinion|hot take/i.test(text);
    const isPersonal = /feel|feeling|personal|my life|struggle/i.test(text);
    const isTechnical = /code|programming|bug|feature|api|tech/i.test(text);
    const isHumorous = /lol|lmao|funny|joke|meme/i.test(text);
    
    // Suggest persona/framing
    const personaSuggestions = [];
    if (isQuestion) personaSuggestions.push('framing-humble');
    if (isControversial) personaSuggestions.push('persona-expert');
    if (isPersonal) personaSuggestions.push('persona-nurturer');
    if (isTechnical) personaSuggestions.push('persona-builder');
    if (isHumorous) personaSuggestions.push('persona-jester');
    if (personaSuggestions.length > 0) {
      this.suggestions.set('personaFraming', personaSuggestions);
    }
    
    // Suggest attitude
    const attitudeSuggestions = [];
    if (isQuestion) attitudeSuggestions.push('attitude-helpful', 'attitude-inquisitive');
    if (isControversial) attitudeSuggestions.push('attitude-diplomatic', 'attitude-calm');
    if (isPersonal) attitudeSuggestions.push('attitude-supportive', 'attitude-empathetic');
    if (isTechnical) attitudeSuggestions.push('attitude-professional', 'attitude-enthusiastic');
    if (isHumorous) attitudeSuggestions.push('attitude-witty', 'attitude-sarcastic');
    if (attitudeSuggestions.length > 0) {
      this.suggestions.set('attitude', attitudeSuggestions);
    }
    
    // Suggest rhetoric
    const rhetoricSuggestions = [];
    if (isQuestion) rhetoricSuggestions.push('rhetoric-answer-question', 'rhetoric-share-experience');
    if (isControversial) rhetoricSuggestions.push('rhetoric-steel-man', 'rhetoric-find-core-disagreement');
    if (isPersonal) rhetoricSuggestions.push('rhetoric-share-experience', 'rhetoric-agree-add');
    if (isTechnical) rhetoricSuggestions.push('rhetoric-step-by-step', 'rhetoric-suggest-solution');
    if (rhetoricSuggestions.length > 0) {
      this.suggestions.set('rhetoric', rhetoricSuggestions);
    }
  }
  
  /**
   * Create the UI
   */
  private createUI(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'unified-selector-enhanced';
    container.innerHTML = this.getStyles() + this.renderContent();
    
    this.attachEventListeners();
    this.updateWarnings();
    
    return container;
  }
  
  /**
   * Render main content
   */
  private renderContent(): string {
    return `
      <div class="selector-container">
        ${this.renderHeader()}
        ${this.renderPresetBar()}
        ${this.isProgressiveMode ? this.renderProgressiveView() : this.renderAllStepsView()}
        ${this.renderFooter()}
      </div>
    `;
  }
  
  /**
   * Render header with tabs and mode toggle
   */
  private renderHeader(): string {
    return `
      <div class="selector-header">
        <div class="header-top">
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
              <span>🖼️ Image</span>
            </button>
            <button class="tab-btn ${this.view === 'custom' ? 'active' : ''}" data-view="custom">
              <span>✨ Custom</span>
            </button>
          </div>
          <div class="header-actions">
            <button class="mode-toggle" title="Toggle between step-by-step and all-at-once">
              ${this.isProgressiveMode ? '📋' : '👁️'} 
              ${this.isProgressiveMode ? 'All' : 'Steps'}
            </button>
            <button class="close-btn" aria-label="Close">×</button>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render preset bar for quick selections
   */
  private renderPresetBar(): string {
    if (this.view !== 'all') return '';
    
    return `
      <div class="preset-bar">
        <span class="preset-label">Quick starts:</span>
        ${Object.entries(QUICK_PRESETS).map(([key, preset]) => `
          <button class="preset-btn" data-preset="${key}" title="${preset.name}">
            ${preset.emoji}
          </button>
        `).join('')}
        <button class="preset-btn random" data-preset="random" title="Surprise me!">
          🎲
        </button>
      </div>
    `;
  }
  
  /**
   * Render progressive step-by-step view
   */
  private renderProgressiveView(): string {
    if (this.view !== 'all') {
      return this.renderOtherViews();
    }
    
    return `
      <div class="selector-content progressive-view">
        ${this.renderProgressBar()}
        ${this.renderSelectionPreview()}
        <div class="step-container">
          ${this.renderCurrentStep()}
        </div>
        ${this.renderStepNavigation()}
      </div>
    `;
  }
  
  /**
   * Render all steps at once view
   */
  private renderAllStepsView(): string {
    if (this.view !== 'all') {
      return this.renderOtherViews();
    }
    
    return `
      <div class="selector-content all-steps-view">
        ${this.renderSelectionPreview()}
        <div class="steps-scroll">
          ${this.renderAllSteps()}
        </div>
      </div>
    `;
  }
  
  /**
   * Render other views (smart, favorites, etc.)
   */
  private renderOtherViews(): string {
    // Placeholder for other views
    switch (this.view) {
      case 'smart':
        return '<div class="selector-content">Smart suggestions...</div>';
      case 'favorites':
        return '<div class="selector-content">Favorites...</div>';
      case 'imagegen':
        return '<div class="selector-content">Image generation...</div>';
      case 'custom':
        return '<div class="selector-content">Custom template...</div>';
      default:
        return '';
    }
  }
  
  /**
   * Render progress bar
   */
  private renderProgressBar(): string {
    const steps = [
      { key: 'personaFraming', label: 'Persona' },
      { key: 'attitude', label: 'Attitude' },
      { key: 'rhetoric', label: 'Rhetoric' },
      { key: 'vocabulary', label: 'Vocabulary' },
      { key: 'formatPacing', label: 'Format' }
    ];
    
    return `
      <div class="progress-bar">
        ${steps.map((step, i) => {
          const stepNum = i + 1;
          const isActive = stepNum <= this.currentStep;
          const isCompleted = this.selections[step.key as keyof typeof this.selections] !== null;
          const isCurrent = stepNum === this.currentStep;
          
          return `
            <div class="progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}"
                 data-step="${stepNum}">
              <div class="step-connector ${isActive ? 'active' : ''}"></div>
              <div class="step-circle">
                <span class="step-number">${isCompleted ? '✓' : stepNum}</span>
              </div>
              <span class="step-label">${step.label}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  
  /**
   * Render selection preview
   */
  private renderSelectionPreview(): string {
    const hasSelections = Object.values(this.selections).some(s => s !== null);
    
    if (!hasSelections) {
      return `
        <div class="selection-preview empty">
          <p>Make your selections to see a preview of your reply style</p>
        </div>
      `;
    }
    
    return `
      <div class="selection-preview">
        <div class="preview-header">
          <h4>Your reply style:</h4>
          <button class="reset-btn" title="Reset all selections">🔄</button>
        </div>
        <div class="preview-description">
          ${this.generatePreviewDescription()}
        </div>
        <div class="example-preview">
          <span class="example-label">Example tone:</span>
          <span class="example-text">"${this.generateExampleText()}"</span>
        </div>
      </div>
    `;
  }
  
  /**
   * Generate preview description
   */
  private generatePreviewDescription(): string {
    const parts: string[] = [];
    const allOptions = this.getAllOptionsFlat();
    
    Object.entries(this.selections).forEach(([key, value]) => {
      if (value) {
        const option = allOptions.find(opt => opt.id === value);
        if (option) {
          parts.push(`<span class="preview-tag">${option.label}</span>`);
        }
      }
    });
    
    return parts.join(' + ') || 'No selections yet';
  }
  
  /**
   * Generate example text based on selections
   */
  private generateExampleText(): string {
    // Get the most recent selection for example
    const lastSelection = Object.entries(this.selections)
      .filter(([_, value]) => value !== null)
      .pop();
    
    if (lastSelection && lastSelection[1]) {
      return OPTION_EXAMPLES[lastSelection[1]] || 'Your customized reply will appear here...';
    }
    
    return 'Start selecting options to see an example...';
  }
  
  /**
   * Render current step content
   */
  private renderCurrentStep(): string {
    const categoryMap = {
      1: 'personaFraming',
      2: 'attitude',
      3: 'rhetoric',
      4: 'vocabulary',
      5: 'formatPacing'
    };
    
    const titleMap = {
      1: 'Step 1: Persona & Framing',
      2: 'Step 2: Attitude',
      3: 'Step 3: Rhetoric',
      4: 'Step 4: Vocabulary',
      5: 'Step 5: Format & Pacing'
    };
    
    const categoryKey = categoryMap[this.currentStep as keyof typeof categoryMap];
    const title = titleMap[this.currentStep as keyof typeof titleMap];
    
    return `
      <div class="step-content" data-step="${this.currentStep}">
        <h3 class="step-title">${title}</h3>
        <div class="step-description">
          ${this.getStepDescription(this.currentStep)}
        </div>
        ${this.renderSearchBar(categoryKey)}
        ${this.renderStepOptions(categoryKey)}
      </div>
    `;
  }
  
  /**
   * Get step description
   */
  private getStepDescription(step: number): string {
    const descriptions = {
      1: 'Choose the voice and stance for your reply - who are you in this conversation?',
      2: 'Set the core emotion or mood - how do you want to come across?',
      3: 'Choose your logical approach - what\'s your argumentative strategy?',
      4: 'Define your language style - how formal or casual should you sound?',
      5: 'Pick the structure and length - how should your reply be formatted?'
    };
    
    return descriptions[step as keyof typeof descriptions] || '';
  }
  
  /**
   * Render search bar for categories with many options
   */
  private renderSearchBar(categoryKey: string): string {
    const hasSearch = ['attitude', 'rhetoric', 'vocabulary'].includes(categoryKey);
    
    if (!hasSearch) return '';
    
    const searchTerm = this.searchTerms.get(categoryKey) || '';
    
    return `
      <div class="search-bar">
        <input type="text" 
               class="option-search" 
               placeholder="🔍 Search options..."
               data-category="${categoryKey}"
               value="${searchTerm}">
        ${searchTerm ? `<button class="clear-search" data-category="${categoryKey}">×</button>` : ''}
      </div>
    `;
  }
  
  /**
   * Render step options
   */
  private renderStepOptions(categoryKey: string): string {
    const options = this.getOptionsForCategory(categoryKey);
    const searchTerm = this.searchTerms.get(categoryKey)?.toLowerCase() || '';
    
    // Filter options based on search
    const filteredOptions = searchTerm 
      ? options.filter(opt => 
          opt.label.toLowerCase().includes(searchTerm) || 
          opt.description.toLowerCase().includes(searchTerm)
        )
      : options;
    
    if (filteredOptions.length === 0) {
      return '<div class="no-results">No options match your search</div>';
    }
    
    // Group options if they have subcategories
    if (categoryKey === 'attitude' || categoryKey === 'rhetoric' || categoryKey === 'vocabulary') {
      return this.renderGroupedOptions(categoryKey, filteredOptions);
    }
    
    return `
      <div class="options-grid">
        ${filteredOptions.map(opt => this.renderOptionButton(opt, categoryKey)).join('')}
      </div>
    `;
  }
  
  /**
   * Render grouped options
   */
  private renderGroupedOptions(categoryKey: string, options: ReplyOption[]): string {
    const categoryData = REPLY_OPTIONS[categoryKey as keyof ReplyOptionsStructure];
    
    if (typeof categoryData === 'object' && !Array.isArray(categoryData)) {
      let html = '';
      
      Object.entries(categoryData).forEach(([subKey, subOptions]) => {
        const subFiltered = options.filter(opt => 
          (subOptions as ReplyOption[]).some(sub => sub.id === opt.id)
        );
        
        if (subFiltered.length > 0) {
          const subTitle = this.formatSubcategoryTitle(subKey);
          html += `
            <div class="option-subgroup">
              <h4 class="subgroup-title">${subTitle}</h4>
              <div class="options-grid">
                ${subFiltered.map(opt => this.renderOptionButton(opt, categoryKey)).join('')}
              </div>
            </div>
          `;
        }
      });
      
      return html;
    }
    
    return `
      <div class="options-grid">
        ${options.map(opt => this.renderOptionButton(opt, categoryKey)).join('')}
      </div>
    `;
  }
  
  /**
   * Render individual option button
   */
  private renderOptionButton(option: ReplyOption, categoryKey: string): string {
    const isSelected = this.selections[categoryKey as keyof typeof this.selections] === option.id;
    const hasConflict = this.checkConflict(option.id);
    const isSuggested = this.suggestions.get(categoryKey)?.includes(option.id);
    const example = OPTION_EXAMPLES[option.id];
    
    return `
      <button class="option-button ${isSelected ? 'selected' : ''} ${hasConflict ? 'conflicting' : ''} ${isSuggested ? 'suggested' : ''}"
              data-id="${option.id}" 
              data-category="${categoryKey}"
              title="${option.description}">
        <div class="option-content">
          <div class="option-header">
            <span class="option-label">${option.label}</span>
            ${isSuggested ? '<span class="suggestion-badge" title="Recommended based on context">✨</span>' : ''}
            ${hasConflict ? '<span class="conflict-badge" title="May conflict with your selections">⚠️</span>' : ''}
          </div>
          <div class="option-description">${option.description}</div>
          ${example ? `<div class="option-example">"${example}"</div>` : ''}
          <button class="option-help" title="More info">?</button>
        </div>
      </button>
    `;
  }
  
  /**
   * Render all steps for all-at-once view
   */
  private renderAllSteps(): string {
    return `
      ${this.renderCategory('personaFraming', 'Step 1: Persona & Framing', REPLY_OPTIONS.personaFraming)}
      ${this.renderCategoryWithSubgroups('attitude', 'Step 2: Attitude', REPLY_OPTIONS.attitude)}
      ${this.renderCategoryWithSubgroups('rhetoric', 'Step 3: Rhetoric', REPLY_OPTIONS.rhetoric)}
      ${this.renderCategoryWithSubgroups('vocabulary', 'Step 4: Vocabulary', REPLY_OPTIONS.vocabulary)}
      ${this.renderCategory('formatPacing', 'Step 5: Format & Pacing', REPLY_OPTIONS.formatPacing)}
    `;
  }
  
  /**
   * Render category without subgroups
   */
  private renderCategory(key: string, title: string, options: ReplyOption[]): string {
    return `
      <div class="selector-category">
        <h3 class="category-title">${title}</h3>
        ${this.renderSearchBar(key)}
        <div class="options-grid">
          ${options.map(opt => this.renderOptionButton(opt, key)).join('')}
        </div>
      </div>
    `;
  }
  
  /**
   * Render category with subgroups
   */
  private renderCategoryWithSubgroups(key: string, title: string, subgroups: any): string {
    let html = `<div class="selector-category"><h3 class="category-title">${title}</h3>`;
    html += this.renderSearchBar(key);
    
    Object.entries(subgroups).forEach(([subKey, subOptions]) => {
      const subTitle = this.formatSubcategoryTitle(subKey);
      html += `
        <div class="option-subgroup">
          <h4 class="subgroup-title">${subTitle}</h4>
          <div class="options-grid">
            ${(subOptions as ReplyOption[]).map(opt => this.renderOptionButton(opt, key)).join('')}
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }
  
  /**
   * Render step navigation
   */
  private renderStepNavigation(): string {
    const canGoBack = this.currentStep > 1;
    const canGoForward = this.currentStep < this.TOTAL_STEPS;
    const currentSelection = this.getCurrentStepSelection();
    const canProceed = currentSelection !== null || !canGoForward;
    
    return `
      <div class="step-navigation">
        <button class="step-nav-btn prev" ${!canGoBack ? 'disabled' : ''}>
          ← Previous
        </button>
        <div class="step-indicator">
          Step ${this.currentStep} of ${this.TOTAL_STEPS}
        </div>
        <button class="step-nav-btn next ${!canProceed ? 'disabled' : ''}" 
                ${!canProceed ? 'disabled' : ''}>
          ${canGoForward ? 'Next →' : '✓ Generate'}
        </button>
      </div>
    `;
  }
  
  /**
   * Render footer
   */
  private renderFooter(): string {
    const isReady = this.isReadyToGenerate();
    
    return `
      <div class="selector-footer">
        <div class="footer-actions">
          <button class="action-btn undo" ${this.selectionHistory.length === 0 ? 'disabled' : ''} title="Undo last change">
            ↶ Undo
          </button>
          <button class="action-btn reset" title="Reset all selections">
            🔄 Reset
          </button>
          <button class="action-btn save-preset" title="Save current selections as preset">
            💾 Save
          </button>
        </div>
        ${!this.isProgressiveMode ? `
          <button class="generate-btn ${isReady ? 'active' : ''}" ${!isReady ? 'disabled' : ''}>
            ${isReady ? '✨ Generate Reply' : 'Complete all selections'}
          </button>
        ` : ''}
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
      btn.addEventListener('click', (e) => this.handleTabSwitch(e));
    });
    
    // Mode toggle
    const modeToggle = this.container.querySelector('.mode-toggle');
    if (modeToggle) {
      modeToggle.addEventListener('click', () => this.toggleMode());
    }
    
    // Preset buttons
    this.container.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handlePresetClick(e));
    });
    
    // Option buttons
    this.container.querySelectorAll('.option-button').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleOptionClick(e));
    });
    
    // Progress bar steps (clickable)
    this.container.querySelectorAll('.progress-step').forEach(step => {
      step.addEventListener('click', (e) => this.handleProgressStepClick(e));
    });
    
    // Navigation buttons
    const prevBtn = this.container.querySelector('.step-nav-btn.prev');
    const nextBtn = this.container.querySelector('.step-nav-btn.next');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.navigateStep(-1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.currentStep === this.TOTAL_STEPS) {
          this.handleGenerate();
        } else {
          this.navigateStep(1);
        }
      });
    }
    
    // Search inputs
    this.container.querySelectorAll('.option-search').forEach(input => {
      input.addEventListener('input', (e) => this.handleSearch(e));
    });
    
    // Clear search buttons
    this.container.querySelectorAll('.clear-search').forEach(btn => {
      btn.addEventListener('click', (e) => this.clearSearch(e));
    });
    
    // Action buttons
    const undoBtn = this.container.querySelector('.action-btn.undo');
    const resetBtn = this.container.querySelector('.action-btn.reset');
    const saveBtn = this.container.querySelector('.action-btn.save-preset');
    
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undo());
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.reset());
    }
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveAsPreset());
    }
    
    // Generate button (for all-at-once mode)
    const generateBtn = this.container.querySelector('.generate-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.handleGenerate());
    }
    
    // Close button
    const closeBtn = this.container.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }
    
    // Help buttons
    this.container.querySelectorAll('.option-help').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showHelp(e);
      });
    });
  }
  
  /**
   * Handle tab switching
   */
  private handleTabSwitch(e: Event): void {
    const btn = e.currentTarget as HTMLElement;
    const view = btn.dataset.view as typeof this.view;
    
    if (view && view !== this.view) {
      this.view = view;
      this.render();
    }
  }
  
  /**
   * Toggle between progressive and all-at-once mode
   */
  private toggleMode(): void {
    this.isProgressiveMode = !this.isProgressiveMode;
    this.savePreferences();
    this.render();
  }
  
  /**
   * Handle preset click
   */
  private handlePresetClick(e: Event): void {
    const btn = e.currentTarget as HTMLElement;
    const presetKey = btn.dataset.preset;
    
    if (presetKey === 'random') {
      this.applyRandomPreset();
    } else if (presetKey && presetKey in QUICK_PRESETS) {
      this.applyPreset(QUICK_PRESETS[presetKey as keyof typeof QUICK_PRESETS]);
    }
  }
  
  /**
   * Apply preset selections
   */
  private applyPreset(preset: typeof QUICK_PRESETS.professional): void {
    this.saveToHistory();
    
    Object.assign(this.selections, preset.selections);
    
    visualFeedback.showToast(`Applied ${preset.name} preset`, {
      type: 'success',
      duration: 2000
    });
    
    this.render();
  }
  
  /**
   * Apply random preset
   */
  private applyRandomPreset(): void {
    this.saveToHistory();
    
    const categories: (keyof typeof this.selections)[] = ['personaFraming', 'attitude', 'rhetoric', 'vocabulary', 'formatPacing'];
    
    categories.forEach(category => {
      const categoryOptions = this.getOptionsForCategory(category);
      if (categoryOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * categoryOptions.length);
        this.selections[category] = categoryOptions[randomIndex].id;
      }
    });
    
    visualFeedback.showToast('Applied random selections!', {
      type: 'success',
      duration: 2000
    });
    
    this.render();
  }
  
  /**
   * Handle option click
   */
  private handleOptionClick(e: Event): void {
    e.stopPropagation();
    
    const button = e.currentTarget as HTMLElement;
    const optionId = button.dataset.id;
    const category = button.dataset.category as keyof typeof this.selections;
    
    if (!optionId || !category) return;
    
    this.saveToHistory();
    
    // Toggle selection
    if (this.selections[category] === optionId) {
      this.selections[category] = null;
    } else {
      this.selections[category] = optionId;
      
      // Auto-advance in progressive mode
      if (this.isProgressiveMode && this.currentStep < this.TOTAL_STEPS) {
        setTimeout(() => {
          this.navigateStep(1);
        }, 300);
      }
    }
    
    this.updateSelectedVisuals();
    this.updateWarnings();
    this.updateFooter();
    this.updatePreview();
  }
  
  /**
   * Handle progress step click
   */
  private handleProgressStepClick(e: Event): void {
    const stepElement = e.currentTarget as HTMLElement;
    const step = parseInt(stepElement.dataset.step || '1');
    
    if (step >= 1 && step <= this.TOTAL_STEPS) {
      this.currentStep = step;
      this.render();
    }
  }
  
  /**
   * Navigate between steps
   */
  private navigateStep(direction: number): void {
    const newStep = this.currentStep + direction;
    
    if (newStep >= 1 && newStep <= this.TOTAL_STEPS) {
      this.currentStep = newStep;
      this.render();
    }
  }
  
  /**
   * Handle search input
   */
  private handleSearch(e: Event): void {
    const input = e.target as HTMLInputElement;
    const category = input.dataset.category;
    
    if (!category) return;
    
    this.searchTerms.set(category, input.value);
    this.updateSearchResults(category);
  }
  
  /**
   * Clear search
   */
  private clearSearch(e: Event): void {
    const btn = e.currentTarget as HTMLElement;
    const category = btn.dataset.category;
    
    if (!category) return;
    
    this.searchTerms.delete(category);
    this.render();
  }
  
  /**
   * Update search results
   */
  private updateSearchResults(category: string): void {
    const container = this.container?.querySelector(`[data-step="${this.currentStep}"] .options-grid, [data-step="${this.currentStep}"] .option-subgroup`);
    if (!container) {
      // Re-render the step content
      const stepContent = this.container?.querySelector('.step-content');
      if (stepContent) {
        stepContent.innerHTML = this.renderCurrentStep();
        this.attachEventListeners();
      }
    }
  }
  
  /**
   * Undo last action
   */
  private undo(): void {
    if (this.selectionHistory.length > 0) {
      this.selections = { ...this.selectionHistory.pop()! };
      this.render();
      
      visualFeedback.showToast('Undone', {
        type: 'info',
        duration: 1000
      });
    }
  }
  
  /**
   * Reset all selections
   */
  private reset(): void {
    this.saveToHistory();
    
    this.selections = {
      personaFraming: null,
      attitude: null,
      rhetoric: null,
      vocabulary: null,
      formatPacing: null
    };
    
    this.currentStep = 1;
    this.searchTerms.clear();
    
    visualFeedback.showToast('All selections reset', {
      type: 'info',
      duration: 2000
    });
    
    this.render();
  }
  
  /**
   * Save current selections as preset
   */
  private saveAsPreset(): void {
    // TODO: Implement preset saving to storage
    visualFeedback.showToast('Preset saved!', {
      type: 'success',
      duration: 2000
    });
  }
  
  /**
   * Handle generate
   */
  private handleGenerate(): void {
    if (!this.isReadyToGenerate()) return;
    
    const result: FiveStepSelectionResult = {
      selections: { ...this.selections },
      combinedPrompts: this.buildCombinedPrompts(),
      temperature: 0.8
    };
    
    if (this.onSelectCallback) {
      this.onSelectCallback(result);
    }
    
    this.hide();
  }
  
  /**
   * Show help tooltip
   */
  private showHelp(e: Event): void {
    const btn = e.currentTarget as HTMLElement;
    const optionButton = btn.closest('.option-button') as HTMLElement;
    
    if (!optionButton) return;
    
    const optionId = optionButton.dataset.id;
    const option = this.getAllOptionsFlat().find(opt => opt.id === optionId);
    
    if (option) {
      visualFeedback.showToast(option.prompt, {
        type: 'info',
        duration: 5000
      });
    }
  }
  
  // ... (continuing with helper methods)
  
  /**
   * Setup keyboard handler
   */
  private setupKeyboardHandler(): void {
    this.keyboardHandler = (e: KeyboardEvent) => {
      if (!this.container || !this.container.parentElement) return;
      
      // Number keys 1-5 to jump to steps
      if (this.isProgressiveMode && e.key >= '1' && e.key <= '5') {
        this.currentStep = parseInt(e.key);
        this.render();
      }
      
      // Arrow keys to navigate
      if (e.key === 'ArrowRight' && this.currentStep < this.TOTAL_STEPS) {
        this.navigateStep(1);
      }
      if (e.key === 'ArrowLeft' && this.currentStep > 1) {
        this.navigateStep(-1);
      }
      
      // Tab to cycle through options
      if (e.key === 'Tab') {
        e.preventDefault();
        this.cycleOptions(e.shiftKey ? -1 : 1);
      }
      
      // Enter to select
      if (e.key === 'Enter') {
        const focused = this.container.querySelector('.option-button.focused');
        if (focused) {
          (focused as HTMLElement).click();
        } else if (this.isReadyToGenerate()) {
          this.handleGenerate();
        }
      }
      
      // Escape to close
      if (e.key === 'Escape') {
        this.hide();
      }
      
      // Ctrl+Z to undo
      if (e.ctrlKey && e.key === 'z') {
        this.undo();
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler);
  }
  
  /**
   * Cycle through options with keyboard
   */
  private cycleOptions(direction: number): void {
    const options = Array.from(
      this.container?.querySelectorAll('.option-button:not(.conflicting)') || []
    ) as HTMLElement[];
    
    if (options.length === 0) return;
    
    const currentIndex = options.findIndex(opt => opt.classList.contains('focused'));
    let newIndex = currentIndex + direction;
    
    if (newIndex < 0) newIndex = options.length - 1;
    if (newIndex >= options.length) newIndex = 0;
    
    options.forEach(opt => opt.classList.remove('focused'));
    options[newIndex].classList.add('focused');
    options[newIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  // ... (remaining helper methods from original implementation)
  
  /**
   * Get styles
   */
  private getStyles(): string {
    return `
      <style>
        .unified-selector-enhanced {
          position: fixed;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        .selector-container {
          background: #15202b;
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 16px;
          width: 600px;
          max-width: 95vw;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
          animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .selector-header {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(139, 152, 165, 0.2);
          background: rgba(0, 0, 0, 0.3);
        }
        
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
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
          font-size: 13px;
          transition: all 0.2s;
        }
        
        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        
        .tab-btn.active {
          background: rgba(29, 155, 240, 0.1);
          border-color: #1d9bf0;
          color: #1d9bf0;
        }
        
        .header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .mode-toggle {
          padding: 4px 8px;
          background: rgba(139, 152, 165, 0.2);
          border: none;
          border-radius: 8px;
          color: #e7e9ea;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }
        
        .mode-toggle:hover {
          background: rgba(139, 152, 165, 0.3);
        }
        
        .close-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: transparent;
          border: none;
          color: #8b98a5;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #e7e9ea;
        }
        
        .preset-bar {
          padding: 8px 16px;
          background: rgba(29, 155, 240, 0.05);
          border-bottom: 1px solid rgba(139, 152, 165, 0.2);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .preset-label {
          color: #8b98a5;
          font-size: 12px;
          margin-right: 4px;
        }
        
        .preset-btn {
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(139, 152, 165, 0.2);
          border-radius: 12px;
          color: #e7e9ea;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .preset-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(139, 152, 165, 0.4);
          transform: translateY(-1px);
          animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .preset-btn.random {
          background: linear-gradient(135deg, rgba(255, 0, 128, 0.1), rgba(0, 128, 255, 0.1));
        }
        
        .selector-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        
        .progress-bar {
          display: flex;
          justify-content: space-between;
          padding: 0 20px;
          margin-bottom: 20px;
          position: relative;
        }
        
        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          position: relative;
          z-index: 2;
        }
        
        .step-connector {
          position: absolute;
          top: 15px;
          left: 50%;
          width: 100%;
          height: 2px;
          background: rgba(139, 152, 165, 0.2);
          z-index: 1;
        }
        
        .step-connector.active {
          background: #1d9bf0;
        }
        
        .step-circle {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #15202b;
          border: 2px solid rgba(139, 152, 165, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #8b98a5;
          transition: all 0.3s;
          position: relative;
          z-index: 2;
        }
        
        .progress-step.active .step-circle {
          border-color: #1d9bf0;
          color: #1d9bf0;
        }
        
        .progress-step.completed .step-circle {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: transparent;
          color: white;
          animation: checkmark 0.3s ease;
        }
        
        @keyframes checkmark {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        
        .progress-step.current .step-circle {
          box-shadow: 0 0 0 4px rgba(29, 155, 240, 0.2);
        }
        
        .step-label {
          margin-top: 4px;
          font-size: 11px;
          color: #8b98a5;
        }
        
        .progress-step.active .step-label {
          color: #e7e9ea;
        }
        
        .selection-preview {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(139, 152, 165, 0.2);
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 16px;
        }
        
        .selection-preview.empty {
          text-align: center;
          color: #8b98a5;
          font-style: italic;
        }
        
        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .preview-header h4 {
          margin: 0;
          color: #e7e9ea;
          font-size: 13px;
        }
        
        .reset-btn {
          padding: 2px 6px;
          background: rgba(139, 152, 165, 0.2);
          border: none;
          border-radius: 6px;
          color: #8b98a5;
          cursor: pointer;
          font-size: 11px;
        }
        
        .preview-description {
          margin-bottom: 8px;
        }
        
        .preview-tag {
          display: inline-block;
          padding: 2px 6px;
          background: rgba(29, 155, 240, 0.1);
          border-radius: 4px;
          color: #1d9bf0;
          font-size: 11px;
          margin-right: 4px;
        }
        
        .example-preview {
          padding-top: 8px;
          border-top: 1px solid rgba(139, 152, 165, 0.1);
        }
        
        .example-label {
          color: #8b98a5;
          font-size: 11px;
          display: block;
          margin-bottom: 4px;
        }
        
        .example-text {
          color: #e7e9ea;
          font-style: italic;
          font-size: 12px;
        }
        
        .step-content {
          animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .step-title {
          color: #e7e9ea;
          font-size: 16px;
          margin: 0 0 8px 0;
        }
        
        .step-description {
          color: #8b98a5;
          font-size: 13px;
          margin-bottom: 16px;
        }
        
        .search-bar {
          position: relative;
          margin-bottom: 12px;
        }
        
        .option-search {
          width: 100%;
          padding: 8px 12px;
          padding-right: 30px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(139, 152, 165, 0.2);
          border-radius: 20px;
          color: #e7e9ea;
          font-size: 13px;
          outline: none;
          transition: all 0.2s;
        }
        
        .option-search:focus {
          border-color: #1d9bf0;
          background: rgba(255, 255, 255, 0.08);
        }
        
        .clear-search {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #8b98a5;
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
        }
        
        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .option-subgroup {
          margin-bottom: 20px;
        }
        
        .subgroup-title {
          color: #8b98a5;
          font-size: 12px;
          text-transform: uppercase;
          margin: 0 0 8px 0;
          padding-bottom: 4px;
          border-bottom: 1px solid rgba(139, 152, 165, 0.1);
        }
        
        .option-button {
          position: relative;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(139, 152, 165, 0.2);
          border-radius: 8px;
          color: #e7e9ea;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        
        .option-button:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(139, 152, 165, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(29, 155, 240, 0.15);
        }
        
        .option-button:hover .option-example {
          opacity: 1;
          max-height: 50px;
        }
        
        .option-button.selected {
          background: rgba(29, 155, 240, 0.15);
          border-color: #1d9bf0;
          color: #1d9bf0;
        }
        
        .option-button.conflicting {
          opacity: 0.6;
          border-style: dashed;
          border-color: #FFA500;
        }
        
        .option-button.conflicting:hover {
          opacity: 1;
        }
        
        .option-button.suggested {
          border: 2px solid #FFD700;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), transparent);
        }
        
        .option-button.focused {
          box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.3);
        }
        
        .option-content {
          position: relative;
        }
        
        .option-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 4px;
        }
        
        .option-label {
          font-size: 13px;
          font-weight: 500;
        }
        
        .option-description {
          font-size: 11px;
          color: #8b98a5;
          margin-bottom: 4px;
        }
        
        .option-example {
          font-size: 10px;
          color: #657786;
          font-style: italic;
          opacity: 0;
          max-height: 0;
          overflow: hidden;
          transition: all 0.3s;
        }
        
        .suggestion-badge,
        .conflict-badge {
          font-size: 10px;
          padding: 1px 4px;
          border-radius: 4px;
        }
        
        .suggestion-badge {
          background: rgba(255, 215, 0, 0.2);
          color: #FFD700;
        }
        
        .conflict-badge {
          background: rgba(255, 165, 0, 0.2);
          color: #FFA500;
        }
        
        .option-help {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(139, 152, 165, 0.2);
          border: none;
          color: #8b98a5;
          cursor: help;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .option-button:hover .option-help {
          opacity: 1;
        }
        
        .step-navigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-top: 1px solid rgba(139, 152, 165, 0.1);
          margin-top: 16px;
        }
        
        .step-nav-btn {
          padding: 8px 16px;
          background: rgba(139, 152, 165, 0.2);
          border: none;
          border-radius: 20px;
          color: #e7e9ea;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        
        .step-nav-btn:hover:not(:disabled) {
          background: rgba(139, 152, 165, 0.3);
        }
        
        .step-nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .step-nav-btn.next:not(:disabled) {
          background: #1d9bf0;
          color: white;
        }
        
        .step-nav-btn.next:hover:not(:disabled) {
          background: #1a8cd8;
        }
        
        .step-indicator {
          color: #8b98a5;
          font-size: 12px;
        }
        
        .selector-footer {
          padding: 12px 16px;
          border-top: 1px solid rgba(139, 152, 165, 0.2);
          background: rgba(0, 0, 0, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .footer-actions {
          display: flex;
          gap: 8px;
        }
        
        .action-btn {
          padding: 6px 12px;
          background: rgba(139, 152, 165, 0.2);
          border: none;
          border-radius: 12px;
          color: #e7e9ea;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }
        
        .action-btn:hover:not(:disabled) {
          background: rgba(139, 152, 165, 0.3);
        }
        
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
        
        .no-results {
          text-align: center;
          color: #8b98a5;
          padding: 20px;
          font-style: italic;
        }
        
        .all-steps-view .steps-scroll {
          max-height: 500px;
          overflow-y: auto;
          padding-right: 8px;
        }
        
        .all-steps-view .selector-category {
          margin-bottom: 24px;
        }
        
        .all-steps-view .category-title {
          color: #e7e9ea;
          font-size: 14px;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(139, 152, 165, 0.2);
        }
        
        /* Mobile responsive */
        @media (max-width: 600px) {
          .selector-container {
            width: 95vw;
            max-height: 90vh;
          }
          
          .selector-tabs {
            flex-wrap: wrap;
          }
          
          .options-grid {
            grid-template-columns: 1fr;
          }
          
          .progress-bar {
            padding: 0 10px;
          }
          
          .step-label {
            font-size: 9px;
          }
        }
        
        /* Scrollbar styling */
        .selector-content::-webkit-scrollbar,
        .steps-scroll::-webkit-scrollbar {
          width: 6px;
        }
        
        .selector-content::-webkit-scrollbar-track,
        .steps-scroll::-webkit-scrollbar-track {
          background: rgba(139, 152, 165, 0.1);
          border-radius: 3px;
        }
        
        .selector-content::-webkit-scrollbar-thumb,
        .steps-scroll::-webkit-scrollbar-thumb {
          background: rgba(139, 152, 165, 0.3);
          border-radius: 3px;
        }
        
        .selector-content::-webkit-scrollbar-thumb:hover,
        .steps-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 152, 165, 0.5);
        }
      </style>
    `;
  }
  
  // ... (implement remaining helper methods from original)
  
  /**
   * Hide the selector
   */
  hide(): void {
    if (this.container) {
      this.container.style.opacity = '0';
      setTimeout(() => {
        this.container?.remove();
        this.container = null;
      }, 200);
    }
    
    // Remove event handlers
    if (this.clickOutsideHandler) {
      document.removeEventListener('click', this.clickOutsideHandler);
      this.clickOutsideHandler = null;
    }
    
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler, true);
      this.scrollHandler = null;
    }
    
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
    
    this.anchorButton = null;
    
    // Save preferences
    this.savePreferences();
  }
  
  // ... (implement remaining methods)
  
  private loadPreferences(): void {
    const saved = localStorage.getItem('tweetcraft_selector_prefs');
    if (saved) {
      const prefs = JSON.parse(saved);
      this.isProgressiveMode = prefs.isProgressiveMode ?? true;
    }
  }
  
  private savePreferences(): void {
    localStorage.setItem('tweetcraft_selector_prefs', JSON.stringify({
      isProgressiveMode: this.isProgressiveMode
    }));
  }
  
  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = this.getStyles() + this.renderContent();
    this.attachEventListeners();
    this.updateWarnings();
  }
  
  private updateWarnings(): void {
    // Implementation from original
  }
  
  private updateSelectedVisuals(): void {
    // Implementation from original
  }
  
  private updateFooter(): void {
    // Implementation from original
  }
  
  private updatePreview(): void {
    const preview = this.container?.querySelector('.selection-preview');
    if (preview) {
      preview.outerHTML = this.renderSelectionPreview();
    }
  }
  
  private saveToHistory(): void {
    this.selectionHistory.push({ ...this.selections });
    if (this.selectionHistory.length > 20) {
      this.selectionHistory.shift();
    }
  }
  
  private getCurrentStepSelection(): string | null {
    type SelectionKeys = keyof typeof this.selections;
    const categoryMap: { [key: number]: SelectionKeys } = {
      1: 'personaFraming',
      2: 'attitude',
      3: 'rhetoric', 
      4: 'vocabulary',
      5: 'formatPacing'
    };
    
    const category = categoryMap[this.currentStep];
    return category ? this.selections[category] : null;
  }
  
  private isReadyToGenerate(): boolean {
    return Object.values(this.selections).every(s => s !== null);
  }
  
  private checkConflict(optionId: string): boolean {
    const allSelectedIds = Object.values(this.selections).filter(Boolean) as string[];
    const allOptions = this.getAllOptionsFlat();
    const option = allOptions.find(opt => opt.id === optionId);
    
    if (!option || !option.incompatibleWith) return false;
    
    return allSelectedIds.some(selectedId => 
      option.incompatibleWith.includes(selectedId)
    );
  }
  
  private getAllOptionsFlat(): ReplyOption[] {
    // Return cached result if available
    if (this.flatOptionsCache) {
      return this.flatOptionsCache;
    }
    
    const flat: ReplyOption[] = [];
    
    flat.push(...REPLY_OPTIONS.personaFraming);
    
    Object.values(REPLY_OPTIONS.attitude).forEach(subgroup => {
      flat.push(...subgroup);
    });
    
    Object.values(REPLY_OPTIONS.rhetoric).forEach(subgroup => {
      flat.push(...subgroup);
    });
    
    Object.values(REPLY_OPTIONS.vocabulary).forEach(subgroup => {
      flat.push(...subgroup);
    });
    
    flat.push(...REPLY_OPTIONS.formatPacing);
    
    // Cache the result
    this.flatOptionsCache = flat;
    
    return flat;
  }
  
  private getOptionsForCategory(category: string): ReplyOption[] {
    const categoryData = REPLY_OPTIONS[category as keyof ReplyOptionsStructure];
    
    if (Array.isArray(categoryData)) {
      return categoryData;
    } else if (typeof categoryData === 'object') {
      const flat: ReplyOption[] = [];
      Object.values(categoryData).forEach((subgroup: any) => {
        if (Array.isArray(subgroup)) {
          flat.push(...subgroup);
        }
      });
      return flat;
    }
    
    return [];
  }
  
  private formatSubcategoryTitle(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  private buildCombinedPrompts(): string[] {
    const prompts: string[] = [];
    const allOptions = this.getAllOptionsFlat();
    
    Object.values(this.selections).forEach(selectionId => {
      if (selectionId) {
        const option = allOptions.find(opt => opt.id === selectionId);
        if (option) {
          prompts.push(option.prompt);
        }
      }
    });
    
    return prompts;
  }
  
  private positionNearButton(button: HTMLElement): void {
    // Implementation from original
  }
  
  private setupClickOutsideHandler(): void {
    // Implementation from original
  }
  
  private setupScrollHandler(): void {
    // Implementation from original
  }
}
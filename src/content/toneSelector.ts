/**
 * Visual Emoji Tone Selector for TweetCraft
 * Provides an intuitive emoji-based interface for tone selection
 */

import { memoryManager } from '@/utils/memoryManager';
import { presetTemplates, PresetTemplate } from './presetTemplates';

export interface ToneOption {
  id: string;
  emoji: string;
  label: string;
  description: string;
  systemPrompt: string;
}

export class ToneSelector {
  private static readonly TONE_OPTIONS: ToneOption[] = [
    // Positive tones
    {
      id: 'professional',
      emoji: '💼',
      label: 'Pro',
      description: 'Professional and formal',
      systemPrompt: 'Professional tone - be formal, respectful, and business-appropriate'
    },
    {
      id: 'casual', 
      emoji: '😊',
      label: 'Casual',
      description: 'Friendly and relaxed',
      systemPrompt: 'Casual tone - be friendly, approachable, and conversational'
    },
    {
      id: 'witty',
      emoji: '😄',
      label: 'Witty',
      description: 'Humorous and clever',
      systemPrompt: 'Witty tone - be clever, humorous, and entertaining while staying respectful'
    },
    {
      id: 'supportive',
      emoji: '🤗',
      label: 'Support',
      description: 'Encouraging and helpful',
      systemPrompt: 'Supportive tone - be encouraging, empathetic, and helpful'
    },
    {
      id: 'enthusiastic',
      emoji: '🎉',
      label: 'Excited',
      description: 'Energetic and passionate',
      systemPrompt: 'Enthusiastic tone - be energetic, passionate, and excited about the topic'
    },
    {
      id: 'academic',
      emoji: '🎓',
      label: 'Academic',
      description: 'Scholarly and analytical',
      systemPrompt: 'Academic tone - be analytical, evidence-based, and intellectually rigorous'
    },
    // Challenging tones
    {
      id: 'contrarian',
      emoji: '🤔',
      label: 'Counter',
      description: 'Thoughtful counterpoint',
      systemPrompt: 'Contrarian tone - respectfully challenge or provide alternative perspectives'
    },
    {
      id: 'skeptical',
      emoji: '🤨',
      label: 'Skeptic',
      description: 'Questioning and doubtful',
      systemPrompt: 'Skeptical tone - question claims, ask for evidence, express healthy doubt'
    },
    {
      id: 'sarcastic',
      emoji: '😏',
      label: 'Sarcastic',
      description: 'Ironic and mocking',
      systemPrompt: 'Sarcastic tone - use irony and sarcasm, but avoid being mean-spirited'
    },
    {
      id: 'provocative',
      emoji: '🔥',
      label: 'Spicy',
      description: 'Bold and controversial',
      systemPrompt: 'Provocative tone - be bold, controversial, and thought-provoking while staying within bounds'
    },
    {
      id: 'dismissive',
      emoji: '🙄',
      label: 'Dismissive',
      description: 'Unimpressed and critical',
      systemPrompt: 'Dismissive tone - express that you find the point unimpressive or obvious'
    },
    {
      id: 'custom',
      emoji: '✨',
      label: 'Custom',
      description: 'Use your custom prompt',
      systemPrompt: '' // Will use user's custom prompt
    }
  ];

  private static readonly MOOD_MODIFIERS = [
    { id: 'multiple', emoji: '🎯', label: '3 Options', modifier: 'multiple' },
    { id: 'add-question', emoji: '❓', label: 'Question', modifier: 'End with a relevant question' },
    { id: 'add-emoji', emoji: '😀', label: 'Emojis', modifier: 'Include relevant emojis' },
    { id: 'shorter', emoji: '✂️', label: 'Shorter', modifier: 'Keep it brief and concise' },
    { id: 'longer', emoji: '📝', label: 'Longer', modifier: 'Provide more detail and context' }
  ];

  private container: HTMLElement | null = null;
  private selectedTone: string = 'casual';
  private selectedModifiers: Set<string> = new Set();
  private onToneSelect: ((tone: ToneOption, modifiers: string[], customPrompt?: string) => void) | null = null;
  private isExpanded: boolean = false;

  constructor() {
    // Load last used tone from storage
    this.loadLastTone();
  }

  /**
   * Create the tone selector UI
   */
  create(onGenerate: (tone: ToneOption, modifiers: string[], customPrompt?: string) => void): HTMLElement {
    this.onToneSelect = onGenerate;
    
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'tweetcraft-tone-selector';
    this.container.innerHTML = `
      <div class="tone-selector-header">
        <span class="tone-label">Select Tone:</span>
        <button class="tone-expand-btn" aria-label="Show more options">
          <span class="expand-icon">▼</span>
        </button>
      </div>
      
      <div class="tone-grid ${this.isExpanded ? 'expanded' : ''}">
        ${this.renderToneButtons()}
      </div>
      
      <div class="custom-prompt-container" style="display: ${this.selectedTone === 'custom' ? 'block' : 'none'};">
        <textarea class="custom-prompt-input" 
                  placeholder="Enter your custom system prompt here..."
                  rows="3"></textarea>
      </div>
      
      <div class="mood-modifiers ${this.isExpanded ? 'expanded' : ''}">
        <div class="modifiers-label">Quick modifiers (optional):</div>
        <div class="modifier-buttons">
          ${this.renderModifierButtons()}
        </div>
      </div>
      
      <div class="tone-preview">
        <span class="preview-emoji">${this.getCurrentTone().emoji}</span>
        <span class="preview-text">${this.getCurrentTone().description}</span>
      </div>
      
      <div class="preset-templates-container"></div>
      
      <button class="generate-reply-btn">
        <span class="btn-icon">✨</span>
        <span class="btn-text">Generate Reply</span>
      </button>
    `;

    this.attachEventListeners();
    this.applyStyles();
    
    // Add preset templates
    const templatesContainer = this.container.querySelector('.preset-templates-container');
    if (templatesContainer) {
      const presetsUI = presetTemplates.create((preset: PresetTemplate) => {
        console.log('%c🎯 TEMPLATE SELECTED', 'color: #FF6B6B; font-weight: bold; font-size: 14px');
        console.log('%c  Template Name:', 'color: #657786', preset.name);
        console.log('%c  Template Action:', 'color: #657786', preset.prompt);
        console.log('%c  Current Tone:', 'color: #1DA1F2', this.getCurrentTone().label);
        console.log('%c  Will Combine:', 'color: #17BF63', `${this.getCurrentTone().label} tone + ${preset.name} format`);
        
        // When a preset is selected, trigger generation combining tone and template
        if (this.onToneSelect) {
          const tone = this.getCurrentTone();
          const modifiers = Array.from(this.selectedModifiers)
            .map(id => ToneSelector.MOOD_MODIFIERS.find(m => m.id === id)?.modifier)
            .filter(Boolean) as string[];
          
          // Add the preset's prompt as a modifier to combine with tone
          modifiers.push(preset.prompt);
          this.onToneSelect(tone, modifiers);
        }
      });
      
      templatesContainer.appendChild(presetsUI);
    }
    
    return this.container;
  }

  /**
   * Render tone buttons HTML
   */
  private renderToneButtons(): string {
    const tones = ToneSelector.TONE_OPTIONS;
    
    return tones.map((tone, index) => `
      <button class="tone-btn ${tone.id === this.selectedTone ? 'active' : ''}" 
              data-tone="${tone.id}"
              title="${tone.description}"
              aria-label="${tone.label} - ${tone.description}"
              style="${!this.isExpanded && index >= 6 ? 'display: none;' : ''}">
        <span class="tone-emoji">${tone.emoji}</span>
        <span class="tone-label">${tone.label}</span>
      </button>
    `).join('');
  }

  /**
   * Render modifier buttons HTML
   */
  private renderModifierButtons(): string {
    return ToneSelector.MOOD_MODIFIERS.map(mod => `
      <button class="modifier-btn ${this.selectedModifiers.has(mod.id) ? 'active' : ''}"
              data-modifier="${mod.id}"
              title="${mod.modifier}"
              aria-label="${mod.label}">
        <span class="modifier-emoji">${mod.emoji}</span>
        <span class="modifier-label">${mod.label}</span>
      </button>
    `).join('');
  }

  /**
   * Attach event listeners to buttons
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Tone button clicks
    this.container.querySelectorAll('.tone-btn').forEach(btn => {
      memoryManager.addEventListener(btn as HTMLElement, 'click', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        
        const button = e.currentTarget as HTMLElement;
        const toneId = button.dataset.tone;
        
        if (toneId) {
          this.selectTone(toneId);
        }
      });

      // Hover effect
      memoryManager.addEventListener(btn as HTMLElement, 'mouseenter', () => {
        this.showPreview(btn.getAttribute('data-tone')!);
      });
    });

    // Modifier button clicks
    this.container.querySelectorAll('.modifier-btn').forEach(btn => {
      memoryManager.addEventListener(btn as HTMLElement, 'click', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        
        const button = e.currentTarget as HTMLElement;
        const modifierId = button.dataset.modifier;
        
        if (modifierId) {
          this.toggleModifier(modifierId, button);
        }
      });
    });

    // Expand/collapse button
    const expandBtn = this.container.querySelector('.tone-expand-btn');
    if (expandBtn) {
      memoryManager.addEventListener(expandBtn as HTMLElement, 'click', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleExpanded();
      });
    }
    
    // Generate button
    const generateBtn = this.container.querySelector('.generate-reply-btn');
    if (generateBtn) {
      memoryManager.addEventListener(generateBtn as HTMLElement, 'click', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (this.onToneSelect) {
          const tone = this.getCurrentTone();
          const modifiers = Array.from(this.selectedModifiers)
            .map(id => ToneSelector.MOOD_MODIFIERS.find(m => m.id === id)?.modifier)
            .filter(Boolean) as string[];
          
          // Get custom prompt if custom tone is selected
          let customPrompt: string | undefined;
          if (this.selectedTone === 'custom') {
            const input = this.container?.querySelector('.custom-prompt-input') as HTMLTextAreaElement;
            customPrompt = input?.value.trim();
            if (!customPrompt) {
              alert('Please enter a custom prompt');
              return;
            }
          }
          
          // Debug logging for tone selection
          console.log('%c🎯 TONE SELECTION', 'color: #1DA1F2; font-weight: bold; font-size: 14px');
          console.log('%c  Selected Tone:', 'color: #657786', tone);
          console.log('%c  Modifiers:', 'color: #657786', modifiers);
          console.log('%c  Custom Prompt:', 'color: #657786', customPrompt || '(none)');
          console.log('%c  Full Selection State:', 'color: #657786', {
            toneId: tone.id,
            toneLabel: tone.label,
            toneEmoji: tone.emoji,
            systemPrompt: customPrompt || tone.systemPrompt,
            modifierCount: modifiers.length,
            modifiers: modifiers
          });
          
          this.onToneSelect(tone, modifiers, customPrompt);
        }
      });
    }

    // Keyboard navigation
    memoryManager.addEventListener(this.container, 'keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      this.handleKeyboardNavigation(keyEvent);
    });
  }

  /**
   * Select a tone
   */
  private selectTone(toneId: string): void {
    console.log('%c🔄 TONE CHANGE', 'color: #17BF63; font-weight: bold', `${this.selectedTone} → ${toneId}`);
    this.selectedTone = toneId;
    
    // Update UI
    this.container?.querySelectorAll('.tone-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tone') === toneId);
    });
    
    // Show/hide custom prompt input
    const customPromptContainer = this.container?.querySelector('.custom-prompt-container') as HTMLElement;
    if (customPromptContainer) {
      customPromptContainer.style.display = toneId === 'custom' ? 'block' : 'none';
      if (toneId === 'custom') {
        const input = customPromptContainer.querySelector('.custom-prompt-input') as HTMLTextAreaElement;
        input?.focus();
      }
    }
    
    // Update preview
    this.updatePreview();
    
    // Save to storage and localStorage for quick access
    this.saveLastTone();
    localStorage.setItem('tweetcraft_lastTone', toneId);
  }

  /**
   * Toggle a modifier
   */
  private toggleModifier(modifierId: string, button: HTMLElement): void {
    const wasActive = this.selectedModifiers.has(modifierId);
    if (wasActive) {
      this.selectedModifiers.delete(modifierId);
      button.classList.remove('active');
      console.log('%c➖ MODIFIER REMOVED', 'color: #E1444D; font-weight: bold', modifierId);
    } else {
      this.selectedModifiers.add(modifierId);
      button.classList.add('active');
      console.log('%c➕ MODIFIER ADDED', 'color: #17BF63; font-weight: bold', modifierId);
    }
    console.log('%c  Active Modifiers:', 'color: #657786', Array.from(this.selectedModifiers));
    // Don't trigger generation here, wait for Generate button
  }

  /**
   * Toggle expanded state
   */
  private toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
    
    const expandIcon = this.container?.querySelector('.expand-icon');
    const modifiers = this.container?.querySelector('.mood-modifiers');
    const toneGrid = this.container?.querySelector('.tone-grid');
    
    if (expandIcon) {
      expandIcon.textContent = this.isExpanded ? '▲' : '▼';
    }
    
    if (modifiers) {
      modifiers.classList.toggle('expanded', this.isExpanded);
    }
    
    if (toneGrid) {
      toneGrid.classList.toggle('expanded', this.isExpanded);
      
      // Hide/show tone buttons instead of recreating them
      const allButtons = toneGrid.querySelectorAll('.tone-btn');
      allButtons.forEach((btn, index) => {
        const btnElement = btn as HTMLElement;
        if (this.isExpanded) {
          btnElement.style.display = ''; // Show all
        } else {
          btnElement.style.display = index < 6 ? '' : 'none'; // Show only first 6
        }
      });
    }
  }

  /**
   * Show preview on hover
   */
  private showPreview(toneId: string): void {
    const tone = ToneSelector.TONE_OPTIONS.find(t => t.id === toneId);
    if (!tone) return;
    
    const previewEmoji = this.container?.querySelector('.preview-emoji');
    const previewText = this.container?.querySelector('.preview-text');
    
    if (previewEmoji) previewEmoji.textContent = tone.emoji;
    if (previewText) previewText.textContent = tone.description;
  }

  /**
   * Update preview to current selection
   */
  private updatePreview(): void {
    this.showPreview(this.selectedTone);
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyboardNavigation(e: KeyboardEvent): void {
    const toneButtons = Array.from(this.container?.querySelectorAll('.tone-btn') || []) as HTMLElement[];
    const currentIndex = toneButtons.findIndex(btn => btn.classList.contains('active'));
    
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % toneButtons.length;
        toneButtons[nextIndex]?.click();
        toneButtons[nextIndex]?.focus();
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : toneButtons.length - 1;
        toneButtons[prevIndex]?.click();
        toneButtons[prevIndex]?.focus();
        break;
        
      case 'Enter':
      case ' ':
        if (document.activeElement?.classList.contains('tone-btn')) {
          e.preventDefault();
          (document.activeElement as HTMLElement).click();
        }
        break;
    }
  }

  /**
   * Get current selected tone
   */
  getCurrentTone(): ToneOption {
    return ToneSelector.TONE_OPTIONS.find(t => t.id === this.selectedTone) || ToneSelector.TONE_OPTIONS[1];
  }

  /**
   * Load last used tone from storage
   */
  private async loadLastTone(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['lastTone']);
      if (result.lastTone) {
        this.selectedTone = result.lastTone;
      }
    } catch (error) {
      console.log('Could not load last tone:', error);
    }
  }

  /**
   * Save last used tone to storage
   */
  private saveLastTone(): void {
    try {
      chrome.storage.local.set({ lastTone: this.selectedTone });
    } catch (error) {
      console.log('Could not save last tone:', error);
    }
  }

  /**
   * Apply styles to the selector
   */
  private applyStyles(): void {
    if (!document.querySelector('#tweetcraft-tone-selector-styles')) {
      const style = document.createElement('style');
      style.id = 'tweetcraft-tone-selector-styles';
      style.textContent = `
        .tweetcraft-tone-selector {
          background: #15202b;
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 12px;
          padding: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          max-width: 320px;
          width: 320px;
          box-sizing: border-box;
        }
        
        .tone-selector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .tone-label {
          font-size: 12px;
          color: #8b98a5;
          font-weight: 500;
        }
        
        .tone-expand-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          color: #536471;
          font-size: 10px;
        }
        
        .tone-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-bottom: 8px;
          max-height: 160px;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }
        
        .tone-grid.expanded {
          max-height: 320px;
          overflow-y: auto;
        }
        
        .tone-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 4px;
          border: 2px solid transparent;
          border-radius: 8px;
          background: rgba(29, 155, 240, 0.1);
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        
        .tone-btn:hover {
          background: rgba(29, 155, 240, 0.2);
          transform: scale(1.05);
        }
        
        .tone-btn.active {
          border-color: rgb(29, 155, 240);
          background: rgba(29, 155, 240, 0.3);
        }
        
        .tone-emoji {
          font-size: 20px;
          margin-bottom: 2px;
        }
        
        .tone-btn .label {
          font-size: 10px;
          font-weight: 500;
          color: #e7e9ea;
        }
        
        .mood-modifiers {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }
        
        .mood-modifiers.expanded {
          max-height: 70px;
          margin-top: 8px;
        }
        
        .modifiers-label {
          font-size: 11px;
          color: #8b98a5;
          margin-bottom: 6px;
        }
        
        .modifier-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 3px;
        }
        
        .modifier-btn {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 3px 4px;
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          color: #e7e9ea;
          cursor: pointer;
          font-size: 10px;
          transition: all 0.2s;
          font-family: inherit;
          overflow: hidden;
        }
        
        .modifier-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        
        .modifier-btn.active {
          background: rgb(29, 155, 240);
          color: white;
          border-color: rgb(29, 155, 240);
        }
        
        .modifier-emoji {
          font-size: 11px;
          flex-shrink: 0;
        }
        
        .modifier-label {
          font-size: 9px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .tone-preview {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          margin-top: 8px;
          font-size: 11px;
          color: #8b98a5;
        }
        
        .preset-templates-container {
          margin: 8px 0;
          max-width: 100%;
          overflow: hidden;
        }
        
        .preview-emoji {
          font-size: 16px;
        }
        
        .custom-prompt-container {
          margin: 12px 0;
        }
        
        .custom-prompt-input {
          width: 100%;
          padding: 8px;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          font-family: inherit;
          font-size: 12px;
          resize: vertical;
          min-height: 60px;
        }
        
        .custom-prompt-input:focus {
          outline: none;
          border-color: rgb(29, 155, 240);
        }
        
        .generate-reply-btn {
          width: 100%;
          padding: 10px;
          margin-top: 12px;
          background: rgb(29, 155, 240);
          color: white;
          border: none;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }
        
        .generate-reply-btn:hover {
          background: rgb(26, 140, 216);
          transform: scale(1.02);
        }
        
        .generate-reply-btn:active {
          transform: scale(0.98);
        }
        
        .btn-icon {
          font-size: 16px;
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .tweetcraft-tone-selector {
            background: #000;
            border-color: #2f3336;
          }
          
          .tone-btn {
            background: rgba(29, 155, 240, 0.2);
          }
          
          .modifier-btn {
            background: #16181c;
            border-color: #2f3336;
          }
          
          .modifier-btn:hover {
            background: #1c1f23;
          }
          
          .tone-preview {
            background: #16181c;
          }
          
          .tone-label, .modifiers-label, .preview-text {
            color: #8b98a5;
          }
          
          .custom-prompt-input {
            background: #16181c;
            border-color: #2f3336;
            color: #e7e9ea;
          }
          
          .custom-prompt-input:focus {
            border-color: rgb(29, 155, 240);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Destroy the selector and clean up
   */
  destroy(): void {
    this.container?.remove();
    this.container = null;
    this.onToneSelect = null;
  }
}

export const toneSelector = new ToneSelector();
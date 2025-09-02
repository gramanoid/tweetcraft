/**
 * Personality Selector (formerly Tone Selector)
 * Provides comprehensive personality-based reply generation with detailed prompts
 */

import { Personality, PERSONALITIES, getPersonality } from '@/config/personalities';

export interface PersonalitySelectionResult {
  personality: Personality;
  modifiers?: string[];
  customPrompt?: string;
}

export class PersonalitySelector {
  private container: HTMLElement | null = null;
  private selectedPersonalityId: string = 'friendly';
  private onSelectCallback: ((result: PersonalitySelectionResult) => void) | null = null;

  /**
   * Create and show the personality selector
   */
  show(onSelect: (result: PersonalitySelectionResult) => void): HTMLElement {
    this.onSelectCallback = onSelect;
    
    this.container = document.createElement('div');
    this.container.className = 'personality-selector';
    this.container.innerHTML = this.renderHTML();
    
    this.attachEventListeners();
    this.applyStyles();
    
    return this.container;
  }

  /**
   * Render the HTML for personality selector
   */
  private renderHTML(): string {
    const personalitiesByCategory = {
      positive: PERSONALITIES.filter(p => p.category === 'positive'),
      neutral: PERSONALITIES.filter(p => p.category === 'neutral'),
      humorous: PERSONALITIES.filter(p => p.category === 'humorous'),
      critical: PERSONALITIES.filter(p => p.category === 'critical'),
      naughty: PERSONALITIES.filter(p => p.category === 'naughty')
    };

    return `
      <div class="personality-header">
        <h3>Select Personality</h3>
        <span class="personality-description">Choose how your reply should sound</span>
      </div>
      
      <div class="personality-categories">
        ${Object.entries(personalitiesByCategory).map(([category, personalities]) => `
          <div class="personality-category" data-category="${category}">
            <h4 class="category-title">${this.getCategoryTitle(category)}</h4>
            <div class="personality-grid">
              ${personalities.map(p => `
                <button class="personality-btn ${this.selectedPersonalityId === p.id ? 'selected' : ''}"
                        data-personality="${p.id}"
                        title="${p.description}">
                  <span class="personality-emoji">${p.emoji}</span>
                  <span class="personality-label">${p.label}</span>
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="personality-preview">
        <div class="preview-content">
          <span class="preview-emoji">${this.getSelectedPersonality().emoji}</span>
          <span class="preview-text">${this.getSelectedPersonality().description}</span>
        </div>
      </div>
    `;
  }

  /**
   * Get category display title
   */
  private getCategoryTitle(category: string): string {
    const titles: Record<string, string> = {
      positive: '😊 Positive & Pro-Social',
      neutral: '💼 Neutral & Thoughtful',
      humorous: '😄 Humorous & Stylistic',
      critical: '🎯 Critical & Debate',
      naughty: '😈 Naughty (Use Carefully)'
    };
    return titles[category] || category;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Personality button clicks
    this.container.querySelectorAll('.personality-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const personalityId = (btn as HTMLElement).dataset.personality;
        if (personalityId) {
          this.selectPersonality(personalityId);
        }
      });

      // Hover preview
      btn.addEventListener('mouseenter', () => {
        const personalityId = (btn as HTMLElement).dataset.personality;
        if (personalityId) {
          this.showPreview(personalityId);
        }
      });
    });

    // Reset preview on mouse leave
    this.container.addEventListener('mouseleave', () => {
      this.updatePreview();
    });
  }

  /**
   * Select a personality
   */
  private selectPersonality(personalityId: string): void {
    this.selectedPersonalityId = personalityId;
    
    // Update UI
    this.container?.querySelectorAll('.personality-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-personality') === personalityId);
    });
    
    this.updatePreview();
    
    // Notify callback if exists
    if (this.onSelectCallback) {
      const personality = this.getSelectedPersonality();
      this.onSelectCallback({ personality });
    }
  }

  /**
   * Show preview for a personality
   */
  private showPreview(personalityId: string): void {
    const personality = getPersonality(personalityId);
    if (!personality) return;
    
    const previewEmoji = this.container?.querySelector('.preview-emoji');
    const previewText = this.container?.querySelector('.preview-text');
    
    if (previewEmoji) previewEmoji.textContent = personality.emoji;
    if (previewText) previewText.textContent = personality.description;
  }

  /**
   * Update preview to selected personality
   */
  private updatePreview(): void {
    this.showPreview(this.selectedPersonalityId);
  }

  /**
   * Get currently selected personality
   */
  private getSelectedPersonality(): Personality {
    return getPersonality(this.selectedPersonalityId) || PERSONALITIES[0];
  }

  /**
   * Apply styles
   */
  private applyStyles(): void {
    if (!document.querySelector('#personality-selector-styles')) {
      const style = document.createElement('style');
      style.id = 'personality-selector-styles';
      style.textContent = `
        .personality-selector {
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          max-width: 600px;
          width: 100%;
        }
        
        .personality-header {
          margin-bottom: 16px;
          text-align: center;
        }
        
        .personality-header h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 600;
          color: #0f1419;
        }
        
        .personality-description {
          font-size: 14px;
          color: #536471;
        }
        
        .personality-categories {
          max-height: 400px;
          overflow-y: auto;
        }
        
        .personality-category {
          margin-bottom: 20px;
        }
        
        .category-title {
          font-size: 14px;
          font-weight: 600;
          color: #0f1419;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #eff3f4;
        }
        
        .personality-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        
        .personality-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px;
          border: 2px solid transparent;
          border-radius: 8px;
          background: #f7f9fa;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .personality-btn:hover {
          background: #e1e8ed;
          transform: translateY(-2px);
        }
        
        .personality-btn.selected {
          border-color: #1d9bf0;
          background: #e8f5fd;
        }
        
        .personality-emoji {
          font-size: 24px;
          margin-bottom: 4px;
        }
        
        .personality-label {
          font-size: 12px;
          font-weight: 500;
          color: #0f1419;
        }
        
        .personality-preview {
          margin-top: 16px;
          padding: 12px;
          background: #f7f9fa;
          border-radius: 8px;
        }
        
        .preview-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .preview-emoji {
          font-size: 20px;
        }
        
        .preview-text {
          font-size: 14px;
          color: #536471;
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .personality-selector {
            background: #000;
          }
          
          .personality-header h3,
          .category-title,
          .personality-label {
            color: #e7e9ea;
          }
          
          .personality-description,
          .preview-text {
            color: #8b98a5;
          }
          
          .personality-btn {
            background: #16181c;
          }
          
          .personality-btn:hover {
            background: #1c1f23;
          }
          
          .personality-btn.selected {
            background: #1a3a52;
          }
          
          .personality-preview {
            background: #16181c;
          }
          
          .category-title {
            border-bottom-color: #2f3336;
          }
        }
        
        /* Mobile responsive */
        @media (max-width: 600px) {
          .personality-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Destroy the selector
   */
  destroy(): void {
    this.container?.remove();
    this.container = null;
    this.onSelectCallback = null;
  }
}

export const personalitySelector = new PersonalitySelector();
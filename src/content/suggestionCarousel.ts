/**
 * Multiple Reply Suggestions Carousel for TweetCraft
 * Generates and displays 3 reply suggestions in parallel with navigation
 */

// import { ToneOption } from './toneSelector';

export interface Suggestion {
  id: string;
  text: string;
  tone: string;
  temperature: number;
  timestamp: number;
}

export class SuggestionCarousel {
  private container: HTMLElement | null = null;
  private suggestions: Suggestion[] = [];
  private currentIndex: number = 0;
  private onUseCallback: ((text: string) => void) | null = null;
  private onRegenerateCallback: ((index: number) => Promise<string>) | null = null;
  private isLoading: boolean = false;

  /**
   * Create the carousel UI
   */
  create(
    onUse: (text: string) => void,
    onRegenerate: (index: number) => Promise<string>
  ): HTMLElement {
    this.onUseCallback = onUse;
    this.onRegenerateCallback = onRegenerate;

    this.container = document.createElement('div');
    this.container.className = 'tweetcraft-suggestions-carousel';
    this.render();
    this.applyStyles();
    
    return this.container;
  }

  /**
   * Update suggestions and refresh UI
   */
  setSuggestions(suggestions: Suggestion[]): void {
    console.log('%c📦 SUGGESTIONS RECEIVED', 'color: #9146FF; font-weight: bold; font-size: 14px');
    console.log('%c  Count:', 'color: #657786', suggestions.length);
    console.log('%c  Suggestions:', 'color: #657786', suggestions);
    
    this.suggestions = suggestions;
    this.currentIndex = 0;
    this.render();
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.render();
  }

  /**
   * Render the carousel HTML
   */
  private render(): void {
    if (!this.container) return;

    if (this.isLoading) {
      this.container.innerHTML = `
        <div class="suggestions-loading">
          <div class="loading-spinner"></div>
          <div class="loading-text">Generating 3 suggestions...</div>
        </div>
      `;
      return;
    }

    if (this.suggestions.length === 0) {
      this.container.innerHTML = `
        <div class="suggestions-empty">
          <span>No suggestions generated yet</span>
        </div>
      `;
      return;
    }

    // Show all suggestions at once in a vertical list
    this.container.innerHTML = `
      <div class="suggestions-header">
        <h3 class="suggestions-title">Choose Your Reply (${this.suggestions.length} options):</h3>
        <button class="regenerate-all-btn" title="Regenerate All">
          <span>🔄 Regenerate All</span>
        </button>
      </div>
      
      <div class="suggestions-list">
        ${this.suggestions.map((suggestion, index) => `
          <div class="suggestion-item ${index === this.currentIndex ? 'selected' : ''}" 
               data-index="${index}">
            <div class="suggestion-header">
              <span class="suggestion-number">Option ${index + 1}</span>
              <span class="suggestion-temp-label">${this.getCreativityLabel(suggestion.temperature)}</span>
            </div>
            <div class="suggestion-text">${this.escapeHtml(suggestion.text)}</div>
            <div class="suggestion-actions">
              <button class="use-suggestion-btn primary" data-index="${index}">
                <span>✓ Use This</span>
              </button>
              <button class="regenerate-single-btn" data-index="${index}" title="Regenerate">
                <span>🔄</span>
              </button>
              <button class="edit-suggestion-btn" data-index="${index}" title="Edit">
                <span>✏️</span>
              </button>
              <button class="copy-suggestion-btn" data-index="${index}" title="Copy">
                <span>📋</span>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Get creativity label from temperature
   */
  private getCreativityLabel(temp: number): string {
    if (temp <= 0.5) return 'Low creativity';
    if (temp <= 0.7) return 'Medium creativity';
    return 'High creativity';
  }

  /**
   * Attach event listeners to the carousel
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Regenerate all button
    const regenerateAllBtn = this.container.querySelector('.regenerate-all-btn');
    if (regenerateAllBtn) {
      (regenerateAllBtn as HTMLElement).addEventListener('click', () => {
        this.regenerateAll();
      });
    }

    // Action buttons for each suggestion
    this.container.querySelectorAll('.use-suggestion-btn').forEach((btn) => {
      (btn as HTMLElement).addEventListener('click', (e: Event) => {
        const index = parseInt((e.currentTarget as HTMLElement).dataset.index || '0');
        this.currentIndex = index;
        this.useCurrent();
      });
    });

    this.container.querySelectorAll('.regenerate-single-btn').forEach((btn) => {
      (btn as HTMLElement).addEventListener('click', (e: Event) => {
        const index = parseInt((e.currentTarget as HTMLElement).dataset.index || '0');
        this.currentIndex = index;
        this.regenerateCurrent();
      });
    });

    this.container.querySelectorAll('.edit-suggestion-btn').forEach((btn) => {
      (btn as HTMLElement).addEventListener('click', (e: Event) => {
        const index = parseInt((e.currentTarget as HTMLElement).dataset.index || '0');
        this.currentIndex = index;
        this.editCurrent();
      });
    });

    this.container.querySelectorAll('.copy-suggestion-btn').forEach((btn) => {
      (btn as HTMLElement).addEventListener('click', (e: Event) => {
        const index = parseInt((e.currentTarget as HTMLElement).dataset.index || '0');
        this.currentIndex = index;
        this.copyCurrent();
      });
    });

    // Click on suggestion item to select it
    this.container.querySelectorAll('.suggestion-item').forEach((item) => {
      (item as HTMLElement).addEventListener('click', (e: Event) => {
        // Don't select if clicking on action buttons
        if ((e.target as HTMLElement).closest('.suggestion-actions')) return;
        
        const index = parseInt((e.currentTarget as HTMLElement).dataset.index || '0');
        this.currentIndex = index;
        this.render(); // Re-render to update selection
      });
    });

    // Keyboard navigation (for selecting with number keys)
    this.container.addEventListener('keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      switch (keyEvent.key) {
        case '1':
        case '2':
        case '3': {
          keyEvent.preventDefault();
          const index = parseInt(keyEvent.key) - 1;
          if (index < this.suggestions.length) {
            this.currentIndex = index;
            this.useCurrent();
          }
          break;
        }
        case 'Enter':
          keyEvent.preventDefault();
          this.useCurrent();
          break;
      }
    });
  }

  /**
   * Navigate to previous/next suggestion
   */
  private navigate(direction: number): void {
    const newIndex = this.currentIndex + direction;
    if (newIndex >= 0 && newIndex < this.suggestions.length) {
      console.log('%c🔄 NAVIGATING', 'color: #17BF63', `${this.currentIndex} → ${newIndex}`);
      this.currentIndex = newIndex;
      this.render();
    }
  }

  /**
   * Navigate to specific index
   */
  private navigateToIndex(index: number): void {
    if (index >= 0 && index < this.suggestions.length) {
      console.log('%c🎯 DIRECT NAVIGATION', 'color: #17BF63', `→ ${index}`);
      this.currentIndex = index;
      this.render();
    }
  }

  /**
   * Use the current suggestion
   */
  private useCurrent(): void {
    const current = this.suggestions[this.currentIndex];
    if (current && this.onUseCallback) {
      console.log('%c✅ USING SUGGESTION', 'color: #28A745; font-weight: bold', this.currentIndex + 1);
      console.log('%c  Text:', 'color: #657786', current.text.substring(0, 100) + '...');
      this.onUseCallback(current.text);
    }
  }

  /**
   * Regenerate current suggestion
   */
  private async regenerateCurrent(): Promise<void> {
    if (!this.onRegenerateCallback || this.isLoading) return;
    
    console.log('%c🔄 REGENERATING SINGLE', 'color: #FFA500; font-weight: bold', this.currentIndex + 1);
    
    const btn = this.container?.querySelector('.regenerate-single-btn') as HTMLElement;
    if (btn) {
      btn.classList.add('spinning');
      btn.style.pointerEvents = 'none';
    }
    
    try {
      const newText = await this.onRegenerateCallback(this.currentIndex);
      this.suggestions[this.currentIndex] = {
        ...this.suggestions[this.currentIndex],
        text: newText,
        timestamp: Date.now()
      };
      this.render();
    } catch (error) {
      console.error('Failed to regenerate:', error);
    } finally {
      if (btn) {
        btn.classList.remove('spinning');
        btn.style.pointerEvents = 'auto';
      }
    }
  }

  /**
   * Edit current suggestion
   */
  private editCurrent(): void {
    const suggestionText = this.container?.querySelector('.suggestion-text') as HTMLElement;
    if (!suggestionText) return;
    
    const current = this.suggestions[this.currentIndex];
    
    // Make editable
    suggestionText.contentEditable = 'true';
    suggestionText.classList.add('editing');
    suggestionText.focus();
    
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(suggestionText);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    
    // Save on blur or Enter
    const saveEdit = () => {
      const newText = suggestionText.textContent || '';
      if (newText.trim()) {
        this.suggestions[this.currentIndex] = {
          ...current,
          text: newText.trim(),
          timestamp: Date.now()
        };
        console.log('%c✏️ EDITED SUGGESTION', 'color: #9146FF', this.currentIndex + 1);
      }
      suggestionText.contentEditable = 'false';
      suggestionText.classList.remove('editing');
      this.render();
    };
    
    suggestionText.addEventListener('blur', saveEdit);
    suggestionText.addEventListener('keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
        keyEvent.preventDefault();
        saveEdit();
      }
      if (keyEvent.key === 'Escape') {
        keyEvent.preventDefault();
        suggestionText.contentEditable = 'false';
        suggestionText.classList.remove('editing');
        this.render();
      }
    });
  }

  /**
   * Copy current suggestion to clipboard
   */
  private copyCurrent(): void {
    const current = this.suggestions[this.currentIndex];
    if (current) {
      navigator.clipboard.writeText(current.text).then(() => {
        console.log('%c📋 COPIED TO CLIPBOARD', 'color: #17BF63');
        
        // Show feedback
        const copyBtn = this.container?.querySelector('.copy-suggestion-btn');
        if (copyBtn) {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = '✓';
          setTimeout(() => {
            copyBtn.textContent = originalText;
          }, 1500);
        }
      });
    }
  }

  /**
   * Regenerate all suggestions
   */
  private regenerateAll(): void {
    // This will be handled by the parent component
    // Dispatch custom event
    const event = new CustomEvent('tweetcraft:regenerate-all', {
      detail: { suggestions: this.suggestions }
    });
    window.dispatchEvent(event);
  }

  /**
   * Escape HTML for safe display
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Apply styles
   */
  private applyStyles(): void {
    if (!document.querySelector('#tweetcraft-carousel-styles')) {
      const style = document.createElement('style');
      style.id = 'tweetcraft-carousel-styles';
      style.textContent = `
        .tweetcraft-suggestions-carousel {
          background: white;
          border: 1px solid #e1e8ed;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          min-width: 500px;
          max-width: 600px;
          max-height: 500px;
          overflow-y: auto;
        }
        
        .suggestions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e1e8ed;
        }
        
        .suggestions-title {
          font-size: 16px;
          font-weight: 600;
          color: #0f1419;
          margin: 0;
        }
        
        .regenerate-all-btn {
          background: transparent;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 13px;
          cursor: pointer;
          color: #536471;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .regenerate-all-btn:hover {
          background: #f7f9fa;
          border-color: rgb(29, 155, 240);
          color: rgb(29, 155, 240);
        }
        
        .suggestions-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .suggestion-item {
          border: 2px solid #e1e8ed;
          border-radius: 12px;
          padding: 12px;
          transition: all 0.2s;
          cursor: pointer;
        }
        
        .suggestion-item:hover {
          border-color: #a1a1aa;
          background: #fafafa;
        }
        
        .suggestion-item.selected {
          border-color: rgb(29, 155, 240);
          background: rgba(29, 155, 240, 0.05);
        }
        
        .suggestion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .suggestion-number {
          font-size: 12px;
          font-weight: 600;
          color: #536471;
          text-transform: uppercase;
        }
        
        .suggestion-temp-label {
          font-size: 11px;
          color: #536471;
          background: #f7f9fa;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .suggestion-text {
          padding: 10px;
          background: #f7f9fa;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.5;
          color: #0f1419;
          min-height: 50px;
          max-height: 120px;
          overflow-y: auto;
          margin-bottom: 10px;
        }
        
        .suggestion-text.editing {
          background: white;
          border: 2px solid rgb(29, 155, 240);
          outline: none;
        }
        
        .suggestion-meta {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: #536471;
          padding: 0 4px;
        }
        
        .suggestion-actions {
          display: flex;
          gap: 6px;
          margin-top: 8px;
        }
        
        .suggestion-actions button {
          padding: 6px 12px;
          border: 1px solid #e1e8ed;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .suggestion-actions button:hover {
          background: #f7f9fa;
          border-color: rgb(29, 155, 240);
        }
        
        .use-suggestion-btn.primary {
          background: rgb(29, 155, 240);
          color: white;
          border-color: rgb(29, 155, 240);
          flex: 1;
          justify-content: center;
        }
        
        .use-suggestion-btn.primary:hover {
          background: rgb(26, 140, 216);
        }
        
        .regenerate-single-btn.spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        
        .suggestions-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 40px;
          gap: 16px;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e1e8ed;
          border-top-color: rgb(29, 155, 240);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .loading-text {
          font-size: 14px;
          color: #536471;
          font-weight: 500;
        }
        
        .suggestions-empty {
          padding: 40px;
          text-align: center;
          color: #536471;
          font-size: 13px;
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .tweetcraft-suggestions-carousel {
            background: #000;
            border-color: #2f3336;
          }
          
          .suggestions-header {
            border-color: #2f3336;
            background: #000;
          }
          
          .suggestions-title {
            color: #e7e9ea;
          }
          
          .regenerate-all-btn {
            background: #16181c;
            border-color: #2f3336;
            color: #e7e9ea;
          }
          
          .regenerate-all-btn:hover {
            background: #1c1f23;
            border-color: rgb(29, 155, 240);
            color: rgb(29, 155, 240);
          }
          
          .suggestion-number {
            color: #8b98a5;
          }
          
          .suggestion-temp-label {
            color: #e7e9ea;
            background: #2f3336;
          }
          
          .suggestion-item {
            background: #000;
            border-color: #2f3336;
          }
          
          .suggestion-item:hover {
            background: #16181c;
            border-color: #536471;
          }
          
          .suggestion-item.selected {
            border-color: rgb(29, 155, 240);
            background: rgba(29, 155, 240, 0.1);
          }
          
          .suggestion-text {
            background: #16181c;
            color: #e7e9ea;
          }
          
          .suggestion-text.editing {
            background: #000;
          }
          
          .suggestion-actions button {
            background: #16181c;
            border-color: #2f3336;
            color: #e7e9ea;
          }
          
          .suggestion-actions button:hover {
            background: #1c1f23;
            border-color: #536471;
          }
          
          .use-suggestion-btn.primary {
            background: rgb(29, 155, 240);
            color: white;
            border-color: rgb(29, 155, 240);
          }
          
          .use-suggestion-btn.primary:hover {
            background: rgb(26, 140, 216);
            border-color: rgb(26, 140, 216);
          }
          
          .suggestions-loading {
            color: #e7e9ea;
          }
          
          .loading-text {
            color: #8b98a5;
          }
          
          .suggestions-empty {
            color: #8b98a5;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Destroy the carousel
   */
  destroy(): void {
    this.container?.remove();
    this.container = null;
    this.suggestions = [];
    this.onUseCallback = null;
    this.onRegenerateCallback = null;
  }
}

export const suggestionCarousel = new SuggestionCarousel();
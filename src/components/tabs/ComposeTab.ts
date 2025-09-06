/**
 * Compose Tab Component
 * SPRINT 4: Enhanced compose functionality with AI generation
 */

import { TabComponent } from './TabManager';
import { SelectionResult } from '@/content/unifiedSelector';
import './ComposeTab.scss';

interface ComposeDraft {
  text: string;
  personality: string;
  vocabulary: string;
  rhetoric: string;
  lengthPacing: string;
  timestamp: number;
}

export class ComposeTab implements TabComponent {
  private container: HTMLElement | null = null;
  private onSelectCallback: ((result: SelectionResult) => void) | null;
  private currentDraft: ComposeDraft;
  private isGenerating: boolean = false;
  private savedDrafts: ComposeDraft[] = [];

  constructor(onSelectCallback: ((result: SelectionResult) => void) | null) {
    this.onSelectCallback = onSelectCallback;
    this.currentDraft = this.getDefaultDraft();
    this.loadSavedDrafts();
  }

  async onShow(): Promise<void> {
    this.loadSavedDrafts();
  }

  render(): string {
    return `
      <div class="compose-tab">
        <div class="compose-header">
          <h2 class="compose-title">Compose Tweet</h2>
          <p class="compose-subtitle">Write your own tweet or let AI help you</p>
        </div>

        <!-- Compose Area -->
        <div class="compose-area">
          <textarea 
            class="compose-textarea" 
            placeholder="What's happening?"
            maxlength="280"
            data-compose-text
          >${this.currentDraft.text}</textarea>
          
          <div class="compose-toolbar">
            <div class="char-counter">
              <span class="char-count">0</span>/280
            </div>
            
            <div class="compose-actions">
              <button class="btn-compose-clear" title="Clear text">
                🗑️
              </button>
              <button class="btn-compose-save" title="Save draft">
                💾
              </button>
            </div>
          </div>
        </div>

        <!-- AI Enhancement Section -->
        <div class="ai-enhancement">
          <h3 class="section-title">AI Enhancement</h3>
          
          <div class="enhancement-options">
            <div class="option-group">
              <label>Style</label>
              <select class="compose-style" data-compose-personality>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="witty">Witty</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="casual">Casual</option>
                <option value="analytical">Analytical</option>
              </select>
            </div>
            
            <div class="option-group">
              <label>Tone</label>
              <select class="compose-tone" data-compose-vocabulary>
                <option value="plain_english">Plain English</option>
                <option value="sophisticated">Sophisticated</option>
                <option value="modern_slang">Modern Slang</option>
                <option value="technical">Technical</option>
                <option value="conversational">Conversational</option>
              </select>
            </div>
            
            <div class="option-group">
              <label>Purpose</label>
              <select class="compose-purpose" data-compose-rhetoric>
                <option value="share_news">Share News</option>
                <option value="share_insight">Share Insight</option>
                <option value="ask_question">Ask Question</option>
                <option value="highlight_excitement">Highlight Excitement</option>
                <option value="offer_guidance">Offer Guidance</option>
                <option value="add_humor">Add Humor</option>
              </select>
            </div>
          </div>

          <div class="generate-section">
            <button class="btn-generate-tweet btn-primary">
              ${this.isGenerating ? '<span class="spinner"></span> Generating...' : '✨ Generate Tweet'}
            </button>
            
            <button class="btn-enhance-tweet btn-secondary">
              🔧 Enhance My Text
            </button>
            
            <button class="btn-suggest-topics btn-ghost">
              💡 Suggest Topics
            </button>
          </div>
        </div>

        <!-- Quick Templates -->
        <div class="quick-templates">
          <h3 class="section-title">Quick Templates</h3>
          <div class="template-grid">
            <button class="template-btn" data-template="announcement">
              📢 Announcement
            </button>
            <button class="template-btn" data-template="question">
              ❓ Question
            </button>
            <button class="template-btn" data-template="thread">
              🧵 Thread Starter
            </button>
            <button class="template-btn" data-template="milestone">
              🎉 Milestone
            </button>
            <button class="template-btn" data-template="opinion">
              💭 Hot Take
            </button>
            <button class="template-btn" data-template="resource">
              📚 Share Resource
            </button>
          </div>
        </div>

        <!-- Saved Drafts -->
        ${this.savedDrafts.length > 0 ? `
          <div class="saved-drafts">
            <h3 class="section-title">Saved Drafts (${this.savedDrafts.length})</h3>
            <div class="drafts-list">
              ${this.savedDrafts.slice(0, 5).map((draft, index) => `
                <div class="draft-item" data-draft-index="${index}">
                  <div class="draft-preview">${this.truncateText(draft.text, 60)}</div>
                  <div class="draft-meta">
                    ${this.getRelativeTime(draft.timestamp)}
                  </div>
                  <button class="btn-load-draft" data-index="${index}">Load</button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  attachEventListeners(container: HTMLElement): void {
    this.container = container;

    // Text area handling
    const textarea = container.querySelector('[data-compose-text]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.addEventListener('input', (e) => this.handleTextInput(e));
      this.updateCharCounter(textarea);
    }

    // Generate buttons
    const generateBtn = container.querySelector('.btn-generate-tweet');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.generateTweet());
    }

    const enhanceBtn = container.querySelector('.btn-enhance-tweet');
    if (enhanceBtn) {
      enhanceBtn.addEventListener('click', () => this.enhanceText());
    }

    const suggestBtn = container.querySelector('.btn-suggest-topics');
    if (suggestBtn) {
      suggestBtn.addEventListener('click', () => this.suggestTopics());
    }

    // Toolbar buttons
    const clearBtn = container.querySelector('.btn-compose-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearText());
    }

    const saveBtn = container.querySelector('.btn-compose-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveDraft());
    }

    // Template buttons
    container.querySelectorAll('.template-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const template = (e.target as HTMLElement).dataset.template;
        if (template) {
          this.applyTemplate(template);
        }
      });
    });

    // Load draft buttons
    container.querySelectorAll('.btn-load-draft').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.index || '0');
        this.loadDraft(index);
      });
    });

    // Option changes
    const personalitySelect = container.querySelector('[data-compose-personality]') as HTMLSelectElement;
    if (personalitySelect) {
      personalitySelect.addEventListener('change', (e) => {
        this.currentDraft.personality = (e.target as HTMLSelectElement).value;
      });
    }

    const vocabularySelect = container.querySelector('[data-compose-vocabulary]') as HTMLSelectElement;
    if (vocabularySelect) {
      vocabularySelect.addEventListener('change', (e) => {
        this.currentDraft.vocabulary = (e.target as HTMLSelectElement).value;
      });
    }

    const rhetoricSelect = container.querySelector('[data-compose-rhetoric]') as HTMLSelectElement;
    if (rhetoricSelect) {
      rhetoricSelect.addEventListener('change', (e) => {
        this.currentDraft.rhetoric = (e.target as HTMLSelectElement).value;
      });
    }
  }

  destroy(): void {
    this.container = null;
    this.saveDraftToStorage();
  }

  private handleTextInput(e: Event): void {
    const textarea = e.target as HTMLTextAreaElement;
    this.currentDraft.text = textarea.value;
    this.updateCharCounter(textarea);
  }

  private updateCharCounter(textarea: HTMLTextAreaElement): void {
    if (!this.container) return;
    
    const counter = this.container.querySelector('.char-count');
    if (counter) {
      const length = textarea.value.length;
      counter.textContent = length.toString();
      
      // Update color based on length
      const counterElement = counter.parentElement as HTMLElement;
      if (length > 260) {
        counterElement.style.color = 'var(--tweet-error)';
      } else if (length > 220) {
        counterElement.style.color = 'var(--tweet-warning)';
      } else {
        counterElement.style.color = 'var(--tweet-text-secondary)';
      }
    }
  }

  private async generateTweet(): Promise<void> {
    if (this.isGenerating || !this.onSelectCallback) return;

    this.isGenerating = true;
    this.updateGenerateButton();

    const result: SelectionResult = {
      tabType: 'compose',
      personality: this.currentDraft.personality,
      vocabulary: this.currentDraft.vocabulary,
      rhetoric: this.currentDraft.rhetoric,
      lengthPacing: this.currentDraft.lengthPacing,
      combinedPrompt: this.currentDraft.text || 'Generate an engaging tweet',
      template: { 
        id: 'compose_generate', 
        name: 'Generate Tweet', 
        emoji: '✨',
        prompt: 'Generate an engaging tweet',
        description: 'Create new tweet content',
        category: 'compose'
      },
      tone: { 
        id: 'compose', 
        emoji: '✍️',
        label: 'Compose', 
        description: 'Create new tweet',
        category: 'neutral',
        systemPrompt: 'You are helping to compose a new tweet.'
      },
      temperature: 0.8
    };

    // Call the callback to generate
    this.onSelectCallback(result);

    // Simulate generation time
    setTimeout(() => {
      this.isGenerating = false;
      this.updateGenerateButton();
    }, 2000);
  }

  private async enhanceText(): Promise<void> {
    if (!this.currentDraft.text || this.isGenerating || !this.onSelectCallback) return;

    this.isGenerating = true;
    this.updateGenerateButton();

    const result: SelectionResult = {
      tabType: 'compose',
      personality: this.currentDraft.personality,
      vocabulary: this.currentDraft.vocabulary,
      rhetoric: this.currentDraft.rhetoric,
      lengthPacing: this.currentDraft.lengthPacing,
      combinedPrompt: `Enhance this tweet: "${this.currentDraft.text}"`,
      template: { 
        id: 'compose_enhance', 
        name: 'Enhance Tweet', 
        emoji: '🔧',
        prompt: 'Enhance and improve this tweet',
        description: 'Improve existing tweet',
        category: 'compose'
      },
      tone: { 
        id: 'enhance', 
        emoji: '✨',
        label: 'Enhance', 
        description: 'Improve existing tweet',
        category: 'positive',
        systemPrompt: 'You are helping to enhance and improve an existing tweet.'
      },
      temperature: 0.7
    };

    this.onSelectCallback(result);

    setTimeout(() => {
      this.isGenerating = false;
      this.updateGenerateButton();
    }, 2000);
  }

  private async suggestTopics(): Promise<void> {
    if (this.isGenerating || !this.onSelectCallback) return;

    this.isGenerating = true;
    this.updateGenerateButton();

    const result: SelectionResult = {
      tabType: 'compose',
      personality: this.currentDraft.personality,
      vocabulary: this.currentDraft.vocabulary,
      rhetoric: this.currentDraft.rhetoric,
      lengthPacing: this.currentDraft.lengthPacing,
      combinedPrompt: 'Suggest 5 trending topics to tweet about',
      template: { 
        id: 'compose_suggest', 
        name: 'Suggest Topics', 
        emoji: '💡',
        prompt: 'Suggest trending topics',
        description: 'Topic suggestions',
        category: 'compose'
      },
      tone: { 
        id: 'suggest', 
        emoji: '💡',
        label: 'Suggest', 
        description: 'Topic suggestions',
        category: 'neutral',
        systemPrompt: 'You are helping to suggest trending topics to tweet about.'
      },
      temperature: 0.9
    };

    this.onSelectCallback(result);

    setTimeout(() => {
      this.isGenerating = false;
      this.updateGenerateButton();
    }, 2000);
  }

  private updateGenerateButton(): void {
    if (!this.container) return;
    
    const btn = this.container.querySelector('.btn-generate-tweet');
    if (btn) {
      btn.innerHTML = this.isGenerating 
        ? '<span class="spinner"></span> Generating...' 
        : '✨ Generate Tweet';
    }
  }

  private clearText(): void {
    if (!this.container) return;
    
    const textarea = this.container.querySelector('[data-compose-text]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = '';
      this.currentDraft.text = '';
      this.updateCharCounter(textarea);
    }
  }

  private saveDraft(): void {
    if (!this.currentDraft.text) return;

    const draft = { ...this.currentDraft, timestamp: Date.now() };
    this.savedDrafts.unshift(draft);
    
    // Keep only last 10 drafts
    if (this.savedDrafts.length > 10) {
      this.savedDrafts = this.savedDrafts.slice(0, 10);
    }

    this.saveDraftsToStorage();
    
    // Show success feedback
    if (this.container) {
      const saveBtn = this.container.querySelector('.btn-compose-save');
      if (saveBtn) {
        saveBtn.innerHTML = '✅';
        setTimeout(() => {
          saveBtn.innerHTML = '💾';
        }, 1500);
      }
    }

    // Re-render to show saved draft
    this.rerender();
  }

  private loadDraft(index: number): void {
    if (!this.savedDrafts[index] || !this.container) return;

    const draft = this.savedDrafts[index];
    this.currentDraft = { ...draft };

    // Update UI
    const textarea = this.container.querySelector('[data-compose-text]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = draft.text;
      this.updateCharCounter(textarea);
    }

    // Update selects
    const personalitySelect = this.container.querySelector('[data-compose-personality]') as HTMLSelectElement;
    if (personalitySelect) {
      personalitySelect.value = draft.personality;
    }

    const vocabularySelect = this.container.querySelector('[data-compose-vocabulary]') as HTMLSelectElement;
    if (vocabularySelect) {
      vocabularySelect.value = draft.vocabulary;
    }

    const rhetoricSelect = this.container.querySelector('[data-compose-rhetoric]') as HTMLSelectElement;
    if (rhetoricSelect) {
      rhetoricSelect.value = draft.rhetoric;
    }
  }

  private applyTemplate(templateType: string): void {
    const templates: Record<string, string> = {
      announcement: "🎉 Excited to announce ",
      question: "What's your take on ",
      thread: "Thread 🧵\n\n1/ ",
      milestone: "🎊 We just hit ",
      opinion: "Hot take: ",
      resource: "Found this amazing resource: "
    };

    const template = templates[templateType] || '';
    if (!this.container) return;

    const textarea = this.container.querySelector('[data-compose-text]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = template;
      this.currentDraft.text = template;
      this.updateCharCounter(textarea);
      textarea.focus();
      textarea.setSelectionRange(template.length, template.length);
    }
  }

  private rerender(): void {
    if (!this.container) return;
    
    const parent = this.container.parentElement;
    if (parent) {
      parent.innerHTML = this.render();
      this.attachEventListeners(parent.firstElementChild as HTMLElement);
    }
  }

  private getDefaultDraft(): ComposeDraft {
    return {
      text: '',
      personality: 'friendly',
      vocabulary: 'plain_english',
      rhetoric: 'share_insight',
      lengthPacing: 'drive_by',
      timestamp: Date.now()
    };
  }

  private loadSavedDrafts(): void {
    try {
      const saved = localStorage.getItem('tweetcraft_compose_drafts');
      if (saved) {
        this.savedDrafts = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
  }

  private saveDraftsToStorage(): void {
    try {
      localStorage.setItem('tweetcraft_compose_drafts', JSON.stringify(this.savedDrafts));
    } catch (error) {
      console.error('Failed to save drafts:', error);
    }
  }

  private saveDraftToStorage(): void {
    try {
      if (this.currentDraft.text) {
        localStorage.setItem('tweetcraft_compose_current', JSON.stringify(this.currentDraft));
      }
    } catch (error) {
      console.error('Failed to save current draft:', error);
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  private getRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }
}
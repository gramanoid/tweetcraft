/**
 * Arsenal Mode UI Component
 * Displays pre-generated replies for quick selection
 */

import { ArsenalService } from '@/services/arsenalService';
import { DOMUtils } from './domUtils';
import './arsenalMode.scss';

// UI String Constants
const UI_STRINGS = {
  EMPTY_STATE: {
    TITLE: 'No replies in this category yet.',
    SUBTITLE: 'Generate some replies to build your arsenal!'
  }
} as const;

export class ArsenalModeUI {
  private arsenalService: ArsenalService;
  private popup: HTMLElement | null = null;
  private isOpen = false;

  constructor() {
    this.arsenalService = new ArsenalService();
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for keyboard shortcut event
    document.addEventListener('tweetcraft:open-arsenal', (event: any) => {
      const textarea = event.detail?.textarea;
      if (textarea) {
        this.open(textarea);
      } else {
        this.toggle();
      }
    });
  }

  /**
   * Toggle Arsenal Mode popup
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open Arsenal Mode popup
   */
  async open(textarea?: HTMLElement): Promise<void> {
    // Find the active tweet textarea if not provided
    if (!textarea) {
      textarea = document.querySelector('[data-testid="tweetTextarea_0"], [contenteditable="true"][role="textbox"]') as HTMLElement;
      if (!textarea) {
        console.log('%c⚔️ No active textarea found', 'color: #FFA500');
        return;
      }
    }

    // Create and show popup
    this.popup = this.createPopup();
    document.body.appendChild(this.popup);

    // Position near textarea
    this.positionPopup(textarea);

    // Load replies
    await this.loadReplies();

    this.isOpen = true;
    console.log('%c⚔️ Arsenal Mode opened', 'color: #17BF63');
  }

  /**
   * Close Arsenal Mode popup
   */
  close(): void {
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }
    this.isOpen = false;
    console.log('%c⚔️ Arsenal Mode closed', 'color: #657786');
  }

  /**
   * Create the Arsenal Mode popup
   */
  private createPopup(): HTMLElement {
    const popup = document.createElement('div');
    popup.className = 'arsenal-mode-popup';

    // Header
    const header = document.createElement('div');
    header.className = 'arsenal-mode-popup__header';

    const title = document.createElement('h3');
    title.textContent = '⚔️ Arsenal Mode';
    title.className = 'arsenal-mode-popup__title';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.className = 'arsenal-mode-popup__close-btn';
    closeBtn.onclick = () => this.close();

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Category tabs
    const tabs = document.createElement('div');
    tabs.className = 'arsenal-mode-popup__tabs';

    // Content area
    const content = document.createElement('div');
    content.className = 'arsenal-mode-popup__content';

    // Loading indicator
    const loading = document.createElement('div');
    loading.className = 'arsenal-mode-popup__loading';
    loading.textContent = 'Loading arsenal...';
    content.appendChild(loading);

    popup.appendChild(header);
    popup.appendChild(tabs);
    popup.appendChild(content);

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (!popup.contains(e.target as Node)) {
          this.close();
        }
      }, { once: true });
    }, 100);

    return popup;
  }

  /**
   * Position popup near the textarea
   */
  private positionPopup(textarea: HTMLElement): void {
    if (!this.popup) return;

    const rect = textarea.getBoundingClientRect();
    const popupWidth = 480;
    const popupHeight = Math.min(window.innerHeight * 0.6, 400);

    // Calculate available space
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    // Position above or below based on available space
    let top: number;
    if (spaceBelow >= popupHeight + 10 || spaceBelow > spaceAbove) {
      // Position below
      top = rect.bottom + 8;
    } else {
      // Position above
      top = rect.top - popupHeight - 8;
    }

    // Ensure it stays within viewport vertically
    top = Math.max(10, Math.min(top, window.innerHeight - popupHeight - 10));

    // Center horizontally relative to textarea
    let left = rect.left + (rect.width - popupWidth) / 2;
    
    // Ensure it stays within viewport horizontally
    left = Math.max(10, Math.min(left, window.innerWidth - popupWidth - 10));

    this.popup.style.top = `${top}px`;
    this.popup.style.left = `${left}px`;
    this.popup.style.maxHeight = `${popupHeight}px`;
  }

  /**
   * Load and display replies
   */
  private async loadReplies(): Promise<void> {
    if (!this.popup) return;

    const content = this.popup.querySelector('.arsenal-mode-popup__content');
    const tabs = this.popup.querySelector('.arsenal-mode-popup__tabs');
    if (!content || !tabs) return;

    // Get categories
    const categories = this.arsenalService.getCategories();
    
    // Create category tabs
    tabs.innerHTML = '';
    categories.forEach((category, index) => {
      const tab = document.createElement('button');
      tab.className = index === 0 ? 'arsenal-mode-popup__tab arsenal-mode-popup__tab--active' : 'arsenal-mode-popup__tab';
      tab.dataset.categoryId = category.id;
      tab.innerHTML = `${category.icon || category.emoji || ''} ${category.name}`;
      
      tab.onclick = () => this.selectCategory(category.id);
      tabs.appendChild(tab);
    });

    // Load first category
    if (categories.length > 0) {
      await this.selectCategory(categories[0].id);
    }
  }

  /**
   * Select and display a category
   */
  private async selectCategory(categoryId: string): Promise<void> {
    if (!this.popup) return;

    // Update tab styles
    const tabs = this.popup.querySelectorAll('.arsenal-mode-popup__tab');
    tabs.forEach(tab => {
      const isActive = tab.getAttribute('data-category-id') === categoryId;
      if (isActive) {
        tab.classList.add('arsenal-mode-popup__tab--active');
      } else {
        tab.classList.remove('arsenal-mode-popup__tab--active');
      }
    });

    // Load category replies
    const content = this.popup.querySelector('.arsenal-mode-popup__content');
    if (!content) return;

    const replies = await this.arsenalService.getRepliesByCategory(categoryId);
    
    if (replies.length === 0) {
      content.innerHTML = `
        <div class="arsenal-mode-popup__empty">
          <div class="arsenal-mode-popup__empty-emoji">📭</div>
          <div class="arsenal-mode-popup__empty-text">
            <p>${UI_STRINGS.EMPTY_STATE.TITLE}</p>
            <p style="font-size: 12px; margin-top: 8px; opacity: 0.7;">${UI_STRINGS.EMPTY_STATE.SUBTITLE}</p>
          </div>
        </div>
      `;
      return;
    }

    // Display replies
    content.innerHTML = '';
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      gap: 8px;
    `;

    replies.forEach(reply => {
      const card = this.createReplyCard(reply);
      grid.appendChild(card);
    });

    content.appendChild(grid);
  }

  /**
   * Create a reply card
   */
  private createReplyCard(reply: any): HTMLElement {
    const card = document.createElement('div');
    card.className = 'arsenal-mode-popup__reply-card';

    // Reply text
    const text = document.createElement('div');
    text.className = 'arsenal-mode-popup__reply-text';
    text.textContent = reply.text;

    // Metadata
    const meta = document.createElement('div');
    meta.className = 'arsenal-mode-popup__reply-stats';

    const usage = document.createElement('span');
    usage.textContent = `Used ${reply.usageCount} times`;

    const actions = document.createElement('div');
    actions.className = 'arsenal-mode-popup__reply-actions';

    // Favorite button
    const favBtn = document.createElement('button');
    favBtn.className = reply.isFavorite ? 
      'arsenal-mode-popup__reply-action arsenal-mode-popup__reply-action--favorite' : 
      'arsenal-mode-popup__reply-action';
    favBtn.innerHTML = reply.isFavorite ? '❤️' : '🤍';
    favBtn.onclick = (e) => {
      e.stopPropagation();
      this.toggleFavorite(reply.id);
    };

    actions.appendChild(favBtn);
    meta.appendChild(usage);
    meta.appendChild(actions);

    card.appendChild(text);
    card.appendChild(meta);

    // Click to use
    card.onclick = () => this.useReply(reply);

    return card;
  }

  /**
   * Use a reply
   */
  private async useReply(reply: any): Promise<void> {
    // Find the textarea that was passed when opening the popup
    const textarea = document.querySelector('[data-testid="tweetTextarea_0"], [contenteditable="true"][role="textbox"]') as HTMLElement;
    if (!textarea) return;

    // Insert the reply text
    DOMUtils.setTextareaValue(textarea, reply.text);

    // Track usage
    await this.arsenalService.trackUsage(reply.id);

    // Close popup
    this.close();

    console.log('%c⚔️ Arsenal reply used', 'color: #17BF63', reply.id);
  }

  /**
   * Toggle favorite status
   */
  private async toggleFavorite(replyId: string): Promise<void> {
    const isFavorite = await this.arsenalService.toggleFavorite(replyId);
    
    // Refresh the current category display
    const activeTab = this.popup?.querySelector('.arsenal-tab[style*="1DA1F2"]');
    if (activeTab) {
      const categoryId = activeTab.getAttribute('data-category-id');
      if (categoryId) {
        await this.selectCategory(categoryId);
      }
    }
  }

  /**
   * Create Arsenal Mode button for Twitter UI
   */
  static createButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'arsenal-mode-btn';
    button.title = 'Arsenal Mode (Alt+A)';
    button.style.cssText = `
      background: transparent;
      border: none;
      color: #8899A6;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      margin-left: 4px;
    `;

    button.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
      </svg>
    `;

    button.onmouseover = () => {
      button.style.backgroundColor = 'rgba(29, 161, 242, 0.1)';
      button.style.color = '#1DA1F2';
    };

    button.onmouseout = () => {
      button.style.backgroundColor = 'transparent';
      button.style.color = '#8899A6';
    };

    return button;
  }
}

// Export singleton instance
export const arsenalModeUI = new ArsenalModeUI();
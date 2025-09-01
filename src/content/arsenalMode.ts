/**
 * Arsenal Mode UI Component
 * Displays pre-generated replies for quick selection
 */

import { ArsenalService } from '@/services/arsenalService';
import { DOMUtils } from './domUtils';
import './arsenalMode.scss';

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
    tabs.className = 'arsenal-tabs';
    tabs.style.cssText = `
      display: flex;
      padding: 0 16px;
      gap: 8px;
      border-bottom: 1px solid #38444D;
      overflow-x: auto;
    `;

    // Content area
    const content = document.createElement('div');
    content.className = 'arsenal-content';
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    `;

    // Loading indicator
    const loading = document.createElement('div');
    loading.className = 'arsenal-loading';
    loading.style.cssText = `
      text-align: center;
      color: #8899A6;
      padding: 40px;
    `;
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
    const popupHeight = 600;
    const popupWidth = 500;

    // Position above or below textarea based on available space
    let top = rect.top - popupHeight - 10;
    if (top < 10) {
      top = rect.bottom + 10;
    }

    // Center horizontally relative to textarea
    let left = rect.left + (rect.width - popupWidth) / 2;
    if (left < 10) left = 10;
    if (left + popupWidth > window.innerWidth - 10) {
      left = window.innerWidth - popupWidth - 10;
    }

    this.popup.style.top = `${top}px`;
    this.popup.style.left = `${left}px`;
  }

  /**
   * Load and display replies
   */
  private async loadReplies(): Promise<void> {
    if (!this.popup) return;

    const content = this.popup.querySelector('.arsenal-content');
    const tabs = this.popup.querySelector('.arsenal-tabs');
    if (!content || !tabs) return;

    // Get categories
    const categories = this.arsenalService.getCategories();
    
    // Create category tabs
    tabs.innerHTML = '';
    categories.forEach((category, index) => {
      const tab = document.createElement('button');
      tab.className = 'arsenal-tab';
      tab.dataset.categoryId = category.id;
      tab.style.cssText = `
        background: ${index === 0 ? '#1DA1F2' : 'transparent'};
        border: none;
        color: ${index === 0 ? '#FFFFFF' : '#8899A6'};
        padding: 8px 16px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 14px;
        white-space: nowrap;
        transition: all 0.2s;
      `;
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
    const tabs = this.popup.querySelectorAll('.arsenal-tab');
    tabs.forEach(tab => {
      const isActive = tab.getAttribute('data-category-id') === categoryId;
      (tab as HTMLElement).style.backgroundColor = isActive ? '#1DA1F2' : 'transparent';
      (tab as HTMLElement).style.color = isActive ? '#FFFFFF' : '#8899A6';
    });

    // Load category replies
    const content = this.popup.querySelector('.arsenal-content');
    if (!content) return;

    const replies = await this.arsenalService.getRepliesByCategory(categoryId);
    
    if (replies.length === 0) {
      content.innerHTML = `
        <div style="text-align: center; color: #8899A6; padding: 40px;">
          <p>No replies in this category yet.</p>
          <p style="font-size: 12px; margin-top: 10px;">Generate some replies to build your arsenal!</p>
        </div>
      `;
      return;
    }

    // Display replies
    content.innerHTML = '';
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      gap: 12px;
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
    card.className = 'arsenal-reply-card';
    card.style.cssText = `
      background: #192734;
      border: 1px solid #38444D;
      border-radius: 12px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    `;

    // Reply text
    const text = document.createElement('div');
    text.style.cssText = `
      color: #FFFFFF;
      font-size: 14px;
      line-height: 1.4;
      margin-bottom: 8px;
    `;
    text.textContent = reply.text;

    // Metadata
    const meta = document.createElement('div');
    meta.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #8899A6;
    `;

    const usage = document.createElement('span');
    usage.textContent = `Used ${reply.usageCount} times`;

    const actions = document.createElement('div');
    actions.style.cssText = `display: flex; gap: 8px;`;

    // Favorite button
    const favBtn = document.createElement('button');
    favBtn.style.cssText = `
      background: none;
      border: none;
      color: ${reply.isFavorite ? '#E0245E' : '#8899A6'};
      cursor: pointer;
      padding: 4px;
    `;
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

    // Hover effect
    card.onmouseover = () => {
      card.style.backgroundColor = '#1E2732';
      card.style.borderColor = '#1DA1F2';
    };
    card.onmouseout = () => {
      card.style.backgroundColor = '#192734';
      card.style.borderColor = '#38444D';
    };

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
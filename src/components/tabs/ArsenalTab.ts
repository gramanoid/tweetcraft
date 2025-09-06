/**
 * ArsenalTab Component
 * Manages pre-generated replies for quick selection
 * Integrated from standalone Arsenal Mode into main popup
 */

import { TabComponent } from './TabManager';

interface ArsenalReply {
  id: string;
  templateId: string;
  toneId: string;
  text: string;
  category: string;
  tags: string[];
  usageCount: number;
  lastUsed?: Date;
  createdAt: Date;
  temperature: number;
  isFavorite: boolean;
}

interface ArsenalCategory {
  id: string;
  name: string;
  icon?: string;
  emoji?: string;
  description?: string;
}

export class ArsenalTab implements TabComponent {
  private onSelectCallback: ((config: any) => void) | null;
  private currentCategory: string = 'quick';
  private replies: ArsenalReply[] = [];
  private categories: ArsenalCategory[] = [
    { id: 'quick', name: 'Quick', emoji: '⚡', description: 'Fast responses' },
    { id: 'debate', name: 'Debate', emoji: '🎯', description: 'Argumentative replies' },
    { id: 'humor', name: 'Humor', emoji: '😄', description: 'Funny responses' },
    { id: 'support', name: 'Support', emoji: '💙', description: 'Supportive messages' },
    { id: 'professional', name: 'Professional', emoji: '💼', description: 'Business replies' },
    { id: 'viral', name: 'Viral', emoji: '🔥', description: 'Engagement-focused' }
  ];
  private searchQuery: string = '';
  private selectedReplies: Set<string> = new Set();
  private isLoading: boolean = false;

  constructor(onSelectCallback: ((config: any) => void) | null) {
    this.onSelectCallback = onSelectCallback;
    this.loadArsenalData();
  }

  public render(): string {
    return this.getHTML();
  }

  public cleanup(): void {
    // Cleanup will be handled by the TabManager
    this.selectedReplies.clear();
  }

  public destroy(): void {
    // Clean up any resources
    this.replies = [];
    this.selectedReplies.clear();
  }

  public attachEventListeners(container: HTMLElement): void {
    // Category tab clicks
    container.querySelectorAll('.arsenal-category-tab').forEach((tab: Element) => {
      tab.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        const categoryId = target.dataset.categoryId;
        if (categoryId) {
          this.switchCategory(categoryId, container);
        }
      });
    });

    // Search input
    const searchInput = container.querySelector('.arsenal-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLInputElement;
        this.searchQuery = target.value;
        this.updateRepliesDisplay(container);
      });
    }

    // Reply card clicks
    container.querySelectorAll('.arsenal-reply-card').forEach((card: Element) => {
      card.addEventListener('click', (e: Event) => {
        const target = e.currentTarget as HTMLElement;
        const replyId = target.dataset.replyId;
        if (replyId) {
          this.selectReply(replyId);
        }
      });
    });

    // Checkbox clicks (for bulk selection)
    container.querySelectorAll('.arsenal-reply-checkbox').forEach((checkbox: Element) => {
      checkbox.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const input = e.target as HTMLInputElement;
        const replyId = input.dataset.replyId;
        if (replyId) {
          this.toggleReplySelection(replyId, input.checked);
        }
      });
    });

    // Favorite button clicks
    container.querySelectorAll('.arsenal-favorite-btn').forEach((btn: Element) => {
      btn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const replyId = target.dataset.replyId;
        if (replyId) {
          this.toggleFavorite(replyId, container);
        }
      });
    });

    // Bulk action buttons
    const deleteSelectedBtn = container.querySelector('.arsenal-delete-selected');
    if (deleteSelectedBtn) {
      deleteSelectedBtn.addEventListener('click', () => {
        this.deleteSelectedReplies(container);
      });
    }

    const copySelectedBtn = container.querySelector('.arsenal-copy-selected');
    if (copySelectedBtn) {
      copySelectedBtn.addEventListener('click', () => {
        this.copySelectedReplies();
      });
    }

    // Add new reply button
    const addReplyBtn = container.querySelector('.arsenal-add-reply-btn');
    if (addReplyBtn) {
      addReplyBtn.addEventListener('click', () => {
        this.openAddReplyDialog();
      });
    }

    // Filter buttons
    const filterFavoritesBtn = container.querySelector('.arsenal-filter-favorites');
    if (filterFavoritesBtn) {
      filterFavoritesBtn.addEventListener('click', () => {
        this.toggleFavoritesFilter(container);
      });
    }

    const sortSelect = container.querySelector('.arsenal-sort-select') as HTMLSelectElement;
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.sortReplies(sortSelect.value, container);
      });
    }
  }

  private async loadArsenalData(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Send message to service worker to get Arsenal data
      const response = await chrome.runtime.sendMessage({
        type: 'GET_ARSENAL_REPLIES',
        category: this.currentCategory
      });
      
      if (response && response.success) {
        this.replies = response.replies || [];
      }
    } catch (error) {
      console.error('Failed to load Arsenal replies:', error);
      this.replies = [];
    }
    
    this.isLoading = false;
  }

  private getHTML(): string {
    if (this.isLoading) {
      return `
        <div class="arsenal-loading">
          <div class="loading-spinner"></div>
          <p>Loading Arsenal...</p>
        </div>
      `;
    }

    const filteredReplies = this.getFilteredReplies();

    return `
      <div class="arsenal-container">
        ${this.getCategoryTabsHTML()}
        ${this.getToolbarHTML()}
        ${this.getRepliesGridHTML(filteredReplies)}
        ${this.getBulkActionsHTML()}
      </div>
    `;
  }

  private getCategoryTabsHTML(): string {
    return `
      <div class="arsenal-category-tabs">
        ${this.categories.map(cat => `
          <button 
            class="arsenal-category-tab ${cat.id === this.currentCategory ? 'active' : ''}"
            data-category-id="${cat.id}"
            title="${cat.description || ''}"
          >
            <span class="category-emoji">${cat.emoji || cat.icon || ''}</span>
            <span class="category-name">${cat.name}</span>
            <span class="category-count">${this.getCountForCategory(cat.id)}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  private getToolbarHTML(): string {
    return `
      <div class="arsenal-toolbar">
        <div class="arsenal-search-wrapper">
          <input 
            type="text" 
            class="arsenal-search-input" 
            placeholder="Search replies..."
            value="${this.searchQuery}"
          />
          <span class="search-icon">🔍</span>
        </div>
        
        <div class="arsenal-actions">
          <button class="arsenal-filter-favorites" title="Show favorites only">
            ⭐
          </button>
          
          <select class="arsenal-sort-select">
            <option value="recent">Most Recent</option>
            <option value="usage">Most Used</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
          
          <button class="arsenal-add-reply-btn" title="Add new reply">
            ➕ Add Reply
          </button>
        </div>
      </div>
    `;
  }

  private getRepliesGridHTML(replies: ArsenalReply[]): string {
    if (replies.length === 0) {
      return `
        <div class="arsenal-empty-state">
          <div class="empty-icon">⚔️</div>
          <h3>No replies in this category</h3>
          <p>Generate some replies to build your arsenal!</p>
        </div>
      `;
    }

    return `
      <div class="arsenal-replies-grid">
        ${replies.map(reply => this.getReplyCardHTML(reply)).join('')}
      </div>
    `;
  }

  private getReplyCardHTML(reply: ArsenalReply): string {
    const isSelected = this.selectedReplies.has(reply.id);
    
    return `
      <div 
        class="arsenal-reply-card ${isSelected ? 'selected' : ''}" 
        data-reply-id="${reply.id}"
      >
        <div class="reply-card-header">
          <input 
            type="checkbox" 
            class="arsenal-reply-checkbox" 
            data-reply-id="${reply.id}"
            ${isSelected ? 'checked' : ''}
          />
          <button 
            class="arsenal-favorite-btn ${reply.isFavorite ? 'active' : ''}" 
            data-reply-id="${reply.id}"
            title="${reply.isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
          >
            ${reply.isFavorite ? '❤️' : '🤍'}
          </button>
        </div>
        
        <div class="reply-card-content">
          <p class="reply-text">${this.escapeHtml(reply.text)}</p>
        </div>
        
        <div class="reply-card-footer">
          <div class="reply-meta">
            <span class="usage-count">Used ${reply.usageCount}x</span>
            ${reply.tags && reply.tags.length > 0 ? `
              <div class="reply-tags">
                ${reply.tags.slice(0, 3).map(tag => `
                  <span class="tag">#${tag}</span>
                `).join('')}
              </div>
            ` : ''}
          </div>
          
          <div class="reply-actions">
            <button class="copy-btn" title="Copy to clipboard">📋</button>
            <button class="edit-btn" title="Edit reply">✏️</button>
            <button class="delete-btn" title="Delete reply">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }

  private getBulkActionsHTML(): string {
    const selectedCount = this.selectedReplies.size;
    
    if (selectedCount === 0) {
      return '';
    }

    return `
      <div class="arsenal-bulk-actions">
        <span class="selected-count">${selectedCount} selected</span>
        <button class="arsenal-copy-selected">📋 Copy Selected</button>
        <button class="arsenal-delete-selected">🗑️ Delete Selected</button>
      </div>
    `;
  }

  private getFilteredReplies(): ArsenalReply[] {
    let filtered = this.replies.filter(r => r.category === this.currentCategory);
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.text.toLowerCase().includes(query) ||
        r.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }

  private getCountForCategory(categoryId: string): number {
    return this.replies.filter(r => r.category === categoryId).length;
  }

  private async switchCategory(categoryId: string, container: HTMLElement): Promise<void> {
    this.currentCategory = categoryId;
    this.selectedReplies.clear();
    await this.loadArsenalData();
    
    // Re-render the content
    container.innerHTML = this.render();
    this.attachEventListeners(container);
  }

  private updateRepliesDisplay(container: HTMLElement): void {
    const grid = container.querySelector('.arsenal-replies-grid');
    if (grid) {
      const filteredReplies = this.getFilteredReplies();
      grid.innerHTML = filteredReplies.map(r => this.getReplyCardHTML(r)).join('');
      
      // Re-attach event listeners for the new cards
      this.attachEventListeners(container);
    }
  }

  private async selectReply(replyId: string): Promise<void> {
    const reply = this.replies.find(r => r.id === replyId);
    if (!reply) return;

    // Send the reply text to the callback if available
    if (this.onSelectCallback) {
      this.onSelectCallback({
        tab: 'arsenal',
        text: reply.text,
        replyId: reply.id
      });
    }

    // Track usage
    await chrome.runtime.sendMessage({
      type: 'TRACK_ARSENAL_USAGE',
      replyId: reply.id
    });
  }

  private toggleReplySelection(replyId: string, isChecked: boolean): void {
    if (isChecked) {
      this.selectedReplies.add(replyId);
    } else {
      this.selectedReplies.delete(replyId);
    }
  }

  private async toggleFavorite(replyId: string, container: HTMLElement): Promise<void> {
    const reply = this.replies.find(r => r.id === replyId);
    if (!reply) return;

    reply.isFavorite = !reply.isFavorite;
    
    // Update in backend
    await chrome.runtime.sendMessage({
      type: 'TOGGLE_ARSENAL_FAVORITE',
      replyId: reply.id,
      isFavorite: reply.isFavorite
    });

    // Update the card display
    const card = container.querySelector(`[data-reply-id="${replyId}"]`);
    if (card) {
      const favBtn = card.querySelector('.arsenal-favorite-btn');
      if (favBtn) {
        favBtn.innerHTML = reply.isFavorite ? '❤️' : '🤍';
        favBtn.classList.toggle('active', reply.isFavorite);
      }
    }
  }

  private async deleteSelectedReplies(container: HTMLElement): Promise<void> {
    if (this.selectedReplies.size === 0) return;
    
    if (!confirm(`Delete ${this.selectedReplies.size} selected replies?`)) {
      return;
    }

    // Delete from backend
    await chrome.runtime.sendMessage({
      type: 'DELETE_ARSENAL_REPLIES',
      replyIds: Array.from(this.selectedReplies)
    });

    // Remove from local array
    this.replies = this.replies.filter(r => !this.selectedReplies.has(r.id));
    this.selectedReplies.clear();

    // Re-render
    container.innerHTML = this.render();
    this.attachEventListeners(container);
  }

  private copySelectedReplies(): void {
    const selectedTexts = this.replies
      .filter(r => this.selectedReplies.has(r.id))
      .map(r => r.text)
      .join('\n\n---\n\n');
    
    // Skip clipboard operations in non-DOM environments
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      console.log(`[Arsenal] Would copy ${this.selectedReplies.size} replies to clipboard`);
      return;
    }
    
    navigator.clipboard.writeText(selectedTexts).then(() => {
      console.log(`✅ Copied ${this.selectedReplies.size} replies to clipboard!`);
      this.showNotification(`Copied ${this.selectedReplies.size} replies to clipboard!`, 'success');
    }).catch(error => {
      console.error('Failed to copy to clipboard:', error);
      this.showNotification('Failed to copy to clipboard', 'error');
    });
  }

  private openAddReplyDialog(): void {
    // This would open a dialog to add a new reply
    // For now, we'll just show an alert
    alert('Add Reply dialog would open here');
  }

  private toggleFavoritesFilter(container: HTMLElement): void {
    // Implementation for favorites filter
    const filterBtn = container.querySelector('.arsenal-filter-favorites');
    if (filterBtn) {
      filterBtn.classList.toggle('active');
      // Re-filter and display
      this.updateRepliesDisplay(container);
    }
  }

  private sortReplies(sortBy: string, container: HTMLElement): void {
    switch (sortBy) {
      case 'usage':
        this.replies.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'alphabetical':
        this.replies.sort((a, b) => a.text.localeCompare(b.text));
        break;
      case 'recent':
      default:
        this.replies.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
    
    this.updateRepliesDisplay(container);
  }

  private escapeHtml(text: string): string {
    // Use string replacement instead of DOM for service worker compatibility
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'\/]/g, (char) => htmlEscapes[char]);
  }

  /**
   * Show notification for actions - safely handles both DOM and non-DOM environments
   */
  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    // Always log to console for debugging
    console.log(`[Arsenal ${type}] ${message}`);
    
    // Skip DOM operations in non-DOM environments (e.g., service worker)
    if (typeof document === 'undefined' || !document.body) {
      return;
    }
    
    try {
      const notification = document.createElement('div');
      notification.className = `arsenal-notification ${type}`;
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
          notification.classList.remove('show');
          setTimeout(() => notification.remove(), 300);
        }, 2000);
      }, 10);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }
}

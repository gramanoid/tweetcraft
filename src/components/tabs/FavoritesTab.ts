/**
 * FavoritesTab Component
 * Manages favorite template combinations and quick access
 */

import { TabComponent } from './TabManager';

export class FavoritesTab implements TabComponent {
  private onSelectCallback: (config: any) => void;
  private favorites: any[] = [];

  constructor(onSelectCallback: (config: any) => void) {
    this.onSelectCallback = onSelectCallback;
    this.loadFavorites();
  }

  public render(): string {
    this.loadFavorites();
    return this.getHTML();
  }

  public cleanup(): void {
    // Cleanup will be handled by the TabManager
  }

  public destroy(): void {
    // Clean up any resources
    this.favorites = [];
  }

  public attachEventListeners(container: HTMLElement): void {
    // Apply favorite buttons
    container.querySelectorAll('.apply-favorite-btn').forEach((btn: Element) => {
      btn.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        const index = parseInt(target.dataset.index || '0');
        this.handleFavoriteClick(index);
      });
    });

    // Clear all button
    const clearBtn = container.querySelector('.clear-favorites-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearAllFavorites();
        // Re-render after clearing
        const parent = container.parentElement;
        if (parent) {
          container.innerHTML = this.render();
          this.attachEventListeners(container);
        }
      });
    }
  }

  private loadFavorites(): void {
    // Load favorites from storage
    const stored = localStorage.getItem('tweetcraft_favorites');
    if (stored) {
      try {
        this.favorites = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to load favorites:', e);
        this.favorites = [];
      }
    }
  }

  private getHTML(): string {
    if (this.favorites.length === 0) {
      return `
        <div class="favorites-empty">
          <div class="empty-state">
            <span class="empty-icon">⭐</span>
            <p>No favorites yet!</p>
            <p class="empty-hint">Save your favorite combinations from the All tab</p>
          </div>
        </div>
      `;
    }

    const favoritesHTML = this.favorites.slice(0, 5).map((fav, index) => `
      <div class="favorite-item" data-index="${index}">
        <div class="favorite-header">
          <span class="favorite-rank">#${index + 1}</span>
          <span class="favorite-name">${fav.name || 'Unnamed'}</span>
        </div>
        <div class="favorite-details">
          <span class="detail-badge">${fav.personality || 'Default'}</span>
          <span class="detail-badge">${fav.vocabulary || 'Standard'}</span>
        </div>
        <button class="apply-favorite-btn" data-index="${index}">Apply</button>
      </div>
    `).join('');

    return `
      <div class="favorites-container">
        <div class="favorites-header">
          <h3>Your Favorite Combinations</h3>
          <button class="clear-favorites-btn">Clear All</button>
        </div>
        <div class="favorites-grid">
          ${favoritesHTML}
        </div>
      </div>
    `;
  }

  // Event handling will be managed by TabManager after inserting HTML
  public handleFavoriteClick(index: number): void {
    if (this.favorites[index]) {
      this.onSelectCallback({
        tab: 'favorites',
        ...this.favorites[index]
      });
    }
  }

  public clearAllFavorites(): void {
    if (confirm('Clear all favorites?')) {
      this.favorites = [];
      localStorage.removeItem('tweetcraft_favorites');
    }
  }
}

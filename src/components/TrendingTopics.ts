/**
 * Trending Topics Component
 * Shows current trending topics from Exa API
 */

import { TrendService, TrendingTopic } from '../services/trendService';
import { MessageType } from '../types/messages';

export class TrendingTopicsView {
  private container: HTMLElement | null = null;
  private isLoading: boolean = false;
  private selectedCategory: string = 'all';

  /**
   * Create the trending topics view
   */
  create(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tweetcraft-trending-topics';
    container.innerHTML = this.generateHTML();
    
    this.container = container;
    this.attachEventListeners();
    this.loadTrendingTopics();
    
    return container;
  }

  /**
   * Generate HTML structure
   */
  private generateHTML(): string {
    return `
      <div class="trending-topics-container">
        <div class="trending-header">
          <h3>🔥 Trending Topics</h3>
          <button class="refresh-btn" title="Refresh">🔄</button>
        </div>
        
        <div class="category-filters">
          <button class="category-btn active" data-category="all">All</button>
          <button class="category-btn" data-category="tech">Tech</button>
          <button class="category-btn" data-category="news">News</button>
          <button class="category-btn" data-category="business">Business</button>
          <button class="category-btn" data-category="entertainment">Entertainment</button>
        </div>
        
        <div class="trending-topics-list" id="trendingTopicsList">
          <div class="loading">
            <span>Loading trending topics...</span>
          </div>
        </div>
        
        <div class="trending-insights">
          <h4>💡 How to Use</h4>
          <div class="insight-item">
            <span class="insight-icon">1️⃣</span>
            <span class="insight-text">Click any topic to auto-compose a tweet</span>
          </div>
          <div class="insight-item">
            <span class="insight-icon">2️⃣</span>
            <span class="insight-text">Topics update every 30 minutes</span>
          </div>
          <div class="insight-item">
            <span class="insight-icon">3️⃣</span>
            <span class="insight-text">Filter by category for relevant content</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Load trending topics
   */
  private async loadTrendingTopics(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      // Fetch trending topics via service worker
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          { type: MessageType.FETCH_TRENDING_TOPICS },
          (response) => resolve(response)
        );
      });

      if (response?.success && response.data) {
        this.displayTopics(response.data);
      } else {
        this.showError('Failed to load trending topics');
      }
    } catch (error) {
      console.error('Failed to load trending topics:', error);
      this.showError('Unable to fetch trending topics');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Display trending topics
   */
  private displayTopics(topics: TrendingTopic[]): void {
    if (!this.container) return;

    const listContainer = this.container.querySelector('#trendingTopicsList');
    if (!listContainer) return;

    // Filter topics by selected category
    const filteredTopics = this.selectedCategory === 'all' 
      ? topics 
      : topics.filter(t => t.category === this.selectedCategory);

    if (filteredTopics.length === 0) {
      listContainer.innerHTML = `
        <div class="no-topics">
          <span class="no-topics-icon">🔍</span>
          <p>No trending topics found</p>
          <small>Try selecting a different category</small>
        </div>
      `;
      return;
    }

    // Display topics with rank
    listContainer.innerHTML = filteredTopics.map((topic, index) => {
      const rank = index + 1;
      const trendIcon = this.getTrendIcon(topic.category);
      const volumeIndicator = this.getVolumeIndicator(topic.volume);
      
      return `
        <div class="topic-item" data-topic="${this.escapeHtml(topic.topic)}">
          <div class="topic-rank">#${rank}</div>
          <div class="topic-content">
            <div class="topic-header">
              <span class="topic-icon">${trendIcon}</span>
              <span class="topic-name">${this.escapeHtml(topic.topic)}</span>
              ${volumeIndicator}
            </div>
            ${topic.description ? `
              <div class="topic-description">${this.escapeHtml(topic.description)}</div>
            ` : ''}
            ${topic.relatedKeywords?.length ? `
              <div class="topic-keywords">
                ${topic.relatedKeywords.map(kw => 
                  `<span class="keyword-chip">${this.escapeHtml(kw)}</span>`
                ).join('')}
              </div>
            ` : ''}
          </div>
          <button class="topic-action" title="Compose tweet about this topic">
            ✍️
          </button>
        </div>
      `;
    }).join('');

    // Add click handlers for topics
    listContainer.querySelectorAll('.topic-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.classList.contains('topic-action') && !target.closest('.topic-action')) {
          this.handleTopicClick(item as HTMLElement);
        }
      });
    });

    // Add compose button handlers
    listContainer.querySelectorAll('.topic-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const topicItem = (e.target as HTMLElement).closest('.topic-item') as HTMLElement;
        if (topicItem) {
          this.composeTweetAboutTopic(topicItem);
        }
      });
    });
  }

  /**
   * Get trend icon based on category
   */
  private getTrendIcon(category?: string): string {
    switch (category) {
      case 'tech': return '💻';
      case 'news': return '📰';
      case 'business': return '💼';
      case 'entertainment': return '🎭';
      case 'sports': return '⚽';
      case 'health': return '🏥';
      default: return '📌';
    }
  }

  /**
   * Get volume indicator
   */
  private getVolumeIndicator(volume?: number): string {
    if (!volume) return '';
    
    let indicator = '';
    let label = '';
    
    if (volume > 100000) {
      indicator = '🔥🔥🔥';
      label = 'Very Hot';
    } else if (volume > 50000) {
      indicator = '🔥🔥';
      label = 'Hot';
    } else if (volume > 10000) {
      indicator = '🔥';
      label = 'Trending';
    } else {
      indicator = '📈';
      label = 'Rising';
    }
    
    return `<span class="volume-indicator" title="${volume.toLocaleString()} mentions">${indicator} ${label}</span>`;
  }

  /**
   * Handle topic click
   */
  private handleTopicClick(topicItem: HTMLElement): void {
    const topic = topicItem.dataset.topic;
    if (!topic) return;

    // Highlight selected topic
    this.container?.querySelectorAll('.topic-item').forEach(item => {
      item.classList.remove('selected');
    });
    topicItem.classList.add('selected');

    // Could trigger template suggestions based on topic
    console.log('%c🔥 Selected trending topic', 'color: #FF6B6B; font-weight: bold', topic);
  }

  /**
   * Compose tweet about topic
   */
  private composeTweetAboutTopic(topicItem: HTMLElement): void {
    const topic = topicItem.dataset.topic;
    if (!topic) return;

    // Switch to compose tab with this topic
    const composeTab = document.querySelector('[data-view="compose"]') as HTMLElement;
    if (composeTab) {
      composeTab.click();
      
      // Wait for compose view to render
      setTimeout(() => {
        const topicInput = document.querySelector('#compose-topic') as HTMLInputElement;
        if (topicInput) {
          topicInput.value = topic;
          topicInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 100);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Show error state
   */
  private showError(message: string): void {
    if (!this.container) return;
    
    const listContainer = this.container.querySelector('#trendingTopicsList');
    if (listContainer) {
      listContainer.innerHTML = `
        <div class="error-message">
          <span>⚠️ ${message}</span>
          <button class="retry-button">Retry</button>
        </div>
      `;
      
      const retryButton = listContainer.querySelector('.retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => this.loadTrendingTopics());
      }
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Refresh button
    const refreshBtn = this.container.querySelector('.refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('spinning');
        this.loadTrendingTopics().finally(() => {
          refreshBtn.classList.remove('spinning');
        });
      });
    }

    // Category filters
    this.container.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const category = target.dataset.category;
        if (!category) return;

        // Update active state
        this.container?.querySelectorAll('.category-btn').forEach(b => {
          b.classList.remove('active');
        });
        target.classList.add('active');

        // Update selected category and reload
        this.selectedCategory = category;
        this.loadTrendingTopics();
      });
    });
  }
}

// Export singleton instance
export const trendingTopicsView = new TrendingTopicsView();
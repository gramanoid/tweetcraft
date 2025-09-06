/**
 * Trending Tab Component
 * SPRINT 4: Live trends interface with real-time updates
 */

import { TabComponent } from './TabManager';
import { TrendService, TrendingTopic, ContentSuggestion } from '@/services/trendService';

interface TrendingState {
  topics: TrendingTopic[];
  suggestions: ContentSuggestion[];
  selectedCategory: string;
  isLoading: boolean;
  lastUpdate: Date | null;
  autoRefresh: boolean;
  refreshInterval: number;
}

export class TrendingTab implements TabComponent {
  private container: HTMLElement | null = null;
  private state: TrendingState;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.state = {
      topics: [],
      suggestions: [],
      selectedCategory: 'all',
      isLoading: false,
      lastUpdate: null,
      autoRefresh: true,
      refreshInterval: 5 * 60 * 1000 // 5 minutes
    };
  }

  async onShow(): Promise<void> {
    await this.loadTrends();
    if (this.state.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  render(): string {
    const categories = [
      { value: 'all', label: '🌐 All Topics', icon: '🌐' },
      { value: 'tech', label: '💻 Tech', icon: '💻' },
      { value: 'news', label: '📰 News', icon: '📰' },
      { value: 'sports', label: '⚽ Sports', icon: '⚽' },
      { value: 'entertainment', label: '🎬 Entertainment', icon: '🎬' },
      { value: 'business', label: '💼 Business', icon: '💼' },
      { value: 'science', label: '🔬 Science', icon: '🔬' },
      { value: 'politics', label: '🏛️ Politics', icon: '🏛️' }
    ];

    return `
      <div class="trending-tab">
        <!-- Header -->
        <div class="trending-header">
          <div class="header-title">
            <h2>🔥 Live Trends</h2>
            ${this.state.lastUpdate ? `
              <span class="last-update">
                Updated ${this.getRelativeTime(this.state.lastUpdate)}
              </span>
            ` : ''}
          </div>
          
          <div class="header-controls">
            <button class="btn-refresh ${this.state.isLoading ? 'loading' : ''}" 
                    title="Refresh trends">
              ${this.state.isLoading ? '⟲' : '🔄'}
            </button>
            
            <label class="auto-refresh-toggle">
              <input type="checkbox" 
                     ${this.state.autoRefresh ? 'checked' : ''}
                     data-auto-refresh>
              <span>Auto-refresh</span>
            </label>
          </div>
        </div>

        <!-- Category Filters -->
        <div class="category-filters">
          ${categories.map(cat => `
            <button class="category-btn ${this.state.selectedCategory === cat.value ? 'active' : ''}"
                    data-category="${cat.value}">
              <span class="category-icon">${cat.icon}</span>
              <span class="category-label">${cat.label.split(' ')[1]}</span>
            </button>
          `).join('')}
        </div>

        <!-- Loading State -->
        ${this.state.isLoading ? `
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Fetching latest trends...</p>
          </div>
        ` : ''}

        <!-- Trending Topics Section -->
        ${!this.state.isLoading && this.state.topics.length > 0 ? `
          <div class="trending-section">
            <h3 class="section-title">📈 Trending Now</h3>
            <div class="topics-grid">
              ${this.state.topics.map(topic => `
                <div class="topic-card" data-topic="${this.escapeHtml(topic.topic)}">
                  <div class="topic-header">
                    <span class="topic-name">${this.escapeHtml(topic.topic)}</span>
                    ${topic.volume ? `
                      <span class="topic-volume" title="Tweet volume">
                        ${this.formatNumber(topic.volume)}
                      </span>
                    ` : ''}
                  </div>
                  
                  ${topic.description ? `
                    <p class="topic-description">
                      ${this.escapeHtml(topic.description)}
                    </p>
                  ` : ''}
                  
                  ${topic.relatedKeywords && topic.relatedKeywords.length > 0 ? `
                    <div class="topic-keywords">
                      ${topic.relatedKeywords.slice(0, 3).map(kw => `
                        <span class="keyword-tag">#${this.escapeHtml(kw)}</span>
                      `).join('')}
                    </div>
                  ` : ''}
                  
                  <button class="btn-use-topic" data-topic="${this.escapeHtml(topic.topic)}">
                    ✍️ Write about this
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Content Suggestions Section -->
        ${!this.state.isLoading && this.state.suggestions.length > 0 ? `
          <div class="suggestions-section">
            <h3 class="section-title">💡 Content Ideas</h3>
            <div class="suggestions-list">
              ${this.state.suggestions.map(suggestion => `
                <div class="suggestion-card">
                  <h4 class="suggestion-title">
                    ${this.escapeHtml(suggestion.title)}
                  </h4>
                  
                  ${suggestion.summary ? `
                    <p class="suggestion-summary">
                      ${this.escapeHtml(suggestion.summary)}
                    </p>
                  ` : ''}
                  
                  <div class="suggestion-footer">
                    ${suggestion.publishedDate ? `
                      <span class="suggestion-date">
                        ${new Date(suggestion.publishedDate).toLocaleDateString()}
                      </span>
                    ` : ''}
                    
                    <div class="suggestion-actions">
                      ${suggestion.url ? `
                        <a href="${suggestion.url}" 
                           target="_blank" 
                           rel="noopener noreferrer"
                           class="btn-view-source">
                          🔗 Source
                        </a>
                      ` : ''}
                      
                      <button class="btn-use-suggestion" 
                              data-title="${this.escapeHtml(suggestion.title)}"
                              data-summary="${this.escapeHtml(suggestion.summary || '')}">
                        ✍️ Use this
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Empty State -->
        ${!this.state.isLoading && this.state.topics.length === 0 && this.state.suggestions.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>No trends available</h3>
            <p>Try refreshing or selecting a different category</p>
            <button class="btn-primary btn-retry">
              🔄 Refresh Now
            </button>
          </div>
        ` : ''}

        <!-- Stats Bar -->
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-label">Topics</span>
            <span class="stat-value">${this.state.topics.length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Suggestions</span>
            <span class="stat-value">${this.state.suggestions.length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Category</span>
            <span class="stat-value">${this.state.selectedCategory}</span>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners(container: HTMLElement): void {
    this.container = container;

    // Refresh button
    const refreshBtn = container.querySelector('.btn-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadTrends());
    }

    // Retry button (empty state)
    const retryBtn = container.querySelector('.btn-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.loadTrends());
    }

    // Auto-refresh toggle
    const autoRefreshInput = container.querySelector('[data-auto-refresh]') as HTMLInputElement;
    if (autoRefreshInput) {
      autoRefreshInput.addEventListener('change', (e) => {
        this.state.autoRefresh = (e.target as HTMLInputElement).checked;
        if (this.state.autoRefresh) {
          this.startAutoRefresh();
        } else {
          this.stopAutoRefresh();
        }
        this.saveSettings();
      });
    }

    // Category buttons
    container.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = (e.currentTarget as HTMLElement).dataset.category;
        if (category && category !== this.state.selectedCategory) {
          this.state.selectedCategory = category;
          this.loadTrends();
        }
      });
    });

    // Use topic buttons
    container.querySelectorAll('.btn-use-topic').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const topic = (e.currentTarget as HTMLElement).dataset.topic;
        if (topic) {
          this.useTopic(topic);
        }
      });
    });

    // Use suggestion buttons
    container.querySelectorAll('.btn-use-suggestion').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const title = (e.currentTarget as HTMLElement).dataset.title;
        const summary = (e.currentTarget as HTMLElement).dataset.summary;
        if (title) {
          this.useSuggestion(title, summary || '');
        }
      });
    });
  }

  destroy(): void {
    this.stopAutoRefresh();
    this.container = null;
  }

  private async loadTrends(): Promise<void> {
    if (this.state.isLoading) return;

    this.state.isLoading = true;
    this.updateUI();

    try {
      // Load both topics and suggestions in parallel
      const [topics, suggestions] = await Promise.all([
        this.loadTrendingTopics(),
        this.loadContentSuggestions()
      ]);

      this.state.topics = topics;
      this.state.suggestions = suggestions;
      this.state.lastUpdate = new Date();
      this.state.isLoading = false;

      this.updateUI();
      this.saveToCache();

    } catch (error) {
      console.error('Failed to load trends:', error);
      this.state.isLoading = false;
      
      // Try to load from cache as fallback
      this.loadFromCache();
      this.updateUI();
    }
  }

  private async loadTrendingTopics(): Promise<TrendingTopic[]> {
    const category = this.state.selectedCategory === 'all' ? undefined : this.state.selectedCategory;
    return await TrendService.getTrendingTopics(category);
  }

  private async loadContentSuggestions(): Promise<ContentSuggestion[]> {
    const query = this.state.selectedCategory === 'all' 
      ? 'trending topics today'
      : `trending ${this.state.selectedCategory} news`;
    
    return await TrendService.searchContent(query, {
      numResults: 10,
      useAutoprompt: true,
      type: 'neural'
    });
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    
    this.refreshTimer = setInterval(() => {
      this.loadTrends();
    }, this.state.refreshInterval);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private updateUI(): void {
    if (!this.container) return;
    
    const parent = this.container.parentElement;
    if (parent) {
      parent.innerHTML = this.render();
      this.attachEventListeners(parent.firstElementChild as HTMLElement);
    }
  }

  private useTopic(topic: string): void {
    // Copy topic to clipboard
    navigator.clipboard.writeText(topic).then(() => {
      // Show success feedback
      const btn = this.container?.querySelector(`[data-topic="${topic}"] .btn-use-topic`);
      if (btn) {
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
          btn.textContent = '✍️ Write about this';
        }, 2000);
      }
    });

    // Could also trigger compose tab with this topic
    console.log('Using topic:', topic);
  }

  private useSuggestion(title: string, summary: string): void {
    const content = summary ? `${title}\n\n${summary}` : title;
    
    // Copy to clipboard
    navigator.clipboard.writeText(content).then(() => {
      // Show success feedback
      const btn = this.container?.querySelector(`[data-title="${title}"] .btn-use-suggestion`);
      if (btn) {
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
          btn.textContent = '✍️ Use this';
        }, 2000);
      }
    });

    console.log('Using suggestion:', title);
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('tweetcraft_trending_settings', JSON.stringify({
        autoRefresh: this.state.autoRefresh,
        selectedCategory: this.state.selectedCategory
      }));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('tweetcraft_trending_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.state.autoRefresh = settings.autoRefresh ?? true;
        this.state.selectedCategory = settings.selectedCategory ?? 'all';
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  private saveToCache(): void {
    try {
      localStorage.setItem('tweetcraft_trending_cache', JSON.stringify({
        topics: this.state.topics,
        suggestions: this.state.suggestions,
        lastUpdate: this.state.lastUpdate,
        category: this.state.selectedCategory
      }));
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  private loadFromCache(): void {
    try {
      const cached = localStorage.getItem('tweetcraft_trending_cache');
      if (cached) {
        const data = JSON.parse(cached);
        
        // Only use cache if it's for the same category and less than 30 min old
        if (data.category === this.state.selectedCategory) {
          const age = Date.now() - new Date(data.lastUpdate).getTime();
          if (age < 30 * 60 * 1000) {
            this.state.topics = data.topics || [];
            this.state.suggestions = data.suggestions || [];
            this.state.lastUpdate = new Date(data.lastUpdate);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load cache:', error);
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }

  private getRelativeTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString();
  }
}
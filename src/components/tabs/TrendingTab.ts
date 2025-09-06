// TrendingTab.ts - Trending topics and hashtags
import { TabComponent } from './TabManager';

export class TrendingTab implements TabComponent {
  private eventListeners: Array<{ element: Element; event: string; handler: EventListener }> = [];
  
  constructor() {}
  
  render(): string {
    return `
      <div class="trending-tab">
        <div class="trending-header">
          <h3>🔥 Trending Topics</h3>
          <button class="btn-refresh-trends">🔄 Refresh</button>
        </div>
        
        <div class="trending-categories">
          <button class="category-btn active" data-category="all">All</button>
          <button class="category-btn" data-category="tech">Tech</button>
          <button class="category-btn" data-category="business">Business</button>
          <button class="category-btn" data-category="entertainment">Entertainment</button>
          <button class="category-btn" data-category="sports">Sports</button>
        </div>
        
        <div class="trending-list">
          <div class="trend-item">
            <div class="trend-rank">#1</div>
            <div class="trend-content">
              <div class="trend-title">Loading trends...</div>
              <div class="trend-stats">Check back soon</div>
            </div>
            <button class="btn-use-trend">Use</button>
          </div>
          
          <div class="trend-placeholder">
            <p>🔍 Fetching trending topics...</p>
            <p class="trend-hint">Connect to Twitter API to see real-time trends</p>
          </div>
        </div>
        
        <div class="trending-hashtags">
          <h4>#️⃣ Popular Hashtags</h4>
          <div class="hashtag-cloud">
            <span class="hashtag">#AI</span>
            <span class="hashtag">#Tech</span>
            <span class="hashtag">#Web3</span>
            <span class="hashtag">#Startup</span>
            <span class="hashtag">#Innovation</span>
          </div>
        </div>
        
        <div class="trending-suggestions">
          <h4>💡 Reply Ideas</h4>
          <ul class="suggestions-list">
            <li>Join conversations about trending topics for maximum visibility</li>
            <li>Use 1-2 relevant hashtags in your replies</li>
            <li>Add value to trending discussions with unique insights</li>
          </ul>
        </div>
        
        <div class="trending-actions">
          <button class="btn-analyze-trend">Analyze Trend</button>
          <button class="btn-monitor-topics">Monitor Topics</button>
        </div>
      </div>
    `;
  }
  
  cleanup(): void {
    // Remove event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }
  
  destroy(): void {
    this.cleanup();
  }
  
  attachEventListeners(): void {
    const container = document.querySelector('.trending-tab');
    if (!container) return;
    
    // Refresh button
    const refreshBtn = container.querySelector('.btn-refresh-trends');
    if (refreshBtn) {
      const handler = () => this.refreshTrends();
      refreshBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: refreshBtn, event: 'click', handler });
    }
    
    // Category buttons
    const categoryBtns = container.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
      const handler = (e: Event) => this.filterByCategory(e);
      btn.addEventListener('click', handler);
      this.eventListeners.push({ element: btn, event: 'click', handler });
    });
    
    // Use trend buttons
    const useTrendBtns = container.querySelectorAll('.btn-use-trend');
    useTrendBtns.forEach(btn => {
      const handler = (e: Event) => this.useTrend(e);
      btn.addEventListener('click', handler);
      this.eventListeners.push({ element: btn, event: 'click', handler });
    });
    
    // Hashtag clicks
    const hashtags = container.querySelectorAll('.hashtag');
    hashtags.forEach(tag => {
      const handler = (e: Event) => this.useHashtag(e);
      tag.addEventListener('click', handler);
      this.eventListeners.push({ element: tag, event: 'click', handler });
    });
    
    // Action buttons
    const analyzeBtn = container.querySelector('.btn-analyze-trend');
    if (analyzeBtn) {
      const handler = () => this.analyzeTrend();
      analyzeBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: analyzeBtn, event: 'click', handler });
    }
    
    const monitorBtn = container.querySelector('.btn-monitor-topics');
    if (monitorBtn) {
      const handler = () => this.monitorTopics();
      monitorBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: monitorBtn, event: 'click', handler });
    }
  }
  
  private refreshTrends(): void {
    console.log('🔄 Refreshing trends...');
    // Implementation would fetch latest trends from API
  }
  
  private filterByCategory(event: Event): void {
    const target = event.target as HTMLElement;
    const category = target.dataset.category;
    console.log(`📂 Filtering by category: ${category}`);
    
    // Update active state
    const container = document.querySelector('.trending-tab');
    if (container) {
      container.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      target.classList.add('active');
    }
  }
  
  private useTrend(event: Event): void {
    console.log('🎯 Using trend in reply...');
    // Implementation would insert trend into reply
  }
  
  private useHashtag(event: Event): void {
    const target = event.target as HTMLElement;
    const hashtag = target.textContent;
    console.log(`#️⃣ Using hashtag: ${hashtag}`);
    // Implementation would insert hashtag into reply
  }
  
  private analyzeTrend(): void {
    console.log('📊 Analyzing trend sentiment and engagement...');
    // Implementation would analyze trend data
  }
  
  private monitorTopics(): void {
    console.log('👁️ Setting up topic monitoring...');
    // Implementation would set up topic alerts
  }
}

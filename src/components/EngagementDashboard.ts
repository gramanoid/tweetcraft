/**
 * Engagement Dashboard Component
 * Visualizes tweet performance metrics from TwitterAPI.io tracking
 */

import { twitterAPI, type TrackedTweet, type EngagementMetrics } from '../services/twitterAPI';

export interface DashboardMetrics {
  totalTweets: number;
  trackedTweets: number;
  avgLikes: number;
  avgRetweets: number;
  avgEngagement: number;
  topPerformers: Array<{
    combo: string;
    avgScore: number;
    count: number;
  }>;
  recentTweets: Array<{
    tweetId: string;
    combo: string;
    likes: number;
    retweets: number;
    timestamp: number;
  }>;
  performanceByDay: Array<{
    day: string;
    tweets: number;
    engagement: number;
  }>;
}

export class EngagementDashboard {
  private container: HTMLElement | null = null;

  /**
   * Create the engagement dashboard HTML
   */
  async createDashboard(): Promise<string> {
    const metrics = await this.collectMetrics();
    
    return `
      <div class="engagement-dashboard">
        <div class="dashboard-header">
          <h3>📊 Engagement Analytics</h3>
          <p class="dashboard-subtitle">Track your tweet performance over time</p>
        </div>

        <!-- Overview Cards -->
        <div class="metric-cards">
          <div class="metric-card">
            <div class="metric-value">${metrics.totalTweets}</div>
            <div class="metric-label">Total Replies</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${metrics.trackedTweets}</div>
            <div class="metric-label">Tracked</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${metrics.avgLikes.toFixed(1)}</div>
            <div class="metric-label">Avg Likes</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${metrics.avgRetweets.toFixed(1)}</div>
            <div class="metric-label">Avg RTs</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${metrics.avgEngagement.toFixed(1)}%</div>
            <div class="metric-label">Engagement Rate</div>
          </div>
        </div>

        <!-- Top Performing Combos -->
        <div class="dashboard-section">
          <h4>🏆 Top Performing Styles</h4>
          <div class="top-performers">
            ${metrics.topPerformers.slice(0, 5).map((performer, idx) => `
              <div class="performer-item">
                <span class="performer-rank">#${idx + 1}</span>
                <div class="performer-details">
                  <div class="performer-combo">${performer.combo}</div>
                  <div class="performer-stats">
                    <span class="performer-score">Avg: ${performer.avgScore.toFixed(1)}</span>
                    <span class="performer-count">${performer.count} tweets</span>
                  </div>
                </div>
              </div>
            `).join('') || '<div class="empty-state">No data yet - start tracking your tweets!</div>'}
          </div>
        </div>

        <!-- Performance Over Time -->
        <div class="dashboard-section">
          <h4>📈 7-Day Performance</h4>
          <div class="performance-chart">
            ${this.renderPerformanceChart(metrics.performanceByDay)}
          </div>
        </div>

        <!-- Recent Tweets -->
        <div class="dashboard-section">
          <h4>⏱️ Recent Tracked Tweets</h4>
          <div class="recent-tweets">
            ${metrics.recentTweets.slice(0, 5).map(tweet => `
              <div class="recent-tweet">
                <div class="tweet-combo">${tweet.combo}</div>
                <div class="tweet-metrics">
                  <span class="tweet-stat">❤️ ${tweet.likes}</span>
                  <span class="tweet-stat">🔄 ${tweet.retweets}</span>
                  <span class="tweet-time">${this.formatTimeAgo(tweet.timestamp)}</span>
                </div>
              </div>
            `).join('') || '<div class="empty-state">No tracked tweets yet</div>'}
          </div>
        </div>

        <!-- API Status -->
        <div class="api-status">
          ${await this.renderAPIStatus()}
        </div>
      </div>
    `;
  }

  /**
   * Collect metrics from tracked tweets
   */
  private async collectMetrics(): Promise<DashboardMetrics> {
    const trackedTweets = await twitterAPI.getTrackedTweets();
    const stats = await twitterAPI.getEngagementStats();
    
    // Calculate top performers
    const comboPerformance = new Map<string, { total: number; count: number; combo: any }>();
    
    trackedTweets.forEach(tweet => {
      if (tweet.metrics) {
        const comboKey = `${tweet.combo.personality} + ${tweet.combo.rhetoric}`;
        const score = (tweet.metrics.likes || 0) + (tweet.metrics.retweets || 0) * 2; // Weight retweets more
        
        if (!comboPerformance.has(comboKey)) {
          comboPerformance.set(comboKey, { total: 0, count: 0, combo: tweet.combo });
        }
        
        const perf = comboPerformance.get(comboKey)!;
        perf.total += score;
        perf.count++;
      }
    });
    
    const topPerformers = Array.from(comboPerformance.entries())
      .map(([combo, data]) => ({
        combo,
        avgScore: data.total / data.count,
        count: data.count
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
    
    // Calculate performance by day
    const dayPerformance = new Map<string, { tweets: number; engagement: number }>();
    const now = Date.now();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - (i * 24 * 60 * 60 * 1000));
      const dayKey = date.toLocaleDateString('en-US', { weekday: 'short' });
      dayPerformance.set(dayKey, { tweets: 0, engagement: 0 });
    }
    
    trackedTweets.forEach(tweet => {
      const tweetDate = new Date(tweet.timestamp);
      const daysSince = Math.floor((now - tweet.timestamp) / (24 * 60 * 60 * 1000));
      
      if (daysSince < 7) {
        const dayKey = tweetDate.toLocaleDateString('en-US', { weekday: 'short' });
        const dayData = dayPerformance.get(dayKey);
        if (dayData) {
          dayData.tweets++;
          if (tweet.metrics) {
            dayData.engagement += (tweet.metrics.likes || 0) + (tweet.metrics.retweets || 0);
          }
        }
      }
    });
    
    const performanceByDay = Array.from(dayPerformance.entries()).map(([day, data]) => ({
      day,
      tweets: data.tweets,
      engagement: data.engagement
    }));
    
    // Get recent tweets with metrics
    const recentTweets = trackedTweets
      .filter(t => t.metrics)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .map(tweet => ({
        tweetId: tweet.tweetId,
        combo: `${tweet.combo.personality} + ${tweet.combo.rhetoric}`,
        likes: tweet.metrics?.likes || 0,
        retweets: tweet.metrics?.retweets || 0,
        timestamp: tweet.timestamp
      }));
    
    // Calculate engagement rate
    const tweetsWithMetrics = trackedTweets.filter(t => t.metrics);
    const totalImpressions = tweetsWithMetrics.reduce((sum, t) => sum + (t.metrics?.impressions || 0), 0);
    const totalEngagements = tweetsWithMetrics.reduce((sum, t) => 
      sum + (t.metrics?.likes || 0) + (t.metrics?.retweets || 0) + (t.metrics?.replies || 0), 0);
    const avgEngagement = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;
    
    return {
      totalTweets: trackedTweets.length,
      trackedTweets: tweetsWithMetrics.length,
      avgLikes: stats.avgLikes,
      avgRetweets: stats.avgRetweets,
      avgEngagement,
      topPerformers,
      recentTweets,
      performanceByDay
    };
  }

  /**
   * Render performance chart
   */
  private renderPerformanceChart(data: Array<{ day: string; tweets: number; engagement: number }>): string {
    const maxEngagement = Math.max(...data.map(d => d.engagement), 1);
    
    return `
      <div class="chart-container">
        <div class="chart-bars">
          ${data.map(item => {
            const height = item.engagement > 0 ? (item.engagement / maxEngagement) * 100 : 0;
            return `
              <div class="chart-bar-wrapper">
                <div class="chart-bar" style="height: ${height}%">
                  <div class="chart-value">${item.engagement}</div>
                </div>
                <div class="chart-label">
                  <div>${item.day}</div>
                  <div class="chart-tweets">${item.tweets} tweets</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render API status section
   */
  private async renderAPIStatus(): Promise<string> {
    const config = await twitterAPI.getConfig();
    const rateLimit = await twitterAPI.canMakeRequest();
    
    if (!config.enabled) {
      return `
        <div class="api-status-disabled">
          <span>📊 Engagement tracking disabled</span>
          <a href="#" class="enable-tracking-link">Enable in Settings</a>
        </div>
      `;
    }
    
    return `
      <div class="api-status-enabled">
        <span class="api-label">API Status:</span>
        <span class="api-requests">${rateLimit.requestsRemaining}/${config.rateLimit} requests today</span>
      </div>
    `;
  }

  /**
   * Format timestamp as time ago
   */
  private formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }

  /**
   * Attach event handlers
   */
  attachEventHandlers(container: HTMLElement): void {
    this.container = container;
    
    // Handle enable tracking link
    const enableLink = container.querySelector('.enable-tracking-link');
    if (enableLink) {
      enableLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Open settings tab
        const settingsButton = document.querySelector('.selector-settings-btn');
        if (settingsButton) {
          (settingsButton as HTMLElement).click();
        }
      });
    }
    
    // Refresh dashboard every 30 seconds if visible
    setInterval(() => {
      if (this.container && this.container.style.display !== 'none') {
        this.refreshDashboard();
      }
    }, 30000);
  }

  /**
   * Refresh dashboard content
   */
  private async refreshDashboard(): Promise<void> {
    if (!this.container) return;
    
    const newContent = await this.createDashboard();
    this.container.innerHTML = newContent;
    this.attachEventHandlers(this.container);
  }
}

export const engagementDashboard = new EngagementDashboard();
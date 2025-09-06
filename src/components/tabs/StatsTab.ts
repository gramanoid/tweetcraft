/**
 * Stats Dashboard Tab Component
 * SPRINT 3: Stats Dashboard with CSS-only visualizations
 */

import { TabComponent, TabManager } from './TabManager';
import { smartDefaults } from '@/services/smartDefaults';
import UIStateManager from '@/services/uiStateManager';
import { logger } from '@/utils/logger';
import './StatsTab.scss';

interface StatsData {
  totalReplies: number;
  successRate: number;
  topPersonality: { name: string; count: number; percentage: number };
  topVocabulary: { name: string; count: number; percentage: number };
  topRhetoric: { name: string; count: number; percentage: number };
  weeklyStats: Array<{ day: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  recentActivity: Array<{ date: string; count: number }>;
}

export class StatsTab implements TabComponent {
  private container: HTMLElement | null = null;
  private stats: StatsData | null = null;
  private tabManager: TabManager | null = null;

  constructor(tabManager?: TabManager) {
    this.tabManager = tabManager || null;
  }

  async onShow(): Promise<void> {
    // Load stats from smartDefaults service
    await this.loadStats();
  }

  render(): string {
    if (!this.stats) {
      this.loadStatsSync();
    }

    return `
      <div class="stats-dashboard">
        <div class="stats-header">
          <h2 class="stats-title">Performance Dashboard</h2>
          <p class="stats-subtitle">Your TweetCraft analytics for the last 30 days</p>
        </div>
        
        <!-- Key Metrics Row -->
        <div class="stats-metrics-row">
          <div class="metric-card">
            <div class="metric-value">${this.stats?.totalReplies || 0}</div>
            <div class="metric-label">Total Replies</div>
            <div class="metric-trend trend-up">+12%</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${this.stats?.successRate || 0}%</div>
            <div class="metric-label">Success Rate</div>
            <div class="metric-trend trend-up">+5%</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${this.getAverageDaily()}</div>
            <div class="metric-label">Daily Average</div>
            <div class="metric-trend trend-neutral">~</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${this.getBestHour()}</div>
            <div class="metric-label">Best Time</div>
            <div class="metric-info">Most active hour</div>
          </div>
        </div>
        
        <!-- Charts Row -->
        <div class="stats-charts-row">
          <!-- Weekly Activity Chart -->
          <div class="chart-card">
            <h3 class="chart-title">Weekly Activity</h3>
            <div class="bar-chart">
              ${this.renderWeeklyChart()}
            </div>
          </div>
          
          <!-- Top Choices Donut Chart -->
          <div class="chart-card">
            <h3 class="chart-title">Top Choices</h3>
            <div class="donut-chart-container">
              ${this.renderDonutChart()}
            </div>
            <div class="chart-legend">
              ${this.renderLegend()}
            </div>
          </div>
        </div>
        
        <!-- Usage Patterns -->
        <div class="stats-patterns">
          <div class="pattern-card">
            <h3 class="pattern-title">Most Used Templates</h3>
            <div class="pattern-list">
              ${this.renderTopTemplates()}
            </div>
          </div>
          
          <div class="pattern-card">
            <h3 class="pattern-title">Hourly Distribution</h3>
            <div class="heatmap">
              ${this.renderHeatmap()}
            </div>
          </div>
        </div>
        
        <!-- Recent Activity Timeline -->
        <div class="stats-timeline">
          <h3 class="timeline-title">Recent Activity</h3>
          <div class="timeline-chart">
            ${this.renderTimeline()}
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners(container: HTMLElement): void {
    this.container = container;
    
    // Add hover effects for charts
    container.querySelectorAll('.bar-chart-bar').forEach(bar => {
      bar.addEventListener('mouseenter', (e) => {
        const tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        tooltip.textContent = (e.target as HTMLElement).dataset.value || '';
        container.appendChild(tooltip);
        
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        tooltip.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - containerRect.top - 30}px`;
      });
      
      bar.addEventListener('mouseleave', () => {
        container.querySelector('.chart-tooltip')?.remove();
      });
    });
  }

  destroy(): void {
    this.container = null;
    this.stats = null;
  }

  private async loadStats(): Promise<void> {
    try {
      if (this.container) {
        UIStateManager.setLoading(this.container, true, {
          customText: 'Loading analytics...',
          animationType: 'pulse'
        });
      }

      let stats;
      if (this.tabManager) {
        // Use TabManager to get stats from backend
        const storage = await this.tabManager.getStorage('stats');
        stats = storage?.weeklyStats || smartDefaults.getWeeklyStats();
      } else {
        // Fallback to smartDefaults
        stats = smartDefaults.getWeeklyStats();
      }
      
      this.stats = {
        totalReplies: stats.totalReplies,
        successRate: stats.successRate,
        topPersonality: { name: stats.topPersonality, count: 0, percentage: 0 },
        topVocabulary: { name: stats.topVocabulary, count: 0, percentage: 0 },
        topRhetoric: { name: stats.topRhetoric, count: 0, percentage: 0 },
        weeklyStats: this.getWeeklyData(),
        hourlyDistribution: this.getHourlyData(),
        recentActivity: this.getRecentData()
      };

      if (this.container) {
        UIStateManager.setLoading(this.container, false);
      }
    } catch (error) {
      logger.error('Failed to load stats:', error);
      if (this.container) {
        UIStateManager.setLoading(this.container, false);
        UIStateManager.showError(this.container, 'Failed to load analytics');
      }
      this.stats = this.getDefaultStats();
    }
  }

  private loadStatsSync(): void {
    try {
      // For sync loading, use smartDefaults directly
      const stats = smartDefaults.getWeeklyStats();
      this.stats = {
        totalReplies: stats.totalReplies,
        successRate: stats.successRate,
        topPersonality: { name: stats.topPersonality, count: 0, percentage: 0 },
        topVocabulary: { name: stats.topVocabulary, count: 0, percentage: 0 },
        topRhetoric: { name: stats.topRhetoric, count: 0, percentage: 0 },
        weeklyStats: this.getWeeklyData(),
        hourlyDistribution: this.getHourlyData(),
        recentActivity: this.getRecentData()
      };
    } catch (error) {
      logger.warn('Failed to load stats synchronously:', error);
      this.stats = this.getDefaultStats();
    }
  }

  private getDefaultStats(): StatsData {
    return {
      totalReplies: 0,
      successRate: 0,
      topPersonality: { name: 'Professional', count: 0, percentage: 0 },
      topVocabulary: { name: 'Plain English', count: 0, percentage: 0 },
      topRhetoric: { name: 'Balanced', count: 0, percentage: 0 },
      weeklyStats: [],
      hourlyDistribution: [],
      recentActivity: []
    };
  }

  private getTopItem(items: Record<string, number>): { name: string; count: number; percentage: number } {
    const entries = Object.entries(items);
    if (entries.length === 0) {
      return { name: 'None', count: 0, percentage: 0 };
    }
    
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    const [name, count] = entries.reduce((max, curr) => curr[1] > max[1] ? curr : max);
    
    return {
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    };
  }

  private getWeeklyData(): Array<{ day: string; count: number }> {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      count: Math.floor(Math.random() * 20) + 5 // Mock data
    }));
  }

  private getHourlyData(): Array<{ hour: number; count: number }> {
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: Math.floor(Math.random() * 10)
    }));
  }

  private getRecentData(): Array<{ date: string; count: number }> {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: Math.floor(Math.random() * 15) + 3
      };
    }).reverse();
  }

  private getAverageDaily(): number {
    if (!this.stats || this.stats.totalReplies === 0) return 0;
    return Math.round(this.stats.totalReplies / 30);
  }

  private getBestHour(): string {
    const hours = this.stats?.hourlyDistribution || [];
    if (hours.length === 0) return 'N/A';
    
    const best = hours.reduce((max, curr) => curr.count > max.count ? curr : max);
    const hour = best.hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  }

  private renderWeeklyChart(): string {
    const data = this.stats?.weeklyStats || [];
    const maxValue = Math.max(...data.map(d => d.count), 1);
    
    return data.map(item => {
      const height = (item.count / maxValue) * 100;
      return `
        <div class="bar-chart-item">
          <div class="bar-chart-bar" 
               style="height: ${height}%" 
               data-value="${item.count} replies">
            <span class="bar-value">${item.count}</span>
          </div>
          <div class="bar-chart-label">${item.day}</div>
        </div>
      `;
    }).join('');
  }

  private renderDonutChart(): string {
    const personality = this.stats?.topPersonality.percentage || 0;
    const vocabulary = this.stats?.topVocabulary.percentage || 0;
    const rhetoric = this.stats?.topRhetoric.percentage || 0;
    const other = 100 - personality - vocabulary - rhetoric;
    
    // CSS-only donut chart using conic gradient
    const gradient = `conic-gradient(
      var(--tweet-accent) 0deg ${personality * 3.6}deg,
      var(--tweet-success) ${personality * 3.6}deg ${(personality + vocabulary) * 3.6}deg,
      var(--tweet-warning) ${(personality + vocabulary) * 3.6}deg ${(personality + vocabulary + rhetoric) * 3.6}deg,
      var(--tweet-text-tertiary) ${(personality + vocabulary + rhetoric) * 3.6}deg 360deg
    )`;
    
    return `
      <div class="donut-chart" style="background: ${gradient}">
        <div class="donut-center">
          <div class="donut-value">${personality}%</div>
          <div class="donut-label">Top Choice</div>
        </div>
      </div>
    `;
  }

  private renderLegend(): string {
    return `
      <div class="legend-item">
        <span class="legend-color" style="background: var(--tweet-accent)"></span>
        <span class="legend-label">${this.stats?.topPersonality.name}</span>
        <span class="legend-value">${this.stats?.topPersonality.percentage}%</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: var(--tweet-success)"></span>
        <span class="legend-label">${this.stats?.topVocabulary.name}</span>
        <span class="legend-value">${this.stats?.topVocabulary.percentage}%</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: var(--tweet-warning)"></span>
        <span class="legend-label">${this.stats?.topRhetoric.name}</span>
        <span class="legend-value">${this.stats?.topRhetoric.percentage}%</span>
      </div>
    `;
  }

  private renderTopTemplates(): string {
    const templates = [
      { name: 'Professional + Plain English', count: 45, trend: 'up' },
      { name: 'Friendly + Modern Slang', count: 32, trend: 'up' },
      { name: 'Humorous + Casual', count: 28, trend: 'down' }
    ];
    
    return templates.map((template, index) => `
      <div class="template-item">
        <div class="template-rank">#${index + 1}</div>
        <div class="template-info">
          <div class="template-name">${template.name}</div>
          <div class="template-count">${template.count} uses</div>
        </div>
        <div class="template-trend trend-${template.trend}">
          ${template.trend === 'up' ? '↑' : '↓'}
        </div>
      </div>
    `).join('');
  }

  private renderHeatmap(): string {
    const hours = this.stats?.hourlyDistribution || [];
    
    return `
      <div class="heatmap-grid">
        ${hours.map(h => {
          const intensity = h.count > 0 ? Math.min(h.count / 10, 1) : 0;
          return `
            <div class="heatmap-cell" 
                 style="opacity: ${0.2 + intensity * 0.8}"
                 title="${h.hour}:00 - ${h.count} replies">
            </div>
          `;
        }).join('')}
      </div>
      <div class="heatmap-labels">
        <span>12AM</span>
        <span>6AM</span>
        <span>12PM</span>
        <span>6PM</span>
        <span>11PM</span>
      </div>
    `;
  }

  private renderTimeline(): string {
    const data = this.stats?.recentActivity || [];
    const maxValue = Math.max(...data.map(d => d.count), 1);
    
    return `
      <div class="timeline-line">
        ${data.map((point, index) => {
          const height = (point.count / maxValue) * 60;
          const left = (index / (data.length - 1)) * 100;
          return `
            <div class="timeline-point" 
                 style="left: ${left}%; bottom: ${height}px"
                 title="${point.date}: ${point.count} replies">
            </div>
          `;
        }).join('')}
        <svg class="timeline-path" viewBox="0 0 100 80">
          <polyline points="${data.map((point, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 80 - ((point.count / maxValue) * 60);
            return `${x},${y}`;
          }).join(' ')}" />
        </svg>
      </div>
      <div class="timeline-labels">
        ${data.map(point => `<span>${point.date}</span>`).join('')}
      </div>
    `;
  }
}
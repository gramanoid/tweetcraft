/**
 * Weekly Summary View Component
 * Displays weekly usage statistics and insights
 */

import { smartDefaults } from '../services/smartDefaults';
import { usageTracker } from '../services/usageTracker';

export interface WeeklySummaryData {
  totalReplies: number;
  successRate: number;
  topPersonality: string;
  mostActiveDay: string;
  bestTime: string;
  topCombinations: Array<{
    personality: string;
    vocabulary: string;
    rhetoric: string;
    count: number;
  }>;
  weekStart: Date;
  weekEnd: Date;
}


export class WeeklySummaryView {
  private container: HTMLElement | null = null;

  /**
   * Create the weekly summary view
   */
  create(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tweetcraft-weekly-summary';
    container.innerHTML = this.generateHTML();
    
    this.container = container;
    this.attachEventListeners();
    this.loadSummaryData();
    
    return container;
  }

  /**
   * Generate HTML structure
   */
  private generateHTML(): string {
    return `
      <div class="weekly-summary-container">
        <div class="summary-header">
          <h3>📊 Weekly Summary</h3>
          <span class="summary-date-range"></span>
          <button class="summary-refresh" title="Refresh">🔄</button>
        </div>
        
        <div class="summary-stats">
          <div class="stat-card">
            <div class="stat-value" id="total-replies">--</div>
            <div class="stat-label">Total Replies</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-value" id="success-rate">--%</div>
            <div class="stat-label">Success Rate</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-value" id="top-personality">--</div>
            <div class="stat-label">Top Personality</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-value" id="most-active-day">--</div>
            <div class="stat-label">Most Active Day</div>
          </div>
        </div>
        
        <div class="summary-insights">
          <h4>📈 Insights</h4>
          <div class="insight-item">
            <span class="insight-icon">⏰</span>
            <span class="insight-text">Best time to tweet: <strong id="best-time">--</strong></span>
          </div>
          <div class="insight-item">
            <span class="insight-icon">🎯</span>
            <span class="insight-text">Most effective combo: <strong id="best-combo">--</strong></span>
          </div>
        </div>
        
        <div class="summary-top-combos">
          <h4>🏆 Top Combinations This Week</h4>
          <div id="top-combinations-list"></div>
        </div>
        
        <div class="summary-actions">
          <button class="btn-view-details">View Full Stats</button>
          <button class="btn-export-summary">Export Summary</button>
        </div>
      </div>
    `;
  }

  /**
   * Load and display summary data
   */
  private async loadSummaryData(): Promise<void> {
    try {
      const summaryData = await this.calculateWeeklySummary();
      this.displaySummaryData(summaryData);
    } catch (error) {
      console.error('Failed to load weekly summary:', error);
      this.showError();
    }
  }

  /**
   * Calculate weekly summary from stored data
   */
  private async calculateWeeklySummary(): Promise<WeeklySummaryData> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Get stats from usageTracker
    const stats = usageTracker.getStats();
    const patterns = await smartDefaults.getTimeOfDayPatterns();
    
    // Calculate success rate from stats
    const totalReplies = stats.eventsByType?.reply_generated || 0;
    const repliesSent = stats.eventsByType?.reply_sent || 0;
    const successRate = totalReplies > 0 
      ? Math.round((repliesSent / totalReplies) * 100)
      : 0;

    // Find most active day
    const dayUsage = new Map<string, number>();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Aggregate usage by day (mock data for now, should come from actual tracking)
    let mostActiveDay = 'Monday';
    let maxDayCount = 0;
    
    // Find best time from patterns
    let bestTime = '9 AM';
    if (patterns) {
      // Find the time period with highest count
      const timePeriods = ['morning', 'afternoon', 'evening', 'night', 'lateNight'] as const;
      let bestPeriod: any = null;
      let maxCount = 0;
      
      for (const period of timePeriods) {
        const data = patterns[period];
        if (data && data.count > maxCount) {
          maxCount = data.count;
          bestPeriod = period;
        }
      }
      
      if (bestPeriod === 'morning') bestTime = '9 AM';
      else if (bestPeriod === 'afternoon') bestTime = '2 PM';
      else if (bestPeriod === 'evening') bestTime = '7 PM';
      else if (bestPeriod === 'night') bestTime = '10 PM';
      else if (bestPeriod === 'lateNight') bestTime = '2 AM';
    }

    // Get top combinations
    const topCombinations = Object.entries(stats.combinationUsage || {})
      .map(([combo, count]) => {
        const [personality, vocabulary, rhetoric] = combo.split(':');
        return { personality, vocabulary, rhetoric, count: count as number };
      })
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, 5);

    return {
      totalReplies: repliesSent,
      successRate,
      topPersonality: this.getTopItem(stats.personalityUsage) || 'Professional',
      mostActiveDay,
      bestTime,
      topCombinations,
      weekStart,
      weekEnd
    };
  }

  /**
   * Display summary data in UI
   */
  private displaySummaryData(data: WeeklySummaryData): void {
    if (!this.container) return;

    // Update date range
    const dateRange = this.container.querySelector('.summary-date-range');
    if (dateRange) {
      const start = data.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const end = data.weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateRange.textContent = `${start} - ${end}`;
    }

    // Update stats
    this.updateElement('#total-replies', data.totalReplies.toString());
    this.updateElement('#success-rate', `${data.successRate}%`);
    this.updateElement('#top-personality', data.topPersonality);
    this.updateElement('#most-active-day', data.mostActiveDay);
    this.updateElement('#best-time', data.bestTime);

    // Update best combo
    if (data.topCombinations.length > 0) {
      const bestCombo = data.topCombinations[0];
      this.updateElement('#best-combo', 
        `${bestCombo.personality} + ${bestCombo.vocabulary}`
      );
    }

    // Update top combinations list
    const combosList = this.container.querySelector('#top-combinations-list');
    if (combosList && data.topCombinations.length > 0) {
      combosList.innerHTML = data.topCombinations.map((combo, index) => `
        <div class="combo-item">
          <span class="combo-rank">#${index + 1}</span>
          <span class="combo-text">
            ${combo.personality} • ${combo.vocabulary} • ${combo.rhetoric}
          </span>
          <span class="combo-count">${combo.count}x</span>
        </div>
      `).join('');
    } else if (combosList) {
      combosList.innerHTML = '<div class="no-data">No data available yet</div>';
    }
  }

  /**
   * Update element text content
   */
  private updateElement(selector: string, text: string): void {
    if (!this.container) return;
    const element = this.container.querySelector(selector);
    if (element) {
      element.textContent = text;
    }
  }

  /**
   * Get top item from usage map
   */
  private getTopItem(usageMap: Map<string, number> | undefined): string | null {
    if (!usageMap || usageMap.size === 0) return null;
    
    let topItem = '';
    let maxCount = 0;
    
    usageMap.forEach((count, item) => {
      if (count > maxCount) {
        maxCount = count;
        topItem = item;
      }
    });
    
    return topItem;
  }

  /**
   * Format hour to human-readable time
   */
  private formatHour(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  }

  /**
   * Show error state
   */
  private showError(): void {
    if (!this.container) return;
    
    const statsContainer = this.container.querySelector('.summary-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="error-message">
          <span>⚠️ Unable to load weekly summary</span>
          <button class="retry-button">Retry</button>
        </div>
      `;
      
      const retryButton = statsContainer.querySelector('.retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => this.loadSummaryData());
      }
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Refresh button
    const refreshBtn = this.container.querySelector('.summary-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('spinning');
        this.loadSummaryData().finally(() => {
          refreshBtn.classList.remove('spinning');
        });
      });
    }

    // View details button
    const detailsBtn = this.container.querySelector('.btn-view-details');
    if (detailsBtn) {
      detailsBtn.addEventListener('click', () => {
        // Switch to stats tab in unified selector
        const statsTab = document.querySelector('.tweetcraft-tab-button[data-tab="stats"]') as HTMLElement;
        if (statsTab) statsTab.click();
      });
    }

    // Export button
    const exportBtn = this.container.querySelector('.btn-export-summary');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportSummary());
    }
  }

  /**
   * Export weekly summary as CSV
   */
  private async exportSummary(): Promise<void> {
    try {
      const data = await this.calculateWeeklySummary();
      
      const csv = [
        'TweetCraft Weekly Summary',
        `Week: ${data.weekStart.toLocaleDateString()} - ${data.weekEnd.toLocaleDateString()}`,
        '',
        'Metric,Value',
        `Total Replies,${data.totalReplies}`,
        `Success Rate,${data.successRate}%`,
        `Top Personality,${data.topPersonality}`,
        `Most Active Day,${data.mostActiveDay}`,
        `Best Time,${data.bestTime}`,
        '',
        'Top Combinations,Uses',
        ...data.topCombinations.map(c => 
          `"${c.personality} - ${c.vocabulary} - ${c.rhetoric}",${c.count}`
        )
      ].join('\n');

      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tweetcraft-weekly-${data.weekStart.toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      console.log('%c📊 Weekly summary exported', 'color: #17BF63; font-weight: bold');
    } catch (error) {
      console.error('Failed to export summary:', error);
    }
  }
}

// Export singleton instance
export const weeklySummaryView = new WeeklySummaryView();
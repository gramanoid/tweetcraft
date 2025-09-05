/**
 * Time-Based Recommendations Component
 * Shows optimal times to tweet based on user patterns
 */

import { smartDefaults } from '../services/smartDefaults';

export interface TimeRecommendation {
  period: string;
  timeRange: string;
  personality: string;
  successRate: number;
  usageCount: number;
}

export class TimeRecommendations {
  private container: HTMLElement | null = null;
  private isLoading: boolean = false;

  /**
   * Create the time recommendations view
   */
  create(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tweetcraft-time-recommendations';
    container.innerHTML = this.generateHTML();
    
    this.container = container;
    this.attachEventListeners();
    this.loadRecommendations();
    
    return container;
  }

  /**
   * Generate HTML structure
   */
  private generateHTML(): string {
    const currentHour = new Date().getHours();
    const currentPeriod = this.getTimePeriod(currentHour);
    
    return `
      <div class="time-recommendations-container">
        <div class="recommendations-header">
          <h3>⏰ Best Times to Tweet</h3>
          <button class="refresh-btn" title="Refresh">🔄</button>
        </div>
        
        <div class="current-time-indicator">
          <span class="current-label">Current Time:</span>
          <span class="current-period">${currentPeriod}</span>
          <span class="current-hour">${this.formatHour(currentHour)}</span>
        </div>
        
        <div class="time-slots" id="time-slots">
          <div class="loading">
            <span>Analyzing your patterns...</span>
          </div>
        </div>
        
        <div class="time-insights">
          <h4>💡 Insights</h4>
          <div id="time-insights-content">
            <div class="insight-placeholder">
              Gathering data from your tweet history...
            </div>
          </div>
        </div>
        
        <div class="recommendations-footer">
          <small>Based on your last 30 days of activity</small>
        </div>
      </div>
    `;
  }

  /**
   * Load and display recommendations
   */
  private async loadRecommendations(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const patterns = await smartDefaults.getTimeOfDayPatterns();
      
      if (!patterns) {
        this.showNoData();
      } else {
        this.displayRecommendations(patterns);
      }
    } catch (error) {
      console.error('Failed to load time recommendations:', error);
      this.showError();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Display recommendations
   */
  private displayRecommendations(patterns: any): void {
    if (!this.container) return;

    const slotsContainer = this.container.querySelector('#time-slots');
    const insightsContainer = this.container.querySelector('#time-insights-content');
    
    if (!slotsContainer || !insightsContainer) return;

    // Time periods with their data
    const periods = [
      { 
        name: 'morning', 
        label: 'Morning', 
        icon: '🌅', 
        hours: '6 AM - 12 PM',
        data: patterns.morning 
      },
      { 
        name: 'afternoon', 
        label: 'Afternoon', 
        icon: '☀️', 
        hours: '12 PM - 6 PM',
        data: patterns.afternoon 
      },
      { 
        name: 'evening', 
        label: 'Evening', 
        icon: '🌆', 
        hours: '6 PM - 10 PM',
        data: patterns.evening 
      },
      { 
        name: 'night', 
        label: 'Night', 
        icon: '🌙', 
        hours: '10 PM - 2 AM',
        data: patterns.night 
      },
      { 
        name: 'lateNight', 
        label: 'Late Night', 
        icon: '🌌', 
        hours: '2 AM - 6 AM',
        data: patterns.lateNight 
      }
    ];

    // Sort by success rate
    const sortedPeriods = periods
      .filter(p => p.data && p.data.count > 0)
      .sort((a, b) => (b.data.rate || 0) - (a.data.rate || 0));

    // Display time slots
    slotsContainer.innerHTML = sortedPeriods.map((period, index) => {
      const isCurrentPeriod = this.isCurrentPeriod(period.name);
      const isBest = index === 0;
      
      return `
        <div class="time-slot ${isCurrentPeriod ? 'current' : ''} ${isBest ? 'best' : ''}">
          <div class="slot-header">
            <span class="slot-icon">${period.icon}</span>
            <span class="slot-label">${period.label}</span>
            ${isBest ? '<span class="best-badge">BEST</span>' : ''}
          </div>
          <div class="slot-hours">${period.hours}</div>
          <div class="slot-stats">
            <div class="stat">
              <span class="stat-value">${Math.round(period.data.rate * 100)}%</span>
              <span class="stat-label">Success</span>
            </div>
            <div class="stat">
              <span class="stat-value">${period.data.count}</span>
              <span class="stat-label">Tweets</span>
            </div>
          </div>
          <div class="slot-personality">
            <span class="personality-label">Best style:</span>
            <span class="personality-value">${period.data.preferred || 'Any'}</span>
          </div>
        </div>
      `;
    }).join('');

    // Generate insights
    const insights = this.generateInsights(sortedPeriods);
    insightsContainer.innerHTML = insights.map(insight => `
      <div class="insight-item">
        <span class="insight-icon">${insight.icon}</span>
        <span class="insight-text">${insight.text}</span>
      </div>
    `).join('');
  }

  /**
   * Generate insights from patterns
   */
  private generateInsights(periods: any[]): Array<{icon: string, text: string}> {
    const insights = [];

    if (periods.length > 0) {
      const best = periods[0];
      insights.push({
        icon: '🎯',
        text: `Your tweets perform best during <strong>${best.label}</strong> (${Math.round(best.data.rate * 100)}% success rate)`
      });

      if (best.data.preferred) {
        insights.push({
          icon: '✨',
          text: `<strong>${best.data.preferred}</strong> personality works best at this time`
        });
      }
    }

    // Weekend vs weekday insight
    const weekendPeriods = periods.filter(p => p.name.includes('weekend'));
    const weekdayPeriods = periods.filter(p => !p.name.includes('weekend'));
    
    if (weekendPeriods.length > 0 && weekdayPeriods.length > 0) {
      const weekendAvg = weekendPeriods.reduce((sum, p) => sum + p.data.rate, 0) / weekendPeriods.length;
      const weekdayAvg = weekdayPeriods.reduce((sum, p) => sum + p.data.rate, 0) / weekdayPeriods.length;
      
      if (weekendAvg > weekdayAvg) {
        insights.push({
          icon: '📅',
          text: 'Your tweets perform better on <strong>weekends</strong>'
        });
      } else {
        insights.push({
          icon: '💼',
          text: 'Your tweets perform better on <strong>weekdays</strong>'
        });
      }
    }

    // Activity level insight
    const totalTweets = periods.reduce((sum, p) => sum + p.data.count, 0);
    if (totalTweets > 100) {
      insights.push({
        icon: '📊',
        text: `You're an active tweeter with <strong>${totalTweets}</strong> replies tracked`
      });
    } else if (totalTweets < 20) {
      insights.push({
        icon: '📈',
        text: 'Keep tweeting to build more accurate time recommendations'
      });
    }

    return insights;
  }

  /**
   * Check if current time is in period
   */
  private isCurrentPeriod(periodName: string): boolean {
    const hour = new Date().getHours();
    
    switch (periodName) {
      case 'morning': return hour >= 6 && hour < 12;
      case 'afternoon': return hour >= 12 && hour < 18;
      case 'evening': return hour >= 18 && hour < 22;
      case 'night': return hour >= 22 || hour < 2;
      case 'lateNight': return hour >= 2 && hour < 6;
      default: return false;
    }
  }

  /**
   * Get time period name for hour
   */
  private getTimePeriod(hour: number): string {
    if (hour >= 6 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 18) return 'Afternoon';
    if (hour >= 18 && hour < 22) return 'Evening';
    if (hour >= 22 || hour < 2) return 'Night';
    return 'Late Night';
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
   * Show no data state
   */
  private showNoData(): void {
    if (!this.container) return;
    
    const slotsContainer = this.container.querySelector('#time-slots');
    const insightsContainer = this.container.querySelector('#time-insights-content');
    
    if (slotsContainer) {
      slotsContainer.innerHTML = `
        <div class="no-data">
          <span class="no-data-icon">📊</span>
          <p>Not enough data yet</p>
          <small>Keep using TweetCraft to build personalized recommendations</small>
        </div>
      `;
    }
    
    if (insightsContainer) {
      insightsContainer.innerHTML = `
        <div class="insight-item">
          <span class="insight-icon">💡</span>
          <span class="insight-text">Recommendations will appear after 10+ tweets</span>
        </div>
      `;
    }
  }

  /**
   * Show error state
   */
  private showError(): void {
    if (!this.container) return;
    
    const slotsContainer = this.container.querySelector('#time-slots');
    if (slotsContainer) {
      slotsContainer.innerHTML = `
        <div class="error-message">
          <span>⚠️ Unable to load recommendations</span>
          <button class="retry-button">Retry</button>
        </div>
      `;
      
      const retryButton = slotsContainer.querySelector('.retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => this.loadRecommendations());
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
        this.loadRecommendations().finally(() => {
          refreshBtn.classList.remove('spinning');
        });
      });
    }
  }
}

// Export singleton instance
export const timeRecommendations = new TimeRecommendations();
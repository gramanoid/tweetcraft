// WeeklyTab.ts - Weekly summary view
import { TabComponent } from './TabManager';

export class WeeklyTab implements TabComponent {
  private eventListeners: Array<{ element: Element; event: string; handler: EventListener }> = [];
  
  constructor() {}
  
  render(): string {
    const currentWeek = this.getCurrentWeekString();
    
    return `
      <div class="weekly-tab">
        <div class="weekly-header">
          <h3>📅 Weekly Summary</h3>
          <span class="week-label">${currentWeek}</span>
        </div>
        
        <div class="weekly-stats">
          <div class="week-stat">
            <span class="week-stat-icon">💬</span>
            <div class="week-stat-content">
              <div class="week-stat-value">0</div>
              <div class="week-stat-label">Replies This Week</div>
            </div>
          </div>
          
          <div class="week-stat">
            <span class="week-stat-icon">🎯</span>
            <div class="week-stat-content">
              <div class="week-stat-value">0%</div>
              <div class="week-stat-label">Success Rate</div>
            </div>
          </div>
          
          <div class="week-stat">
            <span class="week-stat-icon">🏆</span>
            <div class="week-stat-content">
              <div class="week-stat-value">--</div>
              <div class="week-stat-label">Top Template</div>
            </div>
          </div>
          
          <div class="week-stat">
            <span class="week-stat-icon">📈</span>
            <div class="week-stat-content">
              <div class="week-stat-value">--</div>
              <div class="week-stat-label">Most Active Day</div>
            </div>
          </div>
        </div>
        
        <div class="weekly-timeline">
          <h4>Activity Timeline</h4>
          <div class="timeline-days">
            ${this.generateWeekDays()}
          </div>
        </div>
        
        <div class="weekly-recommendations">
          <h4>💡 Recommendations</h4>
          <ul class="recommendations-list">
            <li>Start using TweetCraft to see personalized recommendations</li>
          </ul>
        </div>
        
        <div class="weekly-actions">
          <button class="btn-export-weekly">Export Weekly Report</button>
          <button class="btn-share-weekly">Share Summary</button>
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
    const container = document.querySelector('.weekly-tab');
    if (!container) return;
    
    const exportBtn = container.querySelector('.btn-export-weekly');
    if (exportBtn) {
      const handler = () => this.exportWeeklyReport();
      exportBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: exportBtn, event: 'click', handler });
    }
    
    const shareBtn = container.querySelector('.btn-share-weekly');
    if (shareBtn) {
      const handler = () => this.shareWeeklySummary();
      shareBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: shareBtn, event: 'click', handler });
    }
  }
  
  private getCurrentWeekString(): string {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${weekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}`;
  }
  
  private generateWeekDays(): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(day => `
      <div class="timeline-day">
        <div class="day-label">${day}</div>
        <div class="day-activity">
          <div class="activity-bar" style="height: 0%"></div>
        </div>
      </div>
    `).join('');
  }
  
  private exportWeeklyReport(): void {
    console.log('📊 Exporting weekly report...');
    // Implementation would export CSV or PDF report
  }
  
  private shareWeeklySummary(): void {
    console.log('🔗 Sharing weekly summary...');
    // Implementation would generate shareable link or image
  }
}

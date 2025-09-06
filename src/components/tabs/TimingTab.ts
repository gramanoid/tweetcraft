// TimingTab.ts - Best time to tweet recommendations
import { TabComponent } from './TabManager';

export class TimingTab implements TabComponent {
  private eventListeners: Array<{ element: Element; event: string; handler: EventListener }> = [];
  
  constructor() {}
  
  render(): string {
    const currentHour = new Date().getHours();
    const timeOfDay = this.getTimeOfDay(currentHour);
    
    return `
      <div class="timing-tab">
        <div class="timing-header">
          <h3>⏰ Best Times to Tweet</h3>
          <span class="current-time">${timeOfDay}</span>
        </div>
        
        <div class="timing-recommendations">
          <div class="time-slot optimal">
            <div class="time-icon">🎯</div>
            <div class="time-details">
              <div class="time-period">Peak Hours</div>
              <div class="time-range">9-10 AM, 5-6 PM</div>
              <div class="time-reason">Highest engagement rates</div>
            </div>
          </div>
          
          <div class="time-slot good">
            <div class="time-icon">✅</div>
            <div class="time-details">
              <div class="time-period">Good Times</div>
              <div class="time-range">12-1 PM, 8-9 PM</div>
              <div class="time-reason">Above average engagement</div>
            </div>
          </div>
          
          <div class="time-slot avoid">
            <div class="time-icon">⚠️</div>
            <div class="time-details">
              <div class="time-period">Avoid</div>
              <div class="time-range">2-4 AM</div>
              <div class="time-reason">Lowest engagement</div>
            </div>
          </div>
        </div>
        
        <div class="timing-heatmap">
          <h4>Weekly Activity Heatmap</h4>
          <div class="heatmap-container">
            ${this.generateHeatmap()}
          </div>
        </div>
        
        <div class="timing-insights">
          <h4>💡 Your Patterns</h4>
          <ul class="insights-list">
            <li>Track your tweet times to see personalized recommendations</li>
            <li>Current time zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}</li>
          </ul>
        </div>
        
        <div class="timing-actions">
          <button class="btn-schedule-optimal">Schedule at Optimal Time</button>
          <button class="btn-analyze-history">Analyze My History</button>
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
    const container = document.querySelector('.timing-tab');
    if (!container) return;
    
    const scheduleBtn = container.querySelector('.btn-schedule-optimal');
    if (scheduleBtn) {
      const handler = () => this.scheduleOptimalTime();
      scheduleBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: scheduleBtn, event: 'click', handler });
    }
    
    const analyzeBtn = container.querySelector('.btn-analyze-history');
    if (analyzeBtn) {
      const handler = () => this.analyzeHistory();
      analyzeBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: analyzeBtn, event: 'click', handler });
    }
  }
  
  private getTimeOfDay(hour: number): string {
    if (hour < 6) return 'Late Night';
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    if (hour < 21) return 'Evening';
    return 'Night';
  }
  
  private generateHeatmap(): string {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    // Generate simplified heatmap grid
    return `
      <div class="heatmap-grid">
        <div class="heatmap-labels-y">
          ${days.map(day => `<div class="label-y">${day}</div>`).join('')}
        </div>
        <div class="heatmap-cells">
          ${days.map(() => `
            <div class="heatmap-row">
              ${hours.map(() => `<div class="heatmap-cell" data-intensity="0"></div>`).join('')}
            </div>
          `).join('')}
        </div>
        <div class="heatmap-labels-x">
          <div class="label-x">12AM</div>
          <div class="label-x">6AM</div>
          <div class="label-x">12PM</div>
          <div class="label-x">6PM</div>
          <div class="label-x">11PM</div>
        </div>
      </div>
    `;
  }
  
  private scheduleOptimalTime(): void {
    console.log('📅 Scheduling at optimal time...');
    // Implementation would integrate with scheduling service
  }
  
  private analyzeHistory(): void {
    console.log('📊 Analyzing tweet history...');
    // Implementation would analyze user's tweet history
  }
}

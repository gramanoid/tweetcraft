// ABTestTab.ts - A/B testing for replies
import { TabComponent } from './TabManager';

export class ABTestTab implements TabComponent {
  private eventListeners: Array<{ element: Element; event: string; handler: EventListener }> = [];
  
  constructor() {}
  
  render(): string {
    return `
      <div class="ab-test-tab">
        <div class="ab-test-header">
          <h3>🧪 A/B Testing</h3>
          <button class="btn-new-test">+ New Test</button>
        </div>
        
        <div class="active-tests">
          <h4>Active Tests</h4>
          <div class="test-list">
            <div class="test-item">
              <div class="test-name">No active tests</div>
              <div class="test-description">Create your first A/B test to compare reply styles</div>
            </div>
          </div>
        </div>
        
        <div class="test-creator" style="display: none;">
          <h4>Create New Test</h4>
          <div class="test-form">
            <div class="form-group">
              <label>Test Name</label>
              <input type="text" class="test-name-input" placeholder="e.g., Formal vs Casual">
            </div>
            
            <div class="variant-a">
              <h5>Variant A</h5>
              <select class="variant-a-personality">
                <option value="">Select Personality</option>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="witty">Witty</option>
              </select>
            </div>
            
            <div class="variant-b">
              <h5>Variant B</h5>
              <select class="variant-b-personality">
                <option value="">Select Personality</option>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="witty">Witty</option>
              </select>
            </div>
            
            <div class="test-actions">
              <button class="btn-start-test">Start Test</button>
              <button class="btn-cancel-test">Cancel</button>
            </div>
          </div>
        </div>
        
        <div class="test-results">
          <h4>Test Results</h4>
          <div class="results-container">
            <div class="no-results">
              <p>No completed tests yet</p>
              <p class="hint">Run A/B tests to find your most effective reply styles</p>
            </div>
          </div>
        </div>
        
        <div class="test-insights">
          <h4>💡 Testing Best Practices</h4>
          <ul class="insights-list">
            <li>Test one variable at a time for clear results</li>
            <li>Run tests for at least 50 replies per variant</li>
            <li>Consider time of day and audience when testing</li>
            <li>Use statistical significance before making decisions</li>
          </ul>
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
    const container = document.querySelector('.ab-test-tab');
    if (!container) return;
    
    const newTestBtn = container.querySelector('.btn-new-test');
    if (newTestBtn) {
      const handler = () => this.showTestCreator();
      newTestBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: newTestBtn, event: 'click', handler });
    }
    
    const startTestBtn = container.querySelector('.btn-start-test');
    if (startTestBtn) {
      const handler = () => this.startTest();
      startTestBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: startTestBtn, event: 'click', handler });
    }
    
    const cancelTestBtn = container.querySelector('.btn-cancel-test');
    if (cancelTestBtn) {
      const handler = () => this.hideTestCreator();
      cancelTestBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: cancelTestBtn, event: 'click', handler });
    }
  }
  
  private showTestCreator(): void {
    const creator = document.querySelector('.test-creator') as HTMLElement;
    if (creator) {
      creator.style.display = 'block';
    }
    console.log('🧪 Opening test creator...');
  }
  
  private hideTestCreator(): void {
    const creator = document.querySelector('.test-creator') as HTMLElement;
    if (creator) {
      creator.style.display = 'none';
    }
  }
  
  private startTest(): void {
    const container = document.querySelector('.ab-test-tab');
    if (!container) return;
    
    const testName = (container.querySelector('.test-name-input') as HTMLInputElement)?.value;
    const variantA = (container.querySelector('.variant-a-personality') as HTMLSelectElement)?.value;
    const variantB = (container.querySelector('.variant-b-personality') as HTMLSelectElement)?.value;
    
    console.log('🚀 Starting A/B test:', { testName, variantA, variantB });
    // Implementation would create and track the test
    
    this.hideTestCreator();
  }
}

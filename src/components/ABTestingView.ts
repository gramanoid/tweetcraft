/**
 * A/B Testing View Component
 * UI for comparing tweet style performance
 */

import { abTesting, type ABTestCombo, type ABTestResult } from '../services/abTesting';

export class ABTestingView {
  private container: HTMLElement | null = null;
  private activeTest: any = null;

  /**
   * Create the A/B testing view HTML
   */
  async createView(): Promise<string> {
    this.activeTest = await abTesting.getActiveTest();
    const suggestedTests = await abTesting.getSuggestedTests();
    
    if (this.activeTest) {
      return this.renderActiveTest();
    } else {
      return this.renderTestSetup(suggestedTests);
    }
  }

  /**
   * Render active test view
   */
  private async renderActiveTest(): Promise<string> {
    const result = await abTesting.compareStyles(this.activeTest.combos);
    
    return `
      <div class="ab-testing-view">
        <div class="ab-header">
          <h3>🧪 A/B Test: ${this.activeTest.name}</h3>
          <button class="stop-test-btn">Stop Test</button>
        </div>

        <div class="ab-results">
          ${this.renderTestResults(result)}
        </div>

        <div class="ab-groups">
          ${result.groups.map((group, idx) => `
            <div class="ab-group ${result.winner === group ? 'winner' : ''}">
              <div class="group-header">
                <span class="group-label">Group ${String.fromCharCode(65 + idx)}</span>
                ${result.winner === group ? '<span class="winner-badge">👑 Winner</span>' : ''}
              </div>
              <div class="group-combo">
                <div class="combo-item">${group.combo.personality}</div>
                <div class="combo-item">${group.combo.vocabulary}</div>
                <div class="combo-item">${group.combo.rhetoric}</div>
                <div class="combo-item">${group.combo.lengthPacing}</div>
              </div>
              <div class="group-metrics">
                <div class="metric">
                  <span class="metric-label">Tweets</span>
                  <span class="metric-value">${group.tweets}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Avg Likes</span>
                  <span class="metric-value">${group.avgLikes.toFixed(1)}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Avg RTs</span>
                  <span class="metric-value">${group.avgRetweets.toFixed(1)}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Engagement</span>
                  <span class="metric-value">${group.avgEngagement.toFixed(1)}</span>
                </div>
              </div>
              <div class="group-confidence">
                <div class="confidence-bar">
                  <div class="confidence-fill" style="width: ${group.confidence * 100}%"></div>
                </div>
                <span class="confidence-text">${Math.round(group.confidence * 100)}% confidence</span>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="ab-recommendation">
          <p>💡 ${result.recommendation}</p>
        </div>
      </div>
    `;
  }

  /**
   * Render test setup view
   */
  private renderTestSetup(suggestedTests: any[]): string {
    return `
      <div class="ab-testing-view">
        <div class="ab-header">
          <h3>🧪 A/B Testing</h3>
          <p class="ab-subtitle">Compare different tweet styles to find what works best</p>
        </div>

        <div class="ab-setup">
          <h4>Quick Start Tests</h4>
          <div class="suggested-tests">
            ${suggestedTests.map(test => `
              <div class="suggested-test">
                <div class="test-header">
                  <h5>${test.name}</h5>
                  <button class="start-test-btn" data-test='${JSON.stringify(test)}'>
                    Start Test
                  </button>
                </div>
                <p class="test-reason">${test.reason}</p>
                <div class="test-combos">
                  ${test.combos.map((combo: ABTestCombo, idx: number) => `
                    <div class="test-combo">
                      <span class="combo-label">Group ${String.fromCharCode(65 + idx)}:</span>
                      <span class="combo-desc">
                        ${combo.personality} + ${combo.rhetoric}
                      </span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('') || '<p class="no-tests">Generate more tweets to unlock A/B testing suggestions!</p>'}
          </div>

          <div class="custom-test">
            <h4>Custom Test</h4>
            <div class="custom-test-form">
              <input type="text" class="test-name-input" placeholder="Test name (e.g., 'Formal vs Casual')">
              
              <div class="custom-groups">
                <div class="custom-group">
                  <h5>Group A</h5>
                  <select class="personality-select" data-group="a">
                    <option value="">Select Personality</option>
                    <option value="Friendly">Friendly</option>
                    <option value="Professional">Professional</option>
                    <option value="Witty">Witty</option>
                    <option value="Bold">Bold</option>
                  </select>
                  <select class="rhetoric-select" data-group="a">
                    <option value="">Select Rhetoric</option>
                    <option value="Question">Question</option>
                    <option value="Statement">Statement</option>
                    <option value="Analogy">Analogy</option>
                    <option value="Humor">Humor</option>
                  </select>
                </div>
                
                <div class="custom-group">
                  <h5>Group B</h5>
                  <select class="personality-select" data-group="b">
                    <option value="">Select Personality</option>
                    <option value="Friendly">Friendly</option>
                    <option value="Professional">Professional</option>
                    <option value="Witty">Witty</option>
                    <option value="Bold">Bold</option>
                  </select>
                  <select class="rhetoric-select" data-group="b">
                    <option value="">Select Rhetoric</option>
                    <option value="Question">Question</option>
                    <option value="Statement">Statement</option>
                    <option value="Analogy">Analogy</option>
                    <option value="Humor">Humor</option>
                  </select>
                </div>
              </div>
              
              <button class="start-custom-test-btn">Start Custom Test</button>
            </div>
          </div>
        </div>

        <div class="ab-info">
          <h4>ℹ️ How It Works</h4>
          <ol>
            <li>Select two tweet styles to compare</li>
            <li>Generate tweets using both styles alternately</li>
            <li>We'll track engagement metrics automatically</li>
            <li>View results to see which style performs better</li>
          </ol>
        </div>
      </div>
    `;
  }

  /**
   * Render test results summary
   */
  private renderTestResults(result: ABTestResult): string {
    const hasEnoughData = result.sampleSize >= 10;
    const statusClass = hasEnoughData ? 'good' : 'needs-data';
    
    return `
      <div class="results-summary ${statusClass}">
        <div class="result-stat">
          <span class="stat-value">${result.sampleSize}</span>
          <span class="stat-label">Total Tweets</span>
        </div>
        <div class="result-stat">
          <span class="stat-value">${Math.round(result.confidenceLevel * 100)}%</span>
          <span class="stat-label">Confidence</span>
        </div>
        <div class="result-stat">
          <span class="stat-value">${result.groups.length}</span>
          <span class="stat-label">Groups</span>
        </div>
      </div>
    `;
  }

  /**
   * Attach event handlers
   */
  attachEventHandlers(container: HTMLElement): void {
    this.container = container;
    
    // Stop test button
    const stopBtn = container.querySelector('.stop-test-btn');
    if (stopBtn) {
      stopBtn.addEventListener('click', async () => {
        await abTesting.stopABTest();
        this.refresh();
      });
    }
    
    // Start suggested test buttons
    container.querySelectorAll('.start-test-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const testData = JSON.parse((e.target as HTMLElement).dataset.test || '{}');
        await abTesting.startABTest(testData.name, testData.combos);
        this.refresh();
      });
    });
    
    // Start custom test button
    const customBtn = container.querySelector('.start-custom-test-btn');
    if (customBtn) {
      customBtn.addEventListener('click', async () => {
        const name = (container.querySelector('.test-name-input') as HTMLInputElement)?.value || 'Custom Test';
        
        const groupA = {
          personality: (container.querySelector('.personality-select[data-group="a"]') as HTMLSelectElement)?.value || 'Friendly',
          vocabulary: 'Contemporary',
          rhetoric: (container.querySelector('.rhetoric-select[data-group="a"]') as HTMLSelectElement)?.value || 'Question',
          lengthPacing: 'Concise'
        };
        
        const groupB = {
          personality: (container.querySelector('.personality-select[data-group="b"]') as HTMLSelectElement)?.value || 'Professional',
          vocabulary: 'Contemporary',
          rhetoric: (container.querySelector('.rhetoric-select[data-group="b"]') as HTMLSelectElement)?.value || 'Statement',
          lengthPacing: 'Concise'
        };
        
        await abTesting.startABTest(name, [groupA, groupB]);
        this.refresh();
      });
    }
  }

  /**
   * Refresh the view
   */
  private async refresh(): Promise<void> {
    if (!this.container) return;
    
    const newContent = await this.createView();
    this.container.innerHTML = newContent;
    this.attachEventHandlers(this.container);
  }
}

export const abTestingView = new ABTestingView();
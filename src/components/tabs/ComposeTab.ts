/**
 * ComposeTab Component
 * Compose mode for drafting tweets with AI assistance
 */

import { TabComponent } from './TabManager';

export class ComposeTab implements TabComponent {
  private onSelectCallback: (config: any) => void;
  private draftContent: string = '';

  constructor(onSelectCallback: (config: any) => void) {
    this.onSelectCallback = onSelectCallback;
  }

  public render(): string {
    return `
      <div class="compose-tab-container">
        <div class="compose-header">
          <h3>Compose Mode</h3>
          <p class="compose-subtitle">Draft your tweet with AI assistance</p>
        </div>
        <div class="compose-form">
          <textarea 
            id="compose-draft" 
            class="compose-textarea"
            placeholder="Start writing your tweet..."
            rows="5">${this.draftContent}</textarea>
          <div class="compose-actions">
            <button class="compose-enhance-btn">✨ Enhance with AI</button>
            <button class="compose-suggest-btn">💡 Get Suggestions</button>
          </div>
        </div>
      </div>
    `;
  }

  public cleanup(): void {
    // Cleanup handled by TabManager
  }

  public destroy(): void {
    this.draftContent = '';
  }

  public attachEventListeners(container: HTMLElement): void {
    const draftTextarea = container.querySelector('#compose-draft') as HTMLTextAreaElement;
    if (draftTextarea) {
      draftTextarea.addEventListener('input', (e: Event) => {
        this.draftContent = (e.target as HTMLTextAreaElement).value;
      });
    }

    const enhanceBtn = container.querySelector('.compose-enhance-btn');
    if (enhanceBtn) {
      enhanceBtn.addEventListener('click', () => {
        this.onSelectCallback({
          tab: 'compose',
          action: 'enhance',
          content: this.draftContent
        });
      });
    }

    const suggestBtn = container.querySelector('.compose-suggest-btn');
    if (suggestBtn) {
      suggestBtn.addEventListener('click', () => {
        this.onSelectCallback({
          tab: 'compose',
          action: 'suggest',
          content: this.draftContent
        });
      });
    }
  }
}

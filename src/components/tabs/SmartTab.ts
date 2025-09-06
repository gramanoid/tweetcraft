import { TabComponent } from './TabManager';
import { TEMPLATES } from '../../content/presetTemplates';
import { PERSONALITIES } from '../../config/personalities';

export class SmartTab implements TabComponent {
  private smartSuggestions: any = {
    templates: [],
    personalities: []
  };
  private smartSuggestionsScores: any[] = [];

  constructor(private onSelectCallback: any) {}

  render(): string {
    // Use smart suggestions with scores if available
    const suggestedTemplates = this.smartSuggestions.templates.length > 0
      ? this.smartSuggestions.templates
      : TEMPLATES.slice(0, 6); // Fallback to first 6 templates

    const suggestedPersonalities = this.smartSuggestions.personalities.length > 0
      ? this.smartSuggestions.personalities
      : PERSONALITIES.slice(0, 6); // Fallback to first 6 personalities

    return `
      <div class="selector-content smart-view">
        <div class="smart-info">
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px;">
            <p style="text-align: center; color: #8b98a5; font-size: 12px; margin: 0;">
              🤖 Top AI-suggested combinations for your context
            </p>
            <button class="refresh-suggestions-btn" title="Get new suggestions">
              <span style="font-size: 12px;">🔄</span>
            </button>
            <button class="quick-arsenal-btn" title="Quick access to your top 5 arsenal replies">
              ⚡ Quick Arsenal
            </button>
          </div>
        </div>
        <div class="smart-suggestions-list">
          ${this.renderSuggestions(suggestedTemplates, suggestedPersonalities)}
        </div>
      </div>
    `;
  }

  private renderSuggestions(templates: any[], personalities: any[]): string {
    const combinations: string[] = [];
    
    // Create combinations of templates and personalities
    for (let i = 0; i < Math.min(6, templates.length); i++) {
      for (let j = 0; j < Math.min(2, personalities.length); j++) {
        const template = templates[i];
        const personality = personalities[j];
        
        combinations.push(`
          <div class="suggestion-card" data-template="${template.id}" data-personality="${personality.id}">
            <div class="suggestion-header">
              <span class="suggestion-combo">
                ${template.emoji} ${template.name} + ${personality.emoji} ${personality.label}
              </span>
            </div>
            <div class="suggestion-preview">
              ${template.description || 'Smart combination for effective replies'}
            </div>
          </div>
        `);
        
        if (combinations.length >= 12) break;
      }
      if (combinations.length >= 12) break;
    }
    
    return combinations.join('');
  }

  attachEventListeners(container: HTMLElement): void {
    // Handle suggestion card clicks
    container.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('click', () => {
        const templateId = card.getAttribute('data-template');
        const personalityId = card.getAttribute('data-personality');
        
        if (templateId && personalityId && this.onSelectCallback) {
          const template = TEMPLATES.find((t: any) => t.id === templateId);
          const personality = PERSONALITIES.find(p => p.id === personalityId);
          
          if (template && personality) {
            // Call the callback with selected template and personality
            this.onSelectCallback({
              template,
              tone: personality,
              tabType: 'smart'
            });
          }
        }
      });
    });

    // Handle refresh button
    const refreshBtn = container.querySelector('.refresh-suggestions-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // TODO: Implement refresh logic
        console.log('Refreshing suggestions...');
      });
    }

    // Handle quick arsenal button
    const arsenalBtn = container.querySelector('.quick-arsenal-btn');
    if (arsenalBtn) {
      arsenalBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // TODO: Implement quick arsenal modal
        console.log('Opening quick arsenal...');
      });
    }
  }

  destroy(): void {
    // Clean up if needed
  }
}
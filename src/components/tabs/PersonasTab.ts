import { TabComponent } from './TabManager';
import { TEMPLATES } from '../../content/presetTemplates';
import { PERSONALITIES } from '../../config/personalities';

export class PersonasTab implements TabComponent {
  private selectedTemplate: any = null;
  private selectedPersonality: any = null;

  constructor(private onSelectCallback: any) {}

  render(): string {
    // Group personalities by category
    const groupedPersonalities = this.groupPersonalities();
    
    return `
      <div class="selector-content personas-view">
        <div class="templates-section">
          <h3 class="section-title">📝 Choose Template</h3>
          <div class="templates-grid">
            ${TEMPLATES.map((t: any) => `
              <div class="template-card" data-template="${t.id}" title="${t.description}">
                <span class="template-emoji">${t.emoji}</span>
                <span class="template-name">${t.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="personalities-section">
          <h3 class="section-title">🎭 Choose Personality</h3>
          ${this.renderGroupedPersonalities(groupedPersonalities)}
        </div>
        
        <div class="personas-action-section">
          <button class="generate-personas-btn" disabled>
            Select template and personality to generate
          </button>
        </div>
      </div>
    `;
  }

  private groupPersonalities(): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    // Define categories
    const categories = [
      { id: 'professional', label: '💼 Professional', personalities: ['professional', 'thoughtful', 'analytical', 'teacher'] },
      { id: 'friendly', label: '😊 Friendly', personalities: ['friendly', 'supportive', 'helpful', 'enthusiastic'] },
      { id: 'humorous', label: '😄 Humorous', personalities: ['humorous', 'witty', 'sarcastic', 'playful'] },
      { id: 'spicy', label: '🔥 Spicy', personalities: ['bold', 'controversial', 'provocative', 'critical'] },
      { id: 'creative', label: '🎭 Creative', personalities: ['creative', 'philosophical', 'mystical', 'zen'] }
    ];
    
    categories.forEach(cat => {
      const personalities = PERSONALITIES.filter(p => 
        cat.personalities.includes(p.id)
      );
      if (personalities.length > 0) {
        groups.set(cat.label, personalities);
      }
    });
    
    // Add any remaining personalities to "Other"
    const categorized = categories.flatMap(c => c.personalities);
    const others = PERSONALITIES.filter(p => !categorized.includes(p.id));
    if (others.length > 0) {
      groups.set('🌟 Other', others);
    }
    
    return groups;
  }

  private renderGroupedPersonalities(groups: Map<string, any[]>): string {
    return Array.from(groups.entries()).map(([category, personalities]) => `
      <div class="personality-group">
        <h4 class="group-title">${category}</h4>
        <div class="personalities-grid">
          ${personalities.map(p => `
            <div class="personality-card" data-personality="${p.id}" title="${p.description || p.label}">
              <span class="personality-emoji">${p.emoji}</span>
              <span class="personality-label">${p.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  attachEventListeners(container: HTMLElement): void {
    // Handle template selection
    container.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        const templateId = card.getAttribute('data-template');
        this.selectedTemplate = TEMPLATES.find((t: any) => t.id === templateId);
        this.checkBothSelected(container);
      });
    });

    // Handle personality selection
    container.querySelectorAll('.personality-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.personality-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        const personalityId = card.getAttribute('data-personality');
        this.selectedPersonality = PERSONALITIES.find(p => p.id === personalityId);
        this.checkBothSelected(container);
      });
    });

    // Handle generate button
    const generateBtn = container.querySelector('.generate-personas-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        if (this.selectedTemplate && this.selectedPersonality && this.onSelectCallback) {
          this.onSelectCallback({
            template: this.selectedTemplate,
            tone: this.selectedPersonality,
            tabType: 'personas',
            personaConfig: {
              templateId: this.selectedTemplate.id,
              personalityId: this.selectedPersonality.id
            }
          });
        }
      });
    }
  }

  private checkBothSelected(container: HTMLElement): void {
    const generateBtn = container.querySelector('.generate-personas-btn') as HTMLButtonElement;
    if (generateBtn) {
      if (this.selectedTemplate && this.selectedPersonality) {
        generateBtn.disabled = false;
        generateBtn.textContent = `✨ Generate with ${this.selectedTemplate.emoji} ${this.selectedTemplate.name} + ${this.selectedPersonality.emoji} ${this.selectedPersonality.label}`;
      } else {
        generateBtn.disabled = true;
        generateBtn.textContent = 'Select template and personality to generate';
      }
    }
  }

  destroy(): void {
    this.selectedTemplate = null;
    this.selectedPersonality = null;
  }
}
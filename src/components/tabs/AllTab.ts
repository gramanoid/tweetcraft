import { TabComponent } from './TabManager';
import { PERSONALITIES } from '../../config/personalities';
import { getAllVocabularyStyles } from '../../config/vocabulary';
import { getAllRhetoricalMoves } from '../../config/rhetoric';
import { getAllLengthPacingStyles } from '../../config/lengthPacing';

export class AllTab implements TabComponent {
  private selectedPersonality: string = '';
  private selectedVocabulary: string = '';
  private selectedRhetoric: string = '';
  private selectedLength: string = '';

  constructor(private onSelectCallback: any) {}

  render(): string {
    return `
      <div class="selector-content all-view">
        <div class="all-tab-sections">
          ${this.renderPersonalitySection()}
          ${this.renderVocabularySection()}
          ${this.renderRhetoricSection()}
          ${this.renderLengthSection()}
        </div>
        <div class="all-tab-generate">
          <button class="generate-with-all-btn" disabled>
            Select all options to generate
          </button>
        </div>
      </div>
    `;
  }

  private renderPersonalitySection(): string {
    return `
      <div class="all-section personality-section">
        <h3 class="section-title">🎭 Personality</h3>
        <div class="options-grid">
          ${PERSONALITIES.map((p: any) => `
            <div class="option-card personality-card" data-personality="${p.id}">
              <span class="option-emoji">${p.emoji}</span>
              <span class="option-label">${p.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderVocabularySection(): string {
    return `
      <div class="all-section vocabulary-section">
        <h3 class="section-title">📚 Vocabulary</h3>
        <div class="options-grid">
          ${getAllVocabularyStyles().map((v: any) => `
            <div class="option-card vocabulary-card" data-vocabulary="${v.id}">
              <span class="option-emoji">${v.emoji}</span>
              <span class="option-label">${v.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderRhetoricSection(): string {
    return `
      <div class="all-section rhetoric-section">
        <h3 class="section-title">🎯 Rhetoric</h3>
        <div class="options-grid">
          ${getAllRhetoricalMoves().map((r: any) => `
            <div class="option-card rhetoric-card" data-rhetoric="${r.id}">
              <span class="option-emoji">${r.emoji}</span>
              <span class="option-label">${r.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderLengthSection(): string {
    return `
      <div class="all-section length-section">
        <h3 class="section-title">📏 Length & Pacing</h3>
        <div class="options-grid">
          ${getAllLengthPacingStyles().map((l: any) => `
            <div class="option-card length-card" data-length="${l.id}">
              <span class="option-emoji">${l.emoji}</span>
              <span class="option-label">${l.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  attachEventListeners(container: HTMLElement): void {
    // Handle personality selection
    container.querySelectorAll('.personality-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.personality-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedPersonality = card.getAttribute('data-personality') || '';
        this.checkAllSelected(container);
      });
    });

    // Handle vocabulary selection
    container.querySelectorAll('.vocabulary-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.vocabulary-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedVocabulary = card.getAttribute('data-vocabulary') || '';
        this.checkAllSelected(container);
      });
    });

    // Handle rhetoric selection
    container.querySelectorAll('.rhetoric-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.rhetoric-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedRhetoric = card.getAttribute('data-rhetoric') || '';
        this.checkAllSelected(container);
      });
    });

    // Handle length selection
    container.querySelectorAll('.length-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.length-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedLength = card.getAttribute('data-length') || '';
        this.checkAllSelected(container);
      });
    });

    // Handle generate button
    const generateBtn = container.querySelector('.generate-with-all-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        if (this.selectedPersonality && this.selectedVocabulary && 
            this.selectedRhetoric && this.selectedLength && this.onSelectCallback) {
          
          const personality = PERSONALITIES.find((p: any) => p.id === this.selectedPersonality);
          const vocabulary = getAllVocabularyStyles().find((v: any) => v.id === this.selectedVocabulary);
          const rhetoric = getAllRhetoricalMoves().find((r: any) => r.id === this.selectedRhetoric);
          const length = getAllLengthPacingStyles().find((l: any) => l.id === this.selectedLength);
          
          if (personality && vocabulary && rhetoric && length) {
            this.onSelectCallback({
              template: { id: 'all', name: 'All Options', emoji: '🎯', prompt: '' },
              tone: personality,
              vocabulary: vocabulary.label,
              lengthPacing: length.label,
              tabType: 'all',
              allTabConfig: {
                personality: personality.id,
                vocabulary: vocabulary.id,
                rhetoric: rhetoric.id,
                lengthPacing: length.id
              }
            });
          }
        }
      });
    }
  }

  private checkAllSelected(container: HTMLElement): void {
    const generateBtn = container.querySelector('.generate-with-all-btn') as HTMLButtonElement;
    if (generateBtn) {
      if (this.selectedPersonality && this.selectedVocabulary && 
          this.selectedRhetoric && this.selectedLength) {
        generateBtn.disabled = false;
        generateBtn.textContent = '✨ Generate Reply';
      } else {
        generateBtn.disabled = true;
        generateBtn.textContent = 'Select all options to generate';
      }
    }
  }

  destroy(): void {
    // Clean up if needed
  }
}
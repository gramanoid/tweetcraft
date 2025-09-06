/**
 * PersonasTab - Handles template and personality selection for reply generation
 * Now fully wired with message passing and UI state management
 */

import { TabComponent, TabManager } from './TabManager';
import { SelectionResult } from '@/content/unifiedSelector';
import { QuickPersona, getAllQuickPersonas } from '@/config/quickPersonas';
import { getAllVocabularyStyles } from '@/config/vocabulary';
import { RHETORICAL_MOVES } from '@/config/rhetoric';
import { getAllLengthPacingStyles } from '@/config/lengthPacing';
import UIStateManager from '@/services/uiStateManager';
import MessageBridge from '@/services/messageBridge';
import { logger } from '@/utils/logger';

export class PersonasTab implements TabComponent {
  private selectedPersona: QuickPersona | null = null;
  private selectedVocabulary: string | null = null;
  private selectedRhetoric: string | null = null;
  private selectedLength: string | null = null;
  private currentReply: string | null = null;

  constructor(
    private onSelectCallback: ((result: SelectionResult) => void) | null,
    private tabManager?: TabManager
  ) {}

  render(): string {
    const personas = getAllQuickPersonas();
    const groupedPersonas = this.groupPersonasByCategory(personas);
    
    return `
      <div class="selector-content personas-view">
        <!-- Status Message Area -->
        <div class="status-message" style="display: none;"></div>
        
        <!-- Personas Section -->
        <div class="personas-section">
          <h3 class="section-title">
            <span>👤 Select a Persona</span>
            <span class="section-hint">(24 unique personalities with pre-configured styles)</span>
          </h3>
          ${this.renderGroupedPersonas(groupedPersonas)}
        </div>
        
        <!-- Selected Persona Details -->
        <div class="selected-persona-details" style="display: none;">
          <div class="selection-summary">
            <h4>Selected Configuration:</h4>
            <div class="config-details"></div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="personas-action-section">
          <button class="generate-reply-btn primary-action" disabled>
            <span class="btn-icon">✨</span>
            <span class="btn-text">Select a persona to generate</span>
          </button>
          
          <div class="secondary-actions" style="display: none;">
            <button class="regenerate-btn secondary-action">
              <span>🔄</span> Regenerate
            </button>
            <button class="save-to-arsenal-btn secondary-action">
              <span>💾</span> Save to Arsenal
            </button>
          </div>
        </div>
        
        <!-- Generated Reply Area -->
        <div class="generated-reply-area"></div>
      </div>
    `;
  }

  private groupPersonasByCategory(personas: QuickPersona[]): Map<string, QuickPersona[]> {
    const groups = new Map<string, QuickPersona[]>();
    
    const categories = [
      { 
        id: 'professional', 
        label: '💼 Professional', 
        icon: '💼',
        personaIds: ['executive', 'teacher', 'analyst', 'advisor'] 
      },
      { 
        id: 'friendly', 
        label: '😊 Friendly', 
        icon: '😊',
        personaIds: ['friend', 'supporter', 'helper', 'enthusiast'] 
      },
      { 
        id: 'humorous', 
        label: '😄 Humorous', 
        icon: '😄',
        personaIds: ['comedian', 'witty', 'sarcastic', 'playful'] 
      },
      { 
        id: 'spicy', 
        label: '🔥 Spicy', 
        icon: '🔥',
        personaIds: ['challenger', 'debater', 'provocateur', 'critic'] 
      },
      { 
        id: 'creative', 
        label: '🎭 Creative', 
        icon: '🎭',
        personaIds: ['philosopher', 'artist', 'mystic', 'zen', 'poet', 'dreamer'] 
      }
    ];
    
    categories.forEach(cat => {
      const categoryPersonas = personas.filter(p => 
        cat.personaIds.some(id => p.id.toLowerCase().includes(id))
      );
      if (categoryPersonas.length > 0) {
        groups.set(cat.label, categoryPersonas);
      }
    });
    
    // Add any uncategorized personas
    const categorized = new Set(
      categories.flatMap(c => 
        personas.filter(p => c.personaIds.some(id => p.id.toLowerCase().includes(id)))
      ).map(p => p.id)
    );
    
    const others = personas.filter(p => !categorized.has(p.id));
    if (others.length > 0) {
      groups.set('🌟 Other', others);
    }
    
    return groups;
  }

  private renderGroupedPersonas(groups: Map<string, QuickPersona[]>): string {
    return Array.from(groups.entries()).map(([category, personas]) => {
      const categoryClass = category.toLowerCase().replace(/[^a-z]/g, '');
      return `
        <div class="personality-group ${categoryClass}-group">
          <h4 class="group-title">
            ${category}
            <span class="group-count">(${personas.length})</span>
          </h4>
          <div class="personas-grid">
            ${personas.map(persona => this.renderPersonaCard(persona)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  private renderPersonaCard(persona: QuickPersona): string {
    const vocabulary = getAllVocabularyStyles().find(v => v.id === persona.vocabulary);
    const rhetoric = RHETORICAL_MOVES.find(r => r.id === persona.rhetoricMove);
    const length = getAllLengthPacingStyles().find(l => l.id === persona.lengthPacing);
    
    return `
      <div class="persona-card" 
           data-persona-id="${persona.id}"
           data-persona='${JSON.stringify({
             id: persona.id,
             personality: persona.personality,
             vocabulary: persona.vocabulary,
             rhetoric: persona.rhetoricMove,
             length: persona.lengthPacing
           }).replace(/'/g, '&apos;')}'
           title="${persona.description || persona.name}">
        <div class="persona-icon">${persona.emoji || '👤'}</div>
        <div class="persona-label">${persona.name}</div>
        <div class="persona-details">
          <span class="detail-badge">${vocabulary?.label || 'Standard'}</span>
          <span class="detail-badge">${rhetoric?.name || 'Balanced'}</span>
        </div>
        <div class="persona-checkmark" style="display: none;">✓</div>
      </div>
    `;
  }

  attachEventListeners(container: HTMLElement): void {
    // Handle persona card selection
    container.querySelectorAll('.persona-card').forEach(card => {
      card.addEventListener('click', () => this.handlePersonaSelection(card as HTMLElement, container));
    });

    // Handle generate button
    const generateBtn = container.querySelector('.generate-reply-btn') as HTMLButtonElement;
    generateBtn?.addEventListener('click', () => this.handleGenerate(container));

    // Handle regenerate button
    const regenerateBtn = container.querySelector('.regenerate-btn');
    regenerateBtn?.addEventListener('click', () => this.handleRegenerate(container));

    // Handle save to arsenal
    const saveBtn = container.querySelector('.save-to-arsenal-btn');
    saveBtn?.addEventListener('click', () => this.handleSaveToArsenal(container));

    // Add keyboard shortcuts for quick selection
    this.attachKeyboardShortcuts(container);
  }

  private handlePersonaSelection(card: HTMLElement, container: HTMLElement): void {
    // Clear previous selection
    container.querySelectorAll('.persona-card').forEach(c => {
      c.classList.remove('selected');
      const checkmark = c.querySelector('.persona-checkmark') as HTMLElement;
      if (checkmark) checkmark.style.display = 'none';
    });

    // Mark as selected
    card.classList.add('selected');
    const checkmark = card.querySelector('.persona-checkmark') as HTMLElement;
    if (checkmark) checkmark.style.display = 'block';

    // Parse and store selection
    const personaData = JSON.parse(card.dataset.persona || '{}');
    const personaId = card.dataset.personaId;
    
    // Get full persona object
    this.selectedPersona = getAllQuickPersonas().find(p => p.id === personaId) || null;
    
    if (this.selectedPersona) {
      // Store individual selections for 4-part system
      this.selectedVocabulary = this.selectedPersona.vocabulary || null;
      this.selectedRhetoric = this.selectedPersona.rhetoricMove || null;
      this.selectedLength = this.selectedPersona.lengthPacing || null;
      
      // Update UI
      this.updateSelectionSummary(container);
      this.enableGenerateButton(container);
      
      // Show persona details
      const detailsSection = container.querySelector('.selected-persona-details') as HTMLElement;
      if (detailsSection) {
        detailsSection.style.display = 'block';
      }
      
      logger.info('Persona selected:', this.selectedPersona.name);
    }
  }

  private updateSelectionSummary(container: HTMLElement): void {
    const detailsEl = container.querySelector('.config-details');
    if (detailsEl && this.selectedPersona) {
      const vocab = getAllVocabularyStyles().find(v => v.id === this.selectedVocabulary);
      const rhetoric = RHETORICAL_MOVES.find(r => r.id === this.selectedRhetoric);
      const length = getAllLengthPacingStyles().find(l => l.id === this.selectedLength);
      
      detailsEl.innerHTML = `
        <div class="config-item">
          <span class="config-label">Persona:</span>
          <span class="config-value">${this.selectedPersona.emoji} ${this.selectedPersona.name}</span>
        </div>
        <div class="config-item">
          <span class="config-label">Vocabulary:</span>
          <span class="config-value">${vocab?.label || 'Standard'}</span>
        </div>
        <div class="config-item">
          <span class="config-label">Rhetoric:</span>
          <span class="config-value">${rhetoric?.name || 'Balanced'}</span>
        </div>
        <div class="config-item">
          <span class="config-label">Length:</span>
          <span class="config-value">${length?.label || 'Normal'}</span>
        </div>
      `;
    }
  }

  private enableGenerateButton(container: HTMLElement): void {
    const generateBtn = container.querySelector('.generate-reply-btn') as HTMLButtonElement;
    if (generateBtn && this.selectedPersona) {
      generateBtn.disabled = false;
      generateBtn.innerHTML = `
        <span class="btn-icon">✨</span>
        <span class="btn-text">Generate as ${this.selectedPersona.emoji} ${this.selectedPersona.name}</span>
      `;
      generateBtn.classList.add('ready-pulse');
    }
  }

  private async handleGenerate(container: HTMLElement): Promise<void> {
    if (!this.selectedPersona) {
      UIStateManager.showError(
        container.querySelector('.generate-reply-btn'),
        'Please select a persona first'
      );
      return;
    }

    const generateBtn = container.querySelector('.generate-reply-btn') as HTMLButtonElement;
    const replyArea = container.querySelector('.generated-reply-area') as HTMLElement;
    
    try {
      // Show loading state
      UIStateManager.setLoading(generateBtn, true, {
        customText: 'Generating reply...',
        animationType: 'pulse'
      });

      // Build configuration
      const config: SelectionResult = {
        template: { id: this.selectedPersona.id, name: this.selectedPersona.name, emoji: this.selectedPersona.emoji, prompt: '', description: this.selectedPersona.description, category: 'personas' } as any,
        tone: { id: this.selectedPersona.personality, name: this.selectedPersona.personality } as any,
        combinedPrompt: '',
        temperature: 0.7,
        tabType: 'personas',
        personaConfig: {
          personality: this.selectedPersona.personality || 'balanced',
          vocabulary: this.selectedVocabulary || 'standard',
          rhetoricMove: this.selectedRhetoric || 'balanced',
          lengthPacing: this.selectedLength || 'normal',
          systemPrompt: this.selectedPersona.systemPrompt || ''
        }
      };

      // Generate reply using TabManager
      let reply: string;
      if (this.tabManager) {
        reply = await this.tabManager.generateReply(config);
      } else {
        // Fallback to direct message bridge
        const context = this.getTweetContext();
        reply = await MessageBridge.generateReply(config, context);
      }

      this.currentReply = reply;

      // Display the reply
      UIStateManager.displayReply(replyArea, reply, {
        showCopyButton: true,
        showRegenerateButton: true,
        onCopy: () => this.trackUsage('copy'),
        onRegenerate: () => this.handleRegenerate(container)
      });

      // Show secondary actions
      const secondaryActions = container.querySelector('.secondary-actions') as HTMLElement;
      if (secondaryActions) {
        secondaryActions.style.display = 'flex';
      }

      // Show success toast
      UIStateManager.showToast('Reply generated successfully!', 'success');
      
      // Track successful generation
      this.trackUsage('generate');

    } catch (error) {
      logger.error('Failed to generate reply:', error);
      UIStateManager.showError(
        generateBtn,
        error instanceof Error ? error.message : 'Failed to generate reply'
      );
    } finally {
      // Reset loading state
      UIStateManager.setLoading(generateBtn, false);
      generateBtn.classList.remove('ready-pulse');
    }
  }

  private async handleRegenerate(container: HTMLElement): Promise<void> {
    if (!this.selectedPersona) return;
    
    // Clear current reply
    const replyArea = container.querySelector('.generated-reply-area') as HTMLElement;
    if (replyArea) {
      replyArea.innerHTML = '<div class="regenerating">Regenerating...</div>';
    }
    
    // Generate again
    await this.handleGenerate(container);
  }

  private async handleSaveToArsenal(container: HTMLElement): Promise<void> {
    if (!this.currentReply || !this.selectedPersona) {
      UIStateManager.showError(
        container.querySelector('.save-to-arsenal-btn'),
        'No reply to save'
      );
      return;
    }

    const saveBtn = container.querySelector('.save-to-arsenal-btn') as HTMLButtonElement;
    
    try {
      UIStateManager.setLoading(saveBtn, true, {
        customText: 'Saving...',
        animationType: 'fade'
      });

      // Determine category based on persona
      const category = this.detectCategory(this.selectedPersona.personality || 'general');
      
      // Save to arsenal
      if (this.tabManager) {
        await this.tabManager.saveArsenalReply({
          text: this.currentReply,
          category,
          metadata: {
            persona: this.selectedPersona.name,
            generatedAt: new Date().toISOString()
          }
        });
      }

      UIStateManager.showSuccess(saveBtn, 'Saved to Arsenal!');
      
      // Disable save button to prevent duplicates
      saveBtn.disabled = true;
      
    } catch (error) {
      logger.error('Failed to save to arsenal:', error);
      UIStateManager.showError(saveBtn, 'Failed to save');
    } finally {
      UIStateManager.setLoading(saveBtn, false);
    }
  }

  private detectCategory(personality: string): string {
    const categoryMap: Record<string, string> = {
      professional: 'professional',
      thoughtful: 'professional',
      analytical: 'professional',
      teacher: 'professional',
      friendly: 'friendly',
      supportive: 'friendly',
      helpful: 'friendly',
      enthusiastic: 'friendly',
      humorous: 'humorous',
      witty: 'humorous',
      sarcastic: 'humorous',
      playful: 'humorous',
      bold: 'spicy',
      controversial: 'spicy',
      provocative: 'spicy',
      critical: 'spicy',
      creative: 'creative',
      philosophical: 'creative',
      mystical: 'creative',
      zen: 'creative'
    };
    
    return categoryMap[personality.toLowerCase()] || 'general';
  }

  private attachKeyboardShortcuts(container: HTMLElement): void {
    // Quick select first 9 personas with number keys
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        const cards = container.querySelectorAll('.persona-card');
        if (cards[index]) {
          (cards[index] as HTMLElement).click();
          e.preventDefault();
        }
      }
      
      // Enter to generate when persona selected
      if (e.key === 'Enter' && this.selectedPersona) {
        const generateBtn = container.querySelector('.generate-reply-btn') as HTMLButtonElement;
        if (generateBtn && !generateBtn.disabled) {
          generateBtn.click();
          e.preventDefault();
        }
      }
    });
  }

  private getTweetContext(): any {
    // Get tweet context from DOM - simplified version
    try {
      const tweetText = document.querySelector('[data-testid="tweetText"]')?.textContent || '';
      const authorHandle = document.querySelector('[data-testid="User-Name"]')?.textContent || '';
      
      return {
        tweetText,
        authorHandle,
        isReply: true,
        threadContext: []
      };
    } catch (error) {
      logger.warn('Could not get tweet context:', error);
      return {
        tweetText: '',
        authorHandle: '',
        isReply: false,
        threadContext: []
      };
    }
  }

  private trackUsage(action: string): void {
    if (this.selectedPersona) {
      logger.info(`Persona usage tracked: ${this.selectedPersona.name} - ${action}`);
      // Track usage for smart defaults
      // This would normally send to analytics
    }
  }

  async onShow(): Promise<void> {
    logger.info('PersonasTab shown');
  }

  onHide(): void {
    // Clear any temporary state if needed
  }

  destroy(): void {
    this.selectedPersona = null;
    this.selectedVocabulary = null;
    this.selectedRhetoric = null;
    this.selectedLength = null;
    this.currentReply = null;
  }
}
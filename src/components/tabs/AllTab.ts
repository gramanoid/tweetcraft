/**
 * AllTab Component - 4-Part Selection System
 * Allows users to select from all 4 categories: Personality, Vocabulary, Rhetoric, Length
 * Fully wired with TabManager for reply generation
 */

import { TabComponent, TabManager } from './TabManager';
import { PERSONALITIES } from '../../config/personalities';
import { getAllVocabularyStyles } from '../../config/vocabulary';
import { getAllRhetoricalMoves } from '../../config/rhetoric';
import { getAllLengthPacingStyles } from '../../config/lengthPacing';
import { SelectionResult } from '@/content/unifiedSelector';
import { logger } from '@/utils/logger';
import UIStateManager from '@/services/uiStateManager';

export class AllTab implements TabComponent {
  private selectedPersonality: string = '';
  private selectedVocabulary: string = '';
  private selectedRhetoric: string = '';
  private selectedLength: string = '';
  private isGenerating: boolean = false;
  private selectionCounts = {
    personality: 0,
    vocabulary: 0,
    rhetoric: 0,
    length: 0
  };

  constructor(
    private onSelectCallback: ((result: SelectionResult) => void) | null,
    private tabManager: TabManager
  ) {}

  render(): string {
    const completedSections = this.getCompletedSectionsCount();
    const progressPercentage = (completedSections / 4) * 100;
    
    return `
      <div class="selector-content all-view">
        <!-- Progress Bar -->
        <div class="all-tab-progress">
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${progressPercentage}%"></div>
          </div>
          <div class="progress-text">
            ${completedSections}/4 sections selected
            ${completedSections === 4 ? '<span class="ready-badge">✨ Ready!</span>' : ''}
          </div>
        </div>

        <!-- Selection Sections -->
        <div class="all-tab-sections">
          ${this.renderPersonalitySection()}
          ${this.renderVocabularySection()}
          ${this.renderRhetoricSection()}
          ${this.renderLengthSection()}
        </div>

        <!-- Selected Options Summary -->
        <div class="all-tab-summary" style="display: none;">
          <h4>Selected Options:</h4>
          <div class="selected-options-list"></div>
        </div>

        <!-- Reply Area -->
        <div class="all-tab-reply-area" style="display: none;">
          <!-- Generated reply will appear here -->
        </div>

        <!-- Action Buttons -->
        <div class="all-tab-actions">
          <button class="clear-all-btn" style="display: none;">
            🔄 Clear All
          </button>
          <button class="save-to-favorites-btn" style="display: none;">
            ⭐ Save Combo
          </button>
          <button class="generate-with-all-btn" disabled>
            Select all 4 options to generate
          </button>
        </div>
      </div>
    `;
  }

  private renderPersonalitySection(): string {
    const hasSelection = this.selectedPersonality !== '';
    return `
      <div class="all-section personality-section ${hasSelection ? 'has-selection' : ''}">
        <h3 class="section-title">
          🎭 Personality 
          ${hasSelection ? '<span class="section-check">✓</span>' : ''}
          <span class="section-count">${PERSONALITIES.length} options</span>
        </h3>
        <div class="options-grid personality-grid">
          ${PERSONALITIES.map((p: any) => `
            <div class="option-card personality-card" 
                 data-personality="${p.id}"
                 data-name="${p.label}"
                 title="${p.description || p.label}">
              <span class="option-emoji">${p.emoji}</span>
              <span class="option-label">${p.label}</span>
              <span class="option-check" style="display: none;">✓</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderVocabularySection(): string {
    const vocabularies = getAllVocabularyStyles();
    const hasSelection = this.selectedVocabulary !== '';
    return `
      <div class="all-section vocabulary-section ${hasSelection ? 'has-selection' : ''}">
        <h3 class="section-title">
          📚 Vocabulary
          ${hasSelection ? '<span class="section-check">✓</span>' : ''}
          <span class="section-count">${vocabularies.length} styles</span>
        </h3>
        <div class="options-grid vocabulary-grid">
          ${vocabularies.map((v: any) => `
            <div class="option-card vocabulary-card" 
                 data-vocabulary="${v.id}"
                 data-name="${v.label}"
                 title="${v.description || v.label}">
              <span class="option-emoji">${v.emoji}</span>
              <span class="option-label">${v.label}</span>
              <span class="option-check" style="display: none;">✓</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderRhetoricSection(): string {
    const rhetorics = getAllRhetoricalMoves();
    const hasSelection = this.selectedRhetoric !== '';
    return `
      <div class="all-section rhetoric-section ${hasSelection ? 'has-selection' : ''}">
        <h3 class="section-title">
          🎯 Rhetoric
          ${hasSelection ? '<span class="section-check">✓</span>' : ''}
          <span class="section-count">${rhetorics.length} approaches</span>
        </h3>
        <div class="options-grid rhetoric-grid">
          ${rhetorics.map((r: any) => `
            <div class="option-card rhetoric-card" 
                 data-rhetoric="${r.id}"
                 data-name="${r.label}"
                 title="${r.description || r.label}">
              <span class="option-emoji">${r.emoji}</span>
              <span class="option-label">${r.label}</span>
              <span class="option-check" style="display: none;">✓</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderLengthSection(): string {
    const lengths = getAllLengthPacingStyles();
    const hasSelection = this.selectedLength !== '';
    return `
      <div class="all-section length-section ${hasSelection ? 'has-selection' : ''}">
        <h3 class="section-title">
          📏 Length & Pacing
          ${hasSelection ? '<span class="section-check">✓</span>' : ''}
          <span class="section-count">${lengths.length} styles</span>
        </h3>
        <div class="options-grid length-grid">
          ${lengths.map((l: any) => `
            <div class="option-card length-card" 
                 data-length="${l.id}"
                 data-name="${l.label}"
                 title="${l.description || l.label}">
              <span class="option-emoji">${l.emoji}</span>
              <span class="option-label">${l.label}</span>
              <span class="option-check" style="display: none;">✓</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  attachEventListeners(container: HTMLElement): void {
    // Handle personality selection
    container.querySelectorAll('.personality-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (this.isGenerating) return;
        this.handlePersonalitySelection(container, card as HTMLElement);
      });
    });

    // Handle vocabulary selection
    container.querySelectorAll('.vocabulary-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (this.isGenerating) return;
        this.handleVocabularySelection(container, card as HTMLElement);
      });
    });

    // Handle rhetoric selection
    container.querySelectorAll('.rhetoric-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (this.isGenerating) return;
        this.handleRhetoricSelection(container, card as HTMLElement);
      });
    });

    // Handle length selection
    container.querySelectorAll('.length-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (this.isGenerating) return;
        this.handleLengthSelection(container, card as HTMLElement);
      });
    });

    // Handle generate button
    const generateBtn = container.querySelector('.generate-with-all-btn') as HTMLButtonElement;
    if (generateBtn) {
      generateBtn.addEventListener('click', async () => {
        if (!this.isGenerating && this.areAllOptionsSelected()) {
          await this.handleGenerate(container);
        }
      });
    }

    // Handle clear all button
    const clearBtn = container.querySelector('.clear-all-btn') as HTMLButtonElement;
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (!this.isGenerating) {
          this.clearAllSelections(container);
        }
      });
    }

    // Handle save to favorites button
    const saveBtn = container.querySelector('.save-to-favorites-btn') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        if (!this.isGenerating && this.areAllOptionsSelected()) {
          await this.saveToFavorites(container);
        }
      });
    }

    // Add keyboard shortcuts
    this.attachKeyboardShortcuts(container);
  }

  private handlePersonalitySelection(container: HTMLElement, card: HTMLElement): void {
    // Clear previous selection
    container.querySelectorAll('.personality-card').forEach(c => {
      c.classList.remove('selected');
      const check = c.querySelector('.option-check') as HTMLElement;
      if (check) check.style.display = 'none';
    });

    // Set new selection
    card.classList.add('selected');
    const check = card.querySelector('.option-check') as HTMLElement;
    if (check) check.style.display = 'inline';
    
    this.selectedPersonality = card.getAttribute('data-personality') || '';
    this.selectionCounts.personality = 1;
    
    // Update section header
    const section = container.querySelector('.personality-section');
    if (section) {
      section.classList.add('has-selection');
    }

    // Visual feedback
    card.style.animation = 'pulse 0.3s ease-out';
    
    this.updateUI(container);
    logger.info('AllTab: Selected personality', this.selectedPersonality);
  }

  private handleVocabularySelection(container: HTMLElement, card: HTMLElement): void {
    // Clear previous selection
    container.querySelectorAll('.vocabulary-card').forEach(c => {
      c.classList.remove('selected');
      const check = c.querySelector('.option-check') as HTMLElement;
      if (check) check.style.display = 'none';
    });

    // Set new selection
    card.classList.add('selected');
    const check = card.querySelector('.option-check') as HTMLElement;
    if (check) check.style.display = 'inline';
    
    this.selectedVocabulary = card.getAttribute('data-vocabulary') || '';
    this.selectionCounts.vocabulary = 1;
    
    // Update section header
    const section = container.querySelector('.vocabulary-section');
    if (section) {
      section.classList.add('has-selection');
    }

    // Visual feedback
    card.style.animation = 'pulse 0.3s ease-out';
    
    this.updateUI(container);
    logger.info('AllTab: Selected vocabulary', this.selectedVocabulary);
  }

  private handleRhetoricSelection(container: HTMLElement, card: HTMLElement): void {
    // Clear previous selection
    container.querySelectorAll('.rhetoric-card').forEach(c => {
      c.classList.remove('selected');
      const check = c.querySelector('.option-check') as HTMLElement;
      if (check) check.style.display = 'none';
    });

    // Set new selection
    card.classList.add('selected');
    const check = card.querySelector('.option-check') as HTMLElement;
    if (check) check.style.display = 'inline';
    
    this.selectedRhetoric = card.getAttribute('data-rhetoric') || '';
    this.selectionCounts.rhetoric = 1;
    
    // Update section header
    const section = container.querySelector('.rhetoric-section');
    if (section) {
      section.classList.add('has-selection');
    }

    // Visual feedback
    card.style.animation = 'pulse 0.3s ease-out';
    
    this.updateUI(container);
    logger.info('AllTab: Selected rhetoric', this.selectedRhetoric);
  }

  private handleLengthSelection(container: HTMLElement, card: HTMLElement): void {
    // Clear previous selection
    container.querySelectorAll('.length-card').forEach(c => {
      c.classList.remove('selected');
      const check = c.querySelector('.option-check') as HTMLElement;
      if (check) check.style.display = 'none';
    });

    // Set new selection
    card.classList.add('selected');
    const check = card.querySelector('.option-check') as HTMLElement;
    if (check) check.style.display = 'inline';
    
    this.selectedLength = card.getAttribute('data-length') || '';
    this.selectionCounts.length = 1;
    
    // Update section header
    const section = container.querySelector('.length-section');
    if (section) {
      section.classList.add('has-selection');
    }

    // Visual feedback
    card.style.animation = 'pulse 0.3s ease-out';
    
    this.updateUI(container);
    logger.info('AllTab: Selected length', this.selectedLength);
  }

  private async handleGenerate(container: HTMLElement): Promise<void> {
    if (!this.areAllOptionsSelected()) {
      UIStateManager.showError(
        container.querySelector('.generate-with-all-btn'),
        'Please select all 4 options first'
      );
      return;
    }

    this.isGenerating = true;
    const generateBtn = container.querySelector('.generate-with-all-btn') as HTMLButtonElement;
    const replyArea = container.querySelector('.all-tab-reply-area') as HTMLElement;

    try {
      // Show loading state
      UIStateManager.setLoading(generateBtn, true, {
        customText: 'Generating with your 4-part combo...',
        animationType: 'spin'
      });

      // Build configuration
      const personality = PERSONALITIES.find(p => p.id === this.selectedPersonality);
      const vocabulary = getAllVocabularyStyles().find(v => v.id === this.selectedVocabulary);
      const rhetoric = getAllRhetoricalMoves().find(r => r.id === this.selectedRhetoric);
      const length = getAllLengthPacingStyles().find(l => l.id === this.selectedLength);

      if (!personality || !vocabulary || !rhetoric || !length) {
        throw new Error('Invalid selection configuration');
      }

      const config: SelectionResult = {
        template: { 
          id: 'all', 
          name: 'Custom 4-Part', 
          emoji: '🎯', 
          prompt: '',
          description: 'Custom 4-part combination',
          category: 'custom'
        },
        tone: { id: personality.id, name: personality.label } as any,
        combinedPrompt: '',
        personality: personality.label,
        vocabulary: vocabulary.label,
        rhetoric: rhetoric.name,
        lengthPacing: length.label,
        tabType: 'all',
        allTabConfig: {
          personality: personality.id,
          vocabulary: vocabulary.id,
          rhetoric: rhetoric.id,
          lengthPacing: length.id
        },
        temperature: 0.7
      };

      logger.info('AllTab: Generating with config', config);

      // Generate reply using TabManager
      const reply = await this.tabManager.generateReply(config);

      // Show the reply
      if (replyArea) {
        replyArea.style.display = 'block';
        UIStateManager.displayReply(replyArea, reply, {
          showCopyButton: true,
          showRegenerateButton: true,
          onCopy: () => {
            logger.info('AllTab: Reply copied to clipboard');
            UIStateManager.showToast('Reply copied!', 'success');
          },
          onRegenerate: async () => {
            logger.info('AllTab: Regenerating reply');
            await this.handleGenerate(container);
          }
        });
      }

      // Show success message
      UIStateManager.showSuccess(generateBtn, 'Reply generated successfully!');

      // Track usage for learning
      this.trackUsage();

    } catch (error) {
      logger.error('AllTab: Failed to generate reply', error);
      UIStateManager.showError(
        generateBtn,
        `Failed to generate: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      this.isGenerating = false;
      UIStateManager.setLoading(generateBtn, false);
    }
  }

  private async saveToFavorites(container: HTMLElement): Promise<void> {
    if (!this.areAllOptionsSelected()) return;

    const saveBtn = container.querySelector('.save-to-favorites-btn') as HTMLButtonElement;

    try {
      UIStateManager.setLoading(saveBtn, true, {
        customText: 'Saving...',
        animationType: 'pulse'
      });

      // Get selected options
      const personality = PERSONALITIES.find(p => p.id === this.selectedPersonality);
      const vocabulary = getAllVocabularyStyles().find(v => v.id === this.selectedVocabulary);
      const rhetoric = getAllRhetoricalMoves().find(r => r.id === this.selectedRhetoric);
      const length = getAllLengthPacingStyles().find(l => l.id === this.selectedLength);

      if (!personality || !vocabulary || !rhetoric || !length) {
        throw new Error('Invalid selection');
      }

      // Create favorite configuration
      const favoriteConfig = {
        name: `${personality.label} + ${vocabulary.label}`,
        personality: personality.id,
        vocabulary: vocabulary.id,
        rhetoric: rhetoric.id,
        lengthPacing: length.id,
        timestamp: Date.now()
      };

      // Save to storage
      const favorites = JSON.parse(localStorage.getItem('tweetcraft_favorites') || '[]');
      favorites.unshift(favoriteConfig);
      
      // Keep only last 20 favorites
      if (favorites.length > 20) {
        favorites.length = 20;
      }
      
      localStorage.setItem('tweetcraft_favorites', JSON.stringify(favorites));

      UIStateManager.showSuccess(saveBtn, 'Saved to favorites!');
      logger.info('AllTab: Saved combination to favorites', favoriteConfig);

    } catch (error) {
      logger.error('AllTab: Failed to save to favorites', error);
      UIStateManager.showError(saveBtn, 'Failed to save');
    } finally {
      UIStateManager.setLoading(saveBtn, false);
    }
  }

  private clearAllSelections(container: HTMLElement): void {
    // Clear all selections
    this.selectedPersonality = '';
    this.selectedVocabulary = '';
    this.selectedRhetoric = '';
    this.selectedLength = '';
    
    // Reset counts
    this.selectionCounts = {
      personality: 0,
      vocabulary: 0,
      rhetoric: 0,
      length: 0
    };

    // Clear UI selections
    container.querySelectorAll('.option-card').forEach(card => {
      card.classList.remove('selected');
      const check = card.querySelector('.option-check') as HTMLElement;
      if (check) check.style.display = 'none';
    });

    // Clear section highlights
    container.querySelectorAll('.all-section').forEach(section => {
      section.classList.remove('has-selection');
    });

    // Hide reply area
    const replyArea = container.querySelector('.all-tab-reply-area') as HTMLElement;
    if (replyArea) {
      replyArea.style.display = 'none';
      replyArea.innerHTML = '';
    }

    // Hide summary
    const summary = container.querySelector('.all-tab-summary') as HTMLElement;
    if (summary) {
      summary.style.display = 'none';
    }

    this.updateUI(container);
    UIStateManager.showToast('Selections cleared', 'info');
    logger.info('AllTab: Cleared all selections');
  }

  private updateUI(container: HTMLElement): void {
    const completedSections = this.getCompletedSectionsCount();
    const allSelected = this.areAllOptionsSelected();
    
    // Update progress bar
    const progressBar = container.querySelector('.progress-bar-fill') as HTMLElement;
    if (progressBar) {
      const percentage = (completedSections / 4) * 100;
      progressBar.style.width = `${percentage}%`;
      progressBar.style.background = allSelected 
        ? 'linear-gradient(90deg, #17BF63, #1DA1F2)'
        : 'linear-gradient(90deg, #1DA1F2, #657786)';
    }

    // Update progress text
    const progressText = container.querySelector('.progress-text') as HTMLElement;
    if (progressText) {
      progressText.innerHTML = `
        ${completedSections}/4 sections selected
        ${allSelected ? '<span class="ready-badge">✨ Ready!</span>' : ''}
      `;
    }

    // Update generate button
    const generateBtn = container.querySelector('.generate-with-all-btn') as HTMLButtonElement;
    if (generateBtn) {
      generateBtn.disabled = !allSelected;
      if (allSelected) {
        generateBtn.textContent = '✨ Generate Reply';
        generateBtn.classList.add('ready');
      } else {
        const remaining = 4 - completedSections;
        generateBtn.textContent = remaining === 1 
          ? 'Select 1 more option'
          : `Select ${remaining} more options`;
        generateBtn.classList.remove('ready');
      }
    }

    // Show/hide action buttons
    const clearBtn = container.querySelector('.clear-all-btn') as HTMLElement;
    const saveBtn = container.querySelector('.save-to-favorites-btn') as HTMLElement;
    
    if (clearBtn) {
      clearBtn.style.display = completedSections > 0 ? 'inline-block' : 'none';
    }
    
    if (saveBtn) {
      saveBtn.style.display = allSelected ? 'inline-block' : 'none';
    }

    // Update summary
    if (allSelected) {
      this.updateSummary(container);
    }
  }

  private updateSummary(container: HTMLElement): void {
    const summary = container.querySelector('.all-tab-summary') as HTMLElement;
    if (!summary) return;

    const personality = PERSONALITIES.find(p => p.id === this.selectedPersonality);
    const vocabulary = getAllVocabularyStyles().find(v => v.id === this.selectedVocabulary);
    const rhetoric = getAllRhetoricalMoves().find(r => r.id === this.selectedRhetoric);
    const length = getAllLengthPacingStyles().find(l => l.id === this.selectedLength);

    const optionsList = summary.querySelector('.selected-options-list') as HTMLElement;
    if (optionsList) {
      optionsList.innerHTML = `
        <div class="summary-item">
          <span class="summary-label">🎭 Personality:</span>
          <span class="summary-value">${personality?.emoji} ${personality?.label}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">📚 Vocabulary:</span>
          <span class="summary-value">${vocabulary?.emoji} ${vocabulary?.label}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">🎯 Rhetoric:</span>
          <span class="summary-value">${rhetoric?.emoji} ${rhetoric?.name}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">📏 Length:</span>
          <span class="summary-value">${length?.emoji} ${length?.label}</span>
        </div>
      `;
    }

    summary.style.display = 'block';
    summary.style.animation = 'fadeIn 0.3s ease-out';
  }

  private attachKeyboardShortcuts(container: HTMLElement): void {
    // Add number key shortcuts for quick selection
    document.addEventListener('keydown', (e) => {
      if (!container.closest('.all-view')) return;
      
      // Number keys 1-9 for quick personality selection
      if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.altKey) {
        const index = parseInt(e.key) - 1;
        const cards = container.querySelectorAll('.personality-card');
        if (cards[index]) {
          (cards[index] as HTMLElement).click();
        }
      }

      // Space bar to generate when ready
      if (e.key === ' ' && this.areAllOptionsSelected() && !this.isGenerating) {
        e.preventDefault();
        const generateBtn = container.querySelector('.generate-with-all-btn') as HTMLButtonElement;
        if (generateBtn && !generateBtn.disabled) {
          generateBtn.click();
        }
      }

      // Escape to clear all
      if (e.key === 'Escape') {
        this.clearAllSelections(container);
      }
    });
  }

  private getCompletedSectionsCount(): number {
    let count = 0;
    if (this.selectedPersonality) count++;
    if (this.selectedVocabulary) count++;
    if (this.selectedRhetoric) count++;
    if (this.selectedLength) count++;
    return count;
  }

  private areAllOptionsSelected(): boolean {
    return !!(
      this.selectedPersonality &&
      this.selectedVocabulary &&
      this.selectedRhetoric &&
      this.selectedLength
    );
  }

  private trackUsage(): void {
    // Track usage for smart defaults learning
    try {
      const usageData = {
        personality: this.selectedPersonality,
        vocabulary: this.selectedVocabulary,
        rhetoric: this.selectedRhetoric,
        lengthPacing: this.selectedLength,
        timestamp: Date.now(),
        source: 'all-tab'
      };

      const usage = JSON.parse(localStorage.getItem('tweetcraft_usage') || '[]');
      usage.push(usageData);
      
      // Keep only last 100 entries
      if (usage.length > 100) {
        usage.splice(0, usage.length - 100);
      }
      
      localStorage.setItem('tweetcraft_usage', JSON.stringify(usage));
      logger.info('AllTab: Tracked usage', usageData);
    } catch (error) {
      logger.warn('AllTab: Failed to track usage', error);
    }
  }

  async onShow(): Promise<void> {
    // Restore previous selections if any
    try {
      const lastSelection = localStorage.getItem('tweetcraft_all_tab_selection');
      if (lastSelection) {
        const selection = JSON.parse(lastSelection);
        this.selectedPersonality = selection.personality || '';
        this.selectedVocabulary = selection.vocabulary || '';
        this.selectedRhetoric = selection.rhetoric || '';
        this.selectedLength = selection.length || '';
        
        // Update UI to show restored selections
        const container = document.querySelector('.all-view') as HTMLElement;
        if (container) {
          // Restore visual selections
          if (this.selectedPersonality) {
            const card = container.querySelector(`[data-personality="${this.selectedPersonality}"]`);
            if (card) {
              card.classList.add('selected');
              const check = card.querySelector('.option-check') as HTMLElement;
              if (check) check.style.display = 'inline';
            }
          }
          
          // Repeat for other sections...
          this.updateUI(container);
        }
      }
    } catch (error) {
      logger.warn('AllTab: Failed to restore selections', error);
    }
  }

  onHide(): void {
    // Save current selections
    try {
      const selection = {
        personality: this.selectedPersonality,
        vocabulary: this.selectedVocabulary,
        rhetoric: this.selectedRhetoric,
        length: this.selectedLength
      };
      localStorage.setItem('tweetcraft_all_tab_selection', JSON.stringify(selection));
    } catch (error) {
      logger.warn('AllTab: Failed to save selections', error);
    }
  }

  destroy(): void {
    // Clean up any resources
    this.selectedPersonality = '';
    this.selectedVocabulary = '';
    this.selectedRhetoric = '';
    this.selectedLength = '';
    this.isGenerating = false;
  }
}
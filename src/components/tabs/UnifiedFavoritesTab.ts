/**
 * UnifiedFavoritesTab Component - Save and reuse favorite template combinations
 * Fully wired with TabManager for applying templates and generating replies
 */

import { TabComponent, TabManager } from './TabManager';
import { SelectionResult } from '@/content/unifiedSelector';
import { PERSONALITIES } from '../../config/personalities';
import { getAllVocabularyStyles } from '../../config/vocabulary';
import { getAllRhetoricalMoves } from '../../config/rhetoric';
import { getAllLengthPacingStyles } from '../../config/lengthPacing';
import { logger } from '@/utils/logger';
import UIStateManager from '@/services/uiStateManager';
import './UnifiedFavoritesTab.scss';

interface FavoriteTemplate {
  id: string;
  type: 'preset' | 'custom';
  config: {
    // Preset fields (from AllTab)
    personality?: string;
    vocabulary?: string;
    rhetoric?: string;
    lengthPacing?: string;
    // Custom fields
    style?: string;
    tone?: string;
    length?: string;
  };
  name?: string;
  createdAt: string;
  usageCount: number;
}

class UnifiedFavoritesTab implements TabComponent {
  private container: HTMLElement | null = null;
  private favorites: FavoriteTemplate[] = [];
  private selectedFavorite: FavoriteTemplate | null = null;
  private isCreatingCustom: boolean = false;
  private customConfig = {
    style: '',
    tone: '',
    length: ''
  };
  private isGenerating: boolean = false;

  constructor(private tabManager: TabManager) {}

  render(): string {
    // Load favorites from storage
    this.loadFavorites();

    let html = '<div class="unified-favorites-container">';
    
    // Header section with toggle
    html += this.createHeaderHTML();
    
    // Content area (dynamic based on mode)
    html += '<div class="content-area" id="favorites-content">';
    
    if (this.isCreatingCustom) {
      html += this.renderCustomCreatorHTML();
    } else {
      html += this.renderFavoritesGridHTML();
    }
    
    html += '</div>';

    // Reply area for generated content
    html += `
      <div class="favorites-reply-area" style="display: none;">
        <!-- Generated reply will appear here -->
      </div>
    `;

    // Global actions section
    html += this.createGlobalActionsHTML();
    
    html += '</div>';

    return html;
  }

  attachEventListeners(container: HTMLElement): void {
    this.container = container;
    
    // Attach mode toggle listeners
    const backButton = container.querySelector('.btn-back');
    if (backButton) {
      backButton.addEventListener('click', () => this.toggleMode());
    }
    
    const createButton = container.querySelector('.btn-create-custom');
    if (createButton) {
      createButton.addEventListener('click', () => this.toggleMode());
    }
    
    // Attach listeners based on current mode
    if (this.isCreatingCustom) {
      this.attachCustomCreatorListeners();
    } else {
      this.attachFavoritesGridListeners();
    }
    
    // Global action listeners
    const importButton = container.querySelector('.btn-import');
    if (importButton) {
      importButton.addEventListener('click', () => this.handleImport());
    }
    
    const exportButton = container.querySelector('.btn-export');
    if (exportButton) {
      exportButton.addEventListener('click', () => this.handleExport());
    }
  }

  private createHeaderHTML(): string {
    let html = '<div class="unified-header">';
    
    html += '<div class="header-left">';
    
    if (this.isCreatingCustom) {
      // Back button when in custom creation mode
      html += '<button class="btn-back">← Back to Templates</button>';
      html += '<h3>Create Custom Template</h3>';
    } else {
      // Normal favorites view
      html += '<h3>🌟 Saved Templates</h3>';
      html += `<span class="template-count">${this.favorites.length} template${this.favorites.length !== 1 ? 's' : ''}</span>`;
    }
    
    html += '</div>';
    
    html += '<div class="header-right">';
    
    if (!this.isCreatingCustom) {
      // Create custom button in normal view
      html += '<button class="btn-create-custom">✨ Create Custom</button>';
    }
    
    html += '</div>';
    html += '</div>';
    
    return html;
  }

  private renderFavoritesGridHTML(): string {
    let html = '';
    
    // Search bar
    html += this.createSearchBarHTML();

    // Filter buttons
    html += this.createFilterButtonsHTML();

    // Favorites grid
    html += '<div class="favorites-grid" id="favorites-grid">';
    
    if (this.favorites.length === 0) {
      html += this.renderEmptyState();
    } else {
      html += this.renderFavoriteCardsHTML();
    }
    
    html += '</div>';
    
    return html;
  }

  private renderEmptyState(): string {
    // Check if we have the AllTab selection saved
    const allTabSelection = localStorage.getItem('tweetcraft_all_tab_selection');
    const hasRecentSelection = allTabSelection && JSON.parse(allTabSelection).personality;

    return `
      <div class="empty-state">
        <span class="empty-icon">⭐</span>
        <h4>No saved templates yet</h4>
        <p>Save your favorite combinations from the All tab or create a custom template</p>
        ${hasRecentSelection ? 
          '<button class="btn-save-recent">💾 Save Recent Selection from All Tab</button>' :
          '<button class="btn-create-first">✨ Create Your First Template</button>'
        }
      </div>
    `;
  }

  private renderFavoriteCardsHTML(): string {
    let html = '';

    // Sort by usage count (most used first)
    const sorted = [...this.favorites].sort((a, b) => b.usageCount - a.usageCount);

    sorted.forEach((favorite, index) => {
      const isPopular = index < 3 && favorite.usageCount > 0;
      html += this.createFavoriteCardHTML(favorite, isPopular);
    });

    return html;
  }

  private createFavoriteCardHTML(favorite: FavoriteTemplate, isPopular: boolean = false): string {
    const isSelected = this.selectedFavorite?.id === favorite.id;
    const name = favorite.name || this.generateTemplateName(favorite);
    
    let html = `
      <div class="favorite-card ${isSelected ? 'selected' : ''} ${isPopular ? 'popular' : ''}" 
           data-id="${favorite.id}">
        <div class="card-header">
          <div class="title-row">
            <h4>${name}</h4>
            ${isPopular ? '<span class="badge badge-popular">🔥 Popular</span>' : ''}
            <span class="badge badge-${favorite.type}">
              ${favorite.type === 'custom' ? '✨ Custom' : '📦 Preset'}
            </span>
          </div>
        </div>
        
        <div class="card-content">
    `;

    if (favorite.type === 'preset') {
      if (favorite.config.personality) {
        const personality = PERSONALITIES.find(p => p.id === favorite.config.personality);
        html += `<div class="config-item">🎭 ${personality?.label || favorite.config.personality}</div>`;
      }
      if (favorite.config.vocabulary) {
        const vocab = getAllVocabularyStyles().find(v => v.id === favorite.config.vocabulary);
        html += `<div class="config-item">📚 ${vocab?.label || favorite.config.vocabulary}</div>`;
      }
      if (favorite.config.rhetoric) {
        const rhetoric = getAllRhetoricalMoves().find(r => r.id === favorite.config.rhetoric);
        html += `<div class="config-item">🎯 ${rhetoric?.name || favorite.config.rhetoric}</div>`;
      }
      if (favorite.config.lengthPacing) {
        const length = getAllLengthPacingStyles().find(l => l.id === favorite.config.lengthPacing);
        html += `<div class="config-item">📏 ${length?.label || favorite.config.lengthPacing}</div>`;
      }
    } else {
      if (favorite.config.style) {
        html += `<div class="config-item">✨ ${favorite.config.style}</div>`;
      }
      if (favorite.config.tone) {
        html += `<div class="config-item">🎵 ${favorite.config.tone}</div>`;
      }
      if (favorite.config.length) {
        html += `<div class="config-item">📏 ${favorite.config.length}</div>`;
      }
    }
    
    html += `
        </div>
        
        <div class="card-footer">
          <div class="card-metadata">
            <span class="usage-count">Used ${favorite.usageCount} time${favorite.usageCount !== 1 ? 's' : ''}</span>
            <span class="created-date">${new Date(favorite.createdAt).toLocaleDateString()}</span>
          </div>
          <div class="card-actions">
            <button class="btn-use primary" data-id="${favorite.id}">⚡ Generate</button>
            <button class="btn-apply" data-id="${favorite.id}" title="Apply to All Tab">📌</button>
            <button class="btn-edit" data-id="${favorite.id}" title="Edit name">✏️</button>
            <button class="btn-delete" data-id="${favorite.id}" title="Delete">🗑️</button>
          </div>
        </div>
      </div>
    `;

    return html;
  }

  private attachFavoritesGridListeners(): void {
    if (!this.container) return;

    // Search input listener
    const searchInput = this.container.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.filterFavorites(target.value);
      });
    }

    // Filter button listeners
    const filterButtons = this.container.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = (btn as HTMLElement).dataset.filter || 'all';
        this.filterByType(filter);
      });
    });

    // Empty state buttons
    const createFirstBtn = this.container.querySelector('.btn-create-first');
    if (createFirstBtn) {
      createFirstBtn.addEventListener('click', () => this.toggleMode());
    }

    const saveRecentBtn = this.container.querySelector('.btn-save-recent');
    if (saveRecentBtn) {
      saveRecentBtn.addEventListener('click', () => this.saveRecentAllTabSelection());
    }

    // Attach card listeners
    this.attachFavoriteCardListeners();
  }

  private attachFavoriteCardListeners(): void {
    if (!this.container) return;

    // Card click listeners (for selection)
    const cards = this.container.querySelectorAll('.favorite-card');
    cards.forEach(card => {
      const cardEl = card as HTMLElement;
      const favoriteId = cardEl.dataset.id;
      const favorite = this.favorites.find(f => f.id === favoriteId);
      
      if (favorite) {
        // Card click to select
        cardEl.addEventListener('click', (e) => {
          // Don't select if clicking on buttons
          if ((e.target as HTMLElement).closest('button')) return;
          this.selectFavorite(favorite);
        });
      }
    });

    // Use/Generate buttons
    const useButtons = this.container.querySelectorAll('.btn-use');
    useButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const favoriteId = (btn as HTMLElement).dataset.id;
        const favorite = this.favorites.find(f => f.id === favoriteId);
        if (favorite) {
          await this.handleUseFavorite(favorite, btn as HTMLElement);
        }
      });
    });

    // Apply buttons (apply to All tab)
    const applyButtons = this.container.querySelectorAll('.btn-apply');
    applyButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const favoriteId = (btn as HTMLElement).dataset.id;
        const favorite = this.favorites.find(f => f.id === favoriteId);
        if (favorite) {
          this.handleApplyToAllTab(favorite);
        }
      });
    });

    // Edit buttons
    const editButtons = this.container.querySelectorAll('.btn-edit');
    editButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const favoriteId = (btn as HTMLElement).dataset.id;
        const favorite = this.favorites.find(f => f.id === favoriteId);
        if (favorite) {
          this.handleEditFavorite(favorite);
        }
      });
    });

    // Delete buttons
    const deleteButtons = this.container.querySelectorAll('.btn-delete');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const favoriteId = (btn as HTMLElement).dataset.id;
        if (favoriteId) {
          this.handleDeleteFavorite(favoriteId);
        }
      });
    });
  }

  private async handleUseFavorite(favorite: FavoriteTemplate, button: HTMLElement): Promise<void> {
    if (this.isGenerating) return;

    this.isGenerating = true;
    const replyArea = this.container?.querySelector('.favorites-reply-area') as HTMLElement;

    try {
      // Show loading state
      UIStateManager.setLoading(button, true, {
        customText: 'Generating...',
        animationType: 'spin'
      });

      // Build configuration based on favorite type
      let config: SelectionResult;

      if (favorite.type === 'preset') {
        // Build from preset (4-part selection)
        const personality = PERSONALITIES.find(p => p.id === favorite.config.personality);
        const vocabulary = getAllVocabularyStyles().find(v => v.id === favorite.config.vocabulary);
        const rhetoric = getAllRhetoricalMoves().find(r => r.id === favorite.config.rhetoric);
        const length = getAllLengthPacingStyles().find(l => l.id === favorite.config.lengthPacing);

        if (!personality || !vocabulary || !rhetoric || !length) {
          throw new Error('Invalid preset configuration');
        }

        config = {
          template: { 
            id: 'favorite-preset',
            name: favorite.name || 'Favorite Preset',
            emoji: '⭐',
            prompt: '',
            description: 'Saved favorite template',
            category: 'favorites'
          },
          tone: { id: personality.id, name: personality.label } as any,
          combinedPrompt: '',
          personality: personality.label,
          vocabulary: vocabulary.label,
          rhetoric: rhetoric.name,
          lengthPacing: length.label,
          tabType: 'favorites',
          allTabConfig: {
            personality: personality.id,
            vocabulary: vocabulary.id,
            rhetoric: rhetoric.id,
            lengthPacing: length.id
          },
          temperature: 0.7
        };
      } else {
        // Build from custom template
        config = {
          template: {
            id: 'favorite-custom',
            name: favorite.name || 'Custom Template',
            emoji: '✨',
            prompt: '',
            description: 'Custom saved template',
            category: 'custom'
          },
          tone: { id: 'custom', name: favorite.config.tone || 'Custom' } as any,
          combinedPrompt: '',
          tabType: 'favorites',
          customConfig: {
            style: favorite.config.style || '',
            tone: favorite.config.tone || '',
            length: favorite.config.length || ''
          },
          temperature: 0.8
        };
      }

      logger.info('FavoritesTab: Generating with favorite', { favorite, config });

      // Generate reply using TabManager
      const reply = await this.tabManager.generateReply(config);

      // Update usage count
      favorite.usageCount++;
      this.saveFavorites();
      this.updateUsageCount(favorite);

      // Show the reply
      if (replyArea) {
        replyArea.style.display = 'block';
        UIStateManager.displayReply(replyArea, reply, {
          showCopyButton: true,
          showRegenerateButton: true,
          onCopy: () => {
            logger.info('FavoritesTab: Reply copied');
            UIStateManager.showToast('Reply copied!', 'success');
          },
          onRegenerate: async () => {
            logger.info('FavoritesTab: Regenerating');
            await this.handleUseFavorite(favorite, button);
          }
        });
      }

      // Show success
      UIStateManager.showSuccess(button, 'Generated!');

    } catch (error) {
      logger.error('FavoritesTab: Failed to generate', error);
      UIStateManager.showError(
        button,
        `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      this.isGenerating = false;
      UIStateManager.setLoading(button, false);
    }
  }

  private handleApplyToAllTab(favorite: FavoriteTemplate): void {
    if (favorite.type !== 'preset') {
      UIStateManager.showToast('Custom templates cannot be applied to All tab', 'warning');
      return;
    }

    // Save the configuration to be loaded by AllTab
    const allTabSelection = {
      personality: favorite.config.personality,
      vocabulary: favorite.config.vocabulary,
      rhetoric: favorite.config.rhetoric,
      length: favorite.config.lengthPacing
    };

    localStorage.setItem('tweetcraft_all_tab_selection', JSON.stringify(allTabSelection));
    
    // Switch to All tab
    this.tabManager.switchTab('grid');
    
    UIStateManager.showToast('Template applied to All tab', 'success');
    logger.info('FavoritesTab: Applied template to All tab', allTabSelection);
  }

  private saveRecentAllTabSelection(): void {
    const allTabSelection = localStorage.getItem('tweetcraft_all_tab_selection');
    if (!allTabSelection) {
      UIStateManager.showToast('No recent selection found', 'error');
      return;
    }

    const selection = JSON.parse(allTabSelection);
    if (!selection.personality || !selection.vocabulary || !selection.rhetoric || !selection.length) {
      UIStateManager.showToast('Incomplete selection in All tab', 'error');
      return;
    }

    // Create new favorite from AllTab selection
    const newFavorite: FavoriteTemplate = {
      id: Date.now().toString(),
      type: 'preset',
      config: {
        personality: selection.personality,
        vocabulary: selection.vocabulary,
        rhetoric: selection.rhetoric,
        lengthPacing: selection.length
      },
      name: this.generateTemplateNameFromIds(selection),
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    // Ask for custom name
    const customName = prompt('Name this template:', newFavorite.name);
    if (customName && customName.trim()) {
      newFavorite.name = customName.trim();
    }

    this.favorites.unshift(newFavorite);
    this.saveFavorites();
    this.refreshGrid();

    UIStateManager.showToast('Template saved from All tab!', 'success');
    logger.info('FavoritesTab: Saved recent All tab selection', newFavorite);
  }

  private generateTemplateNameFromIds(config: any): string {
    const parts = [];
    
    if (config.personality) {
      const personality = PERSONALITIES.find(p => p.id === config.personality);
      if (personality) parts.push(personality.label);
    }
    
    if (config.vocabulary) {
      const vocab = getAllVocabularyStyles().find(v => v.id === config.vocabulary);
      if (vocab) parts.push(vocab.label);
    }

    return parts.slice(0, 2).join(' + ') || 'Saved Template';
  }

  private renderCustomCreatorHTML(): string {
    return `
      <div class="custom-instructions">
        <p>Design your own unique response template by defining the style, tone, and length.</p>
      </div>

      <div class="custom-form">
        ${this.createFormGroupHTML(
          'Writing Style',
          'style',
          'How should the response be written? (e.g., professional, casual, witty, academic)',
          'Enter your custom style...'
        )}
        
        ${this.createFormGroupHTML(
          'Emotional Tone',
          'tone',
          'What feeling should it convey? (e.g., friendly, serious, enthusiastic, empathetic)',
          'Enter your custom tone...'
        )}
        
        ${this.createFormGroupHTML(
          'Response Length',
          'length',
          'How long should responses be? (e.g., brief, detailed, comprehensive, one-liner)',
          'Enter your custom length...'
        )}
      </div>

      <div class="preview-section">
        <h4>Template Preview</h4>
        <div class="preview-content">
          <p class="preview-empty">Fill in the fields above to see your template preview</p>
        </div>
      </div>

      <div class="custom-actions">
        <button class="btn-test-custom">🧪 Test Template</button>
        <button class="btn-save-template primary">💾 Save Template</button>
        <button class="btn-reset">🔄 Reset Fields</button>
      </div>
    `;
  }

  private attachCustomCreatorListeners(): void {
    if (!this.container) return;

    // Form field listeners
    const textareas = this.container.querySelectorAll('.form-textarea');
    const fields = ['style', 'tone', 'length'];
    
    textareas.forEach((textarea, index) => {
      const field = fields[index] as keyof typeof this.customConfig;
      if (field) {
        textarea.addEventListener('input', (e) => {
          const target = e.target as HTMLTextAreaElement;
          this.customConfig[field] = target.value;
          this.updateCustomPreview();
          this.saveCustomDraft();
        });
      }
    });

    // Test button listener
    const testButton = this.container.querySelector('.btn-test-custom');
    if (testButton) {
      testButton.addEventListener('click', async () => {
        await this.handleTestCustomTemplate(testButton as HTMLElement);
      });
    }

    // Save button listener
    const saveButton = this.container.querySelector('.btn-save-template');
    if (saveButton) {
      saveButton.addEventListener('click', () => this.handleSaveCustomTemplate());
    }

    // Reset button listener
    const resetButton = this.container.querySelector('.btn-reset');
    if (resetButton) {
      resetButton.addEventListener('click', () => this.handleResetCustom());
    }

    // Load any saved draft
    this.loadCustomDraft();
  }

  private async handleTestCustomTemplate(button: HTMLElement): Promise<void> {
    if (!this.customConfig.style && !this.customConfig.tone && !this.customConfig.length) {
      UIStateManager.showError(button, 'Please fill in at least one field');
      return;
    }

    if (this.isGenerating) return;
    this.isGenerating = true;

    try {
      UIStateManager.setLoading(button, true, {
        customText: 'Testing...',
        animationType: 'pulse'
      });

      const config: SelectionResult = {
        template: {
          id: 'custom-test',
          name: 'Custom Test',
          emoji: '🧪',
          prompt: '',
          description: 'Testing custom template',
          category: 'custom'
        },
        tone: { id: 'test', name: 'Test' } as any,
        combinedPrompt: '',
        tabType: 'favorites',
        customConfig: {
          style: this.customConfig.style,
          tone: this.customConfig.tone,
          length: this.customConfig.length
        },
        temperature: 0.8
      };

      const reply = await this.tabManager.generateReply(config);
      
      // Show preview in the preview section
      const previewContent = this.container?.querySelector('.preview-content');
      if (previewContent) {
        previewContent.innerHTML = `
          <div class="test-result">
            <h5>Test Result:</h5>
            <div class="test-reply">${reply}</div>
            <p class="test-note">This is how replies will look with this template</p>
          </div>
        `;
      }

      UIStateManager.showSuccess(button, 'Test complete!');
    } catch (error) {
      logger.error('FavoritesTab: Test failed', error);
      UIStateManager.showError(button, 'Test failed');
    } finally {
      this.isGenerating = false;
      UIStateManager.setLoading(button, false);
    }
  }

  private handleSaveCustomTemplate(): void {
    if (!this.customConfig.style && !this.customConfig.tone && !this.customConfig.length) {
      UIStateManager.showToast('Please fill in at least one field', 'error');
      return;
    }

    // Create new favorite
    const newFavorite: FavoriteTemplate = {
      id: Date.now().toString(),
      type: 'custom',
      config: { ...this.customConfig },
      createdAt: new Date().toISOString(),
      usageCount: 0
    };
    
    // Ask for a name
    const name = prompt('Give your template a name:');
    if (name && name.trim()) {
      newFavorite.name = name.trim();
    } else {
      newFavorite.name = this.generateTemplateName(newFavorite);
    }
    
    this.favorites.unshift(newFavorite);
    this.saveFavorites();

    // Clear the form
    this.handleResetCustom();
    
    // Switch back to grid view
    this.toggleMode();
    
    UIStateManager.showToast('Template saved!', 'success');
    logger.info('FavoritesTab: Custom template saved', newFavorite);
  }

  private createSearchBarHTML(): string {
    return `
      <div class="search-container">
        <input type="text" class="search-input" placeholder="🔍 Search templates...">
      </div>
    `;
  }

  private createFilterButtonsHTML(): string {
    return `
      <div class="filter-buttons">
        <button class="filter-btn active" data-filter="all">All</button>
        <button class="filter-btn" data-filter="preset">Presets</button>
        <button class="filter-btn" data-filter="custom">Custom</button>
        <button class="filter-btn" data-filter="recent">Recent</button>
      </div>
    `;
  }

  private createFormGroupHTML(label: string, field: string, description: string, placeholder: string): string {
    const value = this.customConfig[field as keyof typeof this.customConfig] || '';
    return `
      <div class="form-group">
        <label class="form-label">${label}</label>
        <p class="form-description">${description}</p>
        <textarea class="form-textarea" data-field="${field}" placeholder="${placeholder}" rows="3">${value}</textarea>
      </div>
    `;
  }

  private createGlobalActionsHTML(): string {
    if (this.isCreatingCustom) {
      return '';
    }

    const exportDisabled = this.favorites.length === 0 ? 'disabled' : '';
    
    return `
      <div class="global-actions">
        <button class="btn-import">📥 Import</button>
        <button class="btn-export" ${exportDisabled}>📤 Export (${this.favorites.length})</button>
      </div>
    `;
  }

  private toggleMode(): void {
    this.isCreatingCustom = !this.isCreatingCustom;
    
    // Re-render the component
    if (this.container) {
      const parent = this.container.parentElement;
      if (parent) {
        parent.innerHTML = this.render();
        this.attachEventListeners(parent as HTMLElement);
      }
    }
  }

  private selectFavorite(favorite: FavoriteTemplate): void {
    this.selectedFavorite = favorite;
    
    // Update UI
    const cards = this.container?.querySelectorAll('.favorite-card');
    cards?.forEach(card => {
      const cardEl = card as HTMLElement;
      if (cardEl.dataset.id === favorite.id) {
        cardEl.classList.add('selected');
      } else {
        cardEl.classList.remove('selected');
      }
    });

    logger.info('FavoritesTab: Selected favorite', favorite);
  }

  private handleEditFavorite(favorite: FavoriteTemplate): void {
    const currentName = favorite.name || this.generateTemplateName(favorite);
    const newName = prompt('Enter a new name for this template:', currentName);
    
    if (newName && newName.trim() && newName.trim() !== currentName) {
      favorite.name = newName.trim();
      this.saveFavorites();
      this.refreshGrid();
      UIStateManager.showToast('Template renamed', 'success');
    }
  }

  private handleDeleteFavorite(id: string): void {
    const favorite = this.favorites.find(f => f.id === id);
    if (!favorite) return;

    const name = favorite.name || this.generateTemplateName(favorite);
    
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      this.favorites = this.favorites.filter(f => f.id !== id);
      this.saveFavorites();
      this.refreshGrid();
      UIStateManager.showToast('Template deleted', 'info');
      logger.info('FavoritesTab: Deleted favorite', id);
    }
  }

  private filterFavorites(query: string): void {
    const grid = document.getElementById('favorites-grid');
    if (!grid) return;

    if (!query) {
      grid.innerHTML = this.renderFavoriteCardsHTML();
      this.attachFavoriteCardListeners();
      return;
    }

    const queryLower = query.toLowerCase();
    const filtered = this.favorites.filter(favorite => {
      const name = (favorite.name || this.generateTemplateName(favorite)).toLowerCase();
      const configStr = JSON.stringify(favorite.config).toLowerCase();
      
      return name.includes(queryLower) || 
             configStr.includes(queryLower) ||
             favorite.type.includes(queryLower);
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <p>No matching templates found for "${query}"</p>
        </div>
      `;
    } else {
      grid.innerHTML = filtered.map(f => 
        this.createFavoriteCardHTML(f, false)
      ).join('');
      this.attachFavoriteCardListeners();
    }
  }

  private filterByType(type: string): void {
    const grid = document.getElementById('favorites-grid');
    if (!grid) return;

    let filtered = this.favorites;

    if (type === 'preset') {
      filtered = this.favorites.filter(f => f.type === 'preset');
    } else if (type === 'custom') {
      filtered = this.favorites.filter(f => f.type === 'custom');
    } else if (type === 'recent') {
      // Show last 5 created
      filtered = [...this.favorites]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📭</span>
          <p>No ${type} templates found</p>
        </div>
      `;
    } else {
      grid.innerHTML = filtered.map(f => 
        this.createFavoriteCardHTML(f, false)
      ).join('');
      this.attachFavoriteCardListeners();
    }
  }

  private handleImport(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        
        if (Array.isArray(imported)) {
          // Merge with existing, avoiding duplicates
          const existingIds = new Set(this.favorites.map(f => f.id));
          const newTemplates = imported.filter(t => !existingIds.has(t.id));
          
          this.favorites = [...this.favorites, ...newTemplates];
          this.saveFavorites();
          this.refreshGrid();
          
          UIStateManager.showToast(
            `Imported ${newTemplates.length} new template${newTemplates.length !== 1 ? 's' : ''}`,
            'success'
          );
        } else {
          throw new Error('Invalid format');
        }
      } catch (error) {
        logger.error('FavoritesTab: Import failed', error);
        UIStateManager.showToast('Failed to import templates', 'error');
      }
    });
    
    input.click();
  }

  private handleExport(): void {
    if (this.favorites.length === 0) {
      UIStateManager.showToast('No templates to export', 'warning');
      return;
    }

    const dataStr = JSON.stringify(this.favorites, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tweetcraft-templates-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    UIStateManager.showToast(`Exported ${this.favorites.length} templates`, 'success');
  }

  private refreshGrid(): void {
    const grid = document.getElementById('favorites-grid');
    if (grid) {
      if (this.favorites.length === 0) {
        grid.innerHTML = this.renderEmptyState();
      } else {
        grid.innerHTML = this.renderFavoriteCardsHTML();
      }
      this.attachFavoriteCardListeners();
    }

    // Update count
    const count = this.container?.querySelector('.template-count');
    if (count) {
      count.textContent = `${this.favorites.length} template${this.favorites.length !== 1 ? 's' : ''}`;
    }
  }

  private updateUsageCount(favorite: FavoriteTemplate): void {
    // Find the card and update the usage count display
    const card = this.container?.querySelector(`.favorite-card[data-id="${favorite.id}"]`);
    if (card) {
      const usageEl = card.querySelector('.usage-count');
      if (usageEl) {
        usageEl.textContent = `Used ${favorite.usageCount} time${favorite.usageCount !== 1 ? 's' : ''}`;
      }
    }
  }

  private generateTemplateName(favorite: FavoriteTemplate): string {
    if (favorite.type === 'preset') {
      const parts = [];
      if (favorite.config.personality) {
        const p = PERSONALITIES.find(per => per.id === favorite.config.personality);
        if (p) parts.push(p.label);
      }
      if (favorite.config.vocabulary) {
        const v = getAllVocabularyStyles().find(voc => voc.id === favorite.config.vocabulary);
        if (v) parts.push(v.label);
      }
      return parts.slice(0, 2).join(' + ') || 'Preset Template';
    } else {
      const parts = [];
      if (favorite.config.style) parts.push(favorite.config.style.substring(0, 20));
      if (favorite.config.tone) parts.push(favorite.config.tone.substring(0, 20));
      return parts.join(' + ') || 'Custom Template';
    }
  }

  private updateCustomPreview(): void {
    if (!this.container) return;

    const previewContent = this.container.querySelector('.preview-content');
    if (!previewContent) return;

    const hasContent = this.customConfig.style || this.customConfig.tone || this.customConfig.length;

    if (hasContent) {
      previewContent.innerHTML = `
        <div class="preview-template">
          ${this.customConfig.style ? `<div class="preview-item"><strong>Style:</strong> ${this.customConfig.style}</div>` : ''}
          ${this.customConfig.tone ? `<div class="preview-item"><strong>Tone:</strong> ${this.customConfig.tone}</div>` : ''}
          ${this.customConfig.length ? `<div class="preview-item"><strong>Length:</strong> ${this.customConfig.length}</div>` : ''}
        </div>
      `;
    } else {
      previewContent.innerHTML = '<p class="preview-empty">Fill in the fields above to see your template preview</p>';
    }
  }

  private handleResetCustom(): void {
    this.customConfig = {
      style: '',
      tone: '',
      length: ''
    };

    // Clear form fields
    if (this.container) {
      const textareas = this.container.querySelectorAll('.form-textarea');
      textareas.forEach(textarea => {
        (textarea as HTMLTextAreaElement).value = '';
      });
    }

    this.updateCustomPreview();
    this.clearCustomDraft();
    UIStateManager.showToast('Form reset', 'info');
  }

  private loadFavorites(): void {
    const saved = localStorage.getItem('tweetcraft_favorites');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.favorites = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        logger.error('Failed to load favorites:', e);
        this.favorites = [];
      }
    } else {
      this.favorites = [];
    }
  }

  private saveFavorites(): void {
    localStorage.setItem('tweetcraft_favorites', JSON.stringify(this.favorites));
  }

  private loadCustomDraft(): void {
    const draft = localStorage.getItem('tweetcraft_custom_draft');
    if (draft) {
      try {
        this.customConfig = JSON.parse(draft);
        // Update form fields
        if (this.container) {
          const textareas = this.container.querySelectorAll('.form-textarea');
          const fields = ['style', 'tone', 'length'];
          textareas.forEach((textarea, index) => {
            const field = fields[index] as keyof typeof this.customConfig;
            if (field && this.customConfig[field]) {
              (textarea as HTMLTextAreaElement).value = this.customConfig[field];
            }
          });
        }
        this.updateCustomPreview();
      } catch (e) {
        logger.error('Failed to load custom draft:', e);
      }
    }
  }

  private saveCustomDraft(): void {
    localStorage.setItem('tweetcraft_custom_draft', JSON.stringify(this.customConfig));
  }

  private clearCustomDraft(): void {
    localStorage.removeItem('tweetcraft_custom_draft');
  }

  async onShow(): Promise<void> {
    // Reload favorites when tab is shown
    this.loadFavorites();
    
    // Check if we should auto-create from recent AllTab selection
    const autoCreate = sessionStorage.getItem('tweetcraft_auto_create_favorite');
    if (autoCreate === 'true') {
      sessionStorage.removeItem('tweetcraft_auto_create_favorite');
      this.saveRecentAllTabSelection();
    }
  }

  onHide(): void {
    // Save any drafts
    if (this.isCreatingCustom && (this.customConfig.style || this.customConfig.tone || this.customConfig.length)) {
      this.saveCustomDraft();
    }
  }

  destroy(): void {
    this.container = null;
    this.selectedFavorite = null;
    this.isCreatingCustom = false;
    this.isGenerating = false;
  }
}

export default UnifiedFavoritesTab;
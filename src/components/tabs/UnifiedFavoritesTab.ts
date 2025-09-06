import { TabComponent } from './TabManager';
import './UnifiedFavoritesTab.scss';

interface FavoriteTemplate {
  id: string;
  type: 'preset' | 'custom';
  config: {
    // Preset fields
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

  render(): string {
    // Load favorites
    this.loadFavorites();

    // Build HTML string
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

  destroy(): void {
    this.container = null;
    this.selectedFavorite = null;
    this.isCreatingCustom = false;
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
      html += '<h3>Saved Templates</h3>';
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
      html += `
        <div class="empty-state">
          <span class="empty-icon">⭐</span>
          <h4>No saved templates yet</h4>
          <p>Save your favorite combinations from the All tab or create a custom template</p>
          <button class="btn-create-first">✨ Create Your First Template</button>
        </div>
      `;
    } else {
      html += this.renderFavoriteCardsHTML();
    }
    
    html += '</div>';
    
    return html;
  }

  private attachFavoritesGridListeners(): void {
    if (!this.container) return;

    // Search input listener
    const searchInput = this.container.querySelector('.search-input');
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

    // Create first template button
    const createFirstBtn = this.container.querySelector('.btn-create-first');
    if (createFirstBtn) {
      createFirstBtn.addEventListener('click', () => this.toggleMode());
    }

    // Attach card listeners
    this.attachFavoriteCardListeners();
  }

  private attachFavoriteCardListeners(): void {
    if (!this.container) return;

    // Card click listeners
    const cards = this.container.querySelectorAll('.favorite-card');
    cards.forEach((card, index) => {
      const favorite = this.favorites[index];
      if (favorite) {
        card.addEventListener('click', () => {
          this.selectFavorite(favorite);
        });

        // Use button
        const useButton = card.querySelector('.btn-use');
        if (useButton) {
          useButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleUseFavorite(favorite);
          });
        }

        // Edit button
        const editButton = card.querySelector('.btn-edit');
        if (editButton) {
          editButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleEditFavorite(favorite);
          });
        }

        // Delete button
        const deleteButton = card.querySelector('.btn-delete');
        if (deleteButton) {
          deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleDeleteFavorite(favorite.id);
          });
        }
      }
    });
  }

  private renderCustomCreatorHTML(): string {
    let html = '';

    // Instructions
    html += `
      <div class="custom-instructions">
        <p>Design your own unique response template by defining the style, tone, and length.</p>
      </div>
    `;

    // Form section
    html += '<div class="custom-form">';

    // Style field
    html += this.createFormGroupHTML(
      'Writing Style',
      'style',
      'How should the response be written? (e.g., professional, casual, witty, academic)',
      'Enter your custom style...'
    );

    // Tone field
    html += this.createFormGroupHTML(
      'Emotional Tone',
      'tone',
      'What feeling should it convey? (e.g., friendly, serious, enthusiastic, empathetic)',
      'Enter your custom tone...'
    );

    // Length field
    html += this.createFormGroupHTML(
      'Response Length',
      'length',
      'How long should responses be? (e.g., brief, detailed, comprehensive, one-liner)',
      'Enter your custom length...'
    );

    html += '</div>';

    // Preview section
    html += `
      <div class="preview-section">
        <h4>Template Preview</h4>
        <div class="preview-content">
          <p class="preview-empty">Fill in the fields above to see your template preview</p>
        </div>
      </div>
    `;

    // Actions
    html += `
      <div class="custom-actions">
        <button class="btn-save-template primary">💾 Save Template</button>
        <button class="btn-reset">🔄 Reset Fields</button>
      </div>
    `;

    return html;
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

  // Add the missing HTML string methods
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
      </div>
    `;
  }

  private renderFavoriteCardsHTML(): string {
    let html = '';

    if (this.favorites.length === 0) {
      return ''; // Empty state is handled in renderFavoritesGridHTML
    }

    // Sort by usage count (most used first)
    const sorted = [...this.favorites].sort((a, b) => b.usageCount - a.usageCount);

    sorted.forEach((favorite, index) => {
      const card = this.createFavoriteCard(favorite, index < 3); // Use existing method
      // Convert HTMLElement to string
      const temp = document.createElement('div');
      temp.appendChild(card);
      html += temp.innerHTML;
    });

    return html;
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
        <button class="btn-export" ${exportDisabled}>📤 Export</button>
      </div>
    `;
  }

  // Keep the old createSearchBar for now (will be removed later)
  private createSearchBar(): HTMLElement {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'search-input';
    searchInput.placeholder = '🔍 Search templates...';
    searchInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.filterFavorites(target.value);
    });

    searchContainer.appendChild(searchInput);
    return searchContainer;
  }

  private createFilterButtons(): HTMLElement {
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-buttons';
    
    const allButton = document.createElement('button');
    allButton.className = 'filter-btn active';
    allButton.textContent = 'All';
    allButton.dataset.filter = 'all';
    
    const presetButton = document.createElement('button');
    presetButton.className = 'filter-btn';
    presetButton.textContent = 'Presets';
    presetButton.dataset.filter = 'preset';
    
    const customButton = document.createElement('button');
    customButton.className = 'filter-btn';
    customButton.textContent = 'Custom';
    customButton.dataset.filter = 'custom';
    
    const buttons = [allButton, presetButton, customButton];
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterByType(btn.dataset.filter || 'all');
      });
      filterContainer.appendChild(btn);
    });
    
    return filterContainer;
  }

  private createFormGroup(label: string, field: string, description: string, placeholder: string): HTMLElement {
    const group = document.createElement('div');
    group.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.className = 'form-label';
    group.appendChild(labelEl);

    const descEl = document.createElement('p');
    descEl.className = 'form-description';
    descEl.textContent = description;
    group.appendChild(descEl);

    const textarea = document.createElement('textarea');
    textarea.className = 'form-textarea';
    textarea.placeholder = placeholder;
    textarea.rows = 3;
    textarea.value = this.customConfig[field as keyof typeof this.customConfig] || '';
    textarea.addEventListener('input', (e) => {
      const target = e.target as HTMLTextAreaElement;
      this.customConfig[field as keyof typeof this.customConfig] = target.value;
      this.updateCustomPreview();
      this.saveCustomDraft();
    });
    group.appendChild(textarea);

    return group;
  }

  private renderFavoriteCards(container: HTMLElement, filtered?: FavoriteTemplate[]): void {
    const favoritesToRender = filtered || this.favorites;
    container.innerHTML = '';

    if (favoritesToRender.length === 0 && filtered) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <p>No matching templates found</p>
        </div>
      `;
      return;
    }

    // Sort by usage count (most used first)
    const sorted = [...favoritesToRender].sort((a, b) => b.usageCount - a.usageCount);

    sorted.forEach((favorite, index) => {
      const card = this.createFavoriteCard(favorite, index < 3); // Mark top 3 as popular
      container.appendChild(card);
    });
  }

  private createFavoriteCard(favorite: FavoriteTemplate, isPopular: boolean = false): HTMLElement {
    const card = document.createElement('div');
    card.className = 'favorite-card';
    if (this.selectedFavorite?.id === favorite.id) {
      card.classList.add('selected');
    }
    if (isPopular && favorite.usageCount > 0) {
      card.classList.add('popular');
    }

    // Card header
    const header = document.createElement('div');
    header.className = 'card-header';
    
    const titleRow = document.createElement('div');
    titleRow.className = 'title-row';
    
    const title = document.createElement('h4');
    title.textContent = favorite.name || this.generateTemplateName(favorite);
    titleRow.appendChild(title);
    
    if (isPopular && favorite.usageCount > 0) {
      const popularBadge = document.createElement('span');
      popularBadge.className = 'badge badge-popular';
      popularBadge.textContent = '🔥 Popular';
      titleRow.appendChild(popularBadge);
    }
    
    const typeBadge = document.createElement('span');
    typeBadge.className = `badge badge-${favorite.type}`;
    typeBadge.textContent = favorite.type === 'custom' ? '✨ Custom' : '📦 Preset';
    titleRow.appendChild(typeBadge);
    
    header.appendChild(titleRow);
    card.appendChild(header);

    // Card content
    const content = document.createElement('div');
    content.className = 'card-content';
    
    if (favorite.type === 'preset') {
      const items = [];
      if (favorite.config.personality) items.push(`👤 ${favorite.config.personality}`);
      if (favorite.config.vocabulary) items.push(`📝 ${favorite.config.vocabulary}`);
      if (favorite.config.rhetoric) items.push(`🎯 ${favorite.config.rhetoric}`);
      if (favorite.config.lengthPacing) items.push(`⏱️ ${favorite.config.lengthPacing}`);
      
      content.innerHTML = items.map(item => `<div class="config-item">${item}</div>`).join('');
    } else {
      const items = [];
      if (favorite.config.style) items.push(`✨ ${favorite.config.style}`);
      if (favorite.config.tone) items.push(`🎵 ${favorite.config.tone}`);
      if (favorite.config.length) items.push(`📏 ${favorite.config.length}`);
      
      content.innerHTML = items.map(item => `<div class="config-item">${item}</div>`).join('');
    }
    
    card.appendChild(content);

    // Card footer
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    
    const metadata = document.createElement('div');
    metadata.className = 'card-metadata';
    
    const usage = document.createElement('span');
    usage.className = 'usage-count';
    usage.textContent = `Used ${favorite.usageCount} time${favorite.usageCount !== 1 ? 's' : ''}`;
    metadata.appendChild(usage);
    
    const date = document.createElement('span');
    date.className = 'created-date';
    date.textContent = new Date(favorite.createdAt).toLocaleDateString();
    metadata.appendChild(date);
    
    footer.appendChild(metadata);
    
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    
    const useButton = document.createElement('button');
    useButton.className = 'btn-use primary';
    useButton.innerHTML = '⚡ Use';
    useButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleUseFavorite(favorite);
    });
    
    const editButton = document.createElement('button');
    editButton.className = 'btn-edit';
    editButton.innerHTML = '✏️';
    editButton.title = 'Edit name';
    editButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleEditFavorite(favorite);
    });
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-delete';
    deleteButton.innerHTML = '🗑️';
    deleteButton.title = 'Delete';
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDeleteFavorite(favorite.id);
    });
    
    actions.appendChild(useButton);
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    
    footer.appendChild(actions);
    card.appendChild(footer);

    // Card click handler
    card.addEventListener('click', () => {
      this.selectFavorite(favorite);
    });

    return card;
  }

  private createGlobalActions(): HTMLElement {
    const actions = document.createElement('div');
    actions.className = 'global-actions';
    
    if (!this.isCreatingCustom) {
      const importButton = document.createElement('button');
      importButton.className = 'btn-import';
      importButton.innerHTML = '📥 Import';
      importButton.addEventListener('click', () => this.handleImport());
      
      const exportButton = document.createElement('button');
      exportButton.className = 'btn-export';
      exportButton.innerHTML = '📤 Export';
      exportButton.disabled = this.favorites.length === 0;
      exportButton.addEventListener('click', () => this.handleExport());
      
      actions.appendChild(importButton);
      actions.appendChild(exportButton);
    }
    
    return actions;
  }

  private toggleMode(): void {
    this.isCreatingCustom = !this.isCreatingCustom;
    
    // Re-render the entire component
    if (this.container) {
      this.container.innerHTML = '';
      
      const header = this.createHeaderHTML();
      const headerDiv = document.createElement('div');
      headerDiv.innerHTML = header;
      this.container.appendChild(headerDiv);
      
      const contentArea = document.createElement('div');
      contentArea.className = 'content-area';
      contentArea.id = 'favorites-content';
      
      if (this.isCreatingCustom) {
        const customHTML = this.renderCustomCreatorHTML();
        contentArea.innerHTML = customHTML;
      } else {
        const gridHTML = this.renderFavoritesGridHTML();
        contentArea.innerHTML = gridHTML;
      }
      
      this.container.appendChild(contentArea);
      
      const actions = this.createGlobalActions();
      this.container.appendChild(actions);
    }
  }

  private generateTemplateName(favorite: FavoriteTemplate): string {
    if (favorite.type === 'preset') {
      const parts = [];
      if (favorite.config.personality) parts.push(favorite.config.personality);
      if (favorite.config.vocabulary) parts.push(favorite.config.vocabulary);
      return parts.slice(0, 2).join(' + ') || 'Preset Template';
    } else {
      const parts = [];
      if (favorite.config.style) parts.push(favorite.config.style);
      if (favorite.config.tone) parts.push(favorite.config.tone);
      return parts.slice(0, 2).join(' + ') || 'Custom Template';
    }
  }

  private selectFavorite(favorite: FavoriteTemplate): void {
    this.selectedFavorite = favorite;
    
    // Update UI
    const cards = this.container?.querySelectorAll('.favorite-card');
    cards?.forEach(card => card.classList.remove('selected'));
    
    // Find and select the card
    const allCards = Array.from(cards || []);
    const selectedIndex = this.favorites.findIndex(f => f.id === favorite.id);
    if (selectedIndex >= 0 && allCards[selectedIndex]) {
      allCards[selectedIndex].classList.add('selected');
    }
  }

  private handleUseFavorite(favorite: FavoriteTemplate): void {
    // Update usage count
    favorite.usageCount++;
    this.saveFavorites();

    // Dispatch event to apply template
    window.dispatchEvent(new CustomEvent('apply-favorite-template', { 
      detail: favorite 
    }));

    this.showNotification('Template applied!', 'success');
    
    // Re-render to update usage count
    const grid = document.getElementById('favorites-grid');
    if (grid) {
      this.renderFavoriteCards(grid);
    }
  }

  private handleEditFavorite(favorite: FavoriteTemplate): void {
    const newName = prompt('Enter a new name for this template:', favorite.name || this.generateTemplateName(favorite));
    if (newName && newName.trim()) {
      favorite.name = newName.trim();
      this.saveFavorites();
      
      // Re-render
      const grid = document.getElementById('favorites-grid');
      if (grid) {
        this.renderFavoriteCards(grid);
      }
      
      this.showNotification('Template renamed', 'success');
    }
  }

  private handleDeleteFavorite(id: string): void {
    const favorite = this.favorites.find(f => f.id === id);
    const name = favorite?.name || this.generateTemplateName(favorite!);
    
    if (confirm(`Delete "${name}"?`)) {
      this.favorites = this.favorites.filter(f => f.id !== id);
      this.saveFavorites();
      
      // Re-render
      const grid = document.getElementById('favorites-grid');
      if (grid) {
        this.renderFavoriteCards(grid);
      }
      
      // Update header count
      const count = this.container?.querySelector('.template-count');
      if (count) {
        count.textContent = `${this.favorites.length} template${this.favorites.length !== 1 ? 's' : ''}`;
      }
      
      this.showNotification('Template deleted', 'info');
    }
  }

  private handleSaveCustomTemplate(): void {
    if (!this.customConfig.style && !this.customConfig.tone && !this.customConfig.length) {
      this.showNotification('Please fill in at least one field', 'error');
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
    
    // Optional: Ask for a name
    const name = prompt('Give your template a name (optional):');
    if (name && name.trim()) {
      newFavorite.name = name.trim();
    }
    
    this.favorites.push(newFavorite);
    this.saveFavorites();

    // Clear the form
    this.handleResetCustom();
    
    // Switch back to grid view
    this.toggleMode();
    
    this.showNotification('Template saved!', 'success');

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('template-saved', { detail: newFavorite }));
  }

  private handleResetCustom(): void {
    this.customConfig = {
      style: '',
      tone: '',
      length: ''
    };

    // Clear form fields
    if (this.container) {
      const textareas = this.container.querySelectorAll('textarea');
      textareas.forEach(textarea => {
        textarea.value = '';
      });
    }

    this.updateCustomPreview();
    this.clearCustomDraft();
    this.showNotification('Form reset', 'info');
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

  private filterFavorites(query: string): void {
    const grid = document.getElementById('favorites-grid');
    if (!grid) return;

    if (!query) {
      this.renderFavoriteCards(grid);
      return;
    }

    const filtered = this.favorites.filter(favorite => {
      const name = favorite.name || this.generateTemplateName(favorite);
      const configStr = JSON.stringify(favorite.config).toLowerCase();
      const queryLower = query.toLowerCase();
      
      return name.toLowerCase().includes(queryLower) || 
             configStr.includes(queryLower) ||
             favorite.type.includes(queryLower);
    });

    this.renderFavoriteCards(grid, filtered);
  }

  private filterByType(type: string): void {
    const grid = document.getElementById('favorites-grid');
    if (!grid) return;

    if (type === 'all') {
      this.renderFavoriteCards(grid);
    } else {
      const filtered = this.favorites.filter(f => f.type === type);
      this.renderFavoriteCards(grid, filtered);
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
          
          // Re-render
          const grid = document.getElementById('favorites-grid');
          if (grid) {
            this.renderFavoriteCards(grid);
          }
          
          // Update count
          const count = this.container?.querySelector('.template-count');
          if (count) {
            count.textContent = `${this.favorites.length} template${this.favorites.length !== 1 ? 's' : ''}`;
          }
          
          this.showNotification(`Imported ${newTemplates.length} new template${newTemplates.length !== 1 ? 's' : ''}`, 'success');
        } else {
          throw new Error('Invalid format');
        }
      } catch (error) {
        this.showNotification('Failed to import templates', 'error');
      }
    });
    
    input.click();
  }

  private handleExport(): void {
    const dataStr = JSON.stringify(this.favorites, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tweetcraft-templates-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showNotification('Templates exported', 'success');
  }

  private loadFavorites(): void {
    // Load from unified storage
    const saved = localStorage.getItem('tweetcraft_favorites');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure it's an array
        this.favorites = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Failed to load favorites:', e);
        this.favorites = [];
      }
    } else {
      // Initialize as empty array if nothing saved
      this.favorites = [];
    }
    
    // One-time migration from old storage keys
    this.migrateOldData();
  }

  private migrateOldData(): void {
    // Check if migration already done
    if (localStorage.getItem('tweetcraft_migration_done')) {
      return;
    }

    let migrated = false;

    // Migrate old custom configs
    const oldCustom = localStorage.getItem('tweetcraft_custom_config');
    if (oldCustom) {
      try {
        const config = JSON.parse(oldCustom);
        if (config.style || config.tone || config.length) {
          const customFavorite: FavoriteTemplate = {
            id: `migrated-custom-${Date.now()}`,
            type: 'custom',
            config: config,
            name: 'Migrated Custom Template',
            createdAt: new Date().toISOString(),
            usageCount: 0
          };
          this.favorites.push(customFavorite);
          migrated = true;
        }
      } catch (e) {
        console.error('Failed to migrate custom config:', e);
      }
    }

    if (migrated) {
      this.saveFavorites();
      localStorage.setItem('tweetcraft_migration_done', 'true');
      this.showNotification('Previous templates migrated successfully', 'info');
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
          const textareas = this.container.querySelectorAll('textarea');
          const fields = ['style', 'tone', 'length'];
          textareas.forEach((textarea, index) => {
            const field = fields[index] as keyof typeof this.customConfig;
            if (field && this.customConfig[field]) {
              textarea.value = this.customConfig[field];
            }
          });
        }
        this.updateCustomPreview();
      } catch (e) {
        console.error('Failed to load custom draft:', e);
      }
    }
  }

  private saveCustomDraft(): void {
    localStorage.setItem('tweetcraft_custom_draft', JSON.stringify(this.customConfig));
  }

  private clearCustomDraft(): void {
    localStorage.removeItem('tweetcraft_custom_draft');
  }

  private showNotification(message: string, type: 'success' | 'info' | 'error' = 'info'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    if (this.container) {
      this.container.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    }
  }

  cleanup(): void {
    this.container = null;
    this.selectedFavorite = null;
    this.isCreatingCustom = false;
  }

  getConfig(): any {
    return this.selectedFavorite?.config || null;
  }
}

export default UnifiedFavoritesTab;

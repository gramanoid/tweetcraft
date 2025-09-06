/**
 * SmartTab - AI-powered suggestions based on tweet context
 * Fully wired with real-time suggestions, refresh, and Quick Arsenal
 */

import { TabComponent, TabManager } from './TabManager';
import { SelectionResult } from '@/content/unifiedSelector';
import UIStateManager from '@/services/uiStateManager';
import MessageBridge from '@/services/messageBridge';
import { logger } from '@/utils/logger';

interface Suggestion {
  config: SelectionResult;
  preview: string;
  score: number;
  rationale: string;
}

interface ArsenalReply {
  id: string;
  text: string;
  category: string;
  usageCount: number;
}

export class SmartTab implements TabComponent {
  private currentSuggestions: Suggestion[] = [];
  private selectedSuggestion: Suggestion | null = null;
  private isRefreshing = false;
  private currentReply: string | null = null;
  private arsenalModalOpen = false;

  constructor(
    private onSelectCallback: ((result: SelectionResult) => void) | null,
    private tabManager?: TabManager
  ) {}

  render(): string {
    return `
      <div class="selector-content smart-view">
        <!-- Header with Refresh and Quick Arsenal -->
        <div class="smart-header">
          <h3 class="section-title">
            <span>⚡ AI Suggestions</span>
            <span class="section-hint">Powered by context analysis</span>
          </h3>
          <div class="smart-actions">
            <button class="refresh-suggestions-btn" title="Get new suggestions">
              <span class="refresh-icon">🔄</span>
              <span class="refresh-text">Refresh</span>
            </button>
            <button class="quick-arsenal-btn" title="Quick access to saved replies">
              <span>⚔️</span> Quick Arsenal
            </button>
          </div>
        </div>

        <!-- Status Message Area -->
        <div class="status-message" style="display: none;"></div>

        <!-- Suggestions Container -->
        <div class="smart-suggestions-container">
          <div class="suggestions-loading">
            <div class="loading-spinner"></div>
            <p>Analyzing tweet context and generating suggestions...</p>
            <div class="loading-progress">
              <div class="progress-bar"></div>
            </div>
          </div>
          
          <div class="suggestions-grid" style="display: none;">
            <!-- Suggestions will be inserted here -->
          </div>
          
          <div class="suggestions-empty" style="display: none;">
            <div class="empty-icon">🤔</div>
            <p>No suggestions available</p>
            <p class="empty-hint">Try refreshing or check your tweet context</p>
          </div>
          
          <div class="suggestions-error" style="display: none;">
            <div class="error-icon">⚠️</div>
            <p class="error-message"></p>
            <button class="retry-suggestions-btn">Retry</button>
          </div>
        </div>

        <!-- Generated Reply Area -->
        <div class="generated-reply-area"></div>

        <!-- Quick Arsenal Modal (hidden by default) -->
        <div class="quick-arsenal-modal" style="display: none;">
          <div class="modal-overlay"></div>
          <div class="modal-content">
            <div class="modal-header">
              <h4>⚔️ Quick Arsenal - Top Replies</h4>
              <button class="modal-close">×</button>
            </div>
            <div class="modal-body">
              <div class="arsenal-loading">Loading top replies...</div>
              <div class="arsenal-replies-list" style="display: none;">
                <!-- Arsenal replies will be inserted here -->
              </div>
            </div>
            <div class="modal-footer">
              <a href="#" class="full-arsenal-link">Open Full Arsenal →</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderSuggestionCard(suggestion: Suggestion, index: number): string {
    const scoreColor = suggestion.score >= 8 ? '#17BF63' : 
                      suggestion.score >= 6 ? '#1DA1F2' : 
                      suggestion.score >= 4 ? '#FFA500' : '#DC3545';
    
    const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎯';
    
    return `
      <div class="suggestion-card" 
           data-index="${index}"
           data-config='${JSON.stringify(suggestion.config).replace(/'/g, '&apos;')}'>
        <div class="suggestion-header">
          <span class="suggestion-rank">${rankEmoji}</span>
          <div class="suggestion-score" style="background: ${scoreColor};">
            <span class="score-value">${suggestion.score}</span>
            <span class="score-label">/10</span>
          </div>
        </div>
        
        <div class="suggestion-preview">
          ${this.escapeHtml(suggestion.preview)}
        </div>
        
        <div class="suggestion-rationale">
          <span class="rationale-icon">💡</span>
          <span class="rationale-text">${this.escapeHtml(suggestion.rationale)}</span>
        </div>
        
        <div class="suggestion-config">
          ${this.renderConfigBadges(suggestion.config)}
        </div>
        
        <button class="use-suggestion-btn">
          <span>✨</span> Use This
        </button>
      </div>
    `;
  }

  private renderConfigBadges(config: SelectionResult): string {
    const badges = [];
    
    if (config.personaConfig) {
      badges.push(`<span class="config-badge">${config.personaConfig.personality}</span>`);
      badges.push(`<span class="config-badge">${config.personaConfig.vocabulary}</span>`);
    } else if (config.allTabConfig) {
      badges.push(`<span class="config-badge">${config.allTabConfig.personality}</span>`);
      badges.push(`<span class="config-badge">${config.allTabConfig.vocabulary}</span>`);
    }
    
    return badges.join('');
  }

  attachEventListeners(container: HTMLElement): void {
    // Refresh suggestions button
    const refreshBtn = container.querySelector('.refresh-suggestions-btn') as HTMLButtonElement;
    refreshBtn?.addEventListener('click', () => this.handleRefresh(container));

    // Quick Arsenal button
    const arsenalBtn = container.querySelector('.quick-arsenal-btn');
    arsenalBtn?.addEventListener('click', () => this.handleQuickArsenal(container));

    // Retry button (for errors)
    const retryBtn = container.querySelector('.retry-suggestions-btn');
    retryBtn?.addEventListener('click', () => this.loadSuggestions(container));

    // Modal close button
    const modalClose = container.querySelector('.modal-close');
    modalClose?.addEventListener('click', () => this.closeArsenalModal(container));

    // Modal overlay click to close
    const modalOverlay = container.querySelector('.modal-overlay');
    modalOverlay?.addEventListener('click', () => this.closeArsenalModal(container));

    // Full Arsenal link
    const fullArsenalLink = container.querySelector('.full-arsenal-link');
    fullArsenalLink?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openFullArsenal();
    });

    // Suggestion card clicks (delegated)
    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Check if clicked on suggestion card or its children
      const suggestionCard = target.closest('.suggestion-card') as HTMLElement;
      if (suggestionCard) {
        this.handleSuggestionSelect(suggestionCard, container);
        return;
      }

      // Check if clicked on use suggestion button
      const useBtn = target.closest('.use-suggestion-btn');
      if (useBtn) {
        const card = useBtn.closest('.suggestion-card') as HTMLElement;
        if (card) {
          this.handleUseSuggestion(card, container);
        }
        return;
      }

      // Check if clicked on arsenal reply
      const arsenalReply = target.closest('.arsenal-reply-item');
      if (arsenalReply) {
        this.handleArsenalReplySelect(arsenalReply as HTMLElement, container);
      }
    });
  }

  async onShow(): Promise<void> {
    logger.info('SmartTab shown - loading suggestions');
    // Find the container and load suggestions
    const container = document.querySelector('.smart-view') as HTMLElement;
    if (container) {
      await this.loadSuggestions(container);
    }
  }

  onHide(): void {
    // Clear any temporary state
    this.closeArsenalModal(document.querySelector('.smart-view') as HTMLElement);
  }

  private async loadSuggestions(container: HTMLElement): Promise<void> {
    if (this.isRefreshing) return;

    this.isRefreshing = true;
    this.showLoadingState(container);

    try {
      // Get suggestions from TabManager/MessageBridge
      let suggestions: Suggestion[];
      if (this.tabManager) {
        suggestions = await this.tabManager.getSuggestions();
      } else {
        // Fallback to direct MessageBridge call
        const context = this.getTweetContext();
        suggestions = await MessageBridge.getSuggestions(context);
      }

      this.currentSuggestions = suggestions;
      
      if (suggestions.length > 0) {
        this.displaySuggestions(container, suggestions);
      } else {
        this.showEmptyState(container);
      }

      logger.info(`Loaded ${suggestions.length} suggestions`);

    } catch (error) {
      logger.error('Failed to load suggestions:', error);
      this.showErrorState(container, error instanceof Error ? error.message : 'Failed to load suggestions');
    } finally {
      this.isRefreshing = false;
    }
  }

  private displaySuggestions(container: HTMLElement, suggestions: Suggestion[]): void {
    const grid = container.querySelector('.suggestions-grid') as HTMLElement;
    if (!grid) return;

    // Sort by score (highest first)
    const sortedSuggestions = [...suggestions].sort((a, b) => b.score - a.score);

    grid.innerHTML = sortedSuggestions.map((suggestion, index) => this.renderSuggestionCard(suggestion, index)).join('');
    
    // Hide loading, show grid
    this.hideAllStates(container);
    grid.style.display = 'grid';

    // Animate cards in
    const cards = grid.querySelectorAll('.suggestion-card');
    cards.forEach((card, i) => {
      (card as HTMLElement).style.animation = `fadeInUp 0.4s ease-out ${i * 0.1}s both`;
    });
  }

  private async handleSuggestionSelect(card: HTMLElement, container: HTMLElement): Promise<void> {
    // Visual selection feedback
    container.querySelectorAll('.suggestion-card').forEach(c => {
      c.classList.remove('selected');
    });
    card.classList.add('selected');

    const index = parseInt(card.dataset.index || '0');
    this.selectedSuggestion = this.currentSuggestions[index];
    
    logger.info(`Selected suggestion ${index + 1} with score ${this.selectedSuggestion?.score}`);
  }

  private async handleUseSuggestion(card: HTMLElement, container: HTMLElement): Promise<void> {
    const config = JSON.parse(card.dataset.config || '{}') as SelectionResult;
    const useBtn = card.querySelector('.use-suggestion-btn') as HTMLButtonElement;
    
    try {
      // Show loading state
      UIStateManager.setLoading(useBtn, true, {
        customText: 'Generating...',
        animationType: 'pulse'
      });

      // Generate reply using the suggestion config
      let reply: string;
      if (this.tabManager) {
        reply = await this.tabManager.generateReply(config);
      } else {
        const context = this.getTweetContext();
        reply = await MessageBridge.generateReply(config, context);
      }

      this.currentReply = reply;

      // Display the reply
      const replyArea = container.querySelector('.generated-reply-area') as HTMLElement;
      UIStateManager.displayReply(replyArea, reply, {
        showCopyButton: true,
        showRegenerateButton: true,
        onCopy: () => this.trackUsage('copy', config),
        onRegenerate: () => this.handleUseSuggestion(card, container)
      });

      // Show success
      UIStateManager.showToast('Reply generated from suggestion!', 'success');
      
      // Track usage
      this.trackUsage('generate', config);

    } catch (error) {
      logger.error('Failed to generate from suggestion:', error);
      UIStateManager.showError(useBtn, 'Failed to generate reply');
    } finally {
      UIStateManager.setLoading(useBtn, false);
    }
  }

  private async handleRefresh(container: HTMLElement): Promise<void> {
    const refreshBtn = container.querySelector('.refresh-suggestions-btn') as HTMLButtonElement;
    
    // Add rotation animation to icon
    const icon = refreshBtn.querySelector('.refresh-icon') as HTMLElement;
    if (icon) {
      icon.style.animation = 'spin 1s linear infinite';
    }
    
    refreshBtn.disabled = true;
    
    try {
      await this.loadSuggestions(container);
      UIStateManager.showToast('Suggestions refreshed!', 'info');
    } finally {
      refreshBtn.disabled = false;
      if (icon) {
        icon.style.animation = '';
      }
    }
  }

  private async handleQuickArsenal(container: HTMLElement): Promise<void> {
    const modal = container.querySelector('.quick-arsenal-modal') as HTMLElement;
    if (!modal) return;

    // Show modal
    modal.style.display = 'block';
    this.arsenalModalOpen = true;

    const loadingEl = modal.querySelector('.arsenal-loading') as HTMLElement;
    const listEl = modal.querySelector('.arsenal-replies-list') as HTMLElement;

    // Show loading
    loadingEl.style.display = 'block';
    listEl.style.display = 'none';

    try {
      // Get top arsenal replies
      let replies: ArsenalReply[];
      if (this.tabManager) {
        replies = await this.tabManager.getTopArsenalReplies(5);
      } else {
        replies = await MessageBridge.getArsenalReplies({ limit: 5 });
      }

      // Display replies
      if (replies.length > 0) {
        listEl.innerHTML = replies.map(reply => this.renderArsenalReply(reply)).join('');
        loadingEl.style.display = 'none';
        listEl.style.display = 'block';
      } else {
        loadingEl.innerHTML = '<p>No saved replies yet. Generate and save some first!</p>';
      }

    } catch (error) {
      logger.error('Failed to load arsenal replies:', error);
      loadingEl.innerHTML = '<p class="error">Failed to load replies</p>';
    }
  }

  private renderArsenalReply(reply: ArsenalReply): string {
    return `
      <div class="arsenal-reply-item" data-reply='${JSON.stringify(reply).replace(/'/g, '&apos;')}'>
        <div class="arsenal-reply-header">
          <span class="arsenal-category">${reply.category}</span>
          <span class="arsenal-usage">Used ${reply.usageCount}x</span>
        </div>
        <div class="arsenal-reply-text">
          ${this.escapeHtml(reply.text)}
        </div>
        <div class="arsenal-reply-actions">
          <button class="use-arsenal-btn">Use This</button>
          <button class="copy-arsenal-btn">Copy</button>
        </div>
      </div>
    `;
  }

  private async handleArsenalReplySelect(item: HTMLElement, container: HTMLElement): Promise<void> {
    const reply = JSON.parse(item.dataset.reply || '{}') as ArsenalReply;
    const target = event?.target as HTMLElement;

    if (target?.classList.contains('use-arsenal-btn')) {
      // Insert into tweet box
      this.insertReplyIntoTweet(reply.text);
      this.closeArsenalModal(container);
      UIStateManager.showToast('Reply inserted!', 'success');
      
      // Track usage
      if (this.tabManager) {
        await this.tabManager.trackArsenalUsage(reply.id);
      }
    } else if (target?.classList.contains('copy-arsenal-btn')) {
      // Copy to clipboard
      await navigator.clipboard.writeText(reply.text);
      UIStateManager.showToast('Copied to clipboard!', 'success');
    }
  }

  private closeArsenalModal(container: HTMLElement): void {
    const modal = container?.querySelector('.quick-arsenal-modal') as HTMLElement;
    if (modal) {
      modal.style.display = 'none';
      this.arsenalModalOpen = false;
    }
  }

  private openFullArsenal(): void {
    // Switch to Arsenal tab
    if (this.tabManager) {
      (this.tabManager as any).switchTab('arsenal');
    }
  }

  private insertReplyIntoTweet(text: string): void {
    // Find tweet textarea and insert
    const textarea = document.querySelector('[data-testid="tweetTextarea_0"]') as HTMLElement;
    if (textarea && textarea.contentEditable === 'true') {
      // Focus the textarea
      textarea.focus();
      
      // Insert text
      document.execCommand('selectAll');
      document.execCommand('insertText', false, text);
      
      // Trigger input event for React
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      });
      textarea.dispatchEvent(inputEvent);
    }
  }

  private showLoadingState(container: HTMLElement): void {
    this.hideAllStates(container);
    const loading = container.querySelector('.suggestions-loading') as HTMLElement;
    if (loading) {
      loading.style.display = 'block';
      // Animate progress bar
      const progressBar = loading.querySelector('.progress-bar') as HTMLElement;
      if (progressBar) {
        progressBar.style.width = '0%';
        setTimeout(() => progressBar.style.width = '60%', 100);
        setTimeout(() => progressBar.style.width = '90%', 1000);
      }
    }
  }

  private showEmptyState(container: HTMLElement): void {
    this.hideAllStates(container);
    const empty = container.querySelector('.suggestions-empty') as HTMLElement;
    if (empty) empty.style.display = 'block';
  }

  private showErrorState(container: HTMLElement, message: string): void {
    this.hideAllStates(container);
    const error = container.querySelector('.suggestions-error') as HTMLElement;
    if (error) {
      error.style.display = 'block';
      const msgEl = error.querySelector('.error-message');
      if (msgEl) msgEl.textContent = message;
    }
  }

  private hideAllStates(container: HTMLElement): void {
    const states = ['.suggestions-loading', '.suggestions-grid', '.suggestions-empty', '.suggestions-error'];
    states.forEach(selector => {
      const el = container.querySelector(selector) as HTMLElement;
      if (el) el.style.display = 'none';
    });
  }

  private getTweetContext(): any {
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

  private trackUsage(action: string, config: SelectionResult): void {
    logger.info(`Smart suggestion usage: ${action}`, config);
    // Track for improving suggestions
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy(): void {
    this.currentSuggestions = [];
    this.selectedSuggestion = null;
    this.currentReply = null;
    this.arsenalModalOpen = false;
  }
}
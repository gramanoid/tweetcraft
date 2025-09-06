/**
 * TabManager - Coordinates between different tab components
 * Part of Task 28: Bundle Size Optimization
 * Enhanced with Message Bridge integration for frontend-backend communication
 */

import { SelectionResult } from '@/content/unifiedSelector';
import { logger } from '@/utils/logger';
import MessageBridge from '@/services/messageBridge';
import { TwitterContext } from '@/types';
import { DOMUtils } from '@/content/domUtils';
import { MessageType } from '@/types/messages';

// Static imports for all tabs to prevent chunk loading issues in Chrome extension
import { PersonasTab } from './PersonasTab';
import { AllTab } from './AllTab';
import { SmartTab } from './SmartTab';
import UnifiedFavoritesTab from './UnifiedFavoritesTab';
import { ComposeTab } from './ComposeTab';
import { SettingsTab } from './SettingsTab';
import { StatsTab } from './StatsTab';
import { TrendingTab } from './TrendingTab';
import { EngagementTab } from './EngagementTab';
import { ABTestTab } from './ABTestTab';
import { CacheTab } from './CacheTab';
import { ArsenalTab } from './ArsenalTab';

export type TabType = 'personas' | 'grid' | 'smart' | 'favorites' | 'compose' | 'settings' | 'stats' | 'trending' | 'engagement' | 'abtest' | 'cache' | 'arsenal';

export interface TabComponent {
  render(): string;
  attachEventListeners(container: HTMLElement): void;
  destroy(): void;
  onShow?(): Promise<void>;
  onHide?(): void;
}

export class TabManager {
  private currentTab: TabType = 'smart';
  private tabComponents: Map<TabType, TabComponent | null> = new Map();
  private container: HTMLElement | null = null;
  private onSelectCallback: ((result: SelectionResult) => void) | null = null;
  private isLoading: Map<TabType, boolean> = new Map();

  constructor() {
    // Initialize with null components - will be lazy loaded
    const tabTypes: TabType[] = [
      'personas', 'grid', 'smart', 'favorites', 
      'compose', 'settings', 'stats', 'trending', 
      'engagement', 'abtest', 'cache', 'arsenal'
    ];
    
    tabTypes.forEach(type => {
      this.tabComponents.set(type, null);
      this.isLoading.set(type, false);
    });
  }

  /**
   * Set the container element
   */
  setContainer(container: HTMLElement): void {
    this.container = container;
  }

  /**
   * Set the selection callback
   */
  setOnSelectCallback(callback: (result: SelectionResult) => void): void {
    this.onSelectCallback = callback;
  }

  /**
   * Get current tab
   */
  getCurrentTab(): TabType {
    return this.currentTab;
  }

  /**
   * Switch to a different tab
   */
  async switchTab(tabType: TabType): Promise<void> {
    if (this.currentTab === tabType) return;

    logger.info(`Switching from ${this.currentTab} to ${tabType} tab`);

    // Hide current tab
    const currentComponent = this.tabComponents.get(this.currentTab);
    if (currentComponent?.onHide) {
      currentComponent.onHide();
    }

    // Update current tab
    const previousTab = this.currentTab;
    this.currentTab = tabType;

    // Load and show new tab
    try {
      const component = await this.loadTabComponent(tabType);
      if (component) {
        // Call onShow if available
        if (component.onShow) {
          await component.onShow();
        }

        // Render the new tab
        this.renderCurrentTab();
      }
    } catch (error) {
      logger.error(`Failed to switch to ${tabType} tab`, error);
      // Revert to previous tab on error
      this.currentTab = previousTab;
      throw error;
    }
  }

  /**
   * Lazy load a tab component
   */
  async loadTabComponent(tabType: TabType): Promise<TabComponent | null> {
    // Check if already loaded
    let component = this.tabComponents.get(tabType);
    if (component) return component;

    // Check if already loading
    if (this.isLoading.get(tabType)) {
      // Wait for loading to complete
      while (this.isLoading.get(tabType)) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return this.tabComponents.get(tabType) || null;
    }

    // Mark as loading
    this.isLoading.set(tabType, true);

    try {
      // Use static imports - components are already imported at the top
      // Pass 'this' as tabManager to all components for message bridge access
      switch (tabType) {
        case 'personas':
          component = new PersonasTab(this.onSelectCallback || (() => {}), this);
          break;

        case 'grid':
          component = new AllTab(this.onSelectCallback || (() => {}), this);
          break;

        case 'smart':
          component = new SmartTab(this.onSelectCallback || (() => {}), this);
          break;

        case 'favorites':
          component = new UnifiedFavoritesTab(this);
          break;

        case 'compose':
          component = new ComposeTab(this.onSelectCallback, this);
          break;

        case 'settings':
          component = new SettingsTab(this);
          break;

        case 'stats':
          component = new StatsTab(this);
          break;

        case 'trending':
          component = new TrendingTab(this);
          break;

        case 'engagement':
          component = new EngagementTab(this);
          break;

        case 'abtest':
          component = new ABTestTab();
          break;

        case 'cache':
          component = new CacheTab();
          break;

        case 'arsenal':
          component = new ArsenalTab(this.onSelectCallback, this);
          break;

        default:
          logger.warn(`Unknown tab type: ${tabType}`);
          return null;
      }

      // Store the loaded component
      this.tabComponents.set(tabType, component);
      logger.success(`Loaded ${tabType} tab component`);

      return component;
    } catch (error) {
      logger.error(`Failed to load ${tabType} tab component`, error);
      return null;
    } finally {
      // Mark as no longer loading
      this.isLoading.set(tabType, false);
    }
  }

  /**
   * Render the current tab
   */
  renderCurrentTab(): void {
    if (!this.container) {
      logger.warn('No container set for TabManager');
      return;
    }

    const component = this.tabComponents.get(this.currentTab);
    if (!component) {
      logger.warn(`No component loaded for ${this.currentTab} tab`);
      return;
    }

    // Find content container
    const contentContainer = this.container.querySelector('.selector-content');
    if (contentContainer) {
      // Render the component
      contentContainer.innerHTML = component.render();
      
      // Attach event listeners
      component.attachEventListeners(contentContainer as HTMLElement);
    }
  }

  /**
   * Update tab buttons to show active state
   */
  updateTabButtons(): void {
    if (!this.container) return;

    // Remove active class from all tabs
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Add active class to current tab
    const activeBtn = this.container.querySelector(`.tab-btn[data-view="${this.currentTab}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }

  /**
   * Destroy all loaded components
   */
  destroy(): void {
    this.tabComponents.forEach(component => {
      if (component) {
        component.destroy();
      }
    });
    this.tabComponents.clear();
    this.container = null;
    this.onSelectCallback = null;
  }

  /**
   * Get shared state that tabs might need
   */
  getSharedState(): any {
    // This can be expanded to share state between tabs
    return {
      currentTab: this.currentTab,
      container: this.container
    };
  }

  // ============================================
  // MESSAGE BRIDGE INTEGRATION METHODS
  // ============================================

  /**
   * Generate a reply using the selected configuration
   */
  async generateReply(config: SelectionResult): Promise<string> {
    try {
      const context = this.getTweetContext();
      const reply = await MessageBridge.generateReply(config, context, {
        onProgress: (status) => this.showStatus(status)
      });
      
      // Track successful generation
      if (config.personality) {
        await this.trackUsage(config);
      }
      
      return reply;
    } catch (error) {
      logger.error('Failed to generate reply:', error);
      throw error;
    }
  }

  /**
   * Get AI suggestions for the current context
   */
  async getSuggestions(refreshCache: boolean = false): Promise<Array<{
    config: SelectionResult;
    preview: string;
    score: number;
    rationale: string;
  }>> {
    try {
      const context = this.getTweetContext();
      return await MessageBridge.getSuggestions(context);
    } catch (error) {
      logger.error('Failed to get suggestions:', error);
      throw error;
    }
  }

  /**
   * Get Arsenal replies with optional filters
   */
  async getArsenalReplies(filters?: {
    category?: string;
    searchTerm?: string;
    limit?: number;
  }): Promise<Array<{
    id: string;
    text: string;
    category: string;
    usageCount: number;
    createdAt: Date;
  }>> {
    try {
      return await MessageBridge.getArsenalReplies(filters);
    } catch (error) {
      logger.error('Failed to get Arsenal replies:', error);
      throw error;
    }
  }

  /**
   * Save a reply to Arsenal
   */
  async saveArsenalReply(reply: {
    text: string;
    category: string;
    metadata?: any;
  }): Promise<{ id: string }> {
    try {
      return await MessageBridge.saveArsenalReply(reply);
    } catch (error) {
      logger.error('Failed to save Arsenal reply:', error);
      throw error;
    }
  }

  /**
   * Track Arsenal reply usage
   */
  async trackArsenalUsage(replyId: string): Promise<void> {
    try {
      await MessageBridge.sendMessage({
        type: MessageType.TRACK_ARSENAL_USAGE,
        replyId
      });
    } catch (error) {
      logger.error('Failed to track Arsenal usage:', error);
    }
  }

  /**
   * Delete an Arsenal reply
   */
  async deleteArsenalReply(replyId: string): Promise<void> {
    try {
      await MessageBridge.sendMessage({
        type: MessageType.DELETE_ARSENAL_REPLIES,
        replyIds: [replyId]
      });
    } catch (error) {
      logger.error('Failed to delete Arsenal reply:', error);
      throw error;
    }
  }

  /**
   * Compose an original tweet
   */
  async composeTweet(config: {
    topic?: string;
    style?: string;
    tone?: string;
    draft?: string;
    type: 'generate' | 'enhance' | 'suggest';
  }): Promise<string | string[]> {
    try {
      return await MessageBridge.composeTweet(config);
    } catch (error) {
      logger.error('Failed to compose tweet:', error);
      throw error;
    }
  }

  /**
   * Get tweet suggestions for compose tab
   */
  async getTweetSuggestions(topic: string): Promise<string[]> {
    try {
      const result = await this.composeTweet({
        topic,
        type: 'suggest'
      });
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      logger.error('Failed to get tweet suggestions:', error);
      throw error;
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      return await MessageBridge.validateApiKey(apiKey);
    } catch (error) {
      logger.error('Failed to validate API key:', error);
      return false;
    }
  }

  /**
   * Get top Arsenal replies for quick access
   */
  async getTopArsenalReplies(limit: number = 5): Promise<Array<{
    id: string;
    text: string;
    category: string;
    usageCount: number;
  }>> {
    try {
      const replies = await this.getArsenalReplies({ limit });
      // Sort by usage count
      return replies.sort((a, b) => b.usageCount - a.usageCount).slice(0, limit);
    } catch (error) {
      logger.error('Failed to get top Arsenal replies:', error);
      return [];
    }
  }

  /**
   * Get current tweet context
   */
  private getTweetContext(): TwitterContext {
    try {
      return DOMUtils.extractTwitterContext();
    } catch (error) {
      logger.warn('Failed to get tweet context, using defaults:', error);
      return {
        tweetText: '',
        authorHandle: '',
        isReply: false,
        threadContext: []
      };
    }
  }

  /**
   * Track usage for smart defaults
   */
  private async trackUsage(config: SelectionResult): Promise<void> {
    try {
      // Track usage for smart defaults - this is handled internally by the service worker
      // when processing GENERATE_REPLY messages, so we don't need a separate message
    } catch (error) {
      // Don't throw, just log - tracking is not critical
      logger.warn('Failed to track usage:', error);
    }
  }

  /**
   * Show status message in UI
   */
  private showStatus(message: string): void {
    const statusEl = this.container?.querySelector('.status-message');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.classList.add('visible');
      setTimeout(() => statusEl.classList.remove('visible'), 3000);
    }
  }

  /**
   * Quick generate with smart defaults
   */
  async quickGenerate(): Promise<string> {
    try {
      // Get smart defaults based on context and time
      const smartConfig = await this.getSmartDefaults();
      return await this.generateReply(smartConfig);
    } catch (error) {
      logger.error('Quick generate failed:', error);
      throw error;
    }
  }

  /**
   * Get smart default configuration
   */
  private async getSmartDefaults(): Promise<SelectionResult> {
    try {
      // Get smart defaults via suggestions endpoint
      const suggestions = await this.getSuggestions();
      const defaults = suggestions[0]?.config || {
        template: { id: 'balanced', name: 'Balanced' } as any,
        tone: { id: 'friendly', name: 'Friendly' } as any,
        combinedPrompt: '',
        temperature: 0.7
      };
      
      return defaults as SelectionResult;
    } catch (error) {
      // Fallback to basic defaults
      return {
        template: { id: 'balanced', name: 'Balanced' } as any,
        tone: { id: 'friendly', name: 'Friendly' } as any,
        combinedPrompt: '',
        temperature: 0.7
      };
    }
  }

  /**
   * Get data from Chrome storage
   */
  async getStorage(key: string): Promise<any> {
    try {
      return await MessageBridge.getStorage(key);
    } catch (error) {
      logger.error('Failed to get storage:', error);
      return null;
    }
  }

  /**
   * Set data in Chrome storage
   */
  async setStorage(data: Record<string, any>): Promise<void> {
    try {
      await MessageBridge.setStorage(data);
    } catch (error) {
      logger.error('Failed to set storage:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const tabManager = new TabManager();

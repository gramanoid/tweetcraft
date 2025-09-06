/**
 * TabManager - Coordinates between different tab components
 * Part of Task 28: Bundle Size Optimization
 */

import { SelectionResult } from '@/content/unifiedSelector';
import { logger } from '@/utils/logger';

export type TabType = 'personas' | 'grid' | 'smart' | 'favorites' | 'custom' | 'compose' | 'stats' | 'weekly' | 'timing' | 'trending' | 'engagement' | 'abtest' | 'cache' | 'arsenal';

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
      'personas', 'grid', 'smart', 'favorites', 'custom', 
      'compose', 'stats', 'weekly', 'timing', 'trending', 
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
  private async loadTabComponent(tabType: TabType): Promise<TabComponent | null> {
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
      // Dynamic import based on tab type
      switch (tabType) {
        case 'personas':
          const { PersonasTab } = await import('./PersonasTab');
          component = new PersonasTab(this.onSelectCallback);
          break;

        case 'grid':
          const { AllTab } = await import('./AllTab');
          component = new AllTab(this.onSelectCallback);
          break;

        case 'smart':
          const { SmartTab } = await import('./SmartTab');
          component = new SmartTab(this.onSelectCallback);
          break;

        case 'favorites':
          const { FavoritesTab } = await import('./FavoritesTab');
          component = new FavoritesTab(this.onSelectCallback);
          break;

        case 'custom':
          const { CustomTab } = await import('./CustomTab');
          component = new CustomTab(this.onSelectCallback);
          break;

        case 'compose':
          const { ComposeTab } = await import('./ComposeTab');
          component = new ComposeTab(this.onSelectCallback);
          break;

        case 'stats':
          const { StatsTab } = await import('./StatsTab');
          component = new StatsTab();
          break;

        case 'weekly':
          const { WeeklyTab } = await import('./WeeklyTab');
          component = new WeeklyTab();
          break;

        case 'timing':
          const { TimingTab } = await import('./TimingTab');
          component = new TimingTab();
          break;

        case 'trending':
          const { TrendingTab } = await import('./TrendingTab');
          component = new TrendingTab();
          break;

        case 'engagement':
          const { EngagementTab } = await import('./EngagementTab');
          component = new EngagementTab();
          break;

        case 'abtest':
          const { ABTestTab } = await import('./ABTestTab');
          component = new ABTestTab();
          break;

        case 'cache':
          const { CacheTab } = await import('./CacheTab');
          component = new CacheTab();
          break;

        case 'arsenal':
          const { ArsenalTab } = await import('./ArsenalTab');
          component = new ArsenalTab(this.onSelectCallback);
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
}

// Export singleton instance
export const tabManager = new TabManager();

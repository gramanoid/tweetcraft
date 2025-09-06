/**
 * Expanded Keyboard Shortcuts Manager
 * Provides power user shortcuts for quick access to features
 */

import { StorageService } from '@/services/storage';

export interface ShortcutConfig {
  key: string;
  alt?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  action: string;
  description: string;
}

export class KeyboardShortcutManager {
  private static shortcuts = new Map<string, ShortcutConfig>();
  private static isInitialized = false;
  private static callbacks = new Map<string, () => void>();
  private static boundHandleKeydown: ((event: KeyboardEvent) => void) | null = null;
  
  /**
   * Default keyboard shortcuts
   */
  static readonly DEFAULT_SHORTCUTS: ShortcutConfig[] = [
    // Tone shortcuts (Alt + 1-9)
    { key: '1', alt: true, action: 'tone_professional', description: 'Professional tone' },
    { key: '2', alt: true, action: 'tone_casual', description: 'Casual tone' },
    { key: '3', alt: true, action: 'tone_witty', description: 'Witty tone' },
    { key: '4', alt: true, action: 'tone_supportive', description: 'Supportive tone' },
    { key: '5', alt: true, action: 'tone_excited', description: 'Excited tone' },
    { key: '6', alt: true, action: 'tone_academic', description: 'Academic tone' },
    { key: '7', alt: true, action: 'tone_counter', description: 'Counter-argument tone' },
    { key: '8', alt: true, action: 'tone_skeptic', description: 'Skeptical tone' },
    { key: '9', alt: true, action: 'tone_sarcastic', description: 'Sarcastic tone' },
    
    // Quick actions
    { key: 'a', alt: true, action: 'open_arsenal', description: 'Open Arsenal Mode - pre-generated replies' },
    { key: 'q', alt: true, action: 'quick_generate', description: 'Generate with default tone' },
    { key: 'r', alt: true, action: 'regenerate', description: 'Regenerate with same tone' },
    { key: 't', alt: true, action: 'open_templates', description: 'Open template selector' },
    { key: 's', alt: true, action: 'switch_suggestion', description: 'Switch between suggestions' },
    { key: 'd', alt: true, action: 'open_dropdown', description: 'Open tone dropdown' },
    { key: 'c', alt: true, action: 'copy_reply', description: 'Copy generated reply' },
    { key: 'e', alt: true, action: 'edit_mode', description: 'Edit generated reply' },
    
    // Tab Navigation (Ctrl + Shift + Number)
    { key: '1', ctrl: true, shift: true, action: 'tab_personas', description: 'Switch to Personas tab' },
    { key: '2', ctrl: true, shift: true, action: 'tab_all', description: 'Switch to All tab' },
    { key: '3', ctrl: true, shift: true, action: 'tab_smart', description: 'Switch to Smart tab' },
    { key: '4', ctrl: true, shift: true, action: 'tab_favorites', description: 'Switch to Favorites tab' },
    { key: '5', ctrl: true, shift: true, action: 'tab_custom', description: 'Switch to Custom tab' },
    { key: '6', ctrl: true, shift: true, action: 'tab_compose', description: 'Switch to Compose tab' },
    { key: '7', ctrl: true, shift: true, action: 'tab_stats', description: 'Switch to Stats tab' },
    { key: '8', ctrl: true, shift: true, action: 'tab_weekly', description: 'Switch to Weekly Summary tab' },
    { key: '9', ctrl: true, shift: true, action: 'tab_timing', description: 'Switch to Timing tab' },
    
    // Extended Tab Navigation (Ctrl + Alt + Letter)
    { key: 't', ctrl: true, alt: true, action: 'tab_trending', description: 'Switch to Trending tab' },
    { key: 'e', ctrl: true, alt: true, action: 'tab_engagement', description: 'Switch to Engagement tab' },
    { key: 'a', ctrl: true, alt: true, action: 'tab_abtest', description: 'Switch to A/B Test tab' },
    { key: 'c', ctrl: true, alt: true, action: 'tab_cache', description: 'Switch to Cache Debug tab' },
    
    // Advanced Features (Alt + Shift + Letter)
    { key: 'x', alt: true, shift: true, action: 'export_comprehensive', description: 'Export all data' },
    { key: 'a', alt: true, shift: true, action: 'export_analytics', description: 'Export analytics only' },
    { key: 'r', alt: true, shift: true, action: 'export_arsenal', description: 'Export Arsenal data' },
    { key: 'w', alt: true, shift: true, action: 'show_weekly_summary', description: 'Show weekly summary' },
    { key: 'b', alt: true, shift: true, action: 'run_ab_test', description: 'Run A/B test on current reply' },
    { key: 's', alt: true, shift: true, action: 'open_settings', description: 'Open extension settings' },
    
    // Navigation Enhancement
    { key: 'ArrowLeft', alt: true, action: 'prev_suggestion', description: 'Previous suggestion' },
    { key: 'ArrowRight', alt: true, action: 'next_suggestion', description: 'Next suggestion' },
    { key: 'ArrowUp', alt: true, action: 'prev_tab', description: 'Previous tab' },
    { key: 'ArrowDown', alt: true, action: 'next_tab', description: 'Next tab' },
    { key: 'Tab', alt: true, action: 'cycle_tabs', description: 'Cycle through tabs' },
    
    // Quick Utilities
    { key: 'h', alt: true, action: 'show_help', description: 'Show keyboard shortcuts help' },
    { key: 'u', alt: true, action: 'toggle_ui', description: 'Toggle UI visibility' },
    { key: 'f', alt: true, action: 'focus_textarea', description: 'Focus reply textarea' },
    { key: 'Escape', alt: false, action: 'close_all', description: 'Close all dropdowns and modals' }
  ];
  
  /**
   * Initialize keyboard shortcuts
   */
  static async init(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('%c⌨️ Keyboard Shortcuts: Initializing', 'color: #9146FF; font-weight: bold');
    
    // Load custom shortcuts from storage
    const customShortcuts = await this.loadCustomShortcuts();
    
    // Merge with defaults
    const allShortcuts = [...this.DEFAULT_SHORTCUTS, ...customShortcuts];
    
    // Register shortcuts
    allShortcuts.forEach(shortcut => {
      const key = this.getShortcutKey(shortcut);
      this.shortcuts.set(key, shortcut);
    });
    
    // Add global keyboard listener (store bound reference for cleanup)
    this.boundHandleKeydown = this.handleKeydown.bind(this);
    document.addEventListener('keydown', this.boundHandleKeydown, true);
    
    this.isInitialized = true;
    console.log(`%c  Registered ${this.shortcuts.size} shortcuts`, 'color: #657786');
  }
  
  /**
   * Handle keyboard events
   */
  private static handleKeydown(event: KeyboardEvent): void {
    // Build shortcut key from event
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    parts.push(event.key.toLowerCase());
    
    const shortcutKey = parts.join('+');
    const shortcut = this.shortcuts.get(shortcutKey);
    
    if (!shortcut) return;
    
    // Check if we're in a reply context
    const replyTextarea = document.querySelector('[data-testid^="tweetTextarea_"]');
    if (!replyTextarea) return;
    
    // Prevent default browser action
    event.preventDefault();
    event.stopPropagation();
    
    console.log(`%c⌨️ Shortcut triggered: ${shortcut.description}`, 'color: #9146FF');
    
    // Execute action
    this.executeAction(shortcut.action, event);
  }
  
  /**
   * Execute shortcut action
   */
  private static executeAction(action: string, _event: KeyboardEvent): void {
    // Check for custom callback first
    const callback = this.callbacks.get(action);
    if (callback) {
      callback();
      return;
    }
    
    // Handle built-in actions
    switch (action) {
      case 'quick_generate':
        this.triggerQuickGenerate();
        break;
        
      case 'regenerate':
        this.triggerRegenerate();
        break;
        
      case 'open_templates':
        this.openTemplateSelector();
        break;
        
      case 'open_dropdown':
        this.openToneDropdown();
        break;
        
      case 'copy_reply':
        this.copyGeneratedReply();
        break;
        
      case 'edit_mode':
        this.enableEditMode();
        break;
        
      case 'open_arsenal':
        this.openArsenalMode();
        break;
        
      case 'switch_suggestion':
      case 'next_suggestion':
        this.switchToNextSuggestion();
        break;
        
      case 'prev_suggestion':
        this.switchToPrevSuggestion();
        break;
        
      case 'close_all':
        this.closeAllDropdowns();
        break;

      // Tab Navigation
      case 'tab_personas':
      case 'tab_all':
      case 'tab_smart':
      case 'tab_favorites':
      case 'tab_custom':
      case 'tab_compose':
      case 'tab_stats':
      case 'tab_weekly':
      case 'tab_timing':
      case 'tab_trending':
      case 'tab_engagement':
      case 'tab_abtest':
      case 'tab_cache':
        this.switchToTab(action);
        break;

      // Export Actions
      case 'export_comprehensive':
        this.triggerExport('comprehensive');
        break;
      case 'export_analytics':
        this.triggerExport('analytics');
        break;
      case 'export_arsenal':
        this.triggerExport('arsenal');
        break;

      // Advanced Features
      case 'show_weekly_summary':
        this.showWeeklySummary();
        break;
      case 'run_ab_test':
        this.runABTest();
        break;
      case 'open_settings':
        this.openExtensionSettings();
        break;

      // Enhanced Navigation
      case 'prev_tab':
        this.navigateTab(-1);
        break;
      case 'next_tab':
        this.navigateTab(1);
        break;
      case 'cycle_tabs':
        this.cycleToNextTab();
        break;

      // Utilities
      case 'show_help':
        this.showKeyboardHelp();
        break;
      case 'toggle_ui':
        this.toggleUIVisibility();
        break;
      case 'focus_textarea':
        this.focusReplyTextarea();
        break;
        
      default:
        // Check if it's a tone shortcut
        if (action.startsWith('tone_')) {
          const tone = action.replace('tone_', '');
          this.triggerToneGeneration(tone);
        }
    }
  }
  
  /**
   * Register custom action callback
   */
  static registerAction(action: string, callback: () => void): void {
    this.callbacks.set(action, callback);
  }
  
  /**
   * Trigger quick generation with default tone
   */
  private static async triggerQuickGenerate(): Promise<void> {
    // Get default tone from storage
    const config = await StorageService.getConfig();
    const defaultTone = config.defaultTone || 'professional';
    
    // Dispatch custom event to trigger generation
    const event = new CustomEvent('tweetcraft:generate-reply', {
      detail: {
        tone: defaultTone,
        bypassCache: true
      }
    });
    document.dispatchEvent(event);
  }
  
  /**
   * Regenerate with the last used tone
   */
  private static async triggerRegenerate(): Promise<void> {
    // Get last tone from session storage or default
    const lastTone = sessionStorage.getItem('tweetcraft_last_tone') || 'professional';
    
    // Dispatch custom event to trigger generation
    const event = new CustomEvent('tweetcraft:generate-reply', {
      detail: {
        tone: lastTone,
        bypassCache: true,
        regenerate: true
      }
    });
    document.dispatchEvent(event);
  }
  
  /**
   * Trigger generation with specific tone
   */
  private static triggerToneGeneration(tone: string): void {
    // Dispatch custom event to trigger generation
    const event = new CustomEvent('tweetcraft:generate-reply', {
      detail: {
        tone: tone,
        bypassCache: true
      }
    });
    document.dispatchEvent(event);
  }
  
  /**
   * Open template selector
   */
  private static openTemplateSelector(): void {
    // This will be implemented with the template system
    const event = new CustomEvent('tweetcraft:open-templates');
    document.dispatchEvent(event);
  }
  
  /**
   * Open tone dropdown
   */
  private static openToneDropdown(): void {
    const button = document.querySelector('.smart-reply-btn') as HTMLElement;
    if (!button) {
      return;
    }
    
    // Find dropdown toggle
    const dropdownToggle = button.parentElement?.querySelector('.dropdown-toggle') as HTMLElement;
    if (dropdownToggle) {
      dropdownToggle.click();
    }
  }
  
  /**
   * Copy generated reply to clipboard
   */
  private static copyGeneratedReply(): void {
    const textarea = document.querySelector('[data-testid^="tweetTextarea_"]') as HTMLElement;
    if (!textarea || !textarea.textContent) return;
    
    navigator.clipboard.writeText(textarea.textContent).then(() => {
      console.log('%c📋 Reply copied to clipboard', 'color: #17BF63');
      
      // Show brief notification
      const notification = document.createElement('div');
      notification.className = 'tweetcraft-notification';
      notification.textContent = '✅ Copied!';
      notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgb(34, 197, 94);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => notification.remove(), 2000);
    });
  }
  
  /**
   * Enable edit mode for generated reply
   */
  private static enableEditMode(): void {
    const textarea = document.querySelector('[data-testid^="tweetTextarea_"]') as HTMLElement;
    if (!textarea) return;
    
    textarea.focus();
    
    // Move cursor to end
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(textarea);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  
  /**
   * Switch to next suggestion
   */
  private static switchToNextSuggestion(): void {
    const event = new CustomEvent('tweetcraft:next-suggestion');
    document.dispatchEvent(event);
  }
  
  /**
   * Switch to previous suggestion
   */
  private static switchToPrevSuggestion(): void {
    const event = new CustomEvent('tweetcraft:prev-suggestion');
    document.dispatchEvent(event);
  }
  
  /**
   * Close all dropdowns
   */
  private static closeAllDropdowns(): void {
    const dropdowns = document.querySelectorAll('.smart-reply-dropdown');
    dropdowns.forEach(dropdown => {
      (dropdown as HTMLElement).style.display = 'none';
    });
  }
  
  /**
   * Load custom shortcuts from storage
   */
  private static async loadCustomShortcuts(): Promise<ShortcutConfig[]> {
    try {
      const stored = await chrome.storage.local.get('customShortcuts');
      return stored.customShortcuts || [];
    } catch {
      return [];
    }
  }
  
  /**
   * Save custom shortcut
   */
  static async saveCustomShortcut(shortcut: ShortcutConfig): Promise<void> {
    const shortcuts = await this.loadCustomShortcuts();
    shortcuts.push(shortcut);
    await chrome.storage.local.set({ customShortcuts: shortcuts });
    
    // Re-initialize to apply changes
    this.isInitialized = false;
    await this.init();
  }
  
  /**
   * Get shortcut key string
   */
  private static getShortcutKey(shortcut: ShortcutConfig): string {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.alt) parts.push('alt');
    if (shortcut.shift) parts.push('shift');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }
  
  /**
   * Get all registered shortcuts
   */
  static getShortcuts(): ShortcutConfig[] {
    return Array.from(this.shortcuts.values());
  }
  
  /**
   * Open Arsenal Mode
   */
  private static openArsenalMode(): void {
    console.log('%c⚔️ Opening Arsenal Mode', 'color: #1DA1F2; font-weight: bold');
    
    // Dispatch custom event that the content script will listen for
    const event = new CustomEvent('tweetcraft:open-arsenal');
    document.dispatchEvent(event);
    
    // Alternative: Click the Arsenal button if it exists
    const arsenalButton = document.querySelector('.arsenal-mode-btn') as HTMLElement;
    if (arsenalButton) {
      arsenalButton.click();
    }
  }

  /**
   * Switch to a specific tab
   */
  private static switchToTab(tabAction: string): void {
    const tabMap: Record<string, string> = {
      'tab_personas': 'personas',
      'tab_all': 'grid', 
      'tab_smart': 'smart',
      'tab_favorites': 'favorites',
      'tab_custom': 'custom',
      'tab_compose': 'compose',
      'tab_stats': 'stats',
      'tab_weekly': 'weekly',
      'tab_timing': 'timing',
      'tab_trending': 'trending',
      'tab_engagement': 'engagement',
      'tab_abtest': 'abtest',
      'tab_cache': 'cache'
    };

    const tabName = tabMap[tabAction];
    if (!tabName) return;

    console.log(`%c📋 Switching to ${tabName} tab`, 'color: #9146FF; font-weight: bold');
    
    // Click the corresponding tab button
    const tabButton = document.querySelector(`[data-view="${tabName}"]`) as HTMLElement;
    if (tabButton) {
      tabButton.click();
    }
  }

  /**
   * Trigger export functionality
   */
  private static triggerExport(exportType: string): void {
    console.log(`%c📤 Triggering ${exportType} export`, 'color: #17BF63; font-weight: bold');
    
    // Dispatch custom event for export
    const event = new CustomEvent('tweetcraft:trigger-export', {
      detail: { type: exportType }
    });
    document.dispatchEvent(event);
  }

  /**
   * Show weekly summary
   */
  private static showWeeklySummary(): void {
    console.log('%c📅 Showing weekly summary', 'color: #1DA1F2; font-weight: bold');
    
    // Switch to weekly tab first
    this.switchToTab('tab_weekly');
  }

  /**
   * Run A/B test
   */
  private static runABTest(): void {
    console.log('%c🧪 Running A/B test', 'color: #FFA500; font-weight: bold');
    
    // Switch to A/B test tab and trigger test
    this.switchToTab('tab_abtest');
    
    // Trigger A/B test event
    setTimeout(() => {
      const event = new CustomEvent('tweetcraft:run-ab-test');
      document.dispatchEvent(event);
    }, 200);
  }

  /**
   * Open extension settings
   */
  private static openExtensionSettings(): void {
    console.log('%c⚙️ Opening extension settings', 'color: #1DA1F2; font-weight: bold');
    
    // First try to click the settings button in the UI
    const settingsButton = document.querySelector('.settings-button, [data-action="settings"]') as HTMLElement;
    if (settingsButton) {
      settingsButton.click();
      return;
    }

    // Fallback: Open Chrome extension options page
    if (chrome?.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      // Last resort: show in-page notification
      this.showNotification('⚙️ Right-click extension icon → Options to access settings');
    }
  }

  /**
   * Navigate between tabs
   */
  private static navigateTab(direction: number): void {
    const tabs = ['personas', 'grid', 'smart', 'favorites', 'custom', 'compose', 'stats', 'weekly', 'timing', 'trending', 'engagement', 'abtest', 'cache'];
    
    // Find current active tab
    const activeTab = document.querySelector('.tab-btn.active') as HTMLElement;
    if (!activeTab) return;
    
    const currentView = activeTab.getAttribute('data-view');
    const currentIndex = tabs.indexOf(currentView || '');
    if (currentIndex === -1) return;
    
    // Calculate next tab index
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = tabs.length - 1;
    if (nextIndex >= tabs.length) nextIndex = 0;
    
    // Click the next tab
    const nextTab = document.querySelector(`[data-view="${tabs[nextIndex]}"]`) as HTMLElement;
    if (nextTab) {
      console.log(`%c🔄 Navigating to ${tabs[nextIndex]} tab`, 'color: #9146FF');
      nextTab.click();
    }
  }

  /**
   * Cycle to next tab
   */
  private static cycleToNextTab(): void {
    this.navigateTab(1);
  }

  /**
   * Show keyboard shortcuts help
   */
  private static showKeyboardHelp(): void {
    console.log('%c❓ Showing keyboard shortcuts help', 'color: #1DA1F2; font-weight: bold');
    
    const shortcuts = this.getShortcuts();
    const helpText = shortcuts.map(s => {
      const keys = [];
      if (s.ctrl) keys.push('Ctrl');
      if (s.alt) keys.push('Alt'); 
      if (s.shift) keys.push('Shift');
      keys.push(s.key);
      return `${keys.join('+')} - ${s.description}`;
    }).join('\n');
    
    // Create help modal
    const modal = document.createElement('div');
    modal.className = 'tweetcraft-help-modal';
    modal.innerHTML = `
      <div class="help-modal-content">
        <div class="help-modal-header">
          <h3>⌨️ TweetCraft Keyboard Shortcuts</h3>
          <button class="help-close">✕</button>
        </div>
        <div class="help-modal-body">
          <pre>${helpText}</pre>
        </div>
      </div>
    `;
    
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    modal.querySelector('.help-modal-content')!.setAttribute('style', `
      background: white;
      border-radius: 8px;
      max-width: 600px;
      max-height: 70vh;
      overflow: auto;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    `);
    
    modal.querySelector('.help-modal-header')!.setAttribute('style', `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e1e8ed;
    `);
    
    modal.querySelector('.help-modal-body')!.setAttribute('style', `
      padding: 20px;
      font-family: monospace;
      font-size: 12px;
      line-height: 1.4;
    `);
    
    modal.querySelector('.help-close')!.setAttribute('style', `
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      padding: 5px;
    `);
    
    document.body.appendChild(modal);
    
    // Close handlers
    const closeModal = () => modal.remove();
    modal.querySelector('.help-close')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    // Auto-close after 10 seconds
    setTimeout(closeModal, 10000);
  }

  /**
   * Toggle UI visibility
   */
  private static toggleUIVisibility(): void {
    console.log('%c👁️ Toggling UI visibility', 'color: #9146FF; font-weight: bold');
    
    const selector = document.querySelector('.tweetcraft-unified-selector') as HTMLElement;
    if (selector) {
      const isHidden = selector.style.display === 'none';
      selector.style.display = isHidden ? '' : 'none';
      this.showNotification(isHidden ? '👁️ UI Shown' : '🙈 UI Hidden');
    }
  }

  /**
   * Focus reply textarea
   */
  private static focusReplyTextarea(): void {
    console.log('%c📝 Focusing reply textarea', 'color: #1DA1F2; font-weight: bold');
    
    const textarea = document.querySelector('[data-testid^="tweetTextarea_"], [placeholder*="reply"], [placeholder*="Tweet"]') as HTMLElement;
    if (textarea) {
      textarea.focus();
      
      // Move cursor to end if there's content
      if (textarea.textContent) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(textarea);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  /**
   * Show brief notification
   */
  private static showNotification(message: string, duration = 2000): void {
    const notification = document.createElement('div');
    notification.className = 'tweetcraft-keyboard-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgb(29, 161, 242);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10000;
      animation: slideInRight 0.3s ease;
      box-shadow: 0 4px 12px rgba(29, 161, 242, 0.3);
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), duration);
  }
  
  /**
   * Cleanup
   */
  static destroy(): void {
    if (this.boundHandleKeydown) {
      document.removeEventListener('keydown', this.boundHandleKeydown, true);
      this.boundHandleKeydown = null;
    }
    this.shortcuts.clear();
    this.callbacks.clear();
    this.isInitialized = false;
  }
}
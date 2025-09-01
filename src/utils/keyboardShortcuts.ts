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
    { key: 'q', alt: true, action: 'quick_generate', description: 'Generate with default tone' },
    { key: 'r', alt: true, action: 'regenerate', description: 'Regenerate with same tone' },
    { key: 't', alt: true, action: 'open_templates', description: 'Open template selector' },
    { key: 's', alt: true, action: 'switch_suggestion', description: 'Switch between suggestions' },
    { key: 'd', alt: true, action: 'open_dropdown', description: 'Open tone dropdown' },
    { key: 'c', alt: true, action: 'copy_reply', description: 'Copy generated reply' },
    { key: 'e', alt: true, action: 'edit_mode', description: 'Edit generated reply' },
    
    // Navigation
    { key: 'ArrowLeft', alt: true, action: 'prev_suggestion', description: 'Previous suggestion' },
    { key: 'ArrowRight', alt: true, action: 'next_suggestion', description: 'Next suggestion' },
    { key: 'Escape', alt: false, action: 'close_all', description: 'Close all dropdowns' }
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
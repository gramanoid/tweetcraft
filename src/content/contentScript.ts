import { DOMUtils } from './domUtils';
// OpenRouter service now handled by service worker
import { StorageService } from '@/services/storage';
import { ReplyGenerationRequest } from '@/types';
import { debounce, throttle } from '@/utils/debounce';
import { ErrorHandler } from '@/utils/errorHandler';
import { globalAsyncManager } from '@/utils/asyncOperationManager';
import { KeyboardShortcutManager } from '@/utils/keyboardShortcuts';
import { TemplateSelector } from './templateSelector';
import { visualFeedback } from '@/ui/visualFeedback';
import './contentScript.scss';

class SmartReplyContentScript {
  private observer: MutationObserver | null = null;
  private processedToolbars = new WeakSet<Element>();
  private port: chrome.runtime.Port | null = null;
  private static readonly VERSION = '0.0.9';
  private isDestroyed = false;
  
  // Store event listener references for proper cleanup
  private eventListeners: Array<() => void> = [];

  constructor() {
    // Check if another instance already exists
    if ((window as any).__smartReplyInstance) {
      console.log('TweetCraft: Previous instance detected, cleaning up...');
      (window as any).__smartReplyInstance.destroy();
    }
    
    // Register this instance
    (window as any).__smartReplyInstance = this;
    
    // Set up cleanup handlers
    this.setupCleanupHandlers();
    
    this.init();
  }

  private async init(): Promise<void> {
    // Check if already destroyed
    if (this.isDestroyed) return;
    
    console.log('%c🚀 TweetCraft v0.0.8', 'color: #1DA1F2; font-weight: bold');
    
    // Show initialization toast
    visualFeedback.showToast('TweetCraft ready! Click AI Reply button on any tweet.', {
      type: 'success',
      duration: 3000,
      position: 'bottom'
    });
    
    // Test DOM selector health
    DOMUtils.testSelectorHealth();
    
    // Initialize keyboard shortcuts
    await KeyboardShortcutManager.init();
    
    // Set up listener for keyboard shortcut events
    this.setupKeyboardShortcutListener();
    
    // Check for previous state recovery
    const recovered = this.attemptStateRecovery();
    if (recovered) {
      console.log('%c✅ State recovered', 'color: #17BF63');
    }
    
    // Establish connection with service worker
    this.connectToServiceWorker();
    
    // Wait for the page to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (!this.isDestroyed) this.startObserving();
      });
    } else {
      this.startObserving();
    }
  }

  private setupKeyboardShortcutListener(): void {
    // Listen for custom events from keyboard shortcuts
    document.addEventListener('tweetcraft:generate-reply', ((event: Event) => {
      const customEvent = event as CustomEvent;
      const { tone, bypassCache, regenerate } = customEvent.detail;
      
      // Find the reply textarea
      const textarea = DOMUtils.findWithFallback('replyTextarea');
      if (!textarea) {
        console.warn('Smart Reply: No reply textarea found for keyboard shortcut');
        return;
      }
      
      // Find the AI Reply button
      const button = document.querySelector('.smart-reply-btn') as HTMLElement;
      if (!button) {
        console.warn('Smart Reply: AI Reply button not found for keyboard shortcut');
        return;
      }
      
      // Extract context
      const context = DOMUtils.extractTwitterContext(textarea);
      
      // Save the tone for future use
      sessionStorage.setItem('tweetcraft_last_tone', tone);
      
      // Trigger generation with HTMLElement cast
      this.generateReply(textarea as HTMLElement, context, tone, bypassCache || regenerate);
    }) as EventListener);
  }

  private setupCleanupHandlers(): void {
    // Enhanced cleanup with state persistence for context recovery
    const handleNavigation = () => {
      if (!this.isDestroyed) {
        console.log('%c🔄 NAVIGATION DETECTED', 'color: #1DA1F2; font-weight: bold; font-size: 14px');
        console.log('%c  URL:', 'color: #657786', window.location.href);
        console.log('%c  Clearing processed toolbars...', 'color: #657786');
        
        // Clear processed toolbars for the new page
        this.processedToolbars = new WeakSet<Element>();
        
        // Reset retry count and attempt injection after navigation
        this.initialRetryCount = 0;
        
        // Give the new page time to load - increased delay for Twitter's dynamic loading
        setTimeout(() => {
          if (!this.isDestroyed) {
            console.log('%c  Re-attempting injection after navigation...', 'color: #17BF63');
            this.attemptInitialInjection();
            
            // Also trigger a manual scan after a bit more delay
            setTimeout(() => {
              if (!this.isDestroyed) {
                this.manualToolbarScan();
              }
            }, 1000);
          }
        }, 800);
      }
    };
    
    // Listen for various navigation events
    window.addEventListener('beforeunload', handleNavigation);
    window.addEventListener('pagehide', handleNavigation);
    
    // Listen for history changes (Twitter is an SPA)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      handleNavigation();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      handleNavigation();
    };
    
    window.addEventListener('popstate', handleNavigation);
    
    // Store cleanup functions for later
    (this as any).cleanupFunctions = [
      () => window.removeEventListener('beforeunload', handleNavigation),
      () => window.removeEventListener('pagehide', handleNavigation),
      () => window.removeEventListener('popstate', handleNavigation),
      () => { history.pushState = originalPushState; },
      () => { history.replaceState = originalReplaceState; }
    ];
  }

  /**
   * Save critical state to sessionStorage for recovery after context invalidation
   */
  private saveStateForRecovery(): void {
    try {
      const recoveryState = {
        timestamp: Date.now(),
        url: window.location.href,
        version: SmartReplyContentScript.VERSION,
        processedCount: this.processedToolbars ? 1 : 0, // WeakSet can't be serialized
        isDestroyed: this.isDestroyed
      };
      
      sessionStorage.setItem('tweetcraft_recovery_state', JSON.stringify(recoveryState));
      console.log('%c💾 State saved for recovery', 'color: #17BF63');
    } catch (error) {
      console.warn('%c⚠️ Failed to save recovery state:', 'color: #FFA500', error);
    }
  }

  /**
   * Attempt to restore state from sessionStorage after context recovery
   */
  private attemptStateRecovery(): boolean {
    try {
      const savedStateJson = sessionStorage.getItem('tweetcraft_recovery_state');
      if (!savedStateJson) return false;
      
      const savedState = JSON.parse(savedStateJson);
      const timeDiff = Date.now() - savedState.timestamp;
      
      // Only recover if state was saved within the last 2 minutes
      if (timeDiff > 120000) {
        sessionStorage.removeItem('tweetcraft_recovery_state');
        return false;
      }
      
      console.log('%c🔄 Smart Reply: Recovering from saved state', 'color: #1DA1F2; font-weight: bold');
      console.log('%c  Saved:', 'color: #657786', new Date(savedState.timestamp).toLocaleTimeString());
      console.log('%c  URL match:', 'color: #657786', savedState.url === window.location.href);
      
      // Clear the saved state
      sessionStorage.removeItem('tweetcraft_recovery_state');
      return true;
    } catch (error) {
      console.warn('%c⚠️ State recovery failed:', 'color: #FFA500', error);
      sessionStorage.removeItem('tweetcraft_recovery_state');
      return false;
    }
  }

  private connectToServiceWorker(): void {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.log('Smart Reply: Extension context invalidated, cleaning up...');
        this.destroy();
        return;
      }
      
      this.port = chrome.runtime.connect({ name: 'content-script' });
      
      this.port.onDisconnect.addListener(() => {
        // Check if it's an invalidation error
        const error = chrome.runtime.lastError;
        if (error?.message?.includes('Extension context invalidated')) {
          console.log('Smart Reply: Extension was reloaded, cleaning up old instance...');
          this.destroy();
          return;
        }
        
        // Otherwise try silent reconnection
        this.port = null;
        setTimeout(() => this.connectToServiceWorker(), 1000);
      });
    } catch (error: any) {
      // Check for context invalidation
      if (error?.message?.includes('Extension context invalidated')) {
        console.log('Smart Reply: Extension context invalidated, stopping reconnection attempts');
        this.destroy();
        return;
      }
      
      // Only log actual errors, not context invalidation
      if (!error?.message?.includes('context invalidated')) {
        console.error('Smart Reply: Connection error:', error);
      }
      
      setTimeout(() => this.connectToServiceWorker(), 5000);
    }
  }

  private initialRetryCount = 0;
  private maxInitialRetries = 10;
  private initialRetryDelay = 500;

  private startObserving(): void {
    // Find the React root element
    const reactRoot = document.querySelector('#react-root');
    if (!reactRoot) {
      // Silently retry
      setTimeout(() => {
        if (!this.isDestroyed) this.startObserving();
      }, 1000);
      return;
    }

    // Attempt initial injection with retries
    this.attemptInitialInjection();

    // Create debounced handler for processing mutations with reduced frequency
    const debouncedMutationHandler = debounce(() => {
      // Only process if we're on a page that likely has toolbars
      if (!window.location.pathname.includes('/status/') && 
          !document.querySelector('article[data-testid="tweet"]') &&
          !window.location.pathname.includes('/compose/tweet')) {
        return; // Skip processing on non-tweet pages
      }
      
      const toolbarsToProcess = new Set<Element>();
      
      // Find all unprocessed toolbars
      // Use resilient selector to find all toolbars
      const toolbars: Element[] = [];
      // First try primary selector for all
      document.querySelectorAll(DOMUtils.TOOLBAR_SELECTOR).forEach(toolbar => {
        toolbars.push(toolbar);
      });
      // If none found, try fallbacks
      if (toolbars.length === 0) {
        const toolbar = DOMUtils.findWithFallback('toolbar');
        if (toolbar) toolbars.push(toolbar);
      }
      
      toolbars.forEach(toolbar => {
        if (!this.processedToolbars.has(toolbar)) {
          toolbarsToProcess.add(toolbar);
        }
      });
      
      // Process all found toolbars
      toolbarsToProcess.forEach(toolbar => {
        this.handleToolbarAdded(toolbar);
      });
    }, 100); // Reduced to 100ms for instant button appearance

    // Set up mutation observer to detect new toolbars
    this.observer = new MutationObserver((mutations) => {
      // Just trigger the debounced handler, don't process mutations directly
      debouncedMutationHandler();
    });

    this.observer.observe(reactRoot, {
      childList: true,
      subtree: true
    });

    // Process existing toolbars
    const existingToolbars = document.querySelectorAll(DOMUtils.TOOLBAR_SELECTOR);
    existingToolbars.forEach(toolbar => this.handleToolbarAdded(toolbar));
  }

  private async handleToolbarAdded(toolbarElement: Element): Promise<void> {
    // Avoid processing the same toolbar multiple times
    if (this.processedToolbars.has(toolbarElement)) {
      return;
    }

    // Check if button already exists in this toolbar
    if (toolbarElement.querySelector('.smart-reply-container')) {
      this.processedToolbars.add(toolbarElement);
      return;
    }

    // CRITICAL: Only process toolbars that are in reply/compose contexts
    // Check if this toolbar is associated with a reply or compose action
    const isReplyContext = this.isReplyToolbar(toolbarElement);
    if (!isReplyContext) {
      // This is a regular tweet toolbar (like, retweet, etc.) - ignore it
      this.processedToolbars.add(toolbarElement);
      return;
    }

    console.log('%c🎯 Reply toolbar detected', 'color: #17BF63; font-weight: bold');
    this.processedToolbars.add(toolbarElement);

    // Now we know this is a reply context, so a textarea SHOULD exist
    const textarea = DOMUtils.findClosestTextarea(toolbarElement);
    if (!textarea) {
      // This is unexpected in a reply context, but handle gracefully
      console.warn('TweetCraft: Reply toolbar found but no textarea available yet');
      return;
    }

    // Extract Twitter context
    const context = DOMUtils.extractTwitterContext(toolbarElement);
    
    // Create and inject the Smart Reply button
    console.log('%c➕ Injecting AI Reply button', 'color: #1DA1F2');
    await this.injectSmartReplyButton(toolbarElement, textarea, context);
  }

  /**
   * Determine if a toolbar is in a reply/compose context
   */
  private isReplyToolbar(toolbarElement: Element): boolean {
    // Strategy: Look for specific indicators of a reply composition toolbar
    // vs a tweet's action bar (reply, retweet, like buttons)
    
    // 1. Check if toolbar contains a "Reply" button (submit button for replies)
    // This is different from the reply action button in tweets
    const hasReplySubmitButton = toolbarElement.querySelector('div[data-testid="tweetButton"], div[data-testid="tweetButtonInline"], button[data-testid="tweetButton"], button[data-testid="tweetButtonInline"]');
    if (hasReplySubmitButton) {
      // This is definitely a reply composition toolbar
      return true;
    }
    
    // 2. Check if we're in a reply modal or compose modal
    const modal = toolbarElement.closest('[role="dialog"], [data-testid="reply"]');
    if (modal) {
      // Additional check: modal should have a textarea
      const modalTextarea = modal.querySelector('[data-testid^="tweetTextarea_"], [contenteditable="true"][role="textbox"]');
      return !!modalTextarea;
    }
    
    // 3. Check URL - compose/tweet paths indicate compose mode
    if (window.location.pathname.includes('/compose/')) return true;
    
    // 4. Check if toolbar is adjacent to a textarea (reply composition pattern)
    // In reply composition, the toolbar and textarea are siblings or close relatives
    const parent = toolbarElement.parentElement;
    if (parent) {
      // Look for textarea as a sibling
      const textarea = parent.querySelector('[data-testid^="tweetTextarea_"], [contenteditable="true"][role="textbox"]');
      if (textarea) {
        // Make sure this textarea is for composing, not displaying
        const isEditable = textarea.getAttribute('contenteditable') === 'true';
        if (isEditable) {
          return true;
        }
      }
    }
    
    // 5. Check for reply composition container patterns
    // Reply areas often have specific container structures
    const replyContainer = toolbarElement.closest('[data-testid="inline-reply"], [data-testid="reply-composer"], div[aria-label*="reply" i], div[aria-label*="compose" i]');
    if (replyContainer) {
      return true;
    }
    
    // 6. Check if toolbar has the specific action buttons of a tweet (negative indicator)
    // Tweet action bars have reply, retweet, like buttons with specific data-testids
    const hasLikeButton = toolbarElement.querySelector('[data-testid="like"], [data-testid="unlike"]');
    const hasRetweetButton = toolbarElement.querySelector('[data-testid="retweet"], [data-testid="unretweet"]');
    if (hasLikeButton || hasRetweetButton) {
      // This is a tweet's action bar, not a reply toolbar
      return false;
    }
    
    // 7. Final check: Look for "Post your reply" or similar placeholder text
    const placeholderText = parent?.querySelector('[data-text="true"], [data-placeholder="true"]');
    if (placeholderText?.textContent?.toLowerCase().includes('reply')) {
      return true;
    }
    
    // Default: not a reply toolbar
    return false;
  }

  private async injectSmartReplyButton(
    toolbarElement: Element, 
    textarea: HTMLElement, 
    context: any
  ): Promise<void> {
    // Directly perform the injection
    await this.performSmartReplyInjection(toolbarElement, textarea, context);
  }

  private async performSmartReplyInjection(
    toolbarElement: Element, 
    textarea: HTMLElement, 
    context: any
  ): Promise<void> {
    try {
      // Create the button container
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'smart-reply-container';

      // Check if there's existing text to determine initial mode
      const hasText = DOMUtils.hasUserText(textarea);
      
      // Create the main button with appropriate mode
      const button = DOMUtils.createSmartReplyButton(hasText);
      
      console.log('%c🔧 BUTTON INJECTION', 'color: #1DA1F2; font-weight: bold; font-size: 14px');
      console.log('%c  Has existing text:', 'color: #657786', hasText);
      console.log('%c  Initial mode:', 'color: #657786', hasText ? 'REWRITE' : 'GENERATE');
      console.log('%c  Toolbar found:', 'color: #657786', !!toolbarElement);
      console.log('%c  Textarea found:', 'color: #657786', !!textarea);
      
      // Monitor textarea for changes to update button mode
      const updateButtonMode = () => {
        const currentHasText = DOMUtils.hasUserText(textarea);
        const currentMode = button.getAttribute('data-mode');
        const shouldBeRewrite = currentHasText;
        const isRewrite = currentMode === 'rewrite';
        
        if (shouldBeRewrite !== isRewrite) {
          // Mode needs to change
          console.log('%c🔄 Button mode change:', 'color: #9146FF', shouldBeRewrite ? 'REWRITE' : 'GENERATE');
          
          if (shouldBeRewrite) {
            button.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
                <path d="M13 17.5v2h5v-2h-5zm0-12v2h7v-2h-7zm0 6v2h7v-2h-7z" opacity="0.7"/>
              </svg>
              <span>AI Rewrite ✨</span>
            `;
            button.setAttribute('title', 'Rewrite your draft with AI');
            button.setAttribute('data-mode', 'rewrite');
          } else {
            button.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>AI Reply</span>
            `;
            button.setAttribute('title', 'Generate AI reply');
            button.setAttribute('data-mode', 'generate');
          }
        }
      };
      
      // Set up observer for textarea changes
      const textObserver = new MutationObserver(() => {
        updateButtonMode();
      });
      
      textObserver.observe(textarea, {
        childList: true,
        characterData: true,
        subtree: true
      });
      
      // Also listen for input events
      textarea.addEventListener('input', updateButtonMode);
      textarea.addEventListener('paste', () => {
        setTimeout(updateButtonMode, 100);
      });
      
      // Store cleanup function
      this.eventListeners.push(() => {
        textObserver.disconnect();
        textarea.removeEventListener('input', updateButtonMode);
      });
      
      // Create template selector instance
      const templateSelector = new TemplateSelector();

      // Add click handler for the main button
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Stop all other handlers
        
        // Visual feedback for button click
        visualFeedback.pulse(button, '#1d9bf0');
        
        // Check if a tone was set (e.g., from keyboard shortcut)
        const presetTone = button.getAttribute('data-tone');
        const bypassCache = button.getAttribute('data-bypass-cache') === 'true';
        
        if (presetTone) {
          // Remove the attributes so next click shows dropdown
          button.removeAttribute('data-tone');
          button.removeAttribute('data-bypass-cache');
          // Check if we're in rewrite mode
          const isRewriteMode = button.getAttribute('data-mode') === 'rewrite';
          // Generate directly with the preset tone
          this.generateReply(textarea, context, presetTone, bypassCache, isRewriteMode);
          return;
        }
        
        // Check if we're in rewrite mode
        const isRewriteMode = button.getAttribute('data-mode') === 'rewrite';
        
        // Show template selector
        templateSelector.show(button, (template, tone) => {
          // When both template and tone are selected, generate/rewrite
          console.log('%c🔨 BUILDING COMBINED PROMPT', 'color: #FF6B6B; font-weight: bold; font-size: 14px');
          console.log('%c  Mode:', 'color: #657786', isRewriteMode ? 'REWRITE' : 'GENERATE');
          
          if (isRewriteMode) {
            const existingText = DOMUtils.getTextFromTextarea(textarea);
            console.log('%c  Existing Text:', 'color: #657786', existingText.substring(0, 100) + (existingText.length > 100 ? '...' : ''));
          }
          
          console.log('%c  Template Selected:', 'color: #657786');
          console.log(`%c    ${template.emoji} ${template.name}`, 'color: #1DA1F2');
          console.log('%c    Prompt:', 'color: #8899a6', template.prompt);
          console.log('%c  Tone Selected:', 'color: #657786');
          console.log(`%c    ${tone.emoji} ${tone.label}`, 'color: #9146FF');
          console.log('%c    System Prompt:', 'color: #8899a6', tone.systemPrompt);
          
          // Show toast for selection
          visualFeedback.showToast(`Selected: ${template.emoji} ${template.name} with ${tone.emoji} ${tone.label}`, {
            type: 'info',
            duration: 2000
          });
          
          // Combine template prompt with tone system prompt
          const combinedPrompt = `${tone.systemPrompt}. ${template.prompt}`;
          
          console.log('%c  ✨ COMBINED PROMPT:', 'color: #17BF63; font-weight: bold');
          console.log(`%c    "${combinedPrompt}"`, 'color: #17BF63');
          console.log('%c════════════════════════════════', 'color: #2E3236');
          
          // Generate or rewrite using the combined instruction
          this.generateReply(textarea, context, combinedPrompt, bypassCache, isRewriteMode);
        });
        
        return false; // Prevent any default action
      }, true); // Use capture phase

      // Assemble the components
      buttonContainer.appendChild(button);

      // Find the right place to inject the button
      // Look for the container that has the tweet button and other toolbar items
      const tweetButton = toolbarElement.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
      
      if (tweetButton && tweetButton.parentElement) {
        // Insert before the tweet/reply button for better positioning
        const toolbarItemsContainer = tweetButton.parentElement;
        
        // Find if there are other toolbar items (emoji, gif buttons etc)
        const toolbarItems = toolbarItemsContainer.querySelector('div[role="group"], div[aria-label]');
        
        console.log('%c✅ AI BUTTON POSITIONING', 'color: #17BF63; font-weight: bold; font-size: 14px');
        console.log('%c  Tweet button found:', 'color: #657786', !!tweetButton);
        console.log('%c  Other toolbar items:', 'color: #657786', !!toolbarItems);
        console.log('%c  Inserting before tweet button', 'color: #657786');
        
        if (toolbarItems) {
          // Insert after the toolbar items but before the tweet button
          toolbarItemsContainer.insertBefore(buttonContainer, tweetButton);
        } else {
          // Just insert before the tweet button
          toolbarItemsContainer.insertBefore(buttonContainer, tweetButton);
        }
        
        // Only log on first injection
        if (!document.querySelector('.smart-reply-container:nth-of-type(2)')) {
          console.log('Smart Reply: Ready');
        }
      } else {
        // Fallback: try to find a suitable container
        const toolbarContainer = toolbarElement.querySelector('div > div');
        if (toolbarContainer) {
          // Look for existing items to insert before
          const existingItems = toolbarContainer.children;
          if (existingItems.length > 0) {
            // Insert before the last item (usually the tweet button)
            toolbarContainer.insertBefore(buttonContainer, existingItems[existingItems.length - 1]);
          } else {
            toolbarContainer.appendChild(buttonContainer);
          }
        } else {
          console.warn('Smart Reply: Could not find suitable toolbar container');
        }
      }

    } catch (error) {
      console.error('Smart Reply: Failed to inject button:', error);
    }
  }

  private async generateReply(
    textarea: HTMLElement, 
    context: any, 
    tone?: string,
    bypassCache: boolean = false,
    isRewriteMode: boolean = false
  ): Promise<void> {
    // Use AsyncOperationManager to prevent race conditions
    const operationKey = `generate_reply_${context.tweetId || 'unknown'}_${tone || 'default'}_${isRewriteMode ? 'rewrite' : 'generate'}`;
    
    try {
      await globalAsyncManager.execute(operationKey, async (signal: AbortSignal) => {
        return this.performReplyGeneration(textarea, context, tone, signal, bypassCache, isRewriteMode);
      });
    } catch (error) {
      if ((error as Error).message.includes('cancelled')) {
        console.log('%c⏹️ Reply generation cancelled due to new request', 'color: #FFA500; font-weight: bold');
        return;
      }
      // Re-throw other errors to be handled by the UI
      throw error;
    }
  }

  private async performReplyGeneration(
    textarea: HTMLElement, 
    context: any, 
    tone: string | undefined,
    signal: AbortSignal,
    bypassCache: boolean = false,
    isRewriteMode: boolean = false
  ): Promise<void> {
    // Generate operation key for tracking
    const operationKey = `generate_reply_${context.tweetId || 'unknown'}_${tone || 'default'}`;
    
    // Find the button to show loading state
    const container = textarea.closest('[role="dialog"], [role="main"]')?.querySelector('.smart-reply-container');
    const button = container?.querySelector('.smart-reply-btn') as HTMLElement;
    
    if (!button) {
      console.error('Smart Reply: Button not found for loading state');
      return;
    }

    try {
      // Check for cancellation before starting
      if (signal.aborted) {
        throw new Error('Operation was cancelled before starting');
      }

      // Show visual loading state
      const loadingText = isRewriteMode ? 'Rewriting your draft...' : 'Generating AI reply...';
      visualFeedback.showLoading(loadingText);
      DOMUtils.showLoadingState(button, isRewriteMode ? 'Rewriting' : 'Generating');
      console.log(`%c🚀 Smart Reply: Starting ${isRewriteMode ? 'rewrite' : 'generation'} with tone:`, 'color: #1DA1F2; font-weight: bold', tone);
      
      // Check if API key is configured (with cancellation check)
      if (signal.aborted) throw new Error('Operation cancelled');
      const apiKey = await StorageService.getApiKey();
      if (!apiKey) {
        visualFeedback.hideLoading();
        visualFeedback.showError(button, 'Please configure your API key in the extension popup');
        DOMUtils.showError(button, 'Please configure your API key in the extension popup', 'api');
        console.error('%c❌ Smart Reply: No API key configured', 'color: #DC3545; font-weight: bold');
        return;
      }

      // Check for cancellation before preparing request
      if (signal.aborted) throw new Error('Operation cancelled');
      
      // Parse reply length from tone if it contains the modifier
      let actualTone = tone;
      let replyLength: 'short' | 'medium' | 'long' | undefined;
      
      if (tone && tone.includes('replyLength:')) {
        const match = tone.match(/replyLength:(short|medium|long)/);
        if (match) {
          replyLength = match[1] as 'short' | 'medium' | 'long';
          // Remove the replyLength modifier from the tone string
          actualTone = tone.replace(/replyLength:(short|medium|long)/, '').trim();
        }
      }
      
      // Get existing text if in rewrite mode
      let existingText: string | undefined;
      if (isRewriteMode) {
        existingText = DOMUtils.getTextFromTextarea(textarea);
        if (!existingText) {
          visualFeedback.hideLoading();
          visualFeedback.showError(button, 'No text to rewrite');
          DOMUtils.showError(button, 'No text to rewrite', 'api');
          console.error('%c❌ No text to rewrite', 'color: #DC3545; font-weight: bold');
          return;
        }
      }
      
      // Prepare the request
      const request: ReplyGenerationRequest = {
        originalTweet: context.tweetText,
        tone: actualTone,
        isRewriteMode,
        existingText
      };

      // Add reply length if specified in tone or use default from config
      if (replyLength) {
        request.replyLength = replyLength;
      } else {
        // Get reply length preference from config
        const config = await StorageService.getConfig();
        if (config.replyLengthDefault) {
          request.replyLength = config.replyLengthDefault;
        }
      }

      console.log('%c📦 CONTENT SCRIPT: REQUEST PREPARED', 'color: #9146FF; font-weight: bold; font-size: 14px');
      console.log('%c  Mode:', 'color: #657786', isRewriteMode ? 'REWRITE' : 'GENERATE');
      if (isRewriteMode && existingText) {
        console.log('%c  Text to Rewrite:', 'color: #657786', existingText.substring(0, 100) + (existingText.length > 100 ? '...' : ''));
      }
      console.log('%c  Original Tweet:', 'color: #657786', request.originalTweet?.substring(0, 100) + '...');
      console.log('%c  Tone/Template:', 'color: #657786', request.tone?.substring(0, 100) + '...');
      console.log('%c  Reply Length:', 'color: #657786', request.replyLength || 'auto');
      console.log('%c  Full Request:', 'color: #9146FF', request);
      console.log('%c  Full Context:', 'color: #9146FF', context);

      // Check for cancellation before API call
      if (signal.aborted) throw new Error('Operation cancelled');
      
      console.log('%c📡 SENDING TO SERVICE WORKER...', 'color: #E1AD01; font-weight: bold');
      
      // Generate the reply through service worker
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_REPLY',
        request,
        context
      });
      
      console.log('%c📨 SERVICE WORKER RESPONSE', 'color: #17BF63; font-weight: bold');
      console.log('%c  Success:', 'color: #657786', response.success);
      console.log('%c  Reply Length:', 'color: #657786', response.reply?.length || 0);
      if (response.error) {
        console.error('%c  Error:', 'color: #DC3545', response.error);
      }

      // Check for cancellation after API call
      if (signal.aborted) throw new Error('Operation cancelled');

      if (response.success && response.reply) {
        
        // Set the generated text in the textarea
        DOMUtils.setTextareaValue(textarea, response.reply);
        
        // Update character count
        DOMUtils.updateCharCount(response.reply.length);
        
        console.log('Smart Reply: Reply generated successfully:', response.reply);
        
        // Hide loading and show success
        visualFeedback.hideLoading();
        visualFeedback.showSuccess(button, isRewriteMode ? 'Draft rewritten!' : 'Reply generated!');
        visualFeedback.pulse(button, '#17BF63');
        
        // Reset button to normal state
        DOMUtils.hideLoadingState(button);
        
        // Close dropdown after successful generation
        const dropdown = document.querySelector('.smart-reply-dropdown') as HTMLElement;
        if (dropdown) {
          setTimeout(() => {
            dropdown.style.display = 'none';
            // Note: Scroll listener is already properly managed by updateDropdownPosition
          }, 500); // Small delay to show the completion
        }
        
        // Listen for further edits to update char count
        const updateCount = () => {
          const currentText = textarea.textContent || '';
          DOMUtils.updateCharCount(currentText.length);
        };
        textarea.addEventListener('input', updateCount);
        
        // Store for cleanup
        this.eventListeners.push(
          () => textarea.removeEventListener('input', updateCount)
        );
        
        // Store the listener for cleanup
        textarea.setAttribute('data-smart-reply-listener', 'true');
      } else {
        // Hide loading and show error
        visualFeedback.hideLoading();
        visualFeedback.showError(button, response.error || 'Failed to generate reply');
        
        // Reset button and show error
        DOMUtils.hideLoadingState(button);
        
        // Use enhanced error handling for API failures
        const apiError = new Error(response.error || 'Failed to generate reply');
        ErrorHandler.handleUserFriendlyError(
          apiError,
          {
            action: 'api_response_failure',
            component: 'SmartReplyContentScript',
            retryAction: () => this.generateReply(textarea, context, tone),
            metadata: { tone, apiError: response.error }
          },
          button
        );
        console.error('Smart Reply: Generation failed:', response.error);
      }

    } catch (error) {
      // Handle cancellation gracefully
      if ((error as Error).message.includes('cancelled')) {
        console.log('%c⏹️ Operation cancelled during generation', 'color: #657786');
        visualFeedback.hideLoading();
        DOMUtils.hideLoadingState(button);
        return; // Don't show error UI for cancellations
      }
      
      // Hide loading and show error
      visualFeedback.hideLoading();
      visualFeedback.showError(button, (error as Error).message || 'An error occurred');
      
      // Reset button on error
      DOMUtils.hideLoadingState(button);
      
      // Use enhanced error handling with recovery actions
      const recoveryActions = ErrorHandler.handleUserFriendlyError(
        error as Error,
        {
          action: 'generate_reply',
          component: 'SmartReplyContentScript',
          retryAction: () => this.generateReply(textarea, context, tone),
          metadata: { tone, tweetText: context.tweetText }
        },
        button
      );
      
      // Log the recovery actions for debugging
      console.log('%c🔧 Recovery actions available:', 'color: #FFA500', recoveryActions);
    } finally {
      // Loading states are handled by LoadingStateManager
    }
  }

  public destroy(): void {
    // Prevent multiple destroy calls
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    
    console.log('%c🗑️ Smart Reply: Content script destroyed', 'color: #DC3545; font-weight: bold');
    
    // Clean up all stored event listeners
    console.log(`%c  Cleaning up ${this.eventListeners.length} stored event listeners`, 'color: #657786');
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
    
    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Cleanup keyboard shortcuts
    KeyboardShortcutManager.destroy();
    
    // Disconnect port
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
    
    // Run all cleanup functions
    const cleanupFunctions = (this as any).cleanupFunctions || [];
    cleanupFunctions.forEach((cleanup: Function) => {
      try {
        cleanup();
      } catch (error) {
        console.error('Smart Reply: Error during cleanup:', error);
      }
    });
    
    // Remove all injected buttons and dropdowns
    document.querySelectorAll('.smart-reply-container').forEach(el => el.remove());
    document.querySelectorAll('.smart-reply-dropdown').forEach(el => el.remove());
    
    // Remove event listeners from buttons by cloning (legacy cleanup)
    document.querySelectorAll('.smart-reply-button').forEach(button => {
      const newButton = button.cloneNode(true);
      button.parentNode?.replaceChild(newButton, button);
    });
    
    // Clear processed toolbars
    this.processedToolbars = new WeakSet<Element>();
    
    // Unregister this instance
    if ((window as any).__smartReplyInstance === this) {
      delete (window as any).__smartReplyInstance;
    }
  }

  // Feature detection removed - no longer needed
  private detectFeatures(): void {
    // All features are assumed to be available on Twitter/X
    // No longer doing progressive enhancement
  }

  /**
   * Attempt initial injection with retries for hard refresh scenarios
   */
  private attemptInitialInjection(): void {
    // Check if we're on a reply-capable page
    const isStatusPage = window.location.pathname.includes('/status/');
    const hasTweets = document.querySelector('article[data-testid="tweet"]') !== null;
    const isComposePage = window.location.pathname.includes('/compose/');
    const isHomePage = window.location.pathname === '/' || window.location.pathname === '/home';
    const isReplyPage = isStatusPage || hasTweets || isComposePage || isHomePage;
    
    console.log('%c🎯 ATTEMPT INITIAL INJECTION', 'color: #17BF63; font-weight: bold');
    console.log('%c  Page type:', 'color: #657786', {
      status: isStatusPage,
      tweets: hasTweets,
      compose: isComposePage,
      home: isHomePage
    });
    console.log('%c  Retry:', 'color: #657786', `${this.initialRetryCount}/${this.maxInitialRetries}`);
    
    if (!isReplyPage) {
      // Not on a reply page, reset retry count for next time
      this.initialRetryCount = 0;
      console.log('%c  Not a reply-capable page, skipping', 'color: #FFA500');
      return;
    }

    // Try to find and inject buttons
    const toolbars: Element[] = [];
    
    // Try primary selector
    document.querySelectorAll(DOMUtils.TOOLBAR_SELECTOR).forEach(toolbar => {
      toolbars.push(toolbar);
    });
    
    // If none found, try fallbacks
    if (toolbars.length === 0) {
      const toolbar = DOMUtils.findWithFallback('toolbar');
      if (toolbar) toolbars.push(toolbar);
    }

    console.log('%c  Found toolbars:', 'color: #657786', toolbars.length);

    // Process any found toolbars
    if (toolbars.length > 0) {
      let injectedCount = 0;
      toolbars.forEach(toolbar => {
        if (!this.processedToolbars.has(toolbar)) {
          console.log('%c  Processing toolbar...', 'color: #657786');
          this.handleToolbarAdded(toolbar);
          injectedCount++;
        } else {
          console.log('%c  Toolbar already processed', 'color: #FFA500');
        }
      });
      console.log('%c  ✅ Injected buttons:', 'color: #17BF63', injectedCount);
      // Reset retry count on success
      this.initialRetryCount = 0;
    } else if (this.initialRetryCount < this.maxInitialRetries) {
      // Retry with exponential backoff
      this.initialRetryCount++;
      const delay = Math.min(this.initialRetryDelay * Math.pow(1.5, this.initialRetryCount - 1), 5000);
      console.log(`%c⏳ No toolbars found, retrying in ${delay}ms (${this.initialRetryCount}/${this.maxInitialRetries})`, 'color: #FFA500');
      
      setTimeout(() => {
        if (!this.isDestroyed) {
          this.attemptInitialInjection();
        }
      }, delay);
    } else {
      // Max retries reached
      console.log('%c⚠️ Max retries reached, relying on mutation observer', 'color: #DC3545');
      this.initialRetryCount = 0;
    }
  }

  /**
   * Manual toolbar scan for navigation scenarios
   */
  private manualToolbarScan(): void {
    console.log('%c🔍 MANUAL TOOLBAR SCAN', 'color: #9146FF; font-weight: bold');
    
    // Find all toolbars including those that might have been missed
    const allToolbars: Element[] = [];
    
    // Try multiple selectors
    const selectors = [
      DOMUtils.TOOLBAR_SELECTOR,
      '[role="group"][aria-label]',
      'div[data-testid="toolBar"]',
      'div[class*="toolbar"]',
      'div[class*="ToolBar"]'
    ];
    
    selectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(element => {
          // Check if it looks like a toolbar
          if (element.querySelector('button') && !allToolbars.includes(element)) {
            allToolbars.push(element);
          }
        });
      } catch (e) {
        // Ignore selector errors
      }
    });
    
    console.log('%c  Found potential toolbars:', 'color: #657786', allToolbars.length);
    
    let injectedCount = 0;
    allToolbars.forEach(toolbar => {
      if (!this.processedToolbars.has(toolbar) && this.isReplyToolbar(toolbar)) {
        console.log('%c  Injecting into unprocessed toolbar', 'color: #17BF63');
        this.handleToolbarAdded(toolbar);
        injectedCount++;
      }
    });
    
    if (injectedCount > 0) {
      console.log('%c  ✅ Manual scan injected:', 'color: #17BF63', injectedCount);
    } else {
      console.log('%c  No new toolbars to process', 'color: #657786');
    }
  }

  /**
   * Test DOM injection capability
   */
  private testDOMInjection(): boolean {
    try {
      // Test if we can create and inject elements
      const testElement = document.createElement('div');
      testElement.style.display = 'none';
      testElement.setAttribute('data-tweetcraft-test', 'true');
      
      document.body?.appendChild(testElement);
      const found = document.querySelector('[data-tweetcraft-test="true"]');
      
      if (found) {
        found.remove();
        return true;
      }
      return false;
    } catch (error) {
      console.warn('%c  DOM injection test failed:', 'color: #FFA500', error);
      return false;
    }
  }

  /**
   * Test reply detection capability
   */
  private testReplyDetection(): boolean {
    try {
      // Test if we're on Twitter/X and can potentially find reply elements
      // Don't require elements to exist immediately, just test capability
      const isTwitterPage = window.location.hostname.includes('twitter.com') || 
                           window.location.hostname.includes('x.com');
      
      if (!isTwitterPage) return false;
      
      // Test basic DOM query capability for Twitter elements
      const hasBasicTwitterStructure = !!document.querySelector('#react-root, [data-reactroot]');
      
      return hasBasicTwitterStructure;
    } catch (error) {
      console.warn('%c  Reply detection test failed:', 'color: #FFA500', error);
      return false;
    }
  }

  /**
   * Test context extraction capability
   */
  private testContextExtraction(): boolean {
    try {
      // Test if we have the basic capability to extract context
      // Don't require content to be loaded immediately
      const isTwitterPage = window.location.hostname.includes('twitter.com') || 
                           window.location.hostname.includes('x.com');
      
      if (!isTwitterPage) return false;
      
      // Test if we can run basic DOM queries and have access to DOMUtils
      const hasReactRoot = !!document.querySelector('#react-root, [data-reactroot]');
      const canAccessDOMUtils = typeof DOMUtils !== 'undefined';
      
      return hasReactRoot && canAccessDOMUtils;
    } catch (error) {
      console.warn('%c  Context extraction test failed:', 'color: #FFA500', error);
      return false;
    }
  }

  /**
   * Test API communication capability
   */
  private testAPICommunication(): boolean {
    try {
      // Test if chrome runtime is available
      return !!(chrome?.runtime?.id);
    } catch (error) {
      console.warn('%c  API communication test failed:', 'color: #FFA500', error);
      return false;
    }
  }

  /**
   * Test storage access capability
   */
  private testStorageAccess(): boolean {
    try {
      // Test if chrome storage API is available
      return !!(chrome?.storage?.local);
    } catch (error) {
      console.warn('%c  Storage access test failed:', 'color: #FFA500', error);
      return false;
    }
  }

  /**
   * Check if a specific feature is available
   */
  private isFeatureAvailable(featureName: string): boolean {
    // Always return true since we removed progressive enhancement
    return true;
  }

  /**
   * Execute function with graceful degradation
   */
  private withGracefulDegradation<T>(
    featureName: string,
    primaryFunction: () => T,
    fallbackFunction?: () => T,
    fallbackValue?: T
  ): T | undefined {
    if (this.isFeatureAvailable(featureName)) {
      try {
        return primaryFunction();
      } catch (error) {
        console.warn(`%c  Feature ${featureName} failed, attempting fallback:`, 'color: #FFA500', error);
        if (fallbackFunction) {
          try {
            return fallbackFunction();
          } catch (fallbackError) {
            console.warn(`%c  Fallback for ${featureName} also failed:`, 'color: #DC3545', fallbackError);
          }
        }
      }
    } else {
      console.log(`%c  Feature ${featureName} not available, using fallback`, 'color: #657786');
      if (fallbackFunction) {
        try {
          return fallbackFunction();
        } catch (error) {
          console.warn(`%c  Fallback for ${featureName} failed:`, 'color: #DC3545', error);
        }
      }
    }
    
    return fallbackValue;
  }
}

// Initialize the content script
const smartReply = new SmartReplyContentScript();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  smartReply.destroy();
});
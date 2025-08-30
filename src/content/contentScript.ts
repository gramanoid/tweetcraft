import { DOMUtils } from './domUtils';
import { OpenRouterService } from '@/services/openRouter';
import { StorageService } from '@/services/storage';
import { ReplyGenerationRequest } from '@/types';
import { debounce, throttle } from '@/utils/debounce';
import { ErrorHandler } from '@/utils/errorHandler';
import { globalAsyncManager } from '@/utils/asyncOperationManager';
import { KeyboardShortcutManager } from '@/utils/keyboardShortcuts';
import './contentScript.scss';

class SmartReplyContentScript {
  private observer: MutationObserver | null = null;
  private processedToolbars = new WeakSet<Element>();
  private port: chrome.runtime.Port | null = null;
  private static readonly VERSION = '0.0.8';
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
    
    console.log('%c🚀 TweetCraft v0.0.7', 'color: #1DA1F2; font-weight: bold');
    
    // Initialize keyboard shortcuts
    await KeyboardShortcutManager.init();
    
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

  private setupCleanupHandlers(): void {
    // Enhanced cleanup with state persistence for context recovery
    const handleNavigation = () => {
      if (!this.isDestroyed) {
        console.log('%c🔄 Smart Reply: Page navigation detected, saving state...', 'color: #FFA500; font-weight: bold');
        this.saveStateForRecovery();
        this.destroy();
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
      document.querySelectorAll(DOMUtils.TOOLBAR_SELECTOR).forEach(toolbar => {
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
    // Check various indicators that this is a reply/compose toolbar
    
    // 1. Check if we're in a reply modal or compose modal (highest priority)
    const modal = toolbarElement.closest('[role="dialog"], [data-testid="reply"], [aria-label*="Compose"], [aria-label*="Reply"], [aria-label*="Tweet"]');
    if (modal) return true;
    
    // 2. Check URL - compose/tweet paths indicate compose mode
    if (window.location.pathname.includes('/compose/')) return true;
    
    // 3. Look for textarea in a wider search area (up and down the DOM)
    // Go up to a reasonable container level then search down
    let searchContainer = toolbarElement.parentElement;
    let levelsUp = 0;
    while (searchContainer && levelsUp < 5) {
      // Check if this container or its children have a textarea
      const textarea = searchContainer.querySelector('[data-testid^="tweetTextarea_"], [contenteditable="true"][role="textbox"]');
      if (textarea) return true;
      
      searchContainer = searchContainer.parentElement;
      levelsUp++;
    }
    
    // 4. Check if toolbar has reply-specific buttons/structure
    // Reply toolbars typically have different button configurations
    const buttons = toolbarElement.querySelectorAll('[role="button"]');
    if (buttons.length >= 4 && buttons.length <= 8) {
      // Reply toolbars usually have 4-8 buttons (emoji, gif, media, location, etc.)
      // Regular tweet toolbars have 3-4 action buttons (reply, retweet, like, share)
      return true;
    }
    
    // This is likely a regular tweet action toolbar, not a reply toolbar
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

      // Create the main button
      const button = DOMUtils.createSmartReplyButton();
      
      // Create the dropdown for tone selection
      const dropdown = await DOMUtils.createToneDropdown((tone: string) => {
        this.generateReply(textarea, context, tone);
      });

      // Function to update dropdown position
      const updateDropdownPosition = () => {
        if (dropdown.style.display === 'block') {
          const rect = button.getBoundingClientRect();
          dropdown.style.position = 'fixed';
          dropdown.style.top = `${rect.bottom + 5}px`;
          dropdown.style.left = `${rect.left}px`;
        }
      };

      // Add click handler for the main button
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Stop all other handlers
        
        // Check if a tone was set (e.g., from keyboard shortcut)
        const presetTone = button.getAttribute('data-tone');
        if (presetTone) {
          // Remove the attribute so next click shows dropdown
          button.removeAttribute('data-tone');
          // Generate directly with the preset tone
          this.generateReply(textarea, context, presetTone);
          return;
        }
        
        // Toggle dropdown visibility
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
          // Position dropdown relative to button
          updateDropdownPosition();
          dropdown.style.zIndex = '10000'; // Higher z-index
          
          // Add scroll listener to update position
          window.addEventListener('scroll', updateDropdownPosition, true);
          
          // Focus first option for keyboard nav
          const firstOption = dropdown.querySelector('.smart-reply-option') as HTMLElement;
          if (firstOption) {
            firstOption.focus();
            firstOption.setAttribute('tabindex', '0');
          }
        } else {
          // Remove scroll listener when closing
          window.removeEventListener('scroll', updateDropdownPosition, true);
        }
        
        return false; // Prevent any default action
      }, true); // Use capture phase

      // Close dropdown when clicking outside or pressing Escape
      document.addEventListener('click', (e) => {
        if (!buttonContainer.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
          dropdown.style.display = 'none';
          // Remove scroll listener
          window.removeEventListener('scroll', updateDropdownPosition, true);
        }
      });
      
      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (dropdown.style.display === 'block') {
          const options = Array.from(dropdown.querySelectorAll('.smart-reply-option')) as HTMLElement[];
          const focusedIndex = options.findIndex(opt => opt === document.activeElement);
          
          switch(e.key) {
            case 'Escape':
              dropdown.style.display = 'none';
              window.removeEventListener('scroll', updateDropdownPosition, true);
              button.focus();
              e.preventDefault();
              break;
            case 'ArrowDown':
              e.preventDefault();
              const nextIndex = focusedIndex < options.length - 1 ? focusedIndex + 1 : 0;
              options[nextIndex]?.focus();
              options[nextIndex]?.setAttribute('tabindex', '0');
              break;
            case 'ArrowUp':
              e.preventDefault();
              const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : options.length - 1;
              options[prevIndex]?.focus();
              options[prevIndex]?.setAttribute('tabindex', '0');
              break;
            case 'Enter':
              if (focusedIndex >= 0) {
                e.preventDefault();
                options[focusedIndex]?.click();
              }
              break;
          }
        }
      });

      // Assemble the components
      buttonContainer.appendChild(button);
      
      // Append dropdown to body to avoid Twitter's event handlers
      document.body.appendChild(dropdown);

      // Find the right place to inject the button
      const toolbarContainer = toolbarElement.querySelector('div');
      if (toolbarContainer) {
        toolbarContainer.appendChild(buttonContainer);
        // Only log on first injection
        if (!document.querySelector('.smart-reply-container:nth-of-type(2)')) {
          console.log('Smart Reply: Ready');
        }
      } else {
        console.warn('Smart Reply: Could not find toolbar container');
      }

    } catch (error) {
      console.error('Smart Reply: Failed to inject button:', error);
    }
  }

  private async generateReply(
    textarea: HTMLElement, 
    context: any, 
    tone?: string
  ): Promise<void> {
    // Use AsyncOperationManager to prevent race conditions
    const operationKey = `generate_reply_${context.tweetId || 'unknown'}_${tone || 'default'}`;
    
    try {
      await globalAsyncManager.execute(operationKey, async (signal: AbortSignal) => {
        return this.performReplyGeneration(textarea, context, tone, signal);
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
    signal: AbortSignal
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

      // Simple loading state
      DOMUtils.showLoadingState(button, 'Generating');
      console.log('%c🚀 Smart Reply: Starting generation with tone:', 'color: #1DA1F2; font-weight: bold', tone);
      
      // Check if API key is configured (with cancellation check)
      if (signal.aborted) throw new Error('Operation cancelled');
      const apiKey = await StorageService.getApiKey();
      if (!apiKey) {
        DOMUtils.showError(button, 'Please configure your API key in the extension popup', 'api');
        console.error('%c❌ Smart Reply: No API key configured', 'color: #DC3545; font-weight: bold');
        return;
      }

      // Check for cancellation before preparing request
      if (signal.aborted) throw new Error('Operation cancelled');
      
      // Prepare the request
      const request: ReplyGenerationRequest = {
        originalTweet: context.tweetText,
        tone: tone
      };

      console.log('%c📦 Smart Reply: Request prepared:', 'color: #9146FF', request);

      // Check for cancellation before API call
      if (signal.aborted) throw new Error('Operation cancelled');

      // Generate the reply with the signal
      const response = await OpenRouterService.generateReply(request, context, signal);

      // Check for cancellation after API call
      if (signal.aborted) throw new Error('Operation cancelled');

      if (response.success && response.reply) {
        
        // Set the generated text in the textarea
        DOMUtils.setTextareaValue(textarea, response.reply);
        
        // Update character count
        DOMUtils.updateCharCount(response.reply.length);
        
        console.log('Smart Reply: Reply generated successfully:', response.reply);
        
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
        DOMUtils.hideLoadingState(button);
        return; // Don't show error UI for cancellations
      }
      
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
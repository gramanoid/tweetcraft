import { DOMUtils } from './domUtils';
import { OpenRouterService } from '@/services/openRouter';
import { StorageService } from '@/services/storage';
import { ReplyGenerationRequest } from '@/types';
import { debounce, throttle } from '@/utils/debounce';
import { ErrorHandler } from '@/utils/errorHandler';
import './contentScript.scss';

class SmartReplyContentScript {
  private observer: MutationObserver | null = null;
  private processedToolbars = new WeakSet<Element>();
  private port: chrome.runtime.Port | null = null;
  private static readonly VERSION = '0.0.5';
  private isDestroyed = false;
  
  // Store event listener references for proper cleanup
  private eventListeners = new Map<string, () => void>();
  
  // Progressive Enhancement System - Feature detection and graceful degradation
  private features = new Map<string, boolean>();
  private readonly CORE_FEATURES = [
    'dom_injection',
    'reply_detection', 
    'context_extraction',
    'api_communication',
    'storage_access'
  ];

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

  private init(): void {
    // Check if already destroyed
    if (this.isDestroyed) return;
    
    console.log('%c🚀 TweetCraft Content Script v0.0.5: Initializing', 'color: #1DA1F2; font-weight: bold');
    console.log('%c  URL:', 'color: #657786', window.location.href);
    
    // Progressive Enhancement: Detect available features
    this.detectFeatures();
    
    // Check for previous state recovery
    const recovered = this.attemptStateRecovery();
    if (recovered) {
      console.log('%c✅ State recovery completed', 'color: #17BF63');
    }
    
    // Establish connection with service worker
    this.connectToServiceWorker();
    
    // Wait for the page to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('%c📄 TweetCraft: DOM ready, starting observation', 'color: #1DA1F2');
        if (!this.isDestroyed) this.startObserving();
      });
    } else {
      console.log('%c📄 TweetCraft: DOM already ready, starting observation', 'color: #1DA1F2');
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
      console.warn('Smart Reply: React root not found, retrying in 1 second...');
      setTimeout(() => {
        if (!this.isDestroyed) this.startObserving();
      }, 1000);
      return;
    }
    
    console.log('Smart Reply: React root found, setting up observer');

    // Create debounced handler for processing mutations
    const debouncedMutationHandler = debounce(() => {
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
    }, 500); // Debounce for 500ms to batch rapid DOM changes

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
    console.log(`Smart Reply: Found ${existingToolbars.length} existing toolbars`);
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

    this.processedToolbars.add(toolbarElement);

    // Find the associated textarea
    const textarea = DOMUtils.findClosestTextarea(toolbarElement);
    if (!textarea) {
      // Silent return - this happens often during Twitter's DOM updates
      return;
    }

    // Extract Twitter context
    const context = DOMUtils.extractTwitterContext(toolbarElement);
    
    // Create and inject the Smart Reply button
    await this.injectSmartReplyButton(toolbarElement, textarea, context);
  }

  private async injectSmartReplyButton(
    toolbarElement: Element, 
    textarea: HTMLElement, 
    context: any
  ): Promise<void> {
    // Use progressive enhancement for DOM injection
    const result = this.withGracefulDegradation(
      'dom_injection',
      () => this.performSmartReplyInjection(toolbarElement, textarea, context),
      () => {
        console.log('%c⚠️ DOM injection unavailable - Smart Reply button cannot be added', 'color: #FFA500; font-weight: bold');
        return Promise.resolve();
      }
    );
    
    if (result instanceof Promise) {
      await result;
    }
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
    // Find the button to show loading state
    const container = textarea.closest('[role="dialog"], [role="main"]')?.querySelector('.smart-reply-container');
    const button = container?.querySelector('.smart-reply-btn') as HTMLElement;
    
    if (!button) {
      console.error('Smart Reply: Button not found for loading state');
      return;
    }

    try {
      // Enhanced loading states with progress
      DOMUtils.showLoadingState(button, 'Preparing');
      console.log('%c🚀 Smart Reply: Starting generation with tone:', 'color: #1DA1F2; font-weight: bold', tone);

      // Brief delay to show first stage
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Check if API key is configured
      DOMUtils.showLoadingState(button, 'Validating API');
      const apiKey = await StorageService.getApiKey();
      if (!apiKey) {
        DOMUtils.showError(button, 'Please configure your API key in the extension popup', 'api');
        console.error('%c❌ Smart Reply: No API key configured', 'color: #DC3545; font-weight: bold');
        return;
      }

      // Prepare the request
      DOMUtils.showLoadingState(button, 'Building Request');
      const request: ReplyGenerationRequest = {
        originalTweet: context.tweetText,
        tone: tone
      };

      console.log('%c📦 Smart Reply: Request prepared:', 'color: #9146FF', request);

      // Generate the reply with final loading state
      DOMUtils.showLoadingState(button, 'Generating AI Reply');
      const response = await OpenRouterService.generateReply(request, context);

      if (response.success && response.reply) {
        // Set the generated text in the textarea
        DOMUtils.setTextareaValue(textarea, response.reply);
        
        // Update character count
        DOMUtils.updateCharCount(response.reply.length);
        
        console.log('Smart Reply: Reply generated successfully:', response.reply);
        
        // Close dropdown after successful generation
        const dropdown = document.querySelector('.smart-reply-dropdown') as HTMLElement;
        if (dropdown) {
          setTimeout(() => {
            dropdown.style.display = 'none';
            // Remove scroll listener
            window.removeEventListener('scroll', () => {}, true);
          }, 500); // Small delay to show the completion
        }
        
        // Listen for further edits to update char count
        const updateCount = () => {
          const currentText = textarea.textContent || '';
          DOMUtils.updateCharCount(currentText.length);
        };
        textarea.addEventListener('input', updateCount);
        
        // Store the listener for cleanup
        textarea.setAttribute('data-smart-reply-listener', 'true');
      } else {
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
      // Hide loading state
      DOMUtils.hideLoadingState(button);
    }
  }

  public destroy(): void {
    // Prevent multiple destroy calls
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    
    console.log('%c🗑️ Smart Reply: Content script destroyed', 'color: #DC3545; font-weight: bold');
    
    // Clean up all stored event listeners
    console.log(`%c  Cleaning up ${this.eventListeners.size} stored event listeners`, 'color: #657786');
    this.eventListeners.clear();
    
    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
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

  /**
   * Progressive Enhancement: Detect available features
   */
  private detectFeatures(): void {
    console.log('%c🔍 PROGRESSIVE ENHANCEMENT: Feature Detection', 'color: #9146FF; font-weight: bold; font-size: 14px');
    
    // Test DOM injection capability
    const domInjection = this.testDOMInjection();
    this.features.set('dom_injection', domInjection);
    
    // Test reply detection capability
    const replyDetection = this.testReplyDetection();
    this.features.set('reply_detection', replyDetection);
    
    // Test context extraction
    const contextExtraction = this.testContextExtraction();
    this.features.set('context_extraction', contextExtraction);
    
    // Test API communication
    const apiCommunication = this.testAPICommunication();
    this.features.set('api_communication', apiCommunication);
    
    // Test storage access
    const storageAccess = this.testStorageAccess();
    this.features.set('storage_access', storageAccess);
    
    // Log feature availability
    const availableFeatures = Array.from(this.features.entries())
      .filter(([_, available]) => available)
      .map(([feature, _]) => feature);
    
    const unavailableFeatures = Array.from(this.features.entries())
      .filter(([_, available]) => !available)
      .map(([feature, _]) => feature);
    
    console.log('%c  ✅ Available Features:', 'color: #17BF63; font-weight: bold', availableFeatures);
    if (unavailableFeatures.length > 0) {
      console.log('%c  ❌ Unavailable Features:', 'color: #DC3545; font-weight: bold', unavailableFeatures);
      console.log('%c  🎯 Graceful degradation will be applied', 'color: #FFA500; font-weight: bold');
    }
    
    // Determine operational mode
    const coreAvailable = this.CORE_FEATURES.every(feature => this.features.get(feature));
    if (coreAvailable) {
      console.log('%c  🚀 Full functionality available', 'color: #1DA1F2; font-weight: bold');
    } else {
      console.log('%c  ⚡ Partial functionality mode', 'color: #FFA500; font-weight: bold');
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
      testElement.dataset.testElement = 'tweetcraft-test';
      
      document.body?.appendChild(testElement);
      const found = document.querySelector('[data-test-element="tweetcraft-test"]');
      
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
      // Test if we can find Twitter reply elements
      const replyButtons = document.querySelectorAll('[data-testid="reply"]');
      const toolbars = document.querySelectorAll('[data-testid="toolBar"], [role="group"]:has(button)');
      
      return replyButtons.length > 0 || toolbars.length > 0;
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
      // Test if we can extract tweet context
      const tweets = document.querySelectorAll('[data-testid="tweet"], [data-testid="tweetText"], article[role="article"]');
      const tweetTexts = document.querySelectorAll('[data-testid="tweetText"], [lang]');
      
      return tweets.length > 0 && tweetTexts.length > 0;
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
    return this.features.get(featureName) ?? false;
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
import { DOMUtils } from './domUtils';
// OpenRouter service now handled by service worker
import { StorageService } from '@/services/storage';
import { ReplyGenerationRequest } from '@/types';
import { debounce } from '@/utils/debounce';
import { ErrorHandler } from '@/utils/errorHandler';
import { globalAsyncManager } from '@/utils/asyncOperationManager';
import { KeyboardShortcutManager } from '@/utils/keyboardShortcuts';
import { selectorAdapter } from './selectorAdapter';
import { visualFeedback } from '@/ui/visualFeedback';
import { templateSuggester } from '@/services/templateSuggester';
import { TEMPLATES } from './presetTemplates';
import { REPLY_OPTIONS } from '@/config/templatesAndTones';
import { imageAttachment } from './imageAttachment';

// Create TONES array for backward compatibility
const TONES = [
  { id: 'professional', emoji: '💼', label: 'Professional', description: 'Professional and formal', systemPrompt: 'Use a professional, formal tone' },
  { id: 'casual', emoji: '😊', label: 'Casual', description: 'Friendly and relaxed', systemPrompt: 'Use a casual, friendly tone' },
  { id: 'witty', emoji: '😄', label: 'Witty', description: 'Humorous and clever', systemPrompt: 'Use a witty, humorous tone' }
];
import { APP_VERSION } from '@/config/version';
import { HypeFuryPlatform, HYPEFURY_SELECTORS } from '@/platforms/hypefury';
import { ProgressiveEnhancement } from '@/utils/progressiveEnhancement';
import { ContextRecovery } from '@/utils/contextRecovery';
import { ContextExtractor, TweetContext } from '@/utils/contextExtractor';
import { visionService, VisionService } from '@/services/visionService';
import './contentScript.scss';

class SmartReplyContentScript {
  private observer: MutationObserver | null = null;
  private processedToolbars = new WeakSet<Element>();
  private port: chrome.runtime.Port | null = null;
  private static readonly VERSION = APP_VERSION;
  private isDestroyed = false;
  private arsenalLoaded = false;
  private arsenalListener: EventListener | null = null;
  
  // Store event listener references for proper cleanup
  private eventListeners: Array<() => void> = [];
  private customEventListeners: Map<string, EventListener> = new Map();
  
  // Configurable cleanup interval
  private cleanupIntervalMs: number = 3000; // Default to 3 seconds
  private cleanupIntervalId: ReturnType<typeof setTimeout> | null = null;

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
    
    // Set up lazy Arsenal Mode loader on demand (Alt+A)
    this.setupArsenalLazyLoader();
    
    // Initialize vision service first
    try {
      await visionService.initialize();
      console.log('%c👁️ Vision service initialized', 'color: #794BC4');
    } catch (error) {
      console.warn('Failed to initialize vision service:', error);
    }
    
    // Initialize Progressive Enhancement System
    const capabilities = await ProgressiveEnhancement.init();
    console.log('%c🔍 Progressive Enhancement initialized', 'color: #9146FF; font-weight: bold', capabilities);
    
    // Initialize Context Recovery System
    ContextRecovery.init({
      autoRecover: true,
      stateExpiration: 3600000, // 1 hour
      checkInterval: 5000 // 5 seconds
    });
    
    // Save initial state
    ContextRecovery.saveState({
      timestamp: Date.now(),
      activeTab: 'all-templates'
    });
    
    // Listen for recovery completion
    window.addEventListener('tweetcraft-recovery-complete', (event: any) => {
      console.log('%c✅ Recovery complete', 'color: #17BF63; font-weight: bold', event.detail);
      // Re-inject buttons after recovery by reinitializing DOM observation
      if (HypeFuryPlatform.isHypeFury()) {
        this.startObservingHypeFury();
      } else {
        // Restart DOM observation for Twitter/X
        this.init();
      }
    });
    
    // Detect platform
    const platform = HypeFuryPlatform.isHypeFury() ? 'HypeFury' : 'Twitter/X';
    console.log(`%c🚀 TweetCraft v${SmartReplyContentScript.VERSION} - ${platform}`, 'color: #1DA1F2; font-weight: bold');
    
    // Apply platform-specific styles if on HypeFury
    if (HypeFuryPlatform.isHypeFury()) {
      HypeFuryPlatform.applyPlatformStyles();
    }
    
    // Show initialization toast
    visualFeedback.showToast(`TweetCraft ready on ${platform}! Click AI Reply button on any post.`, {
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

  private setupArsenalLazyLoader(): void {
    if (this.arsenalListener) return;
    this.arsenalListener = (async (event: Event) => {
      // Only handle once before module sets up its own listeners
      if (!this.arsenalLoaded) {
        try {
          const mod = await import('./arsenalMode');
          this.arsenalLoaded = true;
          console.log('%c⚔️ Arsenal module loaded on demand', 'color: #1DA1F2');
          const textarea = DOMUtils.findWithFallback('replyTextarea') as HTMLElement | null;
          // Open immediately if requested
          const ui = (mod as any).arsenalModeUI;
          if (ui && typeof ui.open === 'function') {
            ui.open(textarea || undefined);
          }
          // After load, the module's own event listener will handle future events
        } catch (e) {
          console.warn('Failed to load Arsenal module', e);
        }
      }
    }) as EventListener;
    document.addEventListener('tweetcraft:open-arsenal', this.arsenalListener, true);
  }

  private setupKeyboardShortcutListener(): void {
    // Create and store the event listener
    const generateReplyListener = ((event: Event) => {
      const customEvent = event as CustomEvent;
      const { tone, bypassCache, regenerate } = customEvent.detail;
      
      // Find the reply textarea
      const textarea = DOMUtils.findWithFallback('replyTextarea');
      if (!textarea) {
        console.warn('Smart Reply: No reply textarea found for keyboard shortcut');
        return;
      }
      
      // Find the AI Reply button (check both class names for platform compatibility)
      const isHypeFury = window.location.hostname === 'app.hypefury.com';
      const buttonSelector = isHypeFury ? '.smart-reply-button' : '.smart-reply-btn';
      const button = document.querySelector(buttonSelector) as HTMLElement;
      if (!button) {
        console.warn('Smart Reply: AI Reply button not found for keyboard shortcut');
        return;
      }
      
      // Extract context
      const context = DOMUtils.extractTwitterContext();
      
      // Save the tone for future use
      sessionStorage.setItem('tweetcraft_last_tone', tone);
      
      // Trigger generation with HTMLElement cast
      const safeContext = {
        ...context,
        tweetText: context.tweetText || '',
        threadContext: context.threadContext?.map(t => t.text) || []
      };
      this.generateReply(textarea as HTMLElement, safeContext, tone, bypassCache || regenerate);
    }) as EventListener;
    
    // Store reference for cleanup
    this.customEventListeners.set('tweetcraft:generate-reply', generateReplyListener);
    
    // Listen for custom events from keyboard shortcuts
    document.addEventListener('tweetcraft:generate-reply', generateReplyListener);
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

  /**
   * Clean up duplicate buttons in the DOM
   */
  private cleanupDuplicateButtons(): void {
    const allButtons = document.querySelectorAll('.smart-reply-container');
    const seenLocations = new Map<string, Element>();
    
    allButtons.forEach(button => {
      // Create a location key based on the nearest reply container
      const replyContainer = button.closest('[data-testid="inline-reply"], [data-testid="reply"], [role="dialog"], [role="group"]');
      if (replyContainer) {
        const locationKey = replyContainer.getAttribute('data-testid') || replyContainer.getAttribute('role') || 'unknown';
        
        if (seenLocations.has(locationKey)) {
          // This is a duplicate, remove it
          console.log('%c🧹 Removing duplicate button', 'color: #FFA500');
          button.remove();
        } else {
          seenLocations.set(locationKey, button);
        }
      }
    });
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
    // Handle HypeFury differently
    if (HypeFuryPlatform.isHypeFury()) {
      this.startObservingHypeFury();
      return;
    }
    
    // Twitter/X logic - Find the React root element
    const reactRoot = document.querySelector('#react-root');
    if (!reactRoot) {
      // Silently retry
      setTimeout(() => {
        if (!this.isDestroyed) this.startObserving();
      }, 1000);
      return;
    }
    
    // Clean up any duplicate buttons before starting
    this.cleanupDuplicateButtons();
    
    // Set up periodic cleanup with configurable interval
    this.cleanupIntervalId = setInterval(() => {
      if (!this.isDestroyed) {
        this.cleanupDuplicateButtons();
      } else {
        if (this.cleanupIntervalId) {
          clearInterval(this.cleanupIntervalId);
          this.cleanupIntervalId = null;
        }
      }
    }, this.cleanupIntervalMs);

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

    // Set up mutation observer to detect new toolbars (with Progressive Enhancement)
    const observerCallback = (mutations: MutationRecord[]) => {
      // Check if mutations are relevant before triggering handler
      const hasRelevantChanges = mutations.some(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any added nodes might contain toolbars
          return Array.from(mutation.addedNodes).some(node => 
            node.nodeType === Node.ELEMENT_NODE && 
            (node as Element).querySelector && 
            ((node as Element).querySelector('[data-testid="toolBar"]') || 
             (node as Element).querySelector('[role="group"]'))
          );
        }
        return false;
      });
      
      // Only trigger handler if relevant changes detected
      if (hasRelevantChanges) {
        debouncedMutationHandler();
      }
    };
    
    // Create observer with Progressive Enhancement fallback
    this.observer = ProgressiveEnhancement.createObserver(observerCallback, {
      childList: true,
      subtree: true
    });
    
    if (this.observer) {
      this.observer.observe(reactRoot, {
        childList: true,
        subtree: true
      });
    } else {
      // Fallback: Listen for custom DOM change events
      window.addEventListener('pe-dom-change', () => {
        debouncedMutationHandler();
      });
    }

    // Process existing toolbars
    const existingToolbars = document.querySelectorAll(DOMUtils.TOOLBAR_SELECTOR);
    existingToolbars.forEach(toolbar => this.handleToolbarAdded(toolbar));
  }

  /**
   * HypeFury-specific observation logic
   */
  private startObservingHypeFury(): void {
    console.log('%c👀 Starting HypeFury observation', 'color: #667eea');
    
    // Debug: Log all textareas found
    const allTextareas = document.querySelectorAll('textarea, [contenteditable="true"]');
    console.log('%c🔍 Initial scan - textareas/editable elements:', 'color: #667eea', allTextareas.length);
    allTextareas.forEach((el, index) => {
      const elem = el as HTMLElement;
      console.log(`  ${index}:`, elem, 'placeholder:', elem.getAttribute('placeholder'), 'class:', elem.className);
    });
    
    // Process initial textareas
    this.processHypeFuryTextareas();
    
    // Set up mutation observer for HypeFury with longer debounce for Vue rendering
    const debouncedHandler = debounce(() => {
      console.log('%c🔄 DOM changed, reprocessing...', 'color: #667eea');
      this.processHypeFuryTextareas();
    }, 500);
    
    // Create observer with Progressive Enhancement fallback for HypeFury
    this.observer = ProgressiveEnhancement.createObserver(() => {
      debouncedHandler();
    }, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['placeholder', 'contenteditable']
    });
    
    // Observe the entire body for HypeFury
    if (this.observer) {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['placeholder', 'contenteditable']
      });
    } else {
      // Fallback: Listen for custom DOM change events
      window.addEventListener('pe-dom-change', () => {
        debouncedHandler();
      });
    }
    
    // Also try processing after a delay for Vue components to load
    setTimeout(() => {
      console.log('%c⏰ Delayed processing for Vue components', 'color: #667eea');
      this.processHypeFuryTextareas();
    }, 2000);
  }
  
  /**
   * Process HypeFury reply textareas
   */
  private processHypeFuryTextareas(): void {
    console.log('%c🔍 Looking for HypeFury textareas...', 'color: #667eea');
    
    // Get ALL textareas first to see what's available
    const allTextareas = document.querySelectorAll('textarea');
    console.log(`%c  Found ${allTextareas.length} total textareas`, 'color: #667eea');
    
    // Filter to only include textareas that are visible and likely for replies
    const replyTextareas = Array.from(allTextareas).filter(textarea => {
      const elem = textarea as HTMLTextAreaElement;
      
      // Log details for debugging
      const placeholder = elem.placeholder || '';
      const isVisible = elem.offsetHeight > 30 && elem.offsetWidth > 100;
      const hasReplyContext = elem.closest('.mention-item, .feed-item, [class*="engagement"], [class*="reply"]');
      
      // Skip if hidden or too small
      if (!isVisible) {
        return false;
      }
      
      // Skip if it's clearly a search/filter/title input
      if (placeholder.toLowerCase().includes('search') || 
          placeholder.toLowerCase().includes('filter') ||
          placeholder.toLowerCase().includes('title') ||
          placeholder.toLowerCase().includes('name')) {
        return false;
      }
      
      // Include if it has reply context OR if it's a general textarea that could be for replies
      // Be more permissive since HypeFury might not have specific placeholders
      return hasReplyContext || (!placeholder || placeholder.length > 20);
    });
    
    console.log(`%c  Filtered to ${replyTextareas.length} potential reply textareas`, 'color: #667eea');
    
    if (replyTextareas.length === 0) {
      console.log('%c⚠️ No suitable reply textareas found', 'color: #FFA500');
      // Log first few textareas for debugging
      allTextareas.forEach((ta, i) => {
        if (i < 3) {
          const elem = ta as HTMLTextAreaElement;
          console.log(`  Textarea ${i}: placeholder="${elem.placeholder}", height=${elem.offsetHeight}, width=${elem.offsetWidth}`);
        }
      });
      return;
    }
    
    // Limit to maximum 5 buttons to prevent spam
    const textareasToProcess = replyTextareas.slice(0, 5);
    
    console.log(`%c✅ Found ${textareasToProcess.length} suitable textarea(s) to process`, 'color: #17BF63');
    
    let processedCount = 0;
    
    textareasToProcess.forEach(textarea => {
      // Check if already processed
      if (textarea.hasAttribute('data-tweetcraft-processed')) {
        return;
      }
      
      // Check if a button already exists near this textarea
      const parent = textarea.closest('.mention-item, .feed-item, [class*="reply"]');
      if (parent && parent.querySelector('.smart-reply-button, .smart-reply-container')) {
        console.log('%c⚠️ Button already exists for this textarea', 'color: #FFA500');
        textarea.setAttribute('data-tweetcraft-processed', 'true');
        return;
      }
      
      // Mark as processed BEFORE creating button to prevent race conditions
      textarea.setAttribute('data-tweetcraft-processed', 'true');
      processedCount++;
      
      // Create button for this specific textarea
      const button = this.createHypeFuryAIButton(textarea);
      
      // Try multiple injection strategies
      let injected = false;
      
      // Strategy 1: Look for nearby button groups
      if (parent) {
        const buttonGroup = parent.querySelector('.flex, .button-group, [class*="action"], [class*="button"]');
        if (buttonGroup && !buttonGroup.querySelector('.smart-reply-button')) {
          buttonGroup.appendChild(button);
          injected = true;
          console.log('%c💉 Injected into button group', 'color: #1DA1F2');
        }
      }
      
      // Strategy 2: Create container after textarea
      if (!injected) {
        const container = document.createElement('div');
        container.className = 'tweetcraft-button-container';
        container.style.cssText = 'display: flex; gap: 8px; margin-top: 8px; align-items: center;';
        container.appendChild(button);
        
        if (textarea.parentElement) {
          textarea.parentElement.insertBefore(container, textarea.nextSibling);
          injected = true;
          console.log('%c💉 Created new container for button', 'color: #1DA1F2');
        }
      }
      
      if (!injected) {
        console.warn('❌ Could not inject button for', textarea);
      }
    });
    
    if (processedCount === 0) {
      console.log('%c⚠️ No unprocessed textareas found', 'color: #FFA500');
    } else {
      console.log(`%c🎉 Processed ${processedCount} textarea(s)`, 'color: #17BF63');
    }
  }
  
  /**
   * Create AI button for HypeFury
   */
  private createHypeFuryAIButton(textarea: Element): HTMLElement {
    const container = document.createElement('div');
    container.className = 'smart-reply-container hypefury-reply-container';
    
    const button = document.createElement('button');
    button.className = 'smart-reply-button';
    button.innerHTML = '<span>✨ AI Reply</span>';
    button.title = 'Generate AI-powered reply';
    
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Get context - look up from the textarea to find the tweet container
      let parent: Element | null = null;
      
      // Strategy 1: Look for specific HypeFury containers
      parent = textarea.closest('.feed-item, .mention-item, [data-cy="feed-item"], [data-cy="mention-item"]');
      
      // Strategy 2: Look for containers with tweet-like structure
      if (!parent) {
        parent = textarea.closest('[class*="space-y"], [class*="rounded"][class*="bg-"], [class*="border"]');
      }
      
      // Strategy 3: Walk up the tree to find the tweet content container
      if (!parent) {
        let current = textarea.parentElement;
        let maxLevels = 10; // Prevent infinite loops
        
        while (current && current !== document.body && maxLevels > 0) {
          // Check if this container has tweet-like content
          const textElements = current.querySelectorAll('p, div[class*="text-"]');
          const hasSubstantialText = Array.from(textElements).some(el => {
            const text = el.textContent?.trim() || '';
            return text.length > 50 && !text.includes('Reply') && !text.includes('Quote');
          });
          
          if (hasSubstantialText) {
            // Also check for author links
            const hasAuthor = current.querySelector('a[href*="twitter.com"], a[href*="x.com"], a.font-semibold, span.font-semibold');
            if (hasAuthor) {
              parent = current;
              console.log('%c✔ Found parent by walking up tree', 'color: #17BF63', maxLevels, 'levels up');
              break;
            }
          }
          
          current = current.parentElement;
          maxLevels--;
        }
      }
      
      // Log detailed information about what we found
      if (parent) {
        console.log('%c🔍 Parent container found:', 'color: #667eea', parent);
        console.log('  Classes:', parent.className);
        console.log('  Text preview:', parent.textContent?.substring(0, 200));
      } else {
        console.log('%c⚠️ No parent container found for context extraction', 'color: #FFA500');
        console.log('  Textarea:', textarea);
      }
      
      const context = parent ? HypeFuryPlatform.extractContext(parent) : { text: '', author: '' };
      
      // More detailed logging of extraction results
      if (context.text) {
        console.log('%c📨 Successfully extracted context:', 'color: #17BF63');
        console.log('  Tweet:', context.text.substring(0, 150));
        console.log('  Author:', context.author || 'Unknown');
      } else {
        console.log('%c❌ Failed to extract tweet content', 'color: #DC3545');
        console.log('  Parent element:', parent);
      }
      
      // Show unified selector
      // Show unified selector using the selector adapter
      selectorAdapter.show(button, (template, tone, fiveStepSelections) => {
        // Check if we're using the five-step system
        if (fiveStepSelections) {
          // For five-step system, pass selections directly
          this.generateReply(textarea as HTMLElement, { tweetText: context.text }, '', false, false, fiveStepSelections);
        } else {
          // Legacy template/tone system
          const combinedPrompt = `${tone.systemPrompt}. ${template.prompt}`;
          this.generateReply(textarea as HTMLElement, { tweetText: context.text }, combinedPrompt, false, false);
        }
      });
    });
    
    container.appendChild(button);
    return container;
  }

  private async handleToolbarAdded(toolbarElement: Element): Promise<void> {
    // Avoid processing the same toolbar multiple times
    if (this.processedToolbars.has(toolbarElement)) {
      return;
    }

    // Mark as processed immediately to prevent race conditions
    this.processedToolbars.add(toolbarElement);

    // Check if button already exists in this toolbar
    if (toolbarElement.querySelector('.smart-reply-container')) {
      return;
    }
    
    // Additional check: Look for buttons in parent containers to prevent duplicates
    // This handles cases where Twitter recreates toolbar elements
    const parentContainer = toolbarElement.closest('[data-testid="inline-reply"], [data-testid="reply"], [role="dialog"], [role="group"]');
    if (parentContainer) {
      // Count existing buttons in the parent container
      const existingButtons = parentContainer.querySelectorAll('.smart-reply-container');
      if (existingButtons.length > 0) {
        // Remove all but the first button if multiple exist
        for (let i = 1; i < existingButtons.length; i++) {
          console.log('%c🗑️ Removing duplicate button', 'color: #FFA500');
          existingButtons[i].remove();
        }
        
        // Check if the remaining button is visible
        const firstButton = existingButtons[0] as HTMLElement;
        const isVisible = firstButton.offsetParent !== null;
        if (isVisible) {
          console.log('%c⚠️ Duplicate button prevented in parent container', 'color: #FFA500');
          return;
        } else {
          // Remove the invisible button
          firstButton.remove();
        }
      }
    }

    // CRITICAL: Only process toolbars that are in reply/compose contexts
    // Check if this toolbar is associated with a reply or compose action
    let textarea: HTMLElement | null = null;
    
    const isReplyContext = this.isReplyToolbar(toolbarElement);
    if (isReplyContext) {
      console.log('%c🎯 Reply toolbar detected', 'color: #17BF63; font-weight: bold');
      textarea = DOMUtils.findClosestTextarea(toolbarElement) as HTMLElement;
    } else {
      // Try alternative detection: look for nearby textarea
      const nearbyTextarea = this.findNearbyTextarea(toolbarElement);
      if (nearbyTextarea) {
        console.log('%c🎯 Found toolbar near textarea, treating as reply toolbar', 'color: #17BF63');
        textarea = nearbyTextarea as HTMLElement;
      } else {
        // Not a reply toolbar, skip
        return;
      }
    }
    
    if (!textarea) {
      // Try aggressive global search for any active textarea
      console.log('%c🔍 Trying aggressive textarea search...', 'color: #FFA500');
      
      // Look for any contenteditable textarea on the page
      const allTextareas = document.querySelectorAll('[contenteditable="true"], textarea');
      console.log(`%c  Found ${allTextareas.length} potential textareas`, 'color: #657786');
      
      for (const ta of allTextareas) {
        const element = ta as HTMLElement;
        // Check if it's visible and likely a reply textarea
        if (element.offsetHeight > 20 && element.offsetWidth > 100) {
          const placeholder = element.getAttribute('placeholder') || element.getAttribute('aria-label') || '';
          if (placeholder.toLowerCase().includes('tweet') || 
              placeholder.toLowerCase().includes('reply') || 
              placeholder.toLowerCase().includes('post') ||
              element.getAttribute('role') === 'textbox') {
            textarea = element;
            console.log('%c✅ Found textarea via global search', 'color: #17BF63');
            break;
          }
        }
      }
      
      if (!textarea) {
        console.warn('TweetCraft: Reply toolbar found but no textarea available yet');
        return;
      }
    }

    // Extract Twitter context
    const context = DOMUtils.extractTwitterContext();
    
    // Create and inject the Smart Reply button
    console.log('%c➕ Injecting AI Reply button', 'color: #1DA1F2');
    await this.injectSmartReplyButton(toolbarElement, textarea, context);
  }

  /**
   * Check if a selector with :has() is supported
   */
  private isSelectorSupported(selector: string): boolean {
    // Check if CSS.supports is available and if the selector is supported
    if (typeof CSS !== 'undefined' && CSS.supports) {
      try {
        return CSS.supports(`selector(${selector})`);
      } catch {
        // CSS.supports might not support selector() syntax in older browsers
        return false;
      }
    }
    
    // Fallback: try to use the selector and see if it throws
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if an element has a child matching a selector (fallback for :has())
   */
  private elementHasChild(element: Element, childSelector: string): boolean {
    return element.querySelector(childSelector) !== null;
  }

  /**
   * Find a textarea near the toolbar element
   */
  private findNearbyTextarea(element: Element): Element | null {
    // Look for textarea in various relative positions
    const parent = element.parentElement;
    if (!parent) return null;
    
    // Check siblings
    const textarea = parent.querySelector('[contenteditable="true"][role="textbox"]');
    if (textarea) return textarea;
    
    // Check parent's siblings
    const grandParent = parent.parentElement;
    if (grandParent) {
      const textarea2 = grandParent.querySelector('[contenteditable="true"][role="textbox"]');
      if (textarea2) return textarea2;
    }
    
    // Check within a reasonable distance up the tree
    let current: Element | null = element.parentElement;
    let levels = 5;
    while (current && levels > 0) {
      const textarea3 = current.querySelector('[contenteditable="true"][role="textbox"]');
      if (textarea3) return textarea3;
      current = current.parentElement;
      levels--;
    }
    
    return null;
  }

  /**
   * Determine if a toolbar is in a reply/compose context
   */
  private isReplyToolbar(toolbarElement: Element): boolean {
    // Strategy: Look for specific indicators of a reply composition toolbar
    // vs a tweet's action bar (reply, retweet, like buttons)
    
    // 1. Check if toolbar contains a "Post" or "Reply" button (submit button for replies)
    // Updated for new Twitter/X UI changes
    const postButtonSelectors = [
      'button[data-testid="tweetButton"]',
      'button[data-testid="tweetButtonInline"]', 
      'div[data-testid="tweetButton"]',
      'div[data-testid="tweetButtonInline"]',
      'button[aria-label*="Post" i]'
    ];
    
    // Check simple selectors first
    for (const selector of postButtonSelectors) {
      try {
        if (toolbarElement.querySelector(selector)) {
          return true;
        }
      } catch (e) {
        // Some selectors might not be supported (e.g., case-insensitive attribute)
        // Continue to next selector
      }
    }
    
    // Handle :has-text() pseudo-selector separately (not standard CSS)
    // Check button text content directly instead
    const buttonsWithText = toolbarElement.querySelectorAll('button span');
    for (const span of buttonsWithText) {
      const text = span.textContent?.toLowerCase() || '';
      if (text === 'post' || text === 'reply') {
        return true;
      }
    }
    
    // Also check if button text contains "Post" or "Reply"
    const buttons = toolbarElement.querySelectorAll('button[role="button"]');
    for (const button of buttons) {
      const text = button.textContent?.trim().toLowerCase() || '';
      if (text === 'post' || text === 'reply' || text.includes('post')) {
        return true;
      }
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
      // Final duplicate check: ensure no button exists for this specific textarea
      const textareaId = textarea.getAttribute('id') || textarea.getAttribute('data-testid') || '';
      if (textareaId) {
        // Check if a button already exists for this specific textarea
        const existingForTextarea = document.querySelector(`.smart-reply-container[data-textarea-id="${textareaId}"]`);
        if (existingForTextarea) {
          console.log('%c⚠️ Button already exists for this textarea', 'color: #FFA500');
          return;
        }
      }
      
      // Create the button container
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'smart-reply-container';
      
      // Mark this button with the textarea ID to prevent duplicates
      if (textareaId) {
        buttonContainer.setAttribute('data-textarea-id', textareaId);
      }

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
        const textContent = DOMUtils.getTextFromTextarea(textarea);
        const currentHasText = DOMUtils.hasUserText(textarea);
        const currentMode = button.getAttribute('data-mode');
        const shouldBeRewrite = currentHasText;
        const isRewrite = currentMode === 'rewrite';
        
        // Only log when there's actually a change to reduce noise
        if (shouldBeRewrite !== isRewrite) {
          console.log('%c🔍 Button Mode Check:', 'color: #9146FF; font-weight: bold');
          console.log('%c  Text content:', 'color: #657786', `"${textContent}"`);
          console.log('%c  Text length:', 'color: #657786', textContent.length);
          console.log('%c  Has user text:', 'color: #657786', currentHasText);
          console.log('%c  Current mode:', 'color: #657786', currentMode);
          console.log('%c  Should be rewrite:', 'color: #657786', shouldBeRewrite);
          
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
      
      // Use selector adapter instead of direct template selector
      // const templateSelector = new TemplateSelector(); // Removed - using adapter

      // Add click handler for the main button
      button.addEventListener('click', (e) => {
        console.log('%c🖱️ AI Reply button clicked!', 'color: #1DA1F2; font-weight: bold');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Stop all other handlers
        
        // Visual feedback for button click
        // Temporarily disabled - may be causing button position shift
        // visualFeedback.pulse(button, '#1d9bf0');
        
        // Check if a tone was set (e.g., from keyboard shortcut)
        const presetTone = button.getAttribute('data-tone');
        const bypassCache = button.getAttribute('data-bypass-cache') === 'true';
        
        if (presetTone) {
          console.log('%c  Using preset tone:', 'color: #657786', presetTone);
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
        
        console.log('%c  Showing selector...', 'color: #657786');
        console.log('%c  Button element:', 'color: #657786', button);
        console.log('%c  Button position:', 'color: #657786', button.getBoundingClientRect());
        
        // Show selector (unified or traditional based on feature flag)
        try {
          selectorAdapter.show(button, (template, tone, fiveStepSelections) => {
          // When both template and tone are selected, generate/rewrite
          console.log('%c🔨 BUILDING PROMPT', 'color: #FF6B6B; font-weight: bold; font-size: 14px');
          console.log('%c  Mode:', 'color: #657786', isRewriteMode ? 'REWRITE' : 'GENERATE');
          
          if (isRewriteMode) {
            const existingText = DOMUtils.getTextFromTextarea(textarea);
            console.log('%c  Existing Text:', 'color: #657786', existingText.substring(0, 100) + (existingText.length > 100 ? '...' : ''));
          }
          
          if (fiveStepSelections) {
            // Five-step system
            console.log('%c  Using Five-Step System:', 'color: #1DA1F2');
            console.log('%c  Selections:', 'color: #8899a6', fiveStepSelections);
            
            // Show toast for selection
            visualFeedback.showToast('Generating with five-step configuration...', {
              type: 'info',
              duration: 2000
            });
            
            // Generate or rewrite using five-step selections
            this.generateReply(textarea, context, '', bypassCache, isRewriteMode, fiveStepSelections);
          } else {
            // Legacy template/tone system
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
          }
        });
        } catch (error) {
          console.error('%c❌ Error showing selector:', 'color: #DC3545', error);
          visualFeedback.showToast('Error opening AI Reply selector. Please try again.', {
            type: 'error',
            duration: 3000
          });
        }
        
        return false; // Prevent any default action
      }, true); // Use capture phase

      // REMOVED: Smart suggestions and image buttons are now integrated into the AI Reply popup
      // These features are available as tabs in the unified selector popup
      // const suggestButton = null; // this.createSmartSuggestButton(textarea, context);
      // const imageButton = null; // imageAttachment.createButton(textarea, '');
      
      // Set callback for when image is selected (keeping for potential future use)
      imageAttachment.onSelect((image) => {
        if (image) {
          console.log('%c🖼️ IMAGE SELECTED', 'color: #9146FF; font-weight: bold; font-size: 14px');
          console.log('%c  URL:', 'color: #657786', image.url);
          console.log('%c  Alt:', 'color: #657786', image.alt);
          console.log('%c  Source:', 'color: #657786', image.source);
          
          // Store the image URL for later use
          button.setAttribute('data-image-url', image.url);
          button.setAttribute('data-image-alt', image.alt);
          
          // Update button to show image is attached
          const imgIndicator = button.querySelector('.image-indicator');
          if (!imgIndicator) {
            const indicator = document.createElement('span');
            indicator.className = 'image-indicator';
            indicator.style.cssText = 'margin-left: 4px; color: #9146FF;';
            indicator.textContent = '🖼️';
            button.appendChild(indicator);
          }
        }
      });
      
      // Create Arsenal Mode button
      const arsenalButton = this.createArsenalButton(textarea);
      
      // Assemble the components
      buttonContainer.appendChild(button);
      if (arsenalButton) {
        buttonContainer.appendChild(arsenalButton);
      }
      // Standalone buttons removed - features integrated into AI Reply popup
      // if (suggestButton) {
      //   buttonContainer.appendChild(suggestButton);
      // }
      // if (imageButton) {
      //   buttonContainer.appendChild(imageButton);
      // }

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

        if (toolbarItems) {
          // Prefer placing inside the toolbar items group (left side),
          // so our button doesn't hug the right next to the Post button.
          console.log('%c  Inserting inside toolbar items group', 'color: #657786');
          toolbarItems.appendChild(buttonContainer);
        } else {
          // Fallback: insert before the tweet button
          console.log('%c  Inserting before tweet button (fallback)', 'color: #657786');
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

  /**
   * Create smart suggestions button
   */
  private createArsenalButton(textarea: HTMLElement): HTMLButtonElement | null {
    const arsenalButton = document.createElement('button');
    arsenalButton.className = 'arsenal-mode-btn';
    arsenalButton.innerHTML = '⚔️';
    arsenalButton.setAttribute('title', 'Arsenal Mode - Pre-generated replies (Alt+A)');
    arsenalButton.style.cssText = `
      background: transparent;
      border: none;
      color: #8899A6;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      margin-left: 4px;
      font-size: 16px;
    `;

    // Add hover effect
    arsenalButton.addEventListener('mouseenter', () => {
      arsenalButton.style.backgroundColor = 'rgba(29, 161, 242, 0.1)';
      arsenalButton.style.color = '#1DA1F2';
    });

    arsenalButton.addEventListener('mouseleave', () => {
      arsenalButton.style.backgroundColor = 'transparent';
      arsenalButton.style.color = '#8899A6';
    });

    // Click handler to open Arsenal Mode
    arsenalButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('%c⚔️ Arsenal button clicked', 'color: #1DA1F2; font-weight: bold');
      
      // Dispatch custom event to open Arsenal Mode
      const event = new CustomEvent('tweetcraft:open-arsenal', {
        detail: { textarea }
      });
      document.dispatchEvent(event);
    });

    return arsenalButton;
  }

  private createSmartSuggestButton(textarea: HTMLElement, context: any): HTMLButtonElement | null {
    const suggestButton = document.createElement('button');
    suggestButton.className = 'tweetcraft-suggest-button';
    suggestButton.innerHTML = '💡';
    suggestButton.setAttribute('title', 'Smart Suggestions (Context-aware)');
    suggestButton.style.cssText = `
      background: transparent;
      border: 1px solid #536471;
      border-radius: 9999px;
      padding: 8px 12px;
      cursor: pointer;
      color: #536471;
      margin-left: 8px;
      transition: all 0.2s;
      font-size: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    `;

    // Add hover effect
    suggestButton.addEventListener('mouseenter', () => {
      suggestButton.style.borderColor = '#ffa500';
      suggestButton.style.color = '#ffa500';
      suggestButton.style.background = 'rgba(255, 165, 0, 0.1)';
    });
    suggestButton.addEventListener('mouseleave', () => {
      suggestButton.style.borderColor = '#536471';
      suggestButton.style.color = '#536471';
      suggestButton.style.background = 'transparent';
    });

    // Smart suggestions click handler
    suggestButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Visual feedback
      visualFeedback.pulse(suggestButton, '#ffa500');
      
      // Get tweet context
      const tweetText = context.tweetText || '';
      const threadContext = context.threadContext || [];
      
      console.log('%c💡 SMART SUGGESTIONS', 'color: #FFA500; font-weight: bold; font-size: 14px');
      console.log('%c  Analyzing context...', 'color: #657786');
      
      try {
        // Get smart suggestions based on context
        const suggestions = await templateSuggester.getSuggestions({
          tweetText,
          isReply: true,
          threadContext,
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay()
        });
        
        if (suggestions.length > 0) {
          this.showSuggestionsPopup(suggestButton, suggestions, textarea, context);
        } else {
          visualFeedback.showToast('No suggestions available for this context', {
            type: 'info',
            duration: 2000
          });
        }
      } catch (error) {
        console.error('Failed to get suggestions:', error);
        visualFeedback.showToast('Failed to get suggestions', {
          type: 'error',
          duration: 2000
        });
      }
    });

    return suggestButton;
  }

  /**
   * Show suggestions popup
   */
  private showSuggestionsPopup(button: HTMLElement, suggestions: any[], textarea: HTMLElement, context: any): void {
    // Remove any existing popup
    const existingPopup = document.querySelector('.tweetcraft-suggest-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    const suggestPopup = document.createElement('div');
    suggestPopup.className = 'tweetcraft-suggest-popup';
    suggestPopup.style.cssText = `
      position: absolute;
      bottom: 100%;
      left: 0;
      background: white;
      border: 1px solid #e1e8ed;
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 280px;
      max-width: 380px;
      z-index: 10000;
      margin-bottom: 8px;
    `;
    
    // Add dark mode support
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      suggestPopup.style.background = '#000';
      suggestPopup.style.borderColor = '#2f3336';
    }
    
    suggestPopup.innerHTML = `
      <div style="font-size: 13px; font-weight: 600; color: #536471; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
        <span>💡 Smart Suggestions</span>
        <button class="close-suggest-popup" style="background: transparent; border: none; cursor: pointer; color: #536471; font-size: 18px; padding: 0; margin: 0;">×</button>
      </div>
    `;
    
    // Add top 3 suggestions
    suggestions.slice(0, 3).forEach((suggestion) => {
      const template = TEMPLATES.find(t => t.id === suggestion.templateId);
      const tone = TONES.find(t => t.id === suggestion.toneId);
      
      if (template && tone) {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.style.cssText = `
          padding: 10px;
          margin: 6px 0;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
        `;
        
        suggestionItem.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 500;">${template.emoji} ${template.name}</span>
            <span style="color: #536471; font-size: 12px;">${tone.emoji} ${tone.label}</span>
          </div>
          <div style="font-size: 11px; color: #536471;">
            Score: ${suggestion.score.toFixed(1)} • ${suggestion.reasons[0] || 'Contextual match'}
          </div>
        `;
        
        // Hover effect
        suggestionItem.addEventListener('mouseenter', () => {
          suggestionItem.style.borderColor = '#1d9bf0';
          suggestionItem.style.background = 'rgba(29, 155, 240, 0.05)';
        });
        suggestionItem.addEventListener('mouseleave', () => {
          suggestionItem.style.borderColor = '#e1e8ed';
          suggestionItem.style.background = 'transparent';
        });
        
        // Click to use suggestion
        suggestionItem.addEventListener('click', () => {
          // Record usage
          templateSuggester.recordUsage(template.id, tone.id);
          
          // Close popup
          suggestPopup.remove();
          
          // Generate with this combination
          const combinedPrompt = `${tone.systemPrompt}. ${template.prompt}`;
          this.generateReply(textarea, context, combinedPrompt, false, false);
          
          // Show toast
          visualFeedback.showToast(`Using: ${template.emoji} ${template.name} with ${tone.emoji} ${tone.label}`, {
            type: 'success',
            duration: 2000
          });
        });
        
        suggestPopup.appendChild(suggestionItem);
      }
    });
    
    // Add close button handler
    const closeBtn = suggestPopup.querySelector('.close-suggest-popup') as HTMLElement;
    if (closeBtn) {
      closeBtn.addEventListener('click', () => suggestPopup.remove());
    }
    
    // Position relative to button
    const buttonContainer = button.parentElement;
    if (buttonContainer) {
      buttonContainer.style.position = 'relative';
      buttonContainer.appendChild(suggestPopup);
    }
    
    // Auto-remove after 15 seconds
    setTimeout(() => {
      if (suggestPopup.parentElement) {
        suggestPopup.remove();
      }
    }, 15000);

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', function closePopup(e) {
        if (!suggestPopup.contains(e.target as Node) && e.target !== button) {
          suggestPopup.remove();
          document.removeEventListener('click', closePopup);
        }
      });
    }, 100);
  }

  private async generateReply(
    textarea: HTMLElement, 
    context: { tweetId?: string; tweetText: string; threadContext?: string[]; authorHandle?: string }, 
    tone?: string,
    bypassCache: boolean = false,
    isRewriteMode: boolean = false,
    selections?: any
  ): Promise<void> {
    // Capture selections parameter in local scope
    const fiveStepSelections = selections;
    
    // Save state before generating
    ContextRecovery.saveState({
      timestamp: Date.now(),
      lastTone: tone,
      pendingReply: {
        text: '',
        tweetId: context.tweetId || '',
        context: context.tweetText
      }
    });
    
    // Use AsyncOperationManager to prevent race conditions
    const operationKey = `generate_reply_${context.tweetId || 'unknown'}_${tone || 'default'}_${isRewriteMode ? 'rewrite' : 'generate'}`;
    
    try {
      await globalAsyncManager.execute(operationKey, async (signal: AbortSignal) => {
        return this.performReplyGeneration(textarea, context, tone, signal, bypassCache, isRewriteMode, fiveStepSelections);
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
    context: { tweetId?: string; tweetText: string; threadContext?: string[]; authorHandle?: string }, 
    tone: string | undefined,
    signal: AbortSignal,
    _bypassCache: boolean = false,
    isRewriteMode: boolean = false,
    fiveStepSelections?: any
  ): Promise<void> {
    // Find the button to show loading state
    // Check if we're on HypeFury to use the correct class name
    const isHypeFury = window.location.hostname === 'app.hypefury.com';
    const buttonSelector = isHypeFury ? '.smart-reply-button' : '.smart-reply-btn';
    
    // Strategy 1: Find button near the textarea (for replies)
    let button: HTMLElement | null = null;
    const replyContainer = textarea.closest('[data-testid="tweetTextarea_0_label"]')?.parentElement?.parentElement;
    if (replyContainer) {
      button = replyContainer.querySelector(buttonSelector) as HTMLElement;
    }
    
    // Strategy 2: Find button in the tweet being replied to
    if (!button) {
      const tweetArticle = textarea.closest('article[data-testid="tweet"]');
      if (tweetArticle) {
        button = tweetArticle.querySelector(buttonSelector) as HTMLElement;
      }
    }
    
    // Strategy 3: Find button in the reply dialog/modal
    if (!button) {
      const dialog = textarea.closest('[role="dialog"]');
      if (dialog) {
        button = dialog.querySelector(buttonSelector) as HTMLElement;
      }
    }
    
    // Strategy 4: For HypeFury, look in parent containers
    if (!button && isHypeFury) {
      const parent = textarea.closest('.mention-item, .feed-item, article');
      if (parent) {
        button = parent.querySelector(buttonSelector) as HTMLElement;
      }
    }
    
    // Strategy 5: Find any visible smart-reply button on the page
    if (!button) {
      const allButtons = Array.from(document.querySelectorAll(buttonSelector));
      for (const btn of allButtons) {
        const htmlBtn = btn as HTMLElement;
        if (htmlBtn.offsetParent !== null) { // Check if visible
          button = htmlBtn;
          break;
        }
      }
    }
    
    if (!button) {
      console.warn('%c⚠️ Smart Reply: Button not found for loading state', 'color: #FFA500');
      console.log('Textarea location:', textarea);
      console.log(`All ${buttonSelector} elements:`, document.querySelectorAll(buttonSelector).length);
      // Continue without button - generation will still work
    } else {
      console.log('%c✅ Found button for loading state', 'color: #17BF63', button);
    }

    try {
      // Check for cancellation before starting
      if (signal.aborted) {
        throw new Error('Operation was cancelled before starting');
      }

      // Show visual loading state
      const loadingText = isRewriteMode ? 'Rewriting your draft...' : 'Generating AI reply...';
      visualFeedback.showLoading(loadingText);
      
      // Only show button loading state if button was found
      if (button) {
        DOMUtils.showLoadingState(button, isRewriteMode ? 'Rewriting' : 'Generating');
      }
      
      console.log(`%c🚀 Smart Reply: Starting ${isRewriteMode ? 'rewrite' : 'generation'} with tone:`, 'color: #1DA1F2; font-weight: bold', tone);
      
      // Check if API key is configured (with cancellation check)
      if (signal.aborted) throw new Error('Operation cancelled');
      const apiKey = await StorageService.getApiKey();
      if (!apiKey) {
        visualFeedback.hideLoading();
        if (button) {
          visualFeedback.showError(button, 'Please configure your API key in the extension popup');
          DOMUtils.showError(button, 'Please configure your API key in the extension popup', 'api');
        }
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
          if (button) {
            visualFeedback.showError(button, 'No text to rewrite');
            DOMUtils.showError(button, 'No text to rewrite', 'api');
          }
          console.error('%c❌ No text to rewrite', 'color: #DC3545; font-weight: bold');
          return;
        }
      }
      
      // Extract full context including images
      let visualContext = '';
      try {
        // Use ContextExtractor to get complete tweet context
        const fullContext = ContextExtractor.extractFullContext();
        
        // Check if image understanding is enabled and we have images
        if (ContextExtractor.hasVisualContent(fullContext)) {
          const visionEnabled = await visionService.isEnabled();
          
          if (visionEnabled) {
            console.log('%c👁️ Analyzing images for context...', 'color: #794BC4; font-weight: bold');
            
            // Get image URLs for analysis
            const { imageUrls, needsVision } = ContextExtractor.prepareForVisionAnalysis(fullContext);
            
            if (needsVision && imageUrls.length > 0) {
              // Analyze images with vision service
              const visionResult = await visionService.analyzeImages(imageUrls, context.tweetText);
              
              if (visionResult.success) {
                // Format the vision context for inclusion in prompt
                visualContext = VisionService.formatVisionContext(visionResult);
                console.log('%c✅ Visual context added to prompt', 'color: #17BF63');
              } else {
                console.warn('Vision analysis failed:', visionResult.error);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Failed to extract visual context:', error);
        // Continue without visual context
      }

      // Prepare the request
      const request: ReplyGenerationRequest = {
        originalTweet: context.tweetText + visualContext, // Append visual context to tweet text
        tone: actualTone,
        isRewriteMode,
        existingText
      };
      
      // Include five-step selections if provided
      if (fiveStepSelections) {
        request.selections = fiveStepSelections;
      }

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
        
        // Hide loading and show success toast only (no duplicate icon)
        visualFeedback.hideLoading();
        visualFeedback.showToast(isRewriteMode ? 'Draft rewritten!' : 'Reply generated!', {
          type: 'success',
          duration: 3000,
          position: 'bottom'
        });
        if (button) {
          visualFeedback.pulse(button, '#17BF63');
          // Reset button to normal state
          DOMUtils.hideLoadingState(button);
        }
        
        // Close selector after successful generation
        selectorAdapter.hide();
        
        // Also close old dropdown if it exists (backward compatibility)
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
        if (button) {
          visualFeedback.showError(button, response.error || 'Failed to generate reply');
          // Reset button and show error
          DOMUtils.hideLoadingState(button);
        }
        
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
          button || undefined
        );
        console.error('Smart Reply: Generation failed:', response.error);
      }

    } catch (error) {
      // Handle cancellation gracefully
      if ((error as Error).message.includes('cancelled')) {
        console.log('%c⏹️ Operation cancelled during generation', 'color: #657786');
        visualFeedback.hideLoading();
        if (button) {
          DOMUtils.hideLoadingState(button);
        }
        return; // Don't show error UI for cancellations
      }
      
      // Hide loading and show error
      visualFeedback.hideLoading();
      if (button) {
        visualFeedback.showError(button, (error as Error).message || 'An error occurred');
        // Reset button on error
        DOMUtils.hideLoadingState(button);
      }
      
      // Use enhanced error handling with recovery actions
      const recoveryActions = ErrorHandler.handleUserFriendlyError(
        error as Error,
        {
          action: 'generate_reply',
          component: 'SmartReplyContentScript',
          retryAction: () => this.generateReply(textarea, context, tone),
          metadata: { tone, tweetText: context.tweetText }
        },
        button || undefined
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
    
    // Clean up custom event listeners
    this.customEventListeners.forEach((listener, eventName) => {
      document.removeEventListener(eventName, listener);
    });
    this.customEventListeners.clear();
    
    // Clear cleanup interval
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    
    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Cleanup keyboard shortcuts
    KeyboardShortcutManager.destroy();
    
    // Cleanup Context Recovery
    ContextRecovery.destroy();
    
    // Disconnect port
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
    
    // Run all cleanup functions
    const cleanupFunctions = (this as any).cleanupFunctions || [];
    cleanupFunctions.forEach((cleanup: () => void) => {
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
    // Be more aggressive - try on any Twitter/X page
    const isTwitterPage = window.location.hostname.includes('twitter.com') || 
                         window.location.hostname.includes('x.com');
    
    if (!isTwitterPage) {
      return;
    }
    
    // Check if we're on a reply-capable page
    const isStatusPage = window.location.pathname.includes('/status/');
    const hasTweets = document.querySelector('article[data-testid="tweet"], article[role="article"]') !== null;
    const isComposePage = window.location.pathname.includes('/compose/');
    const isHomePage = window.location.pathname === '/' || window.location.pathname === '/home';
    
    // Check for reply-specific DOM elements
    const hasReplyTextarea = document.querySelector('[contenteditable="true"][role="textbox"]') !== null;
    const hasReplyButton = document.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"], button[aria-label*="Post" i]') !== null;
    
    // Only inject if we're on a page that likely has reply capabilities
    const isReplyPage = isStatusPage || hasTweets || isComposePage || isHomePage || hasReplyTextarea || hasReplyButton;
    
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
    } else {
      // Fallback: Try to find textareas directly and inject buttons near them
      console.log('%c  No toolbars found, trying textarea-based injection', 'color: #FFA500');
      const textareas = document.querySelectorAll('[contenteditable="true"][role="textbox"]');
      console.log('%c  Found textareas:', 'color: #657786', textareas.length);
      
      textareas.forEach(textarea => {
        // Check if this textarea already has a button
        const parent = textarea.parentElement;
        if (parent && !parent.querySelector('.smart-reply-btn')) {
          // Try to find or create a suitable toolbar container
          let toolbarContainer = parent.querySelector('[role="group"]');
          if (!toolbarContainer) {
            // Look for any div that might be a toolbar
            // Check for :has() support
            if (this.isSelectorSupported('div:has(button)')) {
              toolbarContainer = parent.querySelector('div:has(button)');
            } else {
              // Fallback: find divs that contain buttons
              const divs = parent.querySelectorAll('div');
              for (const div of divs) {
                if (div.querySelector('button')) {
                  toolbarContainer = div;
                  break;
                }
              }
            }
          }
          
          if (toolbarContainer && !this.processedToolbars.has(toolbarContainer)) {
            console.log('%c  Processing textarea with makeshift toolbar', 'color: #657786');
            this.handleToolbarAdded(toolbarContainer);
          }
        }
      });
    }
    
    if (this.initialRetryCount < this.maxInitialRetries) {
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
  private isFeatureAvailable(): boolean {
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
    if (this.isFeatureAvailable()) {
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

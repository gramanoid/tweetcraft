// TweetCraft AI - Main Content Script (ES6 Module)
// Injected into X.com/Twitter.com pages for UI interaction

// Import state manager first
import stateManager from './lib/state-manager.esm.js';

// SECURITY: Initialize private module registry FIRST (before any other modules)
import { globalModuleRegistry, cleanupGlobalRegistry } from './lib/private-module-registry.esm.js';

// Make module registry available for IIFE modules (secure)
if (typeof window !== 'undefined') {
  window.TweetCraftModuleRegistry = globalModuleRegistry;
}

// Import core modules
import { TweetCraftStorage } from './lib/utils.esm.js';
// Safe logger access with multi-fallback approach to avoid ReferenceErrors in Jest
const globalScope = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : {});
let safeLogSource = null;
try {
  safeLogSource = (typeof self !== 'undefined' && self.TweetCraftLog) || null;
  if (!safeLogSource && typeof require === 'function') {
    try {
      const logModule = require('./lib/log.js');
      safeLogSource = logModule.TweetCraftLog || logModule;
    } catch (_) {}
  }
} catch (_) {}
if (!safeLogSource) {
  safeLogSource = (globalScope && globalScope.TweetCraftLog) || null;
}
const safeLog = (safeLogSource && typeof safeLogSource.log === 'function') ? safeLogSource : null;
import { TweetCraftStrings, getMessage } from './lib/strings.esm.js';

// Import content modules
import { TweetCraftInit } from './content/init.esm.js';
import { TweetCraftHandlers } from './content/handlers.esm.js';
import { TweetCraftModalUI } from './content/modal-ui.esm.js';
import { TweetCraftDOMUtils } from './content/dom-utils.esm.js';
import { TweetCraftClipboard } from './content/clipboard.esm.js';
import TweetCraftSelectorCanary from './content/selector-canary.esm.js';
import { TweetCraftInsights } from './content/twitter154-insights-ui.esm.js';
import { CommandPalette } from './lib/command-palette.esm.js';

// ============================================
// RUNTIME GUARDS
// ============================================

// Check if already initialized using state manager
if (stateManager.isInitialized()) {
  console.log('TweetCraft: Already initialized, skipping...');
} else {
  // Mark as initializing to prevent race conditions
  stateManager.setInitializationStatus('starting');
  
  // Runtime Context Detection
  const isXDomain = window.location.hostname === 'x.com' || 
                    window.location.hostname === 'twitter.com';
  const isHypeFury = window.location.hostname === 'app.hypefury.com';
  const isAllowedDomain = isXDomain || isHypeFury;
  
  if (!isAllowedDomain) {
    console.log('TweetCraft: Not on supported domain, skipping initialization');
    stateManager.setInitializationStatus('failed');
  } else {
    // Chrome Extension Context Detection
    const hasChrome = typeof chrome !== 'undefined';
    const hasRuntime = hasChrome && chrome.runtime;
    const hasExtensionId = hasRuntime && chrome.runtime.id;
    
    if (!hasExtensionId) {
      console.warn('TweetCraft: No extension context detected');
      stateManager.setInitializationStatus('failed');
    } else {
      console.log(`TweetCraft: Initializing on ${window.location.hostname}...`);
      
      // ============================================
      // INITIALIZATION
      // ============================================
      
      async function initializeTweetCraft() {
        try {
          // Initialize core systems
          await TweetCraftInit.initialize();
          
          // Start selector monitoring  
          TweetCraftSelectorCanary.startMonitoring();
          
          // Initialize Command Palette
          const commandPalette = new CommandPalette();
          stateManager.set('commandPalette', commandPalette);
          
          // Set up message listeners
          chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('TweetCraft: Message received:', request.action);
            
            // Route messages to appropriate handlers
            switch(request.action) {
              case 'show_reply_modal':
                TweetCraftHandlers.showReplyModal(request);
                sendResponse({ success: true });
                break;
                
              case 'show_new_tweet_modal':
                TweetCraftHandlers.showNewTweetModal(request);
                sendResponse({ success: true });
                break;
                
              case 'show_toast':
                TweetCraftDOMUtils.showToast(request.message, request.type);
                sendResponse({ success: true });
                break;
                
              case 'ping':
                sendResponse({ pong: true });
                break;
                
              default:
                console.warn('TweetCraft: Unknown action:', request.action);
                sendResponse({ success: false, error: 'Unknown action' });
            }
            
            return true; // Keep message channel open for async responses
          });
          
          // Set up cleanup on page unload
          window.addEventListener('beforeunload', () => {
            TweetCraftInit.cleanup();
            TweetCraftSelectorCanary.stopMonitoring();
            
            // SECURITY: Clean up private module registry
            cleanupGlobalRegistry();
          });
          
          // Mark as initialized in state manager
          stateManager.setInitializationStatus('complete');
          stateManager.setDomain(window.location.hostname);
          
          console.log('TweetCraft: Initialization complete');
          TweetCraftLog.log('content_initialized', {
            domain: window.location.hostname,
            path: window.location.pathname
          });
          
        } catch (error) {
          console.error('TweetCraft: Initialization error:', error);
          stateManager.setInitializationStatus('failed');
          TweetCraftLog.log('content_init_error', { 
            error: error.message,
            stack: error.stack 
          });
        }
      }
      
      // Start initialization
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTweetCraft);
      } else {
        initializeTweetCraft();
      }
    }
  }
}

// Export for debugging
export const TweetCraft = {
  version: '1.0.0',
  initialized: () => stateManager.isInitialized(),
  storage: TweetCraftStorage,
  log: TweetCraftLog,
  strings: TweetCraftStrings,
  handlers: TweetCraftHandlers,
  modal: TweetCraftModalUI,
  dom: TweetCraftDOMUtils,
  clipboard: TweetCraftClipboard,
  canary: TweetCraftSelectorCanary,
  insights: TweetCraftInsights,
  init: TweetCraftInit
};
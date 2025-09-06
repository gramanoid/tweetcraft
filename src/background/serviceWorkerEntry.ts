/**
 * Service Worker Entry Point
 * Sets webpack public path before ANY imports to ensure chunk loading works
 */

// CRITICAL: This MUST be the first code executed, before ANY imports
declare let __webpack_public_path__: string;

// Set the public path for chunk loading in Chrome extension context
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
  // @ts-ignore - webpack global
  __webpack_public_path__ = chrome.runtime.getURL('');
  console.log('%c🔧 Webpack public path configured', 'color: #17BF63', __webpack_public_path__);
} else {
  console.warn('Chrome runtime not available - chunks may fail to load');
}

// Use static import to ensure everything is bundled together
// This avoids chunk loading issues in service worker context
import './serviceWorker';
console.log('%c✅ Service worker imported', 'color: #17BF63');
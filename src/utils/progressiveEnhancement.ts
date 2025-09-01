/**
 * Progressive Enhancement System
 * Provides feature detection and graceful fallbacks for browser compatibility
 */

import { debug, logError, logWarn } from '@/utils/debugConfig';

interface FeatureSupport {
  name: string;
  supported: boolean;
  fallback?: () => void;
  version?: string;
}

interface BrowserCapabilities {
  storage: {
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
    chrome: boolean;
  };
  apis: {
    mutationObserver: boolean;
    intersectionObserver: boolean;
    resizeObserver: boolean;
    webCrypto: boolean;
    networkInformation: boolean;
    clipboard: boolean;
    notifications: boolean;
  };
  dom: {
    shadowDOM: boolean;
    customElements: boolean;
    contentEditable: boolean;
    execCommand: boolean;
  };
  css: {
    grid: boolean;
    flexbox: boolean;
    cssVariables: boolean;
    backdrop: boolean;
  };
}

export class ProgressiveEnhancement {
  private static capabilities: BrowserCapabilities | null = null;
  private static featureFlags = new Map<string, boolean>();
  private static fallbackHandlers = new Map<string, () => void>();
  
  /**
   * Initialize and detect browser capabilities
   */
  static async init(): Promise<BrowserCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    console.log('%c🔍 Progressive Enhancement', 'color: #9146FF; font-weight: bold', 'Detecting browser capabilities...');
    
    this.capabilities = {
      storage: this.detectStorageSupport(),
      apis: this.detectAPISupport(),
      dom: this.detectDOMSupport(),
      css: this.detectCSSSupport()
    };

    // Register default fallbacks
    this.registerDefaultFallbacks();
    
    // Log capabilities summary
    this.logCapabilities();
    
    return this.capabilities;
  }

  /**
   * Detect storage capabilities
   */
  private static detectStorageSupport(): BrowserCapabilities['storage'] {
    return {
      localStorage: this.testFeature(() => {
        const test = '__PE_TEST__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      }),
      sessionStorage: this.testFeature(() => {
        const test = '__PE_TEST__';
        sessionStorage.setItem(test, test);
        sessionStorage.removeItem(test);
        return true;
      }),
      indexedDB: this.testFeature(() => {
        return 'indexedDB' in window && indexedDB !== null;
      }),
      chrome: this.testFeature(() => {
        return typeof chrome !== 'undefined' && 
               chrome.storage && 
               chrome.storage.local !== undefined;
      })
    };
  }

  /**
   * Detect API support
   */
  private static detectAPISupport(): BrowserCapabilities['apis'] {
    return {
      mutationObserver: 'MutationObserver' in window,
      intersectionObserver: 'IntersectionObserver' in window,
      resizeObserver: 'ResizeObserver' in window,
      webCrypto: 'crypto' in window && 'subtle' in window.crypto,
      networkInformation: 'connection' in navigator || 
                          'mozConnection' in navigator || 
                          'webkitConnection' in navigator,
      clipboard: 'clipboard' in navigator && 'writeText' in navigator.clipboard,
      notifications: 'Notification' in window
    };
  }

  /**
   * Detect DOM capabilities
   */
  private static detectDOMSupport(): BrowserCapabilities['dom'] {
    return {
      shadowDOM: 'attachShadow' in Element.prototype,
      customElements: 'customElements' in window,
      contentEditable: 'contentEditable' in document.createElement('div'),
      execCommand: typeof document.execCommand === 'function'
    };
  }

  /**
   * Detect CSS capabilities
   */
  private static detectCSSSupport(): BrowserCapabilities['css'] {
    // Check if CSS.supports is available
    const hasSupports = typeof CSS !== 'undefined' && typeof CSS.supports === 'function';
    
    return {
      grid: hasSupports ? CSS.supports('display', 'grid') : true,
      flexbox: hasSupports ? CSS.supports('display', 'flex') : true,
      cssVariables: hasSupports ? CSS.supports('--test', 'value') : false,
      backdrop: hasSupports ? CSS.supports('backdrop-filter', 'blur(10px)') : false
    };
  }

  /**
   * Test a feature safely
   */
  private static testFeature(test: () => boolean): boolean {
    try {
      return test();
    } catch {
      return false;
    }
  }

  /**
   * Register default fallback handlers
   */
  private static registerDefaultFallbacks(): void {
    // Storage fallbacks
    this.registerFallback('localStorage', () => {
      logWarn('localStorage not available, using in-memory storage');
      (window as any).__PE_STORAGE__ = (window as any).__PE_STORAGE__ || {};
    });

    // Observer fallbacks
    this.registerFallback('mutationObserver', () => {
      logWarn('MutationObserver not available, using polling fallback');
      this.startPollingFallback();
    });

    // Clipboard fallback
    this.registerFallback('clipboard', () => {
      logWarn('Clipboard API not available, using execCommand fallback');
    });

    // Network Information fallback
    this.registerFallback('networkInformation', () => {
      console.log('Network Information API not available, using default timeouts');
    });
  }

  /**
   * Register a fallback handler for a feature
   */
  static registerFallback(feature: string, handler: () => void): void {
    this.fallbackHandlers.set(feature, handler);
  }

  /**
   * Check if a feature is supported with fallback
   */
  static isSupported(feature: string): boolean {
    if (!this.capabilities) {
      this.init();
    }

    // Check nested property path (e.g., 'apis.clipboard')
    const path = feature.split('.');
    let current: any = this.capabilities;
    
    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return false;
      }
    }
    
    return current === true;
  }

  /**
   * Execute with fallback
   */
  static async executeWithFallback<T>(
    feature: string,
    mainFn: () => T | Promise<T>,
    fallbackFn?: () => T | Promise<T>
  ): Promise<T | null> {
    if (this.isSupported(feature)) {
      try {
        return await mainFn();
      } catch (error) {
        logError(`Feature ${feature} failed, attempting fallback`, error);
      }
    }

    // Try registered fallback
    const registeredFallback = this.fallbackHandlers.get(feature);
    if (registeredFallback) {
      registeredFallback();
    }

    // Try provided fallback
    if (fallbackFn) {
      try {
        return await fallbackFn();
      } catch (error) {
        logError(`Fallback for ${feature} also failed`, error);
      }
    }

    return null;
  }

  /**
   * Polling fallback for MutationObserver
   */
  private static startPollingFallback(): void {
    let lastHTML = document.body.innerHTML;
    
    setInterval(() => {
      const currentHTML = document.body.innerHTML;
      if (currentHTML !== lastHTML) {
        // Dispatch custom event for DOM changes
        window.dispatchEvent(new CustomEvent('pe-dom-change', {
          detail: { timestamp: Date.now() }
        }));
        lastHTML = currentHTML;
      }
    }, 1000); // Poll every second
  }

  /**
   * Get storage with fallback
   */
  static getStorage(): Storage | any {
    if (this.isSupported('storage.localStorage')) {
      return localStorage;
    }
    
    // Use in-memory fallback
    if (!(window as any).__PE_STORAGE__) {
      (window as any).__PE_STORAGE__ = {};
    }
    
    return {
      getItem: (key: string) => (window as any).__PE_STORAGE__[key] || null,
      setItem: (key: string, value: string) => {
        (window as any).__PE_STORAGE__[key] = value;
      },
      removeItem: (key: string) => {
        delete (window as any).__PE_STORAGE__[key];
      },
      clear: () => {
        (window as any).__PE_STORAGE__ = {};
      }
    };
  }

  /**
   * Create observer with fallback
   */
  static createObserver(
    callback: MutationCallback,
    options?: MutationObserverInit
  ): MutationObserver | null {
    if (this.isSupported('apis.mutationObserver')) {
      return new MutationObserver(callback);
    }
    
    // Use polling fallback
    window.addEventListener('pe-dom-change', () => {
      callback([], null as any);
    });
    
    return null;
  }

  /**
   * Copy to clipboard with fallback
   */
  static async copyToClipboard(text: string): Promise<boolean> {
    return await this.executeWithFallback(
      'apis.clipboard',
      async () => {
        await navigator.clipboard.writeText(text);
        return true;
      },
      () => {
        // Fallback using execCommand
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
          const success = document.execCommand('copy');
          document.body.removeChild(textarea);
          return success;
        } catch {
          document.body.removeChild(textarea);
          return false;
        }
      }
    ) || false;
  }

  /**
   * Get network connection type with fallback
   */
  static getConnectionType(): string {
    if (this.isSupported('apis.networkInformation')) {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      return connection?.effectiveType || '4g';
    }
    
    // Default to 4g if API not available
    return '4g';
  }

  /**
   * Check if running in extension context
   */
  static isExtensionContext(): boolean {
    return this.isSupported('storage.chrome') && 
           typeof chrome.runtime !== 'undefined' &&
           chrome.runtime.id !== undefined;
  }

  /**
   * Log capabilities summary
   */
  private static logCapabilities(): void {
    if (!this.capabilities) return;
    
    const summary = {
      storage: Object.entries(this.capabilities.storage)
        .filter(([_, supported]) => supported)
        .map(([name]) => name),
      apis: Object.entries(this.capabilities.apis)
        .filter(([_, supported]) => supported)
        .map(([name]) => name),
      dom: Object.entries(this.capabilities.dom)
        .filter(([_, supported]) => supported)
        .map(([name]) => name),
      css: Object.entries(this.capabilities.css)
        .filter(([_, supported]) => supported)
        .map(([name]) => name)
    };
    
    console.log('%c✅ Capabilities Detected', 'color: #17BF63; font-weight: bold', summary);
  }

  /**
   * Get full capabilities report
   */
  static getCapabilities(): BrowserCapabilities | null {
    return this.capabilities;
  }

  /**
   * Enable or disable a feature flag
   */
  static setFeatureFlag(feature: string, enabled: boolean): void {
    this.featureFlags.set(feature, enabled);
    console.log(`Feature flag '${feature}' set to`, enabled);
  }

  /**
   * Check if a feature flag is enabled
   */
  static isFeatureFlagEnabled(feature: string): boolean {
    return this.featureFlags.get(feature) ?? true; // Default to enabled
  }
}

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  ProgressiveEnhancement.init().catch(error => {
    logError('Failed to initialize Progressive Enhancement', error);
  });
}
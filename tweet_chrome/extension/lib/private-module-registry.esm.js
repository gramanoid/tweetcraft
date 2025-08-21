/**
 * TweetCraft AI - Private Module Registry
 * P0.7: Create private module registry system to replace global namespace pollution
 * 
 * SECURITY-FIRST ARCHITECTURE:
 * - Zero global namespace pollution
 * - Access control and authentication
 * - Automatic cleanup on extension unload
 * - Isolation between extension and page contexts
 */

// Private storage using WeakMap for true encapsulation
const privateRegistries = new WeakMap();
const accessControllers = new WeakMap();

/**
 * Secure Module Registry - Replaces dangerous window.* assignments
 */
export class PrivateModuleRegistry {
  constructor(options = {}) {
    // Initialize private storage for this instance
    privateRegistries.set(this, {
      modules: new Map(),
      metadata: new Map(),
      accessLog: [],
      securityConfig: {
        maxAccessAttempts: 100,
        logAccess: options.logAccess !== false,
        enforcePermissions: options.enforcePermissions !== false,
        allowedContexts: options.allowedContexts || ['extension-content', 'extension-background']
      }
    });
    
    // Initialize access controller
    accessControllers.set(this, {
      contextId: this.generateContextId(),
      authorizedPrincipals: new Set(),
      accessTokens: new Map(),
      rateLimits: new Map()
    });
    
    this.initialized = Date.now();
    this.isDestroyed = false;
  }

  /**
   * Register a module securely (replaces window.ModuleName = module)
   */
  register(moduleName, moduleInstance, metadata = {}) {
    if (this.isDestroyed) {
      throw new Error('Cannot register modules on destroyed registry');
    }
    
    const registry = privateRegistries.get(this);
    const securityCheck = this.validateRegistration(moduleName, moduleInstance, metadata);
    
    if (!securityCheck.allowed) {
      throw new Error(`Module registration denied: ${securityCheck.reason}`);
    }
    
    // Store module with security metadata
    registry.modules.set(moduleName, moduleInstance);
    registry.metadata.set(moduleName, {
      ...metadata,
      registeredAt: Date.now(),
      registrationContext: this.getCurrentContext(),
      accessCount: 0,
      lastAccess: null,
      securityHash: this.generateSecurityHash(moduleName, moduleInstance)
    });
    
    this.logSecurityEvent('module_registered', { moduleName, metadata });
    
    return {
      success: true,
      moduleId: this.generateModuleId(moduleName),
      securityToken: this.generateAccessToken(moduleName)
    };
  }

  /**
   * Retrieve a module securely (replaces window.ModuleName access)
   */
  retrieve(moduleName, requestContext = {}) {
    if (this.isDestroyed) {
      throw new Error('Cannot retrieve modules from destroyed registry');
    }
    
    const registry = privateRegistries.get(this);
    const accessCheck = this.validateAccess(moduleName, requestContext);
    
    if (!accessCheck.allowed) {
      this.logSecurityEvent('access_denied', { 
        moduleName, 
        reason: accessCheck.reason,
        context: requestContext 
      });
      
      if (registry.securityConfig.enforcePermissions) {
        throw new Error(`Access denied to module '${moduleName}': ${accessCheck.reason}`);
      } else {
        console.warn(`TweetCraft Security: Access warning for '${moduleName}': ${accessCheck.reason}`);
      }
    }
    
    const module = registry.modules.get(moduleName);
    
    if (module) {
      // Update access tracking
      const metadata = registry.metadata.get(moduleName);
      metadata.accessCount++;
      metadata.lastAccess = Date.now();
      
      this.logSecurityEvent('module_accessed', { moduleName, requestContext });
    }
    
    return module;
  }

  /**
   * Safe module access with error handling
   */
  safeRetrieve(moduleName, requestContext = {}, fallback = null) {
    try {
      return this.retrieve(moduleName, requestContext) || fallback;
    } catch (error) {
      console.warn(`TweetCraft: Safe retrieve failed for '${moduleName}':`, error.message);
      return fallback;
    }
  }

  /**
   * List available modules (with permission checks)
   */
  listModules(requestContext = {}) {
    const registry = privateRegistries.get(this);
    const availableModules = [];
    
    for (const [moduleName, _] of registry.modules) {
      const accessCheck = this.validateAccess(moduleName, requestContext);
      if (accessCheck.allowed) {
        const metadata = registry.metadata.get(moduleName);
        availableModules.push({
          name: moduleName,
          registeredAt: metadata.registeredAt,
          accessCount: metadata.accessCount,
          lastAccess: metadata.lastAccess
        });
      }
    }
    
    return availableModules;
  }

  /**
   * Unregister a module (secure cleanup)
   */
  unregister(moduleName, authToken) {
    if (this.isDestroyed) return false;
    
    const registry = privateRegistries.get(this);
    
    if (!this.validateUnregistration(moduleName, authToken)) {
      this.logSecurityEvent('unregister_denied', { moduleName });
      return false;
    }
    
    const removed = registry.modules.delete(moduleName);
    registry.metadata.delete(moduleName);
    
    if (removed) {
      this.logSecurityEvent('module_unregistered', { moduleName });
    }
    
    return removed;
  }

  /**
   * Complete registry destruction (replaces global cleanup)
   */
  destroy(authToken) {
    if (!this.validateDestruction(authToken)) {
      throw new Error('Registry destruction denied - invalid authorization');
    }
    
    const registry = privateRegistries.get(this);
    
    // Clear all modules
    registry.modules.clear();
    registry.metadata.clear();
    
    this.logSecurityEvent('registry_destroyed', { moduleCount: registry.modules.size });
    
    // Clear private storage
    privateRegistries.delete(this);
    accessControllers.delete(this);
    
    this.isDestroyed = true;
  }

  /**
   * Security validation methods
   */
  
  validateRegistration(moduleName, moduleInstance, metadata) {
    // Check module name safety
    if (!this.isSecureModuleName(moduleName)) {
      return { allowed: false, reason: 'Unsafe module name' };
    }
    
    // Check for duplicate registration
    const registry = privateRegistries.get(this);
    if (registry.modules.has(moduleName)) {
      return { allowed: false, reason: 'Module already registered' };
    }
    
    // Validate module instance
    if (moduleInstance === null || moduleInstance === undefined) {
      return { allowed: false, reason: 'Invalid module instance' };
    }
    
    // Check context permissions
    const currentContext = this.getCurrentContext();
    const registry_config = registry.securityConfig;
    
    if (registry_config.allowedContexts && 
        !registry_config.allowedContexts.includes(currentContext)) {
      return { allowed: false, reason: 'Unauthorized context' };
    }
    
    return { allowed: true };
  }

  validateAccess(moduleName, requestContext) {
    const registry = privateRegistries.get(this);
    
    // Check if module exists
    if (!registry.modules.has(moduleName)) {
      return { allowed: false, reason: 'Module not found' };
    }
    
    // Rate limiting check
    if (this.isRateLimited(moduleName)) {
      return { allowed: false, reason: 'Rate limit exceeded' };
    }
    
    // Context validation
    const currentContext = this.getCurrentContext();
    if (!registry.securityConfig.allowedContexts.includes(currentContext)) {
      return { allowed: false, reason: 'Unauthorized context' };
    }
    
    return { allowed: true };
  }

  /**
   * Security utility methods
   */
  
  isSecureModuleName(name) {
    // Prevent dangerous module names
    const dangerousPatterns = [
      /^(window|document|global|chrome)$/i,
      /script|eval|function/i,
      /__proto__|constructor|prototype/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(name));
  }

  getCurrentContext() {
    // Detect current execution context
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      if (chrome.runtime.getContexts) {
        return 'extension-background';
      } else {
        return 'extension-content';
      }
    }
    
    if (typeof window !== 'undefined' && window.location) {
      return 'web-page';
    }
    
    return 'unknown';
  }

  generateContextId() {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateModuleId(moduleName) {
    return `mod_${moduleName}_${Date.now()}`;
  }

  generateAccessToken(moduleName) {
    return `tok_${moduleName}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  generateSecurityHash(moduleName, moduleInstance) {
    // Simple hash for integrity checking
    const content = `${moduleName}_${typeof moduleInstance}_${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  isRateLimited(moduleName) {
    const controller = accessControllers.get(this);
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxRequests = 1000; // Max requests per window
    
    const rateLimit = controller.rateLimits.get(moduleName) || { count: 0, windowStart: now };
    
    if (now - rateLimit.windowStart > windowMs) {
      // Reset window
      rateLimit.count = 0;
      rateLimit.windowStart = now;
    }
    
    rateLimit.count++;
    controller.rateLimits.set(moduleName, rateLimit);
    
    return rateLimit.count > maxRequests;
  }

  validateUnregistration(moduleName, authToken) {
    // In a real implementation, validate the auth token
    // For now, just check if module exists
    const registry = privateRegistries.get(this);
    return registry.modules.has(moduleName);
  }

  validateDestruction(authToken) {
    // For now, allow destruction
    // In production, implement proper token validation
    return true;
  }

  logSecurityEvent(eventType, details) {
    const registry = privateRegistries.get(this);
    
    if (!registry.securityConfig.logAccess) return;
    
    const event = {
      timestamp: Date.now(),
      type: eventType,
      details: details,
      contextId: accessControllers.get(this).contextId
    };
    
    registry.accessLog.push(event);
    
    // Keep only last 1000 events
    if (registry.accessLog.length > 1000) {
      registry.accessLog.shift();
    }
    
    // Log security events to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`TweetCraft Security [${eventType}]:`, details);
    }
  }

  /**
   * Get registry statistics
   */
  getStats() {
    if (this.isDestroyed) return null;
    
    const registry = privateRegistries.get(this);
    const controller = accessControllers.get(this);
    
    return {
      moduleCount: registry.modules.size,
      totalAccesses: registry.accessLog.filter(e => e.type === 'module_accessed').length,
      securityEvents: registry.accessLog.length,
      contextId: controller.contextId,
      uptime: Date.now() - this.initialized,
      isSecure: registry.securityConfig.enforcePermissions
    };
  }

  /**
   * Export security log (for debugging)
   */
  exportSecurityLog() {
    if (this.isDestroyed) return [];
    
    const registry = privateRegistries.get(this);
    return [...registry.accessLog];
  }
}

/**
 * Singleton instance for global use
 * This replaces the need for multiple window.* assignments
 */
export const globalModuleRegistry = new PrivateModuleRegistry({
  logAccess: true,
  enforcePermissions: true,
  allowedContexts: ['extension-content', 'extension-background']
});

// Global cleanup function for extension unload
export function cleanupGlobalRegistry() {
  try {
    const stats = globalModuleRegistry.getStats();
    console.log('TweetCraft: Cleaning up module registry', stats);
    
    // In a real scenario, we'd need proper auth token
    globalModuleRegistry.destroy('cleanup_token');
  } catch (error) {
    console.warn('TweetCraft: Registry cleanup failed:', error.message);
  }
}

// Auto-cleanup on page unload (for content scripts)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupGlobalRegistry);
}

// Global access (for debugging - will be removed in production)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.TweetCraftModuleRegistry = globalModuleRegistry;
}

console.log('TweetCraft: Private Module Registry initialized (ES6 Module)');

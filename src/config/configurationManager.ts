/**
 * Configuration Manager for TweetCraft
 * Centralized management of templates, tones, and user preferences
 */

import { TEMPLATES, TONES, REPLY_CONFIG, Template, Tone } from './templatesAndTones';

export interface FeatureSettings {
  imageUnderstanding?: {
    enabled: boolean;
    model?: string;
    maxImagesPerRequest?: number;
  };
  smartSuggestions?: {
    enabled: boolean;
    maxSuggestions?: number;
  };
  arsenalMode?: {
    enabled: boolean;
    maxReplies?: number;
  };
}

export interface UserPreferences {
  favoriteTemplates: string[];
  favoriteTones: string[];
  defaultTone?: string;
  defaultReplyLength?: 'short' | 'medium' | 'long';
  autoSuggestEnabled: boolean;
  customTemplates: Template[];
  customTones: Tone[];
}

export interface AppConfig {
  features?: FeatureSettings;
  userPreferences?: UserPreferences;
  apiKey?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
}

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private templateCache = new Map<string, Template>();
  private toneCache = new Map<string, Tone>();
  private combinedPromptCache = new Map<string, string>();
  private userPreferences: UserPreferences | null = null;
  private readonly MAX_CACHE_SIZE = 100;

  private constructor() {
    this.initializeCaches();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Initialize caches with built-in templates and tones
   */
  private initializeCaches(): void {
    // Cache built-in templates
    TEMPLATES.forEach(template => {
      this.templateCache.set(template.id, template);
    });

    // Cache built-in tones
    TONES.forEach(tone => {
      this.toneCache.set(tone.id, tone);
    });

    console.log('%c🚀 ConfigurationManager initialized', 'color: #1DA1F2; font-weight: bold');
    console.log('%c  Templates cached:', 'color: #657786', this.templateCache.size);
    console.log('%c  Tones cached:', 'color: #657786', this.toneCache.size);
  }

  /**
   * Get a template by ID
   */
  getTemplate(id: string): Template | undefined {
    // Check cache first
    if (this.templateCache.has(id)) {
      return this.templateCache.get(id);
    }

    // Check custom templates
    const customTemplate = this.userPreferences?.customTemplates?.find(t => t.id === id);
    if (customTemplate) {
      this.templateCache.set(id, customTemplate);
      return customTemplate;
    }

    return undefined;
  }

  /**
   * Get a tone by ID
   */
  getTone(id: string): Tone | undefined {
    // Check cache first
    if (this.toneCache.has(id)) {
      return this.toneCache.get(id);
    }

    // Check custom tones
    const customTone = this.userPreferences?.customTones?.find(t => t.id === id);
    if (customTone) {
      this.toneCache.set(id, customTone);
      return customTone;
    }

    return undefined;
  }

  /**
   * Get all available templates (built-in + custom)
   */
  getAllTemplates(): Template[] {
    const templates = [...TEMPLATES];
    
    if (this.userPreferences?.customTemplates) {
      templates.push(...this.userPreferences.customTemplates);
    }

    return templates;
  }

  /**
   * Get all available tones (built-in + custom)
   */
  getAllTones(): Tone[] {
    const tones = [...TONES];
    
    if (this.userPreferences?.customTones) {
      tones.push(...this.userPreferences.customTones);
    }

    return tones;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): Template[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<UserPreferences> {
    if (!this.userPreferences) {
      await this.loadUserPreferences();
    }
    return this.userPreferences!;
  }

  /**
   * Load user preferences from storage
   */
  private async loadUserPreferences(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(['userPreferences']);
      
      this.userPreferences = stored.userPreferences || {
        favoriteTemplates: [],
        favoriteTones: [],
        autoSuggestEnabled: true,
        customTemplates: [],
        customTones: []
      };

      // Add custom templates/tones to cache
      if (this.userPreferences) {
        this.userPreferences.customTemplates?.forEach(template => {
          this.templateCache.set(template.id, template);
        });

        this.userPreferences.customTones?.forEach(tone => {
          this.toneCache.set(tone.id, tone);
        });
      }

    } catch (error) {
      console.error('Failed to load user preferences:', error);
      this.userPreferences = {
        favoriteTemplates: [],
        favoriteTones: [],
        autoSuggestEnabled: true,
        customTemplates: [],
        customTones: []
      };
    }
  }

  /**
   * Deep merge utility for nested objects
   */
  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = result[key];
      
      if (sourceValue === undefined) {
        continue;
      }
      
      if (sourceValue !== null && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        if (targetValue !== null && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          result[key] = sourceValue;
        }
      } else {
        result[key] = sourceValue;
      }
    }
    
    return result;
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const current = await this.getUserPreferences();
      this.userPreferences = this.deepMerge(current, preferences);
      
      await chrome.storage.local.set({ userPreferences: this.userPreferences });
      
      // Update caches if custom templates/tones changed
      if (preferences.customTemplates) {
        preferences.customTemplates.forEach(template => {
          this.templateCache.set(template.id, template);
        });
      }
      
      if (preferences.customTones) {
        preferences.customTones.forEach(tone => {
          this.toneCache.set(tone.id, tone);
        });
      }
      
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }

  /**
   * Get combined prompt for template + tone
   */
  getCombinedPrompt(templateId: string, toneId: string): string {
    const cacheKey = `${templateId}:${toneId}`;
    
    // Check cache first
    if (this.combinedPromptCache.has(cacheKey)) {
      console.log('%c💾 Cache hit for combined prompt', 'color: #17BF63', cacheKey);
      return this.combinedPromptCache.get(cacheKey)!;
    }

    const template = this.getTemplate(templateId);
    const tone = this.getTone(toneId);

    if (!template || !tone) {
      console.warn('Template or tone not found:', { templateId, toneId });
      return '';
    }

    // Combine template prompt with tone system prompt
    const combined = `${template.prompt} ${tone.systemPrompt} ${REPLY_CONFIG.globalInstructions}`;

    // Cache the result (with LRU eviction)
    if (this.combinedPromptCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.combinedPromptCache.keys().next().value;
      if (firstKey !== undefined) {
        this.combinedPromptCache.delete(firstKey);
      }
    }
    this.combinedPromptCache.set(cacheKey, combined);

    return combined;
  }

  /**
   * Get temperature for a specific tone
   */
  getTemperatureForTone(toneId: string): number {
    // Check if it's a built-in tone with specific temperature
    const temperatureMap = REPLY_CONFIG.temperatureByTone;
    if (toneId in temperatureMap) {
      return temperatureMap[toneId as keyof typeof temperatureMap];
    }

    // Check custom tones
    const customTone = this.userPreferences?.customTones?.find(t => t.id === toneId);
    if (customTone && 'temperature' in customTone) {
      return (customTone as any).temperature;
    }

    // Return default
    return temperatureMap.default;
  }

  /**
   * Get favorite templates for quick access
   */
  async getFavoriteTemplates(): Promise<Template[]> {
    const prefs = await this.getUserPreferences();
    return prefs.favoriteTemplates
      .map(id => this.getTemplate(id))
      .filter(Boolean) as Template[];
  }

  /**
   * Get favorite tones for quick access
   */
  async getFavoriteTones(): Promise<Tone[]> {
    const prefs = await this.getUserPreferences();
    return prefs.favoriteTones
      .map(id => this.getTone(id))
      .filter(Boolean) as Tone[];
  }

  /**
   * Add a template to favorites
   */
  async addFavoriteTemplate(templateId: string): Promise<void> {
    const prefs = await this.getUserPreferences();
    if (!prefs.favoriteTemplates.includes(templateId)) {
      prefs.favoriteTemplates.push(templateId);
      await this.saveUserPreferences({ favoriteTemplates: prefs.favoriteTemplates });
    }
  }

  /**
   * Add a tone to favorites
   */
  async addFavoriteTone(toneId: string): Promise<void> {
    const prefs = await this.getUserPreferences();
    if (!prefs.favoriteTones.includes(toneId)) {
      prefs.favoriteTones.push(toneId);
      await this.saveUserPreferences({ favoriteTones: prefs.favoriteTones });
    }
  }

  /**
   * Remove a template from favorites
   */
  async removeFavoriteTemplate(templateId: string): Promise<void> {
    const prefs = await this.getUserPreferences();
    prefs.favoriteTemplates = prefs.favoriteTemplates.filter(id => id !== templateId);
    await this.saveUserPreferences({ favoriteTemplates: prefs.favoriteTemplates });
  }

  /**
   * Remove a tone from favorites
   */
  async removeFavoriteTone(toneId: string): Promise<void> {
    const prefs = await this.getUserPreferences();
    prefs.favoriteTones = prefs.favoriteTones.filter(id => id !== toneId);
    await this.saveUserPreferences({ favoriteTones: prefs.favoriteTones });
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.combinedPromptCache.clear();
    console.log('%c🧹 Caches cleared', 'color: #FFA500');
  }

  /**
   * Get statistics about current configuration
   */
  getStatistics(): {
    totalTemplates: number;
    totalTones: number;
    customTemplates: number;
    customTones: number;
    cacheSize: number;
  } {
    return {
      totalTemplates: this.getAllTemplates().length,
      totalTones: this.getAllTones().length,
      customTemplates: this.userPreferences?.customTemplates?.length || 0,
      customTones: this.userPreferences?.customTones?.length || 0,
      cacheSize: this.combinedPromptCache.size
    };
  }

  /**
   * Get full application configuration including features
   */
  async getConfig(): Promise<AppConfig> {
    // Load from storage - API key from local storage, rest from sync
    const [syncData, localData] = await Promise.all([
      chrome.storage.sync.get(['features', 'smartReply_config']),
      chrome.storage.local.get(['smartReply_apiKey'])
    ]);
    
    const storedConfig = {
      ...syncData,
      ...syncData.smartReply_config,
      smartReply_apiKey: localData.smartReply_apiKey
    };
    
    const config: AppConfig = {
      features: storedConfig.features || {
        imageUnderstanding: {
          enabled: false, // Default off for cost control
          model: 'gemini-pro-vision',
          maxImagesPerRequest: 2
        },
        smartSuggestions: {
          enabled: true,
          maxSuggestions: 6
        },
        arsenalMode: {
          enabled: true,
          maxReplies: 50
        }
      },
      userPreferences: await this.getUserPreferences(),
      apiKey: storedConfig.smartReply_apiKey,
      model: storedConfig.model || 'gpt-4o-mini',
      systemPrompt: storedConfig.systemPrompt || REPLY_CONFIG.globalInstructions,
      temperature: storedConfig.temperature || 0.7
    };

    return config;
  }

  /**
   * Update feature settings with deep merge
   */
  async updateFeatureSettings(features: Partial<FeatureSettings>): Promise<void> {
    const config = await this.getConfig();
    const currentFeatures = config.features || {};
    const updatedFeatures = this.deepMerge(currentFeatures, features);

    await chrome.storage.sync.set({ features: updatedFeatures });
    console.log('%c⚙️ Feature settings updated', 'color: #1DA1F2', features);
  }

  /**
   * Toggle image understanding feature
   */
  async toggleImageUnderstanding(enabled: boolean): Promise<void> {
    const config = await this.getConfig();
    const currentSettings = config.features?.imageUnderstanding || {
      model: 'gemini-pro-vision',
      maxImagesPerRequest: 2
    };
    
    await this.updateFeatureSettings({
      imageUnderstanding: {
        ...currentSettings,
        enabled
      }
    });
  }
}

// Export singleton instance
export const configManager = ConfigurationManager.getInstance();
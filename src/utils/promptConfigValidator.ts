/**
 * Configuration Validator for Prompt Architecture
 * Provides pre-validation and sanitization for PromptConfiguration objects
 */

import { PromptConfiguration } from '../services/promptArchitecture';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedConfig?: PromptConfiguration;
}

export class PromptConfigValidator {
  private static readonly VALID_TAB_TYPES = ['personas', 'all', 'smart', 'favorites', 'image_gen', 'custom'] as const;
  private static readonly VALID_CONTEXT_MODES = ['none', 'single', 'thread'] as const;
  private static readonly MIN_TEMPERATURE = 0.1;
  private static readonly MAX_TEMPERATURE = 1.0;
  private static readonly DEFAULT_TEMPERATURE = 0.7;

  /**
   * Validate and sanitize a PromptConfiguration object
   */
  static validate(config: PromptConfiguration): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Create a sanitized copy
    const sanitized: PromptConfiguration = { ...config };

    // 1. Validate required fields
    if (!config.tabType) {
      errors.push('tabType is required');
    } else if (!this.VALID_TAB_TYPES.includes(config.tabType as any)) {
      errors.push(`Invalid tabType "${config.tabType}". Must be one of: ${this.VALID_TAB_TYPES.join(', ')}`);
    }

    // 2. Validate and sanitize temperature
    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number') {
        warnings.push(`Temperature must be a number, using default ${this.DEFAULT_TEMPERATURE}`);
        sanitized.temperature = this.DEFAULT_TEMPERATURE;
      } else if (config.temperature < this.MIN_TEMPERATURE || config.temperature > this.MAX_TEMPERATURE) {
        const clamped = Math.max(this.MIN_TEMPERATURE, Math.min(this.MAX_TEMPERATURE, config.temperature));
        warnings.push(`Temperature ${config.temperature} clamped to ${clamped}`);
        sanitized.temperature = clamped;
      }
    } else {
      sanitized.temperature = this.DEFAULT_TEMPERATURE;
    }

    // 3. Validate context mode
    if (config.contextMode && !this.VALID_CONTEXT_MODES.includes(config.contextMode)) {
      errors.push(`Invalid contextMode "${config.contextMode}". Must be one of: ${this.VALID_CONTEXT_MODES.join(', ')}`);
    }

    // 4. Tab-specific validation
    if (config.tabType === 'personas') {
      const result = this.validatePersonasTab(config, sanitized, errors, warnings);
      if (result.sanitizedConfig) {
        sanitized.personaConfig = result.sanitizedConfig.personaConfig;
      }
    } else if (config.tabType === 'all' || config.tabType === 'smart' || config.tabType === 'favorites') {
      const result = this.validateAllTabStructure(config, sanitized, errors, warnings);
      if (result.sanitizedConfig) {
        sanitized.allTabConfig = result.sanitizedConfig.allTabConfig;
      }
    } else if (config.tabType === 'custom') {
      const result = this.validateCustomTab(config, sanitized, errors, warnings);
      if (result.sanitizedConfig) {
        sanitized.customConfig = result.sanitizedConfig.customConfig;
      }
    }

    // 5. Validate context if provided
    if (config.context) {
      this.validateContext(config.context, sanitized, warnings);
    }

    // 6. Sanitize system prompt
    if (config.systemPrompt && typeof config.systemPrompt === 'string') {
      sanitized.systemPrompt = config.systemPrompt.trim();
    } else if (config.systemPrompt) {
      warnings.push('systemPrompt must be a string, using default');
      sanitized.systemPrompt = 'You are a helpful assistant';
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedConfig: errors.length === 0 ? sanitized : undefined
    };
  }

  /**
   * Validate PERSONAS tab configuration
   */
  private static validatePersonasTab(
    config: PromptConfiguration,
    sanitized: PromptConfiguration,
    errors: string[],
    warnings: string[]
  ): Partial<ValidationResult> {
    if (!config.personaConfig) {
      errors.push('PERSONAS tab requires personaConfig');
      return {};
    }

    const personaConfig = { ...config.personaConfig };

    // Validate required persona fields
    if (!personaConfig.personality) {
      warnings.push('personaConfig.personality is missing, using default');
      personaConfig.personality = 'Friendly and supportive';
    }

    if (!personaConfig.vocabulary) {
      warnings.push('personaConfig.vocabulary is missing, using default');
      personaConfig.vocabulary = 'Plain English with modern slang';
    }

    if (!personaConfig.rhetoricMove) {
      warnings.push('personaConfig.rhetoricMove is missing, using default');
      personaConfig.rhetoricMove = 'Agree and build upon the original point';
    }

    if (!personaConfig.lengthPacing) {
      warnings.push('personaConfig.lengthPacing is missing, using default');
      personaConfig.lengthPacing = 'Normal reply with 1-2 sentences';
    }

    if (!personaConfig.systemPrompt) {
      errors.push('personaConfig.systemPrompt is required for PERSONAS tab');
      return {};
    }

    // Sanitize string fields
    personaConfig.personality = personaConfig.personality.trim();
    personaConfig.vocabulary = personaConfig.vocabulary.trim();
    personaConfig.rhetoricMove = personaConfig.rhetoricMove.trim();
    personaConfig.lengthPacing = personaConfig.lengthPacing.trim();
    personaConfig.systemPrompt = personaConfig.systemPrompt.trim();

    return { sanitizedConfig: { ...sanitized, personaConfig } };
  }

  /**
   * Validate ALL/SMART/FAVORITES tab configuration
   */
  private static validateAllTabStructure(
    config: PromptConfiguration,
    sanitized: PromptConfiguration,
    errors: string[],
    warnings: string[]
  ): Partial<ValidationResult> {
    if (!config.allTabConfig) {
      errors.push(`${config.tabType?.toUpperCase()} tab requires allTabConfig`);
      return {};
    }

    const allTabConfig = { ...config.allTabConfig };

    // Apply defaults for missing fields
    if (!allTabConfig.personality) {
      warnings.push('allTabConfig.personality is missing, using default');
      allTabConfig.personality = 'Friendly and supportive';
    }

    if (!allTabConfig.vocabulary) {
      warnings.push('allTabConfig.vocabulary is missing, using default');
      allTabConfig.vocabulary = 'Plain English with modern slang';
    }

    if (!allTabConfig.rhetoric) {
      warnings.push('allTabConfig.rhetoric is missing, using default');
      allTabConfig.rhetoric = 'Agree and build upon the original point';
    }

    if (!allTabConfig.lengthPacing) {
      warnings.push('allTabConfig.lengthPacing is missing, using default');
      allTabConfig.lengthPacing = 'Normal reply with 1-2 sentences';
    }

    // Sanitize string fields
    allTabConfig.personality = allTabConfig.personality.trim();
    allTabConfig.vocabulary = allTabConfig.vocabulary.trim();
    allTabConfig.rhetoric = allTabConfig.rhetoric.trim();
    allTabConfig.lengthPacing = allTabConfig.lengthPacing.trim();

    return { sanitizedConfig: { ...sanitized, allTabConfig } };
  }

  /**
   * Validate CUSTOM tab configuration
   */
  private static validateCustomTab(
    config: PromptConfiguration,
    sanitized: PromptConfiguration,
    errors: string[],
    warnings: string[]
  ): Partial<ValidationResult> {
    if (!config.customConfig) {
      errors.push('CUSTOM tab requires customConfig');
      return {};
    }

    const customConfig = { ...config.customConfig };

    // Validate required custom fields
    if (!customConfig.style) {
      warnings.push('customConfig.style is missing, using default');
      customConfig.style = 'Professional and clear';
    }

    if (!customConfig.tone) {
      warnings.push('customConfig.tone is missing, using default');
      customConfig.tone = 'Friendly and approachable';
    }

    if (!customConfig.length) {
      warnings.push('customConfig.length is missing, using default');
      customConfig.length = 'Concise and to the point';
    }

    // Validate custom temperature if provided
    if (customConfig.temperature !== undefined) {
      if (typeof customConfig.temperature !== 'number') {
        warnings.push('customConfig.temperature must be a number, ignoring');
        delete customConfig.temperature;
      } else if (customConfig.temperature < this.MIN_TEMPERATURE || customConfig.temperature > this.MAX_TEMPERATURE) {
        const clamped = Math.max(this.MIN_TEMPERATURE, Math.min(this.MAX_TEMPERATURE, customConfig.temperature));
        warnings.push(`Custom temperature ${customConfig.temperature} clamped to ${clamped}`);
        customConfig.temperature = clamped;
      }
    }

    // Sanitize string fields
    customConfig.style = customConfig.style.trim();
    customConfig.tone = customConfig.tone.trim();
    customConfig.length = customConfig.length.trim();

    return { sanitizedConfig: { ...sanitized, customConfig } };
  }

  /**
   * Validate context object
   */
  private static validateContext(
    context: any,
    sanitized: PromptConfiguration,
    warnings: string[]
  ): void {
    const sanitizedContext: any = {};

    // Validate tweet text
    if (context.tweetText) {
      if (typeof context.tweetText === 'string') {
        sanitizedContext.tweetText = context.tweetText.trim();
      } else {
        warnings.push('context.tweetText must be a string, ignoring');
      }
    }

    // Validate author handle
    if (context.authorHandle) {
      if (typeof context.authorHandle === 'string') {
        sanitizedContext.authorHandle = context.authorHandle.trim().replace(/^@/, '');
      } else {
        warnings.push('context.authorHandle must be a string, ignoring');
      }
    }

    // Validate thread context
    if (context.threadContext) {
      if (Array.isArray(context.threadContext)) {
        sanitizedContext.threadContext = context.threadContext
          .filter((tweet: any) => tweet && typeof tweet.author === 'string' && typeof tweet.text === 'string')
          .map((tweet: any) => ({
            author: tweet.author.trim(),
            text: tweet.text.trim()
          }));
        
        if (sanitizedContext.threadContext.length !== context.threadContext.length) {
          warnings.push('Some invalid thread context entries were filtered out');
        }
      } else {
        warnings.push('context.threadContext must be an array, ignoring');
      }
    }

    // Validate images
    if (context.images) {
      if (Array.isArray(context.images)) {
        sanitizedContext.images = context.images
          .filter((url: any) => typeof url === 'string' && url.trim().length > 0)
          .map((url: string) => url.trim());
        
        if (sanitizedContext.images.length !== context.images.length) {
          warnings.push('Some invalid image URLs were filtered out');
        }
      } else {
        warnings.push('context.images must be an array, ignoring');
      }
    }

    // Only update if we have valid context
    if (Object.keys(sanitizedContext).length > 0) {
      sanitized.context = sanitizedContext;
    }
  }

  /**
   * Quick validation check without full sanitization
   */
  static isValid(config: PromptConfiguration): boolean {
    const result = this.validate(config);
    return result.isValid;
  }

  /**
   * Get sanitized configuration or throw error
   */
  static sanitizeOrThrow(config: PromptConfiguration): PromptConfiguration {
    const result = this.validate(config);
    
    if (!result.isValid) {
      const errorMessage = `Configuration validation failed:\n${result.errors.join('\n')}`;
      console.error('%c❌ CONFIG VALIDATION ERROR', 'color: #DC3545; font-weight: bold');
      result.errors.forEach(error => console.error('%c  •', 'color: #DC3545', error));
      throw new Error(errorMessage);
    }

    if (result.warnings.length > 0) {
      console.warn('%c⚠️ CONFIG VALIDATION WARNINGS', 'color: #FFA500; font-weight: bold');
      result.warnings.forEach(warning => console.warn('%c  •', 'color: #FFA500', warning));
    }

    return result.sanitizedConfig!;
  }

  /**
   * Log validation result for debugging
   */
  static logValidationResult(result: ValidationResult): void {
    if (result.isValid) {
      console.log('%c✅ CONFIG VALIDATION PASSED', 'color: #17BF63; font-weight: bold');
    } else {
      console.error('%c❌ CONFIG VALIDATION FAILED', 'color: #DC3545; font-weight: bold');
    }

    if (result.errors.length > 0) {
      console.error('%c  Errors:', 'color: #DC3545; font-weight: bold');
      result.errors.forEach(error => console.error('%c    •', 'color: #DC3545', error));
    }

    if (result.warnings.length > 0) {
      console.warn('%c  Warnings:', 'color: #FFA500; font-weight: bold');
      result.warnings.forEach(warning => console.warn('%c    •', 'color: #FFA500', warning));
    }
  }
}
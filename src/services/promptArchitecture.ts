/**
 * Prompt Architecture System for TweetCraft
 * Defines the strategic structure for all LLM prompts across all input sources
 */

export interface PromptConfiguration {
  // Extension Popup Settings (System-wide defaults)
  systemPrompt: string;
  temperature: number;
  contextMode: 'none' | 'single' | 'thread';
  replyLength?: string;
  
  // Tab-specific inputs
  tabType: 'personas' | 'all' | 'smart' | 'favorites' | 'image_gen' | 'custom';
  
  // Persona-specific
  personaConfig?: {
    personality: string;
    vocabulary: string;
    rhetoricMove: string;
    lengthPacing: string;
    systemPrompt: string; // Persona's own system prompt
  };
  
  // All tab 4-part structure
  allTabConfig?: {
    personality: string;
    vocabulary: string;
    rhetoric: string;
    lengthPacing: string;
  };
  
  // Custom tab inputs
  customConfig?: {
    style: string;
    tone: string;
    length: string;
    temperature?: number; // Custom temperature override
  };
  
  // Context information
  context?: {
    tweetText?: string;
    authorHandle?: string;
    threadContext?: Array<{ author: string; text: string }>;
    images?: string[];
  };
}

/**
 * PromptArchitecture handles strategic prompt construction for all 6 tabs in TweetCraft.
 * 
 * TAB DEPENDENCIES AND CONFIGURATIONS:
 * 
 * 1. PERSONAS TAB:
 *    - Requires: personaConfig with personality, vocabulary, rhetoricMove, lengthPacing, and systemPrompt
 *    - Uses: System-wide prompt + persona's custom prompt + 4-part instructions
 * 
 * 2. ALL TAB:
 *    - Requires: allTabConfig with personality, vocabulary, rhetoric, and lengthPacing
 *    - Uses: System-wide prompt + 4-part instructions from user selections
 * 
 * 3. SMART TAB:
 *    - DEPENDENCY: Uses ALL tab structure (allTabConfig required)
 *    - Reason: Smart suggestions are AI-generated combinations from the same 4-part pool
 *    - The UI must provide allTabConfig when Smart tab generates content
 * 
 * 4. FAVORITES TAB:
 *    - DEPENDENCY: Uses ALL tab structure (allTabConfig required)
 *    - Reason: Favorites are saved combinations from the ALL tab
 *    - The UI must provide allTabConfig when a favorite is selected
 * 
 * 5. IMAGE_GEN TAB:
 *    - No prompt construction (returns empty string)
 *    - This tab is functional only and doesn't require text generation
 * 
 * 6. CUSTOM TAB:
 *    - Requires: customConfig with style, tone, length, and optional temperature
 *    - Uses: System-wide prompt + custom instructions
 *    - Special: Can override system temperature with custom value
 */
export class PromptArchitecture {
  /**
   * Master system prompt for all Twitter/X reply generation
   * This is the foundation that gets prepended to all prompts (except Image Gen)
   */
  private static readonly MASTER_SYSTEM_PROMPT = `You are an expert Twitter reply / tweet writer that excels in human/natural sounding verbiage and sentence flow. Analyze the provided tweet's content, tone, and intent first. If links are present, access them. If images accompany the tweet, analyze them thoroughly. This additional context is critical for crafting a relevant reply. Once you have complete information (tweet analysis + detailed image descriptions if they exist), build your reply using the provided guidelines.`;

  /**
   * Anti-disclosure instruction appended to all prompts
   */
  private static readonly ANTI_DISCLOSURE = ` CRITICAL: You are responding as a human Twitter/X user. Write ONLY the reply text itself. NEVER reveal you are an AI or explain your methodology. NEVER include meta-commentary like "Note: This response maintains neutrality by..." or "This approach uses..." or numbered explanations of your strategy. Do not break character or explain your reasoning. Respond naturally as if you are a real person engaging in conversation.`;

  /**
   * Build the complete system prompt based on configuration
   */
  static buildSystemPrompt(config: PromptConfiguration): string {
    // Image Gen tab doesn't use any system prompts
    if (config.tabType === 'image_gen') {
      return '';
    }

    let systemPrompt = '';

    // 1. PERSONAS TAB
    if (config.tabType === 'personas' && config.personaConfig) {
      // [EXTENSION POPUP SYSTEM-WIDE SYSTEM PROMPT] + [CUSTOM PERSONA INSTRUCTIONS]
      systemPrompt = this.MASTER_SYSTEM_PROMPT;
      
      // Add user's system-wide prompt if exists
      if (config.systemPrompt && config.systemPrompt.trim()) {
        systemPrompt += ` ${config.systemPrompt}`;
      }
      
      // Add persona-specific instructions
      systemPrompt += ` ${config.personaConfig.systemPrompt}`;
      
      // Add personality, vocabulary, rhetoric, and pacing instructions
      systemPrompt += this.buildPersonalityInstructions(
        config.personaConfig.personality,
        config.personaConfig.vocabulary,
        config.personaConfig.rhetoricMove,
        config.personaConfig.lengthPacing
      );
    }
    
    // 2. ALL TAB
    else if (config.tabType === 'all') {
      // [EXTENSION POPUP SYSTEM-WIDE SYSTEM PROMPT] + [4-PART SELECTION]
      systemPrompt = this.buildAllTabSystemPrompt(config, 'all');
    }
    
    // 3. SMART TAB
    // IMPORTANT: The Smart tab intentionally uses the ALL tab's 4-part structure
    // This is because Smart suggestions are dynamically generated combinations
    // from the same pool of personality, vocabulary, rhetoric, and pacing options.
    // The allTabConfig must be provided by the UI when Smart tab is selected.
    else if (config.tabType === 'smart') {
      // Smart suggestions are sourced from ALL tab templates
      systemPrompt = this.buildAllTabSystemPrompt(config, 'smart');
    }
    
    // 4. FAVORITES TAB
    // IMPORTANT: The Favorites tab intentionally uses the ALL tab's 4-part structure
    // This is because favorites are saved combinations from the ALL tab.
    // When a user selects a favorite, it provides the same allTabConfig structure
    // with personality, vocabulary, rhetoric, and lengthPacing values.
    else if (config.tabType === 'favorites') {
      // Favorites are sourced from ALL tab templates
      systemPrompt = this.buildAllTabSystemPrompt(config, 'favorites');
    }
    
    // 5. CUSTOM TAB
    else if (config.tabType === 'custom' && config.customConfig) {
      // [EXTENSION POPUP SYSTEM-WIDE SYSTEM PROMPT] + [CUSTOM CONFIGURATIONS]
      systemPrompt = this.MASTER_SYSTEM_PROMPT;
      
      // Add user's system-wide prompt if exists
      if (config.systemPrompt && config.systemPrompt.trim()) {
        systemPrompt += ` ${config.systemPrompt}`;
      }
      
      // Add custom style, tone, and length instructions
      systemPrompt += this.buildCustomInstructions(
        config.customConfig.style,
        config.customConfig.tone,
        config.customConfig.length
      );
    }
    
    // 6. CUSTOM TAB WITHOUT CONFIG (edge case)
    else if (config.tabType === 'custom' && !config.customConfig) {
      // Handle custom tab with missing configuration
      console.error('%c❌ CUSTOM TAB CONFIG ERROR', 'color: #DC3545; font-weight: bold', 
                   'customConfig is required for Custom tab but was not provided');
      throw new Error('CUSTOM tab requires customConfig with style, tone, and length fields. Please provide custom template configuration.');
    }
    
    // DEFAULT: Invalid or unsupported tab type
    else {
      const validTabs = ['personas', 'all', 'smart', 'favorites', 'custom', 'image_gen'];
      console.error('%c❌ INVALID TAB TYPE', 'color: #DC3545; font-weight: bold', 
                   `Tab type "${config.tabType}" is not supported`);
      console.error('%c  Valid tab types:', 'color: #657786', validTabs.join(', '));
      throw new Error(`Invalid tab type "${config.tabType}". Valid types are: ${validTabs.join(', ')}. Please check your tab selection.`);
    }

    // Add context awareness instruction if applicable
    if (config.contextMode && config.contextMode !== 'none' && config.context?.tweetText) {
      systemPrompt += ' Analyze the original tweet and write a contextually relevant reply.';
    }

    // Add natural conversation instruction
    systemPrompt += ' Keep the reply natural and conversational. Do not use hashtags unless essential.';
    
    // Add anti-disclosure instruction
    systemPrompt += this.ANTI_DISCLOSURE;

    return systemPrompt;
  }

  /**
   * Build system prompt for tabs using ALL tab structure (ALL, SMART, FAVORITES)
   * This helper reduces code duplication for the three tabs that share the same prompt structure
   */
  private static buildAllTabSystemPrompt(
    config: PromptConfiguration,
    tabName: string
  ): string {
    // Validate required configuration
    if (!config.allTabConfig) {
      console.error(`%c❌ ${tabName.toUpperCase()} TAB CONFIG ERROR`, 'color: #DC3545; font-weight: bold', 
                   'allTabConfig is required but was not provided');
      console.error('%c  Expected structure:', 'color: #657786', 
                   '{ personality, vocabulary, rhetoric, lengthPacing }');
      
      const errorMessage = tabName === 'smart' 
        ? 'SMART tab requires allTabConfig with personality, vocabulary, rhetoric, and lengthPacing. Please select from the ALL tab or use a different tab.'
        : tabName === 'favorites'
        ? 'FAVORITES tab requires allTabConfig from a saved favorite selection. The favorite data may be corrupted. Please select a different favorite or use the ALL tab.'
        : 'ALL tab requires allTabConfig with personality, vocabulary, rhetoric, and lengthPacing.';
      
      throw new Error(errorMessage);
    }
    
    // Build the system prompt
    let systemPrompt = this.MASTER_SYSTEM_PROMPT;
    
    if (config.systemPrompt && config.systemPrompt.trim()) {
      systemPrompt += ` ${config.systemPrompt}`;
    }
    
    systemPrompt += this.buildPersonalityInstructions(
      config.allTabConfig.personality,
      config.allTabConfig.vocabulary,
      config.allTabConfig.rhetoric,
      config.allTabConfig.lengthPacing
    );
    
    return systemPrompt;
  }

  /**
   * Build personality instructions from 4-part selection
   */
  private static buildPersonalityInstructions(
    personality?: string,
    vocabulary?: string,
    rhetoric?: string,
    lengthPacing?: string
  ): string {
    let instructions = '';

    // Add null/undefined checks and trim whitespace
    if (personality && personality.trim()) {
      instructions += ` Personality: ${personality.trim()}.`;
    }

    if (vocabulary && vocabulary.trim()) {
      instructions += ` Vocabulary style: ${vocabulary.trim()}.`;
    }

    if (rhetoric && rhetoric.trim()) {
      instructions += ` Rhetorical approach: ${rhetoric.trim()}.`;
    }

    if (lengthPacing && lengthPacing.trim()) {
      instructions += ` Length and pacing: ${lengthPacing.trim()}.`;
    }

    return instructions;
  }

  /**
   * Build custom template instructions
   */
  private static buildCustomInstructions(
    style: string,
    tone: string,
    length: string
  ): string {
    let instructions = '';

    // Add robust null/undefined checks and trim whitespace
    if (style && typeof style === 'string' && style.trim()) {
      instructions += ` Writing style: ${style.trim()}.`;
    }

    if (tone && typeof tone === 'string' && tone.trim()) {
      instructions += ` Tone of voice: ${tone.trim()}.`;
    }

    if (length && typeof length === 'string' && length.trim()) {
      instructions += ` Length instructions: ${length.trim()}.`;
    }

    return instructions;
  }

  /**
   * Get the appropriate temperature for the request
   */
  static getTemperature(config: PromptConfiguration): number {
    let temperature: number;
    
    // Custom tab can override temperature
    if (config.tabType === 'custom' && config.customConfig?.temperature !== undefined) {
      temperature = config.customConfig.temperature;
    } else {
      // All other tabs use system-wide temperature
      temperature = config.temperature || 0.7;
    }
    
    // Validate and clamp temperature to valid range (0.1 - 1.0)
    if (temperature < 0.1) {
      console.warn(`Temperature ${temperature} is below minimum, clamping to 0.1`);
      temperature = 0.1;
    } else if (temperature > 1.0) {
      console.warn(`Temperature ${temperature} is above maximum, clamping to 1.0`);
      temperature = 1.0;
    }
    
    return temperature;
  }

  /**
   * Build the user prompt with context
   */
  static buildUserPrompt(config: PromptConfiguration): string {
    let userPrompt = '';

    // Handle different context modes
    if (config.context && config.contextMode) {
      if (config.contextMode === 'thread' && config.context.threadContext && config.context.threadContext.length > 0) {
        userPrompt = 'Here is a Twitter conversation thread:\n\n';
        
        // Add thread context
        config.context.threadContext.forEach(tweet => {
          userPrompt += `${tweet.author}: ${tweet.text}\n`;
        });
        
        // Add the tweet we're replying to
        if (config.context.authorHandle && config.context.tweetText) {
          userPrompt += `@${config.context.authorHandle}: ${config.context.tweetText}\n\n`;
        } else if (config.context.tweetText) {
          userPrompt += `Latest tweet: ${config.context.tweetText}\n\n`;
        }
        
        userPrompt += 'Write a contextually relevant reply that continues this conversation naturally.';
      }
      else if (config.contextMode === 'single' && config.context.tweetText) {
        userPrompt = `Write a reply to this tweet: "${config.context.tweetText}"`;
      }
      else if (config.contextMode === 'none') {
        userPrompt = 'Write an engaging tweet reply.';
      }
    } else {
      userPrompt = 'Write an engaging tweet.';
    }

    // Add image context if available
    if (config.context?.images && config.context.images.length > 0) {
      userPrompt += '\n\n[Visual Context] The tweet contains the following images:';
      config.context.images.forEach((imageUrl, index) => {
        // Include image URL for vision models to process
        userPrompt += `\n- Image ${index + 1}: ${imageUrl}`;
      });
      userPrompt += '\n\nConsider the visual content when crafting your reply.';
      
      // Log image context inclusion
      console.log('%c🖼️ IMAGE CONTEXT INCLUDED', 'color: #17BF63; font-weight: bold', 
                  `${config.context.images.length} image(s) added to prompt`);
    }

    return userPrompt;
  }

  /**
   * Log the complete prompt architecture for debugging
   */
  static logPromptArchitecture(config: PromptConfiguration, systemPrompt: string, userPrompt: string, temperature: number): void {
    console.log('%c🏗️ PROMPT ARCHITECTURE', 'color: #1DA1F2; font-weight: bold; font-size: 16px');
    console.log('%c════════════════════════════════════════', 'color: #2E3236');
    
    // Tab type
    console.log('%c📑 Tab Type:', 'color: #794BC4; font-weight: bold', config.tabType.toUpperCase());
    
    // System-wide settings
    console.log('%c⚙️ System-Wide Settings:', 'color: #17BF63; font-weight: bold');
    console.log('%c  System Prompt:', 'color: #657786', config.systemPrompt || '(none)');
    console.log('%c  Temperature:', 'color: #657786', temperature);
    console.log('%c  Context Mode:', 'color: #657786', config.contextMode || 'none');
    
    // Tab-specific configuration
    if (config.personaConfig) {
      console.log('%c🎭 Persona Configuration:', 'color: #E1AD01; font-weight: bold');
      console.log('%c  Personality:', 'color: #657786', config.personaConfig.personality);
      console.log('%c  Vocabulary:', 'color: #657786', config.personaConfig.vocabulary);
      console.log('%c  Rhetoric:', 'color: #657786', config.personaConfig.rhetoricMove);
      console.log('%c  Length:', 'color: #657786', config.personaConfig.lengthPacing);
    }
    
    if (config.allTabConfig) {
      console.log('%c🎨 All Tab Configuration:', 'color: #E1AD01; font-weight: bold');
      console.log('%c  Personality:', 'color: #657786', config.allTabConfig.personality);
      console.log('%c  Vocabulary:', 'color: #657786', config.allTabConfig.vocabulary);
      console.log('%c  Rhetoric:', 'color: #657786', config.allTabConfig.rhetoric);
      console.log('%c  Length:', 'color: #657786', config.allTabConfig.lengthPacing);
    }
    
    if (config.customConfig) {
      console.log('%c✏️ Custom Configuration:', 'color: #E1AD01; font-weight: bold');
      console.log('%c  Style:', 'color: #657786', config.customConfig.style);
      console.log('%c  Tone:', 'color: #657786', config.customConfig.tone);
      console.log('%c  Length:', 'color: #657786', config.customConfig.length);
      if (config.customConfig.temperature !== undefined) {
        console.log('%c  Custom Temperature:', 'color: #FF6B6B', config.customConfig.temperature);
      }
    }
    
    // Final prompts
    console.log('%c📋 FINAL PROMPTS:', 'color: #1DA1F2; font-weight: bold');
    console.log('%c  System Prompt Length:', 'color: #657786', `${systemPrompt.length} characters`);
    console.log('%c  User Prompt Length:', 'color: #657786', `${userPrompt.length} characters`);
    
    // Full system prompt (truncated for readability)
    const truncatedSystem = systemPrompt.length > 200 
      ? systemPrompt.substring(0, 200) + '...' 
      : systemPrompt;
    console.log('%c  System:', 'color: #8899A6', truncatedSystem);
    
    // Full user prompt (truncated for readability)
    const truncatedUser = userPrompt.length > 200 
      ? userPrompt.substring(0, 200) + '...' 
      : userPrompt;
    console.log('%c  User:', 'color: #8899A6', truncatedUser);
    
    console.log('%c════════════════════════════════════════', 'color: #2E3236');
  }
}
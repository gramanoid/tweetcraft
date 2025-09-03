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
    else if (config.tabType === 'all' && config.allTabConfig) {
      // [EXTENSION POPUP SYSTEM-WIDE SYSTEM PROMPT] + [4-PART SELECTION]
      systemPrompt = this.MASTER_SYSTEM_PROMPT;
      
      // Add user's system-wide prompt if exists
      if (config.systemPrompt && config.systemPrompt.trim()) {
        systemPrompt += ` ${config.systemPrompt}`;
      }
      
      // Add 4-part instructions
      systemPrompt += this.buildPersonalityInstructions(
        config.allTabConfig.personality,
        config.allTabConfig.vocabulary,
        config.allTabConfig.rhetoric,
        config.allTabConfig.lengthPacing
      );
    }
    
    // 3. SMART TAB (uses ALL tab logic)
    else if (config.tabType === 'smart') {
      // Smart suggestions are sourced from ALL tab templates
      // Follow the same structure as ALL tab
      systemPrompt = this.MASTER_SYSTEM_PROMPT;
      
      if (config.systemPrompt && config.systemPrompt.trim()) {
        systemPrompt += ` ${config.systemPrompt}`;
      }
      
      if (config.allTabConfig) {
        systemPrompt += this.buildPersonalityInstructions(
          config.allTabConfig.personality,
          config.allTabConfig.vocabulary,
          config.allTabConfig.rhetoric,
          config.allTabConfig.lengthPacing
        );
      }
    }
    
    // 4. FAVORITES TAB (uses ALL tab logic)
    else if (config.tabType === 'favorites') {
      // Favorites are sourced from ALL tab templates
      systemPrompt = this.MASTER_SYSTEM_PROMPT;
      
      if (config.systemPrompt && config.systemPrompt.trim()) {
        systemPrompt += ` ${config.systemPrompt}`;
      }
      
      if (config.allTabConfig) {
        systemPrompt += this.buildPersonalityInstructions(
          config.allTabConfig.personality,
          config.allTabConfig.vocabulary,
          config.allTabConfig.rhetoric,
          config.allTabConfig.lengthPacing
        );
      }
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
   * Build personality instructions from 4-part selection
   */
  private static buildPersonalityInstructions(
    personality?: string,
    vocabulary?: string,
    rhetoric?: string,
    lengthPacing?: string
  ): string {
    let instructions = '';

    if (personality) {
      instructions += ` Personality: ${personality}.`;
    }

    if (vocabulary) {
      instructions += ` Vocabulary style: ${vocabulary}.`;
    }

    if (rhetoric) {
      instructions += ` Rhetorical approach: ${rhetoric}.`;
    }

    if (lengthPacing) {
      instructions += ` Length and pacing: ${lengthPacing}.`;
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

    if (style && style.trim()) {
      instructions += ` Writing style: ${style}.`;
    }

    if (tone && tone.trim()) {
      instructions += ` Tone of voice: ${tone}.`;
    }

    if (length && length.trim()) {
      instructions += ` Length instructions: ${length}.`;
    }

    return instructions;
  }

  /**
   * Get the appropriate temperature for the request
   */
  static getTemperature(config: PromptConfiguration): number {
    // Custom tab can override temperature
    if (config.tabType === 'custom' && config.customConfig?.temperature !== undefined) {
      return config.customConfig.temperature;
    }
    
    // All other tabs use system-wide temperature
    return config.temperature || 0.7;
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